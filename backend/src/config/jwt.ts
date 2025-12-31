import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
    accessTokenSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '24h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

export default jwtConfig;
