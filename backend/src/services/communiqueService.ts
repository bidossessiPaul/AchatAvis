import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';

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

    // Aucun email n'est envoyé : les guides sont prévenus par le modal
    // « nouveau communiqué » affiché à leur prochaine connexion (voir
    // getUnreadForUser / markAllSeen).
    return (await getById(id))!;
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
 * Communiqué publié le plus récent que cet utilisateur n'a pas encore vu,
 * accompagné du nombre total de communiqués non lus. Alimente le modal
 * affiché au dashboard guide.
 */
export const getUnreadForUser = async (
    userId: string
): Promise<{ communique: Communique | null; unread_count: number }> => {
    const rows: any = await query(
        `SELECT c.* FROM communiques c
         LEFT JOIN communique_reads r ON r.communique_id = c.id AND r.user_id = ?
         WHERE c.is_published = 1 AND r.id IS NULL
         ORDER BY c.sort_order ASC, c.created_at DESC`,
        [userId]
    );
    return { communique: rows[0] || null, unread_count: rows.length };
};

/**
 * Marque TOUS les communiqués publiés comme vus pour cet utilisateur.
 * Volontairement global : le modal ne doit apparaître qu'une fois, pas une
 * fois par communiqué en retard.
 */
export const markAllSeen = async (userId: string): Promise<void> => {
    await query(
        `INSERT IGNORE INTO communique_reads (id, communique_id, user_id)
         SELECT UUID(), c.id, ? FROM communiques c WHERE c.is_published = 1`,
        [userId]
    );
};

/**
 * Efface les lectures d'un communiqué : le modal se réaffichera à tous les
 * guides. Utilisé par l'admin quand une annonce doit être relue par tous.
 */
export const resetReads = async (communiqueId: string): Promise<void> => {
    await query(`DELETE FROM communique_reads WHERE communique_id = ?`, [communiqueId]);
};
