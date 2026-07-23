/**
 * AGL Request Tester - Main Entry Point (Refactored)
 * 
 * This file serves as the Composition Root - it assembles all modules
 * and wires their dependencies together following SOLID principles.
 * 
 * Architecture:
 * - Single Responsibility: Each module handles one concern
 * - Open/Closed: Modules can be extended via composition
 * - Liskov Substitution: Modules implement consistent interfaces
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Modules depend on abstractions (callbacks, interfaces)
 */

'use strict';

// ========================================
// Module Imports
// ========================================

// Core modules
import { initElements } from './elements.js';
import { createState } from './state.js';

// Utility modules
import { buildUrlPreview } from './url-builder.js';
import { createCaseInsensitiveMap, escapeHtml, formatDuration, formatTime, getHeaderValue, isHtmlResponse } from './utils.js';

// Manager modules (SOLID compliant)
import { createBodyTypeManager } from './body-type-manager.js';
import { createMessageHandler } from './message-handler.js';
import { createMonacoEditorsManager } from './monaco-editors-manager.js';
import { createPathVariablesManager } from './path-variables-manager.js';
import { createQueryParamsManager } from './query-params-manager.js';
import { createRequestLoader } from './request-loader.js';
import { createRequestSaver } from './request-saver.js';

// Schema editor
import { createSchemaEditorManager } from './schema-editor-manager.js';

// Auth modules
import { createOAuth2Manager } from './oauth2-manager.js';

// GraphQL schema module
import { createGraphQLSchemaManager } from './graphql-manager.js';

// Feature modules
import { createCookieManager } from './cookie-manager.js';
import { createFormManager } from './form-manager.js';
import { createHistoryRenderer } from './history-renderer.js';
import { createRequestBuilder } from './request-builder.js';
import { createRequestExecutor } from './request-executor.js';
import { createResponseHandler } from './response-handler.js';
import { getDefaultPostResponseScript, getDefaultPreRequestScript } from './script-runner.js';
import { createTestResultsManager } from './test-results.js';

// ========================================
// VS Code API
// ========================================
const vscode = acquireVsCodeApi();

// ========================================
// Application Class
// ========================================

/**
 * Main Application class - Composition Root
 * Assembles all modules and manages lifecycle
 */
class RequestTesterApp {
    constructor() {
        // Core state
        this.elements = null;
        this.state = null;
        
        // Managers (no modeManager - use state.readonly instead)
        this.queryParamsManager = null;
        this.pathVariablesManager = null;
        this.editorsManager = null;
        this.messageHandler = null;
        this.bodyTypeManager = null;
        this.requestLoader = null;
        this.requestSaver = null;
        
        // Schema editor
        this.schemaEditorManager = null;

        // Feature modules
        this.testResultsManager = null;
        this.cookieManager = null;
        // scriptRunner removed - scripts now execute on backend
        this.historyRenderer = null;
        this.formManager = null;
        this.requestBuilder = null;
        this.responseHandler = null;
        this.requestExecutor = null;

        // Layout state
        this.layoutMode = 'stack';
        this.layoutSplitRatio = 0.5;

        // URL preview request tracking
        this.previewRequestSequence = 0;
        this.latestPreviewRequestSequence = 0;
        this.latestResolvedUrlPreview = '';
        this.debouncedResolveUrlPreview = this.debounce(() => this.requestUrlPreview(), 500);
    }

