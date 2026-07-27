import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { PoolConnection } from 'mysql2/promise';

// Pool dédié aux migrations. On ne réutilise pas celui de src/config/database
// car il active namedPlaceholders, qui interprète le `:=` des migrations
// (SET @sql := ...) comme un paramètre nommé et fait échouer le statement.
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT) || 3306,
    connectionLimit: 1,
    multipleStatements: false,
    namedPlaceholders: false,
    ...((process.env.MYSQL_SSL ?? 'true').toLowerCase() !== 'false'
        ? { ssl: { rejectUnauthorized: false } }
        : {})
});

/**
 * Découpe un fichier SQL en statements exécutables.
 *
 * Un simple `split(';')` ne suffit pas : il casse les corps de procédures et de
 * triggers (qui contiennent des `;` internes) et les `;` présents dans des
 * chaînes ou des commentaires. On respecte donc les quotes, les commentaires,
 * et la directive DELIMITER utilisée par les migrations 040 et 074.
 */
function splitStatements(sql: string): string[] {
    const statements: string[] = [];
    let delimiter = ';';
    let buffer = '';
    let i = 0;

    while (i < sql.length) {
        const rest = sql.slice(i);

        // Directive DELIMITER : hors statement. Le buffer peut déjà contenir les
        // commentaires d'en-tête du fichier, qui ne comptent pas comme du contenu.
        if (stripComments(buffer).trim() === '') {
            const delimiterMatch = /^\s*DELIMITER[ \t]+(\S+)[ \t]*(?:\r?\n|$)/i.exec(rest);
            if (delimiterMatch) {
                delimiter = delimiterMatch[1];
                i += delimiterMatch[0].length;
                buffer = '';
                continue;
            }
        }

        const char = sql[i];

        // Commentaires : on les conserve dans le buffer pour ne pas fausser les
        // numéros de ligne, mais on saute leur contenu pour l'analyse
        if (char === '-' && sql[i + 1] === '-' && (sql[i + 2] === ' ' || sql[i + 2] === '\t' || sql[i + 2] === '\n' || sql[i + 2] === '\r')) {
            const end = sql.indexOf('\n', i);
            const stop = end === -1 ? sql.length : end + 1;
            buffer += sql.slice(i, stop);
            i = stop;
            continue;
        }
        if (char === '#') {
            const end = sql.indexOf('\n', i);
            const stop = end === -1 ? sql.length : end + 1;
            buffer += sql.slice(i, stop);
            i = stop;
            continue;
        }
        if (char === '/' && sql[i + 1] === '*') {
            const end = sql.indexOf('*/', i + 2);
            const stop = end === -1 ? sql.length : end + 2;
            buffer += sql.slice(i, stop);
            i = stop;
            continue;
        }

        // Chaînes et identifiants quotés : on copie tel quel jusqu'au quote fermant
        if (char === "'" || char === '"' || char === '`') {
            const quote = char;
            let j = i + 1;
            while (j < sql.length) {
                if (sql[j] === '\\' && quote !== '`') {
                    j += 2;
                    continue;
                }
                if (sql[j] === quote) {
                    // Quote doublé = quote échappé
                    if (sql[j + 1] === quote) {
                        j += 2;
                        continue;
                    }
                    break;
                }
                j += 1;
            }
            buffer += sql.slice(i, Math.min(j + 1, sql.length));
            i = j + 1;
            continue;
        }

        // Fin de statement
        if (sql.startsWith(delimiter, i)) {
            statements.push(buffer.trim());
            buffer = '';
            i += delimiter.length;
            continue;
        }

        buffer += char;
        i += 1;
    }

    if (buffer.trim()) statements.push(buffer.trim());

    // Un statement réduit à des commentaires n'a rien à exécuter
    return statements.filter(s => stripComments(s).trim().length > 0);
}

function stripComments(sql: string): string {
    return sql
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^[ \t]*--[ \t].*$/gm, ' ')
        .replace(/^[ \t]*#.*$/gm, ' ');
}

/**
 * Découpe les clauses d'un ALTER TABLE sur les virgules de premier niveau.
 * Ignore les virgules internes (DECIMAL(10,2), ENUM('a','b'), chaînes...).
 */
function splitTopLevel(clauses: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    let i = 0;

    while (i < clauses.length) {
        const char = clauses[i];

        if (char === "'" || char === '"' || char === '`') {
            const quote = char;
            let j = i + 1;
            while (j < clauses.length) {
                if (clauses[j] === '\\' && quote !== '`') { j += 2; continue; }
                if (clauses[j] === quote) {
                    if (clauses[j + 1] === quote) { j += 2; continue; }
                    break;
                }
                j += 1;
            }
            current += clauses.slice(i, Math.min(j + 1, clauses.length));
            i = j + 1;
            continue;
        }

        if (char === '(') depth += 1;
        if (char === ')') depth -= 1;

        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            i += 1;
            continue;
        }

        current += char;
        i += 1;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

const columnExists = async (conn: PoolConnection, table: string, column: string): Promise<boolean> => {
    const [rows]: any = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
        [table, column]
    );
    return rows.length > 0;
};

