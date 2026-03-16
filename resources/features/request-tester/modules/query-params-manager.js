/**
 * Query Parameters Manager Module
 * Single Responsibility: Manage query parameters extraction, parsing, and synchronization
 * 
 * Features:
 * - Two-way sync between URL input and query params table
 * - Parse URL on input change → merge to table
 * - Rebuild URL when table changes
 * - Storage: base URL + query array (separate)
 * 
 * Follows:
 * - SRP: Only handles query parameter logic
 * - OCP: Can be extended without modification via composition
 * - LSP: Can be substituted for any query param handler interface
 * - ISP: Provides minimal focused interface
 * - DIP: Depends on state/formManager abstractions
 */

/**
 * Create a query parameters manager instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.formManager - Form manager instance
 * @param {Function} options.updateUrlPreview - Function to update URL preview
 * @returns {Object} Query params manager interface
 */
function createQueryParamsManager({ state, elements, formManager, updateUrlPreview }) {
    
    /**
     * Parse a URL into base URL and query parameters
     * @param {string} fullUrl - Full URL potentially containing query string
     * @returns {{ baseUrl: string, params: Array<{key: string, value: string, enabled: boolean}> }}
     */
    function parseUrl(fullUrl) {
        if (!fullUrl) {
            return { baseUrl: '', params: [] };
        }
        
        const params = [];
        let baseUrl = fullUrl;
        
        const queryIndex = fullUrl.indexOf('?');
        if (queryIndex === -1) {
            return { baseUrl, params };
        }
        
        baseUrl = fullUrl.substring(0, queryIndex);
        const queryString = fullUrl.substring(queryIndex + 1);
        
        try {
            const urlParams = new URLSearchParams(queryString);
            urlParams.forEach((value, key) => {
                params.push({ key, value, enabled: true });
            });
        } catch (e) {
            console.warn('[QueryParamsManager] Failed to parse query string:', e);
        }
        
        return { baseUrl, params };
    }

    /**
     * Build full URL from base URL and query parameters
     * @param {string} baseUrl - Base URL without query string
     * @param {Array<{key: string, value: string, enabled: boolean}>} params - Query parameters
     * @param {boolean} enabledOnly - Only include enabled params (default: true)
     * @returns {string} Full URL with query string
     */
    function buildFullUrl(baseUrl, params, enabledOnly = true) {
        if (!baseUrl) return '';
        
        const filteredParams = enabledOnly 
            ? params.filter(p => p.enabled && p.key)
            : params.filter(p => p.key);
        
        if (filteredParams.length === 0) {
            return baseUrl;
        }
        
        const queryString = filteredParams
            .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
            .join('&');
        
        return `${baseUrl}?${queryString}`;
    }

    /**
     * Merge parsed params with existing table params
     * - New keys → append to table
     * - Existing keys → update value, enable
     * - Existing disabled keys not in URL → keep as disabled
     * @param {Array} existing - Existing params from table
     * @param {Array} parsed - Params parsed from URL
     * @returns {Array} Merged params
     */
    function mergeParams(existing, parsed) {
        const result = [];
        const parsedKeys = new Set(parsed.map(p => p.key));
        const existingMap = new Map(existing.map(p => [p.key, p]));
        
        // First, process parsed params (update existing or add new)
        for (const p of parsed) {
            const existingParam = existingMap.get(p.key);
            if (existingParam) {
                // Update existing param
                result.push({ key: p.key, value: p.value, enabled: true });
                existingMap.delete(p.key);
            } else {
                // Add new param
                result.push({ key: p.key, value: p.value, enabled: true });
            }
        }
        
        // Then, add remaining existing params (ones not in URL - keep disabled state)
        for (const [key, param] of existingMap) {
            // Params not in URL: if they were enabled, disable them; if disabled, keep disabled
            result.push({ key: param.key, value: param.value, enabled: false });
        }
        
        return result;
    }

    /**
     * Handle URL input change - parse and sync with table (two-way sync)
     * @param {string} fullUrl - Full URL from input
     * @param {Function} setPath - Function to set path (for potential cleanup)
     * @param {boolean} keyEditable - Whether keys are editable
     */
    function handleUrlChange(fullUrl, setPath, keyEditable = true) {
        const { baseUrl, params: parsedParams } = parseUrl(fullUrl);
        
        // Store base URL for later use
        state.baseUrl = baseUrl;
        
        // Merge parsed params with existing table
        const mergedParams = mergeParams(state.queryParams, parsedParams);
        
        // Update state and table
        state.queryParams = mergedParams;
        
        // Re-render table
        if (elements.queryParams) {
            elements.queryParams.innerHTML = '';
        }
        mergedParams.forEach(param => {
            formManager.addParamRow('query', param.key, param.value, true, keyEditable, param.enabled);
        });
        
        // URL stays as-is (already shows full URL)
        // No need to call setPath - user typed the URL
        
        if (updateUrlPreview) {
            updateUrlPreview();
        }
    }

    /**
     * Handle table change - rebuild URL from base + enabled params
     * @param {Function} getPath - Function to get current path
     * @param {Function} setPath - Function to set path
     */
    function handleTableChange(getPath, setPath) {
        const currentUrl = getPath();
        const baseUrl = state.baseUrl || getUrlWithoutQuery(currentUrl);
        
        const newUrl = buildFullUrl(baseUrl, state.queryParams, true);
        
        // Only update if different to avoid cursor jumping
        if (currentUrl !== newUrl) {
            setPath(newUrl);
        }
        
        if (updateUrlPreview) {
            updateUrlPreview();
        }
    }

    /**
     * Get the URL path without query parameters
     * @param {string} url - Full URL
     * @returns {string} URL path without query string
     */
    function getUrlWithoutQuery(url) {
        if (url && url.includes('?')) {
            return url.split('?')[0];
        }
        return url || '';
    }

    /**
     * Build query string from state
     * @returns {string} Query string without leading ?
     */
    function buildQueryString() {
        const params = new URLSearchParams();
        state.queryParams.forEach(({ key, value, enabled }) => {
            if (key && enabled) {
                params.append(key, value || '');
            }
        });
        return params.toString();
    }

    /**
     * Build query object from state (only enabled params)
     * @returns {Object} Query object
     */
    function buildQueryObject() {
        return state.queryParams.reduce((acc, { key, value, enabled }) => {
            if (key && enabled) {
                acc[key] = value;
            }
            return acc;
        }, {});
    }

    /**
     * Check if request has saved query params (array format)
     * @param {Object} request - Request object
     * @returns {boolean}
     */
    function hasSavedQueryParams(request) {
        return request?.query && Array.isArray(request.query) && request.query.length > 0;
    }

    /**
     * Apply saved query params from request and build full URL
     * @param {string} baseUrl - Base URL from collection
     * @param {Array} queryParams - Array of query params from collection
     * @param {Function} setPath - Function to set URL input
     * @param {boolean} keyEditable - Whether keys are editable
     */
    function applyFromCollection(baseUrl, queryParams, setPath, keyEditable = true) {
        // Store base URL
        state.baseUrl = baseUrl || '';
        
        // Set query params state
        state.queryParams = Array.isArray(queryParams) ? [...queryParams] : [];
        
        // Reset and populate metadata map for OpenAPI extended fields
        state._queryMeta = {};
        
        // Clear and populate table
        if (elements.queryParams) {
            elements.queryParams.innerHTML = '';
        }
        state.queryParams.forEach(param => {
            // Extract and store extended metadata (type, required, description, format, enum, deprecated)
            const { key, value, enabled, ...meta } = param;
            if (key && Object.keys(meta).length > 0) {
                state._queryMeta[key] = meta;
            }
            formManager.addParamRow('query', param.key, param.value, true, keyEditable, param.enabled !== false);
        });
        
        // Build and set full URL (base + enabled params)
        const fullUrl = buildFullUrl(state.baseUrl, state.queryParams, true);
        if (setPath) {
            setPath(fullUrl);
        }
        
        if (updateUrlPreview) {
            updateUrlPreview();
        }
    }

    /**
     * Get data for saving to collection
     * @returns {{ baseUrl: string, query: Array }}
     */
    function getDataForSave() {
        return {
            baseUrl: state.baseUrl || '',
            query: state.queryParams.map(p => ({
                key: p.key,
                value: p.value,
                enabled: p.enabled
            }))
        };
    }

    /**
     * Clear all query params
     */
    function clear() {
        if (elements.queryParams) {
            elements.queryParams.innerHTML = '';
        }
        state.queryParams = [];
        state.baseUrl = '';
    }

    return {
        parseUrl,
        buildFullUrl,
        mergeParams,
        handleUrlChange,
        handleTableChange,
        getUrlWithoutQuery,
        buildQueryString,
        buildQueryObject,
        hasSavedQueryParams,
        applyFromCollection,
        getDataForSave,
        clear
    };
}

export { createQueryParamsManager };
