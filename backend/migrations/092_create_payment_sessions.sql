-- Migration 092 : sessions de paiement des guides
--
-- Pourquoi : jusqu'ici l'admin payait guide par guide via force-pay-guide, sans
-- trace d'ensemble. Impossible de savoir, pour une vague de virements donnée, qui
-- a été payé, qui ne l'a pas été, et surtout pourquoi. Le guide n'avait aucune
-- visibilité sur un paiement qui avait échoué.
--
-- Le flux devient : ouvrir une session -> la liste des guides à payer est figée
-- (snapshot) -> l'admin renseigne ligne par ligne payé / échec + raison -> il
-- ferme la session, ce qui calcule les statistiques définitives. La session
-- fermée devient consultable par l'admin ET par chaque guide concerné.

-- Une session = une vague de paiement datée.
CREATE TABLE IF NOT EXISTS payment_sessions (
    id VARCHAR(36) PRIMARY KEY,
    -- Libellé libre saisi par l'admin, ex: "Paiements février 2026"
    label VARCHAR(150) DEFAULT NULL,
    status ENUM('open', 'closed') NOT NULL DEFAULT 'open',

    opened_by VARCHAR(36) NOT NULL,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_by VARCHAR(36) DEFAULT NULL,
    closed_at DATETIME DEFAULT NULL,

    -- Statistiques figées au moment de la fermeture. Stockées et non recalculées :
    -- les soldes des guides évoluent après coup, le récap d'une vague passée doit
    -- rester tel qu'il était le jour du paiement.
    stats_guides_total INT NOT NULL DEFAULT 0,
    stats_paid_count INT NOT NULL DEFAULT 0,
    stats_failed_count INT NOT NULL DEFAULT 0,
    stats_pending_count INT NOT NULL DEFAULT 0,
    stats_amount_due DECIMAL(12, 2) NOT NULL DEFAULT 0,
    stats_amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,

    admin_note TEXT DEFAULT NULL,
    -- Soft-delete : une session de paiement est de l'historique comptable
    deleted_at DATETIME DEFAULT NULL,

    FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
)
-- Collation forcée : la base a pour défaut utf8mb4_0900_ai_ci alors que users.id
-- est en utf8mb4_unicode_ci. Sans ce COLLATE explicite, MySQL refuse la clé
-- étrangère (erreur 3780, colonnes incompatibles).
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_opened_at ON payment_sessions(opened_at);
CREATE INDEX idx_payment_sessions_deleted_at ON payment_sessions(deleted_at);

-- Une ligne = un guide dans une session. Créée à l'ouverture avec le montant dû
-- figé, complétée au fil des virements.
CREATE TABLE IF NOT EXISTS payment_session_lines (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    guide_id VARCHAR(36) NOT NULL,

    -- Snapshot pris à l'ouverture de la session. On duplique le nom et le moyen de
    -- paiement pour que le récap historique reste lisible même si le guide change
    -- ses coordonnées ou si son compte est supprimé plus tard.
    amount_due DECIMAL(10, 2) NOT NULL DEFAULT 0,
    guide_name_snapshot VARCHAR(200) DEFAULT NULL,
    guide_email_snapshot VARCHAR(200) DEFAULT NULL,
    payout_method_snapshot VARCHAR(40) DEFAULT NULL,

    -- pending  : pas encore traité par l'admin
    -- paid     : payé intégralement
    -- partial  : payé en partie, le reste est reporté (raison obligatoire)
    -- failed   : non payé (raison obligatoire)
    status ENUM('pending', 'paid', 'partial', 'failed') NOT NULL DEFAULT 'pending',
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Clé du référentiel src/constants/paiementRaisons.ts. NULL si payé sans incident.
    failure_reason VARCHAR(40) DEFAULT NULL,
    -- Précision libre, obligatoire côté service quand failure_reason = 'AUTRE'
    failure_note TEXT DEFAULT NULL,

    processed_at DATETIME DEFAULT NULL,
    processed_by VARCHAR(36) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES payment_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    -- Un guide ne peut apparaître qu'une fois dans une session donnée
    UNIQUE KEY uq_session_guide (session_id, guide_id)
)
-- Même contrainte de collation que payment_sessions : les FK pointent vers
-- users.id et payment_sessions.id, tous deux en utf8mb4_unicode_ci.
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_session_lines_session ON payment_session_lines(session_id);
CREATE INDEX idx_session_lines_guide ON payment_session_lines(guide_id);
CREATE INDEX idx_session_lines_status ON payment_session_lines(status);
