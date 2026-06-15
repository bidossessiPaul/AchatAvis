-- Ajoute screenshot_url sur reviews_submissions.
-- Les guides doivent désormais joindre une capture d'écran de l'avis posté
-- en plus du lien. L'image est stockée sur Cloudinary.
-- Les artisans voient uniquement la capture (pas le lien direct vers leur fiche).

ALTER TABLE reviews_submissions
    ADD COLUMN IF NOT EXISTS screenshot_url TEXT DEFAULT NULL
        AFTER review_url;
