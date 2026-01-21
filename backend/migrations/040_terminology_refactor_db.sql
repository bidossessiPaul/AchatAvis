-- Refactor terminology in database to match code changes
-- mission -> fiche
-- subfiche -> submission
-- perfiche -> permission

-- 1. Rename tables (Procedural check)
DELIMITER //
CREATE PROCEDURE RefactorTables()
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews_subfiches') THEN
        RENAME TABLE reviews_subfiches TO reviews_submissions;
    END IF;
END //
DELIMITER ;
CALL RefactorTables();
DROP PROCEDURE RefactorTables;

-- 2. Rename columns
DELIMITER //
CREATE PROCEDURE RefactorColumns()
BEGIN
    -- users.perfiches -> permissions
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'perfiches') THEN
        ALTER TABLE users CHANGE COLUMN perfiches permissions JSON DEFAULT NULL;
    END IF;

    -- admins_profiles.perfiches -> permissions
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admins_profiles' AND COLUMN_NAME = 'perfiches') THEN
        ALTER TABLE admins_profiles CHANGE COLUMN perfiches permissions JSON DEFAULT NULL;
    END IF;

    -- reviews_orders.mission_name -> fiche_name
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews_orders' AND COLUMN_NAME = 'mission_name') THEN
        ALTER TABLE reviews_orders CHANGE COLUMN mission_name fiche_name VARCHAR(255);
    END IF;

    -- artisans_profiles.missions_allowed -> fiches_allowed
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'artisans_profiles' AND COLUMN_NAME = 'missions_allowed') THEN
        ALTER TABLE artisans_profiles CHANGE COLUMN missions_allowed fiches_allowed INT DEFAULT 0;
    END IF;

    -- payments.missions_quota -> fiches_quota
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'missions_quota') THEN
        ALTER TABLE payments CHANGE COLUMN missions_quota fiches_quota INT DEFAULT 0;
    END IF;

    -- payments.missions_used -> fiches_used
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'missions_used') THEN
        ALTER TABLE payments CHANGE COLUMN missions_used fiches_used INT DEFAULT 0;
    END IF;
END //
DELIMITER ;

CALL RefactorColumns();
DROP PROCEDURE RefactorColumns;


