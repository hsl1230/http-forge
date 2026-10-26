/**
 * DOM Elements Module - Unified Request Tester
 * Single Responsibility: Manage DOM element references
 */

/**
 * Initialize and cache DOM element references
 * @returns {Object} Object containing all DOM element references
 */
function initElements() {
    return {
        // Request section - Unified (single set of elements)
        requestTypeSelect: document.getElementById('request-type-select'),
        methodSelect: document.getElementById('method-select'),
        requestPathInput: document.getElementById('request-path-input'),
        btnSave: document.getElementById('btn-save'),

        // Common request elements
        urlPreview: document.getElementById('url-preview'),
        sendBtn: document.getElementById('send-btn'),
        loadingOverlay: document.getElementById('loading-overlay'),
        errorMessage: document.getElementById('error-message'),

        // Environment
        envSelector: document.getElementById('env-selector'),
        envLoading: document.getElementById('env-loading'),

        // Tabs (request tabs in .tab-bar)
        tabButtons: document.querySelectorAll('.tab-bar .tab'),
        tabPanels: document.querySelectorAll('.tab-content .tab-panel'),

        // WebSocket / Socket.IO composer and frame inspector
        messagesTabBtn: document.getElementById('messages-tab-btn'),
        messagesTab: document.getElementById('messages-tab'),
        wsStatusDot: document.getElementById('ws-status-dot'),
        wsStatusText: document.getElementById('ws-status-text'),
        wsProtocol: document.getElementById('ws-protocol'),
        wsDisconnectBtn: document.getElementById('ws-disconnect-btn'),
        wsSubprotocolsField: document.getElementById('ws-subprotocols-field'),
        wsSubprotocols: document.getElementById('ws-subprotocols'),
        wsMessageFormat: document.getElementById('ws-message-format'),
        wsBinaryEncoding: document.getElementById('ws-binary-encoding'),
        wsBeautifyBtn: document.getElementById('ws-beautify-btn'),
        wsMessageInput: document.getElementById('ws-message-input'),
        wsComposerHint: document.getElementById('ws-composer-hint'),
        wsSaveDraftBtn: document.getElementById('ws-save-draft'),
        wsNewDraftBtn: document.getElementById('ws-new-draft'),
        wsDraftList: document.getElementById('ws-draft-list'),
        wsDraftCount: document.getElementById('ws-draft-count'),
        wsSocketIoFields: document.getElementById('ws-socketio-fields'),
        wsEventName: document.getElementById('ws-event-name'),
        wsEventArgs: document.getElementById('ws-event-args'),
        wsAck: document.getElementById('ws-ack'),
        wsListenersSection: document.getElementById('ws-listeners-section'),
        wsAddListenerBtn: document.getElementById('ws-add-listener'),
        wsListenerList: document.getElementById('ws-listener-list'),
        wsSettingsSection: document.getElementById('ws-settings-section'),
        wsSocketIoSettings: document.getElementById('ws-socketio-settings'),
        wsSettingHandshakeTimeout: document.getElementById('ws-setting-handshake-timeout'),
        wsSettingReconnectAttempts: document.getElementById('ws-setting-reconnect-attempts'),
        wsSettingReconnectInterval: document.getElementById('ws-setting-reconnect-interval'),
        wsSettingMaxMessageSize: document.getElementById('ws-setting-max-message-size'),
        wsSettingClientVersion: document.getElementById('ws-setting-client-version'),
        wsSettingHandshakePath: document.getElementById('ws-setting-handshake-path'),
        wsFramesTabBtn: document.getElementById('ws-frames-tab-btn'),
        wsFrameCount: document.getElementById('ws-frame-count'),
        wsFrameSearch: document.getElementById('ws-frame-search'),
        wsFrameFilter: document.getElementById('ws-frame-filter'),
        wsFrameFormat: document.getElementById('ws-frame-format'),
        wsFrameWrap: document.getElementById('ws-frame-wrap'),
        wsFrameHexdump: document.getElementById('ws-frame-hexdump'),
        wsFrameDiff: document.getElementById('ws-frame-diff'),
        wsClearFramesBtn: document.getElementById('ws-clear-frames'),
        wsFramesScroll: document.getElementById('ws-frames-scroll'),
        wsFramesBody: document.getElementById('ws-frames-body'),

        // Parameters
        pathParams: document.getElementById('path-params'),
        queryParams: document.getElementById('query-params'),
        addQueryBtn: document.getElementById('add-query-param'),

        // Headers
        headersList: document.getElementById('headers-list'),
        addHeaderBtn: document.getElementById('add-header'),

        // Body - Type selector and panels
        bodyEditor: document.getElementById('body-editor'),
        bodyTypeRadios: document.querySelectorAll('input[name="body-type"]'),
        rawFormatSelector: document.getElementById('raw-format-selector'),
        rawFormatSelect: document.getElementById('raw-format'),
        graphqlToolbar: document.getElementById('graphql-toolbar'),
        bodyNone: document.getElementById('body-none'),
        bodyFormData: document.getElementById('body-form-data'),
        bodyUrlencoded: document.getElementById('body-urlencoded'),
        bodyRaw: document.getElementById('body-raw'),
        bodyBinary: document.getElementById('body-binary'),
        bodyGraphql: document.getElementById('body-graphql'),
        formDataList: document.getElementById('form-data-list'),
        addFormDataBtn: document.getElementById('add-form-data'),
        urlencodedList: document.getElementById('urlencoded-list'),
        addUrlencodedBtn: document.getElementById('add-urlencoded'),
        binaryFileInput: document.getElementById('binary-file-input'),
        selectFileBtn: document.getElementById('select-file-btn'),
        selectedFileName: document.getElementById('selected-file-name'),
        graphqlQueryEditor: document.getElementById('graphql-query-editor'),
        graphqlVariablesEditor: document.getElementById('graphql-variables-editor'),

        // Auth
        authType: document.getElementById('auth-type'),
        bearerTokenSection: document.getElementById('bearer-token-section'),
        bearerToken: document.getElementById('bearer-token'),
        basicAuthSection: document.getElementById('basic-auth-section'),
        basicUsername: document.getElementById('basic-username'),
        basicPassword: document.getElementById('basic-password'),
        apiKeySection: document.getElementById('apikey-section'),
        apiKeyKey: document.getElementById('apikey-key'),
        apiKeyValue: document.getElementById('apikey-value'),
        apiKeyIn: document.getElementById('apikey-in'),

        // OAuth2
        oauth2Section: document.getElementById('oauth2-section'),
        oauth2GrantType: document.getElementById('oauth2-grant-type'),
        oauth2AuthUrl: document.getElementById('oauth2-auth-url'),
        oauth2CallbackUrl: document.getElementById('oauth2-callback-url'),
        oauth2Pkce: document.getElementById('oauth2-pkce'),
        oauth2AuthcodeFields: document.getElementById('oauth2-authcode-fields'),
        oauth2TokenUrl: document.getElementById('oauth2-token-url'),
        oauth2ClientId: document.getElementById('oauth2-client-id'),
        oauth2ClientSecret: document.getElementById('oauth2-client-secret'),
        oauth2Scope: document.getElementById('oauth2-scope'),
        oauth2PasswordFields: document.getElementById('oauth2-password-fields'),
        oauth2Username: document.getElementById('oauth2-username'),
        oauth2Password: document.getElementById('oauth2-password'),
        oauth2Audience: document.getElementById('oauth2-audience'),
        oauth2TokenPrefix: document.getElementById('oauth2-token-prefix'),
        oauth2TokenField: document.getElementById('oauth2-token-field'),
        oauth2ClientAuth: document.getElementById('oauth2-client-auth'),
        oauth2GetToken: document.getElementById('oauth2-get-token'),
        oauth2RefreshToken: document.getElementById('oauth2-refresh-token'),
        oauth2ClearToken: document.getElementById('oauth2-clear-token'),
        oauth2TokenInfo: document.getElementById('oauth2-token-info'),
        oauth2TokenPreview: document.getElementById('oauth2-token-preview'),
        oauth2TokenExpires: document.getElementById('oauth2-token-expires'),
        oauth2TokenError: document.getElementById('oauth2-token-error'),

        // Settings
        settingTimeout: document.getElementById('setting-timeout'),
        settingFollowRedirects: document.getElementById('setting-follow-redirects'),
        settingOriginalMethod: document.getElementById('setting-original-method'),
        settingAuthHeader: document.getElementById('setting-auth-header'),
        settingMaxRedirects: document.getElementById('setting-max-redirects'),
        settingStrictSSL: document.getElementById('setting-strict-ssl'),
        settingDecompress: document.getElementById('setting-decompress'),
        settingIncludeCookies: document.getElementById('setting-include-cookies'),
        cookiePreview: document.getElementById('cookie-preview'),
        cookiePreviewList: document.getElementById('cookie-preview-list'),
        clearAllCookiesBtn: document.getElementById('clear-all-cookies-btn'),
        redirectOptions: document.getElementById('redirect-options'),
        saveResponseCheckbox: document.getElementById('save-response-checkbox'),

        // Scripts
        preRequestScriptEditor: document.getElementById('pre-request-editor'),
        postResponseScriptEditor: document.getElementById('post-response-editor'),

        // Response section
        responseStatus: document.getElementById('response-status'),
        responseTime: document.getElementById('response-time'),
        responseBodyEditor: document.getElementById('response-body-editor'),
        responseBodyToolbar: document.getElementById('response-body-toolbar'),
        responseViewRawBtn: document.getElementById('response-view-raw'),
        responseViewPreviewBtn: document.getElementById('response-view-preview'),
        responseHtmlPreview: document.getElementById('response-html-preview'),
        responsePreviewIframe: document.getElementById('response-preview-iframe'),
        responseHeadersTable: document.querySelector('#response-headers-table tbody'),
        responseCookiesTable: document.querySelector('#response-cookies-table tbody'),
        responsePlaceholder: document.getElementById('response-placeholder'),
        responseTabButtons: document.querySelectorAll('.response-tabs .tab'),
        responseTabPanels: document.querySelectorAll('.response-content .response-panel'),
        responseFramesBody: document.getElementById('ws-frames-body'),

        // Test results (in response section)
        testResultsSummary: document.getElementById('test-results-summary'),
        testResultsList: document.getElementById('test-results-list'),
        testCount: document.getElementById('test-count'),
        clearTestsBtn: document.getElementById('clear-tests-btn'),

        // Visualizer (in response section)
        visualizeTabBtn: document.getElementById('visualize-tab-btn'),
        visualizerPlaceholder: document.getElementById('visualizer-placeholder'),
        visualizerIframe: document.getElementById('visualizer-iframe'),

        // Sent Request (in response section)
        sentRequestUrl: document.getElementById('sent-request-url'),
        sentRequestParamsTable: document.querySelector('#sent-request-params-table tbody'),
        sentRequestParamsSection: document.getElementById('sent-request-params-section'),
        sentRequestQueryTable: document.querySelector('#sent-request-query-table tbody'),
        sentRequestQuerySection: document.getElementById('sent-request-query-section'),
        sentRequestHeadersTable: document.querySelector('#sent-request-headers-table tbody'),
        sentRequestBody: document.getElementById('sent-request-body'),
        sentRequestBodySection: document.getElementById('sent-request-body-section'),
        sentRequestBodyType: document.getElementById('sent-request-body-type'),
        sentRequestPlaceholder: document.getElementById('sent-request-placeholder'),

        // History
        historyList: document.getElementById('history-list'),
        historyEnv: document.getElementById('history-env'),
        historySidebar: document.getElementById('history-sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        collapseSidebarBtn: document.getElementById('collapse-sidebar-btn'),
        expandSidebarBtn: document.getElementById('expand-sidebar-btn'),
        sidebarResizeHandle: document.getElementById('sidebar-resize-handle'),

        // Environment
        envSettingsBtn: document.getElementById('env-settings-btn'),

        // Layout
        layoutStackBtn: document.getElementById('layout-stack-btn'),
        layoutSplitBtn: document.getElementById('layout-split-btn'),

        // Layout
        requestSection: document.querySelector('.request-section'),
        responseSection: document.querySelector('.response-section'),
        mainContent: document.querySelector('.main-content'),
        resizeHandle: document.getElementById('resize-handle')
    };
}

// ES Module export
export { initElements };

