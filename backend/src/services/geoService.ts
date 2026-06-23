import { query, pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

// ─── Types internes ────────────────────────────────────────────────────────────

interface SubmitCitationData {
    missionId: string;
    platformId: number;
    guideId: string;
    submissionUrl: string;
    screenshotUrl?: string;
}

interface PlatformFilters {
    category?: string;
    active?: number;
}

interface MissionFilters {
    status?: string;
}

interface SubmissionFilters {
    status?: string;
    missionId?: string;
}

interface CreatePlatformData {
    name: string;
    url: string;
    category: string;
    da_score?: number;
    requires_account?: number;
    sector_tags?: any;
    country?: string;
    notes?: string;
    reward_amount?: number;
    active?: number;
}

interface CreateMissionData {
    artisan_id?: string | null;
    fiche_id?: string | null;
    external_name?: string | null;
    external_email?: string | null;
    name: string;
    activity_type: string;
    city: string;
    website?: string;
    phone?: string;
    address?: string;
    description?: string;
    citation_target?: number;
    reward_per_submission?: number;
    status?: string;
}

// ─── Fonctions guide ──────────────────────────────────────────────────────────

/**
 * Retourne les missions actives avec les infos de l'artisan
 * et le nombre de citations soumises par ce guide.
 */
export const getMissions = async (guideId: string) => {
    return query(`
        SELECT
            gm.id,
            gm.name,
            gm.activity_type,
            gm.city,
            gm.website,
            gm.phone,
            gm.address,
            gm.description,
            gm.citation_target,
            gm.reward_per_submission,
            gm.status,
            gm.created_at,
            -- Infos artisan (ou client externe si pas de compte plateforme)
            COALESCE(u.full_name, gm.external_name) AS artisan_name,
            COALESCE(u.email, gm.external_email)    AS artisan_email,
            ap.company_name,
            ap.trade,
            -- Nombre de citations soumises par CE guide sur cette mission
            COUNT(DISTINCT CASE WHEN gs.guide_id = :guideId AND gs.deleted_at IS NULL THEN gs.id END) AS my_submissions_count,
            -- Total citations validées toutes sources confondues
            COUNT(DISTINCT CASE WHEN gs.status = 'validated' AND gs.deleted_at IS NULL THEN gs.id END) AS total_validated
        FROM geo_missions gm
        LEFT JOIN users u ON u.id = gm.artisan_id
        LEFT JOIN artisans_profiles ap ON ap.user_id = gm.artisan_id
        LEFT JOIN geo_submissions gs ON gs.mission_id = gm.id
        WHERE gm.status = 'active'
          AND gm.deleted_at IS NULL
        GROUP BY
            gm.id, gm.name, gm.activity_type, gm.city, gm.website, gm.phone,
            gm.address, gm.description, gm.citation_target, gm.reward_per_submission,
            gm.status, gm.created_at,
            u.full_name, u.email, ap.company_name, ap.trade,
            gm.external_name, gm.external_email
        ORDER BY gm.created_at DESC
    `, { guideId });
};

/**
 * Retourne toutes les plateformes actives pour une mission,
 * avec pour chacune l'état de soumission du guide (déjà soumis + statut).
 */
export const getMissionPlatforms = async (missionId: string, guideId: string) => {
    return query(`
        SELECT
            gp.id,
            gp.name,
            gp.url,
            gp.category,
            gp.da_score,
            gp.requires_account,
            gp.sector_tags,
            gp.country,
            gp.notes,
            gp.reward_amount,
            -- Soumission de CE guide sur cette plateforme/mission
            gs.id             AS submission_id,
            gs.status         AS my_status,
            gs.submission_url,
            gs.screenshot_url AS submission_screenshot_url,
            gs.created_at     AS submitted_at
        FROM geo_platforms gp
        LEFT JOIN geo_submissions gs
            ON  gs.platform_id = gp.id
            AND gs.mission_id  = :missionId
            AND gs.guide_id    = :guideId
            AND gs.deleted_at  IS NULL
        WHERE gp.active = 1
        ORDER BY gp.da_score DESC, gp.name ASC
    `, { missionId, guideId });
};

/**
 * Crée une soumission de citation (UUID).
 * Lève une erreur si la contrainte UNIQUE est violée (doublon guide+plateforme+mission).
 */
export const submitCitation = async (data: SubmitCitationData) => {
    const id = uuidv4();
    await query(`
        INSERT INTO geo_submissions
            (id, mission_id, platform_id, guide_id, submission_url, screenshot_url, status, earnings, created_at)
        VALUES
            (:id, :missionId, :platformId, :guideId, :submissionUrl, :screenshotUrl, 'pending', 0.00, NOW())
    `, {
        id,
        missionId: data.missionId,
        platformId: data.platformId,
        guideId: data.guideId,
        submissionUrl: data.submissionUrl,
        screenshotUrl: data.screenshotUrl ?? null,
    });

    // Retourne la ligne insérée complète
    const rows: any[] = await query(
        `SELECT * FROM geo_submissions WHERE id = :id`,
        { id }
    );
    return rows[0];
};

/**
 * Retourne toutes les soumissions GEO d'un guide avec les infos mission et plateforme.
 */
export const getMyGeoSubmissions = async (guideId: string) => {
    return query(`
        SELECT
            gs.id,
            gs.submission_url,
            gs.screenshot_url,
            gs.status,
            gs.rejection_reason,
            gs.earnings,
            gs.created_at,
            gs.validated_at,
            -- Mission
            gm.id   AS mission_id,
            gm.name AS mission_name,
            gm.city AS mission_city,
            -- Plateforme
            gp.id   AS platform_id,
            gp.name AS platform_name,
            gp.url  AS platform_url,
            gp.category AS platform_category
        FROM geo_submissions gs
        JOIN geo_missions  gm ON gm.id = gs.mission_id
        JOIN geo_platforms gp ON gp.id = gs.platform_id
        WHERE gs.guide_id    = :guideId
          AND gs.deleted_at  IS NULL
        ORDER BY gs.created_at DESC
    `, { guideId });
};

// ─── Fonctions admin — plateformes ───────────────────────────────────────────

/**
 * Liste toutes les plateformes avec filtres optionnels (category, active).
 */
export const adminGetPlatforms = async (filters: PlatformFilters) => {
    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (filters.category !== undefined) {
        conditions.push('category = :category');
        params.category = filters.category;
    }
    if (filters.active !== undefined) {
        conditions.push('active = :active');
        params.active = filters.active;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return query(`
        SELECT * FROM geo_platforms
        ${where}
        ORDER BY da_score DESC, name ASC
    `, params);
};

/**
 * Crée une nouvelle plateforme.
 */
export const adminCreatePlatform = async (data: CreatePlatformData) => {
    const result: any = await query(`
        INSERT INTO geo_platforms
            (name, url, category, da_score, requires_account, sector_tags, country, notes, reward_amount, active, created_at)
        VALUES
            (:name, :url, :category, :da_score, :requires_account, :sector_tags, :country, :notes, :reward_amount, :active, NOW())
    `, {
        name: data.name,
        url: data.url,
        category: data.category,
        da_score: data.da_score ?? null,
        requires_account: data.requires_account ?? 0,
        sector_tags: data.sector_tags ? JSON.stringify(data.sector_tags) : null,
        country: data.country ?? null,
        notes: data.notes ?? null,
        reward_amount: data.reward_amount ?? 0.15,
        active: data.active ?? 1,
    });

    const rows: any[] = await query(
        `SELECT * FROM geo_platforms WHERE id = :id`,
        { id: result.insertId }
    );
    return rows[0];
};

/**
 * Met à jour les champs fournis d'une plateforme existante.
 */
export const adminUpdatePlatform = async (id: number, data: Partial<CreatePlatformData>) => {
    const allowed = ['name', 'url', 'category', 'da_score', 'requires_account', 'sector_tags', 'country', 'notes', 'reward_amount', 'active'];
    const setClauses: string[] = [];
    const params: Record<string, any> = { id };

    for (const key of allowed) {
        if (key in data) {
            setClauses.push(`${key} = :${key}`);
            params[key] = key === 'sector_tags' && typeof (data as any)[key] !== 'string'
                ? JSON.stringify((data as any)[key])
                : (data as any)[key];
        }
    }

    if (setClauses.length === 0) return null;

    await query(`
        UPDATE geo_platforms SET ${setClauses.join(', ')} WHERE id = :id
    `, params);

    const rows: any[] = await query(`SELECT * FROM geo_platforms WHERE id = :id`, { id });
    return rows[0] ?? null;
};

// ─── Fonctions admin — missions ───────────────────────────────────────────────

/**
 * Liste toutes les missions avec le nom de l'artisan
 * et les compteurs de soumissions (total, en attente, validées).
 */
export const adminGetMissions = async (filters: MissionFilters) => {
    const conditions: string[] = ['gm.deleted_at IS NULL'];
    const params: Record<string, any> = {};

    if (filters.status !== undefined) {
        conditions.push('gm.status = :status');
        params.status = filters.status;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    return query(`
        SELECT
            gm.*,
            COALESCE(u.full_name, gm.external_name, 'Client externe') AS artisan_name,
            COALESCE(u.email, gm.external_email)                       AS artisan_email,
            ap.company_name,
            COUNT(DISTINCT gs.id)                                               AS total_submissions,
            COUNT(DISTINCT CASE WHEN gs.status = 'pending'   THEN gs.id END)   AS pending_count,
            COUNT(DISTINCT CASE WHEN gs.status = 'validated' THEN gs.id END)   AS validated_count
        FROM geo_missions gm
        LEFT JOIN users u ON u.id = gm.artisan_id
        LEFT JOIN artisans_profiles ap ON ap.user_id = gm.artisan_id
        LEFT JOIN geo_submissions gs ON gs.mission_id = gm.id AND gs.deleted_at IS NULL
        ${where}
        GROUP BY
            gm.id, u.full_name, u.email, ap.company_name, gm.external_name, gm.external_email
        ORDER BY gm.created_at DESC
    `, params);
};

/**
 * Crée une nouvelle mission GEO (UUID).
 */
export const adminCreateMission = async (data: CreateMissionData) => {
    const id = uuidv4();
    await query(`
        INSERT INTO geo_missions
            (id, artisan_id, fiche_id, external_name, external_email,
             name, activity_type, city, website, phone, address,
             description, citation_target, reward_per_submission, status, created_at)
        VALUES
            (:id, :artisan_id, :fiche_id, :external_name, :external_email,
             :name, :activity_type, :city, :website, :phone, :address,
             :description, :citation_target, :reward_per_submission, :status, NOW())
    `, {
        id,
        artisan_id: data.artisan_id ?? null,
        fiche_id: data.fiche_id ?? null,
        external_name: data.external_name ?? null,
        external_email: data.external_email ?? null,
        name: data.name,
        activity_type: data.activity_type,
        city: data.city,
        website: data.website ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        description: data.description ?? null,
        citation_target: data.citation_target ?? 30,
        reward_per_submission: data.reward_per_submission ?? 0.15,
        status: data.status ?? 'active',
    });

    const rows: any[] = await query(`SELECT * FROM geo_missions WHERE id = :id`, { id });
    return rows[0];
};

/**
 * Met à jour les champs fournis d'une mission existante (soft-delete préservé).
 */
export const adminUpdateMission = async (id: string, data: Partial<CreateMissionData & { status: string }>) => {
    const allowed = ['name', 'activity_type', 'city', 'website', 'phone', 'address', 'description', 'citation_target', 'reward_per_submission', 'status', 'external_name', 'external_email'];
    const setClauses: string[] = [];
    const params: Record<string, any> = { id };

    for (const key of allowed) {
        if (key in data) {
            setClauses.push(`${key} = :${key}`);
            params[key] = (data as any)[key];
        }
    }

    if (setClauses.length === 0) return null;

    await query(`
        UPDATE geo_missions SET ${setClauses.join(', ')} WHERE id = :id AND deleted_at IS NULL
    `, params);

    const rows: any[] = await query(`SELECT * FROM geo_missions WHERE id = :id`, { id });
    return rows[0] ?? null;
};

/**
 * Soft-delete une mission (et ses soumissions associées).
 */
export const adminDeleteMission = async (id: string) => {
    await query(`
        UPDATE geo_missions SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL
    `, { id });
    await query(`
        UPDATE geo_submissions SET deleted_at = NOW() WHERE mission_id = :id AND deleted_at IS NULL
    `, { id });
};

// ─── Fonctions admin — soumissions ────────────────────────────────────────────

/**
 * Liste les soumissions avec infos mission, plateforme, guide (nom + email).
 * Filtres optionnels : status, missionId.
 */
export const adminGetSubmissions = async (filters: SubmissionFilters) => {
    const conditions: string[] = ['gs.deleted_at IS NULL'];
    const params: Record<string, any> = {};

    if (filters.status !== undefined) {
        conditions.push('gs.status = :status');
        params.status = filters.status;
    }
    if (filters.missionId !== undefined) {
        conditions.push('gs.mission_id = :missionId');
        params.missionId = filters.missionId;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    return query(`
        SELECT
            gs.id,
            gs.submission_url,
            gs.screenshot_url,
            gs.status,
            gs.rejection_reason,
            gs.earnings,
            gs.created_at,
            gs.validated_at,
            -- Mission
            gm.id   AS mission_id,
            gm.name AS mission_name,
            gm.city AS mission_city,
            -- Plateforme
            gp.id   AS platform_id,
            gp.name AS platform_name,
            gp.url  AS platform_url,
            gp.category AS platform_category,
            gp.reward_amount,
            -- Guide
            u.id         AS guide_id,
            u.full_name  AS guide_name,
            u.email      AS guide_email
        FROM geo_submissions gs
        JOIN geo_missions  gm ON gm.id = gs.mission_id
        JOIN geo_platforms gp ON gp.id = gs.platform_id
        JOIN users         u  ON u.id  = gs.guide_id
        ${where}
        ORDER BY gs.created_at DESC
    `, params);
};

/**
 * Valide ou rejette une soumission.
 * Si validée : met à jour les earnings avec le reward_amount de la plateforme,
 * dans une transaction pour garantir la cohérence.
 */
export const adminValidateSubmission = async (
    id: string,
    status: 'validated' | 'rejected',
    rejectionReason: string | undefined,
    adminId: string
) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Récupère la soumission + le reward de la plateforme associée
        const [rows]: any = await conn.execute(
            `SELECT gs.id, gs.status, gp.reward_amount
             FROM geo_submissions gs
             JOIN geo_platforms gp ON gp.id = gs.platform_id
             WHERE gs.id = ? AND gs.deleted_at IS NULL`,
            [id]
        );

        if (!rows || rows.length === 0) {
            await conn.rollback();
            return null;
        }

        const submission = rows[0];
        const earnings = status === 'validated' ? submission.reward_amount : 0.00;

        await conn.execute(
            `UPDATE geo_submissions
             SET status           = ?,
                 rejection_reason = ?,
                 validated_by     = ?,
                 validated_at     = NOW(),
                 earnings         = ?
             WHERE id = ?`,
            [status, rejectionReason ?? null, adminId, earnings, id]
        );

        await conn.commit();

        // Retourne la ligne mise à jour
        const [updated]: any = await conn.execute(
            `SELECT * FROM geo_submissions WHERE id = ?`,
            [id]
        );
        return updated[0] ?? null;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};
