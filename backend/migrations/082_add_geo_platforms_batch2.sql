-- Migration 082 : ajout batch 2 de plateformes GEO
-- Classées en blog, forum, social, annuaire

INSERT IGNORE INTO geo_platforms (name, url, category, da_score, requires_account, sector_tags, country, notes) VALUES

-- ANNUAIRES / DIRECTORIES
('Storeboard', 'https://storeboard.com', 'annuaire', 42, 1, '["all"]', 'EN', 'Réseau social B2B / annuaire entreprises'),
('ProvenExpert', 'https://www.provenexpert.com', 'annuaire', 55, 1, '["all"]', 'DE', 'Plateforme avis certifiés — crédibilité forte'),
('Brownbook', 'https://www.brownbook.net', 'annuaire', 50, 1, '["all"]', 'EN', 'Annuaire local international'),
('APSense', 'https://www.apsense.com', 'annuaire', 48, 1, '["all"]', 'EN', 'Réseau social business / annuaire PME'),
('Zumvu', 'https://zumvu.com', 'annuaire', 40, 1, '["all"]', 'EN', 'Annuaire business et promotions'),
('Hotfrog', 'https://www.hotfrog.com', 'annuaire', 58, 1, '["all"]', 'EN', 'Annuaire PME international (version .com)'),
('Submission Web Directory', 'https://submissionwebdirectory.com', 'annuaire', 30, 1, '["all"]', 'EN', 'Annuaire web généraliste'),
('Promote Business Directory', 'https://promotebusinessdirectory.com', 'annuaire', 28, 1, '["all"]', 'EN', 'Annuaire soumission entreprises'),
('Dosula', 'https://www.dosula.com', 'annuaire', 32, 1, '["all"]', 'EN', 'Annuaire web soumission gratuite'),
('Superlist', 'https://superlist.us', 'annuaire', 28, 1, '["all"]', 'EN', 'Annuaire liens web gratuit'),
('40 Milliards', 'https://40milliards.com', 'annuaire', 38, 1, '["all"]', 'FR', 'Annuaire web français — soumission gratuite'),

-- FORUMS / COMMUNAUTÉS
('Disqus', 'https://disqus.com', 'forum', 92, 1, '["all"]', 'EN', 'Système de commentaires — profil public indexé'),
('In The Ring', 'https://inthering.org', 'forum', 30, 0, '["all"]', 'EN', 'Forum communautaire niche'),
('Pantip', 'https://pantip.com', 'forum', 72, 1, '["all"]', 'TH', 'Grand forum thaïlandais — backlink international'),
('HackerEarth', 'https://hackerearth.com', 'forum', 70, 1, '["all"]', 'EN', 'Communauté développeurs — profil public'),
('Dreevoo', 'https://dreevoo.com', 'forum', 38, 1, '["all"]', 'EN', 'Réseau apprentissage / Q&A communautaire'),
('Ques Noir & Blanc', 'https://ques.noirandblanco.com', 'forum', 25, 1, '["all"]', 'EN', 'Plateforme Q&A — backlink profil'),

