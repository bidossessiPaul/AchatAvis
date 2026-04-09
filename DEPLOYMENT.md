# Guide de Déploiement AchatAvis (Hostinger)

Ce projet est un monorepo avec:
- `frontend` (Vite, app SPA)
- `backend` (Node.js/Express API)

## Architecture recommandée

- Frontend: `https://manager-achatavis.com`
- API: `https://api.manager-achatavis.com` (ou reverse proxy `/api` sur le même domaine)

## Option A (recommandée): même domaine avec proxy `/api`

### 1. Backend
- Déployer le backend Node (PM2 recommandé) sur le serveur Hostinger.
- Exemple port interne: `5001`.
- Variables d'environnement backend à définir:
  - `NODE_ENV=production`
  - `PORT=5001`
  - `FRONTEND_URL=https://manager-achatavis.com`
  - `ALLOWED_ORIGINS=https://manager-achatavis.com`
  - variables MySQL/JWT/EMAIL/Stripe selon votre environnement

### 2. Reverse proxy (Apache/LiteSpeed)
Configurer le vhost pour envoyer `/api/*` vers le backend Node:

```apache
RewriteEngine On

# API -> backend node (port interne)
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://127.0.0.1:5001/api/$1 [P,L]

# SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

Note: selon le plan Hostinger, le proxy HTTP peut se configurer via panel/vhost plutôt que `.htaccess`.

### 3. Frontend build
Dans `frontend/.env.production`:

```env
VITE_API_BASE_URL=/api
```

Puis:

```bash
cd frontend
npm install
npm run build
```

Déployer le contenu de `frontend/dist` sur `manager-achatavis.com`.

## Option B: API sur sous-domaine séparé

- API sur `https://api.manager-achatavis.com`
- Frontend sur `https://manager-achatavis.com`

Frontend (`frontend/.env.production`):

```env
VITE_API_BASE_URL=https://api.manager-achatavis.com/api
```

Backend:
- `FRONTEND_URL=https://manager-achatavis.com`
- `ALLOWED_ORIGINS=https://manager-achatavis.com`

## Vérification rapide après déploiement

1. Ouvrir `https://manager-achatavis.com/login`
2. Vérifier dans DevTools que les appels partent vers `/api/...` (ou vers `api.manager-achatavis.com`).
3. Tester:
   - `GET /api/auth/me`
   - `GET /api/team`
   - `GET /api/notifications/stream?...`
4. Depuis l'écran équipe admin, envoyer une invitation.

## Erreurs CORS fréquentes

- Si l'erreur montre `No 'Access-Control-Allow-Origin' header`:
  - la requête n'atteint souvent pas le backend Express (mauvaise URL/proxy)
  - vérifier DNS + reverse proxy + `VITE_API_BASE_URL`

- Si l'erreur montre un domaine `*.hostingersite.com` inattendu:
  - ce domaine pointe souvent vers un hébergement statique/CDN et non vers l'API Node
  - corriger `VITE_API_BASE_URL` et la config proxy.
