/**
 * IP Geolocation utility
 * Uses ipwho.is (free, unlimited, no API key required)
 * Fallback: ip-api.com
 */
import axios from 'axios';
import { Request } from 'express';

export interface GeoLocation {
    ip: string;
    country: string | null;
    country_code: string | null;
    city: string | null;
    region: string | null;
    isp: string | null;
    is_vpn: boolean;
}

/**
 * Extract the real client IP from a request, respecting proxies.
 */
export const getClientIp = (req: Request): string | null => {
    // DEV override: allow forcing a public IP for local testing (e.g. DEV_FAKE_IP=8.8.8.8)
    if (process.env.DEV_FAKE_IP && process.env.NODE_ENV !== 'production') {
        return process.env.DEV_FAKE_IP;
    }

    // x-forwarded-for can contain a comma-separated list: "client, proxy1, proxy2"
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        const ips = Array.isArray(xForwardedFor)
            ? xForwardedFor[0]
            : xForwardedFor.split(',')[0].trim();
        if (ips) return ips;
    }
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string') return xRealIp;

    const ip = req.socket?.remoteAddress || req.ip || null;
    // Strip IPv6 prefix for IPv4 addresses
    if (ip && ip.startsWith('::ffff:')) return ip.substring(7);
    return ip;
};

const isPrivateIp = (ip: string): boolean => {
    if (!ip) return true;
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
};

/**
 * Geolocate an IP address. Returns null on failure (never throws).
 */
export const geolocateIp = async (ip: string): Promise<GeoLocation | null> => {
    if (!ip || isPrivateIp(ip)) {
        return null;
    }

    // Primary: ipwho.is (free, unlimited, no key)
    try {
        const { data } = await axios.get(`https://ipwho.is/${ip}`, { timeout: 5000 });
        if (data && data.success !== false) {
            return {
                ip,
                country: data.country || null,
                country_code: data.country_code || null,
                city: data.city || null,
                region: data.region || null,
                isp: data.connection?.isp || data.connection?.org || null,
                is_vpn: false, // ipwho.is doesn't detect VPN on free tier
            };
        }
    } catch (err) {
        // Fall through to backup
    }

    // Fallback: ip-api.com (free for non-commercial, 45 req/min)
    try {
        const { data } = await axios.get(
            `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,isp,proxy,hosting`,
            { timeout: 5000 }
        );
        if (data && data.status === 'success') {
            return {
                ip,
                country: data.country || null,
                country_code: data.countryCode || null,
                city: data.city || null,
                region: data.regionName || null,
                isp: data.isp || null,
                is_vpn: Boolean(data.proxy || data.hosting),
            };
        }
    } catch (err) {
        // Silent failure
    }

    return null;
};
