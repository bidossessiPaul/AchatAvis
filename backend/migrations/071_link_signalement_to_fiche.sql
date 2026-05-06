-- Lie un avis signalement à une fiche artisan (reviews_orders).
-- Optionnel : permet aux guides de voir les signalements dans la page détail de la fiche.

ALTER TABLE signalement_avis
    ADD COLUMN order_id VARCHAR(36) NULL DEFAULT NULL AFTER artisan_id;

ALTER TABLE signalement_avis
    ADD CONSTRAINT fk_signalement_avis_order
        FOREIGN KEY (order_id) REFERENCES reviews_orders(id) ON DELETE SET NULL;

CREATE INDEX idx_signalement_avis_order_id ON signalement_avis(order_id);
