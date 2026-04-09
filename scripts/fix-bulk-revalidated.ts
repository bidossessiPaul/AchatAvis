/**
 * One-time fix script: Reset incorrectly bulk-validated submissions back to pending
 *
 * Usage: npx ts-node scripts/fix-bulk-revalidated.ts [--dry-run] [--execute]
 * Default: --dry-run (just shows what would be changed)
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

const isDryRun = !process.argv.includes('--execute');

async function main() {
    console.log(isDryRun ? '\n=== DRY RUN MODE (add --execute to apply) ===' : '\n=== EXECUTING FIXES ===');

    const connection = await pool.getConnection();
    try {
        // Step 0: Count affected submissions
        const [affected]: any = await connection.query(`
            SELECT COUNT(*) as cnt
            FROM reviews_submissions
            WHERE status = 'validated'
              AND validated_by IS NULL
              AND validated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        `);
        console.log(`\nAffected submissions (validated_by IS NULL, last 3 days): ${affected[0]?.cnt}`);

        // Show a sample
        const [sample]: any = await connection.query(`
            SELECT s.id, s.guide_id, s.status, s.validated_at, s.validated_by,
                   ro.company_name, ro.artisan_id
            FROM reviews_submissions s
            JOIN review_proposals p ON s.proposal_id = p.id
            JOIN reviews_orders ro ON p.order_id = ro.id
            WHERE s.status = 'validated'
              AND s.validated_by IS NULL
              AND s.validated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
            LIMIT 10
        `);
        console.log('\nSample of affected submissions:');
        for (const row of sample) {
            console.log(`  - ${row.id} | ${row.company_name} | validated_at: ${row.validated_at}`);
        }

        // Count affected artisans
        const [artisans]: any = await connection.query(`
            SELECT ro.artisan_id, ro.company_name, COUNT(*) as cnt
            FROM reviews_submissions s
            JOIN review_proposals p ON s.proposal_id = p.id
            JOIN reviews_orders ro ON p.order_id = ro.id
            WHERE s.status = 'validated'
              AND s.validated_by IS NULL
              AND s.validated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
            GROUP BY ro.artisan_id, ro.company_name
            ORDER BY cnt DESC
        `);
        console.log(`\nAffected artisans: ${artisans.length}`);
        for (const a of artisans.slice(0, 20)) {
            console.log(`  - ${a.company_name}: ${a.cnt} avis`);
        }

        if (isDryRun) {
            console.log('\n--- DRY RUN: No changes made. Run with --execute to apply. ---\n');
            process.exit(0);
        }

        // === EXECUTE FIXES ===
        await connection.beginTransaction();

        // Step 1: Reset submissions to pending
        const [result1]: any = await connection.query(`
            UPDATE reviews_submissions
            SET status = 'pending',
                validated_at = NULL,
                validated_by = NULL,
                rejection_reason = NULL,
                allow_resubmit = 0,
                allow_appeal = 0,
                rejected_at = NULL,
                slot_released_at = NULL
            WHERE status = 'validated'
              AND validated_by IS NULL
              AND validated_at >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        `);
        console.log(`\nStep 1: Reset ${result1.affectedRows} submissions to 'pending'`);

        // Step 2: Recalculate ALL artisan stats
        const [result2]: any = await connection.query(`
            UPDATE artisans_profiles ap
            SET ap.total_reviews_received = (
                  SELECT COUNT(*)
                  FROM reviews_submissions rs
                  JOIN review_proposals rp ON rs.proposal_id = rp.id
                  JOIN reviews_orders ro ON rp.order_id = ro.id
                  WHERE ro.artisan_id = ap.user_id AND rs.status = 'validated'
                ),
                ap.current_month_reviews = (
                  SELECT COUNT(*)
                  FROM reviews_submissions rs
                  JOIN review_proposals rp ON rs.proposal_id = rp.id
                  JOIN reviews_orders ro ON rp.order_id = ro.id
                  WHERE ro.artisan_id = ap.user_id
                    AND rs.status = 'validated'
                    AND rs.validated_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
                )
        `);
        console.log(`Step 2: Updated ${result2.affectedRows} artisan profiles`);

        // Step 3: Fix order statuses
        const [result3]: any = await connection.query(`
            UPDATE reviews_orders ro
            SET ro.status = 'in_progress'
            WHERE ro.status = 'completed'
              AND (
                SELECT COUNT(*)
                FROM reviews_submissions s
                JOIN review_proposals p ON s.proposal_id = p.id
                WHERE p.order_id = ro.id AND s.status = 'validated'
              ) < ro.quantity
        `);
        console.log(`Step 3: Reset ${result3.affectedRows} orders from 'completed' to 'in_progress'`);

        await connection.commit();
        console.log('\n=== ALL FIXES APPLIED SUCCESSFULLY ===\n');

    } catch (error) {
        await connection.rollback();
        console.error('\nERROR - Transaction rolled back:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();
