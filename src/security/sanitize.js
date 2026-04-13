import DOMPurify from 'dompurify';

/**
 * Strip all HTML/XSS from arbitrary user text.
 * Returns plain text only.
 */
export function sanitizeText(text) {
    return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize a username: allow only alphanumeric chars and underscores.
 * Strips everything else and trims.
 */
export function sanitizeUsername(username) {
    return username.trim().replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Sanitize a display name: strip HTML, trim whitespace.
 */
export function sanitizeDisplayName(name) {
    return DOMPurify.sanitize(name, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Validate a confession's text after sanitization.
 * Throws descriptive errors on failure.
 */
export function validateConfession(text) {
    if (!text || text.trim().length === 0) {
        throw new Error('Confession cannot be empty.');
    }
    if (text.trim().length > 5000) {
        throw new Error('Confession is too long (max 5000 characters).');
    }
    return text.trim();
}