-- RÉSEAUX SOCIAUX / PARTAGE
('Flickr', 'https://www.flickr.com', 'social', 90, 1, '["all"]', 'EN', 'Partage photos — profil avec backlinks'),
('pBase', 'https://www.pbase.com', 'social', 65, 1, '["all"]', 'EN', 'Galerie photos — profil indexé'),
('ReverbNation', 'https://reverbnation.com', 'social', 72, 1, '["musique","all"]', 'EN', 'Réseau social musiciens — profil public'),
('Redbubble', 'https://redbubble.com', 'social', 82, 1, '["all"]', 'EN', 'Marketplace créatif — bio avec lien'),
('Parler', 'https://parler.com', 'social', 60, 1, '["all"]', 'EN', 'Réseau social alternatif — profil public'),
('Morguefile', 'https://morguefile.com', 'social', 58, 1, '["all"]', 'EN', 'Banque photos gratuite — profil utilisateur'),
('500px', 'https://500px.com', 'social', 82, 1, '["all"]', 'EN', 'Réseau photos professionnel — bio avec lien'),
('Zazzle', 'https://zazzle.com', 'social', 75, 1, '["all"]', 'EN', 'Marketplace créatif — page boutique'),
('Giphy', 'https://giphy.com', 'social', 88, 1, '["all"]', 'EN', 'Partage GIFs — chaîne marque indexée'),
('Coub', 'https://coub.com', 'social', 60, 1, '["all"]', 'EN', 'Partage vidéos courtes — profil public'),
('Videa', 'https://videa.hu', 'social', 65, 1, '["all"]', 'HU', 'Plateforme vidéo hongroise — backlink international'),
('Anobii', 'https://anobii.com', 'social', 55, 1, '["all"]', 'IT', 'Réseau social livres — profil avec liens'),
('JetPhotos', 'https://jetphotos.com', 'social', 58, 1, '["all"]', 'EN', 'Communauté photos aviation — profil indexé'),
('Huzzaz', 'https://huzzaz.com', 'social', 45, 1, '["all"]', 'EN', 'Curation vidéos — profil et collections'),
('Project Noah', 'https://projectnoah.org', 'social', 62, 1, '["all"]', 'EN', 'Communauté nature/biodiversité — profil public'),

-- BLOGS / PUBLICATION
('SeoMotionZ', 'http://seomotionz.com', 'blog', 35, 1, '["all"]', 'EN', 'Blog SEO — commentaires ouverts'),
('HeadwayApp', 'https://headwayapp.co', 'blog', 55, 1, '["all"]', 'EN', 'Changelogs publics — page entreprise'),
('Evernote', 'https://evernote.com', 'blog', 88, 1, '["all"]', 'EN', 'Notes publiables — indexation publique possible'),
('Files.fm', 'https://files.fm', 'blog', 55, 1, '["all"]', 'EN', 'Partage fichiers publics — profil indexé'),
('Dreamwidth', 'https://www.dreamwidth.org', 'blog', 72, 1, '["all"]', 'EN', 'Plateforme blog/journal — posts indexés'),
('Edocr', 'https://www.edocr.com', 'blog', 55, 1, '["all"]', 'EN', 'Partage documents — profil et publications'),
('Triberr', 'https://triberr.com', 'blog', 58, 1, '["all"]', 'EN', 'Amplification blog — profil avec lien'),
('Noti.st', 'https://noti.st', 'blog', 50, 1, '["all"]', 'EN', 'Partage présentations — profil et slides indexés'),
('Netu AI', 'https://www.netu.ai', 'blog', 30, 1, '["all"]', 'EN', 'Plateforme IA — profil/publication'),
('ScreenSkills', 'https://screenskills.com', 'blog', 52, 1, '["all"]', 'EN', 'Formations en ligne — profil public'),
('Start.me', 'https://start.me', 'blog', 60, 1, '["all"]', 'EN', 'Pages de démarrage partagées — backlinks'),
('Films for Action', 'https://filmsforaction.org', 'blog', 65, 1, '["all"]', 'EN', 'Blog/média social activism — contributions indexées'),
('NXP', 'https://www.nxp.com', 'blog', 80, 0, '["all"]', 'EN', 'Site tech/semi-conducteurs — profil communauté'),
('Aprelium', 'https://aprelium.com', 'blog', 45, 1, '["all"]', 'EN', 'Forum/blog tech — profil utilisateur'),
('Crokes', 'https://www.crokes.com', 'blog', 30, 1, '["all"]', 'EN', 'Réseau blog/publication — profil public'),
('SoMuch', 'https://somuch.com', 'blog', 42, 1, '["all"]', 'EN', 'Soumission articles/liens — annuaire blog'),
('Wikidot', 'https://www.wikidot.com', 'blog', 78, 1, '["all"]', 'EN', 'Hébergement wikis gratuits — pages indexées')
;
