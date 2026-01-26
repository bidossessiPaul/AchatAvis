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

// Multer instance
export const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});
