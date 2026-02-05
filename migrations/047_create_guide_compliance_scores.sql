-- Create guide_compliance_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS guide_compliance_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    compliance_score INT DEFAULT 100,
    rules_followed_count INT DEFAULT 0,
    rules_violated_count INT DEFAULT 0,
    violations_log JSON,
    certification_passed BOOLEAN DEFAULT FALSE,
    certification_passed_at DATETIME,
    certification_score INT,
    last_violation_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user (user_id)
);
