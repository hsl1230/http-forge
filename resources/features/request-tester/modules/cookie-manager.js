/**
 * HTTP Tester Core - Cookie Manager Module
 * Client-side cookie management for scripts
 */

/**
 * Create a cookie manager for client-side cookie operations
 * @param {Object} options
 * @param {Function} options.postMessage - Function to send messages to extension
 * @returns {Object} Cookie manager interface
 */
function createCookieManager({ postMessage }) {
    // Local cookie cache (synced with extension)
    let cookieCache = {};

    return {
        /**
         * Load cookies from flat array into domain-keyed cache
         * Called when cookies are received from the extension
         * @param {Array} cookies - Array of cookie objects with domain property
         */
        loadCookies(cookies) {
            cookieCache = {};
            if (!Array.isArray(cookies)) {
                // If already domain-keyed, just use it
                cookieCache = cookies || {};
                return;
            }
            // Convert flat array to domain-keyed structure
            for (const cookie of cookies) {
                const domain = cookie.domain || '_default';
                if (!cookieCache[domain]) {
                    cookieCache[domain] = [];
                }
                cookieCache[domain].push(cookie);
            }
        },

        /**
         * Get a cookie value by name
         * @param {string} name - Cookie name
         * @param {string} [domain] - Optional domain filter
         * @returns {string|undefined}
         */
        get(name, domain) {
            if (domain && cookieCache[domain]) {
                const cookie = cookieCache[domain].find(c => c.name === name);
                return cookie?.value;
            }
            // Search all domains
            for (const cookies of Object.values(cookieCache)) {
                const cookie = cookies.find(c => c.name === name);
                if (cookie) return cookie.value;
            }
            return undefined;
        },

        /**
         * Set a cookie
         * @param {string} name - Cookie name
         * @param {string} value - Cookie value
         * @param {Object} [options] - Cookie options
         * @param {string} [options.domain] - Cookie domain
         * @param {string} [options.path] - Cookie path
         * @param {number} [options.expires] - Expiry timestamp
         * @param {boolean} [options.httpOnly] - HTTP only flag
         * @param {boolean} [options.secure] - Secure flag
         */
        set(name, value, options = {}) {
            const cookie = {
                name,
                value,
                domain: options.domain || '',
                path: options.path || '/',
                expires: options.expires,
                httpOnly: options.httpOnly || false,
                secure: options.secure || false
            };

            // Update local cache
            const domain = cookie.domain || '_default';
            if (!cookieCache[domain]) {
                cookieCache[domain] = [];
            }
            const idx = cookieCache[domain].findIndex(c => c.name === name);
            if (idx >= 0) {
                cookieCache[domain][idx] = cookie;
            } else {
                cookieCache[domain].push(cookie);
            }

            // Send to extension for persistence
            postMessage({
                command: 'setCookie',
                cookie
            });
        },

        /**
         * Check if a cookie exists
         * @param {string} name - Cookie name
         * @param {string} [domain] - Optional domain filter
         * @returns {boolean}
         */
        has(name, domain) {
            return this.get(name, domain) !== undefined;
        },

        /**
         * Get all cookies
         * @param {string} [domain] - Optional domain filter
         * @returns {Array}
         */
        getAll(domain) {
            if (domain) {
                return cookieCache[domain] || [];
            }
            const all = [];
            for (const cookies of Object.values(cookieCache)) {
                all.push(...cookies);
            }
            return all;
        },

        /**
         * Delete a cookie
         * @param {string} name - Cookie name
         * @param {string} [domain] - Optional domain filter
         */
        delete(name, domain) {
            if (domain && cookieCache[domain]) {
                cookieCache[domain] = cookieCache[domain].filter(c => c.name !== name);
            } else {
                for (const d of Object.keys(cookieCache)) {
                    cookieCache[d] = cookieCache[d].filter(c => c.name !== name);
                }
            }

            postMessage({
                command: 'deleteCookie',
                name,
                domain
            });
        },

        /**
         * Clear all cookies
         * @param {string} [domain] - Optional domain filter
         */
        clear(domain) {
            if (domain) {
                delete cookieCache[domain];
            } else {
                cookieCache = {};
            }

            postMessage({
                command: 'clearCookies',
                domain
            });
        },

        /**
         * Get the raw cookie cache
         * @returns {Object}
         */
        getRawCache() {
            return { ...cookieCache };
        }
    };
}

// ES Module export
export { createCookieManager };

