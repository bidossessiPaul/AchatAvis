// Types frontend pour le module signalement.
// Reflète les types backend/src/types/signalement.ts (doit rester sync).

import type { SignalementRaisonKey } from '../constants/signalementRaisons';

export type SignalementAvisStatus =
    | 'active'
    | 'terminated_success'
    | 'terminated_inconclusive'
    | 'cancelled_by_admin';

export type SignalementSlotStatus =
    | 'available'
    | 'reserved'
    | 'submitted'
    | 'validated';

export type SignalementProofStatus = 'pending' | 'validated' | 'rejected';

export interface SignalementPack {
    id: string;
    name: string;
    nb_avis: number;
    nb_signalements_par_avis: number;
    price_cents: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface SignalementAttribution {
    id: string;
    artisan_id: string;
    pack_id: string;
    nb_avis_total: number;
    nb_signalements_par_avis: number;
    nb_avis_consumed: number;
    is_paused: boolean;
    attributed_by: string;
    attributed_at: string;
    note: string | null;
    deleted_at: string | null;
}

export interface SignalementAvis {
    id: string;
    artisan_id: string;
    attribution_id: string;
    google_review_url: string;
    raison: SignalementRaisonKey;
    raison_details: string | null;
    nb_signalements_target: number;
    nb_signalements_validated: number;
    payout_per_signalement_cents: number;
    status: SignalementAvisStatus;
    closed_at: string | null;
    closed_by_admin_id: string | null;
    relaunched_from_avis_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface SignalementSlot {
    id: string;
    avis_id: string;
    slot_index: number;
    status: SignalementSlotStatus;
    reserved_by_guide_id: string | null;
    reserved_at: string | null;
    reservation_expires_at: string | null;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SignalementProof {
    id: string;
    slot_id: string;
    avis_id: string;
    guide_id: string;
    screenshot_url: string;
    report_link: string | null;
    note_guide: string | null;
    status: SignalementProofStatus;
    rejection_reason: string | null;
    earnings_cents: number;
    submitted_at: string;
    validated_at: string | null;
    validated_by: string | null;
    deleted_at: string | null;
}

export interface SignalementProofWithContext extends SignalementProof {
    google_review_url: string;
    raison: SignalementRaisonKey;
    raison_details: string | null;
    artisan_id: string;
    guide_email: string;
}

export interface SignalementConfig {
    id: 'global';
    cooldown_hours_between_signalements: number;
    default_payout_cents: number;
    reservation_timer_minutes: number;
    min_validated_reviews_for_eligibility: number;
    updated_at: string;
    updated_by: string | null;
}

export interface ArtisanSignalementSummary {
    avis_remaining: number;
    avis_quota_total: number;
    avis_in_progress: number;
    avis_terminated_success: number;
    avis_terminated_inconclusive: number;
    has_active_pack: boolean;
}

export interface GuideEligibility {
    eligible: boolean;
    reasons: string[];
    kyc_validated: boolean;
    validated_reviews_count: number;
    min_required: number;
}

export interface AvailableAvisForGuide {
    avis_id: string;
    google_review_url: string;
    raison: SignalementRaisonKey;
    raison_details: string | null;
    payout_per_signalement_cents: number;
    nb_slots_remaining: number;
    nb_signalements_target: number;
    nb_signalements_validated: number;
    can_take: boolean;
    blocked_reason?: string;
    cooldown_next_at?: string;
}

export interface ActiveSlotForGuide {
    slot_id: string;
    avis_id: string;
    google_review_url: string;
    raison: SignalementRaisonKey;
    payout_per_signalement_cents: number;
    reserved_at: string;
    reservation_expires_at: string;
}

export interface GuideSignalementStats {
    pending_count: number;
    validated_count: number;
    rejected_count: number;
    total_earnings_cents: number;
    balance_cents: number;
}

export interface GlobalSignalementStats {
    avis_active: number;
    avis_terminated_success: number;
    avis_terminated_inconclusive: number;
    signalements_validated_this_month: number;
    pending_proofs_count: number;
}
