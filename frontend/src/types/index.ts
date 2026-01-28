// User types
export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    role: 'artisan' | 'guide' | 'admin';
    status: 'pending' | 'active' | 'suspended' | 'rejected';
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    last_login?: string;
    subscription_status?: string;
    subscription_end_date?: string;
    monthly_reviews_quota?: number;
    current_month_reviews?: number;
    subscription_tier?: string;
    subscription_start_date?: string;
    two_factor_enabled: boolean;
    fiches_allowed?: number;
    fiches_used?: number;
    permissions?: Record<string, boolean>; // For admin team members
    last_detected_country?: string;
    // Artisan Profile Fields
    company_name?: string;
    trade?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    google_business_url?: string;
    // Guide Profile Fields
    local_guide_level?: number;
    total_reviews_validated?: number;
    total_earnings?: number;
    google_email?: string;
}

export interface ArtisanProfile {
    id: string;
    user_id: string;
    company_name: string;
    trade: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    google_business_url?: string;
    monthly_reviews_quota: number;
    current_month_reviews: number;
    total_reviews_received: number;
    subscription_tier?: string;
    fiches_allowed: number;
    created_at: string;
}

export interface GuideProfile {
    id: string;
    user_id: string;
    google_email: string;
    local_guide_level: number;
    total_reviews_count: number;
    phone?: string;
    total_reviews_submitted: number;
    total_reviews_validated: number;
    total_earnings: number;
    created_at: string;
}

export interface AdminProfile {
    id: string;
    user_id: string;
    full_name: string;
    permissions: {
        validate_artisans: boolean;
        validate_reviews: boolean;
        manage_users: boolean;
    };
    created_at: string;
}

// Auth types
export interface LoginCredentials {
    email: string;
    password: string;
}

export interface ArtisanRegistration {
    email: string;
    fullName: string;
    password: string;
    companyName: string;
    trade: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    googleBusinessUrl?: string;
}

export interface GuideRegistration {
    email: string;
    fullName: string;
    password: string;
    googleEmail: string;
    phone: string;
    city: string;
}

export interface AuthResponse {
    user?: User;
    accessToken?: string;
    twoFactorRequired?: boolean;
    mfaToken?: string;
}

// Review types
export interface ReviewOrder {
    id: string;
    artisan_id: string;
    quantity: number;
    price: number;
    status: 'draft' | 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
    reviews_received: number;
    fiche_name?: string;
    company_name?: string;
    google_business_url?: string;
    company_context?: string;
    sector?: string;
    zones?: string;
    services?: string;
    positioning?: string;
    client_types?: string;
    desired_tone?: string;
    staff_names?: string;
    specific_instructions?: string;
    publication_pace?: string;
    payment_id?: string;
    metadata?: any;
    created_at: string;
    completed_at?: string;
    // Anti-Detection
    sector_id?: number | null;
    sector_slug?: string;
    sector_difficulty?: 'easy' | 'medium' | 'hard';
    reviews_per_day?: number;
    rhythme_mode?: 'discret' | 'modere' | 'rapide';
    estimated_duration_days?: number;
    client_cities?: string[] | string;
    payout_per_review?: number;
    establishment_id?: string;
    city?: string;
}

export interface ReviewProposal {
    id: string;
    order_id: string;
    content: string;
    rating: number;
    author_name: string;
    status: 'draft' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    // Joined from submissions
    submission_id?: string;
    review_url?: string;
    submitted_at?: string;
    submission_status?: string;
}

export interface ReviewSubmission {
    id: string;
    guide_id: string;
    artisan_id: string;
    order_id?: string;
    proposal_id?: string;
    review_url: string;
    google_email?: string;
    status: 'pending' | 'validated' | 'rejected';
    rejection_reason?: string;
    earnings: number;
    submitted_at: string;
    validated_at?: string;
    // Guide info for global view
    guide_name?: string;
    guide_avatar?: string;
}

// Subscription Pack types
export interface SubscriptionPack {
    id: string;
    name: string;
    price_cents: number;
    quantity: number;
    features: string[];
    color: 'standard' | 'premium';
    is_popular: boolean;
    created_at: string;
}

// API Error
export interface ApiError {
    error: string;
    message?: string;
    details?: any;
}

export interface Establishment {
    id: string;
    user_id: string;
    name: string;
    slug: string;
    address_line1?: string;
    address_line2?: string;
    city: string;
    postal_code?: string;
    region?: string;
    country: string;
    country_code: string;
    latitude?: number;
    longitude?: number;
    geocoded: boolean;
    phone?: string;
    email?: string;
    website?: string;
    sector_id?: number;
    sector_name?: string;
    sector_slug?: string;
    sector_difficulty?: 'easy' | 'medium' | 'hard';
    platform_links: any;
    source_type: 'google_search' | 'google_link' | 'manual';
    google_place_id?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    rejection_reason?: string;
    google_data?: any;
    google_business_url?: string;
    company_context?: string;
    created_at: string;
    updated_at: string;
}
