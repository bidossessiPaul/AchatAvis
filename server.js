const fs = require('fs');
const path = require('path');
const http = require('http');
const Module = require('module');

const PORT = process.env.PORT || 3000;

// Ensure node_modules from root and backend are available for module resolution
const extraPaths = [
    path.join(__dirname, 'node_modules'),
    path.join(__dirname, 'backend', 'node_modules'),
];
for (const p of extraPaths) {
    if (fs.existsSync(p) && !Module.globalPaths.includes(p)) {
        Module.globalPaths.unshift(p);
    }
}

// Find the backend entry point
const candidates = [
    path.join(__dirname, 'backend', 'dist', 'src', 'app.js'),
    path.join(__dirname, 'backend', 'dist', 'app.js'),
    path.join(__dirname, 'dist', 'backend-dist', 'src', 'app.js'),
    path.join(__dirname, 'dist', 'backend-dist', 'app.js'),
];

let backendPath = null;
for (const p of candidates) {
    if (fs.existsSync(p)) {
        backendPath = p;
        break;
    }
}

if (!backendPath) {
    const server = http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<pre>Backend not found.\nTried:\n${candidates.join('\n')}</pre>`);
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
