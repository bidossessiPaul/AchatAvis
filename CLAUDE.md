# CLAUDE.md — Instructions pour Maxime / EkoMedia

> Fichier d'instructions universel à coller dans n'importe quel projet Mushine / EkoMedia.
> Il contient toutes mes préférences de communication, de design, de code, et de SEO/GEO.

---

## 1. Communication

- **Réponds toujours en français.**
- **Ton direct, sans blabla.** Pas de "je vais procéder à...", pas de phrases meublantes.
- **Réponses concises** sauf si la complexité technique impose le détail.
- Quand je demande "vérifie X", **regarde dans le code et la DB** avant de répondre, ne devine pas.
- Quand un fix est déployé, **résume en 3 lignes max** ce qui change côté utilisateur — pas de mur de texte.
- **Avant/après en tableau** quand c'est utile pour comparer un comportement modifié.
- **Pas d'emoji dans les réponses**, sauf si je le demande explicitement (`stp ajoute un emoji`).
- **Pas d'emoji dans le code écrit** (composants, commentaires, commits) — sauf labels UI métier où ils ont du sens (ex: badge `🚨 VPN`, icône secteur).
- **Commentaires de code en français.** Pas de `// fixed bug`, plutôt `// Corrige le bug X car Y`.

### Mode d'exécution — ACTION DIRECTE par défaut
- **Tâche simple (fix, ajout feature simple, modif UI, requête DB, refacto local) → exécution directe.** Pas de plan, pas de checklist, pas de brainstorming.
- **Plan court autorisé** (3-5 puces max) quand la tâche touche plusieurs fichiers OU implique un choix d'archi non évident OU est ambiguë. Pas de plan formel à plusieurs sections.
- **Plan détaillé uniquement si** : je le demande ("fais-moi un plan"), refacto >5 fichiers, migration DB destructive, changement d'archi, ou nouvelle feature de fond.
- **Skills `brainstorming` / `writing-plans` / `executing-plans` / `TDD` : pas en auto-trigger.** Utilise-les seulement si je te le demande, ou si la tâche est vraiment complexe (et dans ce cas, version courte).
- **1 question de clarif max** si vraie ambiguïté — pas un questionnaire. Si la demande est claire, exécute.
- **Pas de "voici ce que je vais faire" en 10 lignes avant d'agir.** Une phrase d'annonce suffit, puis tool call. Le diff parle.
- **Validation utilisateur** réservée aux actions risquées : push prod, force push, drop table, suppression de fichiers, modifs `.env` / git config, commits non sollicités. Pour tout le reste : action.

---

## 2. Stack technique récurrent

### Frontend
- **React 18 + TypeScript + Vite** (rarement Next.js sauf landing pages)
- **react-router-dom** pour le routing
- **Zustand** pour l'auth/store global
- **axios** pour les appels API
- **lucide-react** pour les icônes (TOUJOURS, jamais emoji dans la UI principale)
- **react-icons** uniquement pour des icônes secteur métier très spécifiques (FaSpa, MdPlumbing...)
- **recharts** pour les graphiques
- **sweetalert2** (`Swal`) pour les confirmations / erreurs / succès
- **react-hot-toast** pour les notifications transient (rarement)
- **framer-motion** pour les animations (cercles, barres de progression)
- **Tailwind** uniquement sur certains projets (PapaDossou, Next.js); sinon CSS modules + inline styles

### Backend
- **Node.js + Express + TypeScript**
- **MySQL** sur Railway (placeholders nommés `:paramName` avec `mysql2`)
- **JWT** httpOnly cookies pour refresh + localStorage pour access token
- **Nodemailer** pour les emails transactionnels
- **Cloudinary** pour les uploads (KYC, avatars)
- **bcryptjs** pour les passwords

### Infra
- Backend déploiement : **Railway** (parfois Vercel mais SSE / long-running KO sur Vercel)
- Frontend : **Vercel** ou **Netlify**
- Hébergement WordPress / scripts : **Coolify sur Hetzner**
- Automatisation : **n8n** + Google Sheets + Claude API
- Domain DNS : **Cloudflare**

### Scripts / outils
- **Python** pour les scripts ponctuels (génération de pages SEO, traitements)
- **PHP / WordPress** pour les sites clients EkoMedia

---

## 3. Conventions de code

