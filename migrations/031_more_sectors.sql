-- Add more sectors to sector_difficulty
INSERT IGNORE INTO sector_difficulty (sector_name, sector_slug, difficulty, google_strictness_level, icon_emoji) VALUES
('Peinture & Décoration', 'peinture-decoration', 'medium', 3, '🎨'),
('Maçonnerie', 'maconnerie', 'medium', 3, '🧱'),
('Électricité', 'electricite', 'medium', 3, '⚡'),
('Nettoyage & Ménage', 'nettoyage-menage', 'easy', 2, '🧹'),
('Jardinage & Paysage', 'jardinage-paysage', 'easy', 2, '🌳'),
('Informatique', 'informatique', 'easy', 2, '💻'),
('Déménagement', 'demenagement', 'medium', 3, '📦'),
('Toiture & Couverture', 'toiture-couverture', 'hard', 5, '🏠'),
('Chauffage & Climatisation', 'chauffage-climo', 'hard', 5, '🔥'),
('Serrurerie', 'serrurerie', 'hard', 5, '🔑');
