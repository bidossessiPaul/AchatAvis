import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { transporter, emailConfig } from '../config/email';

export interface Communique {
    id: string;
    title: string;
    subtitle: string | null;
    date_label: string | null;
    icon: string;
    accent_color: string;
    content: string;
    is_published: number | boolean;
    sort_order: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateCommuniqueInput {
    title: string;
    subtitle?: string;
    date_label?: string;
    icon?: string;
    accent_color?: string;
    content: string;
    is_published?: boolean;
    sort_order?: number;
    notify_guides?: boolean;
}

export const listPublished = async (): Promise<Communique[]> => {
    const rows: any = await query(`
        SELECT * FROM communiques
        WHERE is_published = 1
        ORDER BY sort_order ASC, created_at DESC
    `);
    return rows;
};

export const listAll = async (): Promise<Communique[]> => {
    const rows: any = await query(`
        SELECT * FROM communiques
        ORDER BY sort_order ASC, created_at DESC
    `);
    return rows;
};

export const getById = async (id: string): Promise<Communique | null> => {
    const rows: any = await query(`SELECT * FROM communiques WHERE id = ?`, [id]);
    return rows[0] || null;
};

export const create = async (
    input: CreateCommuniqueInput,
    adminId: string | null
): Promise<Communique> => {
    const id = uuidv4();
    await query(
        `INSERT INTO communiques
         (id, title, subtitle, date_label, icon, accent_color, content, is_published, sort_order, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            input.title,
            input.subtitle || null,
            input.date_label || null,
            input.icon || 'Megaphone',
            input.accent_color || '#0369a1',
            input.content,
            input.is_published === false ? 0 : 1,
            input.sort_order ?? 0,
            adminId,
        ]
    );

    const created = (await getById(id))!;

    // If published and admin asked to notify, send email to all active guides
    if (created.is_published && input.notify_guides !== false) {
        notifyAllGuides(created).catch(err => {
            console.error('notifyAllGuides failed:', err);
        });
    }

    return created;
};

export const update = async (
    id: string,
    input: Partial<CreateCommuniqueInput>
): Promise<Communique> => {
    const existing = await getById(id);
    if (!existing) throw new Error('Communiqué introuvable');

    await query(
        `UPDATE communiques
         SET title = ?, subtitle = ?, date_label = ?, icon = ?, accent_color = ?,
             content = ?, is_published = ?, sort_order = ?
         WHERE id = ?`,
        [
            input.title ?? existing.title,
            input.subtitle ?? existing.subtitle,
            input.date_label ?? existing.date_label,
            input.icon ?? existing.icon,
            input.accent_color ?? existing.accent_color,
            input.content ?? existing.content,
            input.is_published === undefined
                ? existing.is_published
                : (input.is_published ? 1 : 0),
            input.sort_order ?? existing.sort_order,
            id,
        ]
    );

    return (await getById(id))!;
};

export const remove = async (id: string): Promise<void> => {
    await query(`DELETE FROM communiques WHERE id = ?`, [id]);
};

/**
 * Send email notification to every active guide about a new communiqué.
 * Uses BCC in batches to avoid revealing addresses and respect SMTP limits.
 */
export const notifyAllGuides = async (communique: Communique): Promise<void> => {
    const rows: any = await query(
        `SELECT email, full_name FROM users
         WHERE role = 'guide' AND email_verified = 1 AND status IN ('active', 'pending')`
    );

    if (!rows || rows.length === 0) {
        console.log('notifyAllGuides: no guides to notify');
        return;
    }

    const frontendUrl = emailConfig.frontendUrl || 'https://manager.achatavis.com';
    const readUrl = `${frontendUrl}/guide/communiques`;

    const html = buildEmailHtml(communique, readUrl);
    const subject = `📢 Nouveau communiqué AchatAvis : ${communique.title}`;

    // Send in BCC batches of 50
    const BATCH_SIZE = 50;
    const emails = rows.map((r: any) => r.email).filter((e: string) => !!e);
    console.log(`notifyAllGuides: sending to ${emails.length} guides`);

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        try {
            await transporter.sendMail({
                from: emailConfig.from,
                to: emailConfig.from, // primary "to" = our own address
                bcc: batch,
                subject,
                html,
            });
        } catch (err: any) {
            console.error(`notifyAllGuides batch ${i / BATCH_SIZE} failed:`, err?.message);
        }
    }
    console.log(`notifyAllGuides: done`);
};

const buildEmailHtml = (c: Communique, readUrl: string): string => {
    // Strip potentially unsafe tags from preview; full content still rendered
    // in-app via the /guide/communiques page.
    const accent = c.accent_color || '#0369a1';
    const contentPreview = stripHtml(c.content).slice(0, 300) + '...';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: -apple-system, 'Segoe UI', Tahoma, sans-serif; background:#f8fafc; padding: 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, ${accent}, ${accent}dd); padding: 32px 28px; color: white;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
                        📢 COMMUNIQUÉ OFFICIEL${c.date_label ? ' · ' + escapeHtml(c.date_label) : ''}
                    </div>
                    <h1 style="margin: 8px 0 4px; font-size: 22px;">${escapeHtml(c.title)}</h1>
                    ${c.subtitle ? `<p style="margin: 0; opacity: 0.9; font-size: 14px;">${escapeHtml(c.subtitle)}</p>` : ''}
                </div>
                <div style="padding: 28px;">
                    <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                        Un nouveau communiqué vient d'être publié par l'équipe AchatAvis.
                    </p>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.6; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid ${accent};">
                        ${escapeHtml(contentPreview)}
                    </p>
                    <div style="text-align: center; margin: 28px 0 10px;">
                        <a href="${readUrl}" style="display: inline-block; background: ${accent}; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700;">
                            Lire le communiqué complet
                        </a>
                    </div>
                </div>
                <div style="background: #f8fafc; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
                    &copy; ${new Date().getFullYear()} AchatAvis — Vous recevez ce message car vous êtes membre Local Guide.
                </div>
            </div>
        </body>
        </html>
    `;
};

const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripHtml = (html: string) =>
    html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
