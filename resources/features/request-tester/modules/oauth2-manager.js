/**
 * OAuth2 Manager Module
 * Single Responsibility: Manage OAuth2 UI state and communication with backend
 * 
 * Handles:
 *  - Grant type field visibility switching
 *  - Collecting OAuth2 config from form fields
 *  - Loading OAuth2 config into form fields
 *  - Sending token requests to backend
 *  - Handling token responses from backend
 */

/**
 * Create an OAuth2 manager instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.vscode - VS Code API
 * @param {Function} options.markDirty - Mark request as dirty
 * @returns {Object} OAuth2 manager interface
 */
function createOAuth2Manager({ state, elements, vscode, markDirty }) {
    /** Current token info received from backend */
    let currentTokenInfo = null;

    /**
     * Show/hide fields based on selected grant type
     * @param {string} grantType
     */
    function switchGrantType(grantType) {
        const authCodeFields = elements.oauth2AuthcodeFields;
        const passwordFields = elements.oauth2PasswordFields;

        // Auth code fields: shown for authorization_code and implicit
        if (authCodeFields) {
            authCodeFields.classList.toggle('hidden', grantType !== 'authorization_code' && grantType !== 'implicit');
        }

        // Password fields: shown only for password grant
        if (passwordFields) {
            passwordFields.classList.toggle('hidden', grantType !== 'password');
        }

        // PKCE toggle: only relevant for authorization_code
        if (elements.oauth2Pkce) {
            const pkceRow = elements.oauth2Pkce.closest('.oauth2-toggle');
            if (pkceRow) {
                pkceRow.classList.toggle('hidden', grantType !== 'authorization_code');
            }
        }

        // Token URL is needed for all except implicit
        if (elements.oauth2TokenUrl) {
            const tokenUrlLabel = elements.oauth2TokenUrl.previousElementSibling;
            if (grantType === 'implicit') {
                elements.oauth2TokenUrl.classList.add('hidden');
                if (tokenUrlLabel?.tagName === 'LABEL') tokenUrlLabel.classList.add('hidden');
            } else {
                elements.oauth2TokenUrl.classList.remove('hidden');
                if (tokenUrlLabel?.tagName === 'LABEL') tokenUrlLabel.classList.remove('hidden');
            }
        }
    }

    /**
     * Collect OAuth2 configuration from form fields
     * @returns {Object} OAuth2Config
     */
    function getConfig() {
        const grantType = elements.oauth2GrantType?.value || 'authorization_code';
        
        // Start from existing state to preserve fields without form inputs
        // (callbackUrl, resource, extraParams, state, refreshToken, pkceMethod)
        const existing = state.oauth2 || {};
        
        const config = {
            ...existing,
            grantType,
            tokenUrl: elements.oauth2TokenUrl?.value || '',
            clientId: elements.oauth2ClientId?.value || '',
            clientSecret: elements.oauth2ClientSecret?.value || '',
            scope: elements.oauth2Scope?.value || ''
        };

        // Authorization code specific
        if (grantType === 'authorization_code' || grantType === 'implicit') {
            config.authUrl = elements.oauth2AuthUrl?.value || '';
            config.usePkce = elements.oauth2Pkce?.checked ?? true;
            config.pkceMethod = existing.pkceMethod || 'S256';
        } else {
            // Clean up fields not applicable to this grant type
            delete config.authUrl;
            delete config.usePkce;
            delete config.pkceMethod;
        }

        // Password grant specific
        if (grantType === 'password') {
            config.username = elements.oauth2Username?.value || '';
            config.password = elements.oauth2Password?.value || '';
        } else {
            delete config.username;
            delete config.password;
        }

        // Advanced options
        const audience = elements.oauth2Audience?.value;
        if (audience) { config.audience = audience; } else { delete config.audience; }

        const tokenPrefix = elements.oauth2TokenPrefix?.value;
        if (tokenPrefix) { config.tokenPrefix = tokenPrefix; } else { delete config.tokenPrefix; }

        const tokenField = elements.oauth2TokenField?.value;
        if (tokenField) { config.tokenField = tokenField; } else { delete config.tokenField; }

        const clientAuth = elements.oauth2ClientAuth?.value;
        if (clientAuth) { config.clientAuthentication = clientAuth; } else { delete config.clientAuthentication; }

        // If we have a pre-fetched token, include it
        if (currentTokenInfo?.accessToken) {
            config.accessToken = currentTokenInfo.accessToken;
        } else {
            delete config.accessToken;
        }

        return config;
    }

    /**
     * Load OAuth2 configuration into form fields
     * @param {Object} oauth2Config
     */
    function loadConfig(oauth2Config) {
        if (!oauth2Config) return;

        if (elements.oauth2GrantType) {
            elements.oauth2GrantType.value = oauth2Config.grantType || 'authorization_code';
            switchGrantType(elements.oauth2GrantType.value);
        }

        if (elements.oauth2AuthUrl) elements.oauth2AuthUrl.value = oauth2Config.authUrl || '';
        if (elements.oauth2TokenUrl) elements.oauth2TokenUrl.value = oauth2Config.tokenUrl || '';
        if (elements.oauth2ClientId) elements.oauth2ClientId.value = oauth2Config.clientId || '';
        if (elements.oauth2ClientSecret) elements.oauth2ClientSecret.value = oauth2Config.clientSecret || '';
        if (elements.oauth2Scope) elements.oauth2Scope.value = oauth2Config.scope || '';
        if (elements.oauth2Pkce) elements.oauth2Pkce.checked = oauth2Config.usePkce !== false;

        // Password fields
        if (elements.oauth2Username) elements.oauth2Username.value = oauth2Config.username || '';
        if (elements.oauth2Password) elements.oauth2Password.value = oauth2Config.password || '';

        // Advanced
        if (elements.oauth2Audience) elements.oauth2Audience.value = oauth2Config.audience || '';
        if (elements.oauth2TokenPrefix) elements.oauth2TokenPrefix.value = oauth2Config.tokenPrefix || '';
        if (elements.oauth2TokenField) elements.oauth2TokenField.value = oauth2Config.tokenField || '';
        if (elements.oauth2ClientAuth) elements.oauth2ClientAuth.value = oauth2Config.clientAuthentication || 'body';

        // If there's a pre-set access token, show it
        if (oauth2Config.accessToken) {
            onTokenReceived({
                accessToken: oauth2Config.accessToken,
                tokenType: oauth2Config.tokenPrefix || 'Bearer'
            });
        }
    }

    /**
     * Send "Get New Token" request to backend
     */
    function requestToken() {
        const config = getConfig();
        // Remove pre-fetched token so backend fetches a new one
        delete config.accessToken;

        // Show loading state
        if (elements.oauth2GetToken) {
            elements.oauth2GetToken.textContent = 'Requesting...';
            elements.oauth2GetToken.disabled = true;
        }
        hideError();

        vscode.postMessage({
            command: 'oauth2GetToken',
            oauth2Config: config
        });
    }

    /**
     * Send refresh token request to backend
     */
    function refreshToken() {
        if (!currentTokenInfo?.refreshToken) return;

        const config = getConfig();
        delete config.accessToken;

        vscode.postMessage({
            command: 'oauth2RefreshToken',
            oauth2Config: config,
            refreshToken: currentTokenInfo.refreshToken
        });
    }

    /**
     * Clear cached token
     */
    function clearToken() {
        const config = getConfig();
        vscode.postMessage({
            command: 'oauth2ClearToken',
            cacheKey: {
                tokenUrl: config.tokenUrl,
                clientId: config.clientId,
                scope: config.scope,
                grantType: config.grantType
            }
        });

        currentTokenInfo = null;
        updateTokenUI(null);
        // Sync state so accessToken is removed
        state.oauth2 = getConfig();
        markDirty();
    }

    /**
     * Handle token received from backend
     * @param {Object} tokenInfo
     */
    function onTokenReceived(tokenInfo) {
        currentTokenInfo = tokenInfo;
        updateTokenUI(tokenInfo);

        // Reset button state
        if (elements.oauth2GetToken) {
            elements.oauth2GetToken.textContent = 'Get New Token';
            elements.oauth2GetToken.disabled = false;
        }

        // Sync state so accessToken is included in save/build
        state.oauth2 = getConfig();
        markDirty();
    }

    /**
     * Handle token error from backend
     * @param {string} errorMessage
     */
    function onTokenError(errorMessage) {
        // Reset button state
        if (elements.oauth2GetToken) {
            elements.oauth2GetToken.textContent = 'Get New Token';
            elements.oauth2GetToken.disabled = false;
        }

        showError(errorMessage);
    }

    /**
     * Update the token display UI
     * @param {Object|null} tokenInfo
     */
    function updateTokenUI(tokenInfo) {
        const infoEl = elements.oauth2TokenInfo;
        const previewEl = elements.oauth2TokenPreview;
        const expiresEl = elements.oauth2TokenExpires;
        const refreshBtn = elements.oauth2RefreshToken;
        const clearBtn = elements.oauth2ClearToken;

        if (!tokenInfo) {
            if (infoEl) infoEl.classList.add('hidden');
            if (refreshBtn) refreshBtn.classList.add('hidden');
            if (clearBtn) clearBtn.classList.add('hidden');
            return;
        }

        // Show token preview (truncated)
        if (infoEl) infoEl.classList.remove('hidden');
        if (previewEl) {
            const token = tokenInfo.accessToken || '';
            previewEl.textContent = token.length > 40
                ? token.substring(0, 40) + '...'
                : token;
        }

        // Show expiry
        if (expiresEl && tokenInfo.expiresAt) {
            const expiresDate = new Date(tokenInfo.expiresAt);
            const now = Date.now();
            const remainingSec = Math.max(0, Math.floor((tokenInfo.expiresAt - now) / 1000));
            expiresEl.textContent = remainingSec > 0
                ? `Expires in ${remainingSec}s (${expiresDate.toLocaleTimeString()})`
                : 'Expired';
        } else if (expiresEl) {
            expiresEl.textContent = '';
        }

        // Show/hide refresh and clear buttons
        if (refreshBtn) refreshBtn.classList.toggle('hidden', !tokenInfo.refreshToken);
        if (clearBtn) clearBtn.classList.remove('hidden');

        hideError();
    }

    /**
     * Show error message
     * @param {string} message
     */
    function showError(message) {
        const errorEl = elements.oauth2TokenError;
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
        }
    }

    /**
     * Hide error message
     */
    function hideError() {
        const errorEl = elements.oauth2TokenError;
        if (errorEl) {
            errorEl.classList.add('hidden');
        }
    }

    /**
     * Initialize event listeners for OAuth2 fields
     */
    function initListeners() {
        // Helper: sync state.oauth2 from current form values
        function syncState() {
            state.oauth2 = getConfig();
        }

        // Grant type change
        if (elements.oauth2GrantType) {
            elements.oauth2GrantType.addEventListener('change', () => {
                switchGrantType(elements.oauth2GrantType.value);
                syncState();
                markDirty();
            });
        }

        // Get token button
        if (elements.oauth2GetToken) {
            elements.oauth2GetToken.addEventListener('click', () => requestToken());
        }

        // Refresh token button
        if (elements.oauth2RefreshToken) {
            elements.oauth2RefreshToken.addEventListener('click', () => refreshToken());
        }

        // Clear token button
        if (elements.oauth2ClearToken) {
            elements.oauth2ClearToken.addEventListener('click', () => clearToken());
        }

        // Mark dirty and sync state on any OAuth2 input change
        const inputFields = [
            elements.oauth2AuthUrl, elements.oauth2TokenUrl,
            elements.oauth2ClientId, elements.oauth2ClientSecret,
            elements.oauth2Scope, elements.oauth2Username, elements.oauth2Password,
            elements.oauth2Audience, elements.oauth2TokenPrefix, elements.oauth2TokenField
        ];

        inputFields.forEach(el => {
            if (el) {
                el.addEventListener('input', () => {
                    syncState();
                    markDirty();
                });
            }
        });

        // Checkbox and select changes
        [elements.oauth2Pkce, elements.oauth2ClientAuth].forEach(el => {
            if (el) {
                el.addEventListener('change', () => {
                    syncState();
                    markDirty();
                });
            }
        });
    }

    /**
     * Get the current access token (for request building)
     * @returns {string|null}
     */
    function getCurrentAccessToken() {
        return currentTokenInfo?.accessToken || null;
    }

    /**
     * Get message handlers for backend responses
     * @returns {Object}
     */
    function getMessageHandlers() {
        return {
            'oauth2TokenReceived': (msg) => onTokenReceived(msg.tokenInfo),
            'oauth2TokenError': (msg) => onTokenError(msg.error),
            'oauth2TokenCleared': () => {
                currentTokenInfo = null;
                updateTokenUI(null);
            }
        };
    }

    return {
        switchGrantType,
        getConfig,
        loadConfig,
        requestToken,
        refreshToken,
        clearToken,
        onTokenReceived,
        onTokenError,
        getCurrentAccessToken,
        getMessageHandlers,
        initListeners
    };
}

// ES Module export
export { createOAuth2Manager };
