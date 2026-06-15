import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { invalidateAuthCache } from '../middleware/auth';

// Score minimum (par vidéo) pour débloquer la vidéo suivante
export const TRAINING_PASSING_SCORE = 80;

/**
 * Contenu de la formation : vidéos (Cloudinary) + questions du QCM.
 * Chaque question est liée à une vidéo (video_id) et s'affiche à droite
 * de celle-ci pendant le visionnage. video_id NULL = question générale
 * (fallback utilisé tant qu'aucune vidéo n'est en ligne).
 * Les bonnes réponses ne sont JAMAIS envoyées au frontend — le scoring
 * se fait exclusivement côté serveur.
 */
export const getTrainingContent = async () => {
    const videos: any = await query(
        `SELECT id, title, description, video_url, position
         FROM training_videos
         WHERE is_active = 1
         ORDER BY position ASC, id ASC`
    );

    const rows: any = await query(
        `SELECT id, video_id, question, options, position
         FROM training_questions
         WHERE is_active = 1
         ORDER BY position ASC, id ASC`
    );

    const questions = rows.map((q: any) => ({
        id: q.id,
        video_id: q.video_id,
        question: q.question,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));

    return { videos, questions, passingScore: TRAINING_PASSING_SCORE };
};

export const getTrainingStatus = async (userId: string) => {
    const rows: any = await query(
        `SELECT training_score, training_completed_at FROM users WHERE id = ? AND deleted_at IS NULL`,
        [userId]
    );

    // Vidéos déjà validées (>= 80%) — permet de reprendre la formation où elle s'est arrêtée
    const passedRows: any = await query(
        `SELECT DISTINCT video_id FROM training_attempts
         WHERE user_id = ? AND passed = 1 AND video_id IS NOT NULL`,
        [userId]
    );

    return {
        completed: !!rows[0]?.training_completed_at,
        score: rows[0]?.training_score ?? null,
        passingScore: TRAINING_PASSING_SCORE,
        passedVideoIds: passedRows.map((r: any) => r.video_id),
    };
};

/** Corrige un jeu de réponses contre une liste de questions (côté serveur uniquement) */
const scoreAnswers = (questions: any[], answers: Record<string, string>) => {
    // Rejeter si toutes les questions ne sont pas répondues — évite le cherry-picking
    if (Object.keys(answers).length !== questions.length) {
        throw new Error('Toutes les questions doivent avoir une réponse.');
    }
    let correctCount = 0;
    for (const q of questions) {
        if (answers[String(q.id)] === q.correct_option) correctCount++;
    }
    const score = Math.round((correctCount / questions.length) * 100);
    return { score, correctCount, passed: score >= TRAINING_PASSING_SCORE };
};

/** Vérifie le rate limit : max 5 tentatives par vidéo par heure */
const checkAttemptRateLimit = async (userId: string, videoId: number | null) => {
    const rows: any = await query(
        `SELECT COUNT(*) AS n FROM training_attempts
         WHERE user_id = ? AND video_id <=> ? AND created_at >= NOW() - INTERVAL 1 HOUR`,
        [userId, videoId]
    );
    if (rows[0].n >= 5) {
        throw new Error('Trop de tentatives. Attendez 1 heure avant de réessayer.');
    }
};

/** Marque la formation comme terminée et fige le score global (moyenne des vidéos validées) */
const completeTraining = async (userId: string, score: number) => {
    await query(
        `UPDATE users SET training_score = ?, training_completed_at = NOW()
         WHERE id = ? AND training_completed_at IS NULL`,
        [score, userId]
    );
    // Invalide les caches auth pour que /auth/me reflète immédiatement le déblocage
    invalidateAuthCache(userId);
};

/**
 * Corrige les réponses aux questions d'UNE vidéo.
 * >= 80% → vidéo validée, le guide passe à la suivante.
 * Si toutes les vidéos (ayant des questions) sont validées → formation terminée.
 */
export const submitVideoQuiz = async (userId: string, videoId: number, answers: Record<string, string>) => {
    await checkAttemptRateLimit(userId, videoId);

    const questions: any = await query(
        `SELECT id, correct_option FROM training_questions WHERE is_active = 1 AND video_id = ?`,
        [videoId]
    );

    if (!questions.length) {
        throw new Error('Aucune question pour cette vidéo');
    }

    const { score, correctCount, passed } = scoreAnswers(questions, answers);

    await query(
        `INSERT INTO training_attempts (id, user_id, video_id, score, correct_count, total_questions, passed, answers)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, videoId, score, correctCount, questions.length, passed ? 1 : 0, JSON.stringify(answers)]
    );

    let trainingCompleted = false;

    if (passed) {
        // Reste-t-il des vidéos actives (avec questions) non validées par ce guide ?
        const pending: any = await query(
            `SELECT COUNT(DISTINCT v.id) AS n
             FROM training_videos v
             JOIN training_questions q ON q.video_id = v.id AND q.is_active = 1
             WHERE v.is_active = 1
               AND NOT EXISTS (
                   SELECT 1 FROM training_attempts a
                   WHERE a.user_id = ? AND a.video_id = v.id AND a.passed = 1
               )`,
            [userId]
        );

        if (pending[0].n === 0) {
            // Score global = moyenne des meilleurs scores par vidéo validée
            const avg: any = await query(
                `SELECT ROUND(AVG(best_score)) AS avg_score FROM (
                    SELECT MAX(score) AS best_score FROM training_attempts
                    WHERE user_id = ? AND passed = 1 AND video_id IS NOT NULL
                    GROUP BY video_id
                ) AS bests`,
                [userId]
            );
            await completeTraining(userId, avg[0].avg_score ?? score);
            trainingCompleted = true;
        }
    }

    return {
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        passingScore: TRAINING_PASSING_SCORE,
        trainingCompleted,
    };
};

/**
 * Fallback : QCM global sur les questions sans vidéo (video_id NULL).
 * Utilisé tant qu'aucune vidéo n'est en ligne.
 */
export const submitTrainingQuiz = async (userId: string, answers: Record<string, string>) => {
    await checkAttemptRateLimit(userId, null);

    const questions: any = await query(
        `SELECT id, correct_option FROM training_questions WHERE is_active = 1 AND video_id IS NULL`
    );

    if (!questions.length) {
        throw new Error('Aucune question de formation disponible');
    }

    const { score, correctCount, passed } = scoreAnswers(questions, answers);

    await query(
        `INSERT INTO training_attempts (id, user_id, score, correct_count, total_questions, passed, answers)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, score, correctCount, questions.length, passed ? 1 : 0, JSON.stringify(answers)]
    );

    if (passed) {
        await completeTraining(userId, score);
    }

    return {
        score,
        passed,
        correctCount,
        totalQuestions: questions.length,
        passingScore: TRAINING_PASSING_SCORE,
        trainingCompleted: passed,
    };
};
