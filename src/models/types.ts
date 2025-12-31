export interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    password_hash: string;
    role: 'artisan' | 'guide' | 'admin';
    status: 'pending' | 'active' | 'suspended' | 'rejected';
    email_verified: boolean;
    created_at: Date;
    updated_at: Date;
    last_login?: Date;
    failed_login_attempts: number;
    account_locked_until?: Date;
    two_factor_secret?: string;
    two_factor_enabled: boolean;
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
    subscription_status?: 'active' | 'inactive' | 'trialing';
    subscription_end_date?: Date;
    created_at: Date;
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
    created_at: Date;
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
    created_at: Date;
}

export interface ReviewOrder {
    id: string;
    artisan_id: string;
    quantity: number;
    price: number;
    status: 'draft' | 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
    reviews_received: number;
    company_name?: string;
    company_context?: string;
    sector?: string;
    zones?: string;
    positioning?: string;
    client_types?: string;
    desired_tone?: string;
    staff_names?: string;
    specific_instructions?: string;
    google_business_url?: string;
    publication_pace?: string;
    metadata?: any;
    created_at: Date;
    completed_at?: Date;
}

export interface ReviewProposal {
    id: string;
    order_id: string;
    content: string;
    rating: number;
    author_name: string;
    status: 'draft' | 'approved' | 'rejected';
    created_at: Date;
    updated_at: Date;
}

export interface ReviewSubmission {
    id: string;
    guide_id: string;
    artisan_id: string;
    order_id?: string;
    proposal_id?: string;
    review_url: string;
    status: 'pending' | 'validated' | 'rejected';
    rejection_reason?: string;
    earnings: number;
    submitted_at: Date;
    validated_at?: Date;
    validated_by?: string;
}

export interface Payment {
    id: string;
    user_id: string;
    type: 'charge' | 'payout';
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    stripe_payment_id?: string;
    description?: string;
    created_at: Date;
    processed_at?: Date;
}

export interface AuditLog {
    id: string;
    user_id?: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
    created_at: Date;
}

// Response types (exclude sensitive data)
export type UserResponse = Omit<User, 'password_hash' | 'failed_login_attempts' | 'account_locked_until' | 'two_factor_secret'>;

export interface ArtisanWithProfile extends UserResponse {
    profile: ArtisanProfile;
}

export interface GuideWithProfile extends UserResponse {
    profile: GuideProfile;
}

export interface AdminWithProfile extends UserResponse {
    profile: AdminProfile;
}

export interface SubscriptionPack {
    id: string;
    name: string;
    price_cents: number;
    quantity: number;
    features: string[] | string; // Handled as JSON in DB
    color: 'standard' | 'premium';
    is_popular: boolean;
    created_at: Date;
}
