import { transporter, emailConfig } from '../config/email';

/**
 * Simple parser for User-Agent to extract browser and device
 */
export const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: 'Inconnu', device: 'Inconnu' };

    let browser = 'Inconnu';
    let device = 'Inconnu';

    // Basic Browser Detection
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Microsoft Edge';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';

    // Basic Device/OS Detection
    if (ua.includes('iPhone')) device = 'iPhone';
    else if (ua.includes('iPad')) device = 'iPad';
    else if (ua.includes('Android')) device = 'Android';
    else if (ua.includes('Windows')) device = 'Windows';
    else if (ua.includes('Macintosh')) device = 'Mac (OSX)';
    else if (ua.includes('Linux')) device = 'Linux';

    return { browser, device };
};

/**
 * Send password reset email
 */
export const sendResetPasswordEmail = async (email: string, token: string, baseUrl?: string) => {
    const frontendUrl = baseUrl || emailConfig.frontendUrl;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: '🔐 Réinitialisation de votre mot de passe - AchatAvis',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 32px; text-align: center; }
                    .logo span { color: #FF991F; }
                    .title { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 16px; text-align: center; text-transform: uppercase; letter-spacing: -0.025em; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #FF991F; color: #ffffff !important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #6b7280; }
                    .link-alt { font-size: 11px; color: #9ca3af; word-break: break-all; margin-top: 32px; text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; }
                    .divider { border: 0; border-top: 1px solid #eeeeee; margin: 32px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Mot de passe oublié ?</h2>
                        <p class="text">
                            Bonjour,<br><br>
                            Nous avons reçu une demande de réinitialisation pour votre compte. Cliquez sur le bouton ci-dessous pour sécuriser votre accès.
                        </p>
                        
                        <div class="button-container">
                            <a href="${resetUrl}" class="button">Réinitialiser maintenant</a>
                        </div>
                        
                        <p class="text" style="font-size: 14px; margin-bottom: 0; color: #FF991F; font-weight: 600;">
                            Ce lien expirera dans 1 heure.
                        </p>
                        
                        <div class="divider"></div>
                        
                        <div class="link-alt">
                            Bouton inactif ? Copiez ce lien :<br>
                            <a href="${resetUrl}" style="color: #FF991F;">${resetUrl}</a>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Noir • Orange • Blanc.<br>
                        Gagnez la confiance de vos clients.
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
    } catch (error: any) {
        console.error(`Detailed error sending reset email to ${email}:`, {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
        throw new Error(`Email service error: ${error.message || 'Unknown error'}`);
    }
};

/**
 * Send email verification link
 */
export const sendVerificationEmail = async (email: string, fullName: string, token: string, baseUrl?: string) => {
    const frontendUrl = baseUrl || emailConfig.frontendUrl;
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    // Determine user role based on token payload if needed, but for now we keep it generic or assume passed info
    // Actually, we can just make a generic verification email

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: '✉️ Confirmez votre adresse email - AchatAvis',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 32px; text-align: center; }
                    .logo span { color: #FF991F; }
                    .title { font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 16px; text-align: center; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #FF991F; color: #ffffff !important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Vérifiez votre email</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Merci de vous être inscrit sur AchatAvis. Pour sécuriser votre compte et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email.
                        </p>
                        
                        <div class="button-container">
                            <a href="${verificationUrl}" class="button">Confirmer mon email</a>
                        </div>
                        
                        <p class="text" style="font-size: 14px; margin-bottom: 0; color: #6b7280;">
                            Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.
                        </p>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis.
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${email}`);
    } catch (error: any) {
        console.error(`Error sending verification email to ${email}:`, error);
        // We log but don't fail the registration process, the user can request a new token later
    }
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (email: string, fullName: string, role: 'artisan' | 'guide', baseUrl?: string) => {
    const frontendUrl = baseUrl || emailConfig.frontendUrl;
    const dashboardUrl = role === 'artisan' ? `${frontendUrl}/artisan` : `${frontendUrl}/guide`;

    const roleText = role === 'artisan' ? 'Artisan' : 'Local Guide';
    const welcomeMessage = role === 'artisan'
        ? "Prêt à transformer vos clients en ambassadeurs ? AchatAvis vous donne les clés pour une visibilité locale imbattable."
        : "Rejoignez l'élite des Local Guides. Votre expertise va booster les meilleurs artisans de votre région.";

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `👋 Bienvenue sur AchatAvis, ${fullName} !`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #111827; border-radius: 20px; padding: 48px; color: #ffffff; }
                    .logo { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 32px; text-align: center; }
                    .logo span { color: #FF991F; }
                    .title { font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #d1d5db; line-height: 1.6; margin-bottom: 32px; text-align: center; }
                    .button-container { text-align: center; margin: 40px 0; }
                    .button { background-color: #FF991F; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                    .highlight { color: #FF991F; font-weight: 800; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Bienvenue, ${fullName} !</h2>
                        <p class="text">
                            Vous êtes désormais membre <span class="highlight">${roleText}</span>.<br><br>
                            ${welcomeMessage}
                        </p>
                        
                        <div class="button-container">
                            <a href="${dashboardUrl}" class="button">Lancer mon Dashboard</a>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Excellence & Performance.
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending welcome email to ${email}:`, error);
        // We don't throw error here to not block registration if email fails
    }
};

/**
 * Send email when a pack is activated
 */
export const sendPackActivationEmail = async (email: string, fullName: string, packName: string, fichesQuota: number, baseUrl?: string) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🚀 Pack ${packName} activé ! - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; text-align: center; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-align: center; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: ${brandRed}; color: #ffffff !important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .highlight { color: ${brandRed}; font-weight: 800; }
                    .stats-grid { display: flex; justify-content: space-around; background-color: ${brandBlack}; padding: 24px; border-radius: 12px; margin: 24px 0; color: white; }
                    .stat-item { text-align: center; }
                    .stat-value { font-size: 28px; font-weight: 800; color: ${brandRed}; }
                    .stat-label { font-size: 11px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Votre pack est prêt !</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Excellente nouvelle ! Votre abonnement au pack <span class="highlight">${packName}</span> a été activé avec succès.
                        </p>
                        
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${fichesQuota}</div>
                                <div class="stat-label">fiches incluses</div>
                            </div>
                        </div>
                        
                        <div class="button-container">
                            <a href="${frontendUrl}/artisan/dashboard" class="button">Démarrer maintenant</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending pack activation email:`, error);
    }
};

/**
 * Send email when user status is updated (approved/suspended/etc)
 */
export const sendUserStatusUpdateEmail = async (email: string, fullName: string, status: string) => {
    let title = "";
    let message = "";
    let color = "#FF991F";

    switch (status) {
        case 'active':
            title = "Compte Approuvé";
            message = "Félicitations ! Votre compte AchatAvis a été activé. L'excellence vous attend.";
            color = "#10b981"; // Keep green for success if preferred, or change to black? Let's use brand black.
            break;
        case 'suspended':
            title = "Compte Suspendu";
            message = "Votre compte a été temporairement suspendu par notre équipe de sécurité.";
            color = "#111827";
            break;
        case 'rejected':
            title = "Demande Refusée";
            message = "Votre demande d'inscription n'a pas pu être acceptée pour le moment.";
            color = "#FF991F";
            break;
        default:
            return;
    }

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `Mise à jour de votre compte - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; text-align: center; }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; }
                    .logo span { color: #FF991F; }
                    .title { font-size: 20px; font-weight: 800; color: ${color}; margin-bottom: 16px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 0; }
                    .status-box { padding: 24px; border-radius: 12px; background-color: #f9fafb; border-top: 4px solid ${color}; margin-top: 24px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">${title}</h2>
                        <div class="status-box">
                            <p class="text">
                                Bonjour <strong>${fullName}</strong>,<br><br>
                                ${message}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending user status update email:`, error);
    }
};

/**
 * Send email to artisan when a fiche is approved by admin
 */
export const sendficheDecisionEmail = async (email: string, fullName: string, orderId: string, status: string, baseUrl?: string) => {
    if (status !== 'in_progress') return;

    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🎯 Votre fiche a été validée ! - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; text-align: center; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 32px; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: ${brandRed}; color: #ffffff!important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">fiche validée</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Excellente nouvelle ! Votre fiche a été validée par notre équipe technique. Elle est désormais visible par nos Local Guides.
                        </p>
                        <div class="button-container">
                            <a href="${frontendUrl}/artisan/orders/${orderId}" class="button">Suivre l'avancement</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending fiche decision email:`, error);
    }
};

/**
 * Send email to guide when their submission is validated or rejected
 */
export const sendSubmissionDecisionEmail = async (email: string, fullName: string, status: string, rejectionReason?: string, allowResubmit?: boolean, allowAppeal?: boolean) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';
    let title = "";
    let message = "";
    let color = brandBlack;

    if (status === 'validated') {
        title = "Soumission Validée";
        message = "Félicitations ! Votre avis a été validé. Vos gains ont été crédités.";
        color = brandBlack;
    } else if (status === 'rejected') {
        title = "Soumission Refusée";
        message = `Malheureusement, votre avis n'a pas pu être validé.${rejectionReason ? `<br><br><strong>Raison :</strong> ${rejectionReason}` : ""}`;
        if (allowResubmit) {
            message += `<br><br><strong style="color: #10b981;">Bonne nouvelle :</strong> Vous avez la possibilité de corriger votre lien. Rendez-vous dans la rubrique <strong>Corrections</strong> de votre espace guide pour soumettre un nouveau lien valide.`;
        } else if (allowAppeal) {
            message += `<br><br><strong style="color: #3b82f6;">Faire appel :</strong> Si votre avis revient en ligne sur Google, vous pouvez relancer la validation depuis la rubrique <strong>Corrections</strong> de votre espace guide.`;
        }
        color = brandRed;
    } else {
        return;
    }

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `Décision sur votre soumission - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; padding: 40px; text-align: center; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${color}; margin-bottom: 16px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">${title}</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            ${message}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending submission decision email:`, error);
    }
};

