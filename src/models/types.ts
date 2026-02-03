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
    permissions?: any; // JSON field for admin team members
    // Joined Artisan Profile fields
    company_name?: string;
    trade?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal_code?: string;
    google_business_url?: string;
    whatsapp_number?: string;
    subscription_status?: string;
    subscription_end_date?: Date;
    subscription_tier?: string;
    monthly_reviews_quota?: number;
    current_month_reviews?: number;
    subscription_start_date?: Date;
    fiches_allowed?: number;
    fiches_used?: number;
}

export interface AdminLog {
    id: number;
    admin_id: number;
    action: string;
    target_type: string;
    target_id?: number;
    details?: any;
    ip_address?: string;
    created_at: Date;
    admin_name?: string; // Joined field
    admin_email?: string; // Joined field
}

export interface ArtisanProfile {
    id: string;
    user_id: string;
    company_name: string;
    trade: 'plombier' | 'electricien' | 'chauffagiste' | 'couvreur' | 'vitrier' | 'paysagiste' | 'menage' | 'demenageur';
    sector_id?: number;
    sector_difficulty?: 'easy' | 'medium' | 'hard';
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    google_business_url?: string;
    whatsapp_number?: string;
    monthly_reviews_quota: number;
    current_month_reviews: number;
    total_reviews_received: number;
    subscription_tier?: string;
    subscription_status?: 'active' | 'inactive' | 'trialing';
    subscription_end_date?: Date;
    subscription_start_date?: Date;
    last_payment_date?: Date;
    fiches_allowed: number;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_product_id?: string;
    created_at: Date;
}

export interface GuideProfile {
    id: string;
    user_id: string;
    google_email: string;
    local_guide_level: number;
    total_reviews_count: number;
    phone?: string;
    whatsapp_number?: string;
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
    fiche_name?: string;
    artisan_id: string;
    quantity: number;
    price: number;
    status: 'draft' | 'submitted' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
    sector_id?: number;
    sector_slug?: string;
    sector_difficulty?: 'easy' | 'medium' | 'hard';
    city?: string;
    reviews_received: number;
    company_name?: string;
    company_context?: string;
    sector?: string;
    zones?: string;
    services?: string;
    positioning?: string;
    client_types?: string;
    desired_tone?: string;
    staff_names?: string;
    specific_instructions?: string;
    google_business_url?: string;
    establishment_id?: string;
    publication_pace?: string;
    payment_id?: string;
    reviews_per_day?: number;
    rhythme_mode?: string;
    estimated_duration_days?: number;
    client_cities?: string[] | string;
    initial_review_count?: number;
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
    gmail_account_id?: number;
    sector_difficulty?: 'easy' | 'medium' | 'hard';
    submission_warnings?: any;
    auto_validation_score?: number;
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

export interface AntiDetectionRule {
    id: number;
    rule_key: string;
    rule_name: string;
    description_short?: string;
    description_long?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon_emoji?: string;
    order_index: number;
    is_active: boolean;
    impact_stats?: any;
    examples_do?: string[];
    examples_dont?: string[];
    tips?: string[];
}

export interface SectorDifficulty {
    id: number;
    sector_name: string;
    sector_slug: string;
    difficulty: 'easy' | 'medium' | 'hard';
    google_strictness_level: number;
    max_reviews_per_month_per_email?: number;
    min_days_between_reviews: number;
    warning_message?: string;
    tips?: string[];
    icon_emoji?: string;
    validation_rate_avg: number;
    required_gmail_level: 'nouveau' | 'bronze' | 'silver' | 'gold';
    is_active: boolean;
}

export interface GuideGmailAccount {
    id: number;
    user_id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    trust_score: number;
    account_level: 'nouveau' | 'bronze' | 'silver' | 'gold';
    account_age_days: number;
    has_profile_picture: boolean;
    total_reviews_posted: number;
    successful_reviews: number;
    rejected_reviews: number;
    success_rate: number;
    last_review_posted_at?: Date;
    sector_activity_log?: any;
    allowed_sectors?: string[];
}

export interface GuideComplianceScore {
    id: number;
    user_id: string;
    compliance_score: number;
    rules_followed_count: number;
    rules_violated_count: number;
    last_violation_date?: Date;
    violations_log?: any;
    warnings_count: number;
    recommendations?: string[];
    certification_passed: boolean;
    certification_passed_at?: Date;
    certification_score?: number;
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
    platform_links: any; // JSON
    source_type: 'google_search' | 'google_link' | 'manual';
    google_place_id?: string;
    verification_status: 'pending' | 'verified' | 'rejected';
    rejection_reason?: string;
    verified_at?: Date;
    verified_by?: string;
    google_data?: any; // JSON
    created_at: Date;
    updated_at: Date;
    last_sync_google?: Date;
}

export interface EstablishmentVerificationLog {
    id: number;
    establishment_id: string;
    action: 'created' | 'verified' | 'rejected' | 'updated' | 'link_added';
    performed_by: string;
    old_data?: any;
    new_data?: any;
    notes?: string;
    ip_address?: string;
    created_at: Date;
}

export interface GooglePlacesConfig {
    id: number;
    api_key: string;
    is_active: boolean;
    daily_quota: number;
    used_today: number;
    last_reset: string;
    environment: 'development' | 'staging' | 'production';
    created_at: Date;
    updated_at: Date;
}
