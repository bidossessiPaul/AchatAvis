import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transport based on available config
const createTransporter = () => {
    // If specific SMTP host is defined, use generic SMTP
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    // Fallback to Gmail service (easier for dev/testing if no custom SMTP)
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
};

export const transporter = createTransporter();

// Verify connection configuration
transporter.verify(function (error) {
    if (error) {
        console.error('❌ Email Service Configuration Error:', error.message);
        // We log but don't crash, as the app might work without email for some features
    } else {
        console.log('✅ Email Service is ready to take messages');
    }
});

export const emailConfig = {
    from: process.env.EMAIL_FROM || `"AchatAvis" <${process.env.EMAIL_USER}>`,
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
};
