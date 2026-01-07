-- 032_comprehensive_sectors_fix.sql
-- Goal: Provide a clean, comprehensive and consistent list of sectors.

INSERT INTO sector_difficulty (sector_slug, sector_name, difficulty, google_strictness_level, icon_emoji, is_active, max_reviews_per_month_per_email, min_days_between_reviews) 
VALUES
('restaurant', 'Restaurant & Café', 'easy', 2, '��️', TRUE, 5, 2),
('boulangerie', 'Boulangerie & Pâtisserie', 'easy', 2, '🥐', TRUE, 5, 2),
('coiffure', 'Coiffure & Beauté', 'easy', 2, '💇', TRUE, 5, 2),
('fleuriste', 'Fleuriste', 'easy', 2, '💐', TRUE, 5, 2),
('boutique', 'Boutique & Commerce', 'easy', 2, '🛍️', TRUE, 5, 2),
('nettoyage-menage', 'Nettoyage & Ménage', 'easy', 2, '🧹', TRUE, 5, 2),
('jardinage-paysage', 'Jardin & Paysage', 'easy', 2, '🌳', TRUE, 5, 2),
('photographe', 'Photographie', 'easy', 2, '📸', TRUE, 5, 2),
('animalerie', 'Services Animaux', 'easy', 2, '🐾', TRUE, 5, 2),
('loisirs', 'Loisirs & Divertissement', 'easy', 2, '🎾', TRUE, 5, 2),
('automobile', 'Garage & Automobile', 'medium', 3, '🚗', TRUE, 3, 4),
('batiment', 'Bâtiment & Rénovation', 'medium', 3, '🏗️', TRUE, 3, 4),
('electricite', 'Électricité', 'medium', 3, '⚡', TRUE, 3, 4),
('maconnerie', 'Maçonnerie', 'medium', 3, '🧱', TRUE, 3, 4),
('peinture-decoration', 'Peinture & Décoration', 'medium', 3, '��', TRUE, 3, 4),
('menuiserie', 'Menuiserie', 'medium', 3, '🪚', TRUE, 3, 4),
('demenagement', 'Déménagement', 'medium', 3, '📦', TRUE, 3, 4),
('informatique', 'Informatique & Réparation', 'medium', 3, '💻', TRUE, 3, 4),
('immobilier', 'Agence Immobilière', 'medium', 3, '🏠', TRUE, 3, 4),
('vtc', 'Transport & VTC', 'medium', 3, '🚖', TRUE, 3, 4),
('serrurerie', 'Serrurerie (Urgence)', 'hard', 5, '🔑', TRUE, 2, 7),
('plomberie', 'Plomberie & Assainissement', 'hard', 5, '🔧', TRUE, 2, 7),
('toiture-couverture', 'Toiture & Couverture', 'hard', 5, '🏠', TRUE, 2, 7),
('vitrier', 'Vitrerie', 'hard', 5, '🪟', TRUE, 2, 7),
('chauffage-climo', 'Chauffage & Climatisation', 'hard', 5, '🔥', TRUE, 2, 7),
('juridique', 'Services Juridiques', 'hard', 5, '⚖️', TRUE, 1, 15),
('expert-comptable', 'Expert Comptable', 'hard', 5, '📊', TRUE, 1, 15),
('dentiste', 'Dentiste & Santé', 'hard', 5, '🦷', TRUE, 1, 15)
ON DUPLICATE KEY UPDATE 
    sector_name = VALUES(sector_name),
    difficulty = VALUES(difficulty),
    google_strictness_level = VALUES(google_strictness_level),
    icon_emoji = VALUES(icon_emoji),
    max_reviews_per_month_per_email = VALUES(max_reviews_per_month_per_email),
    min_days_between_reviews = VALUES(min_days_between_reviews);
