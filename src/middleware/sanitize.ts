import { Request, Response, NextFunction } from 'express';

/**
 * Global input sanitization middleware.
 * Protects against SQL injection payloads and XSS being stored in the database.
 * Only blocks clear SQL injection patterns — does NOT restrict normal text,
 * accented characters, or any alphabet characters.
 */

// SQL injection patterns — only match clearly malicious intent
const SQL_INJECTION_PATTERNS = [
    /('\s*;\s*(UPDATE|DELETE|DROP|INSERT|ALTER|CREATE|EXEC|TRUNCATE))/i,
    /(;\s*--\s*(UPDATE|DELETE|DROP|INSERT|ALTER|CREATE|EXEC|TRUNCATE))/i,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b\s+\b(FROM|INTO|SET|TABLE|DATABASE|ALL|EXEC)\b)/i,
    /(\bUNION\s+SELECT\b)/i,
    /(\bOR\s+1\s*=\s*1\b)/i,
    /(\bAND\s+1\s*=\s*1\b)/i,
];

// HTML/script tags to strip
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*?>/gi;

/**
 * Sanitize a single string value:
 * 1. Strip HTML tags
 * 2. Remove null bytes
 */
function sanitizeString(value: string): string {
    let cleaned = value.replace(HTML_TAG_REGEX, '');
    cleaned = cleaned.replace(/\0/g, '');
    return cleaned;
}

/**
 * Check if a string contains SQL injection patterns
 */
function containsSqlInjection(value: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key of Object.keys(obj)) {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
    }
    return obj;
}

/**
 * Check recursively if any string in an object contains SQL injection
 */
function detectSqlInjection(obj: any, path = ''): string | null {
    if (typeof obj === 'string') {
        if (containsSqlInjection(obj)) {
            return path || 'value';
        }
    }
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            const result = detectSqlInjection(obj[i], `${path}[${i}]`);
            if (result) return result;
        }
    }
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            // Skip password fields - they can contain any chars
            if (key.toLowerCase().includes('password')) continue;
            // Skip URL fields
            if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) continue;
            // Skip content/features/instructions - free text fields
            if (['content', 'features', 'specific_instructions', 'company_context'].includes(key)) continue;

            const result = detectSqlInjection(obj[key], path ? `${path}.${key}` : key);
            if (result) return result;
        }
    }
    return null;
}

/**
 * Express middleware: sanitize all req.body strings and block SQL injection attempts
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || typeof req.body !== 'object') {
        return next();
    }

    // 1. Check for SQL injection patterns
    const injectedField = detectSqlInjection(req.body);
    if (injectedField) {
        console.warn(`[SECURITY] SQL injection attempt blocked in field "${injectedField}" from IP ${req.ip}`);
        return res.status(400).json({
            error: 'Caractères non autorisés détectés',
            field: injectedField,
            message: 'Contenu malveillant détecté dans ce champ.'
        });
    }

    // 2. Sanitize all strings (strip HTML tags, null bytes)
    req.body = sanitizeObject(req.body);

    return next();
};
