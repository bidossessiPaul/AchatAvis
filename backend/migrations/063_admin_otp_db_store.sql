-- Store OTP admin en DB (au lieu de Map en mémoire) pour que ça fonctionne
-- en serverless : sur Vercel, chaque requête peut toucher une instance
-- différente, donc un Map en mémoire perd ses données entre le /login
-- (où on stocke l'OTP) et le /verify-otp (où on le lit).
CREATE TABLE IF NOT EXISTS admin_otp_tokens (
    temp_token VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    token_payload JSON NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_otp_expires (expires_at),
    INDEX idx_admin_otp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
