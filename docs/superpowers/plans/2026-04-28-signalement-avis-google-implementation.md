# Signalement avis Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le service de signalement d'avis Google : packs admin → attribution artisan → soumission d'URLs Google → guides éligibles signalent + uploadent preuve → admin valide → guide payé.

**Architecture:** Module strictement isolé du système d'avis classique. Tables, routes, pages frontend, navigation tous séparés via sous-dossiers `signalement/`. Réutilise les utilities transverses (auth middleware, cloudinary, transactions MySQL, composants UI). 8 nouvelles tables, ~28 endpoints REST, 7 pages frontend, 3 nouvelles permissions admin.

**Tech Stack:** Node.js + Express + TypeScript backend (Railway) — React 18 + TypeScript + Vite frontend (Vercel) — MySQL Railway — Cloudinary uploads — JWT auth — sweetalert2 + lucide-react.

**Spec source:** [docs/superpowers/specs/2026-04-28-signalement-avis-google-design.md](../specs/2026-04-28-signalement-avis-google-design.md)

**Règle absolue déploiement** : à la fin du plan, démarrage strictement en local (`npm run dev` backend + frontend). **AUCUN `git push`, AUCUN `git subtree push`** sans demande explicite de Maxime. Voir mémoire `feedback_signalement_local_first.md`.

---

## File Structure

### Backend (à créer)

```
backend/
├── migrations/
│   └── 064_create_signalement_system.sql                  (CREATE TABLE x6 + INSERT config)
└── src/
    ├── types/signalement.ts                               (interfaces partagées)
    ├── constants/signalementRaisons.ts                    (énum 9 raisons Google)
    ├── middleware/signalement/
    │   └── checkSignalementPermission.ts                  (3 perms + bypass owner/super-admin)
    ├── services/signalement/
    │   ├── packService.ts                                 (CRUD packs)
    │   ├── attributionService.ts                          (cumul, snapshots)
    │   ├── eligibilityService.ts                          (KYC + nb avis validés)
    │   ├── cooldownService.ts                             (temps entre signalements/avis)
    │   ├── avisService.ts                                 (création + N slots, transitions)
    │   ├── slotService.ts                                 (réservation, expiration, transition)
    │   ├── proofService.ts                                (upload, validate, reject)
    │   └── payoutService.ts                               (paiement guide à validation)
    ├── controllers/signalement/
    │   ├── packController.ts
    │   ├── attributionController.ts
    │   ├── avisController.ts
    │   ├── validationController.ts
    │   ├── configController.ts
    │   ├── artisanController.ts
    │   └── guideController.ts
    └── routes/signalement/
        ├── adminPacks.ts
        ├── adminAttribution.ts
        ├── adminAvis.ts
        ├── adminValidations.ts
        ├── adminConfig.ts
        ├── artisan.ts
        ├── guide.ts
        └── index.ts                                       (mount router central)
```

### Backend (à modifier)

- `backend/src/app.ts` — ajout `app.use('/api/signalement', signalementRoutes)`

### Frontend (à créer)

```
frontend/src/
├── types/signalement.ts                                   (interfaces TS partagées)
├── constants/signalementRaisons.ts                        (même énum copiée)
├── services/signalement/
│   ├── adminPacksApi.ts
│   ├── adminAttributionApi.ts
│   ├── adminAvisApi.ts
│   ├── adminValidationsApi.ts
│   ├── adminConfigApi.ts
│   ├── artisanApi.ts
│   └── guideApi.ts
└── pages/
    ├── admin/signalement/
    │   ├── SignalementPacks.tsx + .css
    │   ├── SignalementsList.tsx + .css
    │   ├── SignalementValidations.tsx + .css
    │   └── SignalementConfig.tsx + .css
    ├── artisan/signalement/
    │   └── ArtisanSignalementDashboard.tsx + .css
    └── guide/signalement/
        ├── GuideSignalementsList.tsx + .css
        └── GuideSignalementDetail.tsx + .css
```

### Frontend (à modifier)

- `frontend/src/App.tsx` — nouvelles routes
- `frontend/src/pages/admin/ArtisanDetail.tsx` — onglet "Signalement"
- `frontend/src/components/layout/Sidebar.tsx` (ou équivalent) — nouvelles entrées par rôle
- `frontend/src/pages/admin/AdminTeam.tsx` — 3 nouvelles checkboxes permissions

---

## Phase overview

| Phase | Contenu | Output testable |
|---|---|---|
| **Phase 0** | DB migration + types/constants partagés | Migration appliquée en local sans erreur |
| **Phase 1** | Services backend cœur métier (logique pure) | Tests unitaires passent sur eligibility, cooldown, slot expiration |
| **Phase 2** | Services backend CRUD + controllers + routes + middleware perm | Endpoints répondent (curl OK pour chaque endpoint admin/artisan/guide) |
| **Phase 3** | Frontend types + API clients | Compile sans erreur, types alignés backend |
| **Phase 4** | Frontend admin (4 pages + onglet ArtisanDetail + sidebar + perms team) | Admin peut créer pack, attribuer, voir avis, valider preuve, configurer cooldown |
| **Phase 5** | Frontend artisan (1 page + sidebar + route) | Artisan peut soumettre URL, voir l'avancement, relancer |
| **Phase 6** | Frontend guide (2 pages + sidebar + route) | Guide éligible peut prendre slot, uploader preuve avec timer |
| **Phase 7** | Tests end-to-end manuels en local + checks techniques | Parcours complet validé (15 étapes spec section 9.1) |

---

(Suite : Tasks détaillées Phase 0 à Phase 7 — voir blocs ci-dessous)