### Général
- **Pas de `lorem ipsum`**. Toujours du contenu réel ou des exemples crédibles.
- **Solution la plus simple d'abord.** Pas d'abstraction prématurée. Trois lignes répétées valent mieux qu'un helper jamais réutilisé.
- **Pas de feature flag, pas de backwards-compat shim** quand on peut juste changer le code.
- **Pas de gestion d'erreur défensive** sur des cas qui ne peuvent pas arriver. Trust internal code.
- **Validation aux frontières** (entrées utilisateur, APIs externes) seulement.
- **Pas de comment qui dit `// renvoie X`** quand le nom de variable le dit déjà. Comments réservés au *pourquoi* (contrainte cachée, workaround spécifique).

### Sécurité
- **Vérifier les permissions côté backend ET frontend.** Le frontend cache les boutons, le backend bloque la requête.
- **Soft-delete sur les tables d'historique** (users, reviews_orders, review_proposals, identity_verifications, guide_gmail_accounts) → colonne `deleted_at DATETIME DEFAULT NULL` + index, et toutes les SELECT filtrent `WHERE deleted_at IS NULL`.
- **Owner email hardcodé** : `dossoumaxime888@gmail.com` bypass tous les checks de permission au backend ET frontend.
- **JWT stateless** : permissions baked dans le token au login, donc l'admin doit re-login pour qu'une nouvelle permission prenne effet.
- **Cookies httpOnly + sameSite='none' + secure=true** en production cross-origin. En dev `sameSite='lax'`.

### Git
- **Toujours créer un nouveau commit** plutôt qu'amender.
- **Jamais skip les hooks** (`--no-verify`).
- **Jamais force push sur main** sans demander.
- **Pas d'emoji dans les commits** sauf cas marketing/branding évident.
- **Co-Authored-By: Claude Opus** dans le footer.
- **Subject line en anglais**, body peut mélanger anglais/français.
- Format : `feat:` / `fix:` / `chore:` / `style:` / `refactor:` / `perf:` / `docs:`

### Déploiement (cas typique : monorepo subtree)
```bash
git push origin main
git push backend-origin $(git subtree split --prefix=backend main):main --force
git subtree push --prefix=frontend frontend-origin main
```
- Si le push subtree échoue avec `fatal: the remote end hung up`, **toujours relancer** — Git pense que c'est OK alors que non.
- Vérifier que `git log backend-origin/main` est aligné avec le dernier commit avant de considérer comme déployé.

---

## 4. Design system

### Palette couleurs
| Usage | Couleur | Hex |
|-------|---------|-----|
| Action primaire / succès | Vert | `#059669` (700: `#047857`) |
| Info / lien | Bleu | `#2383e2` (sky: `#0369a1`) |
| Avertissement | Orange | `#d97706` (background: `#fef3c7`) |
| Erreur / destructif | Rouge | `#dc2626` / `#b91c1c` (background: `#fef2f2`) |
| Neutre / texte | Gray scale | `#0f172a` → `#94a3b8` → `#f8fafc` |
| Highlight / IA | Violet | `#7c3aed` / `#6d28d9` (background: `#ede9fe`) |
| Premium / payant | Cyan-blue | `#0891b2` |

### Patterns UI récurrents

#### Cards
- `border-radius: 1rem` (1.25rem pour les modals, 0.5rem pour les badges)
- `border: 1px solid #e2e8f0`
- `padding: 1.25rem` minimum
- `box-shadow: 0 1px 2px rgba(0,0,0,0.05)` discret, ou bigger sur les modals : `0 25px 50px -12px rgba(0,0,0,0.25)`
- Background dégradé pour les KPI : `linear-gradient(135deg, #059669, #047857)`

#### Boutons
- **Primaire** : gradient vert + radius 0.625rem ou 0.75rem + padding 0.6rem 1.25rem + font-weight 700
- **Secondaire** : white background + border 1px gray + même padding
- **Destructif** : `#fee2e2` background + `#991b1b` color
- Toujours avec icône lucide à gauche (size 14-18 selon le contexte)

#### Inputs
- `border: 2px solid #059669` quand focus/valide, `2px solid #dc2626` quand erreur
- `border-radius: 8px`
- `padding: 0.65rem 0.85rem`
- Label au-dessus, font-size 0.85rem, color gray-700

#### Tables admin
- Header : background `#f8fafc`, font-size 0.75rem, font-weight 700, uppercase, color `#64748b`
- Rows : alterner background blanc / hover effet `#fafbfc`
- Border-bottom `1px solid #f1f5f9`
- Padding `0.875rem 1.5rem`

