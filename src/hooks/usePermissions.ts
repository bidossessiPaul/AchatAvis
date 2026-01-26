import { useAuthStore } from '../context/authStore';

export const usePermissions = () => {
    const user = useAuthStore((state) => state.user);

    /**
     * Check if user has a specific permission
     * Super admins (no permissions object) have access to everything
     */
    const hasPermission = (permissionKey: string): boolean => {
        if (!user || user.role !== 'admin') return false;

        // Super admin (no permissions or empty permissions) has all access
        if (!user.permissions || Object.keys(user.permissions).length === 0) {
            return true;
        }

        // Check specific permission
        return user.permissions[permissionKey] === true;
    };

    /**
     * Check if user has ANY of the specified permissions
     */
    const hasAnyPermission = (permissionKeys: string[]): boolean => {
        return permissionKeys.some(key => hasPermission(key));
    };

    /**
     * Check if user has ALL of the specified permissions
     */
    const hasAllPermissions = (permissionKeys: string[]): boolean => {
        return permissionKeys.every(key => hasPermission(key));
    };

    /**
     * Check if user is a super admin (no restrictions)
     */
    const isSuperAdmin = (): boolean => {
        if (!user || user.role !== 'admin') return false;
        // The main admin is always a super admin
        if (user.email === 'dossoumaxime888@gmail.com') return true;
        // Others are super admins only if they have no restricted permissions object
        return !user.permissions || Object.keys(user.permissions).length === 0;
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isSuperAdmin,
        permissions: user?.permissions || {},
    };
};
