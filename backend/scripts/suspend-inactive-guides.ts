/**
 * Suspend all guides who have never submitted a review (0 submissions)
 * with reason = 'identity_verification_required'.
 *
 * Default mode is DRY-RUN. Pass --execute to actually apply.
 *
 * Usage:
 *   npx tsx scripts/suspend-inactive-guides.ts             # dry run
 *   npx tsx scripts/suspend-inactive-guides.ts --execute   # apply
 */
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';

const isDryRun = !process.argv.includes('--execute');

async function main() {
    console.log(isDryRun
        ? '\n=== DRY RUN MODE (add --execute to apply) ==='
        : '\n=== EXECUTING SUSPENSION ===');

    const connection = await pool.getConnection();
    try {
        // Find guides with 0 submitted reviews, currently active or pending,
        // NOT already awaiting identity verification.
        const [candidates]: any = await connection.query(`
            SELECT u.id, u.email, u.full_name, u.status, u.created_at,
                   COUNT(rs.id) as submission_count
            FROM users u
            LEFT JOIN reviews_submissions rs ON u.id = rs.guide_id
            WHERE u.role = 'guide'
              AND u.status IN ('active', 'pending')
              AND (u.suspension_reason IS NULL OR u.suspension_reason != 'identity_verification_required')
            GROUP BY u.id, u.email, u.full_name, u.status, u.created_at
            HAVING submission_count = 0
            ORDER BY u.created_at DESC
        `);

        console.log(`\nFound ${candidates.length} guides with 0 submissions`);

        if (candidates.length === 0) {
            console.log('Nothing to do.');
            return;
        }

        // Sample print
        console.log('\nFirst 10 candidates:');
        candidates.slice(0, 10).forEach((c: any, i: number) => {
            console.log(`  ${i + 1}. ${c.email} (${c.full_name || '—'}) — ${c.status} — created ${new Date(c.created_at).toLocaleDateString('fr-FR')}`);
        });
        if (candidates.length > 10) console.log(`  ... and ${candidates.length - 10} more`);

        if (isDryRun) {
            console.log('\n⚠️  DRY RUN — no changes applied. Add --execute to suspend these accounts.');
            return;
        }

        // Apply suspension
        console.log('\nApplying suspension...');
        const ids = candidates.map((c: any) => c.id);
        const placeholders = ids.map(() => '?').join(',');

        await connection.query(
            `UPDATE users
             SET status = 'suspended',
                 suspension_reason = 'identity_verification_required'
             WHERE id IN (${placeholders})`,
            ids
        );

        console.log(`\n✅ Suspended ${candidates.length} guides`);
        console.log('They will be redirected to /identity-verification on next login.');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

main();