#### Modals
- Overlay : `rgba(15, 23, 42, 0.6)` + `backdrop-filter: blur(8px)`
- z-index modal : **2000** (la sidebar/navbar est souvent à 1025, donc <2000 = caché derrière)
- max-height : `calc(100vh - 2rem)` + flex column → header/footer fixes, body scrollable
- Mobile (≤640px) : compact padding + bottom-sheet alignment + boutons stackés full-width

#### Badges status
- En attente : `#fef3c7` bg + `#92400e` color
- Validé : `#dcfce7` bg + `#166534` color
- Rejeté / supprimé : `#fee2e2` bg + `#991b1b` color
- Recyclé : `#ede9fe` bg + `#6d28d9` color
- Padding `0.2rem 0.6rem`, border-radius `1rem`, font-size 0.7rem, font-weight 700, uppercase

### Icônes — politique stricte
- **Lucide-react par défaut.** Liste des plus utilisées : `LayoutDashboard, Users, MapPin, FileCheck, ShieldCheck, Trophy, Wallet, RefreshCw, CheckCircle2, XCircle, Clock, Search, Edit3, Trash2, ExternalLink, Mail, Lock, User, Eye, ChevronLeft, ChevronRight, ArrowRight, ArrowUpDown`.
- **Tailles standards** : 14, 16, 18, 20 pixels selon le contexte (badge → 12-14, icône menu → 18-20).
- **PAS d'emoji** dans les composants génériques (boutons, headers, navigation).
- **Emojis OK** uniquement dans :
  - Des badges/labels métier explicites (`🚨 VPN`, `⚠️ Avance`, `🛡️ Localisation`)
  - Des tooltips d'aide
  - Des emails / communiqués WhatsApp pour utilisateurs finaux
- **Couleur de l'icône = couleur du contexte** (vert si validé, rouge si bloqué, etc.)

### Responsive
- Breakpoint mobile principal : **640px** (tailwind sm).
- Sidebars admin : full-width drawer < 768px.
- Tableaux : passer en cards verticales sur mobile (`<div className="lv-mobile-cards">` pattern).
- Modals : compact padding + boutons stackés en colonne en mobile.

---

## 5. Structure de page (admin & dashboard)

### Layout typique d'une page admin
```
DashboardLayout
├── Header (title + sub + actions à droite)
├── Stats bar (3-4 KPI cards en gradient, full-width responsive)
├── Filtres (search input + selects + toggles, flex wrap)
├── Table principale (admin-modern-table)
│   ├── Loading state (LoadingSpinner)
│   ├── Empty state (icon + texte + CTA)
│   └── Rows (hover effect)
├── Pagination (X-Y sur Z + boutons Précédent/Suivant)
└── Modals (créer / éditer / confirmer / preview image)
```

### Layout typique d'une page guide / artisan
```
DashboardLayout
├── Notification banner (info importante)
├── Stats cards (Solde / Cumul / En attente / Déjà payé)
├── Action principale (carte centrée avec CTA)
├── Tableau historique (liste des soumissions, paiements, fiches)
└── Modals (édition / confirmation)
```

### Permissions admin (équipe)
- 13+ permissions granulaires : `can_validate_profiles`, `can_validate_reviews`, `can_validate_fiches`, `can_manage_sectors`, `can_view_payments`, `can_manage_packs`, `can_manage_trust_scores`, `can_manage_team`, `can_view_stats`, `can_manage_users`, `can_manage_reviews`, `can_manage_fiches`, `can_impersonate`, `can_view_geolocation`...
- **Owner** (email hardcodé) : bypass tout
- **Super-admin** (permissions vides/null) : bypass tout aussi
- **Permission FALSE** : bouton/menu/page caché côté frontend, et 403 côté backend
- Smart redirect après login : envoyer l'admin sur la première page à laquelle il a accès

---

## 6. SEO / GEO — règles non-négociables

