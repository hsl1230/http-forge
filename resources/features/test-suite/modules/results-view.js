/**
 * Results view: result detail modal, exports, panel resizer, and the grouped
 * virtual-scroll rendering of the results list.
 */

import { VIRTUAL_SCROLL, editorState, elements, state, virtualScrollState, vscode } from './state.js';
import { escapeHtml, expandSummary } from './utils.js';

// ============================================
// Response Detail Modal
// ============================================

/**
 * Show result detail modal - requests full details from extension
 * @param {number} index - Index of the result in state.results
 */
export function showResultDetail(index) {
    const compactResult = state.results[index];
    if (!compactResult) return;
    
    // Expand compact summary
    const result = expandSummary(compactResult);
    
    state.selectedResultIndex = index;
    
    // Show modal immediately with summary info and loading state
    showModalWithSummary(result);
    
    // If we have a resultFile, request full details from extension
    if (result.resultFile && state.suiteId && state.currentRunId) {
        const runId = state.viewingHistoryRun || state.currentRunId;
        vscode.postMessage({
            type: 'getResultDetails',
            suiteId: state.suiteId,
            runId,
            resultFile: result.resultFile
        });
    } else {
        populateModalWithDetails(result);
    }
}

/**
 * Show modal with summary info
 * @param {Object} result
 */
export function showModalWithSummary(result) {
    if (elements.modalStatusIcon) {
        elements.modalStatusIcon.textContent = result.passed ? '✓' : '✗';
        elements.modalStatusIcon.className = `modal-status-icon ${result.passed ? 'passed' : 'failed'}`;
    }
    if (elements.modalRequestName) {
        elements.modalRequestName.textContent = result.name;
    }
    if (elements.modalRequestMeta) {
        elements.modalRequestMeta.textContent = `${result.method} ${result.status} • ${result.duration}ms`;
    }
    
    // Reset tabs
    elements.modalTabs?.forEach(t => t.classList.remove('active'));
    elements.modalPanels?.forEach(p => p.classList.remove('active'));
    elements.modalTabs?.[0]?.classList.add('active');
    elements.modalPanels?.[0]?.classList.add('active');
    
    // Show loading state
    if (editorState.responseBodyMonacoEditor) {
        editorState.responseBodyMonacoEditor.setValue('Loading...');
    }
    
    elements.responseModal.classList.remove('hidden');
}

/**
 * Handle result details
 * @param {Object} details
 */
export function handleResultDetails(details) {
    if (details) {
        populateModalWithDetails(details);
    }
}

/**
 * Handle result details error
 * @param {string} error
 */
export function handleResultDetailsError(error) {
    if (editorState.responseBodyMonacoEditor) {
        editorState.responseBodyMonacoEditor.setValue(`Error loading details: ${error}`);
    }
}

/**
 * Populate modal with full result details
 * @param {Object} result
 */
