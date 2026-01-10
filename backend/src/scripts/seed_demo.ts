
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

async function run() {
    console.log('🌱 Starting Comprehensive Demo Data Seeding...');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const commonPassword = await hashPassword('AchatAvis2026!');

        // 1. Seed Subscription Packs
        console.log('📦 Seeding Subscription Packs...');
        const packs = [
            { id: uuidv4(), name: 'Pack Starter', price: 4900, qty: 20, features: JSON.stringify(['20 avis Google', 'Support standard', 'Validité 6 mois']), color: 'standard', popular: false },
            { id: uuidv4(), name: 'Pack Premium', price: 9900, qty: 50, features: JSON.stringify(['50 avis Google', 'Support prioritaire', 'Optimisation SEO', 'Validité illimitée']), color: 'premium', popular: true },
            { id: uuidv4(), name: 'Pack Enterprise', price: 18900, qty: 100, features: JSON.stringify(['100 avis Google', 'Account Manager dédié', 'Garantie anti-suppression', 'Multi-comptes']), color: 'premium', popular: false },
        ];

        for (const p of packs) {
            await connection.execute(
                `INSERT IGNORE INTO subscription_packs (id, name, price_cents, quantity, features, color, is_popular) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [p.id, p.name, p.price, p.qty, p.features, p.color, p.popular]
            );
        }

        // 2. Seed Sectors
        console.log('🏗️ Seeding Sectors...');
        const sectors = [
            { name: 'Restauration', slug: 'restauration', diff: 'easy', icon: '🍽️' },
            { name: 'Plomberie', slug: 'plomberie', diff: 'hard', icon: '🔧' },
            { name: 'Électricité', slug: 'electricite', diff: 'medium', icon: '⚡' },
            { name: 'Immobilier', slug: 'immobilier', diff: 'hard', icon: '🏠' },
            { name: 'Coiffure', slug: 'coiffure', diff: 'easy', icon: '✂️' },
        ];

        for (const s of sectors) {
            await connection.execute(
                `INSERT IGNORE INTO sector_difficulty (sector_name, sector_slug, difficulty, google_strictness_level, icon_emoji) 
                 VALUES (?, ?, ?, ?, ?)`,
                [s.name, s.slug, s.diff, s.diff === 'hard' ? 5 : (s.diff === 'medium' ? 3 : 1), s.icon]
            );
        }

        // 3. Seed Users (Artisan & Guide)
        console.log('👥 Seeding Demo Users...');

        // Demo Artisan
        const artisanId = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO users (id, email, password_hash, full_name, role, status, email_verified) 
             VALUES (?, ?, ?, ?, 'artisan', 'active', true)`,
            [artisanId, 'artisan@demo.com', commonPassword, 'Jean Artisan']
        );

        await connection.execute(
            `INSERT IGNORE INTO artisans_profiles 
             (id, user_id, company_name, siret, trade, phone, address, city, postal_code, monthly_reviews_quota, subscription_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), artisanId, 'Lannkin Informatique', '12345678901234', 'electricien', '0102030405', '12 rue de la Paix', 'Paris', '75001', 50, 'active']
        );

        // Demo Guide 1 (Novice)
        const guide1Id = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO users (id, email, password_hash, full_name, role, status, email_verified) 
             VALUES (?, ?, ?, ?, 'guide', 'active', true)`,
            [guide1Id, 'guide1@demo.com', commonPassword, 'Marc Novice']
        );

        await connection.execute(
            `INSERT IGNORE INTO guides_profiles 
             (id, user_id, google_email, local_guide_level, total_reviews_count, phone, city, total_reviews_validated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), guide1Id, 'marc.google@gmail.com', 1, 5, '0601020304', 'Lyon', 3]
        );

        // Demo Guide 2 (Expert)
        const guide2Id = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO users (id, email, password_hash, full_name, role, status, email_verified) 
             VALUES (?, ?, ?, ?, 'guide', 'active', true)`,
            [guide2Id, 'guide2@demo.com', commonPassword, 'Sarah Expert']
        );

        await connection.execute(
            `INSERT IGNORE INTO guides_profiles 
             (id, user_id, google_email, local_guide_level, total_reviews_count, phone, city, total_reviews_validated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), guide2Id, 'sarah.expert@gmail.com', 4, 150, '0605060708', 'Bordeaux', 125]
        );

        // 4. Seed Missions (Reviews Orders)
        console.log('🚀 Seeding Missions...');

        // Mission 1: In Progress
        const order1Id = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO reviews_orders (id, artisan_id, quantity, price, status, reviews_received, company_name, sector, publication_pace, payout_per_review) 
             VALUES (?, ?, ?, ?, 'in_progress', 3, 'Lannkin Informatique', 'Informatique & Réparation', '1 par jour', 1.50)`,
            [order1Id, artisanId, 20, 30.00]
        );

        // Mission 2: Full Today (Quota reached)
        const order2Id = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO reviews_orders (id, artisan_id, quantity, price, status, reviews_received, company_name, sector, publication_pace, payout_per_review) 
             VALUES (?, ?, ?, ?, 'in_progress', 0, 'CALLCENTER CALLCONNECT SARL', 'Peinture & Décoration', '0 par jour', 1.50)`,
            [order2Id, artisanId, 10, 15.00]
        );

        // Mission 3: High Payout (Expert)
        const order3Id = uuidv4();
        await connection.execute(
            `INSERT IGNORE INTO reviews_orders (id, artisan_id, quantity, price, status, reviews_received, company_name, sector, publication_pace, payout_per_review) 
             VALUES (?, ?, ?, ?, 'in_progress', 5, 'Boulangerie de la Tour', 'Restauration', '2 par jour', 2.50)`,
            [order3Id, artisanId, 30, 75.00]
        );

        // 5. Seed Proposals for Missions
        console.log('📝 Seeding Review Proposals...');
        const proposals = [
            { id: uuidv4(), orderId: order1Id, content: 'Excellent service, technicien très professionnel et rapide. Je recommande !', author: 'Paul Durand' },
            { id: uuidv4(), orderId: order1Id, content: 'Mon ordinateur a été réparé en moins de 24h. Prix très correct.', author: 'Julie Martin' },
            { id: uuidv4(), orderId: order3Id, content: 'Les meilleures baguettes du quartier, toujours chaudes !', author: 'Alice Dupont' },
        ];

        for (const prop of proposals) {
            await connection.execute(
                `INSERT IGNORE INTO review_proposals (id, order_id, content, author_name, status, rating) 
                 VALUES (?, ?, ?, ?, 'approved', 5)`,
                [prop.id, prop.orderId, prop.content, prop.author]
            );
        }

        await connection.commit();
        console.log('✅ Demo data seeded successfully!');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error seeding demo data:', error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

run();
