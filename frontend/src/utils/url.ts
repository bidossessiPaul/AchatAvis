/**
 * Utility to ensure a file URL is absolute and points to the correct backend API
 */
export const getFileUrl = (path: string | null | undefined): string => {
    if (!path) return '';

    // If it's already an absolute URL (http/https), return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // If it's a data URI or blob, return as is
    if (path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    // Get API base URL from environment
    let apiBase = import.meta.env.VITE_API_BASE_URL || '';
    apiBase = apiBase.trim().replace(/\/$/, '');

    // If apiBase is empty or a relative /api (development proxy)
    if (!apiBase || apiBase === '/api') {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        // If it's already an /api path, return it directly for the proxy
        if (cleanPath.startsWith('/api')) return cleanPath;
        // Otherwise prefix with /api
        return `/api${cleanPath}`;
    }

    // In production, ensure we use the full absolute URL
    // remove potential duplicate /api if path already has it
    let cleanPath = path;
    if (cleanPath.startsWith('/api')) {
        cleanPath = cleanPath.substring(4);
    }
    if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
    }

    // Return full absolute URL
    return `${apiBase}${cleanPath}`;
};