/**
 * Send invitation email to new team member
 */
export const sendTeamInvitationEmail = async (email: string, token: string, permissions: any, baseUrl?: string) => {
    const frontendUrl = baseUrl || emailConfig.frontendUrl;
    const inviteUrl = `${frontendUrl}/admin/accept-invite?token=${token}`;
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';

    // Format permissions for display
    const permissionLabels: Record<string, string> = {
        can_validate_profiles: "Validation des Profils",
        can_validate_reviews: "Validation des Avis",
        can_validate_fiches: "Gestion des fiches",
        can_view_payments: "Accès aux Paiements",
        can_view_stats: "Voir les Statistiques",
        can_manage_users: "Gestion des Utilisateurs"
    };

    const rolesList = Object.entries(permissions)
        .filter(([_, value]) => value === true)
        .map(([key]) => `<li style="margin-bottom: 8px;">${permissionLabels[key] || key}</li>`)
        .join('');

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🎟️ Invitation Admin - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 48px; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 32px; text-align: center; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-align: center; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 40px 0; }
                    .button { background-color: ${brandRed}; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                    .role-box { background: #f9fafb; padding: 24px; border-radius: 12px; border-left: 4px solid ${brandBlack}; margin: 32px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Rejoignez l'Équipe</h2>
                        <p class="text">
                            Vous avez été invité à administrer <strong>AchatAvis</strong>.
                        </p>
                        
                        <div class="role-box">
                            <p style="margin-top: 0; font-weight: 800; margin-bottom: 16px; text-transform: uppercase; font-size: 13px;">Droits accordés :</p>
                            <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                                ${rolesList || '<li>Accès Standard</li>'}
                            </ul>
                        </div>

                        <div class="button-container">
                            <a href="${inviteUrl}" class="button">Accepter l'accès</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending team invitation:`, error);
        throw error;
    }
};
/**
 * Send email when a user is suspended with progressive level info
 */
