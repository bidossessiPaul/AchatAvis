import multer from 'multer';

// Use memory storage since we're uploading to Cloudinary
const storage = multer.memoryStorage();

// File filter
const fileFilter = (_req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG ou WEBP.'), false);
    }
};

// Multer instance for avatars
export const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Multer instance for screenshots (level verifications)
export const uploadScreenshot = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Multer instance for identity documents (allows images, stricter size limit)
const identityFileFilter = (_req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format non supporté. Utilisez JPG, PNG ou WEBP.'), false);
    }
};

export const uploadIdentityDocument = multer({
    storage,
    fileFilter: identityFileFilter,
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB
    }
});
