/**
 * Response Handler Module
 * Single Responsibility: Handle and display HTTP responses
 * 
 * Shared between endpoint-tester and http-api-tester
 */

import { safeSetEditorValue } from './monaco-editors-manager.js';
import { generateAssertionSuggestions } from './suggest-assertions.js';
import { getHeaderValue, isHtmlResponse } from './utils.js';

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
    testResultsManager,
    onApplyAssertions,
    onAiEnhance,
    onAiExplainResponse,
    onAiContractTests,
    onAiExtractVars,
    onAiGenerateTypes,
    onAiCompareResponses
}) {

    // Normalize response body to string before sending to extension.
    // The body may be a pre-parsed object when the content-type is JSON.
    function serializeBody(body) {
        if (body == null) return '';
        if (typeof body === 'object') return JSON.stringify(body);
        return String(body);
    }

    // --- Suggestion banner helpers ---
    function getSuggestionBanner() {
        return document.getElementById('suggest-assertions-banner');
    }

    function renderSuggestionList(suggestions) {
        const list = document.getElementById('suggest-assertions-list');
        if (!list) return;
        list.innerHTML = suggestions.map(s =>
            `<div class="suggestion-item">
                <code class="suggestion-snippet">${escapeHtml(s.snippet)}</code>
                <small class="suggestion-rationale">${escapeHtml(s.rationale)}</small>
            </div>`
        ).join('');

        // Re-wire Apply All to current suggestions
        const applyBtn = document.getElementById('apply-all-assertions-btn');
        if (applyBtn) {
            applyBtn.onclick = () => {
                const combined = suggestions.map(s => s.snippet).join('\n\n');
                if (typeof onApplyAssertions === 'function') {
                    onApplyAssertions(combined);
                }
            };
        }
    }

    function showAssertionSuggestions(suggestions) {
        const banner = getSuggestionBanner();
        if (!banner) return;

        renderSuggestionList(suggestions);

        // Wire up AI Enhance button
        const aiBtn = document.getElementById('ai-enhance-suggestions-btn');
        if (aiBtn) {
            aiBtn.disabled = false;
            aiBtn.textContent = '✨ Enhance with AI';
            aiBtn.onclick = () => {
                aiBtn.disabled = true;
                aiBtn.textContent = '⏳ Generating...';
                const lastResponse = state.lastResponse;
                const contentType = getHeaderValue(lastResponse?.headers, 'content-type');
                if (typeof onAiEnhance === 'function') {
                    onAiEnhance({
                        status: lastResponse?.status ?? lastResponse?.statusCode,
                        body: lastResponse?.body,
                        contentType
                    });
                }
            };
        }

        // Wire up Dismiss button
        const dismissBtn = document.getElementById('dismiss-suggestions-btn');
        if (dismissBtn) {
            dismissBtn.onclick = () => banner.classList.add('hidden');
        }

        banner.classList.remove('hidden');
    }

    function updateAiSuggestions(suggestions, errorMsg) {
        const aiBtn = document.getElementById('ai-enhance-suggestions-btn');
        if (aiBtn) {
            aiBtn.disabled = false;
            aiBtn.textContent = '✨ Enhance with AI';
        }
        if (errorMsg) {
            const list = document.getElementById('suggest-assertions-list');
            if (list) {
                list.innerHTML = `<div class="suggestion-item"><small class="suggestion-rationale" style="color:var(--vscode-errorForeground)">${escapeHtml(errorMsg)}</small></div>`;
            }
            return;
        }
        if (suggestions && suggestions.length > 0) {
            // Update title to reflect AI source
            const title = document.querySelector('.suggest-assertions-title');
            if (title) title.innerHTML = '✨ AI-powered <code>pm.test()</code> suggestions for this response:';
            renderSuggestionList(suggestions);
        }
    }

    function hideAssertionSuggestions() {
        const banner = getSuggestionBanner();
        if (banner) banner.classList.add('hidden');
    }

    // --- AI vertical-tab helpers ---

    /** Return the panel element for a given AI tab id. */
    function getAiTabPanel(tabId) {
        return document.getElementById(`ai-vtab-panel-${tabId}`);
    }

    /** Switch the active AI vertical tab (updates both tab buttons and panels). */
    function switchAiTab(tabId) {
        document.querySelectorAll('.ai-vtab').forEach(t => {
            const active = t.dataset.aiTab === tabId;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.ai-vtab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `ai-vtab-panel-${tabId}`);
        });
    }

    /** Show a small right-click context menu for AI tabs. */
    function showAiTabContextMenu(event, onRefresh) {
        document.querySelectorAll('.ai-tab-contextmenu').forEach(m => m.remove());
        const menu = document.createElement('div');
        menu.className = 'ai-tab-contextmenu';
        menu.style.cssText = `position:fixed;left:${event.clientX}px;top:${event.clientY}px;z-index:9999;`;
        const item = document.createElement('button');
        item.textContent = '↺ Refresh';
        item.onclick = () => { menu.remove(); onRefresh(); };
        menu.appendChild(item);
        document.body.appendChild(menu);
        const close = () => { menu.remove(); document.removeEventListener('click', close); };
        setTimeout(() => document.addEventListener('click', close), 10);
    }

    /** Show content in a specific AI tab panel. */
    function showAiPanel(panelEl, contentHtml, actions = []) {
        if (!panelEl) return;
        const loading = panelEl.querySelector('.ai-loading');
        const content = panelEl.querySelector('.ai-vtab-content');
        const actionsEl = panelEl.querySelector('.ai-vtab-actions');
        if (loading) loading.classList.add('hidden');
        if (content) content.innerHTML = contentHtml;
        if (actionsEl) {
            if (actions.length > 0) {
                actionsEl.innerHTML = '';
                actionsEl.classList.remove('hidden');
                actions.forEach(({ label, onClick, className }) => {
                    const btn = document.createElement('button');
                    btn.className = className || 'primary';
                    btn.textContent = label;
                    btn.onclick = onClick;
                    actionsEl.appendChild(btn);
                });
            } else {
                actionsEl.classList.add('hidden');
            }
        }
    }

    /** Show loading spinner in a specific AI tab panel. */
    function setAiPanelLoading(panelEl) {
        if (!panelEl) return;
        const loading = panelEl.querySelector('.ai-loading');
        const content = panelEl.querySelector('.ai-vtab-content');
        const actionsEl = panelEl.querySelector('.ai-vtab-actions');
        if (loading) loading.classList.remove('hidden');
        if (content) content.innerHTML = '';
        if (actionsEl) actionsEl.classList.add('hidden');
    }

    /** Reset all AI tabs to unloaded state and clear their panels. */
    function resetAiTabs() {
        document.querySelectorAll('.ai-vtab[data-ai-tab]').forEach(tab => {
            if (tab.dataset.aiTab === 'raw') return;
            delete tab.dataset.loaded;
            tab.style.opacity = '';
            tab.onclick = null;
            tab.oncontextmenu = null;
            const refreshBtn = tab.parentElement?.querySelector('.ai-tab-refresh-btn');
            if (refreshBtn) refreshBtn.onclick = null;
            const panel = getAiTabPanel(tab.dataset.aiTab);
            if (panel) {
                const loading = panel.querySelector('.ai-loading');
                const content = panel.querySelector('.ai-vtab-content');
                const actions = panel.querySelector('.ai-vtab-actions');
                if (loading) loading.classList.add('hidden');
                if (content) content.innerHTML = '';
                if (actions) { actions.innerHTML = ''; actions.classList.add('hidden'); }
            }
        });
    }

    /** Wire an AI tab: first click triggers AI; subsequent clicks just switch; right-click = refresh. */
    function wireAiTab(tabId, triggerFn) {
        const tab = document.querySelector(`.ai-vtab[data-ai-tab="${tabId}"]`);
        if (!tab) return;
        const trigger = () => {
            if (tab.dataset.loaded === 'loading') return; // already in-flight
            switchAiTab(tabId);
            tab.dataset.loaded = 'loading';
            const panel = getAiTabPanel(tabId);
            if (panel) setAiPanelLoading(panel);
            try {
                triggerFn();
            } catch (err) {
                // If sending the request itself fails, show the error instead of
                // leaving the spinner stuck forever.
                tab.dataset.loaded = '';
                if (panel) showAiPanel(panel,
                    `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(err?.message || 'AI request failed')}</span>`);
            }
        };
        tab.onclick = () => {
            if (tab.dataset.loaded === 'true') { switchAiTab(tabId); } else { trigger(); }
        };
        const refreshBtn = tab.parentElement?.querySelector('.ai-tab-refresh-btn');
        if (refreshBtn) refreshBtn.onclick = (e) => { e.stopPropagation(); tab.dataset.loaded = ''; trigger(); };
        tab.oncontextmenu = (e) => { e.preventDefault(); showAiTabContextMenu(e, () => { tab.dataset.loaded = ''; trigger(); }); };
    }

    function showAiExplainPanel(text, error) {
        const tab = document.querySelector('.ai-vtab[data-ai-tab="explain"]');
        if (tab) tab.dataset.loaded = 'true';
        const panel = getAiTabPanel('explain');
        if (!panel) return;
        if (error) {
            showAiPanel(panel, `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(error)}</span>`);
        } else {
            showAiPanel(panel, escapeHtml(text || '').replace(/\n/g, '<br>'));
        }
    }

    /** Show contract-test snippets in the AI tab panel with a selective apply button. */
    function showAiContractTestsPanel(snippets, error, onApply) {
        const tab = document.querySelector('.ai-vtab[data-ai-tab="contract"]');
        if (tab) tab.dataset.loaded = 'true';
        const panel = getAiTabPanel('contract');
        if (!panel) return;
        if (error) {
            showAiPanel(panel, `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(error)}</span>`);
            return;
        }
        const html = snippets.map((s, idx) =>
            `<div class="ai-contract-item">
                <div class="ai-item-row">
                    <input type="checkbox" class="ai-item-check" data-idx="${idx}" checked>
                    <code class="ai-contract-snippet">${escapeHtml(s.snippet)}</code>
                </div>
                <small class="ai-contract-rationale">${escapeHtml(s.rationale ?? s.field ?? '')}</small>
            </div>`
        ).join('');
        showAiPanel(panel, html, [{
            label: 'Apply Selected to Script',
            onClick: () => {
                const content = panel.querySelector('.ai-vtab-content');
                const checked = Array.from(content?.querySelectorAll('.ai-item-check:checked') || []);
                const selected = checked
                    .map(cb => snippets[parseInt(cb.dataset.idx, 10)]?.snippet)
                    .filter(Boolean)
                    .join('\n\n');
                if (selected && typeof onApply === 'function') onApply(selected);
            },
            className: 'btn primary'
        }]);
    }

    /** Show extracted variable suggestions in the AI tab panel. */
    function showAiExtractVarsPanel(variables, script, error, onApply, onAddToEnv) {
        const tab = document.querySelector('.ai-vtab[data-ai-tab="extract"]');
        if (tab) tab.dataset.loaded = 'true';
        const panel = getAiTabPanel('extract');
        if (!panel) return;
        if (error) {
            showAiPanel(panel, `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(error)}</span>`);
            return;
        }
        const vars = variables || [];
        const html = vars.map((v, idx) =>
            `<div class="ai-var-item">
                <div class="ai-item-row">
                    <input type="checkbox" class="ai-item-check" data-idx="${idx}" checked>
                    <span class="ai-var-name"><code>{{${escapeHtml(v.suggestedName)}}}</code></span>
                </div>
                <span class="ai-var-field">${escapeHtml(v.field)} <small class="ai-var-path">${escapeHtml(v.path || '')}</small></span>
                <small class="ai-var-reason">${escapeHtml(v.reason || '')}</small>
            </div>`
        ).join('');
        const actions = vars.length ? [
            {
                label: 'Apply Selected to Script',
                onClick: () => {
                    const content = panel.querySelector('.ai-vtab-content');
                    const checked = Array.from(content?.querySelectorAll('.ai-item-check:checked') || []);
                    const selectedVars = checked
                        .map(cb => vars[parseInt(cb.dataset.idx, 10)])
                        .filter(Boolean);
                    if (!selectedVars.length || typeof onApply !== 'function') return;
                    const selectedScript = selectedVars
                        .map(v => {
                            const path = (v.path || '').replace(/^\$\.?/, '') || v.field || v.suggestedName;
                            return `pm.environment.set('${v.suggestedName}', pm.response.json().${path});`;
                        })
                        .join('\n');
                    onApply(selectedScript);
                },
                className: 'btn primary'
            },
            {
                label: '➕ Add to Environment',
                onClick: () => {
                    const content = panel.querySelector('.ai-vtab-content');
                    const checked = Array.from(content?.querySelectorAll('.ai-item-check:checked') || []);
                    const selectedVars = checked
                        .map(cb => vars[parseInt(cb.dataset.idx, 10)])
                        .filter(Boolean);
                    if (!selectedVars.length || typeof onAddToEnv !== 'function') return;
                    onAddToEnv(selectedVars);
                },
                className: 'btn btn-secondary'
            }
        ] : [];
        showAiPanel(panel, html, actions);
    }

    /** Show TypeScript interfaces in the AI tab panel with a copy button. */
    function showAiTypesPanel(types, error) {
        const tab = document.querySelector('.ai-vtab[data-ai-tab="types"]');
        if (tab) tab.dataset.loaded = 'true';
        const panel = getAiTabPanel('types');
        if (!panel) return;
        if (error) {
            showAiPanel(panel, `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(error)}</span>`);
            return;
        }
        const html = `<pre class="ai-types-display">${escapeHtml(types || '')}</pre>`;
        showAiPanel(panel, html, [{
            label: '📋 Copy to Clipboard',
            onClick: () => {
                try {
                    navigator.clipboard.writeText(types || '');
                    const actionsEl = panel.querySelector('.ai-vtab-actions');
                    const btn2 = actionsEl?.querySelector('button');
                    if (btn2) { const orig = btn2.textContent; btn2.textContent = 'Copied!'; setTimeout(() => btn2.textContent = orig, 1500); }
                } catch { /* ignore */ }
            },
            className: 'btn btn-secondary'
        }]);
    }

    /** Show response comparison text in the AI tab panel. */
    function showAiComparePanel(text, error) {
        const tab = document.querySelector('.ai-vtab[data-ai-tab="compare"]');
        if (tab) tab.dataset.loaded = 'true';
        const panel = getAiTabPanel('compare');
        if (!panel) return;
        if (error) {
            showAiPanel(panel, `<span style="color:var(--vscode-errorForeground)">⚠ ${escapeHtml(error)}</span>`);
        } else {
            showAiPanel(panel, escapeHtml(text || '').replace(/\n/g, '<br>'));
        }
    }

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
        // Hide AI vtabs container and reset to raw tab
        const vtabsContainer = document.getElementById('response-ai-vtabs-container');
        if (vtabsContainer) vtabsContainer.classList.add('hidden');
        switchAiTab('raw');
        resetAiTabs();
        // Clear previous response so Compare doesn't carry over stale data from another request
        state.previousResponse = null;
        state.responseHistory  = [];
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
        
        // Track previous response for comparison
        if (state.lastResponse) {
            state.previousResponse = state.lastResponse;
        }
        state.lastResponse = response;

        // Maintain rolling response history (last 5) for AI context
        if (!state.responseHistory) state.responseHistory = [];
        const statusCode = response.status ?? response.statusCode;
        const statusText = response.statusText || response.statusMessage || '';
        state.responseHistory.push({
            status: statusCode,
            statusText,
            contentType: getHeaderValue(response.headers, 'content-type'),
            bodyPreview: String(serializeBody(response.body) ?? '').slice(0, 300),
            timestamp: Date.now(),
        });
        if (state.responseHistory.length > 5) state.responseHistory.shift();

        const duration = response.time || response.duration;

        updateStatusBadge(statusCode, statusText);
        updateResponseTime(duration);
        updateBodyEditor(response);
        updateHeadersTable(response.headers);
        updateCookiesTable(response.cookies);
        updateSentRequestTab(state.lastSentRequest);

        // Show AI vertical tabs container and reset all AI tab states
        const vtabsContainer = document.getElementById('response-ai-vtabs-container');
        if (vtabsContainer) vtabsContainer.classList.remove('hidden');
        resetAiTabs();
        switchAiTab('raw');

        // Wire Raw Body tab to switch back to the editor panel
        const rawTab = document.querySelector('.ai-vtab[data-ai-tab="raw"]');
        if (rawTab) rawTab.onclick = () => switchAiTab('raw');

        // Helper: read content-type from the latest response
        const getCt = () => getHeaderValue(state.lastResponse?.headers, 'content-type');

        // ── ✨ Explain ──────────────────────────────────────────────────────
        wireAiTab('explain', () => {
            if (typeof onAiExplainResponse === 'function') {
                onAiExplainResponse({
                    status: state.lastResponse?.status ?? state.lastResponse?.statusCode,
                    statusText: state.lastResponse?.statusText || '',
                    body: serializeBody(state.lastResponse?.body),
                    contentType: getCt(),
                    method: state.lastSentRequest?.method,
                    url: state.lastSentRequest?.url,
                });
            }
        });

        // ── 📋 Contract Tests ────────────────────────────────────────────────
        wireAiTab('contract', () => {
            if (typeof onAiContractTests === 'function') {
                onAiContractTests({
                    status: state.lastResponse?.status ?? state.lastResponse?.statusCode,
                    body: serializeBody(state.lastResponse?.body),
                    contentType: getCt(),
                    method: state.lastSentRequest?.method,
                    url: state.lastSentRequest?.url,
                });
            }
        });

        // ── ⬆ Extract Vars ───────────────────────────────────────────────────
        wireAiTab('extract', () => {
            if (typeof onAiExtractVars === 'function') {
                onAiExtractVars({
                    body: serializeBody(state.lastResponse?.body),
                    status: state.lastResponse?.status ?? state.lastResponse?.statusCode,
                    method: state.lastSentRequest?.method,
                    url: state.lastSentRequest?.url,
                });
            }
        });

        // ── { } TS Types ─────────────────────────────────────────────────────
        wireAiTab('types', () => {
            if (typeof onAiGenerateTypes === 'function') {
                onAiGenerateTypes({
                    body: serializeBody(state.lastResponse?.body),
                    method: state.lastSentRequest?.method,
                    url: state.lastSentRequest?.url,
                });
            }
        });

        // ── ↔ Compare ────────────────────────────────────────────────────────
        const compareTab = document.querySelector('.ai-vtab[data-ai-tab="compare"]');
        if (compareTab) {
            if (!state.previousResponse) {
                compareTab.title = 'Send another request first to compare';
                compareTab.style.opacity = '0.4';
                compareTab.onclick = null;
                compareTab.oncontextmenu = null;
                const compareRefresh = compareTab.parentElement?.querySelector('.ai-tab-refresh-btn');
                if (compareRefresh) compareRefresh.onclick = null;
            } else {
                compareTab.title = 'Compare with previous response';
                compareTab.style.opacity = '';
                wireAiTab('compare', () => {
                    if (typeof onAiCompareResponses === 'function') {
                        onAiCompareResponses({
                            currentBody: serializeBody(state.lastResponse?.body),
                            currentStatus: state.lastResponse?.status ?? state.lastResponse?.statusCode,
                            previousBody: serializeBody(state.previousResponse?.body),
                            previousStatus: state.previousResponse?.status ?? state.previousResponse?.statusCode,
                            method: state.lastSentRequest?.method,
                            url: state.lastSentRequest?.url,
                        });
                    }
                });
            }
        }

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

        // Show assertion suggestions when there are no pm.test() assertions
        const hasTests = scriptResults.testResults && scriptResults.testResults.length > 0;
        if (!hasTests) {
            const contentType = getHeaderValue(response.headers, 'content-type');
            const suggestions = generateAssertionSuggestions(statusCode, response.body, contentType);
            if (suggestions.length > 0) {
                showAssertionSuggestions(suggestions);
            }
        } else {
            hideAssertionSuggestions();
        }

        // Handle pm.visualizer.set() data
        updateVisualizerTab(scriptResults.visualizerData);
        
        // Console output is now logged directly to VS Code Output channel
        // No need to display in webview
    }

    return {
        clearResponse,
        handleResponse,
        updateSentRequestTab,
        updateAiSuggestions,
        showAiExplainPanel,
        showAiContractTestsPanel,
        showAiExtractVarsPanel,
        showAiTypesPanel,
        showAiComparePanel
    };
}

// ES Module export
export { createResponseHandler };

