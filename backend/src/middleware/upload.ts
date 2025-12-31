import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        cb(null, path.join(__dirname, '../../public/uploads/avatars'));
    },
    filename: (_req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

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