export const sendSuspensionEmail = async (email: string, fullName: string, level: any, reasonDetails: string, userAgent: string | null = null, baseUrl?: string) => {
    const frontendUrl = baseUrl || emailConfig.frontendUrl;
    const dashboardUrl = `${frontendUrl}/suspended`;
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';

    const { browser, device } = parseUserAgent(userAgent);
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `⚠️ Alerte de Sécurité : Suspension Niveau ${level.level_number} - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 2px solid ${brandBlack}; border-radius: 20px; padding: 0; overflow: hidden; }
                    .header { background-color: ${brandBlack}; color: white; padding: 32px; text-align: center; }
                    .content { padding: 40px; }
                    .title { font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
                    .badge { background-color: ${brandRed}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; display: inline-block; margin-top: 12px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
                    .reason-box { background-color: #fef2f2; padding: 24px; border-radius: 12px; border-left: 6px solid ${brandRed}; margin: 24px 0; }
                    .tech-info { font-size: 13px; color: #6b7280; background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 32px; border: 1px solid #e5e7eb; }
                    .button-container { text-align: center; margin: 40px 0; }
                    .button { background-color: ${brandRed}; color: white !important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h2 class="title">COMPTE SUSPENDU</h2>
                            <div class="badge">${level.level_name}</div>
                        </div>
                        <div class="content">
                            <p class="text">
                                Bonjour <strong>${fullName}</strong>,<br><br>
                                Notre système de sécurité a détecté une activité non conforme. Conformément à nos conditions d'utilisation, votre compte a été restreint.
                            </p>
                            
                            <div class="reason-box">
                                <p style="margin: 0; font-weight: 800; color: ${brandBlack}; text-transform: uppercase; font-size: 14px;">Motif de la sanction :</p>
                                <p style="margin: 12px 0 0 0; color: #4b5563; font-style: italic;">"${reasonDetails}"</p>
                            </div>
    
                            <p class="text">
                                🗓️ <strong>Date :</strong> ${now}<br>
                                ⏳ <strong>Durée :</strong> ${level.duration_days} jour(s)
                            </p>
    
                            <div class="button-container">
                                <a href="${dashboardUrl}" class="button">Consulter mon statut</a>
                            </div>
    
                            <div class="tech-info">
                                🛰️ <strong>Empreinte technique au moment des faits :</strong><br>
                                <span style="opacity: 0.8;">${browser} • ${device}</span>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis Security Team.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending suspension email:`, error);
    }
};

