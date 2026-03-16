/**
 * URL Builder Module
 * Single Responsibility: Build URLs from patterns and parameters
 */

/**
 * Build a URL path from an Express.js/path-to-regexp pattern.
 * 
 * Handles patterns like:
 * - :param - required parameter
 * - :param? - optional parameter
 * - :param(regex) - parameter with regex constraint
 * - :param(regex)? - optional parameter with regex constraint
 * 
 * @param {string} pattern - The Express.js route pattern
 * @param {Object} params - Object containing parameter values
 * @returns {string} The built URL path with parameters substituted
 */
function buildPathFromPattern(pattern, params) {
    const paramRegex = /:(\w+)(?:\([^)]*\))?(\?)?/g;
    
    let result = pattern.replace(paramRegex, (match, paramName, isOptional) => {
        const value = params[paramName];
        
        if (value !== undefined && value !== '') {
            return encodeURIComponent(value);
        }
        
        if (isOptional) {
            return ''; // Optional param with no value - remove it
        }
        
        // Required param with no value - leave placeholder for visibility
        return `:${paramName}`;
    });

    // Clean up any double slashes that might result from removed optional params
    result = result.replace(/\/+/g, '/');
    
    // Remove trailing slash if present (unless it's the root path)
    if (result.length > 1 && result.endsWith('/')) {
        result = result.slice(0, -1);
    }

    return result;
}

/**
 * Build a query string from query parameters
 * @param {Array<{key: string, value: string, enabled: boolean}>} queryParams
 * @returns {string} Query string (without leading ?)
 */
function buildQueryString(queryParams) {
    const params = new URLSearchParams();
    queryParams.forEach(({ key, value, enabled }) => {
        if (key && value && enabled) {
            params.append(key, value);
        }
    });
    return params.toString();
}

/**
 * Build full URL preview
 * @param {string} pattern - URL pattern (already includes {{baseUrl}} for endpoint mode)
 * @param {Object} pathParams - Path parameters
 * @param {Array} queryParams - Query parameters
 * @returns {string} Full URL preview
 */
function buildUrlPreview(pattern, pathParams, queryParams) {
    let path = buildPathFromPattern(pattern, pathParams);
    const queryString = buildQueryString(queryParams);
    
    return queryString 
        ? `${path}?${queryString}`
        : path;
}

// ES Module export
export { buildPathFromPattern, buildQueryString, buildUrlPreview };

