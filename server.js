const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;

const candidates = [
    path.join(__dirname, 'dist', 'backend-dist', 'app.js'),
    path.join(__dirname, 'backend-dist', 'app.js'),
    path.join(__dirname, 'backend', 'dist', 'app.js'),
    path.join(__dirname, 'dist', 'app.js'),
];

let backendPath = null;
for (const p of candidates) {
    if (fs.existsSync(p)) {
        backendPath = p;
        break;
    }
}

if (!backendPath) {
    const distFiles = fs.existsSync(path.join(__dirname, 'dist'))
        ? fs.readdirSync(path.join(__dirname, 'dist')).join('\n')
        : 'dist/ NOT FOUND';
    const backendFiles = fs.existsSync(path.join(__dirname, 'backend'))
        ? fs.readdirSync(path.join(__dirname, 'backend')).join('\n')
        : 'backend/ NOT FOUND';

    const debugInfo = `Tried:\n${candidates.join('\n')}\n\nCWD: ${process.cwd()}\n__dirname: ${__dirname}\n\nFiles in dist/:\n${distFiles}\n\nFiles in backend/:\n${backendFiles}`;
    console.error(debugInfo);

    const server = http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#eee">
            <h1 style="color:#e94560">Backend Not Found</h1>
            <pre style="background:#16213e;padding:20px;color:#ff6b6b">${debugInfo}</pre>
            </body></html>`);
    });
    server.listen(PORT, '0.0.0.0');
} else {
    try {
        console.log('Loading backend from:', backendPath);
        require(backendPath);
    } catch (err) {
        console.error('STARTUP ERROR:', err.stack);
        const server = http.createServer((req, res) => {
            res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#eee">
                <h1 style="color:#e94560">Startup Error</h1>
                <pre style="background:#16213e;padding:20px;color:#ff6b6b">${err.stack}</pre>
                </body></html>`);
        });
        server.listen(PORT, '0.0.0.0');
    }
}
