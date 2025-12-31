# Guide de Déploiement AchatAvis

Ce projet est structuré en monorepo avec un dossier `backend` (Express) et un dossier `frontend` (Vite).

## Déploiement sur Vercel

### 1. Backend (API)
- Créer un projet Vercel.
- **Root Directory** : `backend`
- **Framework Preset** : `Other`
- **Variables d'environnement** :
  - `MYSQL_HOST` : (IP de votre base de données)
  - `MYSQL_USER` : (Utilisateur DB)
  - `MYSQL_PASSWORD` : (Mot de passe DB)
  - `MYSQL_DATABASE` : (Nom de la DB)
  - `JWT_SECRET` : (Phrase aléatoire pour les tokens)
  - `JWT_REFRESH_SECRET` : (Phrase aléatoire pour le refresh)
  - `NODE_ENV` : `production`

### 2. Frontend (Interface)
- Créer un second projet Vercel.
- **Root Directory** : `frontend`
- **Framework Preset** : `Vite`
- **Variables d'environnement** :
  - `VITE_API_BASE_URL` : (URL de votre projet Backend déployé)

## Base de Données
Le projet utilise MySQL. Assurez-vous d'autoriser les connexions distantes (Remote MySQL) sur votre hébergement Hostinger.
