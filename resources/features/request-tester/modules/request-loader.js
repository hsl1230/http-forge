/**
 * Request Loader Module
 * Single Responsibility: Load and apply request data to the UI
 * 
 * Follows:
 * - SRP: Only handles loading request data into the UI
 * - OCP: Can be extended for new request formats
 * - DIP: Depends on abstractions (callbacks) not concrete implementations
 */

/**
 * Create a request loader instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Function} options.getMethod - Function to get current method
 * @param {Function} options.setMethod - Function to set method
 * @param {Function} options.getPath - Function to get current path
 * @param {Function} options.setPath - Function to set path
 * @param {Object} options.queryParamsManager - Query params manager instance
 * @param {Object} options.pathVariablesManager - Path variables manager instance
 * @param {Object} options.bodyTypeManager - Body type manager instance
 * @param {Object} options.editorsManager - Monaco editors manager instance
 * @param {Object} options.formManager - Form manager instance
 * @param {Object} options.elements - DOM elements
 * @param {Function} options.updateUrlPreview - Function to update URL preview
 * @param {Function} options.markClean - Function to mark request as clean
 * @returns {Object} Request loader interface
 */
function createRequestLoader({
    state,
    getMethod,
    setMethod,
    getPath,
    setPath,
    queryParamsManager,
    pathVariablesManager,
    bodyTypeManager,
    editorsManager,
    formManager,
    elements,
    updateUrlPreview,
    markClean,
    oauth2Manager
}) {

    /**
     * Load a collection request
     * @param {Object} request - Request data (unified format)
     */
    function loadCollectionRequest(request) {
        // Set method using unified accessor
        setMethod(request.method || 'GET');

        // Clear existing form
        formManager.clearForm();

        // Get URL and query params from request
        const baseUrl = request.url || request.path || '/';
        const hasQueryArray = queryParamsManager.hasSavedQueryParams(request);

        // Apply query params and build full URL using two-way sync
        // This will: set base URL, populate table, and set full URL in input
        const keyEditable = !state.readonly;
        if (hasQueryArray) {
            // Use saved query params array
            const cleanBaseUrl = queryParamsManager.getUrlWithoutQuery(baseUrl);
            queryParamsManager.applyFromCollection(
                cleanBaseUrl,
                request.query,
                setPath,
                keyEditable
            );
        } else {
            // Parse query params from URL
            const { baseUrl: parsedBase, params } = queryParamsManager.parseUrl(baseUrl);
            queryParamsManager.applyFromCollection(
                parsedBase,
                params,
                setPath,
                keyEditable
            );
        }

        // Update state.requestPath with the full URL from the path input
        state.requestPath = getPath() || baseUrl;

        // Extract and display path variables from base URL (e.g., :userId, :id)
        const pathForVariables = state.baseUrl || queryParamsManager.getUrlWithoutQuery(baseUrl);
        pathVariablesManager.updateFromPath(pathForVariables, request.params);

        // Apply headers (object format: { headerName: value })
        const requestHeaders = request.headers || {};
        if (typeof requestHeaders === 'object' && !Array.isArray(requestHeaders)) {
            Object.entries(requestHeaders).forEach(([key, value]) => {
                formManager.addHeaderRow(key, value, true, true);
            });
        }

        // Reset and apply body
        bodyTypeManager.reset();

        // Apply body based on type
        const bodyData = request.body;
        if (bodyData && typeof bodyData === 'object') {
            bodyTypeManager.applyFromRequest(bodyData);
        } else if (typeof bodyData === 'string' && bodyData) {
            // Plain string body
            state.body = bodyData;
            bodyTypeManager.setType('raw');
            bodyTypeManager.setRawFormat('json');
            if (editorsManager) {
                editorsManager.setBodyValue(bodyData);
            }
        }

        // Apply auth settings - reset first, then apply
        state.authType = 'inherit';
        state.bearerToken = '';
        state.basicAuth = { username: '', password: '' };
        state.apiKey = { key: '', value: '', in: 'header' };
        state.oauth2 = null;
        if (elements.authType) {
            elements.authType.value = 'inherit';
        }
        if (elements.bearerToken) {
            elements.bearerToken.value = '';
        }
        if (elements.bearerTokenSection) {
            elements.bearerTokenSection.classList.add('hidden');
        }
        if (elements.basicAuthSection) {
            elements.basicAuthSection.classList.add('hidden');
        }
        if (elements.basicUsername) {
            elements.basicUsername.value = '';
        }
        if (elements.basicPassword) {
            elements.basicPassword.value = '';
        }
        if (elements.oauth2Section) {
            elements.oauth2Section.classList.add('hidden');
        }

        // Apply auth from request if present
        if (request.auth) {
            // Canonical structure: { type, bearerToken, basicAuth, apikey, oauth2 }
            const auth = request.auth;
            state.authType = auth.type || 'inherit';
            state.bearerToken = auth.bearerToken || '';
            state.basicAuth = auth.basicAuth ? { ...auth.basicAuth } : { username: '', password: '' };
            state.apiKey = auth.apikey ? { ...auth.apikey } : { key: '', value: '', in: 'header' };
            state.oauth2 = auth.oauth2 ? { ...auth.oauth2 } : null;
            // UI updates
            if (elements.authType) elements.authType.value = state.authType;
            if (elements.bearerToken) elements.bearerToken.value = state.bearerToken;
            if (elements.bearerTokenSection) elements.bearerTokenSection.classList.toggle('hidden', state.authType !== 'bearer');
            if (elements.basicAuthSection) elements.basicAuthSection.classList.toggle('hidden', state.authType !== 'basic');
            if (elements.basicUsername) elements.basicUsername.value = state.basicAuth.username || '';
            if (elements.basicPassword) elements.basicPassword.value = state.basicAuth.password || '';
            if (elements.apiKeySection) elements.apiKeySection.classList.toggle('hidden', state.authType !== 'apikey');
            if (elements.apiKeyKey) elements.apiKeyKey.value = state.apiKey.key || '';
            if (elements.apiKeyValue) elements.apiKeyValue.value = state.apiKey.value || '';
            if (elements.apiKeyIn) elements.apiKeyIn.value = state.apiKey.in || 'header';
            if (elements.oauth2Section) elements.oauth2Section.classList.toggle('hidden', state.authType !== 'oauth2');
            if (state.authType === 'oauth2' && oauth2Manager && state.oauth2) {
                oauth2Manager.loadConfig(state.oauth2);
            }
        }

        // Reset scripts first
        state.scripts.preRequest = '';
        state.scripts.postResponse = '';
        if (editorsManager) {
            editorsManager.setPreRequestScript('');
            editorsManager.setPostResponseScript('');
        }

        // Apply scripts from request if present
        if (request.scripts) {
            if (request.scripts.preRequest) {
                state.scripts.preRequest = request.scripts.preRequest;
                if (editorsManager) {
                    editorsManager.setPreRequestScript(request.scripts.preRequest);
                }
            }
            if (request.scripts.postResponse) {
                state.scripts.postResponse = request.scripts.postResponse;
                if (editorsManager) {
                    editorsManager.setPostResponseScript(request.scripts.postResponse);
                }
            }
        }

        // Reset and apply settings
        const defaultSettings = {
            timeout: 30000,
            followRedirects: true,
            followOriginalMethod: false,
            followAuthHeader: false,
            maxRedirects: 10,
            strictSSL: true,
            decompress: true,
            includeCookies: true
        };

        // Reset state settings to defaults
        Object.assign(state.settings, defaultSettings);

        // Apply settings from request if present
        if (request.settings) {
            Object.assign(state.settings, request.settings);
        }

        // Always apply to UI (defaults or merged with request settings)
        applySettingsToUI(state.settings);

        // Clear response
        if (editorsManager) {
            editorsManager.clearResponse();
        }

        // Hide response placeholder if visible
        if (elements.responsePlaceholder) {
            elements.responsePlaceholder.classList.add('hidden');
        }

        updateUrlPreview();

        // Mark as clean (no unsaved changes)
        if (markClean) {
            markClean();
        }
    }

    /**
     * Apply settings to UI elements
     * @param {Object} settings - Settings object
     */
    function applySettingsToUI(settings) {
        if (elements.settingTimeout && settings.timeout !== undefined) {
            elements.settingTimeout.value = settings.timeout;
        }
        if (elements.settingFollowRedirects && settings.followRedirects !== undefined) {
            elements.settingFollowRedirects.checked = settings.followRedirects;
            if (elements.redirectOptions) {
                elements.redirectOptions.classList.toggle('hidden', !settings.followRedirects);
            }
        }
        if (elements.settingOriginalMethod && settings.followOriginalMethod !== undefined) {
            elements.settingOriginalMethod.checked = settings.followOriginalMethod;
        }
        if (elements.settingAuthHeader && settings.followAuthHeader !== undefined) {
            elements.settingAuthHeader.checked = settings.followAuthHeader;
        }
        if (elements.settingMaxRedirects && settings.maxRedirects !== undefined) {
            elements.settingMaxRedirects.value = settings.maxRedirects;
        }
        if (elements.settingStrictSSL && settings.strictSSL !== undefined) {
            elements.settingStrictSSL.checked = settings.strictSSL;
        }
        if (elements.settingDecompress && settings.decompress !== undefined) {
            elements.settingDecompress.checked = settings.decompress;
        }
        if (elements.settingIncludeCookies && settings.includeCookies !== undefined) {
            elements.settingIncludeCookies.checked = settings.includeCookies;
        }
    }

    /**
     * Apply history entry to form
     * @param {Object} entry - History entry
     * @param {Object} fullResponse - Full response data (optional)
     * @param {Object} responseHandler - Response handler instance
     */
    function applyHistoryEntry(entry, fullResponse, responseHandler) {
        const originalConfig = entry.originalConfig || {};
        const historyParams = originalConfig.params || {};
        const historyQuery = originalConfig.query || {};
        const historyHeaders = originalConfig.headers || {};
        const historyBody = originalConfig.body ?? null;

        // Store sentRequest for reference (can be displayed in a debug panel)
        state.lastSentRequest = entry.sentRequest || {};

        // Update path params
        elements.pathParams?.querySelectorAll('.param-row').forEach(row => {
            const key = row.dataset.key;
            const valueInput = row.querySelector('.value');
            if (key && valueInput) {
                const newValue = historyParams[key] ?? '';
                valueInput.value = newValue;
                state.pathParams[key] = newValue;
            }
        });

        // Update query params
        elements.queryParams?.querySelectorAll('.param-row').forEach(row => {
            const keyInput = row.querySelector('.key');
            const valueInput = row.querySelector('.value');
            const checkbox = row.querySelector('.param-checkbox');
            const key = keyInput?.value;

            if (key) {
                const historyKey = Object.keys(historyQuery).find(k => k.toLowerCase() === key.toLowerCase());
                if (historyKey !== undefined) {
                    if (valueInput) valueInput.value = historyQuery[historyKey];
                    if (checkbox) checkbox.checked = true;
                } else {
                    if (valueInput) valueInput.value = '';
                    if (checkbox) checkbox.checked = false;
                }
            }
        });

        // Update headers (from original config, not sent headers with cookies)
        elements.headersList?.querySelectorAll('.param-row').forEach(row => {
            const keyInput = row.querySelector('.key');
            const valueInput = row.querySelector('.value');
            const checkbox = row.querySelector('.param-checkbox');
            const key = keyInput?.value;

            if (key) {
                const historyKey = Object.keys(historyHeaders).find(k => k.toLowerCase() === key.toLowerCase());
                if (historyKey !== undefined) {
                    if (valueInput) valueInput.value = historyHeaders[historyKey];
                    if (checkbox) checkbox.checked = true;
                } else {
                    if (valueInput) valueInput.value = '';
                    if (checkbox) checkbox.checked = false;
                }
            }
        });

        // Update body from original config - format: { type, format?, content }
        if (bodyTypeManager && historyBody && typeof historyBody === 'object' && historyBody.type) {
            bodyTypeManager.applyFromRequest(historyBody);
        }

        // Update auth using canonical structure
        if (entry.auth) {
            const auth = entry.auth;
            state.authType = auth.type || 'inherit';
            state.bearerToken = auth.bearerToken || '';
            state.basicAuth = auth.basicAuth ? { ...auth.basicAuth } : { username: '', password: '' };
            state.apiKey = auth.apikey ? { ...auth.apikey } : { key: '', value: '', in: 'header' };
            state.oauth2 = auth.oauth2 ? { ...auth.oauth2 } : null;
            if (elements.authType) elements.authType.value = state.authType;
            if (elements.bearerTokenSection) elements.bearerTokenSection.classList.toggle('hidden', state.authType !== 'bearer');
            if (elements.basicAuthSection) elements.basicAuthSection.classList.toggle('hidden', state.authType !== 'basic');
            if (elements.bearerToken) elements.bearerToken.value = state.bearerToken;
            if (elements.basicUsername) elements.basicUsername.value = state.basicAuth.username || '';
            if (elements.basicPassword) elements.basicPassword.value = state.basicAuth.password || '';
            if (elements.apiKeySection) elements.apiKeySection.classList.toggle('hidden', state.authType !== 'apikey');
            if (elements.apiKeyKey) elements.apiKeyKey.value = state.apiKey.key || '';
            if (elements.apiKeyValue) elements.apiKeyValue.value = state.apiKey.value || '';
            if (elements.apiKeyIn) elements.apiKeyIn.value = state.apiKey.in || 'header';
            if (elements.oauth2Section) elements.oauth2Section.classList.toggle('hidden', state.authType !== 'oauth2');
            if (state.authType === 'oauth2' && oauth2Manager && state.oauth2) {
                oauth2Manager.loadConfig(state.oauth2);
            }
        }

        // Restore scripts
        if (entry.scripts && editorsManager) {
            if (entry.scripts.preRequest) {
                editorsManager.setPreRequestScript(entry.scripts.preRequest);
                state.scripts.preRequest = entry.scripts.preRequest;
            }
            if (entry.scripts.postResponse) {
                editorsManager.setPostResponseScript(entry.scripts.postResponse);
                state.scripts.postResponse = entry.scripts.postResponse;
            }
        }

        // Restore settings (reset to defaults first)
        const defaultSettings = {
            timeout: 30000,
            followRedirects: true,
            followOriginalMethod: false,
            followAuthHeader: false,
            maxRedirects: 10,
            strictSSL: true,
            decompress: true,
            includeCookies: true
        };

        // Reset to defaults
        Object.assign(state.settings, defaultSettings);

        // Apply history entry settings if present
        if (entry.settings) {
            Object.assign(state.settings, entry.settings);
        }

        // Always apply to UI
        applySettingsToUI(state.settings);

        updateUrlPreview();

        // Handle response display first (may clear sent request tab)
        if (fullResponse && responseHandler) {
            responseHandler.handleResponse(fullResponse);
        } else if (responseHandler) {
            responseHandler.clearResponse();
        }

        // Update sent request tab AFTER response handling
        // This ensures the sent request data is displayed even when clearResponse() is called
        if (responseHandler && responseHandler.updateSentRequestTab) {
            responseHandler.updateSentRequestTab(state.lastSentRequest);
        }
    }

    return {
        loadCollectionRequest,
        applyHistoryEntry,
        applySettingsToUI
    };
}

export { createRequestLoader };

