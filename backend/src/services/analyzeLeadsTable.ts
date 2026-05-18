import { query as dbQuery } from '../config/database';

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
    const rows = await dbQuery(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
        { table, column }
    );
    if (!rows[0].cnt) {
        await dbQuery(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    }
}

export async function ensureAnalyzeLeadsTable(): Promise<void> {
    await dbQuery(`
        CREATE TABLE IF NOT EXISTS analyze_leads (
            id              VARCHAR(36)   PRIMARY KEY,
            business_name   VARCHAR(255)  NOT NULL,
            address         TEXT,
            original_url    VARCHAR(1000),
            rating          DECIMAL(2,1)  DEFAULT 0,
            review_count    INT           DEFAULT 0,
            category_label  VARCHAR(100),
            verdict         VARCHAR(50),
            scores_validation INT,
            scores_seo        INT,
            scores_difficulty INT,
            has_website     TINYINT(1)    DEFAULT 0,
            has_spike       TINYINT(1)    DEFAULT 0,
            ip_address      VARCHAR(45),
            report_data     JSON,
            created_at      DATETIME      DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_business_name (business_name(100))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await addColumnIfMissing('analyze_leads', 'original_url',  'VARCHAR(1000) AFTER address');
    await addColumnIfMissing('analyze_leads', 'contact_name',  'VARCHAR(255) AFTER ip_address');
    await addColumnIfMissing('analyze_leads', 'contact_email', 'VARCHAR(255) AFTER contact_name');
    await addColumnIfMissing('analyze_leads', 'contact_phone', 'VARCHAR(50) AFTER contact_email');
    await addColumnIfMissing('analyze_leads', 'contact_at',    'DATETIME AFTER contact_phone');
}

// Promise partagée — chaque module qui l'importe attend la même migration
export const analyzeLeadsReady: Promise<void> = ensureAnalyzeLeadsTable().catch((err) => {
    console.error('[analyze_leads] Erreur migration table:', err?.message);
});