/**
 * Send notification to admin when a user is suspended
 */
export const sendAdminSuspensionNotice = async (userEmail: string, userFullName: string, level: any, reason: string, userAgent: string | null) => {
    const adminEmail = process.env.ADMIN_EMAIL || emailConfig.from;
    const { browser, device } = parseUserAgent(userAgent);
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    const mailOptions = {
        from: emailConfig.from,
        to: adminEmail,
        subject: `🚨 [Alerte Admin] Suspension de compte : ${userFullName}`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111827; background-color: #f9fafb;">
                <h2 style="color: #FF991F; text-transform: uppercase; letter-spacing: 0.05em;">Suspension Appliquée</h2>
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 24px;">
                    <p style="margin-top: 0;"><strong>Utilisateur :</strong> ${userFullName} (${userEmail})</p>
                    <p><strong>Niveau :</strong> ${level.level_number} - ${level.level_name}</p>
                    <p><strong>Raison :</strong> ${reason}</p>
                    <p><strong>Date/Heure :</strong> ${now}</p>
                </div>
                <div style="margin-top: 24px; font-size: 13px; color: #6b7280;">
                    <strong>Détails techniques :</strong><br>
                    ${browser} • ${device}<br>
                    <span style="font-size: 11px;">UA: ${userAgent || 'N/A'}</span>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending admin suspension notice:', error);
    }
};

/**
 * Send email when a suspension is lifted
 */
export const sendSuspensionLiftedEmail = async (email: string, fullName: string, reason: string) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `✅ Votre compte a été réactivé - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; }
                    .card { background-color: #ffffff; border-radius: 16px; border: 2px solid ${brandBlack}; padding: 40px; text-align: center; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; }
                    .success-banner { background-color: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #10b981; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Compte Réactivé</h2>
                        <div class="success-banner">
                            <p class="text" style="color: #065f46; font-weight: 600; margin-bottom: 0;">
                                Bonne nouvelle <strong>${fullName}</strong> !<br>
                                Votre accès a été rétabli avec succès.
                            </p>
                        </div>
                        <p class="text">
                            <strong>Note de l'administrateur :</strong><br>
                            "${reason}"
                        </p>
                        <p class="text" style="margin-top: 32px; font-size: 14px; color: #6b7280;">
                            Nous comptons sur vous pour maintenir l'excellence de notre communauté.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending suspension lifted email:`, error);
    }
};

/**
 * Send email when a user is whitelisted (exempted)
 */
