-- Rend attribution_id nullable dans signalement_avis
-- pour permettre les soumissions auto-déclenchées par le pack 499€
-- sans passer par une attribution admin manuelle.

ALTER TABLE signalement_avis
  DROP FOREIGN KEY fk_sav_attribution;

ALTER TABLE signalement_avis
  MODIFY attribution_id VARCHAR(36) NULL DEFAULT NULL;

ALTER TABLE signalement_avis
  ADD CONSTRAINT fk_sav_attribution
  FOREIGN KEY (attribution_id) REFERENCES signalement_attributions(id) ON DELETE SET NULL;
