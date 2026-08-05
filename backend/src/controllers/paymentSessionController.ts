import { Request, Response } from 'express';
import * as paymentSessionService from '../services/paymentSessionService';
import { PAIEMENT_RAISONS_ECHEC, PAIEMENT_RAISONS_GROUPES } from '../constants/paiementRaisons';

/**
 * Contrôleur des sessions de paiement des guides.
 * Les erreurs métier du service portent un message destiné à l'admin : on le
 * renvoie tel quel en 400 plutôt qu'un "Internal server error" opaque.
 */

const erreurMetier = (res: Response, error: any, contexte: string) => {
    console.error(`${contexte}:`, error);
    const message = error?.message || 'Une erreur est survenue.';
    // Les erreurs SQL ne doivent pas fuiter vers l'UI admin
    const estMetier = !!error?.message && !error?.code;
    return res.status(estMetier ? 400 : 500).json({
        error: estMetier ? message : 'Une erreur est survenue, veuillez réessayer',
    });
};

/**
 * Référentiel des raisons d'échec, servi au frontend pour construire le select.
 * GET /api/admin/payment-sessions/raisons
 */
export const getRaisons = async (_req: Request, res: Response) => {
    return res.json({
        raisons: PAIEMENT_RAISONS_ECHEC,
        groupes: PAIEMENT_RAISONS_GROUPES,
    });
};

/**
 * GET /api/admin/payment-sessions
 */
export const listSessions = async (_req: Request, res: Response) => {
    try {
        const sessions = await paymentSessionService.listSessions();
        return res.json(sessions);
    } catch (error) {
        return erreurMetier(res, error, 'List payment sessions error');
    }
};

/**
 * Session ouverte du moment (null s'il n'y en a pas).
 * GET /api/admin/payment-sessions/current
 */
export const getCurrentSession = async (_req: Request, res: Response) => {
    try {
        const open = await paymentSessionService.getOpenSession();
        if (!open) return res.json(null);
        const detail = await paymentSessionService.getSessionDetail(open.id);
        return res.json(detail);
    } catch (error) {
        return erreurMetier(res, error, 'Get current payment session error');
    }
};

/**
 * GET /api/admin/payment-sessions/:sessionId
 */
export const getSession = async (req: Request, res: Response) => {
    try {
        const detail = await paymentSessionService.getSessionDetail(req.params.sessionId);
        return res.json(detail);
    } catch (error) {
        return erreurMetier(res, error, 'Get payment session error');
    }
};

/**
 * Ouvre une session : fige la liste des guides à payer.
 * POST /api/admin/payment-sessions
 */
export const openSession = async (req: Request, res: Response) => {
    try {
        const session = await paymentSessionService.openSession(req.user!.userId, req.body?.label);
        return res.status(201).json(session);
    } catch (error) {
        return erreurMetier(res, error, 'Open payment session error');
    }
};

/**
 * Enregistre le résultat d'un virement pour un guide.
 * PATCH /api/admin/payment-sessions/:sessionId/lines/:lineId
 */
export const recordLine = async (req: Request, res: Response) => {
    const { status, amountPaid, failureReason, failureNote } = req.body || {};

    if (!['paid', 'partial', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Statut invalide : payé, partiel ou non payé.' });
    }

    try {
        const session = await paymentSessionService.recordLine(
            req.params.sessionId,
            req.params.lineId,
            req.user!.userId,
            { status, amountPaid: Number(amountPaid), failureReason, failureNote }
        );
        return res.json(session);
    } catch (error) {
        return erreurMetier(res, error, 'Record payment line error');
    }
};

/**
 * Ferme la session et fige ses statistiques.
 * POST /api/admin/payment-sessions/:sessionId/close
 */
export const closeSession = async (req: Request, res: Response) => {
    try {
        const session = await paymentSessionService.closeSession(
            req.params.sessionId,
            req.user!.userId,
            req.body?.adminNote
        );
        return res.json(session);
    } catch (error) {
        return erreurMetier(res, error, 'Close payment session error');
    }
};

/**
 * Annule une session ouverte sur laquelle aucun virement n'a encore été enregistré.
 * DELETE /api/admin/payment-sessions/:sessionId
 */
export const cancelSession = async (req: Request, res: Response) => {
    try {
        const result = await paymentSessionService.cancelSession(req.params.sessionId);
        return res.json(result);
    } catch (error) {
        return erreurMetier(res, error, 'Cancel payment session error');
    }
};

/**
 * Historique des paiements vu par le guide connecté.
 * GET /api/payouts/guide/payment-sessions
 */
export const getGuidePaymentSessions = async (req: Request, res: Response) => {
    try {
        const lines = await paymentSessionService.getGuideSessions(req.user!.userId);
        return res.json(lines);
    } catch (error) {
        return erreurMetier(res, error, 'Get guide payment sessions error');
    }
};