export const sendExemptionEmail = async (email: string, fullName: string, isExempted: boolean) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';

    const title = isExempted ? "Compte Vérifié & Protégé" : "Mise à jour de protection";
    const statusText = isExempted ? "ACTIVÉ" : "DÉSACTIVÉ";
    const message = isExempted
        ? "Bonne nouvelle ! Votre compte bénéficie désormais d'une protection avancée. Vous êtes exempté des suspensions automatiques liées à la géolocalisation ou aux activités suspectes standard."
        : "Votre statut de protection avancée a été mis à jour. Votre compte est désormais soumis aux protocoles de sécurité standards.";

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🛡️ Protection Avancée : ${statusText} - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; }
                    .card { background-color: ${brandBlack}; border-radius: 20px; padding: 48px; text-align: center; color: white; }
                    .logo { font-size: 24px; font-weight: 800; color: white; margin-bottom: 24px; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 24px; font-weight: 800; color: white; margin-bottom: 16px; text-transform: uppercase; }
                    .badge { background-color: ${isExempted ? '#10b981' : brandRed}; color: white; padding: 8px 20px; border-radius: 30px; font-size: 14px; font-weight: 800; display: inline-block; margin-bottom: 24px; }
                    .text { font-size: 16px; color: #d1d5db; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">${title}</h2>
                        <div class="badge">STATUT : ${statusText}</div>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            ${message}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending exemption email:`, error);
    }
};



/**
 * Send email to artisan when a fiche is submitted for review
 */
export const sendficheSubmittedArtisanEmail = async (email: string, fullName: string, companyName: string, orderId: string, baseUrl?: string) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `📝 fiche " ${companyName} " en attente de validation - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; text-align: center; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 32px; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: ${brandRed}; color: #ffffff !important; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">fiche reçue</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Votre fiche pour <strong>${companyName}</strong> a bien été transmise à nos équipes. 
                            Elle est actuellement en cours de vérification technique.<br><br>
                            Dès qu'elle sera validée, vous recevrez une confirmation et elle deviendra active pour nos Local Guides.
                        </p>
                        <div class="button-container">
                            <a href="${frontendUrl}/artisan/orders/${orderId}" class="button">Voir ma fiche</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending fiche submitted artisan email:`, error);
    }
};

/**
 * Send alert to admin when a new fiche is submitted
 */
export const sendficheSubmittedAdminEmail = async (artisanName: string, companyName: string, orderId: string, baseUrl?: string) => {
    const adminEmail = process.env.ADMIN_EMAIL || emailConfig.from;
    const brandRed = '#FF991F';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const mailOptions = {
        from: emailConfig.from,
        to: adminEmail,
        subject: `🚨 [Nouveau] fiche à valider : ${companyName}`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; padding: 32px; color: #111827; background-color: #f9fafb;">
                <h2 style="color: ${brandRed}; text-transform: uppercase; letter-spacing: 0.05em;">Nouvelle fiche Soumise</h2>
                <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 24px;">
                    <p style="margin-top: 0;"><strong>Artisan :</strong> ${artisanName}</p>
                    <p><strong>Entreprise :</strong> ${companyName}</p>
                    <p><strong>ID fiche :</strong> ${orderId}</p>
                    
                    <div style="margin-top: 32px;">
                        <a href="${frontendUrl}/admin/fiches" 
                           style="background-color: ${brandRed}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                           Accéder au Dashboard Admin
                        </a>
                    </div>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending fiche submitted admin email:`, error);
    }
};

/**
 * Send email to artisan with generated reviews for verification
 */
export const sendReviewValidationEmail = async (emails: string[], fiche: any, proposals: any[]) => {
    const brandRed = '#FF991F';
    const brandBlack = '#0a0a0a';

    const reviewsHtml = proposals.map((p, index) => `
        <div style="padding: 16px; border-bottom: 1px solid #eee; margin-bottom: 16px;">
            <div style="font-weight: 800; color: ${brandRed}; margin-bottom: 8px;">Avis n°${index + 1} (${p.rating} ⭐)</div>
            <div style="font-style: italic; color: #4b5563; font-size: 14px;">"${p.content}"</div>
            <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">Auteur suggéré : ${p.author_name}</div>
        </div>
    `).join('');

    const mailOptions = {
        from: emailConfig.from,
        to: emails.join(', '),
        subject: `📋 Vérification de vos avis générés - ${fiche.company_name} - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; }
                    .logo { font-size: 24px; font-weight: 800; color: ${brandBlack}; margin-bottom: 24px; text-align: center; }
                    .logo span { color: ${brandRed}; }
                    .title { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin-bottom: 16px; text-align: center; text-transform: uppercase; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 32px; }
                    .infos-box { background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 32px; font-size: 14px; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo"><img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 48px;"></div>
                        <h2 class="title">Vérification des avis</h2>
                        <p class="text">
                            Bonjour,<br><br>
                            Nous avons généré les propositions d'avis pour votre fiche <strong>${fiche.company_name}</strong>. 
                            Veuillez vérifier le contenu ci-dessous avant que nous ne les validions définitivement.
                        </p>
                        
                        <div class="infos-box">
                            <strong>Détails du projet :</strong><br>
                            • Entreprise : ${fiche.company_name}<br>
                            • Secteur : ${fiche.sector || 'N/A'}<br>
                            • Quantité : ${proposals.length} avis
                        </div>

                        <div style="margin-top: 32px;">
                            ${reviewsHtml}
                        </div>

                        <p class="text" style="margin-top: 32px; text-align: center; font-weight: 600;">
                            Si tout vous semble correct, vous n'avez rien à faire. 
                            Sinon, veuillez nous contacter pour toute modification.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Review validation email sent to ${emails.join(', ')}`);
    } catch (error) {
        console.error(`Error sending review validation email:`, error);
        throw error;
    }
};

