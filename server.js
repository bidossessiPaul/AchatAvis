const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;
let startupError = null;

const info = {
    cwd: process.cwd(),
    dirname: __dirname,
    node: process.version,
    port: PORT,
    env: {
        MYSQL_HOST: process.env.MYSQL_HOST ? 'SET' : 'NOT SET',
        MYSQL_DATABASE: process.env.MYSQL_DATABASE ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        PORT: process.env.PORT || 'NOT SET',
    }
};

const backendPath = path.join(__dirname, 'backend', 'dist', 'app.js');
info.backendPath = backendPath;
info.backendExists = fs.existsSync(backendPath);

try {
    require(backendPath);
    console.log('Server started OK');
} catch (err) {
    startupError = err.stack || err.message || String(err);
    console.error('STARTUP ERROR:', startupError);

    // Launch a fallback server that shows the error
    const server = http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <html>
            <head><title>Startup Error</title></head>
            <body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#eee">
                <h1 style="color:#e94560">Backend Startup Error</h1>
                <h3>Error:</h3>
                <pre style="background:#16213e;padding:20px;overflow:auto;color:#ff6b6b">${startupError}</pre>
                <h3>Server Info:</h3>
                <pre style="background:#16213e;padding:20px;overflow:auto;color:#a8d8ea">${JSON.stringify(info, null, 2)}</pre>
            </body>
            </html>
        `);
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log('Fallback error server running on port ' + PORT);
    });
}
