# Design — Service de signalement d'avis Google

> Date : 2026-04-28
> Projet : AchatAvis Dashboard
> Auteur : Maxime + Claude
> Statut : Spec en cours de validation

---

## 1. Contexte et objectif

Certains clients artisans subissent des avis Google négatifs déposés par des concurrents (faux avis, hors sujet, propos diffamatoires). AchatAvis met en place un **nouveau service séparé** : l'admin attribue à l'artisan un pack signalement, l'artisan soumet l'URL des avis Google à signaler avec une raison, et les guides éligibles vont signaler ces avis sur Google et fournir une preuve (capture + lien). Une preuve validée par l'admin déclenche le paiement du guide.

Ce service est **strictement séparé** du système d'avis classique : tables, packs, navigation, paiements — rien en commun.

---

## 2. Acteurs et règles métier

### Acteurs

- **Admin (owner + équipe)** : crée les packs, attribue, valide les preuves, gère les avis (édition payout, marquage cible supprimée), configure le cooldown global
- **Artisan** : reçoit un pack attribué, soumet des avis Google à signaler, suit l'avancement, peut relancer un avis non concluant
- **Guide** : voit la file d'avis dispo (s'il est éligible), prend un slot, signale sur Google, upload sa preuve

### Règles métier verrouillées

