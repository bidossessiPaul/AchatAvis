import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure storage
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        // Use multiple strategies to find the public/uploads directory
        const strategies = [
            path.join(__dirname, '..', 'public', 'uploads', 'avatars'),
            path.join(process.cwd(), 'backend', 'public', 'uploads', 'avatars'),
            path.join(process.cwd(), 'public', 'uploads', 'avatars'),
        ];

        let finalPath = strategies[0];
        // Find the first strategy that points to an existing 'public' or 'backend' parent, 
        // or just use the first one and create it.
        for (const p of strategies) {
            const parent = path.dirname(path.dirname(p));
            if (fs.existsSync(parent)) {
                finalPath = p;
                break;
            }
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
