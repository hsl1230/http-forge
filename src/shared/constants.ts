/**
 * HTTP Forge Constants
 */

/**
 * Extension identifier
 */
export const EXTENSION_ID = 'http-forge';

/**
 * Extension display name
 */
export const EXTENSION_NAME = 'HTTP Forge';

/**
 * Default request settings
 */
export const DEFAULT_REQUEST_SETTINGS = {
    timeout: 30000,
    followRedirects: true,
    followOriginalMethod: false,
    followAuthHeader: false,
    maxRedirects: 10,
    strictSSL: true,
    decompress: true,
    includeCookies: false
};

/**
 * HTTP Methods
 */
export const HTTP_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
    'HEAD'
] as const;

export type HttpMethod = typeof HTTP_METHODS[number];

/**
 * Content Types
 */
export const CONTENT_TYPES = {
    JSON: 'application/json',
    XML: 'application/xml',
    TEXT: 'text/plain',
    HTML: 'text/html',
    FORM_URLENCODED: 'application/x-www-form-urlencoded',
    FORM_DATA: 'multipart/form-data'
};

/**
 * View IDs
 */
export const VIEW_IDS = {
    collections: 'httpForge.collections',
    testSuites: 'httpForge.testSuites',
    environments: 'httpForge.environments'
};

/**
 * Command IDs
 */
export const COMMAND_IDS = {
    newRequest: 'httpForge.newRequest',
    openRequest: 'httpForge.openRequest',
    openRequestInNewPanel: 'httpForge.openRequestInNewPanel',
    newFolder: 'httpForge.newFolder',
    editFolder: 'httpForge.editFolder',
    newCollection: 'httpForge.newCollection',
    deleteCollection: 'httpForge.deleteCollection',
    deleteFolder: 'httpForge.deleteFolder',
    deleteRequest: 'httpForge.deleteRequest',
    deleteItem: 'httpForge.deleteItem',
    duplicateRequest: 'httpForge.duplicateRequest',
    renameItem: 'httpForge.renameItem',
    runCollection: 'httpForge.runCollection',
    editCollection: 'httpForge.editCollection',
    selectEnvironment: 'httpForge.selectEnvironment',
    editEnvironment: 'httpForge.editEnvironment',
    editEnvironments: 'httpForge.editEnvironments',
    refreshCollections: 'httpForge.refreshCollections',
    refreshEnvironments: 'httpForge.refreshEnvironments',
    importCollection: 'httpForge.importCollection',
    importPostmanEnvironment: 'httpForge.importPostmanEnvironment',
    exportCollection: 'httpForge.exportCollection',
    exportCollectionToRestClientFolder: 'httpForge.exportCollectionToRestClientFolder',
    createRequest: 'httpForge.createRequest',
    createRequestWithData: 'httpForge.createRequestWithData',
    saveRequestToCollection: 'httpForge.saveRequestToCollection',
    updateRequest: 'httpForge.updateRequest',
    closeAllRequestPanels: 'httpForge.closeAllRequestPanels',
    newEnvironment: 'httpForge.newEnvironment',
    deleteEnvironment: 'httpForge.deleteEnvironment',
    duplicateEnvironment: 'httpForge.duplicateEnvironment',
    renameEnvironment: 'httpForge.renameEnvironment',
    // Test Suite commands
    newTestSuite: 'httpForge.newTestSuite',
    openTestSuite: 'httpForge.openTestSuite',
    deleteTestSuite: 'httpForge.deleteTestSuite',
    renameTestSuite: 'httpForge.renameTestSuite',
    runTestSuite: 'httpForge.runTestSuite',
    duplicateTestSuite: 'httpForge.duplicateTestSuite',
    refreshTestSuites: 'httpForge.refreshTestSuites',
    // Console commands
    showConsole: 'httpForge.showConsole',
    clearConsole: 'httpForge.clearConsole',
    // Reorder commands
    moveItemUp: 'httpForge.moveItemUp',
    moveItemDown: 'httpForge.moveItemDown',
    // OpenAPI commands
    exportOpenApi: 'httpForge.exportOpenApi',
    importOpenApi: 'httpForge.importOpenApi',
    inferResponseSchema: 'httpForge.inferResponseSchema',
    inferAllResponseSchemas: 'httpForge.inferAllResponseSchemas'
};

/**
 * Storage state keys (for workspaceState/globalState)
 */
export const STATE_KEYS = {
    SELECTED_ENVIRONMENT: 'httpForge.selectedEnvironment',
    COOKIES: 'httpForge.cookies',
    SESSION_PREFIX: 'httpForge.session.'
};
