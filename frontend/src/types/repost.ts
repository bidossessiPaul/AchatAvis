// Types partagés du module repost social (frontend).
// Reflètent les types backend (backend/src/types/repost.ts).

export interface RepostTier {
    id: string;
    label: string;
    min_followers: number;
    max_followers: number | null;
    amount_cents: number; // montant de base payé par repost validé sur un compte de ce palier
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface RepostViewTier {
    id: string;
    subscriber_tier_id: string;
    label: string;
    min_views: number;
    max_views: number | null;
    amount_cents: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

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
    reviewed_at: string | null;
    blocked_at?: string | null; // non-NULL = compte approuvé mais bloqué
    created_at: string;
    guide_full_name?: string;
    guide_email?: string;
    suggested_tier_id?: string | null;
}

export interface RepostVideo {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    thumbnail_url: string | null;
    platforms: string | null;
    min_tier_id: string | null;
    is_active: boolean;
    created_at: string;
}

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
    reviewed_at: string | null;
    latest_declared_views: number;
    view_earnings_cents: number;
    created_at: string;
    guide_full_name?: string;
    guide_email?: string;
    platform?: string;
    profile_link?: string;
    video_title?: string;
}

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
    reviewed_at: string | null;
    created_at: string;
    guide_full_name?: string;
    guide_email?: string;
    video_title?: string;
    platform?: string;
    post_link?: string;
}

export interface RepostGuideStats {
    pending_submissions_count: number;
    approved_submissions_count: number;
    rejected_submissions_count: number;
    pending_view_updates_count: number;
    total_earnings_cents: number;
}

export const REPOST_PLATFORMS = [
    'TikTok',
    'Instagram',
    'YouTube',
    'Facebook',
    'X (Twitter)',
    'Snapchat',
];
