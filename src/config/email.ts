import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'dossoumaxime888@gmail.com',
        pass: process.env.EMAIL_PASS || 'ffzwarbngbsfpleg',
    },
});

export const emailConfig = {
    from: `"AchatAvis" <${process.env.EMAIL_USER || 'dossoumaxime888@gmail.com'}>`,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
