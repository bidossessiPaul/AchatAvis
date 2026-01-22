import { transporter, emailConfig } from './config/email';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to test the email transporter and send a test email.
 * Run with: npx tsx src/test-email.ts
 */
async function testEmail() {
    console.log('🔍 Testing Email Configuration...');
    console.log('Provider Config:', {
        EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'NOT SET',
        SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'NOT SET',
        EMAIL_FROM: emailConfig.from
    });

    try {
        console.log('📡 Verifying transporter connection...');
        await transporter.verify();
        console.log('✅ Transporter connection verified!');

        const mailOptions = {
            from: emailConfig.from,
            to: process.env.EMAIL_USER || 'test@example.com', // Send to self or default
            subject: '🧪 Test Email - AchatAvis',
            text: 'Ceci est un email de test pour vérifier le système d\'envoi.',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #ff3b6a;">Test AchatAvis</h1>
                    <p>Le système d'envoi d'emails est <strong>fonctionnel</strong> !</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">Envoyé le : ${new Date().toLocaleString()}</p>
                </div>
            `
        };

        console.log(`📧 Sending test email to ${mailOptions.to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);

        if (info.response) {
            console.log('Response:', info.response);
        }
    } catch (error: any) {
        console.error('❌ Email Test Failed!');
        console.error('Error Details:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response
        });

        if (process.env.EMAIL_PROVIDER === 'sendgrid' && !process.env.SMTP_HOST) {
            console.warn('\n💡 TIP: It seems you are using SendGrid but the transporter is configured for Gmail/SMTP.');
            console.warn('The code in src/config/email.ts might need an update to support SendGrid API or SMTP.');
        }
    }
}

testEmail();
