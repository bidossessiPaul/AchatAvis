import { Request, Response } from 'express';
import * as trainingService from '../services/trainingService';

export const trainingController = {
    async getContent(_req: Request, res: Response) {
        try {
            const content = await trainingService.getTrainingContent();
            return res.json(content);
        } catch (error: any) {
            console.error('❌ [Training] getContent:', error.message);
            return res.status(500).json({ error: 'Impossible de charger la formation' });
        }
    },

    async getStatus(req: Request, res: Response) {
        try {
            const status = await trainingService.getTrainingStatus(req.user!.userId);
            return res.json(status);
        } catch (error: any) {
            console.error('❌ [Training] getStatus:', error.message);
            return res.status(500).json({ error: 'Impossible de charger le statut de formation' });
        }
    },

    async submit(req: Request, res: Response) {
        try {
            const { answers } = req.body;
            if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
                return res.status(400).json({ error: 'Réponses du QCM manquantes ou invalides' });
            }

            const result = await trainingService.submitTrainingQuiz(req.user!.userId, answers);
            return res.json(result);
        } catch (error: any) {
            console.error('❌ [Training] submit:', error.message);
            if (error.message === 'Aucune question de formation disponible') {
                return res.status(409).json({ error: error.message });
            }
            if (error.message === 'Trop de tentatives. Attendez 1 heure avant de réessayer.') {
                return res.status(429).json({ error: error.message });
            }
            if (error.message === 'Toutes les questions doivent avoir une réponse.') {
                return res.status(400).json({ error: 'Réponses incomplètes, rechargez la page et réessayez.' });
            }
            return res.status(500).json({ error: 'Impossible de soumettre le QCM' });
        }
    },

    async submitVideo(req: Request, res: Response) {
        try {
            const { videoId, answers } = req.body;
            if (!videoId || !Number.isInteger(videoId)) {
                return res.status(400).json({ error: 'Vidéo invalide' });
            }
            if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
                return res.status(400).json({ error: 'Réponses du QCM manquantes ou invalides' });
            }

            const result = await trainingService.submitVideoQuiz(req.user!.userId, videoId, answers);
            return res.json(result);
        } catch (error: any) {
            console.error('❌ [Training] submitVideo:', error.message);
            if (error.message === 'Aucune question pour cette vidéo') {
                return res.status(409).json({ error: error.message });
            }
            if (error.message === 'Trop de tentatives. Attendez 1 heure avant de réessayer.') {
                return res.status(429).json({ error: error.message });
            }
            if (error.message === 'Toutes les questions doivent avoir une réponse.') {
                return res.status(400).json({ error: 'Réponses incomplètes, rechargez la page et réessayez.' });
            }
            return res.status(500).json({ error: 'Impossible de soumettre les réponses' });
        }
    },
};