/**
 * Send Gmail account blocked notification to the blocked email
 */
export const sendGmailBlockedEmail = async (gmailEmail: string, reason: string) => {
    const brandBlack = '#0a0a0a';

    const mailOptions = {
        from: emailConfig.from,
        to: gmailEmail,
        subject: '🚫 Compte Gmail bloqué - AchatAvis',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 2px solid ${brandBlack}; border-radius: 20px; padding: 0; overflow: hidden; }
                    .header { background-color: #dc2626; color: white; padding: 32px; text-align: center; }
                    .content { padding: 40px; }
                    .title { font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
                    .text { font-size: 16px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
                    .reason-box { background-color: #fef2f2; padding: 24px; border-radius: 12px; border-left: 6px solid #dc2626; margin: 24px 0; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h2 class="title">COMPTE GMAIL BLOQUÉ</h2>
                        </div>
                        <div class="content">
                            <p class="text">
                                L'adresse Gmail <strong>${gmailEmail}</strong> a été bloquée sur la plateforme AchatAvis et ne peut plus être utilisée pour soumettre des avis.
                            </p>

                            <div class="reason-box">
                                <p style="margin: 0; font-weight: 800; color: ${brandBlack}; text-transform: uppercase; font-size: 14px;">Motif du blocage :</p>
                                <p style="margin: 12px 0 0 0; color: #4b5563; font-style: italic;">"${reason}"</p>
                            </div>

                            <p class="text">
                                Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe AchatAvis.
                            </p>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending gmail blocked email:', error);
    }
};

/**
 * Send notification to the guide that one of their Gmail accounts was blocked
 */
export const sendGuideGmailBlockedNotification = async (guideEmail: string, guideName: string, gmailEmail: string, reason: string) => {
    const brandBlack = '#0a0a0a';

    const mailOptions = {
        from: emailConfig.from,
        to: guideEmail,
        subject: '⚠️ Un de vos comptes Gmail a été bloqué - AchatAvis',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px; }
                    .card { background-color: #ffffff; border: 2px solid ${brandBlack}; border-radius: 20px; padding: 0; overflow: hidden; }
                    .header { background-color: ${brandBlack}; color: white; padding: 32px; text-align: center; }
                    .content { padding: 40px; }
                    .title { font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
                    .text { font-size: 16px; color: #1f2937; line-height: 1.6; margin-bottom: 24px; }
                    .reason-box { background-color: #fff7ed; padding: 24px; border-radius: 12px; border-left: 6px solid #f59e0b; margin: 24px 0; }
                    .email-box { background-color: #f9fafb; padding: 16px; border-radius: 12px; text-align: center; margin: 16px 0; border: 1px solid #e5e7eb; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <h2 class="title">COMPTE GMAIL BLOQUÉ</h2>
                        </div>
                        <div class="content">
                            <p class="text">
                                Bonjour <strong>${guideName}</strong>,<br><br>
                                Nous vous informons qu'un de vos comptes Gmail a été bloqué par l'administration. Ce compte ne pourra plus être utilisé pour soumettre des avis sur la plateforme.
                            </p>

                            <div class="email-box">
                                <p style="margin: 0; font-size: 13px; color: #6b7280; font-weight: 600;">Compte concerné</p>
                                <p style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #111827;">${gmailEmail}</p>
                            </div>

                            <div class="reason-box">
                                <p style="margin: 0; font-weight: 800; color: ${brandBlack}; text-transform: uppercase; font-size: 14px;">Motif :</p>
                                <p style="margin: 12px 0 0 0; color: #4b5563; font-style: italic;">"${reason}"</p>
                            </div>

                            <p class="text">
                                Vos autres comptes Gmail restent actifs. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'équipe AchatAvis.
                            </p>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending guide gmail blocked notification:', error);
    }
};

/**
 * Send notification email to all guides when a new fiche is approved
 */
export const sendNewFicheToGuidesEmail = async (
    guideEmails: string[],
    newFiche: { id: string; company_name: string; sector?: string; quantity: number; city?: string },
    recentFiches: { id: string; company_name: string; sector?: string; quantity: number; city?: string }[],
    baseUrl?: string
) => {
    if (guideEmails.length === 0) return;

    const brandOrange = '#FF991F';
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const recentFichesHtml = recentFiches.map(f => `
        <tr>
            <td style="padding: 16px; border-bottom: 1px solid #f3f4f6;">
                <div style="font-weight: 700; color: ${brandBlack}; font-size: 15px;">${f.company_name}</div>
                <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">${f.sector || 'Autre'} ${f.city ? '• ' + f.city : ''}</div>
            </td>
            <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                <span style="font-weight: 700; color: ${brandBlack};">${f.quantity} avis</span>
            </td>
            <td style="padding: 16px; border-bottom: 1px solid #f3f4f6; text-align: right;">
                <a href="${frontendUrl}/guide/fiches/${f.id}"
                   style="color: ${brandOrange}; font-weight: 700; text-decoration: none; font-size: 14px;">
                   Voir →
                </a>
            </td>
        </tr>
    `).join('');

    const mailOptions = {
        from: emailConfig.from,
        to: emailConfig.from,
        bcc: guideEmails.join(', '),
        subject: `🔥 Nouvelle fiche disponible : ${newFiche.company_name} — Gagnez rapidement !`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 2px solid ${brandBlack}; }
                    .header { background-color: ${brandBlack}; color: white; padding: 32px; text-align: center; }
                    .title { font-size: 22px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
                    .content { padding: 32px; }
                    .text { font-size: 16px; color: #374151; line-height: 1.6; }
                    .new-fiche-box { background: linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%); border: 2px solid ${brandOrange}; border-radius: 16px; padding: 28px; margin: 24px 0; position: relative; }
                    .badge-new { position: absolute; top: -12px; left: 20px; background-color: ${brandOrange}; color: white; font-size: 12px; font-weight: 800; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
                    .fiche-name { font-size: 20px; font-weight: 800; color: ${brandBlack}; margin-top: 8px; }
                    .fiche-meta { font-size: 14px; color: #6b7280; margin-top: 8px; }
                    .btn-primary { display: inline-block; background-color: ${brandOrange}; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; margin-top: 16px; }
                    .section-title { font-size: 16px; font-weight: 800; color: ${brandBlack}; text-transform: uppercase; margin: 32px 0 16px 0; letter-spacing: 0.05em; }
                    .footer { margin-top: 32px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <img src="https://manager.achatavis.com/logo.png" alt="AchatAvis" style="height: 40px; margin-bottom: 12px;">
                            <h2 class="title">Nouvelle mission disponible !</h2>
                        </div>
                        <div class="content">
                            <p class="text">
                                Une nouvelle fiche vient d'être validée et attend vos avis. Soyez parmi les premiers à la prendre en charge !
                            </p>

                            <div class="new-fiche-box">
                                <div class="badge-new">🔥 Nouvelle</div>
                                <div class="fiche-name">${newFiche.company_name}</div>
                                <div class="fiche-meta">
                                    ${newFiche.sector || 'Autre'} ${newFiche.city ? '• ' + newFiche.city : ''} • <strong>${newFiche.quantity} avis</strong> demandés
                                </div>
                                <div style="text-align: center;">
                                    <a href="${frontendUrl}/guide/fiches/${newFiche.id}" class="btn-primary">
                                        Voir la fiche →
                                    </a>
                                </div>
                            </div>

                            ${recentFiches.length > 0 ? `
                                <div class="section-title">📋 Autres fiches disponibles</div>
                                <table style="width: 100%; border-collapse: collapse;">
                                    ${recentFichesHtml}
                                </table>
                            ` : ''}

                            <div style="text-align: center; margin-top: 32px;">
                                <a href="${frontendUrl}/guide/fiches" class="btn-primary" style="background-color: ${brandBlack};">
                                    Voir toutes les fiches
                                </a>
                            </div>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis — Ne ratez aucune opportunité.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`New fiche notification sent to ${guideEmails.length} guides`);
    } catch (error) {
        console.error('Error sending new fiche notification to guides:', error);
    }
};

/**
 * Send admin notification when a new user registers
 */
export const sendNewUserRegistrationAdminEmail = async (
    userName: string,
    userEmail: string,
    userRole: 'artisan' | 'guide',
    extraInfo?: { companyName?: string; city?: string; trade?: string },
    baseUrl?: string
) => {
    const adminEmail = process.env.ADMIN_EMAIL || emailConfig.from;
    const brandOrange = '#FF991F';
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const isArtisan = userRole === 'artisan';
    const roleBadge = isArtisan ? '🏗️ Artisan' : '🧭 Guide Local';
    const roleColor = isArtisan ? brandOrange : '#2383e2';

    const detailsHtml = extraInfo ? `
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #e5e7eb;">
            ${extraInfo.companyName ? `<p style="margin: 4px 0;"><strong>Entreprise :</strong> ${extraInfo.companyName}</p>` : ''}
            ${extraInfo.trade ? `<p style="margin: 4px 0;"><strong>Métier :</strong> ${extraInfo.trade}</p>` : ''}
            ${extraInfo.city ? `<p style="margin: 4px 0;"><strong>Ville :</strong> ${extraInfo.city}</p>` : ''}
        </div>
    ` : '';

    const mailOptions = {
        from: emailConfig.from,
        to: adminEmail,
        subject: `👤 Nouvel inscrit ${roleBadge} : ${userName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; color: #111827; background-color: #f9fafb; }
                    .card { background: white; padding: 32px; border-radius: 16px; border: 1px solid #e5e7eb; }
                    .header-badge { display: inline-block; background-color: ${roleColor}; color: white; font-size: 13px; font-weight: 800; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
                    .user-name { font-size: 22px; font-weight: 800; color: ${brandBlack}; margin: 16px 0 4px 0; }
                    .user-email { font-size: 15px; color: #6b7280; margin: 0; }
                    .btn { display: inline-block; background-color: ${brandBlack}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 20px; }
                    .footer { margin-top: 24px; text-align: center; font-size: 13px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header-badge">${roleBadge}</div>
                        <h2 class="user-name">${userName}</h2>
                        <p class="user-email">${userEmail}</p>
                        ${detailsHtml}
                        <a href="${frontendUrl}/admin/${isArtisan ? 'artisans' : 'guides'}" class="btn">
                            Voir dans le dashboard →
                        </a>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis — Notification admin
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending new user registration admin email:', error);
    }
};

/**
 * Generic admin event notification email
 * Used for all major system events (review submitted, order completed, payout request, payment, etc.)
 */
export const sendAdminEventNotification = async (
    event: {
        emoji: string;
        title: string;
        details: { label: string; value: string }[];
        ctaLabel?: string;
        ctaUrl?: string;
    },
    baseUrl?: string
) => {
    const adminEmail = process.env.ADMIN_EMAIL || emailConfig.from;
    const brandBlack = '#0a0a0a';
    const frontendUrl = baseUrl || emailConfig.frontendUrl;

    const detailsHtml = event.details.map(d => `
        <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${d.label}</td>
            <td style="padding: 8px 12px; font-weight: 700; color: ${brandBlack}; font-size: 14px; border-bottom: 1px solid #f3f4f6;">${d.value}</td>
        </tr>
    `).join('');

    const ctaHtml = event.ctaUrl ? `
        <div style="text-align: center; margin-top: 24px;">
            <a href="${frontendUrl}${event.ctaUrl}"
               style="display: inline-block; background-color: ${brandBlack}; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px;">
                ${event.ctaLabel || 'Voir dans le dashboard'} →
            </a>
        </div>
    ` : '';

    const mailOptions = {
        from: emailConfig.from,
        to: adminEmail,
        subject: `${event.emoji} ${event.title}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #f9fafb; }
                    .card { background: white; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
                    .card-header { background-color: ${brandBlack}; color: white; padding: 20px 28px; }
                    .card-header h2 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
                    .card-body { padding: 28px; }
                    .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="card-header">
                            <h2>${event.emoji} ${event.title}</h2>
                        </div>
                        <div class="card-body">
                            <table style="width: 100%; border-collapse: collapse;">
                                ${detailsHtml}
                            </table>
                            ${ctaHtml}
                        </div>
                    </div>
                    <div class="footer">&copy; ${new Date().getFullYear()} AchatAvis</div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Error sending admin event notification [${event.title}]:`, error);
    }
};
