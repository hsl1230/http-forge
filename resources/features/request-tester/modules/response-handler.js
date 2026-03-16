/**
 * Response Handler Module
 * Single Responsibility: Handle and display HTTP responses
 * 
 * Shared between endpoint-tester and http-api-tester
 */

import { safeSetEditorValue } from './monaco-editors-manager.js';
import { isHtmlResponse } from './utils.js';

/**
 * Create a response handler instance
 * @param {Object} options
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.state - Application state
 * @param {Object} options.responseBodyEditor - Monaco editor for response body
 * @param {Function} options.escapeHtml - HTML escape function
 * @param {Function} options.formatDuration - Duration format function
 * @param {Object} options.testResultsManager - Test results manager instance
 * @returns {Object} Response handler interface
 */
function createResponseHandler({ 
    elements, 
    state, 
    getResponseBodyEditor,
    escapeHtml, 
    formatDuration, 
    testResultsManager
}) {

    // Current view for response body: 'raw' or 'preview'
    let currentBodyView = 'raw';

    // Helper: switch response body view (raw editor vs HTML preview)
    function switchBodyView(view) {
        const editorContainer = elements.responseBodyEditor;
        const previewContainer = elements.responseHtmlPreview;
        const editor = getResponseBodyEditor();

        currentBodyView = view;

        if (view === 'preview') {
            // hide editor, show preview
            if (editorContainer) editorContainer.style.display = 'none';
            if (previewContainer) previewContainer.classList.add('active');
            if (elements.responseViewRawBtn) elements.responseViewRawBtn.classList.remove('active');
            if (elements.responseViewPreviewBtn) elements.responseViewPreviewBtn.classList.add('active');
        } else {
            // show editor, hide preview
            if (editorContainer) editorContainer.style.display = '';
            if (previewContainer) previewContainer.classList.remove('active');
            if (elements.responseViewRawBtn) elements.responseViewRawBtn.classList.add('active');
            if (elements.responseViewPreviewBtn) elements.responseViewPreviewBtn.classList.remove('active');
            // ensure Monaco lays out correctly after being made visible
            try { editor?.layout(); } catch (e) { /* ignore */ }
        }
    }

    // Attach toolbar button handlers (if present)
    if (elements.responseViewRawBtn && elements.responseViewPreviewBtn) {
        elements.responseViewRawBtn.addEventListener('click', () => switchBodyView('raw'));
        elements.responseViewPreviewBtn.addEventListener('click', () => switchBodyView('preview'));
    }

    /**
     * Clear the response section
     */
    function clearResponse() {
        // Clear test results
        if (testResultsManager) {
            testResultsManager.clear();
        }

        if (elements.responseStatus) {
            elements.responseStatus.classList.add('hidden');
            elements.responseStatus.textContent = '';
        }
        if (elements.responseTime) {
            elements.responseTime.classList.add('hidden');
            elements.responseTime.textContent = '';
        }

        const editor = getResponseBodyEditor();
        if (editor) {
            safeSetEditorValue(editor, '');
        }

        if (elements.responseHeadersTable) {
            elements.responseHeadersTable.innerHTML = '';
        }

        if (elements.responseCookiesTable) {
            elements.responseCookiesTable.innerHTML = '';
        }

        // Clear sent request tab
        if (elements.sentRequestUrl) {
            elements.sentRequestUrl.textContent = '';
        }
        if (elements.sentRequestParamsTable) {
            elements.sentRequestParamsTable.innerHTML = '';
        }
        if (elements.sentRequestParamsSection) {
            elements.sentRequestParamsSection.style.display = 'none';
        }
        if (elements.sentRequestQueryTable) {
            elements.sentRequestQueryTable.innerHTML = '';
        }
        if (elements.sentRequestQuerySection) {
            elements.sentRequestQuerySection.style.display = 'none';
        }
        if (elements.sentRequestHeadersTable) {
            elements.sentRequestHeadersTable.innerHTML = '';
        }
        if (elements.sentRequestBody) {
            elements.sentRequestBody.textContent = '';
        }
        if (elements.sentRequestBodyType) {
            elements.sentRequestBodyType.textContent = '';
        }
        if (elements.sentRequestBodySection) {
            elements.sentRequestBodySection.style.display = 'none';
        }
        if (elements.sentRequestPlaceholder) {
            elements.sentRequestPlaceholder.style.display = 'flex';
        }

        elements.responsePlaceholder?.classList.remove('hidden');
        // Hide HTML preview and toolbar when clearing
        if (elements.responseBodyToolbar) elements.responseBodyToolbar.classList.add('hidden');
        if (elements.responseHtmlPreview) elements.responseHtmlPreview.classList.remove('active');
        if (elements.responseBodyEditor) elements.responseBodyEditor.style.display = '';

        // Clear visualizer tab
        clearVisualizer();
    }

    // ── Visualizer (pm.visualizer.set) ──────────────────────────

    /**
     * Minimal Handlebars-compatible template renderer.
     * Supports: {{variable}}, {{nested.path}}, {{#each array}}…{{/each}},
     * {{#if value}}…{{else}}…{{/if}}
     */
    function renderTemplate(template, data) {
        if (!template) return '';
        if (!data) return template;

        function resolvePath(obj, path) {
            return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj);
        }

        function render(tpl, ctx) {
            // Process {{#each collection}}…{{/each}}
            tpl = tpl.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, path, body) => {
                const arr = resolvePath(ctx, path);
                if (!Array.isArray(arr)) return '';
                return arr.map((item, index) => {
                    const itemCtx = typeof item === 'object' && item !== null
                        ? { ...ctx, ...item, '@index': index, '@first': index === 0, '@last': index === arr.length - 1, 'this': item }
                        : { ...ctx, '@index': index, '@first': index === 0, '@last': index === arr.length - 1, 'this': item };
                    return render(body, itemCtx);
                }).join('');
            });

            // Process {{#if value}}…{{else}}…{{/if}} and {{#if value}}…{{/if}}
            tpl = tpl.replace(/\{\{#if\s+([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, path, body) => {
                const val = resolvePath(ctx, path);
                const parts = body.split('{{else}}');
                if (val) return render(parts[0], ctx);
                return parts[1] ? render(parts[1], ctx) : '';
            });

            // Process {{{variable}}} (unescaped)
            tpl = tpl.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, path) => {
                const val = resolvePath(ctx, path);
                return val != null ? String(val) : '';
            });

            // Process {{variable}} (escaped)
            tpl = tpl.replace(/\{\{([\w.@]+)\}\}/g, (_, path) => {
                const val = resolvePath(ctx, path);
                if (val == null) return '';
                const s = String(val);
                return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            });

            return tpl;
        }

        return render(template, data);
    }

    /**
     * Update the Visualize tab with rendered template data.
     * Shows the tab button only when visualizerData is present.
     */
    function updateVisualizerTab(visualizerData) {
        const tabBtn = elements.visualizeTabBtn;
        const iframe = elements.visualizerIframe;
        const placeholder = elements.visualizerPlaceholder;

        if (!visualizerData || !visualizerData.template) {
            // No visualizer data — hide the tab
            clearVisualizer();
            return;
        }

        // Show the Visualize tab button
        if (tabBtn) tabBtn.classList.remove('hidden');

        // Render the Handlebars template
        const renderedHtml = renderTemplate(visualizerData.template, visualizerData.data || {});

        // Wrap in a full HTML document with basic styling
        const fullHtml = `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 8px;
            color: #d4d4d4;
            background: #1e1e1e;
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #444; padding: 6px 10px; text-align: left; }
        th { background: #2d2d2d; }
        tr:nth-child(even) { background: #252525; }
        a { color: #569cd6; }
        img { max-width: 100%; }
    </style>
</head>
<body>${renderedHtml}</body>
</html>`;

        // Render into sandboxed iframe via srcdoc
        if (iframe) {
            iframe.srcdoc = fullHtml;
            iframe.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
    }

    /**
     * Clear the Visualize tab and hide its button.
     */
    function clearVisualizer() {
        const tabBtn = elements.visualizeTabBtn;
        const iframe = elements.visualizerIframe;
        const placeholder = elements.visualizerPlaceholder;

        if (tabBtn) tabBtn.classList.add('hidden');
        if (iframe) {
            iframe.srcdoc = '';
            iframe.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
    }

    /**
     * Update status badge
     * @param {number} statusCode
     * @param {string} statusText
     */
    function updateStatusBadge(statusCode, statusText) {
        if (elements.responseStatus) {
            elements.responseStatus.classList.remove('hidden');
            elements.responseStatus.textContent = `${statusCode} ${statusText}`;
            elements.responseStatus.className = `status-badge ${statusCode >= 200 && statusCode < 400 ? 'success' : 'error'}`;
        }
    }

    /**
     * Update response time display
     * @param {number} duration
     */
    function updateResponseTime(duration) {
        if (elements.responseTime) {
            elements.responseTime.classList.remove('hidden');
            elements.responseTime.textContent = formatDuration(duration);
        }
    }

    /**
     * Update response body editor
     * @param {Object} response
     */
    function updateBodyEditor(response) {
        const editor = getResponseBodyEditor();
        if (!editor) return;

        let bodyContent = '';
        let language = 'text';

        if (response.body) {
            if (typeof response.body === 'object') {
                bodyContent = JSON.stringify(response.body, null, 2);
                language = 'json';
            } else if (typeof response.body === 'string') {
                // If headers indicate HTML or content looks like HTML, render as HTML
                if (isHtmlResponse(response)) {
                    bodyContent = response.body;
                    language = 'html';
                } else {
                    try {
                        const parsed = JSON.parse(response.body);
                        bodyContent = JSON.stringify(parsed, null, 2);
                        language = 'json';
                    } catch {
                        bodyContent = response.body;
                    }
                }
            }
        }

        const model = editor.getModel();
        monaco.editor.setModelLanguage(model, language);
        safeSetEditorValue(editor, bodyContent);

        // If the response is HTML, prepare the preview UI but only show the
        // Raw/Preview toolbar when the Body tab itself is active. We still
        // activate the preview internally so it's ready when the user
        // switches to the Body tab.
        const isHtml = language === 'html';
        if (isHtml && elements.responseHtmlPreview && elements.responsePreviewIframe) {
            // Populate iframe preview (use srcdoc for inline HTML)
            try {
                elements.responsePreviewIframe.srcdoc = bodyContent || '';
            } catch (err) {
                // Fallback: set content via document write if srcdoc not supported
                try {
                    const doc = elements.responsePreviewIframe.contentDocument || elements.responsePreviewIframe.contentWindow.document;
                    doc.open();
                    doc.write(bodyContent || '');
                    doc.close();
                } catch (e) { /* ignore */ }
            }

            // Activate preview internally so it's ready even when another
            // response tab is selected. The toolbar visibility is controlled
            // by whether the Body tab is active.
            switchBodyView('preview');

            // Only show the toolbar when Body tab is visible
            const bodyPanel = document.getElementById('response-body-tab');
            const isBodyActive = bodyPanel && bodyPanel.classList.contains('active');
            if (isBodyActive) {
                elements.responseBodyToolbar?.classList.remove('hidden');
            } else {
                elements.responseBodyToolbar?.classList.add('hidden');
            }
        } else {
            // Non-HTML responses: ensure toolbar/preview are hidden and show raw editor
            if (elements.responseBodyToolbar) elements.responseBodyToolbar.classList.add('hidden');
            switchBodyView('raw');
        }
    }

    /**
     * Update headers table
     * @param {Object} headers
     */
    function updateHeadersTable(headers) {
        if (!elements.responseHeadersTable) return;
        
        elements.responseHeadersTable.innerHTML = '';
        if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
                // For array headers, display each value on its own row
                if (Array.isArray(value)) {
                    value.forEach(headerValue => {
                        const row = document.createElement('tr');
                        row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(headerValue)}</td>`;
                        elements.responseHeadersTable.appendChild(row);
                    });
                } else {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td>`;
                    elements.responseHeadersTable.appendChild(row);
                }
            });
        }
    }

    /**
     * Update cookies table
     * @param {Array} cookies
     */
    function updateCookiesTable(cookies) {
        if (!elements.responseCookiesTable) return;
        
        elements.responseCookiesTable.innerHTML = '';
        if (cookies && cookies.length > 0) {
            cookies.forEach(cookie => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${escapeHtml(cookie.name)}</td>
                    <td>${escapeHtml(cookie.value)}</td>
                    <td>${escapeHtml(cookie.domain || '')}</td>
                    <td>${escapeHtml(cookie.path || '')}</td>
                    <td>${escapeHtml(cookie.expires || '')}</td>
                `;
                elements.responseCookiesTable.appendChild(row);
            });
        }
    }

    /**
     * Update sent request tab with actual HTTP request details
     * @param {Object} sentRequest - The actual sent request data
     */
    function updateSentRequestTab(sentRequest) {
        const hasSentRequest = !!sentRequest;
        
        // Update URL
        if (elements.sentRequestUrl) {
            elements.sentRequestUrl.textContent = sentRequest?.url || '';
        }

        // Update path params table
        if (elements.sentRequestParamsTable) {
            elements.sentRequestParamsTable.innerHTML = '';
            const hasParams = sentRequest?.params && Object.keys(sentRequest.params).length > 0;
            if (hasParams) {
                Object.entries(sentRequest.params).forEach(([key, value]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td>`;
                    elements.sentRequestParamsTable.appendChild(row);
                });
            }
            // Hide section if no params
            if (elements.sentRequestParamsSection) {
                elements.sentRequestParamsSection.style.display = hasParams ? 'block' : 'none';
            }
        }

        // Update query params table
        if (elements.sentRequestQueryTable) {
            elements.sentRequestQueryTable.innerHTML = '';
            const hasQuery = sentRequest?.query && Object.keys(sentRequest.query).length > 0;
            if (hasQuery) {
                Object.entries(sentRequest.query).forEach(([key, value]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td>`;
                    elements.sentRequestQueryTable.appendChild(row);
                });
            }
            // Hide section if no query params
            if (elements.sentRequestQuerySection) {
                elements.sentRequestQuerySection.style.display = hasQuery ? 'block' : 'none';
            }
        }

        // Update headers table
        if (elements.sentRequestHeadersTable) {
            elements.sentRequestHeadersTable.innerHTML = '';
            if (sentRequest?.headers) {
                Object.entries(sentRequest.headers).forEach(([key, value]) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${escapeHtml(key)}</td><td>${escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</td>`;
                    elements.sentRequestHeadersTable.appendChild(row);
                });
            }
        }

        // Update body and body type - sentRequest.body uses separate fields { type, format, content }
        if (elements.sentRequestBody) {
            let bodyContent = '';
            let bodyTypeLabel = '';
            const bodyData = sentRequest?.body;
            const hasBody = bodyData && typeof bodyData === 'object' && bodyData.type && bodyData.type !== 'none';
            
            if (hasBody) {
                // Separate fields format: { type: 'raw', format: 'json', content: ... }
                bodyTypeLabel = bodyData.type;
                if (bodyData.type === 'raw' && bodyData.format) {
                    bodyTypeLabel = `${bodyData.type} (${bodyData.format})`;
                }
                const content = bodyData.content;
                if (typeof content === 'object') {
                    bodyContent = JSON.stringify(content, null, 2);
                } else {
                    bodyContent = String(content ?? '');
                }
            }
            elements.sentRequestBody.textContent = bodyContent || '(no body)';
            
            // Update body type badge
            if (elements.sentRequestBodyType) {
                elements.sentRequestBodyType.textContent = hasBody ? bodyTypeLabel : '';
            }
            
            // Hide body section if no body
            if (elements.sentRequestBodySection) {
                elements.sentRequestBodySection.style.display = hasBody ? 'block' : 'none';
            }
        }

        // Toggle placeholder visibility
        if (elements.sentRequestPlaceholder) {
            elements.sentRequestPlaceholder.style.display = sentRequest ? 'none' : 'flex';
        }
    }

    /**
     * Handle response from extension
     * @param {Object} response - Response data
     * @param {Object} [scriptResults] - Script execution results from backend
     * @param {Array} [scriptResults.testResults] - Test assertions
     * @param {Array} [scriptResults.consoleOutput] - Console output from scripts
     * @param {Object} [scriptResults.visualizerData] - pm.visualizer.set() data
     */
    async function handleResponse(response, scriptResults = {}) {
        elements.responsePlaceholder?.classList.add('hidden');
        
        state.lastResponse = response;

    // prefer explicit `status` but accept 0 (use nullish coalescing so 0 is preserved)
    const statusCode = response.status ?? response.statusCode;
        const statusText = response.statusText || response.statusMessage || '';
        const duration = response.time || response.duration;

        updateStatusBadge(statusCode, statusText);
        updateResponseTime(duration);
        updateBodyEditor(response);
        updateHeadersTable(response.headers);
        updateCookiesTable(response.cookies);
        updateSentRequestTab(state.lastSentRequest);
        
        // Display script execution results from backend
        if (scriptResults.testResults && scriptResults.testResults.length > 0) {
            // Display test results
            testResultsManager.clear();
            scriptResults.testResults.forEach(test => {
                // Convert message to string if it's an object
                let errorMessage = test.message;
                if (errorMessage && typeof errorMessage === 'object') {
                    try {
                        errorMessage = JSON.stringify(errorMessage, null, 2);
                    } catch {
                        errorMessage = String(errorMessage);
                    }
                }
                testResultsManager.addResult(test.name, test.passed, errorMessage);
            });
        }

        // Handle pm.visualizer.set() data
        updateVisualizerTab(scriptResults.visualizerData);
        
        // Console output is now logged directly to VS Code Output channel
        // No need to display in webview
    }

    return {
        clearResponse,
        handleResponse,
        updateSentRequestTab
    };
}

// ES Module export
export { createResponseHandler };

