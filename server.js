const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 3000;

// List directory contents recursively (1 level deep)
function listDir(dir) {
    if (!fs.existsSync(dir)) return dir + ' NOT FOUND';
    try {
        const items = fs.readdirSync(dir);
        return items.map(item => {
            const full = path.join(dir, item);
            const isDir = fs.statSync(full).isDirectory();
            return isDir ? item + '/' : item;
        }).join('\n');
    } catch (e) { return 'Error: ' + e.message; }
}

// Check all possible paths
const candidates = [
    path.join(__dirname, 'dist', 'backend-dist', 'app.js'),
    path.join(__dirname, 'dist', 'backend-dist', 'src', 'app.js'),
    path.join(__dirname, 'backend-dist', 'app.js'),
    path.join(__dirname, 'backend', 'dist', 'app.js'),
    path.join(__dirname, 'backend', 'dist', 'src', 'app.js'),
];

let backendPath = null;
for (const p of candidates) {
    if (fs.existsSync(p)) {
        backendPath = p;
        break;
    }
}

if (!backendPath) {
    const debug = [
        'Tried:', ...candidates.map(c => '  ' + c + ' → ' + (fs.existsSync(c) ? 'EXISTS' : 'NOT FOUND')),
        '', 'dist/backend-dist/ contents:', listDir(path.join(__dirname, 'dist', 'backend-dist')),
        '', 'backend/dist/ contents:', listDir(path.join(__dirname, 'backend', 'dist')),
    ].join('\n');

    console.error(debug);
    const server = http.createServer((req, res) => {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#eee">
            <h1 style="color:#e94560">Backend Not Found</h1>
            <pre style="background:#16213e;padding:20px;color:#ff6b6b">${debug}</pre>
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
