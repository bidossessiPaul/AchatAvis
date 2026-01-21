/**
 * 🔧 Trust Score Migration Script - MySQL Compatible
 * Adds Trust Score columns to guide_gmail_accounts table
 */

import { pool } from '../config/database';

async function runMigration() {
    console.log('🚀 Starting Trust Score migration for guide_gmail_accounts...\n');

    const connection = await pool.getConnection();

    try {
        // Define all columns to add
        const columns = [
            // Email validation
            { name: 'email_syntax_valid', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'email_mx_valid', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'email_is_disposable', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'email_suspicious_pattern', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'email_estimated_age_months', type: 'INT DEFAULT 0' },
            { name: 'email_validation_score', type: 'INT DEFAULT 0' },
            { name: 'email_last_validated_at', type: 'DATETIME' },

            // Google Maps profile
            { name: 'google_maps_profile_url', type: 'TEXT' },
            { name: 'local_guide_level', type: 'INT DEFAULT 0' },
            { name: 'google_maps_points', type: 'INT DEFAULT 0' },
            { name: 'total_reviews', type: 'INT DEFAULT 0' },
            { name: 'total_photos', type: 'INT DEFAULT 0' },
            { name: 'first_review_date', type: 'DATETIME' },
            { name: 'account_age_months', type: 'INT DEFAULT 0' },
            { name: 'maps_profile_score', type: 'INT DEFAULT 0' },
            { name: 'maps_last_scraped_at', type: 'DATETIME' },

            // Pattern detection
            { name: 'pattern_all_five_stars', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'pattern_no_public_reviews', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'pattern_recent_burst', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'flagged_reviews_count', type: 'INT DEFAULT 0' },

            // Trust Score
            { name: 'trust_score_value', type: 'INT DEFAULT 0' },
            { name: 'trust_level', type: 'VARCHAR(20) DEFAULT "BLOCKED"' },
            { name: 'trust_badge', type: 'VARCHAR(50)' },
            { name: 'max_reviews_per_month', type: 'INT DEFAULT 0' },
            { name: 'is_blocked', type: 'BOOLEAN DEFAULT TRUE' },
            { name: 'trust_score_breakdown', type: 'JSON' },
            { name: 'trust_last_calculated_at', type: 'DATETIME' },

            // Verifications
            { name: 'phone_verified', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'phone_verified_at', type: 'DATETIME' },
            { name: 'manual_verification_status', type: 'VARCHAR(20) DEFAULT "pending"' },
            { name: 'admin_notes', type: 'TEXT' },
        ];

        let addedCount = 0;
        let skippedCount = 0;

        console.log(`📝 Attempting to add ${columns.length} columns...\n`);

        for (const col of columns) {
            try {
                await connection.query(
                    `ALTER TABLE guide_gmail_accounts ADD COLUMN ${col.name} ${col.type}`
                );
                console.log(`✅ Added: ${col.name}`);
                addedCount++;
            } catch (error: any) {
                if (error.code === 'ER_DUP_FIELDNAME') {
                    // Column already exists, skip
                    skippedCount++;
                } else {
                    console.error(`❌ Error adding ${col.name}:`, error.message);
                }
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Added: ${addedCount} columns`);
        console.log(`   ⏭️  Skipped: ${skippedCount} columns (already exist)`);

        // Add indexes
        console.log(`\n🔍 Creating indexes...`);
        const indexes = [
            { name: 'idx_trust_score_value', column: 'trust_score_value DESC' },
            { name: 'idx_trust_level', column: 'trust_level' },
            { name: 'idx_is_blocked', column: 'is_blocked' },
            { name: 'idx_local_guide_level', column: 'local_guide_level DESC' },
            { name: 'idx_email_disposable', column: 'email_is_disposable' },
            { name: 'idx_phone_verified', column: 'phone_verified' },
        ];

        let indexCount = 0;
        for (const idx of indexes) {
            try {
                await connection.query(
                    `CREATE INDEX ${idx.name} ON guide_gmail_accounts(${idx.column})`
                );
                console.log(`✅ Created index: ${idx.name}`);
                indexCount++;
            } catch (error: any) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    // Index already exists
                } else {
                    console.error(`❌ Error creating ${idx.name}:`, error.message);
                }
            }
        }

        console.log(`\n✅ Created ${indexCount} new indexes`);

        // Verify
        console.log(`\n🔍 Verifying migration...`);
        const [columns_result]: any = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'guide_gmail_accounts' 
        AND (COLUMN_NAME LIKE '%trust%' OR COLUMN_NAME LIKE '%email_%' OR COLUMN_NAME LIKE '%pattern_%')
      ORDER BY COLUMN_NAME
    `);

        if (columns_result.length > 0) {
            console.log(`✅ Found ${columns_result.length} Trust Score columns in database`);
        }

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
}

// Run migration
runMigration()
    .then(() => {
        console.log('\n🎉 Migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    });
