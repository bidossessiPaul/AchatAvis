-- Add more sectors to sector_difficulty table

INSERT IGNORE INTO sector_difficulty (sector_slug, sector_name, difficulty, icon_emoji, warning_message, is_active) VALUES
-- Easy Sectors
('boulangerie', 'Boulangerie & Pâtisserie', 'easy', '🥐', NULL, TRUE),
('fleuriste', 'Fleuriste', 'easy', '💐', NULL, TRUE),
('boutique', 'Boutique & Commerce de détail', 'easy', '🛍️', NULL, TRUE),
('nettoyage', 'Nettoyage & Entretien', 'easy', '🧹', NULL, TRUE),
('paysagiste', 'Jardin & Paysagisme', 'easy', '🌳', NULL, TRUE),
('photographe', 'Photographie', 'easy', '📸', NULL, TRUE),
('animalerie', 'Services aux animaux', 'easy', '🐾', NULL, TRUE),

-- Medium Sectors
('batiment', 'Bâtiment & Rénovation', 'medium', '🏗️', 'Surveillance modérée sur la géolocalisation', TRUE),
('electricien', 'Électricien', 'medium', '⚡', 'Vérification de la cohérence géographique', TRUE),
('menuiserie', 'Menuiserie & Agencement', 'medium', '🪚', NULL, TRUE),
('peinture', 'Peinture & Décoration', 'medium', '🎨', NULL, TRUE),
('demenagement', 'Déménagement', 'medium', '📦', NULL, TRUE),
('informatique', 'Informatique & Réparation', 'medium', '💻', NULL, TRUE),
('vtc', 'Transport & VTC', 'medium', '🚖', 'Surveillance des trajets récents', TRUE),

-- Hard Sectors
('serrurier', 'Serrurier (Urgence)', 'hard', '🔑', 'Secteur à haut risque de filtrage. Rythme lent imposé.', TRUE),
('vitrier', 'Vitrier', 'hard', '🪟', 'Attention aux avis en rafale. Modération stricte.', TRUE),
('couvreur', 'Couvreur & Toiture', 'hard', '🏠', 'Secteur surveillé. Privilégiez des avis avec photos.', TRUE),
('assainissement', 'Plomberie & Assainissement', 'hard', '🚿', 'Haut risque. Géolocalisation indispensable.', TRUE);
