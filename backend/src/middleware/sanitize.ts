import { Request, Response, NextFunction } from 'express';

/**
 * Global input sanitization middleware.
 * Protects against SQL injection payloads and XSS being stored in the database.
 * Even though parameterized queries prevent execution, we block malicious strings
 * from being stored at all.
 */

// SQL injection patterns to detect and block
const SQL_INJECTION_PATTERNS = [
    /('\s*;)/i,                                    // ';
    /(;\s*--)/i,                                   // ; --
    /(-{2,})/,                                     // --
    /(\/\*[\s\S]*?\*\/)/,                          // /* ... */
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE)\b\s+\b(FROM|INTO|SET|TABLE|DATABASE|ALL|EXEC)\b)/i,
];

// HTML/script tags to strip
const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*?>/gi;

// Allowed characters for name/city fields: letters (including accented), spaces, hyphens, apostrophes, dots
const SAFE_NAME_REGEX = /^[\p{L}\p{M}\s'\-.,()]+$/u;

/**
 * Sanitize a single string value:
 * 1. Strip HTML tags
 * 2. Check for SQL injection patterns
 */
function sanitizeString(value: string): string {
    // Strip HTML tags
    let cleaned = value.replace(HTML_TAG_REGEX, '');

    // Remove null bytes
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
            // Skip password fields - they can contain special chars
            if (key.toLowerCase().includes('password')) continue;
            // Skip URL fields - they have their own validation
            if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) continue;
            // Skip content/features/instructions - free text fields, just sanitize them
            if (['content', 'features', 'specific_instructions', 'company_context'].includes(key)) continue;

            const result = detectSqlInjection(obj[key], path ? `${path}.${key}` : key);
            if (result) return result;
        }
    }
    return null;
}

/**
 * Validate name-like fields (fullName, companyName, city, trade, etc.)
 * Only allow safe characters
 */
function validateNameFields(body: any): string | null {
    const nameFields = [
        'fullName', 'full_name',
        'city',
        'companyName', 'company_name',
        'trade',
        'address',
        'sector_name',
        'author_name',
        'fiche_name',
    ];

    for (const field of nameFields) {
        const value = body[field];
        if (typeof value === 'string' && value.length > 0) {
            if (!SAFE_NAME_REGEX.test(value)) {
                return field;
            }
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

    // 1. Check for SQL injection patterns in critical fields
    const injectedField = detectSqlInjection(req.body);
    if (injectedField) {
        console.warn(`[SECURITY] SQL injection attempt blocked in field "${injectedField}" from IP ${req.ip}`);
        return res.status(400).json({
            error: 'Caractères non autorisés détectés',
            field: injectedField,
            message: 'Les caractères spéciaux comme ; -- \' ne sont pas autorisés dans ce champ.'
        });
    }

    // 2. Validate name-like fields for safe characters only
    const invalidNameField = validateNameFields(req.body);
    if (invalidNameField) {
        console.warn(`[SECURITY] Invalid characters in name field "${invalidNameField}" from IP ${req.ip}`);
        return res.status(400).json({
            error: 'Caractères non autorisés',
            field: invalidNameField,
            message: 'Ce champ ne peut contenir que des lettres, espaces, tirets et apostrophes.'
        });
    }

    // 3. Sanitize all strings (strip HTML tags, null bytes)
    req.body = sanitizeObject(req.body);

    return next();
};
