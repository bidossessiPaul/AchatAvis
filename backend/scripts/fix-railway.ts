import { pool } from './src/config/database';

async function fix() {
    const conn = await pool.getConnection();
    try {
        // 1. payments
        await conn.query(`CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36),
            type VARCHAR(20) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            stripe_payment_id VARCHAR(255),
            description TEXT,
            fiches_quota INT DEFAULT 0,
            fiches_used INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            processed_at DATETIME,
            CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: payments');

        // 2. reviews_orders
        await conn.query(`CREATE TABLE IF NOT EXISTS reviews_orders (
            id VARCHAR(36) PRIMARY KEY,
            artisan_id VARCHAR(36),
            quantity INT NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            reviews_received INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            payment_id VARCHAR(36),
            fiche_name VARCHAR(255),
            google_business_url TEXT,
            specific_instructions TEXT,
            payout_per_review DECIMAL(10,2) DEFAULT 1.50,
            paused_at DATETIME NULL,
            status_before_pause VARCHAR(20) NULL,
            establishment_id VARCHAR(36),
            locked_by VARCHAR(36) DEFAULT NULL,
            locked_until DATETIME DEFAULT NULL,
            CONSTRAINT fk_order_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_order_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: reviews_orders');

        // 3. reviews_submissions
        await conn.query(`CREATE TABLE IF NOT EXISTS reviews_submissions (
            id VARCHAR(36) PRIMARY KEY,
            guide_id VARCHAR(36),
            artisan_id VARCHAR(36),
            order_id VARCHAR(36),
            review_url TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            rejection_reason TEXT,
            earnings DECIMAL(10,2) DEFAULT 1.00,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            validated_at DATETIME,
            validated_by VARCHAR(36),
            allow_resubmit TINYINT(1) DEFAULT 0,
            allow_appeal TINYINT(1) DEFAULT 0,
            CONSTRAINT fk_submission_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_submission_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_submission_order FOREIGN KEY (order_id) REFERENCES reviews_orders(id) ON DELETE SET NULL,
            CONSTRAINT fk_submission_validator FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: reviews_submissions');

        // 4. notifications
        await conn.query(`CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            metadata JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: notifications');

        // 5. guide_gmail_accounts
        await conn.query(`CREATE TABLE IF NOT EXISTS guide_gmail_accounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guide_id VARCHAR(36) NOT NULL,
            email VARCHAR(255) NOT NULL,
            local_guide_level INT DEFAULT 1,
            total_reviews INT DEFAULT 0,
            is_primary BOOLEAN DEFAULT FALSE,
            status VARCHAR(20) DEFAULT 'active',
            monthly_reviews_posted INT DEFAULT 0,
            monthly_quota_limit INT DEFAULT 20,
            monthly_reset_date DATE,
            deleted_at DATETIME NULL DEFAULT NULL,
            deleted_by_user_id VARCHAR(36) NULL DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_gmail_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: guide_gmail_accounts');

        // 6. admin_logs
        await conn.query(`CREATE TABLE IF NOT EXISTS admin_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id VARCHAR(36) NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50),
            target_id VARCHAR(36),
            details JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_admin_log_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: admin_logs');

        // 7. suspension_config
        await conn.query(`CREATE TABLE IF NOT EXISTS suspension_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            registration_enabled BOOLEAN DEFAULT TRUE,
            suspension_message TEXT,
            blocked_countries JSON,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await conn.query(`INSERT IGNORE INTO suspension_config (id, registration_enabled, blocked_countries) VALUES (1, TRUE, '[]')`);
        console.log('OK: suspension_config');

        // 8. establishments
        await conn.query(`CREATE TABLE IF NOT EXISTS establishments (
            id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            address_line1 VARCHAR(255),
            address_line2 VARCHAR(255),
            city VARCHAR(100) NOT NULL,
            postal_code VARCHAR(20),
            region VARCHAR(100),
            country VARCHAR(100) DEFAULT 'France',
            country_code VARCHAR(2) DEFAULT 'FR',
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            phone VARCHAR(50),
            email VARCHAR(255),
            website VARCHAR(255),
            sector_id INT,
            sector_name VARCHAR(100),
            sector_slug VARCHAR(100),
            platform_links JSON,
            source_type ENUM('google_search', 'google_link', 'manual') DEFAULT 'manual',
            google_place_id VARCHAR(255) UNIQUE,
            verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
            google_data JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_establishment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: establishments');

        // 9. guide_level_verifications
        await conn.query(`CREATE TABLE IF NOT EXISTS guide_level_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guide_id VARCHAR(36) NOT NULL,
            gmail_account_id INT NOT NULL,
            screenshot_url TEXT NOT NULL,
            profile_link VARCHAR(500) NOT NULL,
            claimed_level INT NOT NULL,
            current_level INT NOT NULL DEFAULT 1,
            status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            admin_notes TEXT NULL,
            reviewed_by VARCHAR(36) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at DATETIME NULL,
            CONSTRAINT fk_level_verif_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_level_verif_gmail FOREIGN KEY (gmail_account_id) REFERENCES guide_gmail_accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        console.log('OK: guide_level_verifications');

        // 10. Add stripe_link to subscription_packs
        try {
            await conn.query(`ALTER TABLE subscription_packs ADD COLUMN stripe_link VARCHAR(500) DEFAULT NULL`);
            console.log('OK: stripe_link added');
        } catch (e: any) {
            console.log('stripe_link: ' + e.message.substring(0, 50));
        }

        // 11. Add missing columns to users
        const userCols = [
            'full_name VARCHAR(255)',
            'avatar_url TEXT',
            'two_factor_enabled BOOLEAN DEFAULT FALSE',
            'two_factor_secret VARCHAR(255)',
            'permissions JSON DEFAULT NULL',
            'last_seen DATETIME',
            'last_user_agent TEXT',
        ];
        for (const col of userCols) {
            try { await conn.query(`ALTER TABLE users ADD COLUMN ${col}`); } catch (e) {}
        }
        console.log('OK: users columns');

        // 12. Add missing columns to artisans_profiles
        const artCols = [
            'subscription_status VARCHAR(20) DEFAULT \'none\'',
            'subscription_end_date DATETIME',
            'subscription_start_date DATETIME',
            'fiches_allowed INT DEFAULT 0',
            'whatsapp_number VARCHAR(20)',
        ];
        for (const col of artCols) {
            try { await conn.query(`ALTER TABLE artisans_profiles ADD COLUMN ${col}`); } catch (e) {}
        }
        console.log('OK: artisans_profiles columns');

        // 13. Add missing columns to guides_profiles
        try { await conn.query(`ALTER TABLE guides_profiles ADD COLUMN whatsapp_number VARCHAR(20)`); } catch (e) {}
        console.log('OK: guides_profiles columns');

        // 14. Update subscription_packs with data
        const packs = [
            ['discovery', 'STARTER', 26900, 10, JSON.stringify(["10 avis Google / mois", "1 fiche Google", "Support par email", "Tableau de bord basique"]), 1, 'https://buy.stripe.com/aFabJ270L4Zw3kq4vW7Re12'],
            ['growth', 'PROFESSIONNEL', 29897, 30, JSON.stringify(["30 avis Google / mois", "3 fiches Google", "Support prioritaire", "Tableau de bord avancé", "Rapports mensuels"]), 3, 'https://buy.stripe.com/4gM14o3OzgIe9IOd2s7Re13'],
            ['expert', 'ENTREPRISE', 68900, 100, JSON.stringify(["100 avis Google / mois", "10 fiches Google", "Support dédié 24/7", "Tableau de bord premium", "API access", "Manager dédié"]), 10, 'https://buy.stripe.com/14A3cw5WHbnU1cifaA7Re14'],
        ];
        for (const p of packs) {
            await conn.query(
                `INSERT INTO subscription_packs (id, name, price_cents, reviews_per_month, features, fiches_quota, stripe_link)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), price_cents=VALUES(price_cents), reviews_per_month=VALUES(reviews_per_month), features=VALUES(features), fiches_quota=VALUES(fiches_quota), stripe_link=VALUES(stripe_link)`,
                p
            );
        }
        console.log('OK: subscription_packs data');

        // 15. Indexes
        try { await conn.query('CREATE INDEX idx_orders_status ON reviews_orders(status)'); } catch (e) {}
        try { await conn.query('CREATE INDEX idx_submissions_status ON reviews_submissions(status)'); } catch (e) {}
        try { await conn.query('CREATE INDEX idx_notif_user ON notifications(user_id)'); } catch (e) {}
        console.log('OK: indexes');

        // Remove trade constraint from artisans_profiles
        try { await conn.query('ALTER TABLE artisans_profiles DROP CONSTRAINT chk_trade'); } catch (e) {}
        console.log('OK: removed trade constraint');

        console.log('\n=== All tables and data ready! ===');
    } finally {
        conn.release();
        await pool.end();
    }
}

fix().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
