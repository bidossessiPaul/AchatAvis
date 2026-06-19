import { query } from './config/database';

// Migration : création des tables GEO citations
// Permet aux guides de faire des citations/backlinks pour les artisans
// sur des plateformes (annuaires, forums, réseaux sociaux, blogs)
async function migrate() {
    try {
        console.log('--- Migration GEO Citations ---');

        // 1. Table des plateformes (liste master gérée par l'admin)
        await query(`
            CREATE TABLE IF NOT EXISTS geo_platforms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                url VARCHAR(500) NOT NULL,
                category ENUM('annuaire','forum','social','blog') NOT NULL,
                da_score INT DEFAULT 0,
                requires_account TINYINT(1) DEFAULT 1,
                sector_tags JSON DEFAULT NULL,
                country VARCHAR(5) DEFAULT 'FR',
                notes TEXT DEFAULT NULL,
                reward_amount DECIMAL(10,2) DEFAULT 0.15,
                active TINYINT(1) DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Table geo_platforms créée');

        // 2. Table des missions GEO (une mission = un artisan à promouvoir)
        await query(`
            CREATE TABLE IF NOT EXISTS geo_missions (
                id VARCHAR(36) PRIMARY KEY,
                artisan_id VARCHAR(36) NOT NULL,
                fiche_id VARCHAR(36) DEFAULT NULL,
                name VARCHAR(200) NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                city VARCHAR(100) NOT NULL,
                website VARCHAR(500) DEFAULT NULL,
                phone VARCHAR(20) DEFAULT NULL,
                address TEXT DEFAULT NULL,
                description TEXT DEFAULT NULL,
                citation_target INT DEFAULT 30,
                reward_per_submission DECIMAL(10,2) DEFAULT 0.15,
                status ENUM('active','paused','completed') DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL
            )
        `);
        console.log('✓ Table geo_missions créée');

        // 3. Table des soumissions de citations (un guide soumet une URL de preuve)
        await query(`
            CREATE TABLE IF NOT EXISTS geo_submissions (
                id VARCHAR(36) PRIMARY KEY,
                mission_id VARCHAR(36) NOT NULL,
                platform_id INT NOT NULL,
                guide_id VARCHAR(36) NOT NULL,
                submission_url VARCHAR(1000) NOT NULL,
                status ENUM('pending','validated','rejected') DEFAULT 'pending',
                rejection_reason TEXT DEFAULT NULL,
                validated_by VARCHAR(36) DEFAULT NULL,
                validated_at DATETIME DEFAULT NULL,
                earnings DECIMAL(10,2) DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL,
                UNIQUE KEY unique_guide_platform_mission (guide_id, platform_id, mission_id)
            )
        `);
        console.log('✓ Table geo_submissions créée');

        // 4. Seed de la liste des plateformes initiales
        const existing: any = await query('SELECT COUNT(*) as cnt FROM geo_platforms');
        if (existing[0]?.cnt === 0) {
            await query(`
                INSERT INTO geo_platforms (name, url, category, da_score, requires_account, sector_tags, notes) VALUES
                -- ANNUAIRES
                ('Pages Jaunes', 'https://www.pagesjaunes.fr', 'annuaire', 90, 1, '["all"]', 'Créer fiche entreprise complète'),
                ('Yelp France', 'https://www.yelp.fr', 'annuaire', 88, 1, '["all"]', 'Créer profil entreprise'),
                ('Trustpilot', 'https://fr.trustpilot.com', 'annuaire', 92, 1, '["all"]', 'Créer profil et inviter avis'),
                ('Avis Vérifiés', 'https://www.avis-verifies.com', 'annuaire', 70, 1, '["all"]', 'Inscription annuaire'),
                ('Hoodspot', 'https://hoodspot.fr', 'annuaire', 55, 1, '["all"]', 'Annuaire local par quartier'),
                ('Kompass', 'https://fr.kompass.com', 'annuaire', 75, 1, '["all"]', 'Annuaire B2B'),
                ('Societe.com', 'https://www.societe.com', 'annuaire', 72, 0, '["all"]', 'Fiche auto-générée, possible enrichissement'),
                ('Cylex', 'https://www.cylex.fr', 'annuaire', 60, 1, '["all"]', 'Annuaire pro gratuit'),
                ('Hotfrog', 'https://www.hotfrog.fr', 'annuaire', 58, 1, '["all"]', 'Annuaire PME'),
                ('Europages', 'https://www.europages.fr', 'annuaire', 65, 1, '["all"]', 'Annuaire B2B européen'),
                ('Foursquare', 'https://foursquare.com', 'annuaire', 82, 1, '["all"]', 'Check-in et fiche lieu'),
                ('Waze', 'https://www.waze.com/fr/business', 'annuaire', 80, 1, '["all"]', 'Signaler le lieu'),
                ('Mappy', 'https://www.mappy.com', 'annuaire', 72, 1, '["all"]', 'Ajout fiche pro'),
                ('PagesJaunes Pro', 'https://pro.pagesjaunes.fr', 'annuaire', 90, 1, '["all"]', 'Espace professionnel'),
                ('Annuaire-inverse.net', 'https://www.annuaire-inverse.net', 'annuaire', 45, 1, '["all"]', 'Annuaire téléphonique'),
                ('Annuaire.com', 'https://www.annuaire.com', 'annuaire', 50, 1, '["all"]', 'Annuaire généraliste'),
                ('Travaux.com', 'https://www.travaux.com', 'annuaire', 65, 1, '["batiment","serrurerie","demenagement"]', 'Annuaire artisans BTP'),
                ('Houzz France', 'https://www.houzz.fr', 'annuaire', 78, 1, '["batiment","decoration"]', 'Annuaire pros maison'),
                ('Habitatpresto', 'https://www.habitatpresto.com', 'annuaire', 60, 1, '["batiment","serrurerie"]', 'Devis artisans'),
                ('Checkatrade FR', 'https://www.trouverunartisan.fr', 'annuaire', 48, 1, '["batiment","serrurerie"]', 'Annuaire artisans'),
                -- FORUMS
                ('ForumConstruire', 'https://www.forumconstruire.com', 'forum', 65, 1, '["batiment","serrurerie","demenagement"]', 'Forum construction/maison'),
                ('Forum Serrurerie', 'https://forum.serrurerie.info', 'forum', 40, 1, '["serrurerie"]', 'Forum dédié serrurerie — très ciblé'),
                ('Forum Sécurités', 'https://www.forum-securites.com', 'forum', 38, 1, '["serrurerie"]', 'Forum sécurité habitat'),
                ('Bricovideo Forum', 'https://www.bricovideo.com/forum', 'forum', 52, 1, '["batiment","serrurerie"]', 'Forum bricolage/maison'),
                ('Entraide Bricolage', 'https://www.entraide-bricolage.fr', 'forum', 48, 1, '["batiment","serrurerie"]', 'Communauté bricoleurs'),
                ('Forum Bricolage', 'https://www.forum-bricolage.com', 'forum', 45, 1, '["batiment","serrurerie"]', 'Forum bricolage général'),
                ('Que Choisir Forum', 'https://forum.quechoisir.org', 'forum', 72, 1, '["all"]', 'Forum consommateurs UFC'),
                ('Comment Ca Marche', 'https://forums.commentcamarche.net', 'forum', 80, 1, '["all"]', 'Forum tech + pratique'),
                ('ForumImmobilier', 'https://www.forum-immobilier.fr', 'forum', 55, 1, '["demenagement","immobilier"]', 'Forum immobilier/déménagement'),
                ('Bulle Immobilière', 'https://www.bulle-immobiliere.org', 'forum', 50, 1, '["demenagement","immobilier"]', 'Forum immobilier'),
                ('Forum Expatrié', 'https://www.expat.com/forum/vivre/france', 'forum', 68, 1, '["demenagement"]', 'Forum expatriés cherchant déménageurs'),
                ('Survive France', 'https://www.survivefrance.com', 'forum', 45, 1, '["demenagement"]', 'Forum expats anglophones en France'),
                ('Forum Logement', 'https://www.forum-logement.fr', 'forum', 42, 1, '["demenagement","immobilier"]', 'Forum logement/déménagement'),
                ('Copropriété Online', 'https://www.copropriete-online.com/forum', 'forum', 48, 1, '["serrurerie","batiment"]', 'Forum syndic/copropriété'),
                ('Reddit r/france', 'https://www.reddit.com/r/france', 'forum', 95, 1, '["all"]', 'Très cité par les LLMs — recommandations authentiques'),
                ('Reddit r/paris', 'https://www.reddit.com/r/paris', 'forum', 95, 1, '["all","demenagement","serrurerie"]', 'Communauté Paris — très cité ChatGPT'),
                ('Reddit r/Lyon', 'https://www.reddit.com/r/Lyon', 'forum', 90, 1, '["all"]', 'Communauté Lyon'),
                ('Reddit r/Marseille', 'https://www.reddit.com/r/Marseille', 'forum', 88, 1, '["all"]', 'Communauté Marseille'),
                ('Reddit r/ImmobilierFR', 'https://www.reddit.com/r/ImmobilierFR', 'forum', 85, 1, '["demenagement","immobilier"]', 'Immobilier FR sur Reddit'),
                -- RÉSEAUX SOCIAUX
                ('Quora France', 'https://fr.quora.com', 'social', 92, 1, '["all"]', 'Q&A très cité par les LLMs — répondre aux questions métier'),
                ('LinkedIn', 'https://www.linkedin.com', 'social', 98, 1, '["all"]', 'Page entreprise + posts'),
                ('Facebook Groupes', 'https://www.facebook.com/groups', 'social', 95, 1, '["all"]', 'Groupes locaux/de quartier — recommandations'),
                ('Nextdoor', 'https://nextdoor.fr', 'social', 70, 1, '["all","serrurerie","demenagement"]', 'Réseau de voisinage — recommandations locales'),
                ('Instagram Business', 'https://www.instagram.com', 'social', 95, 1, '["all"]', 'Profil entreprise + mentions locales'),
                ('Twitter/X', 'https://twitter.com', 'social', 98, 1, '["all"]', 'Mentions marque + interactions'),
                ('TikTok Business', 'https://www.tiktok.com/business', 'social', 90, 1, '["all"]', 'Contenu court + hashtag local'),
                ('Pinterest', 'https://www.pinterest.fr', 'social', 85, 1, '["batiment","decoration"]', 'Épingles projets réalisations'),
                ('YouTube', 'https://www.youtube.com', 'social', 99, 1, '["all"]', 'Chaîne + description NAP'),
                ('Google Business Profile', 'https://business.google.com', 'annuaire', 100, 1, '["all"]', 'PRIORITÉ ABSOLUE — fiche Google Maps complète'),
                -- BLOGS
                ('Seloger Édito', 'https://edito.seloger.com', 'blog', 78, 1, '["demenagement","immobilier"]', 'Blog immobilier — commentaires ouverts'),
                ('Leboncoin Blog', 'https://blog.leboncoin.fr', 'blog', 75, 1, '["demenagement"]', 'Blog pratique déménagement'),
                ('MySweetImmo', 'https://www.mysweetimmo.com', 'blog', 62, 1, '["demenagement","immobilier"]', 'Blog immobilier/déménagement'),
                ('Blog Travaux', 'https://blog.travaux.com', 'blog', 58, 1, '["batiment","serrurerie"]', 'Blog artisans/travaux'),
                ('Medium FR', 'https://medium.com', 'blog', 95, 1, '["all"]', 'Articles de fond — bonne citabilité LLM'),
                ('Substack', 'https://substack.com', 'blog', 88, 1, '["all"]', 'Newsletter/articles — citabilité LLM'),
                ('Tumblr', 'https://www.tumblr.com', 'blog', 80, 1, '["all"]', 'Posts avec backlinks'),
                ('Blogspot', 'https://www.blogger.com', 'blog', 85, 1, '["all"]', 'Blog gratuit Google — indexation rapide'),
                ('WordPress.com', 'https://wordpress.com', 'blog', 92, 1, '["all"]', 'Blog gratuit — DA élevé'),
                ('Wix Blog', 'https://www.wix.com', 'blog', 90, 1, '["all"]', 'Site + blog gratuit')
            `);
            console.log('✓ 60 plateformes initiales insérées');
        } else {
            console.log('⚠ Plateformes déjà présentes, skip seed');
        }

        console.log('\n✅ Migration GEO Citations terminée');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration échouée:', error.message);
        process.exit(1);
    }
}

migrate();
