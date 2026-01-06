
import { query, pool } from '../config/database';

async function run() {
    console.log('🚀 Seeding suspension levels...');
    try {
        const levels = [
            { level: 1, name: 'Avertissement', duration: 1, emoji: '⚠️', color: 'yellow', consequences: '["Avertissement formel", "Pas de blocage"]', requirements: '["Accuser réception"]', auto_lift: true },
            { level: 2, name: 'Suspension temporaire (3j)', duration: 3, emoji: '⛔', color: 'orange', consequences: '["Accès bloqué 3 jours"]', requirements: '["Attendre fin suspension"]', auto_lift: true },
            { level: 3, name: 'Suspension temporaire (7j)', duration: 7, emoji: '🛑', color: 'red', consequences: '["Accès bloqué 7 jours"]', requirements: '["Contact support"]', auto_lift: false },
            { level: 4, name: 'Suspension longue (30j)', duration: 30, emoji: '🚫', color: 'darkred', consequences: '["Accès bloqué 30 jours"]', requirements: '["Entretien requis"]', auto_lift: false },
            { level: 5, name: 'Bannissement', duration: 3650, emoji: '☠️', color: 'black', consequences: '["Compte banni définitivement"]', requirements: '["Aucun recours"]', auto_lift: false },
        ];

        for (const l of levels) {
            const exists: any = await query('SELECT id FROM suspension_levels WHERE level_number = ?', [l.level]);
            if (!exists || exists.length === 0) {
                await query(`INSERT INTO suspension_levels 
                 (level_number, level_name, duration_days, icon_emoji, badge_color, consequences, requirements_to_lift, auto_lift_after_duration)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [l.level, l.name, l.duration, l.emoji, l.color, l.consequences, l.requirements, l.auto_lift]);
                console.log(`✅ Created Level ${l.level}: ${l.name}`);
            } else {
                console.log(`ℹ️ Level ${l.level} already exists.`);
            }
        }

    } catch (error) {
        console.error("❌ Error seeding levels:", error);
    }

    process.exit(0);
}

run();
