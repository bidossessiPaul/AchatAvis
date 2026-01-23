
const { query } = require('./src/config/database');

async function checkDB() {
    try {
        console.log('--- Checking tables ---');
        const tables = await query('SHOW TABLES');
        console.log('Tables:', tables.map(t => Object.values(t)[0]));

        console.log('\n--- Checking suspension_levels ---');
        const levels = await query('SELECT * FROM suspension_levels');
        console.log('Suspension levels count:', levels.length);
        console.log('Levels:', levels);

        console.log('\n--- Checking users columns ---');
        const columns = await query('SHOW COLUMNS FROM users');
        console.log('Users columns:', columns.map(c => c.Field));

        process.exit(0);
    } catch (error) {
        console.error('DB Check failed:', error);
        process.exit(1);
    }
}

checkDB();
