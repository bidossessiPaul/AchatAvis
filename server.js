const fs = require('fs');
const path = require('path');

// Log startup info for debugging
const logFile = path.join(__dirname, 'startup.log');
const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, line);
    console.log(msg);
};

log('=== SERVER STARTING ===');
log('CWD: ' + process.cwd());
log('__dirname: ' + __dirname);
log('Node version: ' + process.version);
log('PORT env: ' + (process.env.PORT || 'NOT SET'));
log('MYSQL_HOST env: ' + (process.env.MYSQL_HOST ? 'SET' : 'NOT SET'));
log('JWT_SECRET env: ' + (process.env.JWT_SECRET ? 'SET' : 'NOT SET'));

const backendPath = path.join(__dirname, 'backend', 'dist', 'app.js');
log('Backend path: ' + backendPath);
log('Backend exists: ' + fs.existsSync(backendPath));

try {
    require(backendPath);
    log('=== SERVER LOADED OK ===');
} catch (err) {
    log('=== STARTUP ERROR ===');
    log(err.stack || err.message || String(err));
    process.exit(1);
}
