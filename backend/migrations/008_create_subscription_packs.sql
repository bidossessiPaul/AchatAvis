CREATE TABLE IF NOT EXISTS subscription_packs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_cents INT NOT NULL,
    quantity INT NOT NULL,
    features JSON NOT NULL,
    color VARCHAR(20) DEFAULT 'standard',
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initial Packs
INSERT INTO subscription_packs (id, name, price_cents, quantity, features, color, is_popular)
VALUES 
('discovery', 'Découverte', 1000, 5, '["5 avis / mois", "IA de génération incluse", "Support standard"]', 'standard', FALSE),
('growth', 'Croissance', 1800, 10, '["10 avis / mois", "IA de génération incluse", "Support prioritaire", "Badge Artisan Fiable"]', 'premium', TRUE),
('expert', 'Expert', 3500, 20, '["20 avis / mois", "IA de génération incluse", "Support dédié", "Badge Expert Certifié"]', 'standard', FALSE)
ON DUPLICATE KEY UPDATE 
name = VALUES(name), 
price_cents = VALUES(price_cents), 
quantity = VALUES(quantity), 
features = VALUES(features), 
color = VALUES(color), 
is_popular = VALUES(is_popular);
