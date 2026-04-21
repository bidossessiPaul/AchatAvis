import type { User } from '../types';

/**
 * Liste ordonnée des pages admin avec leurs permissions requises.
 * Utilisée pour rediriger un admin vers la première page à laquelle il a accès
 * (après login ou depuis une page publique), au lieu de toujours le renvoyer sur
 * `/admin` qui demande `can_view_stats`.
 *
 * Doit rester alignée avec les PermissionGuard des routes `/admin/*` dans App.tsx.
 */
const ADMIN_LANDING_ROUTES: { path: string; permissions: string[] }[] = [
    { path: '/admin', permissions: ['can_view_stats'] },
    { path: '/admin/reviews', permissions: ['can_manage_reviews', 'can_validate_reviews'] },
    { path: '/admin/artisans', permissions: ['can_manage_users', 'can_validate_profiles'] },
    { path: '/admin/guides', permissions: ['can_manage_users', 'can_validate_profiles'] },
    { path: '/admin/fiches', permissions: ['can_manage_fiches', 'can_validate_fiches'] },
    { path: '/admin/identity-verifications', permissions: ['can_manage_users', 'can_validate_profiles'] },
    { path: '/admin/gmail-accounts', permissions: ['can_manage_users', 'can_validate_profiles'] },
    { path: '/admin/trust-scores', permissions: ['can_manage_trust_scores'] },
    { path: '/admin/communiques', permissions: ['can_manage_sectors'] },
    { path: '/admin/sectors', permissions: ['can_manage_sectors'] },
    { path: '/admin/payments', permissions: ['can_view_payments'] },
    { path: '/admin/guides-balances', permissions: ['can_view_payments'] },
    { path: '/admin/subscriptions', permissions: ['can_view_payments'] },
    { path: '/admin/packs', permissions: ['can_manage_packs'] },
    { path: '/admin/team', permissions: ['can_manage_team'] },
];

/**
 * Retourne la première route admin à laquelle l'utilisateur a accès selon ses
 * permissions. Owner et super-admin (permissions vides/null) atterrissent sur
 * `/admin`. Fallback `/profile` (toujours accessible) si aucune permission.
 */
export const pickAdminLandingRoute = (user: Pick<User, 'email' | 'permissions'> | null | undefined): string => {
    if (!user) return '/admin';
    if (user.email === 'dossoumaxime888@gmail.com') return '/admin';

    const perms = user.permissions as Record<string, boolean> | null | undefined;
    if (!perms || Object.keys(perms).length === 0) return '/admin';

    const match = ADMIN_LANDING_ROUTES.find(route =>
        route.permissions.some(p => perms[p] === true)
    );
    return match ? match.path : '/profile';
};
