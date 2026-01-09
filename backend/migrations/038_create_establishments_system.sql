-- Migration: 038_create_establishments_system.sql
-- Description: Creates the system for managing establishments with multi-mode adding and validation.

-- 1. Table: establishments
CREATE TABLE IF NOT EXISTS establishments (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Address Details
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'France',
    country_code VARCHAR(2) DEFAULT 'FR',
    
    -- Geolocation
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    geocoded BOOLEAN DEFAULT FALSE,
    
    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Sector
    sector_id INT, -- FK to sector_difficulty if applicable
    sector_name VARCHAR(100),
    sector_slug VARCHAR(100),
    sector_difficulty ENUM('easy', 'medium', 'hard'),
    
    -- Platforms (JSON)
    platform_links JSON, -- Stores URLs for Google, Trustpilot, etc.
    
    -- Source and Validation
    source_type ENUM('google_search', 'google_link', 'manual') DEFAULT 'manual',
    google_place_id VARCHAR(255) UNIQUE,
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    verified_at DATETIME,
    verified_by VARCHAR(36),
    
    -- Rich Data
    google_data JSON,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_sync_google DATETIME,
    
    CONSTRAINT fk_establishment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_establishment_sector FOREIGN KEY (sector_id) REFERENCES sector_difficulty(id) ON DELETE SET NULL,
    CONSTRAINT fk_establishment_admin FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: establishment_verification_log
CREATE TABLE IF NOT EXISTS establishment_verification_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    establishment_id VARCHAR(36) NOT NULL,
    action ENUM('created', 'verified', 'rejected', 'updated', 'link_added') NOT NULL,
    performed_by VARCHAR(36) NOT NULL,
    old_data JSON,
    new_data JSON,
    notes TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_log_establishment FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: google_places_config
CREATE TABLE IF NOT EXISTS google_places_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    daily_quota INT DEFAULT 1000,
    used_today INT DEFAULT 0,
    last_reset DATE,
    environment ENUM('development', 'staging', 'production') NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (environment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Update reviews_orders to link to establishment
ALTER TABLE reviews_orders 
ADD COLUMN IF NOT EXISTS establishment_id VARCHAR(36),
ADD CONSTRAINT fk_order_establishment FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_establishments_user ON establishments(user_id);
CREATE INDEX idx_establishments_city ON establishments(city);
CREATE INDEX idx_establishments_status ON establishments(verification_status);
CREATE INDEX idx_establishments_place_id ON establishments(google_place_id);