| # | Règle |
|---|---|
| 1 | Système signalement **100% séparé** du système d'avis classique |
| 2 | Pas d'achat self-service : **admin attribue** depuis `ArtisanDetail.tsx` (nouvel onglet) |
| 3 | Pack signalement = `{ nom, nb_avis, nb_signalements_par_avis, prix }` (4 champs) |
| 4 | Cumul des packs : si un artisan a déjà un pack, le nouveau **s'additionne** au compteur global |
| 5 | Payout guide par défaut : **0,35€ par signalement validé**. Surchargeable par avis dans la page admin |
| 6 | Validation des preuves : **manuelle par admin** |
| 7 | Éligibilité guide : **KYC validé + ≥ 1 avis classique validé** |
| 8 | Réservation slot par guide avec **timer** (30 min par défaut, alignée sur les avis classiques) |
| 9 | Anti-fraude : un guide ne peut prendre **qu'1 seul slot par avis** |
| 10 | **Cooldown global** : ≥ N heures entre 2 signalements sur le même avis (config admin) |
| 11 | Cycle de vie avis : `actif` → `terminé succès` (Google a supprimé) **OU** `terminé non-concluant` (compteur atteint, avis encore en ligne) |
| 12 | Bouton **"Relancer"** sur un avis non-concluant : décrémente 1 slot du pack et remet l'avis en file avec compteur 0/M |
| 13 | **Pas de remboursement** de slots (seul l'admin peut annuler manuellement et restituer si exception) |
| 14 | **Pas de notif email/push** en v1 — tout dans le dashboard |
| 15 | 3 nouvelles permissions : `can_manage_signalement_packs`, `can_manage_signalements`, `can_validate_signalements` |
| 16 | Soft-delete partout (colonne `deleted_at DATETIME DEFAULT NULL` + index, toutes les SELECT filtrent) |
| 17 | Owner email `dossoumaxime888@gmail.com` bypass tout |

### Hors scope v1

- Notifications email/push
- Plage horaire crédible (cooldown nocturne)
- Quiz certification spécifique signalement
- Cooldown différencié par pack ou par avis
- Niveaux/scores avancés pour filtrage guide
- Statistiques/analytics avancées
- Factu/PDF
- Self-service paiement Stripe pour packs signalement

---

## 3. Architecture & arborescence

### Approche retenue : **B — isolation données + module dédié + réutilisation utilities**

Tables totalement séparées, code organisé en sous-dossier `signalement/`, helpers transverses (auth, KYC check, Cloudinary, transactions MySQL) **réutilisés**.

### Backend

```
backend/src/
├── routes/
│   ├── admin.ts                              (intact)
│   ├── artisan.ts                            (intact)
│   ├── guide.ts                              (intact)
│   └── signalement/                          ← NOUVEAU
│       ├── adminPacks.ts
│       ├── adminAttribution.ts
│       ├── adminAvis.ts
│       ├── adminValidations.ts
│       ├── adminConfig.ts
│       ├── artisan.ts
│       └── guide.ts
├── controllers/signalement/                  ← NOUVEAU
│   ├── packController.ts
│   ├── attributionController.ts
│   ├── avisController.ts
│   ├── validationController.ts
│   ├── configController.ts
│   ├── artisanController.ts
│   └── guideController.ts
├── services/signalement/                     ← NOUVEAU
│   ├── packService.ts
│   ├── attributionService.ts
│   ├── avisService.ts
│   ├── slotService.ts
│   ├── proofService.ts
│   ├── eligibilityService.ts
│   ├── cooldownService.ts
│   └── payoutService.ts
└── middleware/signalement/
    └── checkSignalementPermission.ts
```

### Frontend

```
frontend/src/
├── pages/
│   ├── admin/
│   │   ├── ArtisanDetail.tsx                 (modifié : nouvel onglet "Signalement")
│   │   └── signalement/                      ← NOUVEAU
│   │       ├── SignalementPacks.tsx + .css
│   │       ├── SignalementsList.tsx + .css
│   │       ├── SignalementValidations.tsx + .css
│   │       └── SignalementConfig.tsx + .css
│   ├── artisan/signalement/                  ← NOUVEAU
│   │   └── ArtisanSignalementDashboard.tsx + .css
│   └── guide/signalement/                    ← NOUVEAU
│       ├── GuideSignalementsList.tsx + .css
│       └── GuideSignalementDetail.tsx + .css
├── services/signalement/                     ← NOUVEAU
│   ├── adminPacksApi.ts
│   ├── adminAvisApi.ts
│   ├── adminValidationsApi.ts
│   ├── adminConfigApi.ts
│   ├── artisanApi.ts
│   └── guideApi.ts
└── types/signalement.ts                      ← NOUVEAU (types TS partagés)
```

### Sidebar admin

Nouveau **groupe "Signalement"** séparé visuellement du groupe "Avis", avec 4 entrées :
- Packs signalement (`can_manage_signalement_packs`)
- Avis à signaler (`can_manage_signalements`)
- Validations preuves (`can_validate_signalements`)
- Config (`can_manage_signalement_packs`)

Owner + super-admin bypass.

---

## 4. Schéma DB — 8 tables

Toutes les tables suivent les conventions existantes : `id VARCHAR(36)` (UUID v4), `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME ... ON UPDATE`, soft-delete via `deleted_at DATETIME DEFAULT NULL`, ENGINE=InnoDB, charset utf8mb4. Prix stockés en **cents (INT)** pour cohérence avec `subscription_packs`.

### 4.1 `signalement_packs` — Templates de packs créés par l'admin

```sql
CREATE TABLE IF NOT EXISTS signalement_packs (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nb_avis INT NOT NULL,
    nb_signalements_par_avis INT NOT NULL,
    price_cents INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_signalement_packs_deleted (deleted_at),
    CONSTRAINT chk_sp_nb_avis CHECK (nb_avis > 0),
    CONSTRAINT chk_sp_nb_sig CHECK (nb_signalements_par_avis > 0),
    CONSTRAINT chk_sp_price CHECK (price_cents >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.2 `signalement_attributions` — Pack attribué à un artisan (cumul possible)

```sql
CREATE TABLE IF NOT EXISTS signalement_attributions (
    id VARCHAR(36) PRIMARY KEY,
    artisan_id VARCHAR(36) NOT NULL,
    pack_id VARCHAR(36) NOT NULL,
    nb_avis_total INT NOT NULL,                 -- snapshot du pack au moment de l'attribution
    nb_signalements_par_avis INT NOT NULL,      -- snapshot du pack
    nb_avis_consumed INT DEFAULT 0,             -- compteur d'avis consommés (incl. relances)
    attributed_by VARCHAR(36) NOT NULL,         -- admin user_id
    attributed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,                                  -- note interne admin
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_sa_artisan (artisan_id, deleted_at),
    INDEX idx_sa_deleted (deleted_at),
    CONSTRAINT fk_sa_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_pack FOREIGN KEY (pack_id) REFERENCES signalement_packs(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sa_admin FOREIGN KEY (attributed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Compteur global "avis restants" pour un artisan** = `SUM(nb_avis_total - nb_avis_consumed)` sur toutes les attributions WHERE `deleted_at IS NULL` AND `artisan_id = ?`.

Note : on snapshot `nb_signalements_par_avis` au moment de l'attribution. Si l'admin modifie le pack template par la suite, les attributions existantes ne sont pas impactées.

### 4.3 `signalement_avis` — Avis Google soumis par un artisan à signaler

```sql
CREATE TABLE IF NOT EXISTS signalement_avis (
    id VARCHAR(36) PRIMARY KEY,
    artisan_id VARCHAR(36) NOT NULL,
    attribution_id VARCHAR(36) NOT NULL,         -- attribution qui a fourni le slot
    google_review_url TEXT NOT NULL,
    raison VARCHAR(50) NOT NULL,                 -- code de raison (voir 4.9)
    raison_details TEXT,                         -- précision optionnelle de l'artisan
    nb_signalements_target INT NOT NULL,         -- snapshot du pack (= compteur cible)
    nb_signalements_validated INT DEFAULT 0,     -- compteur courant (preuves validées)
    payout_per_signalement_cents INT NOT NULL DEFAULT 35,  -- 0,35€, surchargeable par admin
    status VARCHAR(20) DEFAULT 'active',
    closed_at DATETIME,                          -- date de passage à "terminé_*"
    closed_by_admin_id VARCHAR(36),              -- admin qui a marqué "cible supprimée" si applicable
    relaunched_from_avis_id VARCHAR(36),         -- si c'est une relance, l'id de l'avis source
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_sav_artisan (artisan_id, status, deleted_at),
    INDEX idx_sav_status (status, deleted_at),
    INDEX idx_sav_attribution (attribution_id),
    CONSTRAINT fk_sav_artisan FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sav_attribution FOREIGN KEY (attribution_id) REFERENCES signalement_attributions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_sav_closed_by FOREIGN KEY (closed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sav_relaunched FOREIGN KEY (relaunched_from_avis_id) REFERENCES signalement_avis(id) ON DELETE SET NULL,
    CONSTRAINT chk_sav_status CHECK (status IN ('active', 'terminated_success', 'terminated_inconclusive', 'cancelled_by_admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Statuts** :
- `active` : encore signalable, slots dispo pour les guides
- `terminated_success` : Google a supprimé l'avis → fermé succès
- `terminated_inconclusive` : compteur atteint mais avis toujours en ligne
- `cancelled_by_admin` : annulation exceptionnelle par admin (slot remboursé via la logique métier au cas par cas)

### 4.4 `signalement_slots` — Slots de signalement (1 par avis × N signalements)

Chaque avis génère N slots à sa création. Un guide "prend" un slot.

```sql
CREATE TABLE IF NOT EXISTS signalement_slots (
    id VARCHAR(36) PRIMARY KEY,
    avis_id VARCHAR(36) NOT NULL,
    slot_index INT NOT NULL,                     -- 1, 2, 3... jusqu'à nb_signalements_target
    status VARCHAR(20) DEFAULT 'available',
    reserved_by_guide_id VARCHAR(36),
    reserved_at DATETIME,
    reservation_expires_at DATETIME,             -- reserved_at + 30 min
    submitted_at DATETIME,                       -- quand le guide a envoyé sa preuve
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_avis_slot (avis_id, slot_index),
    INDEX idx_slot_status (status, avis_id),
    INDEX idx_slot_reserved_guide (reserved_by_guide_id, status),
    INDEX idx_slot_expires (status, reservation_expires_at),
    CONSTRAINT fk_slot_avis FOREIGN KEY (avis_id) REFERENCES signalement_avis(id) ON DELETE CASCADE,
    CONSTRAINT fk_slot_guide FOREIGN KEY (reserved_by_guide_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_slot_status CHECK (status IN ('available', 'reserved', 'submitted', 'validated'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Cycle de vie d'un slot** : `available` → `reserved` (guide clique "prendre") → `submitted` (guide upload preuve) → `validated` (admin valide). Si l'admin **rejette** la preuve, le slot **redevient `available`** (un autre guide peut le reprendre) et la proof reste en `signalement_proofs.status = 'rejected'` pour audit. Si timer expire en `reserved` sans submission → reset à `available` (lazy-check à la lecture).

### 4.5 `signalement_proofs` — Preuves uploadées par les guides

```sql
CREATE TABLE IF NOT EXISTS signalement_proofs (
    id VARCHAR(36) PRIMARY KEY,
    slot_id VARCHAR(36) NOT NULL,
    avis_id VARCHAR(36) NOT NULL,                -- dénormalisé pour requêtes admin
    guide_id VARCHAR(36) NOT NULL,
    screenshot_url TEXT NOT NULL,                -- Cloudinary URL (capture du signalement Google)
    report_link TEXT,                            -- lien fourni par le guide (optionnel selon UX Google)
    note_guide TEXT,                             -- commentaire libre du guide
    status VARCHAR(20) DEFAULT 'pending',
    rejection_reason TEXT,
    earnings_cents INT NOT NULL,                 -- snapshot du payout au moment du submit
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME,
    validated_by VARCHAR(36),
    deleted_at DATETIME DEFAULT NULL,
    INDEX idx_proof_status (status, deleted_at),
    INDEX idx_proof_guide (guide_id, status, deleted_at),
    INDEX idx_proof_avis (avis_id),
    INDEX idx_proof_slot (slot_id),
    CONSTRAINT fk_proof_slot FOREIGN KEY (slot_id) REFERENCES signalement_slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_avis FOREIGN KEY (avis_id) REFERENCES signalement_avis(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_proof_validator FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_proof_status CHECK (status IN ('pending', 'validated', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4.6 `signalement_config` — Configuration globale (singleton)

Une seule ligne (id = `'global'`).

```sql
CREATE TABLE IF NOT EXISTS signalement_config (
    id VARCHAR(20) PRIMARY KEY DEFAULT 'global',
    cooldown_hours_between_signalements INT NOT NULL DEFAULT 2,
    default_payout_cents INT NOT NULL DEFAULT 35,
    reservation_timer_minutes INT NOT NULL DEFAULT 30,
    min_validated_reviews_for_eligibility INT NOT NULL DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    CONSTRAINT fk_sigconfig_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO signalement_config (id) VALUES ('global') ON DUPLICATE KEY UPDATE id = id;
```

### 4.7 Permissions — extension du JSON `users.permissions`

Les permissions sont stockées dans la colonne JSON `users.permissions` (et aussi `admins_profiles.permissions` pour cohérence — voir migration 040). **Aucune migration DB nécessaire** : on ajoute simplement 3 nouvelles clés au blob JSON.

Exemple de blob `users.permissions` après ajout :

```json
{
  "can_validate_profiles": true,
  "can_validate_reviews": true,
  "...": "...",
  "can_manage_signalement_packs": false,
  "can_manage_signalements": false,
  "can_validate_signalements": false
}
```

**À faire côté code** :
- Mettre à jour `AdminTeam.tsx` pour afficher les 3 nouvelles checkboxes lors de la création/édition d'un admin équipe
- Mettre à jour le service backend qui sérialise les permissions JSON pour accepter les 3 nouvelles clés
- Créer le middleware `checkSignalementPermission(permName)` qui lit `req.user.permissions[permName]` et renvoie 403 si false (avec bypass owner email + bypass super-admin si `permissions === null`)
- Owner (`dossoumaxime888@gmail.com`) et super-admin (permissions null/vide) bypass tout, comme partout ailleurs

### 4.8 Vue/relation : `users.role = 'guide'` pour l'éligibilité

Pas de nouvelle table. Le check d'éligibilité guide se fait via une fonction service :

```sql
-- Pseudo : SELECT
--   u.id,
--   (SELECT COUNT(*) FROM identity_verifications iv
--      WHERE iv.user_id = u.id AND iv.status = 'validated' AND iv.deleted_at IS NULL) AS kyc_ok,
--   (SELECT COUNT(*) FROM reviews_submissions rs
--      WHERE rs.guide_id = u.id AND rs.status = 'validated') AS validated_reviews
-- FROM users u WHERE u.id = :guide_id;
```

Éligible si `kyc_ok > 0 AND validated_reviews >= 1`.

### 4.9 Référentiel des raisons (côté code, pas en table)

Énumération des 9 raisons Google (constante TS partagée frontend/backend) :

```ts
export const SIGNALEMENT_RAISONS = {
  HORS_SUJET: "Hors sujet",
  COURRIER_INDESIRABLE: "Courrier indésirable",
  CONFLIT_INTERETS: "Conflit d'intérêts",
  IMPIETE: "Impiété",
  NOCIF: "Nocif",
  INTIMIDATION: "Intimidation ou harcèlement",
  DISCRIMINATION: "Discrimination ou discours haineux",
  INFOS_PERSONNELLES: "Informations personnelles",
  PAS_UTILE: "Pas utile",
} as const;
```

La colonne `signalement_avis.raison` stocke la **clé** (ex: `HORS_SUJET`).

### 4.10 Diagramme relationnel (résumé ASCII)

```
signalement_packs (templates)
        │
        │ pack_id (snapshot)
        ▼
signalement_attributions ◄─── artisan_id ─── users (artisan)
        │
        │ attribution_id
        ▼
signalement_avis ─────► (génère N slots)
        │
        ▼
signalement_slots ◄─── reserved_by_guide_id ─── users (guide)
        │
        │ 1:1 (à validation)
        ▼
signalement_proofs ◄─── guide_id ─── users (guide)
                  ◄─── validated_by ─── users (admin)

signalement_config (singleton, id='global')
```

---

## 5. Backend — endpoints

Routes regroupées par fichier dans `routes/signalement/`. Toutes utilisent `requireAuth` + check de permission.

### 5.1 Admin — Gestion des packs (`signalement/adminPacks.ts`)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/signalement/admin/packs` | `can_manage_signalement_packs` | Liste packs (non supprimés) |
| POST | `/api/signalement/admin/packs` | `can_manage_signalement_packs` | Crée pack `{name, nb_avis, nb_signalements_par_avis, price_cents}` |
| PUT | `/api/signalement/admin/packs/:id` | `can_manage_signalement_packs` | Édite pack (name/nb/prix) |
| DELETE | `/api/signalement/admin/packs/:id` | `can_manage_signalement_packs` | Soft-delete |

### 5.2 Admin — Attribution (`signalement/adminAttribution.ts`)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/signalement/admin/attributions` | `can_manage_signalement_packs` | Body `{artisan_id, pack_id, note?}` → crée attribution (cumul) |
| GET | `/api/signalement/admin/attributions/artisan/:artisan_id` | `can_manage_signalement_packs` | Liste attributions de cet artisan + compteur global |
| DELETE | `/api/signalement/admin/attributions/:id` | `can_manage_signalement_packs` | Soft-delete (rare, cas exceptionnel) |

### 5.3 Admin — Avis à signaler (`signalement/adminAvis.ts`)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/signalement/admin/avis` | `can_manage_signalements` | Liste tous les avis (filtres : statut, artisan, date) + pagination |
| GET | `/api/signalement/admin/avis/:id` | `can_manage_signalements` | Détail d'un avis + slots + preuves |
| PUT | `/api/signalement/admin/avis/:id/payout` | `can_manage_signalements` | Modifie `payout_per_signalement_cents` |
| POST | `/api/signalement/admin/avis/:id/mark-google-deleted` | `can_manage_signalements` | Passe en `terminated_success` |
| POST | `/api/signalement/admin/avis/:id/cancel` | `can_manage_signalements` | Body `{refund_slot: boolean, reason: string}` → passe en `cancelled_by_admin`. Si `refund_slot=true`, décrémente `nb_avis_consumed` de 1 sur l'attribution liée (restitue 1 slot au compteur global de l'artisan). Tous les slots `available`/`reserved`/`submitted` de cet avis sont annulés/ignorés ensuite |

### 5.4 Admin — Validations preuves (`signalement/adminValidations.ts`)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/signalement/admin/validations/pending` | `can_validate_signalements` | File des preuves en `pending` (joint avis + guide + URL Google) |
| POST | `/api/signalement/admin/validations/:proof_id/approve` | `can_validate_signalements` | Valide → slot `validated`, compteur avis +1, paiement guide enregistré |
| POST | `/api/signalement/admin/validations/:proof_id/reject` | `can_validate_signalements` | Rejette `{rejection_reason}` → slot redevient `available` (le slot peut être repris) |

### 5.5 Admin — Config (`signalement/adminConfig.ts`)

| Méthode | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/signalement/admin/config` | `can_manage_signalement_packs` | Lit la ligne `id='global'` |
| PUT | `/api/signalement/admin/config` | `can_manage_signalement_packs` | Met à jour cooldown, default payout, timer, seuil éligibilité |

### 5.6 Artisan (`signalement/artisan.ts`)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/signalement/artisan/me/summary` | Compteur d'avis restants (somme attributions) + nb avis en cours / terminés |
| GET | `/api/signalement/artisan/me/avis` | Liste de ses avis soumis (tous statuts) |
| POST | `/api/signalement/artisan/me/avis` | Soumet un nouvel avis `{google_review_url, raison, raison_details?}` — décrémente 1 slot du compteur global, crée l'avis + N slots |
| POST | `/api/signalement/artisan/me/avis/:id/relaunch` | Relance un avis `terminated_inconclusive` — décrémente 1 slot, crée un NOUVEL avis avec `relaunched_from_avis_id` pointant sur l'ancien |

Erreurs typiques : 403 si pas de slot dispo (`{error: "Aucun avis restant dans votre pack"}`), 400 si URL invalide, 400 si raison inconnue.

### 5.7 Guide (`signalement/guide.ts`)

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/signalement/guide/eligibility` | Check si guide éligible (`{eligible: bool, reasons: [...]}`) |
| GET | `/api/signalement/guide/avis-disponibles` | Liste des avis avec slots `available` (cooldown respecté pour ce guide) |
| POST | `/api/signalement/guide/slots/:slot_id/reserve` | Réserve un slot — vérifie : éligibilité, déjà 1 slot sur cet avis ?, cooldown global, slot toujours `available` |
| POST | `/api/signalement/guide/slots/:slot_id/submit-proof` | Multipart : `screenshot` (file) + `report_link?` + `note?` — passe slot en `submitted` + crée `signalement_proofs` row `pending` |
| GET | `/api/signalement/guide/me/proofs` | Historique de ses preuves avec statuts |

**Règle cooldown** appliquée à la lecture de `/avis-disponibles` :
> Un avis `X` n'apparaît PAS dans la liste si une preuve a été `submitted` ou `validated` depuis moins de `cooldown_hours_between_signalements` heures sur cet avis.

(NB : on filtre globalement, pas par guide. Le cooldown est sur l'avis, pas sur le guide.)

### 5.8 Cron / scheduled task : expiration des réservations

Une tâche backend (ou check à la lecture) qui passe les slots `reserved` dont `reservation_expires_at < NOW()` en `available` et libère `reserved_by_guide_id`.

Implémentation simple v1 : check **paresseux à la lecture** dans `getAvisDisponibles` — pas besoin de cron job. Si Vercel/Railway le permet, on peut ajouter un cron léger en v2.

---

## 6. Frontend — pages, UI, navigation

### 6.1 Admin

#### `SignalementPacks.tsx`
- Header : "Packs Signalement" + bouton "Créer pack"
- Table : nom, nb_avis, nb_signalements/avis, prix, actions (éditer/supprimer)
- Modal création/édition : 4 champs

#### `SignalementsList.tsx` (vue globale)
- Stats bar (4 KPI) : avis actifs, avis terminés succès, avis non-concluants, signalements validés ce mois
- Filtres : statut, artisan (autocomplete), date range, raison
- Table : ID court, artisan (lien), URL Google (extrait + copy), raison badge, compteur (`3/10`), payout (cliquable pour éditer inline), statut badge, actions
- Actions par row : détail, marquer "Google a supprimé", annuler (avec confirmation), édition payout
- Modal détail : timeline de l'avis, liste des slots avec statut, preuves attachées (preview cloudinary)

#### `SignalementValidations.tsx`
- File des preuves en `pending`, ordonnée par `submitted_at ASC`
- Card par preuve : guide (nom + lien profil), avis (URL Google + raison demandée), screenshot preview (lightbox), note guide, boutons "Valider" / "Rejeter"
- Modal rejet : champ `rejection_reason` obligatoire

#### `SignalementConfig.tsx`
- 4 inputs : cooldown_hours, default_payout (en €), reservation_timer (min), min_validated_reviews
- Bouton "Sauvegarder"

#### Modif `ArtisanDetail.tsx` (existant)
- Ajout d'un onglet "Signalement"
- Contenu :
  - Compteur global : "X avis restants au total"
  - Bouton "Attribuer un nouveau pack" → modal liste packs + champ note
  - Tableau des attributions actives + historiques (pack, date, attribué par, slots restants/total)
  - Tableau résumé des avis soumis par cet artisan (lien vers la vue globale filtrée)

### 6.2 Artisan

#### `ArtisanSignalementDashboard.tsx` (page unique)

Structure :
1. **Banner état** : si aucun pack actif → message + CTA "Contactez-nous pour activer ce service"
2. **Stats cards** (gradient vert AchatAvis) : Avis restants `X`, Avis en cours `Y`, Terminés succès `Z`, Non-concluants `W`
3. **Action principale** (si `X > 0`) : carte centrée "Soumettre un avis Google à signaler" → bouton ouvre modal
4. **Modal soumission** : URL Google + dropdown raison (9 options) + textarea précisions (optionnel) + bouton "Soumettre" (avec confirm Swal)
5. **Tableau historique** : URL (extrait), raison, statut, compteur (`3/10`), date soumission, date clôture, action :
   - Si `terminated_inconclusive` → bouton "Relancer" (confirm "Ça consomme 1 slot de votre pack")
   - Sinon : aucun bouton (lecture seule, on peut afficher modal détail mais sans preuves selon décision 9.b A)

### 6.3 Guide

#### `GuideSignalementsList.tsx`
- Si non éligible : banner "Vous devez avoir 1 avis classique validé pour accéder au signalement" + lien CTA vers fiches classiques
- Si éligible : liste des avis dispo (cards) :
  - URL Google review (cliquable, ouvre dans nouvel onglet)
  - Raison demandée (badge)
  - Slots restants (`5/10`)
  - Payout (`0,35€`)
  - Bouton "Prendre ce signalement" (disabled si déjà 1 slot sur cet avis ou cooldown actif)

#### `GuideSignalementDetail.tsx` (slot réservé)
- Reprend les infos de l'avis + raison + payout
- Timer décompte visible : "Temps restant pour soumettre la preuve : 27:14"
- Instructions courtes : "Cliquez sur l'URL → connectez-vous Google → signalez avec la raison demandée → faites une capture → uploadez ici"
- Form : input file (drag & drop, image only via Cloudinary widget) + champ optionnel "lien" + textarea optionnel
- Bouton "Soumettre la preuve"

### 6.4 Sidebar — modification de `Sidebar.tsx` (ou équivalent)

Ajout d'un nouveau bloc "Signalement" :
- Côté **admin** : 4 entrées conditionnées par les 3 permissions
- Côté **artisan** : 1 entrée "Signalement" (visible uniquement si l'artisan a au moins 1 attribution active OU si on veut l'afficher tout le temps avec banner de promo — **à trancher avec Maxime**, défaut : visible si attribution active)
- Côté **guide** : 1 entrée "Signalement" (visible si éligible OU avec banner si non éligible — défaut : toujours visible, banner si non éligible)

### 6.5 Composants réutilisés

- `DashboardLayout`, `LoadingSpinner`, `AdminTable`, `Badge`, `ConfirmModal`, `Swal` (sweetalert2)
- Cloudinary widget existant pour upload (KYC actuel)
- Style : palette AchatAvis (vert primaire `#059669`, badges status, cards 1rem radius)

---

## 7. Cas limites & gestion d'erreurs

| Cas | Comportement attendu |
|---|---|
| Artisan soumet un avis sans slot dispo | 403 + message explicite "Aucun avis restant" |
| Artisan soumet 2 avis avec la même URL | Pas de blocage en v1 (cas marginal). On loggue. À surveiller. |
| Guide essaie de réserver un slot déjà pris | Race condition → vérification `SELECT ... FOR UPDATE` dans transaction → 409 Conflict si plus dispo |
| Guide essaie de réserver un 2e slot sur le même avis | 403 + message "Vous avez déjà un slot sur cet avis" |
| Guide essaie de réserver pendant cooldown global sur l'avis | 403 + message "Trop tôt, prochain signalement possible à HH:MM" |
| Timer du guide expire sans submit | Lazy-check : à la prochaine lecture de la liste, slot bascule `available` automatiquement, `reserved_by_guide_id` reset à NULL |
| Admin valide une preuve dont le compteur a déjà atteint le target (cas exotique) | Si compteur déjà = target ET statut `active` → on incrémente quand même (le compteur peut dépasser temporairement par sécurité, on traite en service : si après incrément `validated >= target`, transition statut) |
| Admin rejette une preuve | Slot redevient `available`, le `signalement_proofs.status = rejected` reste pour audit, le guide n'est PAS payé |
| Cloudinary upload échoue | 500 + message "Échec upload, réessayez". Pas de proof créée, slot reste `reserved`. |
| Artisan supprimé (soft-delete user) | Ses avis restent visibles côté admin (jointure incluant deleted_at) mais le guide ne voit plus rien (filtre artisan deleted) |
| Pack supprimé (soft-delete) | Les attributions existantes continuent de fonctionner (on a snapshot les valeurs), juste plus de nouvelles attributions possibles |
| Owner email | Bypass tous les checks de permission backend ET frontend, comme partout ailleurs dans le projet |

---

## 8. Migrations

Une seule migration numérotée à la suite : `064_create_signalement_system.sql`.

Contenu : les 6 CREATE TABLE + ALTER TABLE permissions + INSERT initial config + INSERT seeds packs (optionnel, on peut laisser vide et créer via UI).

Migration **idempotente** : utilise `CREATE TABLE IF NOT EXISTS` et check `INFORMATION_SCHEMA` pour les ALTER TABLE.

---

## 9. Tests / vérifications avant push

### 9.1 Tests manuels minimaux (parcours end-to-end)

1. Admin crée un pack `{ "Test Pack", 3 avis, 5 signalements/avis, 25€ }`
2. Admin attribue ce pack à un artisan de test → vérif compteur global = 3
3. Artisan se connecte, voit `3 avis restants`
4. Artisan soumet une URL Google avec raison "Hors sujet" → compteur = 2, avis créé avec 5 slots `available`
5. Guide éligible se connecte, voit l'avis dans la liste
6. Guide réserve un slot → timer 30 min affiché
7. Guide upload une preuve (capture)
8. Admin voit la preuve en file de validation, valide
9. Vérif : compteur signalements de l'avis passe à 1/5, paiement guide enregistré (à confirmer dans dashboard guide)
10. Guide essaie de réserver un 2e slot sur le même avis → bloqué
11. Un autre guide réserve, upload, admin rejette → slot redevient dispo
12. Cooldown : 2 signalements rapprochés sur le même avis → vérif que le 2e est bloqué tant que cooldown pas écoulé
13. Une fois 5 signalements validés, avis passe en `terminated_inconclusive` (Google n'a rien fait dans le test)
14. Artisan voit le bouton "Relancer" → clic → compteur global passe à 1, nouvel avis créé avec 5 slots
15. Admin marque un avis comme "Google a supprimé" → statut `terminated_success`, slots `available` restants → blocked

### 9.2 Vérifications techniques

- TypeScript strict : `npm run build` côté backend ET frontend, zéro erreur
- Linter : pas de `any` non justifié
- Soft-delete vérifié : toutes les SELECT incluent `deleted_at IS NULL`
- Permissions vérifiées des 2 côtés (frontend cache + backend bloque)
- Owner bypass testé : login `dossoumaxime888@gmail.com`, voit tout, tout fonctionne
- DB local : migration appliquée sans erreur, rollback possible (drop tables)
- Pas de logs d'erreur en console après parcours end-to-end

### 9.3 Rappel déploiement

**NE PAS PUSHER EN PRODUCTION** sans validation explicite de Maxime. Démarrage en local uniquement (`npm run dev` backend + frontend), URLs locales fournies à Maxime pour tests. Aucun `git push`, aucun `git subtree push` sans demande explicite.

---

## 10. Estimation effort

| Étape | Complexité | Effort estimé |
|---|---|---|
| Migration DB (064) | Faible | 1-2h |
| Backend services + controllers + routes | Moyenne | 8-12h |
| Frontend admin (4 pages + modif ArtisanDetail) | Moyenne | 8-12h |
| Frontend artisan (1 page) | Faible | 3-4h |
| Frontend guide (2 pages) | Faible | 4-5h |
| Sidebar + navigation + permissions | Faible | 2-3h |
| Tests manuels end-to-end | Moyenne | 3-4h |
| **Total** | | **~30-42h dev** |

À découper en plusieurs commits/PR locaux avant push prod.

---

## 11. Décisions à confirmer par Maxime avant codage

Quelques points où j'ai pris des décisions par défaut sensées mais qui méritent ton OK explicite :

1. **Sidebar artisan** : entrée "Signalement" visible uniquement si attribution active (default), ou toujours visible avec message "Service à activer" ?
2. **Sidebar guide** : entrée "Signalement" toujours visible (avec banner non éligible) ou cachée tant que non éligible ?
3. **Soft-delete d'un signalement_avis** : pas de soft-delete par l'utilisateur prévu, seul l'admin peut "annuler". OK ?
4. **`signalement_avis.raison_details`** : champ optionnel pour que l'artisan ajoute du contexte. OK qu'il soit visible côté guide (texte d'aide) ?
5. **Validation backend du payload soumission artisan** : on valide juste que l'URL contient `google.com` et `maps` ? Ou regex plus stricte ? Default : présence de `google.com` suffit (souple).
6. **Valeur par défaut cooldown** : 2h. OK ou tu préfères 4h pour être safer côté Google ?
7. **Cron job vs lazy check** pour expiration timer : lazy-check seulement en v1 (pas de cron). OK ?
8. **Format payout** : stocker en cents (INT) plutôt que DECIMAL pour cohérence avec `subscription_packs`. OK ?

---

## 12. Étape suivante (post-validation de cette spec)

Une fois cette spec validée par Maxime :

1. Création du plan d'implémentation détaillé via le skill `writing-plans`
2. Découpage en sous-tâches numérotées (migration → backend → frontend → tests)
3. Implémentation **strictement en local** (jamais de push prod sans demande explicite)
4. Tests manuels end-to-end par Maxime sur l'environnement local
5. Push prod uniquement après green light explicite

---

*Fin du document.*
