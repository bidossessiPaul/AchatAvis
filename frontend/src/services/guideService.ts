import api from './api';

export const guideService = {
    /**
     * Get fiches available for the current guide
     */
    async getAvailablefiches(): Promise<any[]> {
        const response = await api.get('/guide/fiches/available');
        return response.data;
    },

    async getficheDetails(orderId: string): Promise<any> {
        const response = await api.get(`/guide/fiches/${orderId}`);
        return response.data;
    },

    async releaseLock(orderId: string): Promise<void> {
        await api.post(`/guide/fiches/${orderId}/release-lock`);
    },

    async submitProof(data: {
        orderId: string,
        proposalId: string,
        reviewUrl: string,
        googleEmail: string,
        artisanId: string,
        gmailAccountId?: number,
        screenshot?: File
    }): Promise<any> {
        const form = new FormData();
        form.append('orderId', data.orderId);
        form.append('proposalId', data.proposalId);
        form.append('reviewUrl', data.reviewUrl);
        form.append('googleEmail', data.googleEmail);
        form.append('artisanId', data.artisanId);
        if (data.gmailAccountId !== undefined) form.append('gmailAccountId', String(data.gmailAccountId));
        if (data.screenshot) form.append('screenshot', data.screenshot);
        const response = await api.post('/guide/submissions', form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    // --- Échauffement (warm-up) avant de poster un avis ---
    async getWarmup(orderId: string): Promise<{
        required: boolean;
        completed: boolean;
        sessionsToday: number;
        dailyLimit: number;
        sessionId?: string;
        requiredCount?: number;
        completedCount?: number;
        reason?: string;
        visits?: {
            id: string;
            order_id: string;
            company_name: string;
            google_business_url: string;
            city: string | null;
            sector_icon: string | null;
            sector_name: string | null;
            is_done: number;
        }[];
    }> {
        const response = await api.get(`/guide/fiches/${orderId}/warmup`);
        return response.data;
    },

    async recordWarmupVisit(orderId: string, data: {
        visitId: string;
        didItinerary: boolean;
        didWebsite: boolean;
        didContact: boolean;
        durationSec: number;
    }): Promise<{ success: boolean; completed: boolean; completedCount: number }> {
        const response = await api.post(`/guide/fiches/${orderId}/warmup/visit`, data);
        return response.data;
    },

    async getSubmissions(): Promise<any[]> {
        const response = await api.get('/guide/submissions');
        return response.data;
    },

    async getStats(): Promise<any> {
        const response = await api.get('/guide/stats');
        return response.data;
    },

    async updateSubmission(id: string, data: { reviewUrl?: string, googleEmail?: string }): Promise<any> {
        const response = await api.put(`/guide/submissions/${id}`, data);
        return response.data;
    },

    async getCorrectableSubmissions(): Promise<any[]> {
        const response = await api.get('/guide/submissions/correctable');
        return response.data;
    },

    async getLeaderboard(): Promise<any[]> {
        const response = await api.get('/guide/leaderboard');
        return response.data;
    },

    // --- Formation obligatoire post-inscription ---
    // Chaque vidéo a ses questions (affichées à droite pendant le visionnage).
    // >= 80% sur les questions d'une vidéo → vidéo suivante débloquée.

    async getTrainingContent(): Promise<{
        videos: { id: number; title: string; description: string | null; video_url: string; position: number }[];
        questions: { id: number; video_id: number | null; question: string; options: { id: string; text: string }[] }[];
        passingScore: number;
    }> {
        const response = await api.get('/guide/training');
        return response.data;
    },

    async getTrainingStatus(): Promise<{
        completed: boolean;
        score: number | null;
        passingScore: number;
        passedVideoIds: number[];
    }> {
        const response = await api.get('/guide/training/status');
        return response.data;
    },

    async submitTrainingVideoQuiz(videoId: number, answers: Record<number, string>): Promise<{
        score: number;
        passed: boolean;
        correctCount: number;
        totalQuestions: number;
        passingScore: number;
        trainingCompleted: boolean;
    }> {
        const response = await api.post('/guide/training/submit-video', { videoId, answers });
        return response.data;
    },

    // Fallback : QCM global tant qu'aucune vidéo n'est en ligne
    async submitTrainingQuiz(answers: Record<number, string>): Promise<{
        score: number;
        passed: boolean;
        correctCount: number;
        totalQuestions: number;
        passingScore: number;
        trainingCompleted: boolean;
    }> {
        const response = await api.post('/guide/training/submit', { answers });
        return response.data;
    },

    async getMonthlyBonusStatus(): Promise<{
        validatedCount: number;
        threshold: number;
        eligible: boolean;
        claimed: boolean;
        claimedAt: string | null;
        amount: number;
        month: number;
        year: number;
    }> {
        const response = await api.get('/guide/monthly-bonus/status');
        return response.data;
    },

    async claimMonthlyBonus(): Promise<{ success: boolean; amount: number }> {
        const response = await api.post('/guide/monthly-bonus/claim');
        return response.data;
    }
};
