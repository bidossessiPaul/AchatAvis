/** Convert ISO 3166-1 alpha-2 country code to emoji flag. */
export const countryCodeToFlag = (code?: string | null): string => {
    if (!code || code.length !== 2) return '';
    return code
        .toUpperCase()
        .split('')
        .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
        .join('');
};
