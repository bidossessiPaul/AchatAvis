import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transport based on available config
const createTransporter = () => {
    const isDev = process.env.NODE_ENV === 'development';
    const hasPlaceholderKey = process.env.EMAIL_API_KEY === 'your-email-api-key';
    const hasPlaceholderUser = process.env.EMAIL_USER === 'votre-email@gmail.com';

    // If placeholders are detected in dev, use a mock logger transporter
    if (isDev && (hasPlaceholderKey || hasPlaceholderUser)) {
        console.log('⚠️ Development mode: Using mock email transporter (emails will be logged to console)');
        return {
            sendMail: async (options: any) => {
                console.log('📧 [MOCK EMAIL SENT]');
                console.log(`To: ${options.to}`);
                console.log(`Subject: ${options.subject}`);
                console.log('--- Content (HTML truncated) ---');
                console.log(options.html?.substring(0, 200) + '...');
                console.log('--------------------------------');
                return { messageId: 'mock-id-' + Date.now() };
            },
            verify: (callback: (err: any) => void) => callback(null)
        } as any;
    }

    // If SendGrid is requested
    if (process.env.EMAIL_PROVIDER === 'sendgrid') {
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            auth: {
                user: 'apikey',
                pass: process.env.EMAIL_API_KEY,
            },
        });
    }

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

    // Fallback to Gmail service
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
