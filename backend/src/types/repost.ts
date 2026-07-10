// Types partagés du module repost social.
// Reflètent les colonnes des tables de la migration 088.

// ========== Palier d'abonnés (configurable admin) ==========
export interface RepostTier {
    id: string;
    label: string;
    min_followers: number;
    max_followers: number | null;
    amount_cents: number; // montant de base payé par repost validé sur un compte de ce palier
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateTierInput {
    label: string;
    min_followers: number;
    max_followers?: number | null;
    amount_cents: number;
    sort_order?: number;
}

export interface UpdateTierInput {
    label?: string;
    min_followers?: number;
    max_followers?: number | null;
    amount_cents?: number;
    sort_order?: number;
    is_active?: boolean;
}

// ========== Palier de vues (rattaché à un palier d'abonnés) ==========
export interface RepostViewTier {
    id: string;
    subscriber_tier_id: string;
    label: string;
    min_views: number;
    max_views: number | null;
    amount_cents: number;
    is_active: boolean;
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateViewTierInput {
    subscriber_tier_id: string;
    label: string;
    min_views: number;
    max_views?: number | null;
    amount_cents: number;
    sort_order?: number;
}

export interface UpdateViewTierInput {
    label?: string;
    min_views?: number;
    max_views?: number | null;
    amount_cents?: number;
    sort_order?: number;
    is_active?: boolean;
}

// ========== Compte réseau social d'un guide ==========
export type RepostAccountStatus = 'pending' | 'approved' | 'rejected';

export interface RepostAccount {
    id: string;
    guide_id: string;
    platform: string;
    profile_link: string;
    screenshot_url: string;
    claimed_followers_count: number;
    tier_id: string | null;
    status: RepostAccountStatus;
    admin_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    created_at: Date;
    deleted_at: Date | null;
}

export interface SubmitAccountInput {
    guideId: string;
    platform: string;
    profileLink: string;
    claimedFollowersCount: number;
    screenshotBuffer: Buffer;
}

// ========== Vidéo à reposter (vidéothèque admin) ==========
export interface RepostVideo {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string | null;
    platforms: string | null;
    min_tier_id: string | null;
    is_active: boolean;
    created_by: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateVideoInput {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    platforms?: string;
    min_tier_id?: string | null;
}

export interface UpdateVideoInput {
    title?: string;
    description?: string;
    video_url?: string;
    thumbnail_url?: string;
    platforms?: string;
    min_tier_id?: string | null;
    is_active?: boolean;
}

// ========== Soumission de repost (un compte poste une vidéo) ==========
export type RepostSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface RepostSubmission {
    id: string;
    account_id: string;
    video_id: string;
    post_link: string;
    screenshot_url: string;
    base_earnings_cents: number;
    status: RepostSubmissionStatus;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    latest_declared_views: number;
    view_earnings_cents: number;
    created_at: Date;
    deleted_at: Date | null;
}

export interface SubmitRepostProofInput {
    accountId: string;
    videoId: string;
    postLink: string;
    screenshotBuffer: Buffer;
}

// ========== Déclaration de vues (historique, preuve + validation) ==========
export type RepostViewUpdateStatus = 'pending' | 'approved' | 'rejected';

export interface RepostViewUpdate {
    id: string;
    submission_id: string;
    declared_views: number;
    screenshot_url: string;
    matched_view_tier_id: string | null;
    credited_amount_cents: number;
    status: RepostViewUpdateStatus;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    created_at: Date;
    deleted_at: Date | null;
}

export interface SubmitViewUpdateInput {
    submissionId: string;
    declaredViews: number;
    screenshotBuffer: Buffer;
}