export function populateModalWithDetails(result) {
    const responseBody = result.response?.body ?? result.responseBody;
    const responseHeaders = result.response?.headers ?? result.responseHeaders ?? {};
    const requestBody = result.request?.body ?? result.requestBody;
    const requestHeaders = result.request?.headers ?? result.requestHeaders ?? {};
    
    // Response body
    formatAndDisplayBody(responseBody);
    
    // Response headers
    if (elements.responseHeadersTable) {
        elements.responseHeadersTable.innerHTML = Object.entries(responseHeaders)
            .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`)
            .join('') || '<tr><td colspan="2">No headers</td></tr>';
    }
    
    // Request details
    if (elements.requestUrl) elements.requestUrl.textContent = result.url || '';
    if (elements.requestMethodDuration) {
        const methodText = result.method || '';
        const durationText = result.duration != null ? `${result.duration}ms` : '';
        elements.requestMethodDuration.textContent = [methodText, durationText].filter(Boolean).join(' • ');
    }
    
    if (elements.requestHeadersTable) {
        elements.requestHeadersTable.innerHTML = Object.entries(requestHeaders)
            .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`)
            .join('') || '<tr><td colspan="2">No headers</td></tr>';
    }

    const normalizedRequestBody = normalizeRequestBody(requestBody);
    const hasRequestBody = normalizedRequestBody && normalizedRequestBody.type !== 'none';
    const bodyLabel = normalizedRequestBody?.type ? `Request Body (${normalizedRequestBody.type} ${normalizedRequestBody.format ? ' / ' + normalizedRequestBody.format : ''})` : 'Request Body';

    if (elements.requestBodyTab) {
        elements.requestBodyTab.classList.toggle('hidden', !hasRequestBody);
    }
    if (elements.requestBodyPanel) {
        elements.requestBodyPanel.classList.toggle('hidden', !hasRequestBody);
    }
    if (!hasRequestBody) {
        elements.requestHeadersTab?.classList.add('active');
        elements.requestBodyTab?.classList.remove('active');
        elements.requestHeadersPanel?.classList.add('active');
        elements.requestBodyPanel?.classList.remove('active');
    }

    if (elements.requestBodyHeading) {
        elements.requestBodyHeading.textContent = bodyLabel;
    }

    if (elements.requestBodyContent) {
        if (hasRequestBody) {
            const content = normalizedRequestBody?.content ?? '';
            elements.requestBodyContent.textContent = formatRequestBodyContent(content, normalizedRequestBody?.type);
        } else {
            elements.requestBodyContent.textContent = 'No body';
        }
    }

    // Test results
    populateTestResults(result.assertions || []);

    /**
     * Normalize request body shape into type and content.
     */
    function normalizeRequestBody(body) {
        if (body == null) return null;
        if (typeof body === 'string') {
            return { type: 'raw', content: body };
        }
        if (typeof body === 'object') {
            if ('type' in body) {
                const type = body.type || 'raw';
                const content = body.content != null ? body.content : '';
                return { type, content };
            }
            return { type: 'raw', content: body };
        }
        return { type: 'raw', content: String(body) };
    }

    /**
     * Format request body content for display.
     */
    function formatRequestBodyContent(content, type) {
        if (content == null) return '';
        if (typeof content === 'string') {
            if (type === 'raw' || type === 'graphql' || type === 'x-www-form-urlencoded' || type === 'binary') {
                try {
                    const parsed = JSON.parse(content);
                    return JSON.stringify(parsed, null, 2);
                } catch {
                    return content;
                }
            }
            try {
                const parsed = JSON.parse(content);
                return JSON.stringify(parsed, null, 2);
            } catch {
                return content;
            }
        }
        try {
            return JSON.stringify(content, null, 2);
        } catch {
            return String(content);
        }
    }
    
    // Test results
    populateTestResults(result.assertions || []);
}

/**
 * Initialize Monaco editor for response body
 */
export function initResponseBodyEditor() {
    if (!elements.responseBodyEditor) return;
    
    if (!editorState.responseBodyMonacoEditor && window.monaco) {
        editorState.responseBodyMonacoEditor = monaco.editor.create(elements.responseBodyEditor, {
            value: '// Response body will appear here',
            language: 'json',
            theme: 'vs-dark',
            readOnly: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            folding: true
        });
    }
}

/**
 * Format and display response body
 * @param {any} body
 */
export function formatAndDisplayBody(body) {
    const format = elements.bodyFormatSelect?.value || 'auto';
    
    let displayText = '';
    let language = 'json';
    
    if (body === undefined || body === null) {
        displayText = '// No response body';
    } else if (format === 'auto') {
        if (typeof body === 'object') {
            displayText = JSON.stringify(body, null, 2);
        } else if (typeof body === 'string') {
            try {
                const parsed = JSON.parse(body);
                displayText = JSON.stringify(parsed, null, 2);
            } catch {
                displayText = body;
                language = 'text';
            }
        } else {
            displayText = String(body);
            language = 'text';
        }
    } else if (format === 'json') {
        try {
            const parsed = typeof body === 'object' ? body : JSON.parse(body);
            displayText = JSON.stringify(parsed, null, 2);
        } catch {
            displayText = String(body);
        }
    } else {
        displayText = typeof body === 'object' ? JSON.stringify(body, null, 2) : String(body);
        language = format === 'xml' ? 'xml' : 'text';
    }
    
    // Try to initialize Monaco if not yet initialized
    if (!editorState.responseBodyMonacoEditor && window.monaco) {
        initResponseBodyEditor();
    }
    
    if (editorState.responseBodyMonacoEditor) {
        monaco.editor.setModelLanguage(editorState.responseBodyMonacoEditor.getModel(), language);
        editorState.responseBodyMonacoEditor.setValue(displayText);
    } else {
        console.warn('[formatAndDisplayBody] Monaco editor not available, body cannot be displayed');
        // Fallback: try to display in a plain text element if Monaco is not available
        if (elements.responseBodyEditor) {
            elements.responseBodyEditor.textContent = displayText;
        }
    }
}

