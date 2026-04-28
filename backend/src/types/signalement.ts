// Types partagés du module signalement.
// Reflètent les colonnes des tables de la migration 064.

import { SignalementRaisonKey } from '../constants/signalementRaisons';

// ========== Pack template ==========
export interface SignalementPack {
    id: string;
    name: string;
    nb_avis: number;
    nb_signalements_par_avis: number;
    price_cents: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateSignalementPackInput {
    name: string;
    nb_avis: number;
    nb_signalements_par_avis: number;
    price_cents: number;
}

export interface UpdateSignalementPackInput {
    name?: string;
    nb_avis?: number;
    nb_signalements_par_avis?: number;
    price_cents?: number;
    is_active?: boolean;
}

// ========== Attribution (pack assigné à un artisan) ==========
export interface SignalementAttribution {
    id: string;
    artisan_id: string;
    pack_id: string;
    nb_avis_total: number;
    nb_signalements_par_avis: number;
    nb_avis_consumed: number;
    attributed_by: string;
    attributed_at: Date;
    note: string | null;
    deleted_at: Date | null;
}

export interface CreateAttributionInput {
    artisan_id: string;
    pack_id: string;
    note?: string;
}

// Vue agrégée pour l'artisan : combien de slots restants au total ?
export interface ArtisanSignalementSummary {
    avis_remaining: number;          // SUM(nb_avis_total - nb_avis_consumed)
    avis_in_progress: number;        // COUNT signalement_avis WHERE status='active'
    avis_terminated_success: number; // COUNT WHERE status='terminated_success'
    avis_terminated_inconclusive: number;
    has_active_attribution: boolean;
    nb_signalements_par_avis_default: number; // de la dernière attribution active (utilisé pour la création d'avis)
}

// ========== Avis à signaler ==========
export type SignalementAvisStatus =
    | 'active'
    | 'terminated_success'
    | 'terminated_inconclusive'
    | 'cancelled_by_admin';

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
    closed_at: Date | null;
    closed_by_admin_id: string | null;
    relaunched_from_avis_id: string | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateAvisInput {
    google_review_url: string;
    raison: SignalementRaisonKey;
    raison_details?: string;
}

// ========== Slot (1 par signalement à faire) ==========
export type SignalementSlotStatus =
    | 'available'
    | 'reserved'
    | 'submitted'
    | 'validated';

export interface SignalementSlot {
    id: string;
    avis_id: string;
    slot_index: number;
    status: SignalementSlotStatus;
    reserved_by_guide_id: string | null;
    reserved_at: Date | null;
    reservation_expires_at: Date | null;
    submitted_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

// ========== Preuve uploadée par le guide ==========
export type SignalementProofStatus = 'pending' | 'validated' | 'rejected';

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
    submitted_at: Date;
    validated_at: Date | null;
    validated_by: string | null;
    deleted_at: Date | null;
}

export interface SubmitProofInput {
    slot_id: string;
    screenshot_url: string;
    report_link?: string;
    note_guide?: string;
}

// ========== Config globale ==========
export interface SignalementConfig {
    id: 'global';
    cooldown_hours_between_signalements: number;
    default_payout_cents: number;
    reservation_timer_minutes: number;
    min_validated_reviews_for_eligibility: number;
    updated_at: Date;
    updated_by: string | null;
}

export interface UpdateConfigInput {
    cooldown_hours_between_signalements?: number;
    default_payout_cents?: number;
    reservation_timer_minutes?: number;
    min_validated_reviews_for_eligibility?: number;
}

// ========== Éligibilité guide ==========
export interface GuideEligibilityResult {
    eligible: boolean;
    reasons: string[]; // raisons de non-éligibilité (vide si éligible)
    kyc_validated: boolean;
    validated_reviews_count: number;
    min_required: number;
}
