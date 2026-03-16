/**
 * Monaco Editors Manager Module
 * Single Responsibility: Initialize and manage Monaco editor instances
 * 
 * Follows:
 * - SRP: Only handles Monaco editor lifecycle
 * - OCP: Editor configurations can be extended via options
 * - DIP: Uses callback pattern for state updates
 */

import { registerGraphQLLanguage } from '../../../shared/graphql-language.js';
import { registerScriptCompletionProviders } from './script-completion-provider.js';
import { registerTemplateCompletionProviders } from './template-completion-provider.js';

/**
 * Default editor configuration
 */
const DEFAULT_EDITOR_CONFIG = {
    theme: 'vs-dark',
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    fontSize: 13
};

/**
 * Safely set editor value with type coercion
 * Monaco's setValue() strictly requires a string - passing undefined/null/objects will crash
 * This is exported so other modules can use it
 * @param {Object} editor - Monaco editor instance
 * @param {string} value - Value to set
 */
function safeSetEditorValue(editor, value) {
    if (!editor) return;

    // Monaco setValue() requires a string - coerce any value to string
    const stringValue = value == null ? '' : String(value);
    editor.setValue(stringValue);
}

/**
 * Create a Monaco editors manager instance
 * @param {Object} options
 * @param {Object} options.elements - DOM elements containing editor containers
 * @param {Object} options.state - Application state
 * @param {Function} options.onBodyChange - Callback when body content changes
 * @param {Function} options.onScriptChange - Callback when script content changes
 * @param {Function} options.getDefaultPreRequestScript - Function to get default pre-request script
 * @param {Function} options.getDefaultPostResponseScript - Function to get default post-response script
 * @returns {Object} Editors manager interface
 */
