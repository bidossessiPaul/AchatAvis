import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { transporter, emailConfig } from '../config/email';

const router = Router();

// Bloque le spam du formulaire public : 5 envois / 15 min / IP
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Trop de demandes. Réessayez dans quelques minutes.' },
});

const EMAIL_REGEX = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
const PHONE_REGEX = /^[0-9+().\-\s]{0,20}$/;

// Échappe les entités HTML pour éviter l'injection dans le corps de l'email
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Formulaire de contact public (landing page) — envoie un email à contact@achatavis.com
router.post('/', contactLimiter, async (req: Request, res: Response) => {
    try {
        const { email, phone } = req.body;

        if (!email || typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, message: 'Email invalide.' });
        }

        if (phone !== undefined && (typeof phone !== 'string' || !PHONE_REGEX.test(phone))) {
            return res.status(400).json({ success: false, message: 'Téléphone invalide.' });
        }

        await transporter.sendMail({
            from: emailConfig.from,
            to: 'contact@achatavis.com',
            replyTo: email,
            subject: 'Nouvelle demande de contact — Site AchatAvis',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <h2 style="color: #111827;">Nouvelle demande de contact</h2>
                    <p><strong>Email :</strong> ${escapeHtml(email)}</p>
                    <p><strong>Téléphone :</strong> ${phone ? escapeHtml(phone) : 'Non renseigné'}</p>
                    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Envoyé depuis le formulaire de contact du site AchatAvis.</p>
                </div>
            `,
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('Erreur envoi email contact:', error);
        return res.status(500).json({ success: false, message: "Erreur lors de l'envoi. Réessayez plus tard." });
    }
});

export default router;