### Layout des landing pages (RÈGLE D'OR)
- **Formulaire en haut** : visible **au-dessus de la ligne de flottaison** dès l'arrivée, sur desktop ET mobile. Pas besoin de scroller pour le voir.
- **Formulaire en bas** : un deuxième formulaire (souvent identique ou simplifié) accessible quand l'utilisateur a fini de lire. Évite qu'il doive remonter.
- **Espaces blancs / marges vides : minimum.** Compacter, densifier. Pas de hero qui prend 100vh sans rien dedans.
- **Scroll minimum.** Le contenu utile doit défiler vite. Sections compactes, peu d'images décoratives sans valeur, pas de "respiration" excessive.
- Sections dans l'ordre type : *Hero+Form → Preuves sociales (logos clients) → Bénéfices/Comparateur → Tableau prix → Témoignages → FAQ → Form bas + CTA téléphone*

### Contenu SEO dynamique obligatoire
Sur les pages SEO/géo, **toujours intégrer** :
- **Comparateurs** (ex: tableau "Nous vs concurrents", "Pack A vs Pack B")
- **Tableaux** (prix, services, surfaces, durées, options...) — schema markup `Table` quand pertinent
- **Éléments dynamiques** (slider de témoignages, calculateur de tarif, sélecteur de ville/option avec mise à jour live...)
- **Liste de prix** affichée clairement (Schema `Offer`/`Product` avec `priceCurrency` et `price`)
- **FAQ en bas de page** (4-8 questions, schema `FAQPage` obligatoire)
- **CTA répétés** : 1 dans le hero, 1 mid-content, 1 dans le pricing, 1 dans le formulaire bas

### Maillage interne — bosser à fond
- **Chaque page** doit lier vers : pages parentes (catégorie/ville mère), pages sœurs (services proches dans la même ville), pages enfants (variations spécifiques), articles de blog liés.
- Footer riche avec **liste géographique complète** des villes/services traités (utilisé pour le crawl).
- **Ancre descriptive** dans les liens internes — jamais "cliquez ici" — toujours `Notre service de {service} à {ville}`.
- Sur les sites WordPress : **plugin de maillage automatique** ou shortcode custom qui injecte des liens contextuels.
- **Breadcrumb visible ET schema** sur chaque page.