/**
 * Populate test results
 * @param {Array} assertions
 */
export function populateTestResults(assertions) {
    if (!elements.testSummary || !elements.testList) return;
    
    const passed = assertions.filter(a => a.passed).length;
    const failed = assertions.filter(a => !a.passed).length;
    
    elements.testSummary.innerHTML = `
        <div class="test-summary-item passed">✓ ${passed} passed</div>
        <div class="test-summary-item failed">✗ ${failed} failed</div>
    `;
    
    if (assertions.length === 0) {
        elements.testList.innerHTML = '<div class="test-item"><span class="test-content">No tests defined</span></div>';
        return;
    }
    
    elements.testList.innerHTML = assertions.map(test => `
        <div class="test-item ${test.passed ? 'passed' : 'failed'}">
            <span class="test-icon ${test.passed ? 'passed' : 'failed'}">${test.passed ? '✓' : '✗'}</span>
            <div class="test-content">
                <div class="test-name">${escapeHtml(test.name)}</div>
                ${test.message ? `<div class="test-message">${escapeHtml(test.message)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

/**
 * Close modal
 */
export function closeModal() {
    if (elements.responseModal) {
        elements.responseModal.classList.add('hidden');
    }
    state.selectedResultIndex = -1;
}

// ============================================
// Export Functions
// ============================================

/**
 * Export JSON report
 */
export function exportJsonReport() {
    // Expand compact results to readable format for export
    const expandedResults = state.results.map(r => expandSummary(r));
    
    vscode.postMessage({
        type: 'exportReport',
        format: 'json',
        data: {
            suite: state.suite,
            results: expandedResults,
            statistics: state.statistics
        }
    });
}

/**
 * Export HTML report
 */
export function exportHtmlReport() {
    if (!state.reportPath) {
        // No report generated yet (run hasn't completed or failed before finalization)
        vscode.postMessage({ type: 'exportReport', format: 'html', reportPath: null });
        return;
    }
    vscode.postMessage({
        type: 'exportReport',
        format: 'html',
        reportPath: state.reportPath
    });
}

/**
 * Export statistics report
 */
export function exportStatisticsReport() {
    vscode.postMessage({
        type: 'exportReport',
        format: 'statistics',
        data: {
            suite: state.suite,
            statistics: state.statistics
        }
    });
}

// ============================================
// Panel Resizer
// ============================================

/**
 * Initialize panel resizer
 */
export function initPanelResizer() {
    if (!elements.panelResizer) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    const leftPanel = document.querySelector('.runner-left-panel');
    const main = document.querySelector('.runner-main');
    const PANEL_RESIZER_WIDTH = 4;
    const LEFT_PANEL_MIN = 200;
    const RIGHT_PANEL_MIN = 200;

    const getMaxLeftWidth = () => {
        const containerWidth = main?.clientWidth || 0;
        return Math.max(LEFT_PANEL_MIN, containerWidth - RIGHT_PANEL_MIN - PANEL_RESIZER_WIDTH);
    };

    const applyLeftWidth = (requestedWidth) => {
        const maxLeft = getMaxLeftWidth();
        const leftWidth = Math.max(LEFT_PANEL_MIN, Math.min(maxLeft, requestedWidth));
        main.style.gridTemplateColumns = `${leftWidth}px ${PANEL_RESIZER_WIDTH}px 1fr`;
    };
    
    elements.panelResizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = leftPanel.offsetWidth;
        elements.panelResizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const delta = e.clientX - startX;
        applyLeftWidth(startWidth + delta);
    });

    window.addEventListener('resize', () => {
        const currentLeft = leftPanel?.offsetWidth || LEFT_PANEL_MIN;
        applyLeftWidth(currentLeft);
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            elements.panelResizer.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

// ============================================
// Virtual Scrolling Functions
// ============================================

/**
 * Initialize virtual scroll for results list
 * Call this once when setting up the results section
 */
export function initVirtualScroll() {
    if (!elements.resultsList) return;

    // Add scroll listener for virtual scrolling
    elements.resultsList.addEventListener('scroll', onResultsScroll);

    // Create the spacer element for virtual scrolling
    let spacer = elements.resultsList.querySelector('.virtual-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.className = 'virtual-spacer';
        spacer.style.position = 'absolute';
        spacer.style.top = '0';
        spacer.style.left = '0';
        spacer.style.width = '1px';
        spacer.style.pointerEvents = 'none';
        elements.resultsList.appendChild(spacer);
    }

    // Create container for visible items
    let itemsContainer = elements.resultsList.querySelector('.virtual-items');
    if (!itemsContainer) {
        itemsContainer = document.createElement('div');
        itemsContainer.className = 'virtual-items';
        elements.resultsList.appendChild(itemsContainer);
    }
}

/**
 * Handle scroll event for virtual scrolling
 */
export function onResultsScroll() {
    if (!elements.resultsList) return;

    // Disable auto-scroll when user manually scrolls
    const scrollTop = elements.resultsList.scrollTop;
    const totalHeight = state.displayItems.length * VIRTUAL_SCROLL.itemHeight;
    const containerHeight = elements.resultsList.clientHeight || 400;
    const isAtBottom = scrollTop + containerHeight >= totalHeight - 50;

    // Only disable auto-scroll if user scrolled up (not at bottom)
    if (!isAtBottom && state.isRunning) {
        state.autoScroll = false;
    }

    // Re-enable auto-scroll if user scrolls to bottom during run
    if (isAtBottom && state.isRunning) {
        state.autoScroll = true;
    }

    virtualScrollState.scrollTop = scrollTop;
    renderVirtualResults();
}

/**
 * Render only visible results using virtual scrolling
 * This keeps DOM size constant regardless of total results count
 */
export function renderVirtualResults() {
    if (!elements.resultsList) return;

    const totalItems = state.displayItems.length;
    if (totalItems === 0) {
        const itemsContainer = elements.resultsList.querySelector('.virtual-items');
        if (itemsContainer) itemsContainer.innerHTML = '';
        return;
    }

    const scrollTop = elements.resultsList.scrollTop;
    const containerHeight = elements.resultsList.clientHeight || 400;
    const itemHeight = VIRTUAL_SCROLL.itemHeight;
    const buffer = VIRTUAL_SCROLL.bufferSize;

    // Calculate visible range with buffer
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + buffer * 2;
    const endIndex = Math.min(totalItems, startIndex + visibleCount);
    
    // Update spacer to create scrollable area
    const spacer = elements.resultsList.querySelector('.virtual-spacer');
    if (spacer) {
        spacer.style.height = `${totalItems * itemHeight}px`;
    }

    // Get or create items container
    let itemsContainer = elements.resultsList.querySelector('.virtual-items');
    if (!itemsContainer) {
        itemsContainer = document.createElement('div');
        itemsContainer.className = 'virtual-items';
        elements.resultsList.appendChild(itemsContainer);
    }

    // Position the items container
    itemsContainer.style.position = 'absolute';
    itemsContainer.style.top = `${startIndex * itemHeight}px`;
    itemsContainer.style.left = '0';
    itemsContainer.style.right = '0';

    // Only re-render if visible range changed
    if (startIndex === virtualScrollState.startIndex &&
        endIndex === virtualScrollState.endIndex &&
        itemsContainer.children.length === endIndex - startIndex) {
        return;
    }

    virtualScrollState.startIndex = startIndex;
    virtualScrollState.endIndex = endIndex;

    // Render visible items
    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const di = state.displayItems[i];
        if (di) {
            fragment.appendChild(createDisplayRowElement(di));
        }
    }

    itemsContainer.innerHTML = '';
    itemsContainer.appendChild(fragment);
}

/**
 * Build a combined group header label like "01 - Auth/Login" or
 * "01 - My Block" depending on the grouping source. Mirrors the HTML
 * report's groupLabel(): strips a leading "NN - " numeric prefix from each
 * folder segment to avoid double numbering.
 * @param {string} fp - folder path (slash-separated)
 * @param {'folder'|'block'|undefined} gt - grouping source
 * @param {number} index - 1-based group index within the iteration
 * @returns {string}
 */
export function groupLabel(fp, gt, index) {
    const num = String(index).padStart(2, '0');
    let label = '';
    if (gt === 'block') {
        label = fp || '(unnamed block)';
    } else if (fp) {
        const folders = fp.split('/')
            .map(p => p.replace(/^\s*\d+\s*-\s*/, ''))
            .join('/');
        label = folders;
    }
    if (!label) label = '(root)';
    return `${num} - ${label}`;
}

/**
 * Resolve collection name + folder path for a result directly from result payload.
 * @param {Object} expanded - expanded result summary
 * @returns {{cn: string, fp: string}}
 */
export function resolveGroupKeyParts(expanded) {
    return {
        cn: expanded.collectionName || '',
        fp: expanded.groupPath || expanded.folderPath || '',
        gt: expanded.groupType || 'folder'
    };
}

/**
 * Build the flat display list (iteration headers, collection+folder group
 * headers, and result rows) from state.results. Stored in state.displayItems.
 * Grouping follows execution order, matching the HTML report.
 */
export function buildDisplayItems() {
    const items = [];
    const expandedList = state.results.map(expandSummary);

    const multiIter = true;

    let lastIter = null;
    let lastKey = null;
    let groupIndex = 0;
    let currentGroupKey = null;
    let currentCollapsed = false;
    let currentIterationCollapsed = false;

    for (let i = 0; i < expandedList.length; i++) {
        const e = expandedList[i];
        const { cn, fp, gt } = resolveGroupKeyParts(e);

        if (multiIter && e.iteration !== lastIter) {
            currentIterationCollapsed = state.collapsedIterations.has(e.iteration);
            items.push({ type: 'iter', iteration: e.iteration });
            lastIter = e.iteration;
            lastKey = null;
            groupIndex = 0;

            if (currentIterationCollapsed) {
                continue;
            }
        }

        if (currentIterationCollapsed) {
            continue;
        }

        const key = `${gt}\u0000${fp}`;
        if (key !== lastKey) {
            groupIndex++;
            // Group key is scoped to the iteration so the same collection+folder
            // collapses independently across iterations.
            currentGroupKey = `${e.iteration}\u0000${key}`;
            currentCollapsed = state.collapsedGroups.has(currentGroupKey);
            items.push({
                type: 'group',
                label: groupLabel(fp, gt, groupIndex),
                groupType: gt,
                groupKey: currentGroupKey,
                collapsed: currentCollapsed
            });
            lastKey = key;
        }

        // Skip result rows that belong to a collapsed group.
        if (!currentCollapsed) {
            items.push({ type: 'result', resultIndex: i, expanded: e });
        }
    }

    state.displayItems = items;
}

/**
 * Create an iteration header row element.
 * @param {number} iteration
 * @returns {HTMLElement}
 */
export function createIterHeaderElement(iteration) {
    const collapsed = state.collapsedIterations.has(iteration);
    const el = document.createElement('div');
    el.className = `result-iter-header${collapsed ? ' collapsed' : ''}`;
    el.style.height = `${VIRTUAL_SCROLL.itemHeight}px`;
    el.style.boxSizing = 'border-box';
    el.title = collapsed ? 'Click to expand' : 'Click to collapse';
    el.innerHTML = `
        <span class="iter-header-toggle">${collapsed ? '\u25B8' : '\u25BE'}</span>
        <span class="iter-header-label">Iteration ${iteration}</span>
    `;
    el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleIterationCollapse(iteration);
    });
    return el;
}

/**
 * Toggle collapsed state of one iteration section.
 * @param {number} iteration
 */
export function toggleIterationCollapse(iteration) {
    if (state.collapsedIterations.has(iteration)) {
        state.collapsedIterations.delete(iteration);
    } else {
        state.collapsedIterations.add(iteration);
    }

    buildDisplayItems();

    const spacer = elements.resultsList?.querySelector('.virtual-spacer');
    if (spacer) {
        spacer.style.height = `${state.displayItems.length * VIRTUAL_SCROLL.itemHeight}px`;
    }

    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    renderVirtualResults();
}

/**
 * Create a collection+folder group header row element.
 * @param {string} label
 * @param {'folder'|'block'|undefined} [groupType]
 * @param {string} [groupKey] - stable key used to toggle collapse
 * @param {boolean} [collapsed] - whether the group is currently collapsed
 * @returns {HTMLElement}
 */
export function createGroupHeaderElement(label, groupType, groupKey, collapsed) {
    const el = document.createElement('div');
    el.className = `result-group-header${collapsed ? ' collapsed' : ''}`;
    el.style.height = `${VIRTUAL_SCROLL.itemHeight}px`;
    el.style.boxSizing = 'border-box';
    el.title = collapsed ? 'Click to expand' : 'Click to collapse';
    const icon = groupType === 'block' ? '\uD83E\uDDE9' : '\uD83D\uDCC1';
    el.innerHTML = `<span class="group-header-toggle">${collapsed ? '\u25B8' : '\u25BE'}</span><span class="group-header-icon">${icon}</span><span class="group-header-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
    if (groupKey != null) {
        el.dataset.groupKey = groupKey;
        el.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleGroupCollapse(groupKey);
        });
    }
    return el;
}

/**
 * Toggle the collapsed state of a results group and re-render the list.
 * @param {string} groupKey
 */
export function toggleGroupCollapse(groupKey) {
    if (state.collapsedGroups.has(groupKey)) {
        state.collapsedGroups.delete(groupKey);
    } else {
        state.collapsedGroups.add(groupKey);
    }

    // Rebuild the flat display list (hidden rows are excluded) and force a
    // full virtual-scroll re-render.
    buildDisplayItems();

    const spacer = elements.resultsList?.querySelector('.virtual-spacer');
    if (spacer) {
        spacer.style.height = `${state.displayItems.length * VIRTUAL_SCROLL.itemHeight}px`;
    }

    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    renderVirtualResults();
}

/**
 * Create a DOM element for a display row (header or result).
 * @param {Object} di - display item from state.displayItems
 * @returns {HTMLElement}
 */
export function createDisplayRowElement(di) {
    if (di.type === 'iter') return createIterHeaderElement(di.iteration);
    if (di.type === 'group') return createGroupHeaderElement(di.label, di.groupType, di.groupKey, di.collapsed);
    return createResultItemElement(state.results[di.resultIndex], di.resultIndex, di.expanded);
}

/**
 * Create a result item DOM element
 * @param {Object} compactResult - Compact ResultSummary
 * @param {number} index
 * @param {Object} [preExpanded] - pre-expanded summary (avoids re-expanding)
 * @returns {HTMLElement}
 */
export function createResultItemElement(compactResult, index, preExpanded) {
    // Expand compact summary for display
    const result = preExpanded || expandSummary(compactResult);

    // Rows are grouped under a collection+folder header, so the row itself
    // only needs to show the request name.
    const fullPath = result.name;

    const item = document.createElement('div');
    item.className = `result-item ${result.passed ? 'passed' : 'failed'}`;
    item.dataset.resultIndex = index;
    item.dataset.resultFile = result.resultFile || '';
    item.title = 'Click to view details';
    item.style.height = `${VIRTUAL_SCROLL.itemHeight}px`;
    item.style.boxSizing = 'border-box';

    // Status class for coloring (2xx=success, 3xx=redirect, 4xx/5xx=error)
    const statusClass = result.status >= 200 && result.status < 300 ? 'success' :
                        result.status >= 300 && result.status < 400 ? 'redirect' : 'error';

    item.innerHTML = `
        <span class="result-icon ${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✓' : '✗'}
        </span>
        <span class="result-method ${result.method}">${escapeHtml(result.method || 'GET')}</span>
        <div class="result-details">
            <div class="result-name" title="${escapeHtml(fullPath)}">${escapeHtml(fullPath)}</div>
        </div>
        <span class="result-status ${statusClass}">${result.status || '-'}</span>
        <span class="result-duration">${result.duration}ms</span>
    `;

    // Add click handler for viewing details
    item.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        state.autoScroll = false;
        showResultDetail(index);
    });

    return item;
}

/**
 * Re-render virtual scroll results (used when loading history)
 */
export function renderVirtualScrollResults() {
    if (!elements.resultsList) return;

    // Rebuild grouped display list from the loaded results
    buildDisplayItems();

    // Reset virtual scroll
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;

    // Update spacer height
    const spacer = elements.resultsList.querySelector('.virtual-spacer');
    if (spacer) {
        spacer.style.height = `${state.displayItems.length * VIRTUAL_SCROLL.itemHeight}px`;
    }

    // Remove empty state if present
    const emptyState = elements.resultsList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    // Trigger re-render by dispatching scroll event
    elements.resultsList.scrollTop = 0;
    elements.resultsList.dispatchEvent(new Event('scroll'));
}
