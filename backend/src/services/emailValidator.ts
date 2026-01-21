import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

/**
 * 🔐 EMAIL VALIDATOR - AchatAvis
 * Validation complète des adresses email Gmail/personnalisées
 * Détecte : emails jetables, patterns suspects, domaines invalides
 */

interface EmailValidationResult {
    isValid: boolean;
    score: number; // 0-30 points
    details: {
        syntaxValid: boolean;
        mxRecordsValid: boolean;
        isDisposable: boolean;
        suspiciousPattern: boolean;
        estimatedAge: number; // En mois (basé sur pattern)
    };
    flags: string[];
}

// 🚫 Liste noire emails jetables (top 100 services)
const DISPOSABLE_DOMAINS = [
    'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'sharklasers.com', 'yopmail.com',
    'maildrop.cc', 'getnada.com', 'trashmail.com', 'fake-mail.com',
    'emailondeck.com', 'mohmal.com', 'mytrashmail.com', 'spam4.me'
];

// 🔍 Patterns suspects (bots, générateurs automatiques)
// Ajusté pour être moins strict avec les chiffres courants
const SUSPICIOUS_PATTERNS = [
    /\d{8,}@/,           // 8+ chiffres consécutifs (au lieu de 6+)
    /^[a-z]{25,}@/,      // 25+ lettres aléatoires (au lieu de 20+)
    /^(test|demo|fake|spam|bot|admin|temp)\d*@/i,
    /^(qwerty|azerty|password|12345678)/i, // Patterns évidents uniquement
    /^[a-z]\d{10,}@/     // Une lettre suivie de 10+ chiffres
];

export class EmailValidator {

    /**
     * 🎯 Validation complète de l'email
     */
    static async validate(email: string): Promise<EmailValidationResult> {
        const result: EmailValidationResult = {
            isValid: false,
            score: 0,
            details: {
                syntaxValid: false,
                mxRecordsValid: false,
                isDisposable: false,
                suspiciousPattern: false,
                estimatedAge: 0
            },
            flags: []
        };

        // 1️⃣ Validation syntaxe RFC 5322
        const syntaxValid = this.validateSyntax(email);
        result.details.syntaxValid = syntaxValid;

        if (!syntaxValid) {
            result.flags.push('❌ Syntaxe email invalide');
            return result;
        }
        result.score += 5;

        const [localPart, domain] = email.toLowerCase().split('@');

        // 2️⃣ Détection email jetable
        const isDisposable = DISPOSABLE_DOMAINS.includes(domain);
        result.details.isDisposable = isDisposable;

        if (isDisposable) {
            result.flags.push('🚫 Email jetable détecté');
            result.score -= 50; // Pénalité sévère
            return result;
        }
        result.score += 10;

        // 3️⃣ Vérification DNS/MX
        try {
            const mxRecords = await this.checkMXRecords(domain);
            result.details.mxRecordsValid = mxRecords;

            if (mxRecords) {
                result.score += 5;
            } else {
                result.flags.push('⚠️ Domaine sans serveur email');
            }
        } catch (error) {
            result.flags.push('⚠️ Impossible de vérifier le domaine');
        }

        // 4️⃣ Analyse pattern suspect
        const suspiciousPattern = this.detectSuspiciousPattern(localPart);
        result.details.suspiciousPattern = suspiciousPattern;

        if (suspiciousPattern) {
            result.flags.push('🔍 Pattern suspect détecté');
            result.score -= 10;
        } else {
            result.score += 10; // Bonus pattern réaliste
        }

        // 5️⃣ Estimation âge du compte (heuristique)
        result.details.estimatedAge = this.estimateAccountAge(localPart, domain);

        // ✅ Validation finale
        result.isValid = result.score >= 10 && !isDisposable;

        if (result.isValid) {
            result.flags.push('✅ Email validé avec succès');
        }

        return result;
    }

    /**
     * 📝 Validation syntaxe RFC 5322
     */
    private static validateSyntax(email: string): boolean {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email);
    }

    /**
     * 🌐 Vérification MX Records
     */
    private static async checkMXRecords(domain: string): Promise<boolean> {
        try {
            const records = await resolveMx(domain);
            return records && records.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * 🔍 Détection patterns suspects
     */
    private static detectSuspiciousPattern(localPart: string): boolean {
        return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(localPart));
    }

    /**
     * 📅 Estimation heuristique de l'âge du compte
     * Basé sur des patterns courants d'emails anciens
     */
    private static estimateAccountAge(localPart: string, domain: string): number {
        // Emails courts et simples = probablement anciens
        if (localPart.length <= 12 && !/\d{5,}/.test(localPart)) {
            return 48; // ~4 ans (au lieu de 3)
        }

        // Nom.Prenom classique = probablement mature
        if (/^[a-z]+\.[a-z]+$/.test(localPart)) {
            return 36; // ~3 ans (au lieu de 2)
        }

        // Contient prénom + chiffres courts (pattern très courant)
        if (/^[a-z]{4,}[.\-_]?\d{1,4}$/.test(localPart)) {
            return 24; // ~2 ans (pattern type "maxime888")
        }

        // Domaines personnalisés = souvent professionnels
        if (!domain.includes('gmail') && !domain.includes('yahoo') && !domain.includes('outlook')) {
            return 36; // ~3 ans (au lieu de 1.5)
        }

        // Par défaut : compte avec un peu d'historique
        return 12; // 1 an (au lieu de 3 mois)
    }

    /**
     * 📊 Analyse détaillée pour dashboard admin
     */
    static async analyzeEmail(email: string): Promise<string> {
        const result = await this.validate(email);

        return `
🔐 ANALYSE EMAIL: ${email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score: ${result.score}/30 points
Statut: ${result.isValid ? '✅ VALIDE' : '❌ INVALIDE'}

📋 Détails:
  • Syntaxe: ${result.details.syntaxValid ? '✅' : '❌'}
  • Serveurs MX: ${result.details.mxRecordsValid ? '✅' : '❌'}
  • Email jetable: ${result.details.isDisposable ? '🚫 OUI' : '✅ NON'}
  • Pattern suspect: ${result.details.suspiciousPattern ? '⚠️ OUI' : '✅ NON'}
  • Âge estimé: ~${result.details.estimatedAge} mois

⚠️ Alertes:
${result.flags.map(flag => `  ${flag}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();
    }
}

export default EmailValidator;
