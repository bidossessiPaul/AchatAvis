# AchatAvis Platform

Plateforme SaaS de gestion d'avis Google pour artisans français.

## 🚀 Stack Technique

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 14+
- **Auth**: JWT + bcrypt (12 rounds)
- **Security**: Helmet.js, CORS, rate limiting
- **State Management**: Zustand
- **Validation**: Zod

## 📦 Installation

### Prérequis

- Node.js 18+ ([télécharger](https://nodejs.org/))
- PostgreSQL 14+ ([télécharger](https://www.postgresql.org/download/))
- npm ou yarn

### 1. Cloner le projet

```bash
git clone <votre-repo>
cd "dashbaord achatAvis"
```

### 2. Configurer PostgreSQL

Créer la base de données :

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE achatavis;

# Quitter psql
\q
```

### 3. Backend

```bash
cd backend

# Les dépendances sont déjà installées
# Sinon: npm install

# Copier le fichier d'environnement
cp .env.example .env

# Modifier .env avec vos informations :
# - DB_USER=postgres
# - DB_PASSWORD=votre_mot_de_passe
# - JWT_SECRET=générer-une-clé-secrète-aléatoire

# Lancer les migrations
npm run migrate

# Démarrer le serveur de développement
npm run dev
```

Le backend sera accessible sur **http://localhost:5000**

### 4. Frontend

```bash
cd frontend

# Les dépendances sont déjà installées
# Sinon: npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend sera accessible sur **http://localhost:5173**

## 🎨 Charte Graphique

- **Couleur primaire (Noir)**: `#0a0a0a`
- **Couleur accent (Or)**: `#d4af7a`
- **Style**: Moderne, professionnel, épuré
- **Inspiration**: Agentova.ai

## 👥 Types d'Utilisateurs

### 1. Artisans (Clients)
- Création de compte avec validation admin
- Commander des avis (5-100/mois)
- Dashboard de suivi des avis reçus
- Gestion facturation

### 2. Local Guides (Fournisseurs)
- Inscription avec compte Google Local Guide
- Visualisation des entreprises disponibles
- Soumission d'avis pour validation
- 1€ par avis validé

### 3. Admins (AchatAvis)
- Validation des comptes artisans
- Vérification des avis soumis (24-48h)
- Gestion des paiements
- Modération générale

## 🔒 Sécurité

- ✅ Passwords hashés avec bcrypt (12 rounds)
- ✅ JWT avec expiration (15min access, 7 jours refresh)
- ✅ Rate limiting sur toutes les routes
- ✅ Validation Zod sur tous les inputs
- ✅ HTTPS obligatoire en production
- ✅ Helmet.js pour headers sécurisés
- ✅ CORS strictement configuré
- ✅ Protection contre SQL injection
- ✅ Lock automatique après 5 tentatives de login

## 📋 API Endpoints

### Authentification (Public)

- `POST /api/auth/register/artisan` - Inscription artisan
- `POST /api/auth/register/guide` - Inscription guide
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion

### Authentification (Protégé)

- `GET /api/auth/me` - Récupérer l'utilisateur actuel
- `PUT /api/auth/change-password` - Changer le mot de passe
- `DELETE /api/auth/delete-account` - Supprimer le compte

## 🧪 Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (à venir)
cd frontend
npm test
```

## 🚢 Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

## 📝 Variables d'Environnement

Voir `.env.example` à la racine du projet.

### Backend (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=achatavis
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe

# JWT
JWT_SECRET=votre-secret-jwt-super-securise
JWT_REFRESH_SECRET=votre-secret-refresh-super-securise

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Email (à configurer plus tard)
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your-api-key

# Stripe (à configurer plus tard)
STRIPE_SECRET_KEY=sk_test_...
```

## 📚 Structure du Projet

```
achatavis/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuration (DB, JWT)
│   │   ├── middleware/    # Auth, validation, rate limiting
│   │   ├── routes/        # Routes API
│   │   ├── controllers/   # Logique métier
│   │   ├── services/      # Services (auth, etc.)
│   │   ├── utils/         # Utilitaires
│   │   └── models/        # Types TypeScript
│   ├── migrations/        # Migrations SQL
│   └── tests/            # Tests
│
├── frontend/
│   └── src/
│       ├── components/   # Composants UI
│       ├── pages/        # Pages
│       ├── services/     # API calls
│       ├── context/      # State management
│       └── styles/       # CSS
│
└── README.md
```

## 🎯 Prochaines Étapes

- [ ] Implémenter les dashboards (Artisan, Guide, Admin)
- [ ] Système de commande d'avis
- [ ] Validation des avis par admin
- [ ] Intégration Stripe pour paiements
- [ ] Emails transactionnels
- [ ] Tests E2E
- [ ] Déploiement

## 📞 Support

Pour toute question, contactez l'équipe de développement.

## 📄 Licence

MIT
