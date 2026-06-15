-- Formation obligatoire des guides juste après l'inscription :
-- sequence de videos (hebergees sur Cloudinary) puis QCM note cote serveur.
-- Score >= 80% requis pour debloquer l'etape suivante (verification d'identite).
-- Les videos et questions sont en DB pour pouvoir les modifier sans redeploiement.

CREATE TABLE IF NOT EXISTS training_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    video_url VARCHAR(500) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

;

CREATE TABLE IF NOT EXISTS training_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    -- Tableau JSON d'options : [{"id":"A","text":"..."}, ...]
    options JSON NOT NULL,
    correct_option CHAR(1) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

;

CREATE TABLE IF NOT EXISTS training_attempts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    score INT NOT NULL,
    correct_count INT NOT NULL,
    total_questions INT NOT NULL,
    passed TINYINT(1) NOT NULL DEFAULT 0,
    answers JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_training_attempts_user (user_id),
    CONSTRAINT fk_training_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci

;

-- Colonne users.training_score (NULL tant que la formation n'est pas validee)
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'training_score'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN training_score INT DEFAULT NULL',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt

;

-- Colonne users.training_completed_at (date de reussite du QCM >= 80%)
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'training_completed_at'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE users ADD COLUMN training_completed_at DATETIME DEFAULT NULL',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt

;

-- Seed des questions du QCM (uniquement si la table est vide).
-- Contenu repris du module anti-detection existant — modifiable en DB sans redeploiement.
INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Quelle methode de connexion est imperative pour garantir l''anonymat de l''IP ?' AS question,
    '[{"id":"A","text":"WiFi public d''un cafe"},{"id":"B","text":"Connexion 4G/5G mobile personnelle"},{"id":"C","text":"WiFi domestique avec VPN actif"},{"id":"D","text":"Reseau partage d''un hotel"}]' AS options,
    'B' AS correct_option, 1 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Quel comportement "organique" Google privilegie-t-il sur un compte Local Guide ?' AS question,
    '[{"id":"A","text":"Poster uniquement des avis sur des fiches remunerees"},{"id":"B","text":"Avoir une activite diversifiee (YouTube, Maps, recherches reelles)"},{"id":"C","text":"Creer un nouveau compte pour chaque avis poste"},{"id":"D","text":"Ne jamais utiliser les autres services Google"}]' AS options,
    'B' AS correct_option, 2 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 2)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Pour un secteur critique (ex: serrurerie), quel est l''espacement minimal recommande entre deux avis ?' AS question,
    '[{"id":"A","text":"24 heures"},{"id":"B","text":"7 jours"},{"id":"C","text":"15 a 30 jours"},{"id":"D","text":"Aucun delai particulier"}]' AS options,
    'C' AS correct_option, 3 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 3)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Quelle est la limite quotidienne stricte d''avis par compte Gmail pour eviter le flagging ?' AS question,
    '[{"id":"A","text":"1 avis par jour"},{"id":"B","text":"2 avis maximum par jour"},{"id":"C","text":"5 avis par jour"},{"id":"D","text":"10 avis par jour"}]' AS options,
    'B' AS correct_option, 4 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 4)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Concernant le texte de l''avis, quelle pratique est consideree comme un pattern suspect ?' AS question,
    '[{"id":"A","text":"Ecrire un texte de plus de 200 caracteres"},{"id":"B","text":"Copier-coller le meme modele de texte sur plusieurs fiches"},{"id":"C","text":"Utiliser un ton naturel et personnalise"},{"id":"D","text":"Ajouter des details sur l''accueil recu"}]' AS options,
    'B' AS correct_option, 5 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 5)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Quel role joue la geolocalisation GPS dans la validation d''un avis par Google ?' AS question,
    '[{"id":"A","text":"Aucun, seule l''adresse IP compte"},{"id":"B","text":"Elle confirme la presence physique a proximite de l''etablissement"},{"id":"C","text":"Elle sert uniquement pour les publicites locales"},{"id":"D","text":"Elle est desactivee par defaut par Google"}]' AS options,
    'B' AS correct_option, 6 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 6)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Avant de soumettre un avis, quelle interaction avec la fiche Google est recommandee ?' AS question,
    '[{"id":"A","text":"Cliquer directement sur Donner un avis"},{"id":"B","text":"Consulter les photos, lire d''autres avis et simuler un interet reel"},{"id":"C","text":"Signaler les avis negatifs des concurrents"},{"id":"D","text":"Rafraichir la page 50 fois"}]' AS options,
    'B' AS correct_option, 7 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 7)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Un compte Local Guide de haut niveau (niveau 4+) a quel avantage principal ?' AS question,
    '[{"id":"A","text":"Il peut poster des avis sans aucune limite"},{"id":"B","text":"Ses avis ont un poids superieur et sont moins susceptibles d''etre supprimes"},{"id":"C","text":"Il gagne de l''argent directement de Google"},{"id":"D","text":"Il peut supprimer les avis des autres"}]' AS options,
    'B' AS correct_option, 8 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 8)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Quelle est l''importance des metadonnees des photos jointes a un avis ?' AS question,
    '[{"id":"A","text":"Elles n''existent pas sur les fichiers mobiles"},{"id":"B","text":"Elles prouvent le lieu et la date de la prise de vue reelle"},{"id":"C","text":"Elles ralentissent le chargement de la page"},{"id":"D","text":"Elles sont automatiquement supprimees par Google"}]' AS options,
    'B' AS correct_option, 9 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 9)

;

INSERT INTO training_questions (question, options, correct_option, position)
SELECT * FROM (SELECT
    'Que signifie un score de conformite Guide inferieur a 50% ?' AS question,
    '[{"id":"A","text":"Un simple avertissement sans consequence"},{"id":"B","text":"Une suspension probable des fiches et des gains"},{"id":"C","text":"Un bonus de visibilite pour s''ameliorer"},{"id":"D","text":"Une mise a jour automatique vers le niveau suivant"}]' AS options,
    'B' AS correct_option, 10 AS position
) AS seed WHERE NOT EXISTS (SELECT 1 FROM training_questions WHERE position = 10)
