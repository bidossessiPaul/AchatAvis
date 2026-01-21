-- Seed Anti-Detection Rules with correct schema
INSERT INTO anti_detection_rules (rule_key, rule_name, description_long, icon_emoji, order_index, examples_do, tips) VALUES
('gmail_reel', 'Compte Gmail Réel', 'Utilisez un compte que vous utilisez vraiment. Un compte créé juste pour les avis sera vite banni.', '', 1, '["Utilisez un compte avec des emails reçus, des recherches Google..."]', '["Évitez les noms de profils fantaisistes (ex: \"Avis 123\")."]'),
('natural_navigation', 'Navigation Naturelle', 'Avant de poster, naviguez 2-3 minutes sur la fiche Google (Photos, horaires, avis...).', '', 2, '["Renseignez-vous sur le commerce avant de noter"]', '["Passez 2-3 minutes sur la fiche avant de cliquer sur \"Donner un avis\""]'),
('gps_active', 'Géolocalisation Active', 'Activez toujours le GPS. Google détecte si vous postez un avis sur un lieu où vous n''êtes jamais allé.', '', 3, '["Ouvrez Google Maps sur place ou peu après votre visite."]', '["Laissez Maps ouvert quelques minutes pour que le passage soit enregistré."]'),
('mobile_data_only', '4G/5G Obligatoire', 'Utilisez toujours votre connexion mobile (4G/5G). Jamais de WiFi public ou VPN.', '', 4, '["Désactivez votre WiFi personnel ou public"]', '["La 4G est bien plus fiable car l''IP change souvent de manière légitime."]'),
('texte_unique', 'Texte Unique & Naturel', 'N''utilisez jamais le même texte. Évitez les copier-coller brutaux.', '', 5, '["Utilisez vos propres mots même si on vous donne un modèle."]', '["Ajoutez une anecdote personnelle ou un détail sur l''accueil."]'),
('photos_reelles', 'Photos Authentiques', 'Un avis avec photo est 10x plus crédible et moins détectable.', '', 6, '["Prenez une photo de la façade ou du produit (si possible)."]', '["Ne récupérez pas d''images sur Internet, Google le voit."]'),
('rythme_naturel', 'Rythme Naturel', 'Ne postez pas 10 avis d''un coup. Espacez vos contributions.', '', 7, '["Pas plus de 2 avis par jour maximum."]', '["Variez les horaires et les jours de la semaine."]'),
('diversite_lieux', 'Diversité des Lieux', 'Ne postez pas uniquement des avis payés. Postez aussi sur votre boulangerie ou parc local.', '', 8, '["Postez au moins 2-3 avis \"gratuits\" pour chaque avis \"fiche\"."]', '["Cela dilue vos activités commerciales dans un comportement normal."]'),
('patience_post_visite', 'Patience Post-Visite', 'Ne postez jamais immédiatement après avoir ouvert Maps. Attendez au moins 1h.', '', 9, '["Attendez d''être rentré chez vous ou d''être à l''étape suivante"]', '["Google suspecte les avis postés trop rapidement après une arrivée sur site"]'),
('guide_level', 'Vérification du Profil', 'Votre score Local Guide doit progresser.', '', 10, '["Atteignez le niveau 4+ sur Google pour plus d''impact."]', '["Complétez votre profil (photo, ville, centres d''interest)."]'),
('interaction', 'Interaction Post-Avis', 'Répondez aux questions ou liker les réponses des propriétaires.', '', 11, '["Si le propriétaire répond, mettez un \"J''aime\" sur sa réponse."]', '["Montrez que vous êtes un utilisateur actif et non un robot."]')
ON DUPLICATE KEY UPDATE 
    rule_name = VALUES(rule_name),
    description_long = VALUES(description_long),
    icon_emoji = VALUES(icon_emoji),
    order_index = VALUES(order_index),
    examples_do = VALUES(examples_do),
    tips = VALUES(tips);

-- Seed Sector Difficulty
INSERT INTO sector_difficulty (sector_name, sector_slug, difficulty, required_gmail_level, min_days_between_reviews, max_reviews_per_month_per_email, icon_emoji) VALUES
('Restauration & Cafés', 'restauration', 'easy', 'nouveau', 3, 5, ''),
('Beauté & Bien-être', 'beaute', 'easy', 'nouveau', 5, 3, ''),
('Agences Immobilières', 'immobilier', 'medium', 'bronze', 7, 2, ''),
('Santé & Médical', 'medical', 'hard', 'silver', 15, 1, ''),
('Dépannage & Serrurerie', 'depannage', 'hard', 'gold', 30, 1, ''),
('Hôtels & Voyage', 'voyage', 'medium', 'bronze', 7, 2, '')
ON DUPLICATE KEY UPDATE 
    sector_name = VALUES(sector_name),
    difficulty = VALUES(difficulty),
    required_gmail_level = VALUES(required_gmail_level),
    min_days_between_reviews = VALUES(min_days_between_reviews),
    max_reviews_per_month_per_email = VALUES(max_reviews_per_month_per_email),
    icon_emoji = VALUES(icon_emoji);
