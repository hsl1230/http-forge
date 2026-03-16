/**
 * Schema Editor Manager Module
 * Single Responsibility: Manage Body Schema and Response Schema tab editors
 * 
 * Handles:
 * - Monaco editor instances for schema JSON editing
 * - Toolbar button actions (infer, capture, generate, validate)
 * - Status code sub-tabs for response schema
 * - Message passing to/from extension backend
 */

/**
 * Create a schema editor manager instance
 * @param {Object} options
 * @param {Object} options.vscode - VS Code API
 * @param {Object} options.state - Application state
 * @param {Object} options.editorsManager - Monaco editors manager
 * @param {Function} options.markDirty - Function to mark request as having unsaved changes
 * @returns {Object} Schema editor manager interface
 */
function createSchemaEditorManager({ vscode, state, editorsManager, markDirty }) {
    
    /** @type {any} Body schema Monaco editor instance */
    let bodySchemaEditor = null;
    /** @type {any} Response schema Monaco editor instance */
    let responseSchemaEditor = null;
    
    /** Current response schema data (keyed by status code) */
    let responseSchemaData = {};
    /** Shared components ($ref definitions) for response schemas */
    let responseSchemaComponents = null;
    /** Currently selected status code tab */
    let activeStatusCode = null;
    /** Body schema data */
    let bodySchemaData = null;
    
    /** Whether editors have been initialized */
    let initialized = false;

    /**
     * Initialize the schema editors when Monaco is ready
     */
    function init() {
        if (initialized) return;
        
        editorsManager.onReady(() => {
            const bodyContainer = document.getElementById('body-schema-editor');
            const responseContainer = document.getElementById('response-schema-editor');
            
            if (bodyContainer && window.MonacoViewer?.createEditor) {
                bodySchemaEditor = window.MonacoViewer.createEditor(bodyContainer, {
                    language: 'json',
                    value: '',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2
                });
                
                // Track changes for dirty state
                bodySchemaEditor.onDidChangeModelContent(() => {
                    if (markDirty) markDirty();
                });
            }
            
            if (responseContainer && window.MonacoViewer?.createEditor) {
                responseSchemaEditor = window.MonacoViewer.createEditor(responseContainer, {
                    language: 'json',
                    value: '',
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2
                });
                
                responseSchemaEditor.onDidChangeModelContent(() => {
                    if (markDirty) markDirty();
                });
            }
            
            initialized = true;
            setupToolbarListeners();
        });
    }

    /**
     * Set up toolbar button event handlers
     */
    function setupToolbarListeners() {
        // Body Schema toolbar
        document.getElementById('infer-body-schema-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            if (!collectionId || !requestId) {
                setStatus('body-schema-status', 'Save request first', 'error');
                return;
            }
            setStatus('body-schema-status', 'Inferring…', 'info');
            // Priority: sentRequest body (variables resolved) > current editor body > saved body
            const sentBody = state.lastSentRequest?.body || null;
            const bodyType = state.bodyType || 'none';
            const bodyFormat = state.rawFormat || 'json';
            let bodyContent = state.body || '';
            if (bodyType === 'form-data') {
                bodyContent = state.formData || [];
            } else if (bodyType === 'x-www-form-urlencoded') {
                bodyContent = state.urlEncodedData || [];
            }
            vscode.postMessage({
                command: 'inferBodySchema',
                collectionId,
                requestId,
                sentBody,
                body: { type: bodyType, format: bodyFormat, content: bodyContent }
            });
        });

        document.getElementById('generate-example-body-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            // Send the current editor content so the backend always uses
            // what is visible in the body-schema tab (user may have edited it).
            const bodySchema = getBodySchemaFromEditor();
            setStatus('body-schema-status', 'Generating…', 'info');
            vscode.postMessage({ command: 'generateExampleBody', collectionId, requestId, bodySchema });
        });

        document.getElementById('validate-body-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            if (!collectionId || !requestId) {
                setStatus('body-schema-status', 'Save request first', 'error');
                return;
            }
            setStatus('body-schema-status', 'Validating…', 'info');
            // Priority: sentRequest body (variables resolved) > current editor body > saved body
            const sentBody = state.lastSentRequest?.body || null;
            const bodyType = state.bodyType || 'none';
            const bodyFormat = state.rawFormat || 'json';
            let bodyContent = state.body || '';
            if (bodyType === 'form-data') {
                bodyContent = state.formData || [];
            } else if (bodyType === 'x-www-form-urlencoded') {
                bodyContent = state.urlEncodedData || [];
            }
            vscode.postMessage({
                command: 'validateBody',
                collectionId,
                requestId,
                sentBody,
                body: { type: bodyType, format: bodyFormat, content: bodyContent }
            });
        });

        // Response Schema toolbar
        document.getElementById('infer-response-schema-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            if (!collectionId || !requestId) {
                setStatus('response-schema-status', 'Save request first', 'error');
                return;
            }
            setStatus('response-schema-status', 'Inferring…', 'info');
            vscode.postMessage({ command: 'inferResponseSchema', collectionId, requestId });
        });

        document.getElementById('capture-response-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            if (!collectionId || !requestId) {
                setStatus('response-schema-status', 'Save request first', 'error');
                return;
            }
            // Use last response if available
            const lastResponse = state.lastResponse;
            if (!lastResponse) {
                setStatus('response-schema-status', 'No response to capture', 'error');
                return;
            }
            setStatus('response-schema-status', 'Capturing…', 'info');
            vscode.postMessage({
                command: 'captureResponse',
                collectionId,
                requestId,
                response: {
                    statusCode: lastResponse.status ?? lastResponse.statusCode,
                    body: lastResponse.body,
                    headers: lastResponse.headers
                }
            });
        });

        document.getElementById('generate-example-response-btn')?.addEventListener('click', () => {
            const collectionId = state.collectionId;
            const requestId = state.requestData?.id;
            // Send the current editor content so the backend always uses
            // what is visible in the response-schema tab.
            const responseSchema = getResponseSchemaFromEditor();
            if (responseSchemaComponents) {
                responseSchema.components = responseSchemaComponents;
            }
            setStatus('response-schema-status', 'Generating…', 'info');
            vscode.postMessage({ command: 'generateExampleResponse', collectionId, requestId, responseSchema, statusCode: activeStatusCode });
        });
    }

    /**
     * Set status text with styling
     * @param {string} elementId - Status element ID
     * @param {string} text - Status message
     * @param {'success'|'error'|'info'|''} type - Status type
     */
    function setStatus(elementId, text, type = '') {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = text;
        el.className = 'schema-status' + (type ? ` ${type}` : '');
        // Auto-clear after 5 seconds
        if (text) {
            setTimeout(() => {
                if (el.textContent === text) {
                    el.textContent = '';
                    el.className = 'schema-status';
                }
            }, 5000);
        }
    }

    /**
     * Load schemas when a request is opened
     * Called from main.js during request setup
     */
    function loadSchemas() {
        // Always apply in-memory schema data first (e.g. from Spring API Tester
        // or other external extensions that set bodySchema/responseSchema on
        // the request object). This ensures freshly-generated schemas display
        // immediately, even before a save round-trip.
        if (state.requestData?.bodySchema) {
            applyBodySchema(state.requestData.bodySchema);
        }
        if (state.requestData?.responseSchema) {
            applyResponseSchema(state.requestData.responseSchema);
        }

        const collectionId = state.collectionId;
        const requestId = state.requestData?.id;

        if (collectionId && requestId && !state.requestData?.bodySchema && !state.requestData?.responseSchema) {
            // Persisted request with no in-memory schemas — round-trip to
            // backend for the stored version (normal collection workflow).
            vscode.postMessage({ command: 'getBodySchema', collectionId, requestId });
            vscode.postMessage({ command: 'getResponseSchema', collectionId, requestId });
        }
    }

    /**
     * Apply body schema data received from backend
     * @param {Object|null} schema - BodySchemaDefinition or null
     */
    function applyBodySchema(schema) {
        bodySchemaData = schema;
        
        if (bodySchemaEditor) {
            const content = schema ? JSON.stringify(schema, null, 2) : '';
            const currentValue = bodySchemaEditor.getValue();
            if (currentValue !== content) {
                bodySchemaEditor.setValue(content);
            }
        }
        
        // Show schema indicator on Body tab
        const bodyTab = document.querySelector('.tab[data-tab="body"]');
        if (bodyTab) {
            bodyTab.classList.toggle('has-schema', !!schema);
        }
    }

    /**
     * Apply response schema data received from backend
     * @param {Object|null} schema - ResponseSchemaDefinition or null
     */
    function applyResponseSchema(schema) {
        responseSchemaData = schema?.responses || {};
        responseSchemaComponents = schema?.components || null;
        
        // Build status code sub-tabs
        const tabsContainer = document.getElementById('response-status-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = '';
            const statusCodes = Object.keys(responseSchemaData).sort();
            
            if (statusCodes.length === 0) {
                activeStatusCode = null;
                if (responseSchemaEditor) {
                    responseSchemaEditor.setValue('// No response schemas defined yet.\n// Use "Infer from History" or "Capture Last Response" to create one.');
                }
                return;
            }
            
            statusCodes.forEach((code, index) => {
                const tab = document.createElement('button');
                tab.className = 'schema-status-tab' + (index === 0 ? ' active' : '');
                tab.dataset.status = code;
                tab.textContent = code;
                tab.addEventListener('click', () => selectStatusCode(code));
                tabsContainer.appendChild(tab);
            });
            
            // Select first status code
            selectStatusCode(statusCodes[0]);
        }
    }

    /**
     * Select a status code sub-tab and show its schema
     * @param {string} code - Status code string (e.g., "200", "404")
     */
    function selectStatusCode(code) {
        activeStatusCode = code;
        
        // Update tab active state
        document.querySelectorAll('.schema-status-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === code);
        });
        
        // Show schema for this status code
        const schemaEntry = responseSchemaData[code];
        if (responseSchemaEditor && schemaEntry) {
            responseSchemaEditor.setValue(JSON.stringify(schemaEntry, null, 2));
        }
    }

    /**
     * Get current body schema from editor
     * @returns {Object|null} Parsed schema or null
     */
    function getBodySchemaFromEditor() {
        if (!bodySchemaEditor) return null;
        const val = bodySchemaEditor.getValue().trim();
        if (!val || val.startsWith('//')) return null;
        try {
            return JSON.parse(val);
        } catch {
            return null;
        }
    }

    /**
     * Get current response schema from editor (for active status code)
     * @returns {Object|null} Full response schema definition
     */
    function getResponseSchemaFromEditor() {
        if (!responseSchemaEditor || !activeStatusCode) return null;
        const val = responseSchemaEditor.getValue().trim();
        if (!val || val.startsWith('//')) return null;
        try {
            const parsed = JSON.parse(val);
            // Update the active status code entry
            responseSchemaData[activeStatusCode] = parsed;
            return { responses: responseSchemaData };
        } catch {
            return null;
        }
    }

    /**
     * Get message handlers for the schema commands
     * @returns {Object} Map of command → handler function
     */
    function getMessageHandlers() {
        return {
            bodySchemaLoaded: (msg) => {
                applyBodySchema(msg.schema);
            },
            responseSchemaLoaded: (msg) => {
                applyResponseSchema(msg.schema);
            },
            bodySchemaInferred: (msg) => {
                if (msg.schema) {
                    applyBodySchema(msg.schema);
                    setStatus('body-schema-status', 'Schema inferred', 'success');
                } else {
                    setStatus('body-schema-status', 'Could not infer schema', 'error');
                }
            },
            responseSchemaInferred: (msg) => {
                if (msg.schema) {
                    applyResponseSchema(msg.schema);
                    setStatus('response-schema-status', 'Schema inferred', 'success');
                } else {
                    setStatus('response-schema-status', 'Could not infer schema', 'error');
                }
            },
            bodyValidationResult: (msg) => {
                if (msg.valid) {
                    setStatus('body-schema-status', '✓ Body is valid', 'success');
                } else {
                    const errorCount = msg.errors?.length || 0;
                    setStatus('body-schema-status', `✗ ${errorCount} validation error${errorCount !== 1 ? 's' : ''}`, 'error');
                }
            },
            exampleBodyGenerated: (msg) => {
                if (msg.example) {
                    // Apply the generated example to the body editor
                    editorsManager.setBodyValue(msg.example);
                    setStatus('body-schema-status', 'Example generated — applied to Body', 'success');
                } else {
                    setStatus('body-schema-status', 'Could not generate example', 'error');
                }
            },
            responseSchemaSaved: () => {
                setStatus('response-schema-status', 'Schema saved', 'success');
            },
            bodySchemaSaved: () => {
                setStatus('body-schema-status', 'Schema saved', 'success');
            }
        };
    }

    /**
     * Save current schemas before the request is saved
     * Called from request-saver to include schema data in save payload
     * @returns {{ bodySchema: Object|null, responseSchema: Object|null }}
     */
    function getSchemaDataForSave() {
        return {
            bodySchema: getBodySchemaFromEditor(),
            responseSchema: getResponseSchemaFromEditor()
        };
    }

    /**
     * Layout/resize the editors when the tab becomes visible
     */
    function layout() {
        if (bodySchemaEditor) bodySchemaEditor.layout();
        if (responseSchemaEditor) responseSchemaEditor.layout();
    }

    return {
        init,
        loadSchemas,
        applyBodySchema,
        applyResponseSchema,
        getMessageHandlers,
        getSchemaDataForSave,
        layout
    };
}

export { createSchemaEditorManager };
