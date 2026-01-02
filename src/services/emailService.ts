import { transporter, emailConfig } from '../config/email';

/**
 * Send password reset email
 */
export const sendResetPasswordEmail = async (email: string, token: string) => {
    const resetUrl = `${emailConfig.frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: '🔐 Réinitialisation de votre mot de passe - AchatAvis',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #ff3b6a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; transition: background-color 0.2s; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .link-alt { font-size: 12px; color: #9ca3af; word-break: break-all; margin-top: 24px; text-align: center; }
                    .divider { border: 0; border-top: 1px solid #f3f4f6; margin: 32px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">Récupération de compte</h2>
                        <p class="text">
                            Bonjour,<br><br>
                            Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte <strong>AchatAvis</strong>. 
                            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
                        </p>
                        
                        <div class="button-container">
                            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
                        </div>
                        
                        <p class="text" style="font-size: 14px; margin-bottom: 0;">
                            Ce lien expirera dans <strong>1 heure</strong> pour votre sécurité.
                        </p>
                        
                        <div class="divider"></div>
                        
                        <div class="link-alt">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                            <a href="${resetUrl}" style="color: #ff3b6a;">${resetUrl}</a>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Tous droits réservés.<br>
                        Boostez votre visibilité locale avec des avis authentiques.
                    </div>
                </div>
            </body>
            </html>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending reset email to ${email}:`, error);
        throw new Error('Impossible d\'envoyer l\'email de réinitialisation');
    }
};

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = async (email: string, fullName: string, role: 'artisan' | 'guide') => {
    const dashboardUrl = role === 'artisan' ? `${emailConfig.frontendUrl}/artisan` : `${emailConfig.frontendUrl}/guide`;

    const roleText = role === 'artisan' ? 'Artisan' : 'Local Guide';
    const welcomeMessage = role === 'artisan'
        ? "C'est un plaisir de vous compter parmi nous. AchatAvis vous aide à booster la visibilité de votre entreprise grâce à des avis Google authentiques et qualitatifs."
        : "Merci de rejoindre notre communauté de Local Guides. Votre expertise va aider de nombreux artisans à améliorer leur présence en ligne.";

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `👋 Bienvenue sur AchatAvis, ${fullName} !`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #ff3b6a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; transition: background-color 0.2s; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .divider { border: 0; border-top: 1px solid #f3f4f6; margin: 32px 0; }
                    .highlight { color: #ff3b6a; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">Bienvenue parmi nous !</h2>
                        <p class="text">
                            Bonjour <span class="highlight">${fullName}</span>,<br><br>
                            Nous sommes ravis de vous accueillir sur <strong>AchatAvis</strong> en tant que <span class="highlight">${roleText}</span>.<br><br>
                            ${welcomeMessage}
                        </p>
                        
                        <div class="button-container">
                            <a href="${dashboardUrl}" class="button">Accéder à mon tableau de bord</a>
                        </div>
                        
                        <p class="text">
                            Si vous avez des questions, notre équipe est là pour vous accompagner à chaque étape.
                        </p>
                        
                        <div class="divider"></div>
                        
                        <p class="text" style="font-size: 14px;">
                            À très vite sur AchatAvis !
                        </p>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Tous droits réservés.<br>
                        L'outil n°1 pour la gestion d'avis Google.
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
export const sendPackActivationEmail = async (email: string, fullName: string, packName: string, missionsQuota: number) => {
    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🚀 Pack ${packName} activé ! - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #ff3b6a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .highlight { color: #ff3b6a; font-weight: 700; }
                    .stats-grid { display: flex; justify-content: space-around; background-color: #f9fafb; padding: 20px; border-radius: 12px; margin: 24px 0; }
                    .stat-item { text-align: center; }
                    .stat-value { font-size: 24px; font-weight: 800; color: #ff3b6a; }
                    .stat-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">Votre pack est prêt !</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Excellente nouvelle ! Votre abonnement au pack <span class="highlight">${packName}</span> a été activé avec succès.
                        </p>
                        
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${missionsQuota}</div>
                                <div class="stat-label">Missions incluses</div>
                            </div>
                        </div>
                        
                        <p class="text">
                            Vous pouvez dès maintenant commencer à créer vos missions pour obtenir vos premiers avis Google.
                        </p>
                        
                        <div class="button-container">
                            <a href="${emailConfig.frontendUrl}/artisan/dashboard" class="button">Créer ma première mission</a>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Tous droits réservés.
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
    let emoji = "ℹ️";

    switch (status) {
        case 'active':
            title = "Compte Approuvé";
            message = "Félicitations ! Votre compte AchatAvis a été activé. Vous pouvez maintenant accéder à toutes les fonctionnalités de la plateforme.";
            emoji = "✅";
            break;
        case 'suspended':
            title = "Compte Suspendu";
            message = "Votre compte AchatAvis a été temporairement suspendu par un administrateur. Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter.";
            emoji = "⚠️";
            break;
        case 'rejected':
            title = "Inscription Refusée";
            message = "Votre demande d'inscription à AchatAvis n'a pas pu être acceptée pour le moment.";
            emoji = "❌";
            break;
        default:
            return; // Don't send email for other statuses
    }

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${emoji} Mise à jour de votre compte - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .status-box { padding: 16px; border-radius: 12px; background-color: #f9fafb; border-left: 4px solid #ff3b6a; margin: 24px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">${title}</h2>
                        <div class="status-box">
                            <p class="text" style="margin-bottom: 0; text-align: left;">
                                Bonjour <strong>${fullName}</strong>,<br><br>
                                ${message}
                            </p>
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
        console.error(`Error sending status update email:`, error);
    }
};

/**
 * Send email to artisan when a mission is approved by admin
 */
export const sendMissionDecisionEmail = async (email: string, fullName: string, orderId: string, status: string) => {
    if (status !== 'in_progress') return; // Only notify when approved (in_progress)

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🎯 Votre mission a été validée ! - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #ff3b6a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">Mission validée</h2>
                        <p class="text">
                            Bonjour <strong>${fullName}</strong>,<br><br>
                            Votre mission a été validée par notre équipe technique. Elle est désormais visible par nos Local Guides qui vont commencer à soumettre vos avis.
                        </p>
                        <div class="button-container">
                            <a href="${emailConfig.frontendUrl}/artisan/orders/${orderId}" class="button">Suivre l'avancement</a>
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
        console.error(`Error sending mission decision email:`, error);
    }
};

/**
 * Send email to guide when their submission is validated or rejected
 */
export const sendSubmissionDecisionEmail = async (email: string, fullName: string, status: string, rejectionReason?: string) => {
    let title = "";
    let message = "";
    let emoji = "";

    if (status === 'validated') {
        title = "Bravo, votre avis a été validé !";
        message = "Votre soumission a été approuvée par l'artisan. Vos gains ont été crédités sur votre cagnotte.";
        emoji = "💰";
    } else if (status === 'rejected') {
        title = "Soumission refusée";
        message = `Malheureusement, votre avis n'a pas pu être validé.${rejectionReason ? `<br><br><strong>Raison :</strong> ${rejectionReason}` : ""}`;
        emoji = "❌";
    } else {
        return;
    }

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `${emoji} Décision sur votre soumission - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
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
export const sendTeamInvitationEmail = async (email: string, token: string, permissions: any) => {
    const inviteUrl = `${emailConfig.frontendUrl}/admin/accept-invite?token=${token}`;

    // Format permissions for display
    const permissionLabels: Record<string, string> = {
        can_validate_profiles: "Validation des Profils",
        can_validate_reviews: "Validation des Avis",
        can_validate_missions: "Gestion des Missions",
        can_view_payments: "Accès aux Paiements",
        can_view_stats: "Voir les Statistiques",
        can_manage_users: "Gestion des Utilisateurs"
    };

    const rolesList = Object.entries(permissions)
        .filter(([_, value]) => value === true)
        .map(([key]) => `<li>${permissionLabels[key] || key}</li>`)
        .join('');

    const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: `🎟️ Invitation à rejoindre l'équipe admin - AchatAvis`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 40px 20px; }
                    .card { background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                    .logo { font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 24px; text-align: center; }
                    .logo span { color: #ff3b6a; }
                    .title { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center; }
                    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; text-align: center; }
                    .button-container { text-align: center; margin: 32px 0; }
                    .button { background-color: #ff3b6a; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; display: inline-block; }
                    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #9ca3af; }
                    .role-box { background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0; }
                    .role-list { margin: 0; padding-left: 20px; color: #4b5563; }
                    .role-list li { margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="logo">Achat<span>Avis</span></div>
                        <h2 class="title">Rejoignez l'équipe Admin</h2>
                        <p class="text">
                            Bonjour,<br><br>
                            Vous avez été invité à rejoindre l'équipe d'administration de <strong>AchatAvis</strong>.
                        </p>
                        
                        <div class="role-box">
                            <p style="margin-top: 0; font-weight: 600; margin-bottom: 12px;">Vos accès autorisés :</p>
                            <ul class="role-list">
                                ${rolesList || '<li>Accès limité</li>'}
                            </ul>
                        </div>

                        <div class="button-container">
                            <a href="${inviteUrl}" class="button">Accepter l'invitation</a>
                        </div>
                        
                        <p class="text" style="font-size: 14px;">
                            Ce lien expirera dans 48 heures.
                        </p>
                    </div>
                    <div class="footer">
                        &copy; ${new Date().getFullYear()} AchatAvis. Tous droits réservés.
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Team invitation email sent to ${email}`);
    } catch (error) {
        console.error(`Error sending team invitation:`, error);
        throw error;
    }
};
