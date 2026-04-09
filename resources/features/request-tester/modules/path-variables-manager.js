/**
 * Path Variables Manager Module
 * Single Responsibility: Manage Express.js style path variables (:param)
 * 
 * Follows:
 * - SRP: Only handles path variable extraction and management
 * - OCP: Pattern matching can be extended via regex configuration
 * - DIP: Depends on state/formManager abstractions
 */

/**
 * Create a path variables manager instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.formManager - Form manager instance
 * @returns {Object} Path variables manager interface
 */
function createPathVariablesManager({ state, elements, formManager }) {
    
    // Regex pattern for Express.js path parameters with optional constraints
    // Matches :param, :param?, :param(regex), :param(regex)?
    // Captures: [1] = param name, [2] = constraint (if any)
    const PARAM_REGEX = /:([a-zA-Z_][a-zA-Z0-9_]*)(?:\(([^)]*)\))?/g;

    /**
     * Parse constraint and determine if it's simple options or complex regex
     * @param {string} constraint - The constraint pattern
     * @returns {{options: string[]|null, pattern: string|null}} 
     *          options: array of values for select box, or null
     *          pattern: regex pattern string for validation, or null
     */
    function parseConstraint(constraint) {
        if (!constraint) return { options: null, pattern: null };
        
        // Check if constraint is a simple pipe-separated list of literals
        // e.g., "TELUS", "MOVIE|SPORTEVENT", "en|fr|es"
        const isSimpleOptions = /^[a-zA-Z0-9_.]+(\|[a-zA-Z0-9_.]+)*$/.test(constraint);
        
        if (isSimpleOptions) {
            return { options: constraint.split('|'), pattern: null };
        }
        
        // Complex regex - return the pattern for validation
        return { options: null, pattern: constraint };
    }

    /**
     * Extract path variables from Express.js pattern
     * @param {string} path - Route pattern like /users/:id
     * @returns {Array<{name: string, constraint: string|null, options: string[]|null, pattern: string|null}>}
     */
    function extractVariables(path) {
        if (!path) return [];
        
        const variables = [];
        let match;
        
        // Reset regex lastIndex to ensure fresh search
        PARAM_REGEX.lastIndex = 0;
        
        while ((match = PARAM_REGEX.exec(path)) !== null) {
            const name = match[1];
            const constraint = match[2] || null;
            const { options, pattern } = parseConstraint(constraint);
            
            variables.push({ name, constraint, options, pattern });
        }
        
        return variables;
    }

    /**
     * Update path variables section based on current path
     * @param {string} path - Current path
     * @param {Object} [params] - Optional params metadata (PathParamEntry map) to extract enum values from
     */
    function updateFromPath(path, params) {
        const variables = extractVariables(path);
        
        // Get current values to preserve them
        const currentValues = { ...state.pathParams };
        
        // Clear path params container
        if (elements.pathParams) {
            elements.pathParams.innerHTML = '';
        }
        
        // Reset path params state
        state.pathParams = {};
        
        // Add rows for each variable
        variables.forEach(({ name: paramName, options, pattern }) => {
            // Params metadata (enum/format) takes priority over URL constraint
            let effectiveOptions = options;
            let effectivePattern = pattern;
            if (params) {
                const entry = params[paramName];
                if (entry && typeof entry === 'object') {
                    if (Array.isArray(entry.enum) && entry.enum.length > 0) {
                        effectiveOptions = entry.enum;
                    }
                    if (entry.format) {
                        effectivePattern = entry.format;
                    }
                    // Pre-populate metadata so the detail panel renders with it
                    const { value: _v, ...meta } = entry;
                    if (Object.keys(meta).length > 0) {
                        if (!state._paramsMeta) state._paramsMeta = {};
                        state._paramsMeta[paramName] = meta;
                    }
                }
            }
            const existingValue = currentValues[paramName] || '';
            state.pathParams[paramName] = existingValue;
            // Pass options for select box, or pattern for input validation
            formManager.addParamRow('path', paramName, existingValue, false, true, true, effectiveOptions, effectivePattern);
        });
    }

    /**
     * Apply environment default values to path params
     * @param {Object} envVariables - Environment variables object
     */
    function applyEnvironmentDefaults(envVariables) {
        if (!envVariables) return;
        
        Object.keys(state.pathParams).forEach(paramName => {
            if (envVariables[paramName] && !state.pathParams[paramName]) {
                state.pathParams[paramName] = envVariables[paramName];
                updateInputValue(paramName, envVariables[paramName]);
            }
        });
    }

    /**
     * Apply saved param values (from collection/request data)
     * These take priority over environment defaults.
     * Handles both plain string values and PathParamEntry objects:
     *   { value: string, type?, description?, format?, required?, enum?, deprecated? }
     * @param {Object} params - Param values object { paramName: value | PathParamEntry }
     */
    function applyParams(params) {
        if (!params) return;
        
        Object.entries(params).forEach(([paramName, rawValue]) => {
            if (paramName in state.pathParams) {
                let displayValue;
                
                // Handle PathParamEntry objects: { value: string, type?, description?, ... }
                if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
                    displayValue = rawValue.value || '';
                    // Store extended metadata in parallel map
                    const { value: _v, ...meta } = rawValue;
                    if (Object.keys(meta).length > 0) {
                        state._paramsMeta[paramName] = meta;
                    }
                } else {
                    displayValue = rawValue || '';
                }
                
                if (displayValue) {
                    state.pathParams[paramName] = displayValue;
                    updateInputValue(paramName, displayValue);
                }
            }
        });
    }

    /**
     * Update the input/select value for a specific param in the UI
     * @param {string} paramName - The param name
     * @param {string} value - The value to set
     */
    function updateInputValue(paramName, value) {
        if (!elements.pathParams) return;
        
        // form-manager uses data-key attribute
        const row = elements.pathParams.querySelector(`[data-key="${paramName}"]`);
        if (!row) return;
        
        // Find the value input or select element
        const valueElement = row.querySelector('input.value, select.value');
        if (valueElement) {
            valueElement.value = value;
        }
    }

    /**
     * Get path params as object
     * @returns {Object} Path params object
     */
    function getParams() {
        return { ...state.pathParams };
    }

    /**
     * Set a single path param value
     * @param {string} key - Param name
     * @param {string} value - Param value
     */
    function setParam(key, value) {
        state.pathParams[key] = value;
    }

    /**
     * Clear all path params
     */
    function clear() {
        if (elements.pathParams) {
            elements.pathParams.innerHTML = '';
        }
        state.pathParams = {};
    }

    /**
     * Build path with substituted parameters
     * @param {string} pattern - Path pattern with :params
     * @param {Object} params - Parameter values
     * @returns {string} Path with substituted values
     */
    function buildPath(pattern, params = state.pathParams) {
        if (!pattern) return '/';
        
        let result = pattern;
        
        Object.entries(params).forEach(([key, value]) => {
            // Replace :param, :param?, :param(regex), :param(regex)?
            const paramPattern = new RegExp(`:${key}(?:\\([^)]*\\))?\\??`, 'g');
            result = result.replace(paramPattern, value || '');
        });
        
        // Remove any remaining optional params that weren't provided
        result = result.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)(?:\([^)]*\))?\?/g, '');
        
        return result;
    }

    return {
        extractVariables,
        updateFromPath,
        applyEnvironmentDefaults,
        applyParams,
        getParams,
        setParam,
        clear,
        buildPath
    };
}

export { createPathVariablesManager };

