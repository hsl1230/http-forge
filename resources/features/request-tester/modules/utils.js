/**
 * HTTP Tester Core - Utilities Module
 * Common utility functions shared across panels
 */

/**
 * Escape HTML special characters
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (!str) return '';
    // Use string replacement to escape HTML special characters
    // This ensures proper escaping for use in HTML attributes (including quotes)
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format timestamp to readable string
 * @param {number} timestamp
 * @returns {string}
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format duration with comma separators
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "11,234ms")
 */
function formatDuration(ms) {
    return ms.toLocaleString() + 'ms';
}

/**
 * Create a case-insensitive Map for HTTP headers
 * HTTP headers are case-insensitive per RFC 7230
 * @returns {Object} Case-insensitive map interface
 */
function createCaseInsensitiveMap() {
    const map = new Map();
    
    return {
        set(key, value) {
            const lowerKey = key.toLowerCase();
            map.set(lowerKey, { originalKey: key, value });
            return this;
        },
        has(key) {
            return map.has(key.toLowerCase());
        },
        get(key) {
            return map.get(key.toLowerCase())?.value;
        },
        delete(key) {
            return map.delete(key.toLowerCase());
        },
        keys() {
            return Array.from(map.values()).map(v => v.originalKey);
        },
        forEach(callback) {
            map.forEach(({ originalKey, value }) => {
                callback(value, originalKey);
            });
        },
        size() {
            return map.size;
        }
    };
}

/**
 * Deep clone an object
 * @param {Object} obj
 * @returns {Object}
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Determine whether a response (headers + body) should be treated as HTML.
 * - checks Content-Type header for "html"
 * - falls back to a simple heuristic: body starts with "<"
 * @param {Object} resp - Object with optional `headers` and `body` properties
 * @returns {boolean}
 */
function isHtmlResponse(resp) {
    if (!resp) return false;
    const body = resp.body;
    const headers = resp.headers || {};
    if (!body) return false;

    const contentType = (headers['content-type'] || headers['Content-Type'] || headers['Content-type'] || '') + '';
    if (typeof contentType === 'string' && contentType.toLowerCase().includes('html')) return true;

    if (typeof body === 'string' && body.trim().startsWith('<')) return true;

    return false;
}

/**
 * Generate a unique ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ES Module export
export {
    createCaseInsensitiveMap,
    debounce,
    deepClone,
    escapeHtml, formatDuration,
    formatTime,
    generateId,
    generateUUID, isHtmlResponse
};



