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

-- Initial Packs (valeurs de production)
INSERT INTO subscription_packs (id, name, price_cents, quantity, features, color, is_popular)
VALUES
('discovery', 'STARTER', 23500, 30, '["30 avis authentiques/mois minimum","Réponse automatique à tous les avis","SEO local avec mots-clés ciblés","Rapports mensuels de performance","Support client prioritaire","Collecte automatique QR Code"]', 'standard', FALSE),
('growth', 'PROFESSIONNEL', 29900, 60, '["60 avis authentiques/mois minimum","Réponse IA personnalisée à tous les avis","SEO local avancé + stratégie mots-clés","Audit fiche GMB + calculateur d''impact","Rapports détaillés + analytics temps réel","Support dédié + consultant attitré","Amélioration 1 avis négatif/mois"]', 'premium', TRUE),
('expert', 'ENTREPRISE', 49900, 90, '["90 avis authentiques/mois minimum","Gestion complète multi-canaux","Création/optimisation fiches GMB","SEO local premium + images optimisées","Dashboard analytics temps réel","Account Manager dédié 24/7","Amélioration avis négatifs illimitée","Intégration CRM et outils métiers"]', 'standard', FALSE)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
price_cents = VALUES(price_cents),
quantity = VALUES(quantity),
features = VALUES(features),
color = VALUES(color),
is_popular = VALUES(is_popular);
