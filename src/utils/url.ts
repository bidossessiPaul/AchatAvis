/**
 * Utility to ensure a file URL is absolute and points to the correct backend API or Cloudinary
 */
export const getFileUrl = (path: string | null | undefined): string => {
    if (!path) return '';

    // If it's already an absolute URL (including Cloudinary), return as is
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
        return path;
    }

    // Get API base URL
    let apiRoot = import.meta.env.VITE_API_BASE_URL || '';

    // In production environment (browser, not localhost), 
    // force absolute URL using current origin if apiRoot is relative
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
        if (!apiRoot.startsWith('http')) {
            // Force use current domain as base
            apiRoot = `${window.location.origin}/api`;
        }
    } else if (!apiRoot) {
        apiRoot = '/api';
    }

    // Clean apiRoot (remove trailing slash)
    apiRoot = apiRoot.trim().replace(/\/$/, '');

    // Clean path (remove leading /api if it exists to avoid duplication)
    let cleanPath = path;
    if (cleanPath.startsWith('/api')) {
        cleanPath = cleanPath.substring(4);
    }
    if (!cleanPath.startsWith('/')) {
        cleanPath = `/${cleanPath}`;
    }

    // Construct final URL and fix potential double slashes
    const finalUrl = `${apiRoot}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");

    return finalUrl;
};
