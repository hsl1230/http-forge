/**
 * Request Builder Module
 * Single Responsibility: Build HTTP requests from form data
 * 
 * Shared between endpoint-tester and http-api-tester
 */

/**
 * Create a request builder instance
 * @param {Object} options
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.state - Application state
 * @param {Function} options.getMethod - Function to get current HTTP method
 * @param {Function} options.getPath - Function to get current URL path
 * @returns {Object} Request builder interface
 */
function createRequestBuilder({ elements, state, getMethod, getPath }) {

    /**
     * Build path parameters from DOM
     * @returns {Object}
     */
    function buildPathParams() {
        const pathParams = {};
        elements.pathParams?.querySelectorAll('.param-row').forEach(row => {
            const key = row.dataset.key;
            const value = row.querySelector('.value')?.value;
            if (key && value) {
                pathParams[key] = value;
            }
        });
        return pathParams;
    }

    /**
     * Update query params state from DOM
     */
    function updateQueryParams() {
        state.queryParams = [];
        elements.queryParams?.querySelectorAll('.param-row').forEach(row => {
            const checkbox = row.querySelector('.param-checkbox');
            const key = row.querySelector('.key')?.value;
            const value = row.querySelector('.value')?.value;
            const enabled = checkbox ? checkbox.checked : true;
            if (key) {
                state.queryParams.push({ key, value: value || '', enabled });
            }
        });
    }

    /**
     * Build query object from state (only enabled params)
     * @returns {Object}
     */
    function buildQueryObject() {
        return state.queryParams.reduce((acc, { key, value, enabled }) => {
            if (key && enabled) acc[key] = value;
            return acc;
        }, {});
    }

    /**
     * Get headers from DOM (only enabled ones)
     * @returns {Object}
     */
    function getHeaders() {
        const headers = {};
        elements.headersList?.querySelectorAll('.param-row').forEach(row => {
            const checkbox = row.querySelector('.param-checkbox');
            const enabled = checkbox ? checkbox.checked : true;
            const key = row.querySelector('.key')?.value;
            const value = row.querySelector('.value')?.value;
            if (key && enabled) {
                headers[key] = value || '';
            }
        });
        return headers;
    }

    /**
     * Build auth object matching UIRequest.auth (RequestAuth interface)
     * @returns {Object|undefined} Auth configuration or undefined if no auth
     */
    function buildAuth() {
        const authType = state.authType || 'none';
        
        if (authType === 'none') {
            return { type: 'none' };
        }
        
        if (authType === 'inherit') {
            return { type: 'inherit' };
        }
        
        if (authType === 'bearer') {
            return {
                type: 'bearer',
                bearerToken: state.bearerToken || ''
            };
        }
        
        if (authType === 'basic') {
            return {
                type: 'basic',
                basicAuth: {
                    username: state.basicAuth?.username || '',
                    password: state.basicAuth?.password || ''
                }
            };
        }
        
        if (authType === 'apikey') {
            return {
                type: 'apikey',
                apikey: {
                    key: state.apiKey?.key || '',
                    value: state.apiKey?.value || '',
                    in: state.apiKey?.in || 'header'
                }
            };
        }

        if (authType === 'oauth2' && state.oauth2) {
            return {
                type: 'oauth2',
                oauth2: { ...state.oauth2 }
            };
        }
        
        return { type: authType };
    }

    /**
     * Build the complete request object matching UIRequest interface
     * @returns {Object} UIRequest-compatible object
     */
    function buildRequest() {
        updateQueryParams();
        
        const saveResponse = elements.saveResponseCheckbox?.checked || false;
        const body = buildRequestBody();

        return {
            method: getMethod ? getMethod() : 'GET',
            path: getPath ? getPath() : '',
            params: buildPathParams(),
            query: buildQueryObject(),
            headers: getHeaders(),
            body: body,  // RequestBody format: { type, format?, content }
            auth: buildAuth(),  // Consolidated auth object matching RequestAuth
            saveResponse,
            settings: { ...state.settings },
            scripts: {
                preRequest: state.scripts.preRequest,
                postResponse: state.scripts.postResponse
            }
        };
    }

    /**
     * Build body in canonical RequestBody format: { type, format?, content }
     * @returns {Object|null} RequestBody object or null for no body
     */
    function buildRequestBody() {
        const bodyType = state.bodyType || 'none';
        
        switch (bodyType) {
            case 'none':
                return null;
            
            case 'raw':
                return {
                    type: 'raw',
                    format: state.rawFormat || 'json',
                    content: state.body || ''
                };
            
            case 'form-data':
                const formData = state.formData?.filter(f => f.enabled && f.key) || [];
                return {
                    type: 'form-data',
                    content: formData
                };
            
            case 'x-www-form-urlencoded':
                const urlEncoded = state.urlEncodedData?.filter(f => f.enabled && f.key) || [];
                return {
                    type: 'x-www-form-urlencoded',
                    content: urlEncoded
                };
            
            case 'binary':
                return {
                    type: 'binary',
                    content: state.binaryFile
                };
            
            case 'graphql':
                let variables = {};
                try {
                    if (state.graphql?.variables?.trim()) {
                        variables = JSON.parse(state.graphql.variables);
                    }
                } catch (e) {
                    console.warn('Invalid GraphQL variables JSON');
                }
                return {
                    type: 'graphql',
                    content: {
                        query: state.graphql?.query || '',
                        variables,
                        operationName: state.graphql?.operationName || undefined
                    }
                };
            
            default:
                return null;
        }
    }

    return {
        buildPathParams,
        updateQueryParams,
        buildQueryObject,
        getHeaders,
        buildAuth,
        buildRequestBody,
        buildRequest
    };
}

// ES Module export
export { createRequestBuilder };
