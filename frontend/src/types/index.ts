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
    missions_allowed?: number;
    missions_used?: number;
    permissions?: Record<string, boolean>; // For admin team members
}

export interface ArtisanProfile {
    id: string;
    user_id: string;
    company_name: string;
    siret: string;
    trade: 'plombier' | 'electricien' | 'chauffagiste' | 'couvreur' | 'vitrier' | 'paysagiste' | 'menage' | 'demenageur';
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    google_business_url?: string;
    monthly_reviews_quota: number;
    current_month_reviews: number;
    total_reviews_received: number;
    subscription_tier?: string;
    missions_allowed: number;
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
    siret: string;
    trade: ArtisanProfile['trade'];
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
    company_name?: string;
    google_business_url?: string;
    company_context?: string;
    sector?: string;
    zones?: string;
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