    /**
     * Initialize the application
     */
    initialize() {
        try {
            // Phase 1: Initialize DOM elements
            this.elements = initElements();
            
            // Phase 2: Create state
            this.state = createState();
            this.restoreLayoutState();
            
            // Phase 3: Initialize managers (in dependency order)
            this.initializeManagers();
            
            // Phase 4: Initialize feature modules
            this.initializeFeatureModules();
            
            // Phase 5: Initialize event listeners
            this.initializeEventListeners();
            
            // Phase 6: Start message handling
            this.messageHandler.startListening();
            
            // Phase 7: Initialize Monaco editors
            this.editorsManager.initialize();

            // Phase 7b: Initialize schema editors (after Monaco)
            this.schemaEditorManager.init();

            // Phase 7c: Initialize GraphQL schema manager (after Monaco)
            this.graphqlSchemaManager.initialize();
            
            // Phase 8: Notify extension that webview is ready
            vscode.postMessage({ command: 'webviewLoaded' });
            
        } catch (error) {
            console.error('[RequestTesterApp] Initialization failed:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }

    /**
     * Initialize manager modules
     */
    initializeManagers() {
        // Form Manager - handles form elements
        this.formManager = createFormManager({
            elements: this.elements,
            state: this.state,
            escapeHtml,
            updateUrlPreview: () => this.updateUrlPreview(),
            syncUrlWithQueryParams: () => this.syncUrlWithQueryParams(),
            markDirty: () => this.markDirty()
        });

        // Query Params Manager - handles URL query parameters
        this.queryParamsManager = createQueryParamsManager({
            state: this.state,
            elements: this.elements,
            formManager: this.formManager,
            updateUrlPreview: () => this.updateUrlPreview()
        });

        // Path Variables Manager - handles Express.js path variables
        this.pathVariablesManager = createPathVariablesManager({
            state: this.state,
            elements: this.elements,
            formManager: this.formManager
        });

        // Monaco Editors Manager - handles all Monaco editor instances
        this.editorsManager = createMonacoEditorsManager({
            elements: this.elements,
            state: this.state,
            onBodyChange: () => this.markDirty(),
            onScriptChange: () => this.markDirty(),
            getDefaultPreRequestScript,
            getDefaultPostResponseScript
        });

        // Body Type Manager - handles body type switching
        this.bodyTypeManager = createBodyTypeManager({
            state: this.state,
            elements: this.elements,
            editorsManager: this.editorsManager,
            onTypeChange: () => this.markDirty()
        });

        // Request Saver - handles saving requests (after schemaEditorManager for live schema data)
        this.requestSaver = createRequestSaver({
            vscode,
            state: this.state,
            getMethod: () => this.getMethod(),
            getPath: () => this.getPath(),
            queryParamsManager: this.queryParamsManager,
            bodyTypeManager: this.bodyTypeManager,
            getHeaders: () => this.getHeaders(),
            getSchemaDataForSave: () => this.schemaEditorManager?.getSchemaDataForSave()
        });

        // OAuth2 Manager - handles OAuth2 UI and token management
        this.oauth2Manager = createOAuth2Manager({
            state: this.state,
            elements: this.elements,
            vscode,
            markDirty: () => this.markDirty()
        });

        // GraphQL Schema Manager - handles schema introspection, completions, explorer
        this.graphqlSchemaManager = createGraphQLSchemaManager({
            state: this.state,
            elements: this.elements,
            vscode,
            editorsManager: this.editorsManager,
            getRequestUrl: () => this.getPath(),
            getResolvedRequestUrl: () => this.latestResolvedUrlPreview,
            getHeaders: () => this.getHeaders()
        });
    }

    /**
     * Initialize feature modules
     */
    initializeFeatureModules() {
        // Test Results Manager
        this.testResultsManager = createTestResultsManager({
            escapeHtml,
            onAiFixTest: (testName, error) => {
                const lastResp = this.state.lastResponse;
                const sentReq = this.state.lastSentRequest;
                vscode.postMessage({
                    command: 'aiFixTest',
                    testName,
                    error,
                    method: sentReq?.method,
                    url: sentReq?.url,
                    responseStatus: lastResp?.status ?? lastResp?.statusCode,
                    responseBody: (lastResp?.body ?? '').slice(0, 1500),
                });
            }
        });
        this.testResultsManager.setElements({
            section: document.getElementById('response-tests-tab'),
            summary: this.elements.testResultsSummary,
            list: this.elements.testResultsList,
            badge: this.elements.testCount
        });

        // Cookie Manager
        this.cookieManager = createCookieManager({
            postMessage: (msg) => vscode.postMessage(msg)
        });

        // Note: Script execution is now handled by backend (extension side)
        // Frontend only provides script editor templates

        // History Renderer
        this.historyRenderer = createHistoryRenderer({
            escapeHtml,
            formatTime,
            formatDuration,
            postMessage: (msg) => vscode.postMessage(msg)
        });
        this.historyRenderer.setElement(this.elements.historyList);
        this.historyRenderer.setOnEntryClick((entryId, isShared) => {
            this.state.activeHistoryEntryId = entryId;
            vscode.postMessage({ command: 'useHistoryEntry', entryId, isShared });
        });
        this.historyRenderer.setOnEntryDelete((entryId, isShared) => {
            vscode.postMessage({ command: 'deleteHistoryEntry', entryId, isShared });
        });
        this.historyRenderer.setOnEntryShare((entryId) => {
            vscode.postMessage({ command: 'requestShareHistoryEntry', entryId });
        });
        this.historyRenderer.setOnEntryMove((entryId) => {
            vscode.postMessage({ command: 'requestMoveSharedHistoryEntry', entryId });
        });
        this.historyRenderer.setOnGroupRename((tag) => {
            vscode.postMessage({ command: 'requestRenameSharedGroup', tag });
        });

        // Request Builder
        this.requestBuilder = createRequestBuilder({
            elements: this.elements,
            state: this.state,
            getMethod: () => this.getMethod(),
            getPath: () => this.getPath()
        });

        // Response Handler (displays backend script execution results)
        this.responseHandler = createResponseHandler({
            elements: this.elements,
            state: this.state,
            getResponseBodyEditor: () => this.editorsManager.getResponseBodyEditor(),
            escapeHtml,
            formatDuration,
            testResultsManager: this.testResultsManager,
            vscode,
            onApplyAssertions: (script) => {
                vscode.postMessage({ command: 'applyAssertions', script });
            },
            onAiEnhance: ({ status, body, contentType }) => {
                const currentMethod = this.getMethod?.() ?? '';
                const currentUrl    = this.getPath?.() ?? '';
                vscode.postMessage({
                    command: 'aiSuggestAssertions',
                    status,
                    body,
                    contentType,
                    method: currentMethod,
                    url: currentUrl
                });
            },
            onAiExplainResponse: (data) => {
                vscode.postMessage({ command: 'aiExplainResponse', ...data, chatHistory: (this.state.aiChatMessages || []).slice(-10), historyContext: this.getHistorySummary() });
            },
            onAiContractTests: (data) => {
                vscode.postMessage({ command: 'aiGenerateContractTests', ...data, chatHistory: (this.state.aiChatMessages || []).slice(-10), historyContext: this.getHistorySummary() });
            },
            onAiExtractVars: (data) => {
                vscode.postMessage({ command: 'aiExtractVariables', ...data, chatHistory: (this.state.aiChatMessages || []).slice(-10), historyContext: this.getHistorySummary() });
            },
            onAiGenerateTypes: (data) => {
                vscode.postMessage({ command: 'aiGenerateTypes', ...data, chatHistory: (this.state.aiChatMessages || []).slice(-10), historyContext: this.getHistorySummary() });
            },
            onAiCompareResponses: (data) => {
                vscode.postMessage({ command: 'aiCompareResponses', ...data, chatHistory: (this.state.aiChatMessages || []).slice(-10), historyContext: this.getHistorySummary() });
            }
        });

        // Request Executor (scripts now execute on backend)
        this.requestExecutor = createRequestExecutor({
            vscode,
            state: this.state,
            requestBuilder: this.requestBuilder,
            responseHandler: this.responseHandler,
            testResultsManager: this.testResultsManager,
            onBeforeSend: () => this.onBeforeSend(),
            onAfterResponse: () => this.onAfterResponse(),
            onError: (msg) => this.showError(msg)
        });

        // Request Loader (depends on managers and feature modules)
        this.requestLoader = createRequestLoader({
            state: this.state,
            getMethod: () => this.getMethod(),
            setMethod: (m) => this.setMethod(m),
            getPath: () => this.getPath(),
            setPath: (p) => this.setPath(p),
            queryParamsManager: this.queryParamsManager,
            pathVariablesManager: this.pathVariablesManager,
            bodyTypeManager: this.bodyTypeManager,
            editorsManager: this.editorsManager,
            formManager: this.formManager,
            elements: this.elements,
            updateUrlPreview: () => this.updateUrlPreview(),
            markClean: () => this.markClean(),
            oauth2Manager: this.oauth2Manager
        });

        // Schema Editor Manager
        this.schemaEditorManager = createSchemaEditorManager({
            vscode,
            state: this.state,
            editorsManager: this.editorsManager,
            markDirty: () => this.markDirty()
        });

        // Message Handler - register all handlers
        this.messageHandler = createMessageHandler({
            handlers: this.createMessageHandlers()
        });
    }

    /**
     * Create message handlers map
     * @returns {Object} Handler map
     */
    createMessageHandlers() {
        return {
            'init': (msg) => this.handleInit(msg.data || msg),
            'initialize': (msg) => this.handleInit(msg.data || msg),
            'environmentChanged': (msg) => this.handleEnvironmentChanged(msg),
            'requestComplete': (msg) => this.handleRequestComplete(msg),
            'requestError': (msg) => this.handleRequestError(msg),
            'requestCancelled': (msg) => this.handleRequestCancelled(),
            'scriptProgress': (msg) => this.handleScriptProgress(msg),
            'historyUpdated': (msg) => this.renderHistory(msg.history ?? msg.data?.history),
            'applyHistoryEntry': (msg) => this.requestLoader.applyHistoryEntry(
                msg.entry || msg.data, 
                msg.fullResponse,
                this.responseHandler
            ),
            'loadRequest': (msg) => this.handleLoadRequest(msg),
            'requestSaved': (msg) => this.handleRequestSaved(msg),
            'sessionVariablesLoaded': (msg) => this.handleSessionVariablesLoaded(msg),
            'cookiesLoaded': (msg) => this.handleCookiesLoaded(msg),
            'docUpdated': (msg) => this.updateDocTab(msg.doc),
            'error': (msg) => this.handleError(msg),
            'sendRequestResponse': (msg) => this.handleSendRequestResponse(msg),
            'resolvedUrlPreview': (msg) => this.handleResolvedUrlPreview(msg),
            'assertionsApplied': (msg) => this.handleAssertionsApplied(msg),
            'aiAssertionSuggestions': (msg) => this.handleAiAssertionSuggestions(msg),
            'aiExplainResult':   (msg) => this.handleAiExplainResult(msg),
            'aiFixTestResult':   (msg) => this.handleAiFixTestResult(msg),
            'aiGeneratedScript': (msg) => this.handleAiGeneratedScript(msg),
            'aiGeneratedDocs':   (msg) => this.handleAiGeneratedDocs(msg),
            'aiGeneratedBody':   (msg) => this.handleAiGeneratedBody(msg),
            'aiContractTestsResult': (msg) => this.handleAiContractTestsResult(msg),
            'aiExtractVarsResult':   (msg) => this.handleAiExtractVarsResult(msg),
            'extractedVarsAddedToEnv': (msg) => { if (msg.error) this.showError(msg.error); },
            'aiGeneratedTypes':      (msg) => this.handleAiGeneratedTypes(msg),
            'aiDetectedHardcoded':   (msg) => this.handleAiDetectedHardcoded(msg),
            'aiCompareResult':       (msg) => this.handleAiCompareResult(msg),
            'aiChatResponse':        (msg) => this.handleAiChatResponse(msg),
            // Schema editor handlers
            ...this.schemaEditorManager.getMessageHandlers(),
            // OAuth2 handlers
            ...this.oauth2Manager.getMessageHandlers(),
            // GraphQL schema handlers
            ...this.graphqlSchemaManager.getMessageHandlers()
        };
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Send button
        this.elements.sendBtn?.addEventListener('click', () => this.sendRequest());

        // Environment settings button
        this.elements.envSettingsBtn?.addEventListener('click', () => {
            vscode.postMessage({ 
                command: 'openEnvironmentEditor',
                environment: this.state.selectedEnvironment
            });
        });

        // Add query param button
        this.elements.addQueryBtn?.addEventListener('click', () => {
            this.formManager.addParamRow('query', '', '', true, false, true);
        });

        // Add header button
        this.elements.addHeaderBtn?.addEventListener('click', () => {
            this.formManager.addHeaderRow('', '', true, true);
        });

        // Clear tests button
        this.elements.clearTestsBtn?.addEventListener('click', () => this.testResultsManager.clear());

        // Sidebar collapse/expand
        this.elements.collapseSidebarBtn?.addEventListener('click', () => {
            this.elements.historySidebar?.classList.add('collapsed');
            this.elements.sidebarToggle?.classList.remove('hidden');
        });
        this.elements.expandSidebarBtn?.addEventListener('click', () => {
            this.elements.historySidebar?.classList.remove('collapsed');
            this.elements.sidebarToggle?.classList.add('hidden');
        });

        // HTTP API Mode: Path input
        if (this.elements.requestPathInput) {
            this.elements.requestPathInput.addEventListener('input', 
                this.debounce(() => this.handlePathInputChange(), 300)
            );
            this.elements.requestPathInput.addEventListener('paste', () => {
                requestAnimationFrame(() => this.handlePathInputChange());
            });
        }

        // HTTP API Mode: Method select
        if (this.elements.methodSelect) {
            this.elements.methodSelect.addEventListener('change', () => {
                this.markDirty();
            });
        }

        // HTTP API Mode: Save button
        if (this.elements.btnSave) {
            this.elements.btnSave.addEventListener('click', () => this.requestSaver.saveRequest());
        }

        // Initialize body type event listeners
        this.bodyTypeManager.initEventListeners();

        // Initialize AI script and body generation buttons
        this.initializeAiScriptButtons();

        // Initialize tabs
        this.initializeTabs();

        // Initialize settings listeners
        this.initializeSettingsListeners();

        // Initialize layout listeners
        this.initializeLayoutListeners();

        // Initialize auth listeners
        this.initializeAuthListeners();

        // Initialize resize handlers
        this.initializeResizeHandlers();
    }

    // ========================================
    // Handler Methods
    // ========================================

    handleInit(data) {
        try {
            // Set readonly state - controls method/url editability
            this.state.readonly = data.readonly === true;
            // Allow save even in readonly mode (e.g., Endpoint Tester)
            this.state.allowSave = data.allowSave === true;
            this.applyReadonlyState();

            // Suppress dirty tracking during initialization
            this.state._suppressDirty = true;
            try {
                this.initializePanelData(data);
            } finally {
                this.state._suppressDirty = false;
            }

            this.applyLayoutMode(this.state.layoutMode || 'stack', { persist: false });

            // For Endpoint Tester mode (allowSave=true, no suiteId), enable save button
            // by default since the endpoint test configuration isn't saved yet.
            // For suite request editing (allowSave=true + suiteId), start clean
            // since the request is already persisted.
            if (this.state.allowSave && !data.suiteId) {
                // Mark as dirty so save button is enabled
                this.state.isDirty = true;
                this.updateSaveButtonState();
                this.state.originalRequest = this.requestSaver.takeSnapshot();
            } else {
                // Take snapshot first, then mark clean
                this.state.originalRequest = this.requestSaver.takeSnapshot();
                this.markClean();
            }
            
        } catch (error) {
            console.error('[RequestTesterApp] Init error:', error);
            this.showError(`Initialization error: ${error.message}`);
        }
    }

    handleEnvironmentChanged(msg) {
        this.state.selectedEnvironment = msg.data?.selectedEnvironment || msg.environment;
        this.state.resolvedEnvironment = msg.data?.resolvedEnvironment || this.state.resolvedEnvironment;
        
        if (this.elements.historyEnv) {
            this.elements.historyEnv.textContent = this.state.selectedEnvironment;
        }
        if (msg.data?.history || msg.history) {
            this.renderHistory(msg.data?.history || msg.history);
        }
        this.updateUrlPreview();
    }

    handleRequestComplete(msg) {
        this.resetRequestState();
        
        // Get sentRequest directly from the response (more reliable than extracting from history)
        if (msg.data?.sentRequest) {
            this.state.lastSentRequest = msg.data.sentRequest;
        }
        
        // Pass script results (console output and test results) to response handler
        this.requestExecutor.handleResponse(
            msg.data?.response || msg.data,
            msg.data?.scriptResults
        );
        if (msg.data?.history) {
            this.renderHistory(msg.data.history);
        }
    }

    handleRequestError(msg) {
        this.resetRequestState();
        this.requestExecutor.handleError(msg.error || 'Request failed');
    }

    handleRequestCancelled() {
        this.resetRequestState();
        this.requestExecutor.handleError('Request cancelled');
    }

    /**
     * Handle real-time script execution progress
     * Console output is now directed to VS Code Output channel
     * This handler only processes test results
     */
    handleScriptProgress(msg) {
        const { phase, testResults } = msg;

        // Display test results immediately (for post-response scripts)
        if (testResults && testResults.length > 0) {
            testResults.forEach(result => {
                // result may be an object { name, passed, message }
                if (result && typeof result === 'object') {
                    this.testResultsManager.addResult(result.name, result.passed, result.message || result.error || null);
                } else {
                    // Fallback - pass through for legacy shapes
                    this.testResultsManager.addResult(result);
                }
            });
        }
    }

    handleLoadRequest(msg) {
        if (msg.request) {
            // Suppress dirty tracking during the entire load cycle so intermediate
            // form-change events don't fire dirtyStateChanged to the extension.
            this.state._suppressDirty = true;

            try {
                // Update readonly state if provided
                if (typeof msg.readonly === 'boolean') {
                    this.state.readonly = msg.readonly;
                    this.applyReadonlyState();
                }

                // Update state for collection tracking — use unconditional
                // assignment with fallbacks so stale values from the previous
                // request never leak through.
                this.state.requestData = msg.request;
                this.state.collectionId = msg.collectionId || null;
                this.state.collectionName = msg.collectionName || null;
                this.state.suiteId = msg.suiteId || null;
                this.state.suiteRequestKey = msg.suiteRequestKey || null;
                this.state.disableSchemas = msg.disableSchemas || false;
                this.state.disableHistory = msg.disableHistory || false;
                this.state.resolvedEnvironment = msg.resolvedEnvironment || {};
                this.state.globalVariables = msg.globalVariables || {};
                this.state.sessionVariables = msg.sessionVariables || {};
                this.state.collectionVariables = msg.collectionVariables || {};
                this.state.selectedEnvironment = msg.selectedEnvironment || this.state.selectedEnvironment;

                // --- Full panel reset before populating ---
                // Response section
                this.responseHandler.clearResponse();
                this.state.lastResponse = null;
                this.state.lastSentRequest = null;
                this.resetRequestState();

                // Request section — form, method, path
                this.formManager.clearForm();
                this.setMethod('GET');
                this.setPath('');
                this.state.requestPath = '';
                this.state.baseUrl = '';

                // History sidebar
                this.state.activeHistoryEntryId = null;

                // Reset OAuth2 internal state (cached token, token UI, form fields)
                if (this.oauth2Manager) {
                    this.oauth2Manager.reset();
                }

                // Load the request (populates form, params, headers, body, auth, scripts, settings)
                this.requestLoader.loadCollectionRequest(msg.request);
                this.pathVariablesManager.applyParams(msg.request.params);
                this.pathVariablesManager.applyEnvironmentDefaults(this.state.resolvedEnvironment.variables);

                // Update document tab
                this.updateDocTab(msg.request?.doc);

                // Render history (clear if not provided so stale entries don't persist)
                this.renderHistory(msg.history || []);

                // Cookie preview — load if provided, clear otherwise
                if (msg.cookies && this.cookieManager) {
                    this.cookieManager.loadCookies(msg.cookies);
                    this.renderCookiePreview(msg.cookies);
                } else {
                    this.renderCookiePreview([]);
                }

                // Load schemas for the new request (clears previous schemas first)
                this.schemaEditorManager.loadSchemas();

                // Reset GraphQL schema cache (completions, explorer, status)
                this.graphqlSchemaManager.reset();

                this.updateUrlPreview();
                this.populateEnvironmentSelector();
                this.applySuiteEditMode();
            } finally {
                // Re-enable dirty tracking and mark clean
                this.state._suppressDirty = false;
            }

            // Take a fresh snapshot AFTER all population is done, then mark clean
            this.state.originalRequest = this.requestSaver.takeSnapshot();
            this.markClean();
        }
    }

    handleRequestSaved(msg) {
        // If a new request was created, update state with the new request ID
        // so subsequent saves will update instead of create
        if (msg?.requestId) {
            if (!this.state.requestData) {
                this.state.requestData = {};
            }
            this.state.requestData.id = msg.requestId;
            if (msg.name) {
                this.state.requestData.name = msg.name;
            }
        }
        
        this.markClean();
        this.state.originalRequest = this.requestSaver.takeSnapshot();
    }

    handleSessionVariablesLoaded(msg) {
        if (msg.sessionVariables) {
            this.state.sessionVariables = msg.sessionVariables;
        }
    }

    handleCookiesLoaded(msg) {
        if (this.cookieManager && msg.cookies) {
            this.cookieManager.loadCookies(msg.cookies);
            this.renderCookiePreview(msg.cookies);
        }
    }

    /**
     * Render the cookie preview in the settings tab
     * @param {Array} cookies - Array of cookie objects
     */
    renderCookiePreview(cookies) {
        const list = this.elements.cookiePreviewList;
        if (!list) return;

        if (!cookies || cookies.length === 0) {
            list.innerHTML = '<span class="no-cookies">No cookies stored</span>';
            return;
        }

        list.innerHTML = cookies.map(cookie => `
            <div class="cookie-preview-item" data-cookie-name="${this.escapeHtml(cookie.name)}" data-cookie-domain="${this.escapeHtml(cookie.domain || '')}">
                <span class="cookie-name">${this.escapeHtml(cookie.name)}</span>
                <span class="cookie-value" title="${this.escapeHtml(cookie.value)}">${this.escapeHtml(cookie.value)}</span>
                <span class="cookie-domain">${this.escapeHtml(cookie.domain || '*')}</span>
                <button class="cookie-delete-btn" title="Delete cookie">×</button>
            </div>
        `).join('');

        // Add delete handlers
        list.querySelectorAll('.cookie-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.cookie-preview-item');
                const name = item.dataset.cookieName;
                const domain = item.dataset.cookieDomain;
                vscode.postMessage({
                    command: 'deleteCookie',
                    name,
                    domain
                });
            });
        });
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }

    handleError(msg) {
        this.resetRequestState();
        this.showError(msg.message || msg.error);
    }

    handlePathInputChange() {
        const currentUrl = this.elements.requestPathInput.value;
        this.state.requestPath = currentUrl;
        this.latestResolvedUrlPreview = '';
        
        // Two-way sync: parse URL and merge params to table
        const keyEditable = !this.state.readonly;
        this.queryParamsManager.handleUrlChange(currentUrl, this.setPath.bind(this), keyEditable);
        
        this.pathVariablesManager.updateFromPath(currentUrl);
        this.updateUrlPreview();
        this.markDirty();
    }

    // ========================================
    // Helper Methods
    // ========================================

    initializePanelData(data) {
        const reqData = data.request || data.endpoint || data.endpointInfo;
        this.state.requestData = reqData;
        this.state.selectedEnvironment = data.selectedEnvironment || 'dev';
        this.state.resolvedEnvironment = data.resolvedEnvironment || {};
        this.state.globalVariables = data.globalVariables || {};
        this.state.sessionVariables = data.sessionVariables || {};
        this.state.collectionVariables = data.collectionVariables || {};
        this.state.collectionId = data.collectionId || null;
        this.state.collectionName = data.collectionName || null;
        this.state.suiteId = data.suiteId || null;
        this.state.suiteRequestKey = data.suiteRequestKey || null;
        this.state.disableSchemas = data.disableSchemas || false;
        this.state.disableHistory = data.disableHistory || false;

        // Show/hide suite edit banner
        this.applySuiteEditMode();

        // Clear previous response when loading new request data
        this.responseHandler.clearResponse();

        if (!reqData && this.state.readonly) {
            console.error('No request data received');
            this.showError('No request data received');
            return;
        }

        // Set method and path using unified accessors
        const method = (reqData?.method || 'GET').toUpperCase();
        this.setMethod(method);

        const path = reqData?.url || reqData?.endpointUri || reqData?.path || '/';
        this.setPath(path);
        this.state.requestPath = path;

        // Populate environment selector
        this.populateEnvironmentSelector();

        // Clear form
        this.formManager.clearForm();

        // Setup path variables (pass params so enum values can be used for select dropdowns)
        this.pathVariablesManager.updateFromPath(path, reqData?.params);
        // Apply saved params first (from collection/request), then fill in remaining from environment
        if (reqData?.params) {
            this.pathVariablesManager.applyParams(reqData.params);
        }
        this.pathVariablesManager.applyEnvironmentDefaults(this.state.resolvedEnvironment.variables);

        // Setup query params
        this.setupQueryParams(reqData);

        // Setup headers
        this.setupHeaders(reqData);

        // Setup body
        this.setupBody(reqData, method);

        // Apply scripts (always call to reset/apply - handles empty scripts)
        this.applyScripts(reqData?.scripts);

        // Reset and apply settings
        this.resetAndApplySettings(reqData?.settings);

        // Render history
        if (data.history) {
            this.renderHistory(data.history);
        }

        // Load and render cookies
        if (data.cookies) {
            if (this.cookieManager) {
                this.cookieManager.loadCookies(data.cookies);
            }
            this.renderCookiePreview(data.cookies);
        }

        // Apply auth from request if present (ensure init path populates auth UI)
            const rawAuth = reqData?.auth || {};
            if (reqData && rawAuth) {
                // Determine auth type (canonical: type, bearer, basic, apiKey)
                this.state.authType = rawAuth.type || 'inherit';

                // Bearer (canonical: auth.type === 'bearer', auth.bearerToken)
                this.state.bearerToken = rawAuth.bearerToken || '';

                // Basic (canonical: auth.type === 'basic', auth.basicAuth: { username, password })
                if (rawAuth.basicAuth && (rawAuth.basicAuth.username || rawAuth.basicAuth.password)) {
                    this.state.basicAuth = {
                        username: rawAuth.basicAuth.username || '',
                        password: rawAuth.basicAuth.password || ''
                    };
                } else {
                    this.state.basicAuth = { username: '', password: '' };
                }

                // API key (canonical: auth.type === 'apikey', auth.apikey: { key, value, in })
                if (rawAuth.apikey && (rawAuth.apikey.key || rawAuth.apikey.value)) {
                    this.state.apiKey = {
                        key: rawAuth.apikey.key || '',
                        value: rawAuth.apikey.value || '',
                        in: rawAuth.apikey.in || 'header'
                    };
                } else {
                    this.state.apiKey = { key: '', value: '', in: 'header' };
                }

                // OAuth2 (canonical: auth.type === 'oauth2', auth.oauth2: OAuth2Config)
                if (rawAuth.oauth2) {
                    this.state.oauth2 = { ...rawAuth.oauth2 };
                } else {
                    this.state.oauth2 = null;
                }

                // Update UI elements
                if (this.elements.authType) this.elements.authType.value = this.state.authType;
                if (this.elements.bearerToken) this.elements.bearerToken.value = this.state.bearerToken;
                if (this.elements.bearerTokenSection) this.elements.bearerTokenSection.classList.toggle('hidden', this.state.authType !== 'bearer');
                if (this.elements.basicAuthSection) this.elements.basicAuthSection.classList.toggle('hidden', this.state.authType !== 'basic');
                if (this.elements.basicUsername) this.elements.basicUsername.value = this.state.basicAuth.username || '';
                if (this.elements.basicPassword) this.elements.basicPassword.value = this.state.basicAuth.password || '';
                if (this.elements.apiKeySection) this.elements.apiKeySection.classList.toggle('hidden', this.state.authType !== 'apikey');
                if (this.elements.apiKeyKey) this.elements.apiKeyKey.value = this.state.apiKey.key || '';
                if (this.elements.apiKeyValue) this.elements.apiKeyValue.value = this.state.apiKey.value || '';
                if (this.elements.apiKeyIn) this.elements.apiKeyIn.value = this.state.apiKey.in || 'header';
                if (this.elements.oauth2Section) this.elements.oauth2Section.classList.toggle('hidden', this.state.authType !== 'oauth2');
                if (this.state.authType === 'oauth2' && this.oauth2Manager && this.state.oauth2) {
                    this.oauth2Manager.loadConfig(this.state.oauth2);
                }
            }

        this.updateUrlPreview();

        // Load schemas from backend for this request
        this.schemaEditorManager.loadSchemas();

        // Handle document tab visibility and content
        this.updateDocTab(reqData?.doc);
    }

    /**
     * Render markdown to HTML using regex-based parser
     * @param {string} md - Markdown content
     * @returns {string} HTML string
     */
    renderMarkdown(md) {
        if (!md) { return ''; }
        let html = md
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="doc-code-block"><code>$2</code></pre>')
            // Horizontal rules
            .replace(/^---+$/gm, '<hr class="doc-hr">')
            // Headings
            .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            // Blockquotes
            .replace(/^> (.+)$/gm, '<blockquote class="doc-blockquote">$1</blockquote>')
            .replace(/<\/blockquote>\n<blockquote class="doc-blockquote">/g, '<br>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="doc-link" href="$2" title="$2">$1</a>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
            // Unordered lists
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            // Table separator rows (consume trailing newline to prevent blank lines)
            .replace(/^\|[- :|]+\|\r?\n?/gm, '')
            // Table data rows
            .replace(/^\|(.+)\|$\r?\n?/gm, (match, inner) => {
                const cells = inner.split('|').map(c => c.trim());
                if (cells.every(c => !c)) { return ''; }
                return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
            })
            // Wrap consecutive <tr> in <table>
            .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table class="doc-table">$1</table>')
            .replace(/<tr><\/tr>/g, '')
            // Wrap consecutive <li> in <ul>
            .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
            // Remove newlines adjacent to block elements
            .replace(/\n+((<\/?(?:h[1-4]|table|ul|pre|div|hr|blockquote)[^>]*>)|$)/g, '$1')
            .replace(/((<\/?(?:h[1-4]|table|ul|pre|div|hr|blockquote)[^>]*>))\n+/g, '$1')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/<p>\s*<\/p>/g, '');
        return `<div class="doc-rendered">${html}</div>`;
    }

    /**
     * Update the Document tab visibility and content
     * @param {string|undefined} doc - Markdown documentation content
     */
    updateDocTab(doc) {
        this.state.doc = doc;
        const docContent = document.getElementById('doc-content');

        const toolbarHtml =
            '<div class="doc-toolbar">' +
                '<button class="doc-open-file-btn" id="doc-open-file-btn" title="Open documentation in editor">' +
                    '<span class="codicon codicon-go-to-file"></span> Open File' +
                '</button>' +
                '<button class="ai-gen-docs-btn" id="ai-gen-docs-btn" title="Generate documentation with GitHub Copilot">✨ Generate Docs</button>' +
            '</div>';

        if (doc) {
            // Render the doc content
            if (docContent) {
                docContent.innerHTML = toolbarHtml + this.renderMarkdown(doc);
            }
        } else {
            // Show empty state with Open File button to create doc.md
            if (docContent) {
                docContent.innerHTML = toolbarHtml +
                    '<div class="doc-empty-state">No documentation yet. Click "Open File" to create a doc.md for this request.</div>';
            }
        }

        // Attach click handler for Open File button
        const openFileBtn = document.getElementById('doc-open-file-btn');
        if (openFileBtn) {
            openFileBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'openDocFile' });
            });
        }

        // Attach click handler for Generate Docs button
        const genDocsBtn = document.getElementById('ai-gen-docs-btn');
        if (genDocsBtn) {
            genDocsBtn.addEventListener('click', () => {
                genDocsBtn.disabled = true;
                genDocsBtn.textContent = '⏳ Generating…';
                const sentReq = this.state.lastSentRequest;
                const lastResp = this.state.lastResponse;
                vscode.postMessage({
                    command: 'aiGenerateDocs',
                    method: this.getMethod(),
                    url: this.getPath(),
                    headers: (sentReq?.headers || []).map(h => h.name || h.key).filter(Boolean),
                    body: this.state.body || '',
                    responseStatus: lastResp?.status ?? lastResp?.statusCode,
                    responseBody: (lastResp?.body ?? '').slice(0, 600),
                    chatHistory: (this.state.aiChatMessages || []).slice(-10),
                    historyContext: this.getHistorySummary(),
                });
            });
        }
    }

    populateEnvironmentSelector() {
        // Just update the history sidebar label with the active environment
        if (this.elements.historyEnv) {
            this.elements.historyEnv.textContent = this.state.selectedEnvironment || 'dev';
        }
    }

    /**
     * Render history in the sidebar and store a copy in state for AI context.
     * @param {Array|undefined} history - HistoryUIEntry[] or undefined (no-op on undefined)
     */
    renderHistory(history) {
        if (history != null) this.state.historyEntries = history;
        this.historyRenderer.render(history || []);
    }

    /**
     * Build a compact summary of the last 20 persistent history entries for AI context.
     * Returns an empty string if no history is available.
     * @returns {string}
     */
    getHistorySummary() {
        const groups = this.state.historyEntries || [];
        const allEntries = [];
        for (const group of groups) {
            for (const entry of (group.entries || [])) allEntries.push(entry);
        }
        if (!allEntries.length) return '';
        // Most recent first
        allEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return allEntries.slice(0, 20).map((e, i) => {
            const method = e.sentRequest?.method || e.method || '?';
            const status = e.response?.status ?? '?';
            const statusText = e.response?.statusText ? ' ' + e.response.statusText : '';
            const time = e.response?.time ? ` ${e.response.time}ms` : '';
            const date = e.timestamp ? new Date(e.timestamp).toLocaleDateString() : '';
            const branch = e.branch && e.branch !== 'unknown' ? ` [${e.branch}]` : '';
            return `[${i + 1}] ${method} → HTTP ${status}${statusText}${time}${branch} (${date})`;
        }).join('\n');
    }

    setupQueryParams(requestData) {
        const queryData = requestData?.query;
        const urlPattern = requestData?.url || '/';
        const keyEditable = !this.state.readonly;
        
        if (Array.isArray(queryData)) {
            // Use applyFromCollection for proper two-way sync setup
            // This sets base URL, populates table, and builds full URL in input
            this.queryParamsManager.applyFromCollection(
                this.queryParamsManager.getUrlWithoutQuery(urlPattern),
                queryData,
                this.setPath.bind(this),
                keyEditable
            );
        } else {
            // No saved query params - parse from URL if present
            const { baseUrl: parsedBase, params } = this.queryParamsManager.parseUrl(urlPattern);
            this.queryParamsManager.applyFromCollection(
                parsedBase,
                params,
                this.setPath.bind(this),
                keyEditable
            );
        }
    }

    setupHeaders(requestData) {
        const envHeaders = this.state.resolvedEnvironment.headers || {};
        const allHeaders = createCaseInsensitiveMap();
        
        // Reset header metadata map
        this.state._headersMeta = {};
        
        // Start with environment headers (always enabled)
        Object.entries(envHeaders).forEach(([key, value]) => {
            allHeaders.set(key, { value, enabled: true });
        });

        // Merge request headers - supports both array format (new) and object format (legacy)
        const requestHeaders = requestData?.headers || [];
        if (Array.isArray(requestHeaders)) {
            // New format: Array<KeyValueEntry> — { key, value, enabled, type?, required?, description?, ... }
            requestHeaders.forEach(({ key, value, enabled, ...meta }) => {
                if (key) {
                    allHeaders.set(key, { value: value || '', enabled: enabled !== false });
                    // Store extended OpenAPI metadata in parallel map
                    if (Object.keys(meta).length > 0) {
                        this.state._headersMeta[key] = meta;
                    }
                }
            });
        } else if (typeof requestHeaders === 'object') {
            // Legacy format: Record<string, string>
            Object.entries(requestHeaders).forEach(([key, value]) => {
                allHeaders.set(key, { value, enabled: true });
            });
        }

        allHeaders.forEach(({ value, enabled }, key) => {
            // Use enum as select options, pattern (regex) for validation
            const meta = this.state._headersMeta[key];
            const options = meta && Array.isArray(meta.enum) && meta.enum.length > 0 ? meta.enum : null;
            const pattern = meta && meta.pattern ? meta.pattern : null;
            const combobox = !!(options && meta && meta.oneOf && meta.oneOf.length > 0);
            this.formManager.addHeaderRow(key, value, true, enabled, options, pattern, combobox);
        });
    }

    setupBody(requestData, method) {
        const bodyData = requestData?.body || requestData?.bodyFields;
        
        // Handle unified body format: { type: 'x-www-form-urlencoded', content: [...] }
        if (bodyData && typeof bodyData === 'object' && !Array.isArray(bodyData) && bodyData.type) {
            // Use bodyTypeManager for unified format (form-data, urlencoded, graphql, raw, etc.)
            this.bodyTypeManager.applyFromRequest(bodyData);
        } else if (Array.isArray(bodyData) && bodyData.length > 0) {
            // Legacy: Array of field names for building JSON template
            this.editorsManager.onReady(() => {
                this.formManager.applyBodyData({
                    bodyFields: bodyData,
                    method,
                    editor: this.editorsManager.getRequestBodyEditor()
                });
            });
        } else {
            // No body data - reset body type manager to clear previous request's body
            this.bodyTypeManager.reset();
        }
    }

    applyScripts(scripts) {
        // Always clear scripts first, then apply new values if present
        this.state.scripts.preRequest = scripts?.preRequest || '';
        this.state.scripts.postResponse = scripts?.postResponse || '';
        
        this.editorsManager.onReady(() => {
            this.editorsManager.setPreRequestScript(this.state.scripts.preRequest);
            this.editorsManager.setPostResponseScript(this.state.scripts.postResponse);
        });
    }

    /**
     * Reset settings to defaults and apply request settings if provided
     * @param {Object} [requestSettings] - Settings from request (optional)
     */
    resetAndApplySettings(requestSettings) {
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
        Object.assign(this.state.settings, defaultSettings);
        
        // Apply settings from request if present
        if (requestSettings) {
            Object.assign(this.state.settings, requestSettings);
        }
        
        // Apply to UI
        this.requestLoader.applySettingsToUI(this.state.settings);
    }

    updateUrlPreview() {
        const pattern = this.getPath();
        const preview = buildUrlPreview(pattern, this.state.pathParams, this.state.queryParams);

        if (this.elements.urlPreview) {
            this.elements.urlPreview.textContent = preview;
        }

        if (this.debouncedResolveUrlPreview) {
            this.debouncedResolveUrlPreview();
        }
    }

    async requestUrlPreview() {
        if (!this.requestBuilder) return;

        const request = this.requestBuilder.buildRequest();
        this.previewRequestSequence += 1;
        this.latestPreviewRequestSequence = this.previewRequestSequence;

        vscode.postMessage({
            command: 'resolveUrlPreview',
            request,
            sequence: this.previewRequestSequence
        });
    }

    handleResolvedUrlPreview(msg) {
        if (!msg || msg.sequence !== this.latestPreviewRequestSequence) {
            return;
        }

        if (msg.error) {
            this.latestResolvedUrlPreview = '';
            console.warn('[RequestTesterApp] URL preview resolution failed:', msg.error);
            return;
        }

        if (this.elements.urlPreview && typeof msg.url === 'string' && msg.url) {
            this.latestResolvedUrlPreview = msg.url;
            this.elements.urlPreview.textContent = msg.url;
        } else {
            this.latestResolvedUrlPreview = '';
        }
    }

    handleAssertionsApplied(msg) {
        const banner = document.getElementById('suggest-assertions-banner');
        if (msg.success) {
            if (banner) banner.classList.add('hidden');
        } else {
            this.showError(msg.error || 'Failed to apply assertions.');
        }
    }

    handleAiAssertionSuggestions(msg) {
        const aiBtn = document.getElementById('ai-enhance-suggestions-btn');
        if (msg.openedInCopilot) {
            // Copilot Chat opened — reset button and show toast
            if (aiBtn) { aiBtn.disabled = false; aiBtn.textContent = '✨ Enhance with AI'; }
            const note = document.createElement('div');
            note.className = 'ai-copilot-toast';
            note.textContent = '✓ Opened in GitHub Copilot Chat — drag backend files for richer context';
            document.body.appendChild(note);
            setTimeout(() => note.remove(), 4000);
            return;
        }
        this.responseHandler?.updateAiSuggestions(msg.suggestions || null, msg.error || null);
    }

    handleAiExplainResult(msg) {
        this.responseHandler?.showAiExplainPanel(msg.text || null, msg.error || null, msg.copilotQuery || null);
    }

    handleAiFixTestResult(msg) {
        this.testResultsManager?.handleAiFixResult(msg.testName, msg.explanation, msg.snippet, msg.error, msg.copilotQuery || null);
    }

    handleAiGeneratedScript(msg) {
        const phase = msg.phase ?? 'post-response';
        const confirmId = phase === 'pre-request' ? 'pre-request-ai-confirm' : 'post-response-ai-confirm';
        const barId    = phase === 'pre-request' ? 'pre-request-ai-bar'    : 'post-response-ai-bar';
        const confirm = document.getElementById(confirmId);
        if (confirm) { confirm.disabled = false; confirm.textContent = 'Generate'; }
        if (msg.openedInCopilot) {
            const note = document.createElement('div');
            note.className = 'ai-copilot-toast';
            note.textContent = '✓ Opened in GitHub Copilot Chat — drag backend files for richer context';
            document.body.appendChild(note);
            setTimeout(() => note.remove(), 4000);
            return;
        }
        if (msg.error) { this.showError(msg.error); return; }
        const editor = phase === 'pre-request'
            ? this.editorsManager.getPreRequestScriptEditor()
            : this.editorsManager.getPostResponseScriptEditor();
        if (editor) {
            editor.getModel()?.setValue(msg.script);
            document.getElementById(barId)?.classList.add('hidden');
            this.markDirty();
        }
    }

    handleAiGeneratedDocs(msg) {
        const btn = document.getElementById('ai-gen-docs-btn');
        if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Docs'; }
        if (msg.error) { this.showError(msg.error); return; }
        this.state.doc = msg.markdown;
        this.updateDocTab(msg.markdown);
        this.markDirty();
        // Switch to doc tab so the user sees the result
        document.querySelector('[data-tab="doc"]')?.click();
        // Refine in Copilot link — shown after the doc is applied
        if (msg.copilotQuery) {
            const docTabEl = document.querySelector('[data-tab="doc"]')?.closest('.tab-content');
            if (docTabEl) {
                let refine = docTabEl.querySelector('.ai-copilot-refine');
                if (!refine) {
                    refine = document.createElement('div');
                    refine.className = 'ai-copilot-refine';
                    docTabEl.appendChild(refine);
                }
                const safeQ = encodeURIComponent(msg.copilotQuery);
                refine.innerHTML = `<a class="ai-copilot-refine-link" href="#" data-copilot-query="${safeQ}">✦ Improve docs in Copilot Chat ↗</a>`;
                refine.querySelector('[data-copilot-query]')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    vscode.postMessage({ command: 'openInCopilot', query: decodeURIComponent(safeQ) });
                });
            }
        }
    }

    handleAiGeneratedBody(msg) {
        const confirm = document.getElementById('body-ai-confirm');
        const bar = document.getElementById('body-ai-bar');
        if (confirm) { confirm.disabled = false; confirm.textContent = 'Generate'; }
        if (msg.error) { this.showError(msg.error); return; }
        const editor = this.editorsManager.getRequestBodyEditor();
        if (editor) {
            editor.getModel()?.setValue(msg.body);
            bar?.classList.add('hidden');
            this.markDirty();
        }
    }

    handleAiContractTestsResult(msg) {
        if (msg.openedInCopilot) {
            const note = document.createElement('div');
            note.className = 'ai-copilot-toast';
            note.textContent = '✓ Opened in GitHub Copilot Chat — paste the generated pm.test() snippets into your post-response script';
            document.body.appendChild(note);
            setTimeout(() => note.remove(), 5000);
            return;
        }
        this.responseHandler?.showAiContractTestsPanel(
            msg.snippets || [],
            msg.error || null,
            (script) => vscode.postMessage({ command: 'applyAssertions', script }),
            msg.copilotQuery || null
        );
    }

    handleAiExtractVarsResult(msg) {
        this.responseHandler?.showAiExtractVarsPanel(
            msg.variables || [],
            msg.script || null,
            msg.error || null,
            (script) => vscode.postMessage({ command: 'applyAssertions', script }),
            (selectedVars) => vscode.postMessage({ command: 'addExtractedVarsToEnv', variables: selectedVars })
        );
    }

    handleAiGeneratedTypes(msg) {
        this.responseHandler?.showAiTypesPanel(msg.types || null, msg.error || null);
    }

    handleAiDetectedHardcoded(msg) {
        const panel = document.getElementById('ai-scan-panel');
        const title = document.getElementById('ai-scan-title');
        const issuesEl = document.getElementById('ai-scan-issues');
        if (!panel) return;
        const scanBtn = document.getElementById('btn-scan-request');
        if (scanBtn) { scanBtn.disabled = false; scanBtn.textContent = '✨ Scan'; }
        if (msg.error) {
            if (title) title.textContent = `⚠ ${msg.error}`;
            if (issuesEl) issuesEl.innerHTML = '';
            panel.classList.remove('hidden');
            return;
        }
        const issues = msg.issues || [];
        if (title) title.textContent = issues.length === 0
            ? '✅ No hardcoded values detected'
            : `🔍 ${issues.length} hardcoded value${issues.length !== 1 ? 's' : ''} detected`;
        if (issuesEl) {
            issuesEl.innerHTML = issues.map((i, idx) => {
                const sev = (i.severity || 'medium').toLowerCase();
                return `<div class="ai-scan-issue ai-scan-${sev}">
                    <input type="checkbox" class="ai-item-check" data-idx="${idx}" checked>
                    <span class="ai-scan-severity">${sev.toUpperCase()}</span>
                    <span class="ai-scan-location">${escapeHtml(i.location || '')}</span>
                    <code class="ai-scan-value">${escapeHtml(String(i.value || ''))}</code>
                    <span class="ai-scan-arrow">→</span>
                    <code class="ai-scan-var">{{${escapeHtml(i.suggestedVar || '')}}}</code>
                    <small class="ai-scan-reason">${escapeHtml(i.reason || '')}</small>
                </div>`;
            }).join('');
        }
        // Apply Selected footer
        let footerEl = panel.querySelector('.ai-scan-footer');
        if (!footerEl) {
            footerEl = document.createElement('div');
            footerEl.className = 'ai-scan-footer';
            panel.appendChild(footerEl);
        }
        footerEl.innerHTML = '';
        if (issues.length > 0) {
            const applyBtn = document.createElement('button');
            applyBtn.className = 'btn primary';
            applyBtn.textContent = 'Apply Selected';
            applyBtn.onclick = () => {
                const checked = Array.from(issuesEl?.querySelectorAll('.ai-item-check:checked') || []);
                checked.forEach(cb => {
                    const issue = issues[parseInt(cb.dataset.idx, 10)];
                    if (issue) this.applyHardcodedFix(issue.location || '', String(issue.value || ''), issue.suggestedVar || '');
                });
                applyBtn.textContent = `✓ Applied ${checked.length} fix${checked.length !== 1 ? 'es' : ''}`;
                applyBtn.disabled = true;
            };
            footerEl.appendChild(applyBtn);
        }
        panel.classList.remove('hidden');
    }

    handleAiCompareResult(msg) {
        this.responseHandler?.showAiComparePanel(msg.text || null, msg.error || null, msg.copilotQuery || null);
    }

    /**
     * Replace a hardcoded value with {{varName}} in the URL, a header, or the request body.
     * @param {string} location - 'URL', 'Body', or a header name (e.g. 'Authorization')
     * @param {string} rawValue - the literal string to replace
     * @param {string} varName  - the suggested environment variable name
     */
    applyHardcodedFix(location, rawValue, varName) {
        if (!rawValue || !varName) return;
        const replacement = `{{${varName}}}`;
        const loc = location.toLowerCase();
        if (loc === 'url') {
            const currentUrl = this.getPath();
            const newUrl = currentUrl.split(rawValue).join(replacement);
            if (this.elements.requestPathInput) {
                this.elements.requestPathInput.value = newUrl;
                this.elements.requestPathInput.dispatchEvent(new Event('input'));
            }
        } else if (loc === 'body') {
            const editor = this.editorsManager.getRequestBodyEditor();
            if (editor) {
                const newBody = editor.getValue().split(rawValue).join(replacement);
                editor.setValue(newBody);
            }
        } else {
            // Treat location as a header name — replace in any header whose value contains rawValue
            this.elements.headersList?.querySelectorAll('.param-row').forEach(row => {
                const valueInput = row.querySelector('.value');
                if (valueInput && valueInput.value.includes(rawValue)) {
                    valueInput.value = valueInput.value.split(rawValue).join(replacement);
                    valueInput.dispatchEvent(new Event('input'));
                }
            });
        }
    }

    // ─── Chat handlers ──────────────────────────────────────────────────────

    handleAiChatResponse(msg) {
        // Clear the safety-net timeout — a response arrived
        if (this.state.aiChatTimeoutId) {
            clearTimeout(this.state.aiChatTimeoutId);
            this.state.aiChatTimeoutId = null;
        }
        // Hybrid: aiChat now opens Copilot Chat panel instead of inline reply
        if (msg.openedInCopilot) {
            const chatToggle = document.getElementById('ai-chat-toggle-btn');
            const chatPanel  = document.getElementById('ai-chat-panel');
            chatPanel?.classList.add('hidden');
            const note = document.createElement('div');
            note.className = 'ai-copilot-toast';
            note.textContent = '✓ Opened in GitHub Copilot Chat';
            document.body.appendChild(note);
            setTimeout(() => note.remove(), 3000);
            const sendBtn = document.getElementById('ai-chat-send');
            const input   = document.getElementById('ai-chat-input');
            if (sendBtn)  { sendBtn.disabled = false; sendBtn.textContent = 'Send'; }
            if (input)    { input.disabled = false; }
            return;
        }
        const messages = document.getElementById('ai-chat-messages');
        const sendBtn = document.getElementById('ai-chat-send');
        const input = document.getElementById('ai-chat-input');
        if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = 'Send'; }
        if (input) input.disabled = false;
        if (!messages) return;
        // Remove the typing indicator if present
        const typing = messages.querySelector('.ai-chat-typing');
        if (typing) typing.remove();
        if (msg.error) {
            this._appendChatMessage('assistant', `⚠ ${msg.error}`, true);
        } else {
            this._appendChatMessage('assistant', msg.message || '');
            // Record in state
            if (!this.state.aiChatMessages) this.state.aiChatMessages = [];
            this.state.aiChatMessages.push({ role: 'assistant', content: msg.message || '' });
        }
        messages.scrollTop = messages.scrollHeight;
    }

    wireAiScriptButton(genBtnId, barId, inputId, confirmId, cancelId, phase) {
        const genBtn  = document.getElementById(genBtnId);
        const bar     = document.getElementById(barId);
        const input   = document.getElementById(inputId);
        const confirm = document.getElementById(confirmId);
        const cancel  = document.getElementById(cancelId);
        if (genBtn)  genBtn.onclick  = () => { bar?.classList.toggle('hidden'); input?.focus(); };
        if (cancel)  cancel.onclick  = () => bar?.classList.add('hidden');
        if (confirm) confirm.onclick = () => {
            const description = input?.value?.trim();
            if (!description) return;
            confirm.disabled = true;
            confirm.textContent = '⏳';
            const editor = phase === 'pre-request'
                ? this.editorsManager.getPreRequestScriptEditor()
                : this.editorsManager.getPostResponseScriptEditor();
            const lastResp = this.state.lastResponse;
            const respBody = lastResp?.body == null ? '' : typeof lastResp.body === 'object' ? JSON.stringify(lastResp.body) : String(lastResp.body);
            const respCt   = getHeaderValue(lastResp?.headers, 'content-type');
            vscode.postMessage({
                command: 'aiGenerateScript',
                phase,
                description,
                existingScript: editor?.getValue() ?? '',
                method: this.getMethod(),
                url: this.getPath(),
                responseStatus:      lastResp?.status ?? lastResp?.statusCode,
                responseBody:        respBody.slice(0, 600),
                responseContentType: respCt,
                chatHistory:         (this.state.aiChatMessages || []).slice(-10),
                historyContext:      this.getHistorySummary(),
            });
        };
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirm?.click();
            if (e.key === 'Escape') cancel?.click();
        });
    }

    initializeAiScriptButtons() {
        this.wireAiScriptButton(
            'ai-gen-pre-request-btn', 'pre-request-ai-bar',
            'pre-request-ai-input', 'pre-request-ai-confirm', 'pre-request-ai-cancel',
            'pre-request'
        );
        this.wireAiScriptButton(
            'ai-gen-post-response-btn', 'post-response-ai-bar',
            'post-response-ai-input', 'post-response-ai-confirm', 'post-response-ai-cancel',
            'post-response'
        );
        const genBodyBtn   = document.getElementById('ai-generate-body-btn');
        const bodyBar      = document.getElementById('body-ai-bar');
        const bodyInput    = document.getElementById('body-ai-input');
        const bodyConfirm  = document.getElementById('body-ai-confirm');
        const bodyCancel   = document.getElementById('body-ai-cancel');
        if (genBodyBtn)  genBodyBtn.onclick  = () => { bodyBar?.classList.toggle('hidden'); bodyInput?.focus(); };
        if (bodyCancel)  bodyCancel.onclick  = () => bodyBar?.classList.add('hidden');
        if (bodyConfirm) bodyConfirm.onclick = () => {
            const description = bodyInput?.value?.trim();
            if (!description) return;
            bodyConfirm.disabled = true;
            bodyConfirm.textContent = '⏳';
            vscode.postMessage({
                command: 'aiGenerateBody',
                description,
                method: this.getMethod(),
                url: this.getPath(),
                format: document.getElementById('raw-format')?.value || 'json',
                chatHistory: (this.state.aiChatMessages || []).slice(-10),
                historyContext: this.getHistorySummary(),
            });
        };
        if (bodyInput) bodyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') bodyConfirm?.click();
            if (e.key === 'Escape') bodyCancel?.click();
        });

        // ── ✨ Scan button ────────────────────────────────────────────────────
        const scanBtn = document.getElementById('btn-scan-request');
        const scanPanel = document.getElementById('ai-scan-panel');
        const scanClose = document.getElementById('ai-scan-close');
        if (scanClose) scanClose.onclick = () => scanPanel?.classList.add('hidden');
        if (scanBtn) {
            scanBtn.onclick = () => {
                scanBtn.disabled = true;
                scanBtn.textContent = '⏳';
                const titleEl = document.getElementById('ai-scan-title');
                if (titleEl) titleEl.textContent = '🔍 Scanning for hardcoded values…';
                const issuesEl = document.getElementById('ai-scan-issues');
                if (issuesEl) issuesEl.innerHTML = '';
                scanPanel?.classList.remove('hidden');
                vscode.postMessage({
                    command: 'aiDetectHardcoded',
                    method: this.getMethod(),
                    url: this.getPath(),
                    headers: this.getHeaders().map(h => ({ name: h.name, value: h.value })),
                    body: this.editorsManager.getRequestBodyEditor()?.getValue() ?? '',
                    historyContext: this.getHistorySummary(),
                });
            };
        }

        // ── 💬 Chat panel ─────────────────────────────────────────────────────
        if (!this.state.aiChatMessages) this.state.aiChatMessages = [];
        const chatPanel  = document.getElementById('ai-chat-panel');
        const chatToggle = document.getElementById('ai-chat-toggle-btn');
        const chatClose  = document.getElementById('ai-chat-close');
        const chatClear  = document.getElementById('ai-chat-clear');
        const chatInput  = document.getElementById('ai-chat-input');
        const chatSend   = document.getElementById('ai-chat-send');

        if (chatToggle) chatToggle.onclick = () => chatPanel?.classList.toggle('hidden');
        if (chatClose)  chatClose.onclick  = () => chatPanel?.classList.add('hidden');
        if (chatClear) chatClear.onclick = () => {
            this.state.aiChatMessages = [];
            const msgs = document.getElementById('ai-chat-messages');
            if (msgs) msgs.innerHTML = '';
        };

        const sendChat = () => {
            const text = chatInput?.value?.trim();
            if (!text) return;
            if (chatSend)  { chatSend.disabled = true; chatSend.textContent = '⏳'; }
            if (chatInput) { chatInput.disabled = true; chatInput.value = ''; }
            this._appendChatMessage('user', text);
            // Typing indicator
            const msgs = document.getElementById('ai-chat-messages');
            if (msgs) {
                const typing = document.createElement('div');
                typing.className = 'ai-chat-message ai-chat-assistant ai-chat-typing';
                typing.textContent = '…';
                msgs.appendChild(typing);
                msgs.scrollTop = msgs.scrollHeight;
            }
            const lastResp = this.state.lastResponse;
            const ct = getHeaderValue(lastResp?.headers, 'content-type');
            const respBodyStr = lastResp?.body == null ? '' : typeof lastResp.body === 'object' ? JSON.stringify(lastResp.body) : String(lastResp.body);
            // Current form state (what's configured right now, regardless of last send)
            const currentMethod = this.getMethod();
            const currentUrl    = this.getPath();
            const currentHeaders = this.getHeaders()
                .filter(h => h.enabled !== false && h.key)
                .map(h => `${h.key}: ${h.value}`)
                .join('\n');
            const currentBody = this.editorsManager.getRequestBodyEditor()?.getValue() ?? '';
            const bodyType = document.querySelector('input[name="body-type"]:checked')?.value || 'none';
            // Cap history to last 20 messages (10 turns) to avoid LM context-limit hangs
            const history = (this.state.aiChatMessages || []).slice(-20);
            // Build a compact response history summary (all runs, not just the last)
            const responseHistorySummary = (this.state.responseHistory || []).map((r, i, arr) => {
                const secsAgo = Math.round((Date.now() - r.timestamp) / 1000);
                const label = i === arr.length - 1 ? ' ← current' : '';
                return `[${i + 1}] HTTP ${r.status}${r.statusText ? ' ' + r.statusText : ''}${r.contentType ? ', ' + r.contentType : ''} (${secsAgo}s ago)${label}`;
            }).join('\n');
            try {
                vscode.postMessage({
                    command: 'aiChat',
                    messages: history,
                    newMessage: text,
                    context: {
                        // Current request (form state)
                        method: currentMethod,
                        url: currentUrl,
                        headers: currentHeaders,
                        requestBody: bodyType !== 'none' ? currentBody.slice(0, 600) : '',
                        requestBodyType: bodyType,
                        // Last response
                        status: lastResp?.status ?? lastResp?.statusCode,
                        statusText: lastResp?.statusText || '',
                        responseBody: respBodyStr.slice(0, 800),
                        contentType: ct,
                        // All recent responses (last 5 runs)
                        responseHistorySummary: responseHistorySummary || '',
                        // Persistent history for this endpoint (last 20 saves)
                        endpointHistory: this.getHistorySummary(),
                    },
                });
            } catch (err) {
                // Restore UI if the message can't be sent
                if (chatSend)  { chatSend.disabled = false; chatSend.textContent = 'Send'; }
                if (chatInput) chatInput.disabled = false;
                const typingEl = document.getElementById('ai-chat-messages')?.querySelector('.ai-chat-typing');
                if (typingEl) typingEl.remove();
                this._appendChatMessage('assistant', `⚠ ${err?.message || 'Failed to send message'}`, true);
                return;
            }
            // Safety-net timeout: if no response arrives within 30s, unlock the UI
            if (this.state.aiChatTimeoutId) clearTimeout(this.state.aiChatTimeoutId);
            this.state.aiChatTimeoutId = setTimeout(() => {
                this.state.aiChatTimeoutId = null;
                if (chatSend && chatSend.disabled)  { chatSend.disabled = false; chatSend.textContent = 'Send'; }
                if (chatInput && chatInput.disabled) chatInput.disabled = false;
                const typingEl = document.getElementById('ai-chat-messages')?.querySelector('.ai-chat-typing');
                if (typingEl) typingEl.remove();
                this._appendChatMessage('assistant', '⚠ Request timed out. Please try again.', true);
            }, 30000);
            if (!this.state.aiChatMessages) this.state.aiChatMessages = [];
            this.state.aiChatMessages.push({ role: 'user', content: text });
        };

        if (chatSend) chatSend.onclick = sendChat;
        if (chatInput) chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChat();
        });
    }

    _appendChatMessage(role, content, isError = false) {
        const msgs = document.getElementById('ai-chat-messages');
        if (!msgs) return;
        const div = document.createElement('div');
        div.className = `ai-chat-message ai-chat-${role}`;
        if (isError) div.classList.add('ai-chat-error');
        // Simple markdown-like rendering: code blocks, inline code, newlines
        div.innerHTML = escapeHtml(content)
            .replace(/```(\w*)?\n?([\s\S]*?)```/g, '<pre class="ai-chat-code">$2</pre>')
            .replace(/`([^`]+)`/g, '<code class="ai-chat-inline-code">$1</code>')
            .replace(/\n/g, '<br>');
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    syncUrlWithQueryParams() {
        if (this.state.readonly) return;  // Don't sync URL in readonly mode
        
        this.queryParamsManager.handleTableChange(
            () => this.getPath(),
            (url) => {
                this.setPath(url);
                this.state.requestPath = url;
            }
        );
    }

    /**
     * Get all headers from DOM (including disabled ones)
     * Re-attaches OpenAPI metadata from parallel map for save round-trip.
     * @returns {Array<{key: string, value: string, enabled: boolean, [meta: string]: any}>} Headers array
     */
    getHeaders() {
        const headers = [];
        this.elements.headersList?.querySelectorAll('.param-row').forEach(row => {
            const checkbox = row.querySelector('.param-checkbox');
            const enabled = checkbox ? checkbox.checked : true;
            const key = row.querySelector('.key')?.value;
            const value = row.querySelector('.value')?.value;
            if (key) {
                const header = { key, value: value || '', enabled };
                // Re-attach OpenAPI metadata if present
                if (this.state._headersMeta && this.state._headersMeta[key]) {
                    Object.assign(header, this.state._headersMeta[key]);
                }
                headers.push(header);
            }
        });
        return headers;
    }

    /**
     * Get only enabled headers as Record<string, string> for HTTP requests
     * @returns {Record<string, string>} Enabled headers only
     */
    getEnabledHeaders() {
        const headers = {};
        this.elements.headersList?.querySelectorAll('.param-row').forEach(row => {
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

    // ========================================
    // Method/Path Accessors (Unified)
    // ========================================

    /**
     * Get current HTTP method
     * @returns {string} HTTP method (GET, POST, etc.)
     */
    getMethod() {
        return this.elements.methodSelect?.value || 'GET';
    }

    /**
     * Set the HTTP method
     * @param {string} method - HTTP method
     */
    setMethod(method) {
        const upperMethod = (method || 'GET').toUpperCase();
        if (this.elements.methodSelect) {
            this.elements.methodSelect.value = upperMethod;
        }
    }

    /**
     * Get the current request path/URL
     * @returns {string} Request path
     */
    getPath() {
        return this.elements.requestPathInput?.value || '/';
    }

    /**
     * Set the request path/URL
     * @param {string} path - Request path
     */
    setPath(path) {
        if (this.elements.requestPathInput) {
            this.elements.requestPathInput.value = path;
        }
    }

    /**
     * Apply readonly state to method/path elements
     */
    applyReadonlyState() {
        const isReadonly = this.state.readonly;
        
        // Method select - disable when readonly
        if (this.elements.methodSelect) {
            this.elements.methodSelect.disabled = isReadonly;
        }
        
        // Path input - set readonly attribute
        if (this.elements.requestPathInput) {
            this.elements.requestPathInput.readOnly = isReadonly;
            this.elements.requestPathInput.classList.toggle('readonly', isReadonly);
        }
        
        // Save button - hide in readonly mode unless allowSave is true
        if (this.elements.btnSave) {
            const hideSave = isReadonly && !this.state.allowSave;
            this.elements.btnSave.classList.toggle('hidden', hideSave);
        }
    }

    // ========================================
    // Dirty State Management
    // ========================================

    markDirty() {
        // Suppress dirty events during bulk loading to avoid premature dirtyStateChanged messages
        if (this.state._suppressDirty) return;
        // Only track dirty state when not readonly, or when allowSave is true
        if (this.state.readonly && !this.state.allowSave) return;
        
        // Compare current state to original to determine if there are real changes
        const hasChanges = this.requestSaver.hasChangedFrom(this.state.originalRequest);
        
        if (hasChanges !== this.state.isDirty) {
            this.state.isDirty = hasChanges;
            this.updateSaveButtonState();
            // Notify extension of dirty state change (include request snapshot for save-on-close)
            vscode.postMessage({
                command: 'dirtyStateChanged',
                isDirty: hasChanges,
                requestState: hasChanges ? this.requestSaver.buildRequestData() : null
            });
        }
    }

    markClean() {
        if (this.state._suppressDirty) return;
        this.state.isDirty = false;
        this.updateSaveButtonState();
        // Notify extension of dirty state change
        vscode.postMessage({ command: 'dirtyStateChanged', isDirty: false });
    }

    updateSaveButtonState() {
        if (!this.elements.btnSave) return;
        
        const isSuiteMode = !!this.state.suiteId;
        if (this.state.isDirty) {
            this.elements.btnSave.disabled = false;
            this.elements.btnSave.classList.add('has-changes');
            this.elements.btnSave.title = isSuiteMode ? 'Save changes to suite' : 'Save changes to collection';
            this.elements.btnSave.textContent = isSuiteMode ? 'Save to Suite' : 'Save';
        } else {
            this.elements.btnSave.disabled = true;
            this.elements.btnSave.classList.remove('has-changes');
            this.elements.btnSave.title = 'No changes to save';
            this.elements.btnSave.textContent = isSuiteMode ? 'Save to Suite' : 'Save';
        }
    }

    /**
     * Show or hide suite-edit-mode UI elements
     */
    applySuiteEditMode() {
        const banner = document.getElementById('suite-edit-banner');
        if (banner) {
            if (this.state.suiteId) {
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }
        // Hide history sidebar in suite edit mode
        if (this.state.disableHistory) {
            const historySidebar = document.getElementById('history-sidebar');
            if (historySidebar) historySidebar.style.display = 'none';
        }
        // Hide schema tabs and per-field schema toggles in suite edit mode
        if (this.state.disableSchemas) {
            document.body.classList.add('suite-edit-no-schema');
            const bodySchemaTab = document.querySelector('[data-tab="body-schema"]');
            const responseSchemaTab = document.querySelector('[data-tab="response-schema"]');
            if (bodySchemaTab) bodySchemaTab.style.display = 'none';
            if (responseSchemaTab) responseSchemaTab.style.display = 'none';
        }
        // Hide Document tab in suite edit mode
        if (this.state.suiteId) {
            const docTab = document.querySelector('[data-tab="doc"]');
            if (docTab) docTab.style.display = 'none';
        }
    }

    // ========================================
    // Request Execution
    // ========================================

    async sendRequest() {
        await this.requestExecutor.execute();
    }

    resetRequestState() {
        this.requestExecutor.reset();
        if (this.elements.sendBtn) {
            this.elements.sendBtn.textContent = 'Send';
            this.elements.sendBtn.classList.remove('cancel');
        }
        this.elements.loadingOverlay?.classList.add('hidden');
    }

    onBeforeSend() {
        if (this.elements.sendBtn) {
            this.elements.sendBtn.textContent = 'Cancel';
            this.elements.sendBtn.classList.add('cancel');
        }
        this.elements.loadingOverlay?.classList.remove('hidden');
    }

    onAfterResponse() {
        if (this.elements.sendBtn) {
            this.elements.sendBtn.textContent = 'Send';
            this.elements.sendBtn.classList.remove('cancel');
        }
        this.elements.loadingOverlay?.classList.add('hidden');
    }

    // ========================================
    // Variable Change Handling
    // ========================================

    onVariableChange(change) {
        if (!change) return;
        vscode.postMessage({ command: 'variableChange', change });
    }

    // ========================================
    // HTTP Request from Scripts
    // ========================================

    createSendHttpRequest() {
        let requestIdCounter = 0;
        const pendingRequests = new Map();

        // Store reference for response handling
        this._pendingHttpRequests = pendingRequests;

        return (options) => {
            return new Promise((resolve, reject) => {
                const requestId = `script-request-${++requestIdCounter}`;
                
                const timeoutId = setTimeout(() => {
                    if (pendingRequests.has(requestId)) {
                        pendingRequests.delete(requestId);
                        reject(new Error('Request timed out'));
                    }
                }, 30000);
                
                pendingRequests.set(requestId, { resolve, reject, timeoutId });

                vscode.postMessage({
                    command: 'sendHttpRequest',
                    requestId,
                    options
                });
            });
        };
    }

    handleSendRequestResponse(msg) {
        if (!this._pendingHttpRequests) return;
        
        const pending = this._pendingHttpRequests.get(msg.requestId);
        if (pending) {
            clearTimeout(pending.timeoutId);  // Clear timeout when request completes
            this._pendingHttpRequests.delete(msg.requestId);
            if (msg.error) {
                pending.reject(new Error(msg.error));
            } else {
                pending.resolve(msg.response);
            }
        }
    }

    // ========================================
    // UI Helpers
    // ========================================

    showError(message) {
        if (!this.elements.errorMessage) {
            console.error('Error:', message);
            return;
        }
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.classList.remove('hidden');
        setTimeout(() => {
            this.elements.errorMessage?.classList.add('hidden');
        }, 5000);
    }

    updateCookiesDisplay() {
        if (!this.elements.responseCookiesTable) return;
        
        const allCookies = this.cookieManager?.getAll() || [];
        
        this.elements.responseCookiesTable.innerHTML = '';
        if (allCookies.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="text-muted">No cookies</td>';
            this.elements.responseCookiesTable.appendChild(row);
            return;
        }
        
        allCookies.forEach(cookie => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(cookie.name)}</td>
                <td>${escapeHtml(cookie.value || '')}</td>
                <td>${escapeHtml(cookie.domain || '')}</td>
                <td>${escapeHtml(cookie.path || '/')}</td>
                <td>${cookie.expires ? new Date(cookie.expires).toLocaleString() : 'Session'}</td>
            `;
            this.elements.responseCookiesTable.appendChild(row);
        });
    }

    debounce(fn, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ========================================
    // Tab Initialization
    // ========================================

    initializeTabs() {
        // Request tabs
        this.elements.tabButtons?.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                const targetId = `${tabName}-tab`;

                this.elements.tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                this.elements.tabPanels?.forEach(panel => {
                    panel.classList.remove('active');
                    panel.classList.add('hidden');
                });
                
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    targetPanel.classList.remove('hidden');
                }

                // Layout editors
                if (tabName === 'body') this.editorsManager.layout('body');
                if (tabName === 'scripts') {
                    this.editorsManager.layout('preRequest');
                    this.editorsManager.layout('postResponse');
                }
                if (tabName === 'body-schema' || tabName === 'response-schema') {
                    this.schemaEditorManager.layout();
                }
            });
        });

        // Script tabs switching (tabs under the Scripts tab in the request section)
        // Supports both horizontal (.script-tab) and vertical (.script-tab-vertical) layouts
        document.querySelectorAll('.script-tab, .script-tab-vertical').forEach(tab => {
            tab.addEventListener('click', () => {
                const scriptTab = tab.dataset.scriptTab;
                document.querySelectorAll('.script-tab, .script-tab-vertical').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                document.querySelectorAll('.script-tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                document.getElementById(scriptTab + '-script-panel').classList.add('active');

                // Trigger layout refresh for visible editor
                requestAnimationFrame(() => {
                    if (scriptTab === 'pre-request') {
                        this.editorsManager.layout('preRequest');
                    } else if (scriptTab === 'post-response') {
                        this.editorsManager.layout('postResponse');
                    }
                });
            });
        });

        // GraphQL editor tabs switching (Query / Variables)
        document.querySelectorAll('.graphql-tab-vertical').forEach(tab => {
            tab.addEventListener('click', () => {
                const gqlTab = tab.dataset.graphqlTab;
                document.querySelectorAll('.graphql-tab-vertical').forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                document.querySelectorAll('.graphql-tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                document.getElementById('graphql-' + gqlTab + '-panel').classList.add('active');

                // Trigger layout refresh for visible editor
                requestAnimationFrame(() => {
                    if (gqlTab === 'query') {
                        this.editorsManager.layout('graphqlQuery');
                    } else if (gqlTab === 'variables') {
                        this.editorsManager.layout('graphqlVariables');
                    }
                });
            });
        });

        // Response tabs (Body, Headers, Cookies, Tests, Console, Sent Request)
        this.elements.responseTabButtons?.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.responseTab;
                // Buttons without data-response-tab (e.g. Chat toggle) handle their own click
                if (!tabName) return;
                const targetId = `response-${tabName}-tab`;

                this.elements.responseTabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                this.elements.responseTabPanels?.forEach(panel => {
                    panel.classList.remove('active');
                    panel.classList.add('hidden');
                });
                
                const targetPanel = document.getElementById(targetId);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                    targetPanel.classList.remove('hidden');
                }

                // Layout response body editor when switching to body tab
                if (tabName === 'body') {
                    this.editorsManager.layout('response');

                    // Show toolbar only when the last response is HTML
                    if (isHtmlResponse(this.state.lastResponse)) {
                        this.elements.responseBodyToolbar?.classList.remove('hidden');
                    } else {
                        this.elements.responseBodyToolbar?.classList.add('hidden');
                    }
                }

                // Only show the response-body toolbar when the Body tab is active.
                // The response handler controls whether the toolbar is visible for HTML responses;
                // here we ensure it is hidden for all other tabs.
                if (tabName !== 'body') {
                    this.elements.responseBodyToolbar?.classList.add('hidden');
                }
            });
        });
    }

    initializeSettingsListeners() {
        const settings = this.state.settings;
        const e = this.elements;

        if (e.settingTimeout) {
            e.settingTimeout.value = settings.timeout;
            e.settingTimeout.addEventListener('input', () => {
                const val = parseInt(e.settingTimeout.value, 10);
                settings.timeout = isNaN(val) ? 0 : Math.max(0, val);
                this.markDirty();
            });
        }

        if (e.settingFollowRedirects) {
            e.settingFollowRedirects.checked = settings.followRedirects;
            e.settingFollowRedirects.addEventListener('change', () => {
                settings.followRedirects = e.settingFollowRedirects.checked;
                e.redirectOptions?.classList.toggle('hidden', !settings.followRedirects);
                this.markDirty();
            });
            e.redirectOptions?.classList.toggle('hidden', !settings.followRedirects);
        }

        if (e.settingOriginalMethod) {
            e.settingOriginalMethod.checked = settings.followOriginalMethod;
            e.settingOriginalMethod.addEventListener('change', () => {
                settings.followOriginalMethod = e.settingOriginalMethod.checked;
                this.markDirty();
            });
        }

        if (e.settingAuthHeader) {
            e.settingAuthHeader.checked = settings.followAuthHeader;
            e.settingAuthHeader.addEventListener('change', () => {
                settings.followAuthHeader = e.settingAuthHeader.checked;
                this.markDirty();
            });
        }

        if (e.settingMaxRedirects) {
            e.settingMaxRedirects.value = settings.maxRedirects;
            e.settingMaxRedirects.addEventListener('input', () => {
                const val = parseInt(e.settingMaxRedirects.value, 10);
                settings.maxRedirects = isNaN(val) ? 10 : Math.max(1, Math.min(50, val));
                this.markDirty();
            });
        }

        if (e.settingStrictSSL) {
            e.settingStrictSSL.checked = settings.strictSSL;
            e.settingStrictSSL.addEventListener('change', () => {
                settings.strictSSL = e.settingStrictSSL.checked;
                this.markDirty();
            });
        }

        if (e.settingDecompress) {
            e.settingDecompress.checked = settings.decompress;
            e.settingDecompress.addEventListener('change', () => {
                settings.decompress = e.settingDecompress.checked;
                this.markDirty();
            });
        }

        if (e.settingIncludeCookies) {
            e.settingIncludeCookies.checked = settings.includeCookies;
            e.settingIncludeCookies.addEventListener('change', () => {
                settings.includeCookies = e.settingIncludeCookies.checked;
                this.markDirty();
            });
        }

        // Clear all cookies button
        if (e.clearAllCookiesBtn) {
            e.clearAllCookiesBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'clearCookies' });
            });
        }
    }

    // ========================================
    // Auth Initialization
    // ========================================

    initializeAuthListeners() {
        if (this.elements.authType) {
            this.elements.authType.addEventListener('change', () => {
                this.state.authType = this.elements.authType.value;
                // Toggle all auth sections depending on selection
                this.elements.bearerTokenSection?.classList.toggle('hidden', this.state.authType !== 'bearer');
                this.elements.basicAuthSection?.classList.toggle('hidden', this.state.authType !== 'basic');
                this.elements.apiKeySection?.classList.toggle('hidden', this.state.authType !== 'apikey');
                this.elements.oauth2Section?.classList.toggle('hidden', this.state.authType !== 'oauth2');

                // When switching to OAuth2, sync state from form
                if (this.state.authType === 'oauth2' && this.oauth2Manager) {
                    this.state.oauth2 = this.oauth2Manager.getConfig();
                }

                this.markDirty();
            });
        }

        if (this.elements.bearerToken) {
            this.elements.bearerToken.addEventListener('input', () => {
                this.state.bearerToken = this.elements.bearerToken.value;
                this.markDirty();
            });
        }
        
        // Basic auth inputs (username/password)
        if (this.elements.basicUsername) {
            this.elements.basicUsername.addEventListener('input', () => {
                this.state.basicAuth = this.state.basicAuth || { username: '', password: '' };
                this.state.basicAuth.username = this.elements.basicUsername.value;
                this.markDirty();
            });
        }

        if (this.elements.basicPassword) {
            this.elements.basicPassword.addEventListener('input', () => {
                this.state.basicAuth = this.state.basicAuth || { username: '', password: '' };
                this.state.basicAuth.password = this.elements.basicPassword.value;
                this.markDirty();
            });
        }

        // API Key inputs
        if (this.elements.apiKeyKey) {
            this.elements.apiKeyKey.addEventListener('input', () => {
                this.state.apiKey = this.state.apiKey || { key: '', value: '', in: 'header' };
                this.state.apiKey.key = this.elements.apiKeyKey.value;
                this.markDirty();
            });
        }

        if (this.elements.apiKeyValue) {
            this.elements.apiKeyValue.addEventListener('input', () => {
                this.state.apiKey = this.state.apiKey || { key: '', value: '', in: 'header' };
                this.state.apiKey.value = this.elements.apiKeyValue.value;
                this.markDirty();
            });
        }

        if (this.elements.apiKeyIn) {
            this.elements.apiKeyIn.addEventListener('change', () => {
                this.state.apiKey = this.state.apiKey || { key: '', value: '', in: 'header' };
                this.state.apiKey.in = this.elements.apiKeyIn.value;
                this.markDirty();
            });
        }

        // OAuth2 listeners
        if (this.oauth2Manager) {
            this.oauth2Manager.initListeners();
        }
    }

    // ========================================
    // Resize Handlers
    // ========================================

    initializeResizeHandlers() {
        // Request/Response resize
        const handle = this.elements.resizeHandle;
        const requestSection = this.elements.requestSection;
        const mainContent = this.elements.mainContent;

        if (handle && requestSection && mainContent) {
            let isResizing = false;
            let startY = 0;
            let startHeight = 0;
            let startX = 0;
            let startWidth = 0;

            handle.addEventListener('mousedown', (e) => {
                const isSplit = this.state.layoutMode === 'split';
                isResizing = true;
                startY = e.clientY;
                startX = e.clientX;
                startHeight = requestSection.offsetHeight;
                startWidth = requestSection.offsetWidth;
                handle.classList.add('dragging');
                document.body.classList.add('resizing');
                document.body.classList.toggle('layout-split', isSplit);
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                if (this.state.layoutMode === 'split') {
                    const requirements = this.getSplitLayoutRequirements();

                    const deltaX = e.clientX - startX;
                    const newWidth = startWidth + deltaX;
                    const minRequestWidth = requirements.requestMinWidth;
                    const maxRequestWidth = requirements.maxRequestWidth;
                    const constrainedWidth = Math.max(minRequestWidth, Math.min(maxRequestWidth, newWidth));
                    this.state.layoutSplitRatio = constrainedWidth / Math.max(requirements.availableWidth, 1);
                    requestSection.style.width = `${constrainedWidth}px`;
                    requestSection.style.height = 'auto';
                    requestSection.style.minHeight = '0';
                } else {
                    const deltaY = e.clientY - startY;
                    const newHeight = startHeight + deltaY;
                    const containerHeight = mainContent.offsetHeight;
                    const constrainedHeight = Math.max(100, Math.min(containerHeight * 0.7, newHeight));
                    requestSection.style.height = `${constrainedHeight}px`;
                }
                this.editorsManager.layoutAll();
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    handle.classList.remove('dragging');
                    document.body.classList.remove('resizing');
                    document.body.classList.remove('layout-split');
                    this.editorsManager.layoutAll();
                    this.persistLayoutState();
                }
            });
        }

        // Sidebar resize
        const sidebarHandle = this.elements.sidebarResizeHandle;
        const sidebar = this.elements.historySidebar;

        if (sidebarHandle && sidebar) {
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;

            sidebarHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startWidth = sidebar.offsetWidth;
                sidebarHandle.classList.add('dragging');
                document.body.classList.add('resizing');
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const deltaX = e.clientX - startX;
                const constrainedWidth = Math.max(150, Math.min(400, startWidth + deltaX));
                sidebar.style.width = `${constrainedWidth}px`;
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    sidebarHandle.classList.remove('dragging');
                    document.body.classList.remove('resizing');
                }
            });
        }
    }

    initializeLayoutListeners() {
        this.elements.layoutStackBtn?.addEventListener('click', () => this.applyLayoutMode('stack'));
        this.elements.layoutSplitBtn?.addEventListener('click', () => this.applyLayoutMode('split'));

        this.updateSplitAvailability();

        window.addEventListener('resize', () => {
            if (this.state.layoutMode === 'split') {
                this.applyLayoutMode('split', { persist: false });
            }
        });
    }

    restoreLayoutState() {
        try {
            const saved = vscode.getState?.();
            if (saved && typeof saved === 'object') {
                this.layoutMode = saved.layoutMode === 'split' ? 'split' : 'stack';
                this.layoutSplitRatio = typeof saved.layoutSplitRatio === 'number' ? saved.layoutSplitRatio : 0.5;
            }
        } catch {
            // Ignore restore errors and fall back to defaults.
        }

        this.state.layoutMode = this.layoutMode;
        this.state.layoutSplitRatio = this.layoutSplitRatio;
    }

    persistLayoutState() {
        try {
            const current = vscode.getState?.() || {};
            vscode.setState({
                ...current,
                layoutMode: this.state.layoutMode,
                layoutSplitRatio: this.state.layoutSplitRatio
            });
        } catch {
            // Best effort persistence only.
        }
    }

    applyLayoutMode(mode, { persist = true } = {}) {
        let nextMode = mode === 'split' ? 'split' : 'stack';
        this.layoutMode = nextMode;
        this.state.layoutMode = nextMode;

        const mainContent = this.elements.mainContent;
        const requestSection = this.elements.requestSection;
        const handle = this.elements.resizeHandle;

        const splitRequirements = this.getSplitLayoutRequirements();

        if (mainContent) {
            mainContent.classList.toggle('layout-split', nextMode === 'split');
            mainContent.classList.toggle('layout-split-compact', nextMode === 'split');
        }

        if (this.elements.layoutStackBtn && this.elements.layoutSplitBtn) {
            this.elements.layoutStackBtn.classList.toggle('active', nextMode === 'stack');
            this.elements.layoutSplitBtn.classList.toggle('active', nextMode === 'split');
        }

        if (requestSection) {
            if (nextMode === 'split') {
                const availableWidth = splitRequirements.availableWidth;
                const minRequestWidth = splitRequirements.requestMinWidth;
                const maxRequestWidth = splitRequirements.maxRequestWidth;
                const splitWidth = availableWidth > 0
                    ? Math.max(minRequestWidth, Math.min(maxRequestWidth, availableWidth * this.layoutSplitRatio))
                    : 0;
                requestSection.style.width = splitWidth > 0 ? `${splitWidth}px` : '50%';
                requestSection.style.height = 'auto';
                requestSection.style.minHeight = '0';
                this.state.layoutSplitRatio = availableWidth > 0 ? splitWidth / availableWidth : this.state.layoutSplitRatio;
            } else {
                requestSection.style.width = '';
                requestSection.style.height = '';
                requestSection.style.minHeight = '';
            }
        }

        if (handle) {
            handle.title = nextMode === 'split'
                ? 'Drag to resize request and response panes'
                : 'Drag to resize request and response panes';
        }

        if (persist) {
            this.persistLayoutState();
        }

        this.editorsManager?.layoutAll();
        this.updateSplitAvailability();
    }

    getSplitLayoutRequirements() {
        const mainContent = this.elements.mainContent;
        const handleWidth = this.elements.resizeHandle?.offsetWidth || 8;
        const availableWidth = mainContent?.offsetWidth || 0;

        // Split is always enabled. These values are only drag/sizing constraints.
        const minPaneWidth = 80;
        const responseMinWidth = minPaneWidth;
        const maxRequestWidth = Math.max(0, availableWidth - responseMinWidth - handleWidth);
        const requestMinWidth = Math.min(minPaneWidth, maxRequestWidth);

        return {
            requestMinWidth,
            responseMinWidth,
            maxRequestWidth,
            handleWidth,
            availableWidth
        };
    }

    updateSplitAvailability() {
        const splitBtn = this.elements.layoutSplitBtn;
        if (!splitBtn) return;

        splitBtn.disabled = false;
        splitBtn.title = 'Show request and response side by side';
    }
}

// ========================================
// Application Bootstrap
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const app = new RequestTesterApp();
    app.initialize();
    
    // Expose for debugging
    window.__requestTesterApp = app;
});
