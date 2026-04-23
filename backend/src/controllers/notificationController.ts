import { Request, Response } from 'express';

export const notificationController = {
    /**
     * SSE stream — désactivé en environnement serverless.
     *
     * Raison : Vercel tue toute fonction après 60s, ce qui provoque un cycle
     * timeout → reconnect → timeout qui brûle les secondes d'invocation sans
     * que les notifications n'arrivent jamais (chaque cold start a sa propre
     * Map de clients vide → sendToUser ne trouve personne).
     *
     * On renvoie immédiatement une réponse 204 pour que l'EventSource côté
     * frontend passe en mode erreur sans timeout coûteux. Les notifications
     * restent consultables via /api/notifications au rechargement.
     */
    stream: (_req: Request, res: Response) => {
        res.status(204).end();
    }
};
