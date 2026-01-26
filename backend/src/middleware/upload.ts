import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        // Use process.cwd() for more reliable path resolution in different environments
        const rootDir = process.cwd();
        const uploadPath = path.join(rootDir, 'backend', 'public', 'uploads', 'avatars');

        // Fallback for environments where 'backend' folder might not be present in the path (e.g. some CI/CD or specific Vercel configs)
        const fallbackPath = path.join(rootDir, 'public', 'uploads', 'avatars');

        let finalPath = uploadPath;
        if (!fs.existsSync(path.join(rootDir, 'backend')) && fs.existsSync(path.join(rootDir, 'public'))) {
            finalPath = fallbackPath;
        }

        try {
            if (!fs.existsSync(finalPath)) {
                fs.mkdirSync(finalPath, { recursive: true });
                console.log(`📁 Created missing upload directory: ${finalPath}`);
            }
            cb(null, finalPath);
        } catch (err: any) {
            console.error(`❌ Failed to create upload directory: ${err.message}`);
            // Fallback to /tmp in extremely restrictive environments (like Vercel)
            // Note: This won't be persistent, but will avoid the 500 error
            const tmpPath = '/tmp';
            cb(null, tmpPath);
        }
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