function createMonacoEditorsManager({
    elements,
    state,
    onBodyChange,
    onScriptChange,
    getDefaultPreRequestScript,
    getDefaultPostResponseScript
}) {
    // Editor instances
    let requestBodyEditor = null;
    let responseBodyEditor = null;
    let preRequestScriptEditor = null;
    let postResponseScriptEditor = null;
    let graphqlQueryEditor = null;
    let graphqlVariablesEditor = null;

    // Pending data to apply once editors are ready
    let pendingBodyData = null;
    let pendingScripts = null;

    // Ready state
    let isReady = false;
    let onReadyCallbacks = [];

    /**
     * Wait for Monaco to be available and create editors
     */
    function initialize() {
        const isMonacoReady = () => {
            return typeof monaco !== 'undefined' &&
                monaco.editor &&
                typeof monaco.editor.create === 'function';
        };

        const MAX_RETRIES = 50;  // 5 seconds max wait
        let retryCount = 0;

        const waitForMonaco = () => {
            if (isMonacoReady()) {
                createEditors();
            } else if (retryCount++ < MAX_RETRIES) {
                setTimeout(waitForMonaco, 100);
            } else {
                console.error('[MonacoEditorsManager] Monaco failed to load after 5 seconds');
            }
        };

        if (typeof MonacoViewer !== 'undefined' && MonacoViewer.whenMonacoReady) {
            // MonacoViewer.whenMonacoReady should guarantee Monaco is ready,
            // but add a safety check just in case
            MonacoViewer.whenMonacoReady(() => {
                if (isMonacoReady()) {
                    createEditors();
                } else {
                    // Monaco not fully ready yet, poll for it
                    waitForMonaco();
                }
            });
        } else {
            waitForMonaco();
        }
    }

    let createEditorRetries = 0;
    const MAX_CREATE_RETRIES = 10;

    // Mustache decorations state
    const mustacheDecorationIdsByModel = new Map();
    const modelsWithDisposeAttached = new WeakSet();

    function ensureMustacheStyles() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('hf-mustache-styles')) return;
        const style = document.createElement('style');
        style.id = 'hf-mustache-styles';
        style.textContent = `
            .hf-mustache-variable { color: #d19a66 !important; font-weight: 600; }
            .hf-mustache-section { color: #61afef !important; font-weight: 700; }
            .hf-mustache-section-end { color: #61afef !important; font-weight: 700; opacity: 0.9; }
            .hf-mustache-inverse { color: #61afef !important; font-weight: 700; }
            .hf-mustache-comment { color: #5c6370 !important; font-style: italic; }
            .hf-mustache-partial { color: #98c379 !important; }
            .hf-mustache-unescaped { color: #e06c75 !important; font-weight: 600; }
        `;
        document.head.appendChild(style);
    }

    function applyMustacheDecorations(editor) {
        if (!editor) return;
        ensureMustacheStyles();
        const model = editor.getModel();
        if (!model) return;

        const text = model.getValue();
        const newDecorations = [];
        // Match Mustache expressions including triple-stache {{{ }}} and normal {{ }} (non-greedy)
        const regex = /{{{[\s\S]*?}}}|{{[\s\S]*?}}/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const matched = match[0];
            const startIndex = match.index;
            const endIndex = startIndex + matched.length;
            const startPos = model.getPositionAt(startIndex);
            const endPos = model.getPositionAt(endIndex);

            // Classify Mustache expression type and select a CSS class
            const inner = matched.replace(/^{{{?\s?/, '').replace(/\s?}}}?$/, '').trim();
            let cls = 'hf-mustache-variable';
            if (/^#/.test(inner)) cls = 'hf-mustache-section';
            else if (/^\//.test(inner)) cls = 'hf-mustache-section-end';
            else if (/^\^/.test(inner)) cls = 'hf-mustache-inverse';
            else if (/^!/.test(inner)) cls = 'hf-mustache-comment';
            else if (/^>/.test(inner)) cls = 'hf-mustache-partial';
            else if (/^&/.test(inner) || /^\{/.test(matched)) cls = 'hf-mustache-unescaped';

            newDecorations.push({
                range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                options: { inlineClassName: cls }
            });
        }

        const key = model.uri.toString();
        const oldIds = mustacheDecorationIdsByModel.get(key) || [];
        const newIds = editor.deltaDecorations(oldIds, newDecorations);
        mustacheDecorationIdsByModel.set(key, newIds);

        if (!modelsWithDisposeAttached.has(model)) {
            modelsWithDisposeAttached.add(model);
            model.onWillDispose(() => {
                mustacheDecorationIdsByModel.delete(key);
            });
        }
    }

    /**
     * Create all Monaco editor instances
     */
    function createEditors() {
        try {
            // Double-check Monaco is fully available
            if (typeof monaco === 'undefined' || !monaco.editor || typeof monaco.editor.create !== 'function') {
                console.error('[MonacoEditorsManager] Monaco editor not fully loaded. monaco:', typeof monaco,
                    'monaco.editor:', typeof monaco?.editor,
                    'monaco.editor.create:', typeof monaco?.editor?.create);
                // Retry with limit
                if (createEditorRetries++ < MAX_CREATE_RETRIES) {
                    setTimeout(createEditors, 200);
                } else {
                    console.error('[MonacoEditorsManager] Failed to create editors after max retries');
                }
                return;
            }

            // Request body editor (raw body)
            if (elements.bodyEditor) {
                requestBodyEditor = monaco.editor.create(elements.bodyEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '{}',
                    language: 'json'
                });

                requestBodyEditor.onDidChangeModelContent(() => {
                    state.body = requestBodyEditor.getValue();
                    if (onBodyChange) onBodyChange();
                });
                // Update mustache decorations when content or model changes
                requestBodyEditor.onDidChangeModelContent(() => applyMustacheDecorations(requestBodyEditor));
                requestBodyEditor.onDidChangeModel(() => applyMustacheDecorations(requestBodyEditor));
                applyMustacheDecorations(requestBodyEditor);
                // Note: pendingBodyData will be applied after isReady is set
            }

            // GraphQL Query editor
            if (elements.graphqlQueryEditor) {
                graphqlQueryEditor = monaco.editor.create(elements.graphqlQueryEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '',
                    language: 'graphql'
                });

                graphqlQueryEditor.onDidChangeModelContent(() => {
                    state.graphql.query = graphqlQueryEditor.getValue();
                    if (onBodyChange) onBodyChange();
                });
            }

            // GraphQL Variables editor
            if (elements.graphqlVariablesEditor) {
                graphqlVariablesEditor = monaco.editor.create(elements.graphqlVariablesEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '{\n  \n}',
                    language: 'json'
                });

                graphqlVariablesEditor.onDidChangeModelContent(() => {
                    state.graphql.variables = graphqlVariablesEditor.getValue();
                    if (onBodyChange) onBodyChange();
                });
                graphqlVariablesEditor.onDidChangeModelContent(() => applyMustacheDecorations(graphqlVariablesEditor));
                graphqlVariablesEditor.onDidChangeModel(() => applyMustacheDecorations(graphqlVariablesEditor));
                applyMustacheDecorations(graphqlVariablesEditor);
            }

            // Response body editor
            if (elements.responseBodyEditor) {
                responseBodyEditor = monaco.editor.create(elements.responseBodyEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '',
                    language: 'json',
                    readOnly: true
                });
            }

            // Pre-request script editor
            // Start with empty - scripts will be loaded from request data via onReady callbacks
            // Default templates are only shown when user clicks "reset to default" or for new requests
            if (elements.preRequestScriptEditor) {
                preRequestScriptEditor = monaco.editor.create(elements.preRequestScriptEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '',
                    language: 'javascript'
                });

                preRequestScriptEditor.onDidChangeModelContent(() => {
                    state.scripts.preRequest = preRequestScriptEditor.getValue();
                    if (onScriptChange) onScriptChange('preRequest');
                });
            }

            // Post-response script editor
            // Start with empty - scripts will be loaded from request data via onReady callbacks
            if (elements.postResponseScriptEditor) {
                postResponseScriptEditor = monaco.editor.create(elements.postResponseScriptEditor, {
                    ...DEFAULT_EDITOR_CONFIG,
                    value: '',
                    language: 'javascript'
                });

                postResponseScriptEditor.onDidChangeModelContent(() => {
                    state.scripts.postResponse = postResponseScriptEditor.getValue();
                    if (onScriptChange) onScriptChange('postResponse');
                });
            }

            // Register GraphQL language (syntax highlighting, brackets, etc.)
            registerGraphQLLanguage(monaco);

            // Register completion providers (IntelliSense for {{ }} templates + hf/pm/ctx script API)
            registerTemplateCompletionProviders(state);
            registerScriptCompletionProviders();

            // Mark as ready after Monaco finishes internal setup
            requestAnimationFrame(() => {
                isReady = true;

                // Apply any pending body data
                if (pendingBodyData) {
                    applyPendingBodyData();
                }

                // Apply any pending scripts
                if (pendingScripts) {
                    applyPendingScripts();
                }

                onReadyCallbacks.forEach(cb => cb());
                onReadyCallbacks = [];
            });
        } catch (error) {
            console.error('[MonacoEditorsManager] Failed to create editors:', error);
            console.error('[MonacoEditorsManager] Monaco state - monaco:', typeof monaco,
                'editor:', typeof monaco?.editor,
                'create:', typeof monaco?.editor?.create);
            // Don't mark as ready - editors failed to initialize
            throw error;
        }
    }

    /**
     * Apply pending body data after editor is ready
     */
    function applyPendingBodyData() {
        if (!pendingBodyData || !requestBodyEditor) return;

        if (pendingBodyData.bodyContent !== undefined) {
            safeSetEditorValue(requestBodyEditor, pendingBodyData.bodyContent);
            state.body = pendingBodyData.bodyContent;
        }

        pendingBodyData = null;
    }

    /**
     * Apply pending scripts after editors are ready
     */
    function applyPendingScripts() {
        if (!pendingScripts) return;

        if (pendingScripts.preRequest !== undefined && preRequestScriptEditor) {
            safeSetEditorValue(preRequestScriptEditor, pendingScripts.preRequest);
            state.scripts.preRequest = pendingScripts.preRequest;
        }

        if (pendingScripts.postResponse !== undefined && postResponseScriptEditor) {
            safeSetEditorValue(postResponseScriptEditor, pendingScripts.postResponse);
            state.scripts.postResponse = pendingScripts.postResponse;
        }

        pendingScripts = null;
    }

    /**
     * Set pending body data (used when editor not ready)
     * @param {Object} data - Body data to apply
     */
    function setPendingBodyData(data) {
        if (isReady && requestBodyEditor) {
            if (data.bodyContent !== undefined) {
                safeSetEditorValue(requestBodyEditor, data.bodyContent);
                state.body = data.bodyContent;
            }
        } else {
            pendingBodyData = data;
        }
    }

    /**
     * Register callback for when editors are ready
     * @param {Function} callback
     */
    function onReady(callback) {
        if (isReady) {
            callback();
        } else {
            onReadyCallbacks.push(callback);
        }
    }

    /**
     * Get request body editor
     * @returns {Object|null} Monaco editor instance
     */
    function getRequestBodyEditor() {
        return requestBodyEditor;
    }

    /**
     * Get response body editor
     * @returns {Object|null} Monaco editor instance
     */
    function getResponseBodyEditor() {
        return responseBodyEditor;
    }

    /**
     * Get pre-request script editor
     * @returns {Object|null} Monaco editor instance
     */
    function getPreRequestScriptEditor() {
        return preRequestScriptEditor;
    }

    /**
     * Get post-response script editor
     * @returns {Object|null} Monaco editor instance
     */
    function getPostResponseScriptEditor() {
        return postResponseScriptEditor;
    }

    /**
     * Get GraphQL query editor
     * @returns {Object|null} Monaco editor instance
     */
    function getGraphqlQueryEditor() {
        return graphqlQueryEditor;
    }

    /**
     * Get GraphQL variables editor
     * @returns {Object|null} Monaco editor instance
     */
    function getGraphqlVariablesEditor() {
        return graphqlVariablesEditor;
    }

    /**
     * Set body editor value
     * @param {string} value - Content to set
     */
    function setBodyValue(value) {
        if (requestBodyEditor) {
            safeSetEditorValue(requestBodyEditor, value || '');
            state.body = value || '';
        } else {
            setPendingBodyData({ bodyContent: value });
        }
    }

    /**
     * Get body editor value
     * @returns {string} Current body content
     */
    function getBodyValue() {
        return requestBodyEditor?.getValue() || state.body || '';
    }

    /**
     * Set response body value
     * @param {string} value - Content to set
     * @param {string} language - Monaco language mode
     */
    function setResponseValue(value, language = 'json') {
        if (responseBodyEditor) {
            const model = responseBodyEditor.getModel();
            if (model) {
                monaco.editor.setModelLanguage(model, language);
            }
            safeSetEditorValue(responseBodyEditor, value || '');
        }
    }

    /**
     * Clear response body
     */
    function clearResponse() {
        if (responseBodyEditor) {
            safeSetEditorValue(responseBodyEditor, '');
        }
    }

    /**
     * Set pre-request script value
     * @param {string} value - Script content
     */
    function setPreRequestScript(value) {
        const scriptValue = value || '';
        if (isReady && preRequestScriptEditor) {
            safeSetEditorValue(preRequestScriptEditor, scriptValue);
            state.scripts.preRequest = scriptValue;
        } else {
            // Store pending - will be applied when editors are ready
            if (!pendingScripts) pendingScripts = {};
            pendingScripts.preRequest = scriptValue;
            state.scripts.preRequest = scriptValue;
        }
    }

    /**
     * Set post-response script value
     * @param {string} value - Script content
     */
    function setPostResponseScript(value) {
        const scriptValue = value || '';
        if (isReady && postResponseScriptEditor) {
            safeSetEditorValue(postResponseScriptEditor, scriptValue);
            state.scripts.postResponse = scriptValue;
        } else {
            // Store pending - will be applied when editors are ready
            if (!pendingScripts) pendingScripts = {};
            pendingScripts.postResponse = scriptValue;
            state.scripts.postResponse = scriptValue;
        }
    }

    /**
     * Set GraphQL query value
     * @param {string} value - Query content
     */
    function setGraphqlQuery(value) {
        if (graphqlQueryEditor) {
            safeSetEditorValue(graphqlQueryEditor, value || '');
            state.graphql.query = value || '';
        }
    }

    /**
     * Set GraphQL variables value
     * @param {string} value - Variables JSON content
     */
    function setGraphqlVariables(value) {
        if (graphqlVariablesEditor) {
            safeSetEditorValue(graphqlVariablesEditor, value || '');
            state.graphql.variables = value || '';
        }
    }

    /**
     * Update raw body editor language
     * @param {string} format - Raw format (json, text, xml, html, javascript)
     */
    function updateRawEditorLanguage(format) {
        if (!requestBodyEditor) return;

        const languageMap = {
            'json': 'json',
            'text': 'plaintext',
            'xml': 'xml',
            'html': 'html',
            'javascript': 'javascript'
        };

        const model = requestBodyEditor.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, languageMap[format] || 'plaintext');
            // Re-apply decorations after language change
            applyMustacheDecorations(requestBodyEditor);
        }
    }

    /**
     * Layout all editors (call after resize)
     */
    function layoutAll() {
        requestBodyEditor?.layout();
        responseBodyEditor?.layout();
        preRequestScriptEditor?.layout();
        postResponseScriptEditor?.layout();
        graphqlQueryEditor?.layout();
        graphqlVariablesEditor?.layout();
    }

    /**
     * Layout specific editor
     * @param {string} editorName - Name of editor to layout
     */
    function layout(editorName) {
        switch (editorName) {
            case 'body':
                requestBodyEditor?.layout();
                break;
            case 'response':
                responseBodyEditor?.layout();
                break;
            case 'preRequest':
                preRequestScriptEditor?.layout();
                break;
            case 'postResponse':
                postResponseScriptEditor?.layout();
                break;
            case 'graphqlQuery':
                graphqlQueryEditor?.layout();
                break;
            case 'graphqlVariables':
                graphqlVariablesEditor?.layout();
                break;
        }
    }

    /**
     * Clear all editors to default state
     */
    function clearAll() {
        if (requestBodyEditor) safeSetEditorValue(requestBodyEditor, '');
        if (graphqlQueryEditor) safeSetEditorValue(graphqlQueryEditor, '');
        if (graphqlVariablesEditor) safeSetEditorValue(graphqlVariablesEditor, '');
        if (responseBodyEditor) safeSetEditorValue(responseBodyEditor, '');
    }

    return {
        initialize,
        onReady,
        isReady: () => isReady,
        setPendingBodyData,

        // Editor getters
        getRequestBodyEditor,
        getResponseBodyEditor,
        getPreRequestScriptEditor,
        getPostResponseScriptEditor,
        getGraphqlQueryEditor,
        getGraphqlVariablesEditor,

        // Value setters/getters
        setBodyValue,
        getBodyValue,
        setResponseValue,
        clearResponse,
        setPreRequestScript,
        setPostResponseScript,
        setGraphqlQuery,
        setGraphqlVariables,
        updateRawEditorLanguage,

        // Layout
        layoutAll,
        layout,
        clearAll
    };
}

export { createMonacoEditorsManager, DEFAULT_EDITOR_CONFIG, safeSetEditorValue };

