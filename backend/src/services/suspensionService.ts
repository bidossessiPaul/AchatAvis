import { query, pool } from '../config/database';
import { sendSuspensionEmail, sendSuspensionLiftedEmail } from './emailService';
// import { notificationService } from './notificationService'; // Planifié pour plus tard

interface SuspensionConfig {
  is_enabled: boolean;
  auto_suspend_enabled: boolean;
  manual_suspend_only: boolean;
  max_warnings_before_suspend: number;
  exempted_countries: string[];
  exempted_user_ids: string[];
  blocked_countries: string[];
}

class SuspensionService {
  /**
   * Check if the suspension system is active
   */
  async isSystemEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    const enabled = !!config?.is_enabled;
    console.log(`🔍 SUSPENSION SERVICE: isSystemEnabled returning ${enabled} (raw value: ${config?.is_enabled})`);
    return enabled;
  }

  /**
   * Get current system configuration
   */
  async getConfig(): Promise<SuspensionConfig | null> {
    const result: any = await query('SELECT * FROM suspension_config LIMIT 1');
    if (!result || result.length === 0) return null;

    const config = result[0];
    return {
      ...config,
      exempted_countries: typeof config.exempted_countries === 'string' ? JSON.parse(config.exempted_countries) : (config.exempted_countries || []),
      exempted_user_ids: typeof config.exempted_user_ids === 'string' ? JSON.parse(config.exempted_user_ids) : (config.exempted_user_ids || []),
      blocked_countries: typeof config.blocked_countries === 'string' ? JSON.parse(config.blocked_countries) : (config.blocked_countries || [])
    };
  }

  /**
   * Check if a user is exempted from automatic suspensions
   */
  async isUserExempted(userId: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config) return false;

    if (config.exempted_user_ids.includes(userId)) return true;

    // Check user's country (this might need the user's profile info)
    // const user: any = await query('SELECT status FROM users WHERE id = ?', [userId]);
    // For now, country check is placeholder as we don't have country_code in users table yet in CI/BJ context
    // but the requirement mentioned CI/BJ countries. 
    // If we add country_code to users later, we can implement it here.

    return false;
  }

  /**
   * Detect country from IP address
   */
  async detectCountryFromIP(ip: string): Promise<string | null> {
    try {
      // Skip local IPs
      if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        return 'FR'; // Default to FR for local development
      }

      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data: any = await response.json();

      if (data.status === 'success') {
        return data.countryCode; // ISO 3166-1 alpha-2
      }
      return null;
    } catch (error) {
      console.error('Error detecting country from IP:', error);
      return null;
    }
  }

  /**
   * Check if a country is blocked
   */
  async isCountryBlocked(countryCode: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config || !config.blocked_countries) return false;

    return config.blocked_countries.includes(countryCode.toUpperCase());
  }

  /**
   * Force suspension for geoblocking violation
   */
  async suspendForGeoblocking(userId: string, country: string): Promise<void> {
    const activeSuspension = await this.getActiveSuspension(userId);
    if (activeSuspension) return; // Already suspended

    const level = await this.determineNextLevel(userId);
    await this.createSuspension(
      userId,
      level.id,
      'vpn_proxy_detected',
      `Suspension automatique : Tentative d'accès depuis un pays non autorisé (${country})`
    );
  }

  /**
   * Detect violation and decide on sanction (Warning or Suspension)
   */
  async detectAndSuspend(
    userId: string,
    reasonCategory: 'spam_submissions' | 'sector_cooldown_violation' | 'invalid_proofs_repeated' | 'identical_reviews' | 'vpn_proxy_detected' | 'multi_accounting' | 'manual_admin' | 'other',
    reasonDetails: string,
    triggerProofId?: string
  ): Promise<{ suspended: boolean; warning?: boolean; suspension_id?: number }> {

    try {
      if (!(await this.isSystemEnabled())) return { suspended: false };
      if (await this.isUserExempted(userId)) return { suspended: false };

      const activeSuspension = await this.getActiveSuspension(userId);
      if (activeSuspension) {
        await this.handleRecidiveDuringSuspension(userId, activeSuspension, reasonCategory, reasonDetails);
        return { suspended: true, suspension_id: activeSuspension.id };
      }

      const config = await this.getConfig();
      const warningCount = await this.getActiveWarningsCount(userId);

      if (warningCount < (config?.max_warnings_before_suspend || 3)) {
        await this.createWarning(userId, reasonCategory, reasonDetails, triggerProofId);
        return { suspended: false, warning: true };
      }

      // Create suspension
      const level = await this.determineNextLevel(userId);
      const suspensionId = await this.createSuspension(userId, level.id, reasonCategory, reasonDetails, triggerProofId);

      return { suspended: true, suspension_id: suspensionId };
    } catch (error) {
      console.error('Error in detectAndSuspend:', error);
      throw error;
    }
  }

  async createWarning(userId: string, type: string, message: string, proofId?: string): Promise<void> {
    await query(
      `INSERT INTO suspension_warnings (user_id, warning_type, warning_message, trigger_proof_id, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, type, message, proofId || null]
    );

    await query('UPDATE users SET warning_count = warning_count + 1 WHERE id = ?', [userId]);

    // Notification logic here
    console.log(`Warning issued for user ${userId}: ${message}`);
  }

  async determineNextLevel(userId: string): Promise<any> {
    const history: any = await query(
      'SELECT suspension_level FROM suspension_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    let nextLevelNumber = 1;
    if (history && history.length > 0) {
      nextLevelNumber = Math.min(5, (history[0].suspension_level || 0) + 1);
    }

    const level: any = await query('SELECT * FROM suspension_levels WHERE level_number = ?', [nextLevelNumber]);
    if (!level || level.length === 0) {
      // Fallback to Level 1 if not found
      const fallback: any = await query('SELECT * FROM suspension_levels LIMIT 1');
      if (!fallback || fallback.length === 0) throw new Error("Critical: No suspension levels configured in database");
      return fallback[0];
    }

    return level[0];
  }

  async createSuspension(userId: string, levelId: number, category: string, details: string, proofId?: string, adminNotes?: string): Promise<number> {
    // Prevent double suspension
    const existing: any = await query('SELECT id FROM user_suspensions WHERE user_id = ? AND is_active = true', [userId]);
    if (existing && existing.length > 0) {
      throw new Error("Cet utilisateur est déjà suspendu. Vous ne pouvez pas suspendre un compte deux fois sans lever la suspension précédente.");
    }

    const level: any = await query('SELECT * FROM suspension_levels WHERE id = ?', [levelId]);
    if (!level || level.length === 0) throw new Error(`Level ID ${levelId} not found`);

    const duration = level[0].duration_days || 1;
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + duration);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result]: any = await connection.query(
        `INSERT INTO user_suspensions (user_id, suspension_level_id, reason_category, reason_details, trigger_proof_id, admin_notes, started_at, ends_at, days_total, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, true)`,
        [userId, levelId, category, details, proofId || null, adminNotes || null, endsAt, duration]
      );

      const suspensionId = result.insertId;

      await connection.query(
        `UPDATE users SET status = 'suspended', suspension_count = suspension_count + 1, last_suspended_at = NOW() WHERE id = ?`,
        [userId]
      );

      await connection.query(
        `INSERT INTO suspension_history (user_id, suspension_level, level_name, reason_category, reason_details, started_at, ended_at, duration_days, was_lifted_early, outcome) 
         VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, false, 'completed')`,
        [userId, level[0].level_number, level[0].level_name, category, details, endsAt, duration]
      );

      await connection.commit();

      // Send email notification
      const user: any = await query('SELECT email, full_name FROM users WHERE id = ?', [userId]);
      if (user && user.length > 0) {
        try {
          await sendSuspensionEmail(user[0].email, user[0].full_name, level[0], details);
        } catch (emailErr) {
          console.error("Non-blocking email failure:", emailErr);
        }
      }

      return suspensionId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async handleRecidiveDuringSuspension(userId: string, current: any, category: string, details: string): Promise<void> {
    // Escalate immediately
    await query('UPDATE user_suspensions SET is_active = false, lifted_at = NOW(), lift_reason = "Escalade par récidive" WHERE id = ?', [current.id]);
    const nextLevel = await this.determineNextLevel(userId);
    await this.createSuspension(userId, nextLevel.id, category, `Récidive pendant suspension : ${details}`);
  }

  async getActiveSuspension(userId: string): Promise<any | null> {
    const result: any = await query(
      `SELECT us.*, sl.level_number, sl.level_name, sl.badge_color, sl.icon_emoji, sl.consequences, sl.requirements_to_lift
       FROM user_suspensions us
       JOIN suspension_levels sl ON us.suspension_level_id = sl.id
       WHERE us.user_id = ? AND us.is_active = true
       ORDER BY us.started_at DESC LIMIT 1`,
      [userId]
    );
    if (!result || result.length === 0) return null;

    const suspension = result[0];
    return {
      ...suspension,
      consequences: typeof suspension.consequences === 'string' ? JSON.parse(suspension.consequences) : suspension.consequences,
      requirements_to_lift: typeof suspension.requirements_to_lift === 'string' ? JSON.parse(suspension.requirements_to_lift) : suspension.requirements_to_lift
    };
  }

  async getActiveWarningsCount(userId: string): Promise<number> {
    const result: any = await query(
      'SELECT COUNT(*) as count FROM suspension_warnings WHERE user_id = ? AND is_resolved = false AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)',
      [userId]
    );
    return result?.[0]?.count || 0;
  }

  async liftSuspension(suspensionId: number, adminId: string, reason: string): Promise<void> {
    const suspension: any = await query('SELECT user_id FROM user_suspensions WHERE id = ?', [suspensionId]);
    if (!suspension || suspension.length === 0) return;

    await query(
      `UPDATE user_suspensions SET is_active = false, lifted_at = NOW(), lifted_by_admin_id = ?, lift_reason = ? WHERE id = ?`,
      [adminId, reason, suspensionId]
    );

    // Check if other active suspensions exist
    const other: any = await query('SELECT id FROM user_suspensions WHERE user_id = ? AND is_active = true', [suspension[0].user_id]);
    if (!other || other.length === 0) {
      await query('UPDATE users SET status = "active" WHERE id = ?', [suspension[0].user_id]);
    }

    const user: any = await query('SELECT email, full_name FROM users WHERE id = ?', [suspension[0].user_id]);
    if (user && user.length > 0) {
      await sendSuspensionLiftedEmail(user[0].email, user[0].full_name, reason);
    }
  }

  async autoLiftExpiredSuspensions(): Promise<void> {
    const expired: any = await query(
      `SELECT us.id, us.user_id FROM user_suspensions us
       JOIN suspension_levels sl ON us.suspension_level_id = sl.id
       WHERE us.is_active = true AND us.ends_at <= NOW() AND sl.auto_lift_after_duration = true`
    );

    for (const susp of expired) {
      await query('UPDATE user_suspensions SET is_active = false, auto_lifted = true, lifted_at = NOW(), lift_reason = "Expiration automatique" WHERE id = ?', [susp.id]);

      const other: any = await query('SELECT id FROM user_suspensions WHERE user_id = ? AND is_active = true', [susp.user_id]);
      if (!other || other.length === 0) {
        await query('UPDATE users SET status = "active" WHERE id = ?', [susp.user_id]);
      }
    }
  }
}

export const suspensionService = new SuspensionService();
export default suspensionService;
