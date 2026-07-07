import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sert la landing SEO statique à la racine "/" en dev (parité avec la prod Vercel).
// En prod, c'est le rewrite de vercel.json qui fait "/" -> avoir-plus-avis-google.html.
function serveLandingAtRoot() {
    return {
        name: 'serve-landing-at-root',
        configureServer(server: any) {
            server.middlewares.use((req: any, _res: any, next: any) => {
                const path = (req.url || '').split('?')[0];
                if (path === '/') {
                    req.url = '/avoir-plus-avis-google.html';
                } else if (path === '/en') {
                    req.url = '/en.html';
                }
                next();
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), serveLandingAtRoot()],
    server: {
        port: 5174,
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5001',
                changeOrigin: true,
            },
        },
    },
});
