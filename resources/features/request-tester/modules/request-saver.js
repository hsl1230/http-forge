/**
 * Request Saver Module
 * Single Responsibility: Build and save request data
 * 
 * Follows:
 * - SRP: Only handles saving request data
 * - OCP: Can be extended for new save formats
 * - DIP: Depends on abstractions (callbacks) not concrete implementations
 */

/**
 * Create a request saver instance
 * @param {Object} options
 * @param {Object} options.vscode - VS Code API
 * @param {Object} options.state - Application state
 * @param {Function} options.getMethod - Function to get current method
 * @param {Function} options.getPath - Function to get current path
 * @param {Object} options.queryParamsManager - Query params manager instance
 * @param {Object} options.bodyTypeManager - Body type manager instance
 * @param {Function} options.getHeaders - Function to get headers from DOM
 * @param {Function} [options.getSchemaDataForSave] - Function returning { bodySchema, responseSchema } from live editors
 * @returns {Object} Request saver interface
 */
function createRequestSaver({
    vscode,
    state,
    getMethod,
    getPath,
    queryParamsManager,
    bodyTypeManager,
    getHeaders,
    getSchemaDataForSave
}) {

    /**
     * Build the body in RequestBody format: { type, format?, content }
     * @returns {Object|null} RequestBody format or null if no body
     */
    function buildBody() {
        const bodyType = state.bodyType || 'none';
        
        switch (bodyType) {
            case 'none':
                return { type: 'none', content: null };
            
            case 'raw':
                return {
                    type: 'raw',
                    format: state.rawFormat || 'json',
                    content: state.body || ''
                };
            
            case 'form-data':
                return {
                    type: 'form-data',
                    content: state.formData || []
                };
            
            case 'x-www-form-urlencoded':
                return {
                    type: 'x-www-form-urlencoded',
                    content: state.urlEncodedData || []
                };
            
            case 'binary':
                return {
                    type: 'binary',
                    content: state.binaryFile || null
                };
            
            case 'graphql':
                return {
                    type: 'graphql',
                    content: state.graphql || { query: '', variables: '' }
                };
            
            default:
                return { type: 'none', content: null };
        }
    }

    /**
     * Build request data object for saving
     * @returns {Object} Request data ready for saving
     */
    function buildAuth() {
        const authType = state.authType || 'none';
        if (authType === 'none') return { type: 'none' };
        if (authType === 'inherit') return { type: 'inherit' };
        if (authType === 'bearer') return { type: 'bearer', bearerToken: state.bearerToken || '' };
        if (authType === 'basic') return { type: 'basic', basicAuth: { username: state.basicAuth?.username || '', password: state.basicAuth?.password || '' } };
        if (authType === 'apikey') return { type: 'apikey', apikey: { key: state.apiKey?.key || '', value: state.apiKey?.value || '', in: state.apiKey?.in || 'header' } };
        if (authType === 'oauth2' && state.oauth2) return { type: 'oauth2', oauth2: { ...state.oauth2 } };
        return { type: authType };
    }

    function buildRequestData() {
        const currentPath = getPath();
        const headers = getHeaders();
        // Get the URL without query params - query params are saved separately
        const urlWithoutQuery = queryParamsManager.getUrlWithoutQuery(currentPath);
        
        // Build params with PathParamEntry metadata preservation
        const params = {};
        Object.entries(state.pathParams).forEach(([key, value]) => {
            if (state._paramsMeta && state._paramsMeta[key] && Object.keys(state._paramsMeta[key]).length > 0) {
                // Re-wrap as PathParamEntry with metadata
                params[key] = { value: value || '', ...state._paramsMeta[key] };
            } else {
                params[key] = value;
            }
        });
        
        // Re-attach latest query metadata from _queryMeta
        // (metadata edits don't trigger updateQueryParamsState)
        const query = (state.queryParams || []).map(entry => {
            const fresh = { key: entry.key, value: entry.value, enabled: entry.enabled };
            if (state._queryMeta && state._queryMeta[entry.key]) {
                Object.assign(fresh, state._queryMeta[entry.key]);
            }
            return fresh;
        });

        return {
            // Include ID and name from original request data for updates
            id: state.requestData?.id,
            name: state.requestData?.name,
            collectionId: state.collectionId,
            method: getMethod(),
            url: urlWithoutQuery,
            path: urlWithoutQuery,
            params,
            query,
            headers: headers,
            // Body in unified RequestBody format: { type, format?, content }
            body: buildBody(),
            auth: buildAuth(),
            settings: state.settings,
            scripts: state.scripts,
            // Preserve OpenAPI metadata — prefer live editor data over original
            deprecated: state.requestData?.deprecated,
            description: state.requestData?.description,
            doc: state.requestData?.doc,
            responseSchema: getSchemaDataForSave?.()?.responseSchema ?? state.requestData?.responseSchema,
            bodySchema: getSchemaDataForSave?.()?.bodySchema ?? state.requestData?.bodySchema
        };
    }

    /**
     * Save request to collection via VS Code API
     */
    function saveRequest() {
        const requestData = buildRequestData();
        
        vscode.postMessage({
            command: 'saveRequest',
            request: requestData
        });
    }

    /**
     * Take a snapshot of current request state for comparison
     * @returns {Object} Snapshot of request state
     */
    function takeSnapshot() {
        return {
            method: getMethod(),
            path: getPath(),
            pathParams: JSON.stringify(state.pathParams),
            queryParams: JSON.stringify(state.queryParams),
            headers: JSON.stringify(getHeaders()),
            // Use unified body format for snapshot comparison
            body: JSON.stringify(buildBody()),
            authType: state.authType,
            bearerToken: state.bearerToken,
            basicAuth: JSON.stringify(state.basicAuth || {}),
            apiKey: JSON.stringify(state.apiKey || {}),
            oauth2: JSON.stringify(state.oauth2 || {}),
            scripts: JSON.stringify(state.scripts),
            settings: JSON.stringify(state.settings),
            // Include OpenAPI metadata maps for dirty detection
            paramsMeta: JSON.stringify(state._paramsMeta || {}),
            queryMeta: JSON.stringify(state._queryMeta || {}),
            headersMeta: JSON.stringify(state._headersMeta || {}),
            // Include schema editor data for dirty detection
            schemaData: JSON.stringify(getSchemaDataForSave?.() || {})
        };
    }

    /**
     * Check if current state differs from snapshot
     * @param {Object} snapshot - Previous snapshot
     * @returns {boolean} True if state has changed
     */
    function hasChangedFrom(snapshot) {
        if (!snapshot) return true;
        
        const current = takeSnapshot();
        
        return (
            current.method !== snapshot.method ||
            current.path !== snapshot.path ||
            current.pathParams !== snapshot.pathParams ||
            current.queryParams !== snapshot.queryParams ||
            current.headers !== snapshot.headers ||
            current.body !== snapshot.body ||
            current.authType !== snapshot.authType ||
            current.bearerToken !== snapshot.bearerToken ||
            current.basicAuth !== snapshot.basicAuth ||
            current.apiKey !== snapshot.apiKey ||
            current.oauth2 !== snapshot.oauth2 ||
            current.scripts !== snapshot.scripts ||
            current.settings !== snapshot.settings ||
            current.paramsMeta !== snapshot.paramsMeta ||
            current.queryMeta !== snapshot.queryMeta ||
            current.headersMeta !== snapshot.headersMeta ||
            current.schemaData !== snapshot.schemaData
        );
    }

    return {
        buildRequestData,
        saveRequest,
        takeSnapshot,
        hasChangedFrom
    };
}

export { createRequestSaver };