const indexExists = async (conn: PoolConnection, table: string, index: string): Promise<boolean> => {
    const [rows]: any = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [table, index]
    );
    return rows.length > 0;
};

const constraintExists = async (conn: PoolConnection, table: string, constraint: string): Promise<boolean> => {
    const [rows]: any = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? LIMIT 1`,
        [table, constraint]
    );
    return rows.length > 0;
};

const tableExists = async (conn: PoolConnection, table: string): Promise<boolean> => {
    const [rows]: any = await conn.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
        [table]
    );
    return rows.length > 0;
};

const unquote = (identifier: string): string => identifier.replace(/^`|`$/g, '').trim();

/**
 * Traduit la syntaxe idempotente MariaDB (`ADD COLUMN IF NOT EXISTS`,
 * `CREATE INDEX IF NOT EXISTS`, `DROP ... IF EXISTS`) que MySQL 8 refuse.
 * Retourne le statement réécrit, ou null s'il n'y a plus rien à faire.
 */
async function applyIdempotentCompat(conn: PoolConnection, statement: string): Promise<string | null> {
    const naked = stripComments(statement).trim();

    // CREATE [UNIQUE] INDEX IF NOT EXISTS idx ON table(...)
    const createIndex = /^CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(`?[\w$]+`?)\s+ON\s+(`?[\w$]+`?)/i.exec(naked);
    if (createIndex) {
        if (await indexExists(conn, unquote(createIndex[3]), unquote(createIndex[2]))) return null;
        return naked.replace(/\s+IF\s+NOT\s+EXISTS\s+/i, ' ');
    }

    // DROP INDEX IF EXISTS idx ON table
    const dropIndex = /^DROP\s+INDEX\s+IF\s+EXISTS\s+(`?[\w$]+`?)\s+ON\s+(`?[\w$]+`?)/i.exec(naked);
    if (dropIndex) {
        if (!(await indexExists(conn, unquote(dropIndex[2]), unquote(dropIndex[1])))) return null;
        return naked.replace(/\s+IF\s+EXISTS\s+/i, ' ');
    }

    // ALTER TABLE <table> <clauses>
    const alter = /^ALTER\s+TABLE\s+(`?[\w$]+`?)\s+([\s\S]+)$/i.exec(naked);
    if (!alter) return statement;

    const table = unquote(alter[1]);
    const clauses = splitTopLevel(alter[2]);
    if (!clauses.some(c => /\bIF\s+(NOT\s+)?EXISTS\b/i.test(c))) return statement;

    // Une table absente rend tout l'ALTER inapplicable : on laisse MySQL le signaler
    if (!(await tableExists(conn, table))) return statement;

    const kept: string[] = [];
    for (const clause of clauses) {
        // ADD [COLUMN] IF NOT EXISTS <col> <definition>
        const addColumn = /^ADD\s+(COLUMN\s+)?IF\s+NOT\s+EXISTS\s+(`?[\w$]+`?)([\s\S]*)$/i.exec(clause);
        if (addColumn) {
            if (await columnExists(conn, table, unquote(addColumn[2]))) continue;
            kept.push(`ADD COLUMN ${addColumn[2]}${addColumn[3]}`);
            continue;
        }

        // DROP COLUMN IF EXISTS <col>
        const dropColumn = /^DROP\s+COLUMN\s+IF\s+EXISTS\s+(`?[\w$]+`?)$/i.exec(clause);
        if (dropColumn) {
            if (!(await columnExists(conn, table, unquote(dropColumn[1])))) continue;
            kept.push(`DROP COLUMN ${dropColumn[1]}`);
            continue;
        }

        // DROP {CONSTRAINT|CHECK|FOREIGN KEY} IF EXISTS <name>
        const dropConstraint = /^DROP\s+(CONSTRAINT|CHECK|FOREIGN\s+KEY)\s+IF\s+EXISTS\s+(`?[\w$]+`?)$/i.exec(clause);
        if (dropConstraint) {
            if (!(await constraintExists(conn, table, unquote(dropConstraint[2])))) continue;
            kept.push(`DROP ${dropConstraint[1]} ${dropConstraint[2]}`);
            continue;
        }

        // DROP INDEX|KEY IF EXISTS <name>
        const dropKey = /^DROP\s+(INDEX|KEY)\s+IF\s+EXISTS\s+(`?[\w$]+`?)$/i.exec(clause);
        if (dropKey) {
            if (!(await indexExists(conn, table, unquote(dropKey[2])))) continue;
            kept.push(`DROP ${dropKey[1]} ${dropKey[2]}`);
            continue;
        }

        // ADD {CONSTRAINT|INDEX|KEY} IF NOT EXISTS <name> ...
        const addNamed = /^ADD\s+(CONSTRAINT|INDEX|KEY)\s+IF\s+NOT\s+EXISTS\s+(`?[\w$]+`?)([\s\S]*)$/i.exec(clause);
        if (addNamed) {
            const exists = /CONSTRAINT/i.test(addNamed[1])
                ? await constraintExists(conn, table, unquote(addNamed[2]))
                : await indexExists(conn, table, unquote(addNamed[2]));
            if (exists) continue;
            kept.push(`ADD ${addNamed[1]} ${addNamed[2]}${addNamed[3]}`);
            continue;
        }

        kept.push(clause);
    }

    if (kept.length === 0) return null;
    return `ALTER TABLE ${alter[1]} ${kept.join(', ')}`;
}

/**
 * Erreurs signifiant "l'objet est déjà dans l'état voulu". Les migrations sont
 * rejouées en entier à chaque run, donc ces cas sont attendus et non bloquants.
 * On matche sur les codes MySQL, pas sur le texte du message.
 */
const IDEMPOTENT_ERROR_CODES = new Set([
    'ER_TABLE_EXISTS_ERROR',    // 1050 table déjà créée
    'ER_DUP_FIELDNAME',         // 1060 colonne déjà ajoutée
    'ER_DUP_KEYNAME',           // 1061 index déjà créé
    'ER_DUP_ENTRY',             // 1062 seed déjà inséré
    'ER_CANT_DROP_FIELD_OR_KEY',// 1091 drop d'un objet absent
    'ER_CONSTRAINT_NOT_FOUND',  // contrainte déjà supprimée
    'ER_FK_DUP_NAME',           // 1826 FK déjà définie
    'ER_CHECK_CONSTRAINT_DUP_NAME',
    'ER_TRG_ALREADY_EXISTS',
    'ER_SP_ALREADY_EXISTS',
]);

async function runMigrations() {
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files.`);

    const connection = await pool.getConnection();

    type Pending = { file: string; statement: string; message: string };

    // Exécute une liste de statements, renvoie ceux qui ont échoué
    const execute = async (items: { file: string; statement: string }[]): Promise<{ failures: Pending[]; skipped: number }> => {
        const failures: Pending[] = [];
        let skipped = 0;

        for (const item of items) {
            let statement: string | null;
            try {
                statement = await applyIdempotentCompat(connection, item.statement);
            } catch (err: any) {
                failures.push({ ...item, message: `compat: ${err.message}` });
                continue;
            }
            // null = l'objet existe déjà, rien à exécuter
            if (statement === null) { skipped += 1; continue; }

            try {
                await connection.query(statement);
            } catch (err: any) {
                if (IDEMPOTENT_ERROR_CODES.has(err.code)) { skipped += 1; continue; }
                failures.push({ file: item.file, statement, message: `${err.code}: ${err.message}` });
            }
        }

        return { failures, skipped };
    };

    const allStatements: { file: string; statement: string }[] = [];
    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        console.log(`Running migration: ${file}`);
        for (const statement of splitStatements(sql)) {
            allStatements.push({ file, statement });
        }
    }

    let { failures, skipped } = await execute(allStatements);
    console.log(`Passe 1 : ${skipped} statement(s) déjà appliqué(s), ${failures.length} en échec.`);

    // Les migrations ne sont pas ordonnées de façon cohérente sur une base vierge :
    // certaines (025, 026...) altèrent des tables créées plus tard (045). On rejoue
    // donc les seuls statements en échec — pas les fichiers entiers, sinon les
    // DROP TABLE de 088 s'exécuteraient une seconde fois.
    const MAX_PASSES = 5;
    for (let pass = 2; pass <= MAX_PASSES && failures.length > 0; pass += 1) {
        const retryable = failures.map(f => ({ file: f.file, statement: f.statement }));
        const previousFailureCount = failures.length;

        const result = await execute(retryable);
        failures = result.failures;
        console.log(`Passe ${pass} : ${result.skipped} statement(s) déjà appliqué(s), ${failures.length} en échec.`);

        // Plus aucune progression : les échecs restants ne sont pas dus à l'ordre
        if (failures.length >= previousFailureCount) break;
    }

    console.log(`\nMigrations terminées. ${failures.length} statement(s) en échec.`);

    if (failures.length > 0) {
        console.error('\n=== Statements en échec ===');
        for (const failure of failures) {
            console.error(`\n[${failure.file}] ${failure.message}`);
            console.error(failure.statement.slice(0, 400));
        }
    }

    connection.release();
    await pool.end();

    process.exit(failures.length > 0 ? 1 : 0);
}

runMigrations().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
