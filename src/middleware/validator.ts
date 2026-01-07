import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Email invalide');

// Password validation (8+ chars)
export const passwordSchema = z
    .string()
    .min(8, 'Le mot de passe doit faire au moins 8 caractères');

// SIRET validation (14 digits) - Handle empty strings if optional
export const siretSchema = z
    .string()
    .transform(val => val.replace(/[\s.-]/g, ''))
    .refine(val => val === '' || /^\d{14}$/.test(val), {
        message: 'Le SIRET doit faire exactement 14 chiffres',
    });

// Phone validation (strip spaces and check digits)
export const phoneSchema = z
    .string()
    .transform(val => val.replace(/[\s.-]/g, '')) // Supprimer espaces, points, tirets
    .refine(val => /^\d{10,}$/.test(val), {
        message: 'Le téléphone doit contenir au moins 10 chiffres',
    });

// Trade validation: Now dynamic, accepts any string corresponding to a sector slug
export const tradeSchema = z.string().min(2, "Le secteur d'activité est requis");

// User role validation
export const roleSchema = z.enum(['artisan', 'guide', 'admin']);

// Artisan registration schema
export const artisanRegistrationSchema = z.object({
    email: emailSchema,
    fullName: z.string().min(2, "Le nom complet est requis"),
    password: passwordSchema,
    companyName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
    siret: siretSchema.optional().or(z.literal('')),
    trade: tradeSchema,
    phone: phoneSchema,
    address: z.string().min(5, 'L\'adresse est requise'),
    city: z.string().min(2, 'La ville est requise'),
    postalCode: z.string()
        .transform(val => val.replace(/\s/g, ''))
        .refine(val => /^\d{5}$/.test(val), 'Le code postal doit faire 5 chiffres'),
    googleBusinessUrl: z.string().url('URL Google Business invalide').optional().or(z.literal('')),
});

// Guide registration schema
export const guideRegistrationSchema = z.object({
    email: emailSchema,
    fullName: z.string().min(2, "Le nom complet est requis"),
    password: passwordSchema,
    googleEmail: z.string().email('Email Google invalide'),
    phone: phoneSchema,
    city: z.string().min(2, 'La ville est requise'),
});

// Login schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Le mot de passe est requis'),
});

// Change password schema
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'L\'ancien mot de passe est requis'),
    newPassword: passwordSchema,
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

// Reset password schema
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token requis'),
    newPassword: passwordSchema,
});

// Review submission schema
export const reviewSubmissionSchema = z.object({
    artisanId: z.string().min(1, 'ID Artisan requis'),
    reviewUrl: z.string().url('URL d\'avis invalide'),
});

// Review order schema
export const reviewOrderSchema = z.object({
    quantity: z.number().int().min(5).max(100, 'La quantité doit être entre 5 et 100'),
});

// Profile update schema
export const profileUpdateSchema = z.object({
    fullName: z.string().min(2, "Le nom complet est requis").optional(),
    avatarUrl: z.string().url("URL d'avatar invalide").optional().or(z.literal('')),
    companyName: z.string().min(2, 'Le nom de l\'entreprise est requis').optional(),
    siret: siretSchema.optional().or(z.literal('')),
    trade: tradeSchema.optional(),
    phone: phoneSchema.optional(),
    address: z.string().min(5, 'L\'adresse est requise').optional(),
    city: z.string().min(2, 'La ville est requise').optional(),
    postalCode: z.string()
        .transform(val => val.replace(/\s/g, ''))
        .refine(val => val === '' || /^\d{5}$/.test(val), 'Le code postal doit faire 5 chiffres')
        .optional(),
    googleBusinessUrl: z.string().url('URL Google Business invalide').optional().or(z.literal('')),
    googleEmail: z.string().email('Email Google invalide').optional().or(z.literal('')),
});

export type ArtisanRegistrationInput = z.infer<typeof artisanRegistrationSchema>;
export type GuideRegistrationInput = z.infer<typeof guideRegistrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
export type ReviewOrderInput = z.infer<typeof reviewOrderSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