### Priorité absolue
- **Français local** (pour clients FR/Afrique francophone : Bénin, Sénégal, Côte d'Ivoire...)
- **Géo-ciblage** : ville + département/région dans :
  - `<title>` : `Service Y à Ville (Code postal)`
  - `<h1>` : variation incluant la ville
  - URL : `/service/ville-code-postal/`
  - Schema LocalBusiness avec `address.addressLocality` + `geo.latitude/longitude`

### Structure obligatoire d'une page géo
```html
<head>
  <title>{Service} à {Ville} ({CP}) | {Brand}</title>
  <meta name="description" content="{Brand} — {Service} à {Ville}. {USP en 1 phrase}. {CTA}.">
  <link rel="canonical" href="https://...">
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:image" content="...">

  <!-- Schema LocalBusiness MINIMUM -->
  <script type="application/ld+json">{...}</script>
</head>
<body>
  <h1>{Service} à {Ville} — {Brand}</h1>
  <!-- Contenu unique de 800-1500 mots, JAMAIS dupliqué entre villes -->
  <!-- Section "Pourquoi nous à {Ville}" avec spécificités locales -->
  <!-- FAQ schema-marked -->
  <!-- Avis clients (vrais, schema Review) -->
  <!-- CTA fort + tel + formulaire -->
</body>
```

### GEO (Generative Engine Optimization)
- **Citabilité** : passages courts (40-80 mots) avec données concrètes (% chiffres dates lieux noms).
- **E-E-A-T** : Expérience (cas client réel), Expertise (qualifications), Authoritativeness (mentions presse), Trustworthiness (HTTPS, mentions légales, avis vérifiables).
- **llms.txt** à la racine du domaine pour les sites publics importants.
- **FAQ schema** + **HowTo schema** quand applicable → bonne traction sur Google AI Overviews.
- **Author schema** sur les articles de blog.
- Ne pas générer le contenu uniquement à l'IA → **mélanger IA + relecture humaine** + détails authentiques sur l'entreprise.

### Pipeline SEO récurrent (EkoSEO)
- n8n → Google Sheets (mots-clés + variantes ville) → Claude API (génération contenu unique) → WordPress REST API (publication automatisée) → indexing API ping.
- Toujours **un H1 différent** par page géo, **paragraphes spécifiques à la ville** (pas que substitution de tokens), **photos locales** quand possible.

---

## 7. Base de données — patterns récurrents

### Conventions de schéma
- **UUID v4** comme clé primaire (`VARCHAR(36)`) pour les entités principales (users, orders, submissions...).
- **DATETIME DEFAULT CURRENT_TIMESTAMP** pour `created_at`. **DATETIME DEFAULT NULL** pour `updated_at`, `deleted_at`, `validated_at`, etc.
- **Soft-delete** : `deleted_at DATETIME DEFAULT NULL` + index, et TOUTES les SELECT filtrent.
- **FK** : `ON DELETE CASCADE` pour les enfants, `ON DELETE SET NULL` pour les références faibles.
- **Status** : VARCHAR(20) avec valeurs explicites (`pending`, `validated`, `rejected`, `recycled`...).

### Migrations
- Numérotées : `001_initial_schema.sql`, `002_add_X.sql`...
- **Idempotentes** quand possible (utiliser `INFORMATION_SCHEMA` checks pour ALTER TABLE).
- Commentaires en français en tête de fichier expliquant le **pourquoi**.

### Calculs de solde / KPI
- **Toujours calculé dynamiquement** (`SUM(...)`) jamais stocké dans une colonne sauf pour des perfs critiques.
- Solde guide = `total_earned - total_paid - total_pending` (peut être négatif si avance admin).
- `GREATEST(..., 0)` à éviter sur les soldes — on veut voir le négatif.

### Commit on partial DB changes
- Pour les opérations multi-table : `pool.getConnection()` + `beginTransaction()` + `commit()` / `rollback()` dans un try/catch/finally.

---

## 8. Patterns auth / sécurité

### Login admin
- **OTP email obligatoire** pour les admins (6 chiffres, 5 min expiry, 5 tentatives max).
- **Cookie "appareil de confiance" 12h** après OTP réussi → skip OTP sur reconnexion depuis le même navigateur.
- **OTP en DB** (table `admin_otp_tokens`), JAMAIS en mémoire (incompatible serverless).

### Anti-bruteforce
- 5 échecs login → lock 15 min.
- `failed_login_attempts` + `account_locked_until` sur table `users`.

### Anti-scraping (rôle guide)
- `fiches_viewed` cumulé. Au-delà de 15 vues sans aucune submission → auto-suspend pour KYC.
- **Une fois KYC validé une fois → JAMAIS de nouvelle suspension KYC**, peu importe le compteur. Règle absolue.
- Reset `fiches_viewed = 0` à chaque approbation KYC.

---

## 9. Mes projets actifs

| Projet | Stack | Stade | Hébergement |
|--------|-------|-------|-------------|
| **AchatAvis** | React/TS + Express + MySQL | Production | Railway + Vercel |
| **ConvertPageAI** | À définir | Idéation | — |
| **Garde-meuble SaaS** | React/TS + ? | Construction | — |
| **EkoSEO pipeline** | n8n + Claude API + WP | Production | Coolify/Hetzner |
| **A5 Télécom** | WordPress | Live | Coolify |
| **PARIS BARBERS** | WordPress / shop | Acquisition 2026 | — |
| **Clients EkoMedia** : Blondeau / Gauvin / Mistral Déménagement | WordPress + EkoSEO | Live | Hetzner |

---

## 10. Anti-patterns à NE JAMAIS faire

- ❌ Faire un plan formel détaillé pour une tâche simple (fix 1 fichier, modif UI, ajout colonne DB).
- ❌ Déclencher les skills `brainstorming` / `writing-plans` / `executing-plans` / `TDD` en auto sans que ce soit nécessaire.
- ❌ Poser plusieurs questions de cadrage avant d'agir quand la demande est claire.
- ❌ Modifier des fichiers `.env` ou les git config sans demander.
- ❌ Faire un commit sans que je le demande.
- ❌ Ajouter des dépendances "au cas où".
- ❌ Refactorer du code qui marche pendant un fix.
- ❌ Écrire des messages d'erreur en anglais visibles à l'utilisateur final ("Internal server error").
- ❌ Hard-delete sur une table d'historique.
- ❌ SSE / long-running fonctions sur Vercel serverless.
- ❌ Utiliser `Math.max(0, balance)` ou `GREATEST(..., 0)` sur les soldes.
- ❌ Mettre des emojis partout dans le code "pour faire joli".
- ❌ Suggérer "Premium plans" sans qu'on me le demande dans la roadmap.
- ❌ Considérer que la mémoire en RAM persiste entre les invocations Vercel.

---

*Last updated: 2026-04-28*
