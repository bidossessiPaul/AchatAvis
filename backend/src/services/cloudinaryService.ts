import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image buffer to Cloudinary
 * @param buffer - Image buffer from multer
 * @param folder - Cloudinary folder name
 * @returns Cloudinary upload result with secure_url
 */
export const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string = 'avatars',
    options?: { resourceType?: 'image' | 'raw' | 'auto'; skipTransform?: boolean }
): Promise<{ secure_url: string; public_id: string }> => {
    const resourceType = options?.resourceType || 'image';
    const skipTransform = options?.skipTransform || resourceType !== 'image';

    return new Promise((resolve, reject) => {
        const uploadOptions: any = {
            folder: `achatavis/${folder}`,
            resource_type: resourceType,
        };
        if (!skipTransform) {
            uploadOptions.transformation = [
                { width: 500, height: 500, crop: 'limit' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ];
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) {
                    console.error('❌ Cloudinary upload error:', error);
                    return reject(error);
                }
                if (!result) {
                    return reject(new Error('No result from Cloudinary'));
                }
                console.log('✅ File uploaded to Cloudinary:', result.secure_url);
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public ID from previous upload
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log('✅ Image deleted from Cloudinary:', publicId);
    } catch (error) {
        console.error('❌ Error deleting from Cloudinary:', error);
    }
};

export default cloudinary;
