/**
 * State Management Module
 * Single Responsibility: Manage application state
 */

/**
 * @typedef {Object} RequestSettings
 * @property {number} timeout - Request timeout in ms
 * @property {boolean} followRedirects - Follow HTTP redirects
 * @property {boolean} followOriginalMethod - Keep original method on redirect
 * @property {boolean} followAuthHeader - Include auth header on redirect
 * @property {number} maxRedirects - Maximum redirects to follow
 * @property {boolean} strictSSL - Verify SSL certificates
 * @property {boolean} decompress - Auto-decompress response
 * @property {boolean} includeCookies - Include cookies in request
 */

/**
 * @typedef {Object} Scripts
 * @property {string} preRequest - Pre-request script content
 * @property {string} postResponse - Post-response script content
 */

/**
 * @typedef {Object} QueryParam
 * @property {string} key
 * @property {string} value
 * @property {boolean} enabled
 * @property {string} [type] - OpenAPI type (string, integer, number, boolean, array)
 * @property {boolean} [required] - OpenAPI required flag
 * @property {string} [description] - OpenAPI description
 * @property {string} [format] - OpenAPI format (date-time, email, uuid, etc.)
 * @property {string[]} [enum] - OpenAPI enum values
 * @property {boolean} [deprecated] - OpenAPI deprecated flag
 */

/**
 * Application state factory
 * @returns {Object} State object
 */
function createState() {
    return {
        /** Original request data received from backend */
        requestData: null,
        selectedEnvironment: '',
        /** Current request path/URL */
        requestPath: '',
        /** Base URL without query string (for two-way sync) */
        baseUrl: '',
        pathParams: {},
        /** @type {QueryParam[]} */
        queryParams: [],

        /**
         * Parallel metadata maps for OpenAPI extended fields.
         * Keyed by param/header name. Stores: type, required, description, format, enum, deprecated.
         * These are populated during initial load and re-attached when building save data.
         * @type {Object<string, Object>}
         */
        _headersMeta: {},
        /** @type {Object<string, Object>} */
        _queryMeta: {},
        /** @type {Object<string, Object>} */
        _paramsMeta: {},

        // Body state - enhanced to support multiple types like Postman
        body: '',
        bodyType: 'none', // 'none', 'form-data', 'x-www-form-urlencoded', 'raw', 'binary', 'graphql'
        rawFormat: 'json', // 'json', 'text', 'xml', 'html', 'javascript'
        formData: [], // Array of {key, value, type, enabled} - type can be 'text' or 'file'
        urlEncodedData: [], // Array of {key, value, enabled}
        binaryFile: null, // File object for binary upload
        graphql: {
            query: '',
            variables: '',
            operationName: ''
        },

        authType: 'inherit',
        bearerToken: '',
        basicAuth: { username: '', password: '' },
        apiKey: { key: '', value: '', in: 'header' },
        oauth2: null, // OAuth2Config object or null
        activeHistoryEntryId: null,

        /** Readonly mode - method/URL are not editable */
        readonly: false,

        /** @type {RequestSettings} */
        settings: {
            timeout: 30000,
            followRedirects: true,
            followOriginalMethod: false,
            followAuthHeader: false,
            maxRedirects: 10,
            strictSSL: true,
            decompress: true,
            includeCookies: true
        },

        /** @type {Scripts} */
        scripts: {
            preRequest: '',
            postResponse: ''
        },

        lastResponse: null,
        /** Sent request data in backend format - used for Sent Request tab display */
        lastSentRequest: null,
        resolvedEnvironment: null,

        /** Global variables from environments.json → globalVariables */
        globalVariables: {},

        /** Session variables from workspaceState (persisted) */
        sessionVariables: {},

        /** Collection variables from collection JSON → variables */
        collectionVariables: {},

        /** Collection ID for variable persistence */
        collectionId: null,

        /** Collection name for display */
        collectionName: null,

        /** Dirty state - tracks if there are unsaved changes */
        isDirty: false,

        /** Original request snapshot for comparison */
        originalRequest: null
    };
}

// ES Module export
export { createState };

