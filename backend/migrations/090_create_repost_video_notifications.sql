-- 090 — Trace des emails "nouvelle vidéo à reposter" envoyés aux guides.
-- Pourquoi : quand l'admin lance une campagne (nouvelle vidéo repost), on
-- notifie par email au maximum 100 guides ACTIFS à la fois (dernière connexion
-- < 3 mois + au moins un avis déjà soumis). Cette table garantit qu'un guide
-- ne reçoit jamais deux fois l'email pour la même vidéo : chaque relance
-- envoie aux 100 guides actifs suivants non encore notifiés.

CREATE TABLE IF NOT EXISTS repost_video_notifications (
    id VARCHAR(36) PRIMARY KEY,
    video_id VARCHAR(36) NOT NULL,
    guide_id VARCHAR(36) NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rvn_video_guide (video_id, guide_id),
    INDEX idx_rvn_video (video_id),
    CONSTRAINT fk_rvn_video FOREIGN KEY (video_id) REFERENCES repost_videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_rvn_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
