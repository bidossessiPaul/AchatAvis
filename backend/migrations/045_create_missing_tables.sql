-- Create sector_difficulty table if it doesn't exist
CREATE TABLE IF NOT EXISTS sector_difficulty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL,
    sector_slug VARCHAR(100) NOT NULL UNIQUE,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    icon_emoji VARCHAR(50),
    validation_rate_avg DECIMAL(5, 2) DEFAULT 80.00,
    required_gmail_level VARCHAR(50) DEFAULT 'standard',
    warning_message TEXT,
    google_strictness_level VARCHAR(50) DEFAULT 'normal',
    max_reviews_per_month_per_email INT DEFAULT 2,
    min_days_between_reviews INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create anti_detection_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS anti_detection_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_key VARCHAR(100) NOT NULL UNIQUE,
    rule_name VARCHAR(255) NOT NULL,
    description_short TEXT NOT NULL,
    description_long TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    icon_emoji VARCHAR(50),
    impact_stats JSON,
    examples_do JSON,
    examples_dont JSON,
    tips JSON,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default Anti-Detection Rules if table is empty
INSERT IGNORE INTO anti_detection_rules (rule_key, rule_name, description_short, description_long, severity, icon_emoji, order_index, impact_stats, examples_do, examples_dont, tips) VALUES
('device_fingerprint', 'Variation des Empreintes', 'Ne jamais utiliser deux fois la même empreinte numérique.', 'Google détecte les motifs répétitifs dans les configurations navigateur et appareil.', 'critical', '💻', 1, '{"risk_reduction": "95%", "success_rate": "Very High"}', '["Utiliser des User-Agents différents", "Varier les résolutions d''écran"]', '["Toujours le même navigateur", "Même version OS"]', '["Utilisez des profils anti-détection"]'),
('ip_rotation', 'Rotation IP Résidentielle', 'Utiliser uniquement des IPs résidentielles françaises de haute qualité.', 'Les IPs de data centers sont immédiatement flaguées par Google.', 'critical', '🌐', 2, '{"risk_reduction": "90%", "success_rate": "High"}', '["IP mobile 4G/5G", "IP résidentielle FAI classique"]', '["VPN gratuit", "Proxy datacenter"]', '["Vérifiez le score de fraude IP"]'),
('behavior_mimic', 'Comportement Humain', 'Simuler une navigation naturelle avant de poster.', 'Un humain ne va pas directement sur l''URL de dépôt d''avis.', 'high', 'mouse', 3, '{"risk_reduction": "80%", "success_rate": "High"}', '["Scroller", "Lire d''autres avis", "Visiter le site web"]', '["Lien direct dépôt", "Copier-coller immédiat"]', '["Restez au moins 2 minutes sur la page"]');

-- Insert default Sectors if table is empty (Recovering from potential missing migrations)
INSERT IGNORE INTO sector_difficulty (sector_name, sector_slug, difficulty, min_days_between_reviews) VALUES
('Restaurant', 'restaurant', 'easy', 7),
('Serrurier', 'locksmith', 'hard', 30),
('Plombier', 'plumber', 'hard', 30),
('Coiffeur', 'hairdresser', 'easy', 10),
('Immobilier', 'real_estate', 'medium', 20);
