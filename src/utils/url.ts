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

    // Get API base URL from environment (similar to api.ts)
    let apiBase = import.meta.env.VITE_API_BASE_URL || '';

    // Clean apiBase (remove trailing slash)
    apiBase = apiBase.trim().replace(/\/$/, '');

    // If API base is relative (proxy used), ensure it has a leading slash
    if (apiBase === '/api' || !apiBase.startsWith('http')) {
        // Path already starts with /api (from backend)
        if (path.startsWith('/api')) {
            return path;
        }
        return `/api${path.startsWith('/') ? '' : '/'}${path}`;
    }

    // Path already starts with /api (from backend), so we don't want to double it
    // But we need to make sure we don't end up with api.com/api//api/...
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    return `${apiBase}${cleanPath}`;
};
