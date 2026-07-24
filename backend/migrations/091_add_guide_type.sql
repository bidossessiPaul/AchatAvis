-- Classe les guides locaux en deux groupes, choisi par l'admin lors de la
-- validation de la pièce d'identité :
--   'africa' = guide africain -> accès complet (comportement historique)
--   'europe' = guide français / Europe -> restreint à la SEULE fonctionnalité Repost vidéo
--
-- NULL = guides déjà validés avant cette feature. Traités partout comme 'africa'
-- (accès complet) : on ne restreint JAMAIS un guide tant qu'il n'est pas
-- explicitement classé 'europe'. Aucun guide existant ne perd donc l'accès.
--
-- Colonne posée sur `users` (et non guides_profiles) car le middleware d'auth
-- lit déjà cette table dans le hot-path pour vérifier le statut : l'enforcement
-- du groupe se fait ainsi sans JOIN ni requête supplémentaire.
ALTER TABLE users ADD COLUMN guide_type VARCHAR(20) DEFAULT NULL;
CREATE INDEX idx_users_guide_type ON users (guide_type);
