-- Migration 053: Add pause/resume capability for fiches
-- Allows artisans to temporarily pause their fiche publication

ALTER TABLE reviews_orders
  ADD COLUMN paused_at DATETIME NULL DEFAULT NULL,
  ADD COLUMN status_before_pause VARCHAR(20) NULL DEFAULT NULL;
