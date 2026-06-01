/**
 * Test Suite Main Module
 * Handles test suite execution, statistics, and UI updates
 */

// VS Code API
const vscode = acquireVsCodeApi();

// Virtual scroll configuration
const VIRTUAL_SCROLL = {
    itemHeight: 45,           // Height of each result item in pixels
    bufferSize: 10            // Extra items to render above/below visible area
};

// Virtual scroll state
let virtualScrollState = {
    startIndex: 0,
    endIndex: 0,
    scrollTop: 0
};

// HTTP Method mapping (matches backend HTTP_METHOD_MAP)
const HTTP_METHOD_REVERSE = {
    0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH',
    5: 'HEAD', 6: 'OPTIONS', 7: 'TRACE', 8: 'CONNECT'
};

/**
 * Sanitize a name for use in filenames.
 * Must match backend sanitizeName() in helpers.ts
 */
function sanitizeName(name) {
    return name
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .substring(0, 100);
}

/**
 * Build result filename from summary components
 * Must match backend formula in result-storage-service.ts
 */
function buildResultFileName(index, iteration, requestId) {
    const indexStr = String(index).padStart(6, '0');
    const iterStr = String(iteration).padStart(4, '0');
    const sanitizedRequestId = sanitizeName(requestId);
    return `result-${indexStr}-iter-${iterStr}-${sanitizedRequestId}.json`;
}

/**
 * Expand compact ResultSummary to full property names
 * Backend sends compact format to save memory, frontend expands for display
 * @param {Object} s - Compact summary with short property names
 * @returns {Object} Expanded summary with readable property names
 */
function expandSummary(s) {
    // Support both compact (new) and expanded (legacy) formats
    if (s.i !== undefined) {
        // Compact format - rebuild filename from components
        const requestId = s.r;
        return {
            index: s.i,
            iteration: s.it,
            name: s.n,
            method: HTTP_METHOD_REVERSE[s.m] || 'GET',
            status: s.s,
            duration: s.d,
            passed: s.p,
            assertionsPassed: s.ap,
            assertionsFailed: s.af,
            requestId: requestId,
            resultFile: buildResultFileName(s.i, s.it, requestId),
            error: s.e
        };
    }
    // Legacy/expanded format - already has readable property names
    return {
        index: s.index ?? 0,
        iteration: s.iteration ?? 1,
        name: s.name || s.requestName || 'Unknown',
        method: s.method || 'GET',
        status: s.status,
        duration: s.duration,
        passed: s.passed,
        assertionsPassed: s.assertionsPassed || 0,
        assertionsFailed: s.assertionsFailed || 0,
        requestId: s.requestId || s.r,
        resultFile: s.resultFile || (s.index !== undefined && s.iteration !== undefined && (s.requestId || s.r)
            ? buildResultFileName(s.index, s.iteration, s.requestId || s.r)
            : null),
        error: s.error || null
    };
}

// State
let state = {
    suite: null,
    requests: [],
    environments: [],
    selectedEnvironment: null,
    dataFile: null,
    isRunning: false,
    results: [],           // Now stores compact ResultSummary objects (not full results)
    statistics: null,
    passed: 0,
    failed: 0,
    skipped: 0,
    selectedResultIndex: -1,
    currentRunId: null,
    suiteId: null,
    autoScroll: true,
    totalRequests: 0,
    iterations: 1,
    isDirty: false,  // Track unsaved changes
    availableRequests: [],  // Available requests for Add modal
    runStartTime: null,      // Track start time for duration calculation
    // History state
    historyRuns: [],         // List of RunHistoryEntry objects
    viewingHistoryRun: null, // runId of loaded history run (null = live/latest)
    historyManifest: null,   // Manifest of loaded history run
    loadingAsLatest: false   // Flag: loading the latest run (suppresses history banner)
};

// Monaco editor instance for response body
let responseBodyMonacoEditor = null;

// DOM Elements - populated in initialize()
let elements = {};

/**
 * Set dirty state and notify extension + update Save button highlight
 * @param {boolean} dirty
 */
function setDirty(dirty) {
    const wasDirty = state.isDirty;
    state.isDirty = dirty;
    
    // Update Save button highlight
    if (elements.saveSuiteBtn) {
        if (dirty) {
            elements.saveSuiteBtn.classList.add('has-changes');
        } else {
            elements.saveSuiteBtn.classList.remove('has-changes');
        }
    }
    
    // Notify extension of dirty state change (with current suite snapshot for save-on-close)
    if (dirty !== wasDirty || dirty) {
        const suiteState = dirty ? buildCurrentSuiteState() : null;
        vscode.postMessage({
            type: 'dirtyStateChanged',
            isDirty: dirty,
            suiteState: suiteState
        });
    }
}

/**
 * Build the current suite state for caching in extension (used for save-on-close)
 */
function buildCurrentSuiteState() {
    if (!state.suite) return null;
    return {
        ...state.suite,
        requests: state.requests.map(r => ({
            slug: r.slug,
            collectionId: r.collectionId,
            requestId: r.requestId || r.id,
            name: r.name,
            method: r.method,
            collectionName: r.collectionName,
            folderPath: r.folderPath || '',
            enabled: r.selected,
            description: r.description || undefined
        })),
        config: elements.iterationsInput ? {
            iterations: parseInt(elements.iterationsInput.value) || 1,
            delay: parseInt(elements.delayInput.value) || 0,
            stopOnError: elements.stopOnErrorCheck.checked,
            readFromSharedSession: elements.readFromSharedSessionCheck?.checked || false,
            writeToSharedSession: elements.writeToSharedSessionCheck?.checked || false
        } : state.suite.config
    };
}

/**
 * Initialize the runner
 */
function initialize() {
    // Populate DOM elements after DOM is ready
    elements = {
        suiteName: document.getElementById('suite-name'),
        suiteDescriptionContainer: document.getElementById('suite-description-container'),
        suiteDescriptionDisplay: document.getElementById('suite-description-display'),
        suiteDescriptionTooltip: document.getElementById('suite-description-tooltip'),
        suiteDescriptionEdit: document.getElementById('suite-description-edit'),
        runBtn: document.getElementById('run-btn'),
        stopBtn: document.getElementById('stop-btn'),
        environmentDisplay: document.getElementById('environment-display'),
        iterationsInput: document.getElementById('iterations-input'),
        delayInput: document.getElementById('delay-input'),
        dataFilePath: document.getElementById('data-file-path'),
        browseDataBtn: document.getElementById('browse-data-btn'),
        clearDataBtn: document.getElementById('clear-data-btn'),
        stopOnErrorCheck: document.getElementById('stop-on-error-check'),
        readFromSharedSessionCheck: document.getElementById('read-from-shared-session-check'),
        writeToSharedSessionCheck: document.getElementById('write-to-shared-session-check'),
        selectAllBtn: document.getElementById('select-all-btn'),
        deselectAllBtn: document.getElementById('deselect-all-btn'),
        addRequestBtn: document.getElementById('add-request-btn'),
        requestList: document.getElementById('request-list'),
        saveSuiteBtn: document.getElementById('save-suite-btn'),
        progressSection: document.getElementById('progress-section'),
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        passedCount: document.getElementById('passed-count'),
        failedCount: document.getElementById('failed-count'),
        skippedCount: document.getElementById('skipped-count'),
        // Real-time summary cards (above tabs)
        resultsSummary: document.getElementById('results-summary'),
        summaryPassed: document.getElementById('summary-passed'),
        summaryFailed: document.getElementById('summary-failed'),
        summarySkipped: document.getElementById('summary-skipped'),
        summaryPassRate: document.getElementById('summary-pass-rate'),
        summaryDuration: document.getElementById('summary-duration'),
        // Tabs
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        // Results
        resultsList: document.getElementById('results-list'),
        exportJsonBtn: document.getElementById('export-json-btn'),
        exportHtmlBtn: document.getElementById('export-html-btn'),
        // Statistics (Response Time table and Error Summary only)
        statsTableBody: document.getElementById('stats-table-body'),
        errorSummary: document.getElementById('error-summary'),
        errorList: document.getElementById('error-list'),
        exportReportBtn: document.getElementById('export-report-btn'),
        // Add Request Modal
        addRequestModal: document.getElementById('add-request-modal'),
        addModalCloseBtn: document.getElementById('add-modal-close-btn'),
        requestSearch: document.getElementById('request-search'),
        availableRequestsList: document.getElementById('available-requests-list'),
        addSelectedBtn: document.getElementById('add-selected-btn'),
        cancelAddBtn: document.getElementById('cancel-add-btn'),
        // Response Detail Modal
        responseModal: document.getElementById('response-modal'),
        modalCloseBtn: document.getElementById('modal-close-btn'),
        modalStatusIcon: document.getElementById('modal-status-icon'),
        modalRequestName: document.getElementById('modal-request-name'),
        modalRequestMeta: document.getElementById('modal-request-meta'),
        modalTabs: document.querySelectorAll('.modal-tab'),
        modalPanels: document.querySelectorAll('.modal-panel'),
        responseBodyEditor: document.getElementById('response-body-editor'),
        responseHeadersTable: document.getElementById('response-headers-table'),
        requestUrl: document.getElementById('request-url'),
        requestMethod: document.getElementById('request-method'),
        requestDuration: document.getElementById('request-duration'),
        requestHeadersTable: document.getElementById('request-headers-table'),
        requestBodyContent: document.getElementById('request-body-content'),
        testSummary: document.getElementById('test-summary'),
        testList: document.getElementById('test-list'),
        bodyFormatSelect: document.getElementById('body-format-select'),
        copyBodyBtn: document.getElementById('copy-body-btn'),
        // Panel resizer
        panelResizer: document.getElementById('panel-resizer'),
        // History
        historyList: document.getElementById('history-list'),
        refreshHistoryBtn: document.getElementById('refresh-history-btn'),
        historyBanner: document.getElementById('history-banner'),
        historyBannerText: document.getElementById('history-banner-text'),
        backToLatestBtn: document.getElementById('back-to-latest-btn')
    };

    // Initialize Monaco editor for response body
    initResponseBodyEditor();
    
    // Initialize panel resizer
    initPanelResizer();

    // Initialize virtual scrolling for results list
    initVirtualScroll();

    setupEventListeners();
    
    // Request initial data from extension
    vscode.postMessage({ type: 'ready' });
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Run/Stop buttons
    elements.runBtn?.addEventListener('click', startRun);
    elements.stopBtn?.addEventListener('click', stopRun);

    // Selection buttons
    elements.selectAllBtn?.addEventListener('click', selectAllRequests);
    elements.deselectAllBtn?.addEventListener('click', deselectAllRequests);
    elements.addRequestBtn?.addEventListener('click', openAddRequestModal);

    // Save button
    elements.saveSuiteBtn?.addEventListener('click', saveSuite);

    // Suite name editing
    elements.suiteName?.addEventListener('input', () => {
        if (state.suite) {
            state.suite.name = elements.suiteName.value;
            setDirty(true);
        }
    });

    // Suite description interaction
    setupDescriptionInteraction(
        elements.suiteDescriptionDisplay,
        elements.suiteDescriptionTooltip,
        elements.suiteDescriptionEdit,
        () => state.suite?.description || '',
        (value) => { if (state.suite) { state.suite.description = value; setDirty(true); } }
    );

    // Data file buttons
    elements.browseDataBtn?.addEventListener('click', browseDataFile);
    elements.clearDataBtn?.addEventListener('click', clearDataFile);

    // Export buttons
    elements.exportJsonBtn?.addEventListener('click', exportJsonReport);
    elements.exportHtmlBtn?.addEventListener('click', exportHtmlReport);
    elements.exportReportBtn?.addEventListener('click', exportStatisticsReport);

    // Tab switching
    elements.tabBtns?.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            elements.tabBtns.forEach(t => t.classList.remove('active'));
            elements.tabContents?.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        });
    });

    // Add Request Modal events
    elements.addModalCloseBtn?.addEventListener('click', closeAddRequestModal);
    elements.cancelAddBtn?.addEventListener('click', closeAddRequestModal);
    elements.addSelectedBtn?.addEventListener('click', addSelectedRequests);
    elements.requestSearch?.addEventListener('input', filterAvailableRequests);
    elements.addRequestModal?.addEventListener('click', (e) => {
        if (e.target === elements.addRequestModal) closeAddRequestModal();
    });

    // Response Detail Modal events
    elements.modalCloseBtn?.addEventListener('click', closeModal);
    elements.responseModal?.addEventListener('click', (e) => {
        if (e.target === elements.responseModal) closeModal();
    });
    
    // Modal tab switching
    elements.modalTabs?.forEach(tab => {
        tab.addEventListener('click', () => {
            const panelId = tab.dataset.panel;
            elements.modalTabs.forEach(t => t.classList.remove('active'));
            elements.modalPanels?.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(panelId)?.classList.add('active');
        });
    });
    
    // Copy body button
    elements.copyBodyBtn?.addEventListener('click', () => {
        const content = responseBodyMonacoEditor ? responseBodyMonacoEditor.getValue() : '';
        navigator.clipboard.writeText(content).then(() => {
            elements.copyBodyBtn.textContent = 'Copied!';
            setTimeout(() => elements.copyBodyBtn.textContent = 'Copy', 2000);
        });
    });
    
    // Body format select
    elements.bodyFormatSelect?.addEventListener('change', () => {
        if (state.selectedResultIndex >= 0) {
            const result = state.results[state.selectedResultIndex];
            if (result) formatAndDisplayBody(result.responseBody);
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!elements.responseModal?.classList.contains('hidden')) {
                closeModal();
            } else if (!elements.addRequestModal?.classList.contains('hidden')) {
                closeAddRequestModal();
            }
        }
    });

    // History tab events
    elements.refreshHistoryBtn?.addEventListener('click', requestRunHistory);
    elements.backToLatestBtn?.addEventListener('click', clearHistoryView);

    // Auto-fetch history when History tab is activated
    elements.tabBtns?.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.tab === 'history-tab') {
                requestRunHistory();
            }
        });
    });

    // Listen for messages from extension
    window.addEventListener('message', handleMessage);
}

/**
 * Handle messages from extension
 * @param {MessageEvent} event
 */
function handleMessage(event) {
    const message = event.data;

    switch (message.type) {
        case 'setSuite':
            setSuite(message.suite, message.requests);
            break;
        case 'setEnvironments':
            setEnvironments(message.environments);
            break;
        case 'setAvailableRequests':
            setAvailableRequests(message.requests);
            break;
        case 'setDataFile':
            setDataFile(message.filePath, message.content);
            break;
        case 'runStarted':
            handleRunStarted(message.runId, message.suiteId);
            break;
        case 'runProgress':
            handleRunProgress(message.current, message.total, message.currentIteration, message.totalIterations);
            break;
        case 'requestResult':
            handleRequestResult(message.result);
            break;
        case 'statisticsUpdate':
            handleStatisticsUpdate(message.statistics);
            break;
        case 'runComplete':
            handleRunComplete(message.summary);
            break;
        case 'runStopped':
            handleRunStopped();
            break;
        case 'resultDetails':
            handleResultDetails(message.details);
            break;
        case 'resultDetailsError':
            handleResultDetailsError(message.error);
            break;
        case 'suiteSaved':
            handleSuiteSaved(message.suite);
            break;
        case 'saveSuiteResult':
            handleSaveSuiteResult(message.success, message.suiteId, message.error);
            break;
        case 'runHistory':
            handleRunHistory(message.runs);
            break;
        case 'historyRunLoaded':
            handleHistoryRunLoaded(message.manifest, message.summaries);
            break;
        case 'historyRunDeleted':
            handleHistoryRunDeleted(message.runId);
            break;
        case 'error':
            console.error('[TestSuite] Error:', message.error || message.message);
            break;
    }
}

/**
 * Set the suite to run
 * @param {Object} suite - TestSuite object
 * @param {Array} requests - Resolved requests with full data
 */
function setSuite(suite, requests) {
    // Reset run-related state when switching suites
    state.results = [];
    state.statistics = null;
    state.currentRunId = null;
    state.isRunning = false;
    state.passed = 0;
    state.failed = 0;
    state.skipped = 0;
    
    // Reset virtual scroll state
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;
    
    state.suite = suite;
    state.suiteId = suite.id;
    state.requests = requests.map((req, index) => ({
        ...req,
        selected: suite.requests[index]?.enabled !== false,
        description: suite.requests[index]?.description || '',
        status: 'pending'
    }));
    setDirty(false);
    
    // Set suite name in editable input
    elements.suiteName.value = suite.name;
    elements.runBtn.disabled = state.requests.length === 0;
    
    // Update suite description display
    updateSuiteDescriptionDisplay();
    
    // Apply suite config to UI
    if (suite.config) {
        elements.iterationsInput.value = suite.config.iterations || 1;
        elements.delayInput.value = suite.config.delay || 0;
        elements.stopOnErrorCheck.checked = suite.config.stopOnError || false;
        if (elements.readFromSharedSessionCheck) {
            elements.readFromSharedSessionCheck.checked = suite.config.readFromSharedSession || false;
        }
        if (elements.writeToSharedSessionCheck) {
            elements.writeToSharedSessionCheck.checked = suite.config.writeToSharedSession || false;
        }
    } else {
        // Reset to defaults if no config
        elements.iterationsInput.value = 1;
        elements.delayInput.value = 0;
        elements.stopOnErrorCheck.checked = false;
        if (elements.readFromSharedSessionCheck) {
            elements.readFromSharedSessionCheck.checked = false;
        }
        if (elements.writeToSharedSessionCheck) {
            elements.writeToSharedSessionCheck.checked = false;
        }
    }
    
    // Reset UI elements for previous run data
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.progressSection.style.display = 'none';
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '';
    
    // Clear results list and show empty state
    const itemsContainer = elements.resultsList?.querySelector('.virtual-items');
    if (itemsContainer) itemsContainer.innerHTML = '';
    const spacer = elements.resultsList?.querySelector('.virtual-spacer');
    if (spacer) spacer.style.height = '0px';
    const emptyState = elements.resultsList?.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = '';
    
    // Reset summary cards
    if (elements.summaryPassed) elements.summaryPassed.textContent = '0';
    if (elements.summaryFailed) elements.summaryFailed.textContent = '0';
    if (elements.summarySkipped) elements.summarySkipped.textContent = '0';
    if (elements.summaryTotal) elements.summaryTotal.textContent = '0';
    
    // Clear statistics display
    renderStatistics();
    
    renderRequestList();
}

/**
 * Set available environments
 * @param {Array} environments
 */
function setEnvironments(environments) {
    state.environments = environments;
    
    // Find the active environment
    const activeEnv = environments.find(env => env.active);
    state.selectedEnvironment = activeEnv?.id || null;
    
    // Update display
    if (elements.environmentDisplay) {
        elements.environmentDisplay.textContent = activeEnv?.name || 'No Environment';
        elements.environmentDisplay.className = 'environment-badge' + (activeEnv ? ' active' : '');
    }
}

/**
 * Set available requests for Add modal
 * @param {Array} requests - All available requests from all collections
 */
function setAvailableRequests(requests) {
    state.availableRequests = requests;
    renderAvailableRequestsList();
}

/**
 * Set data file
 * @param {string} filePath
 * @param {string} content
 */
function setDataFile(filePath, content) {
    state.dataFile = { path: filePath, content };
    elements.dataFilePath.value = filePath;
    elements.clearDataBtn.disabled = false;
}

/**
 * Close all open action menus
 */
function closeAllMenus() {
    document.querySelectorAll('.menu-dropdown.open').forEach(m => m.classList.remove('open'));
}

// Close menus when clicking outside
document.addEventListener('click', () => closeAllMenus());

/**
 * Render the request list with delete buttons
 */
function renderRequestList() {
    if (state.requests.length === 0) {
        elements.requestList.innerHTML = `
            <div class="empty-state">
                <p>No requests in suite</p>
                <p class="hint">Click "+ Add" to add requests</p>
            </div>
        `;
        return;
    }

    elements.requestList.innerHTML = state.requests.map((item, index) => {
        // Build full path: Collection › Folder › Request
        const pathParts = [];
        if (item.collectionName) pathParts.push(item.collectionName);
        if (item.folderPath) pathParts.push(item.folderPath);
        const fullPath = pathParts.length > 0 ? 
            `<span class="collection-path">${escapeHtml(pathParts.join(' › '))}</span>` : '';
        
        const modifiedDot = item.hasEmbeddedRequest ? '<span class="modified-dot" title="Customized (differs from collection)"></span>' : '';
        const resetMenuItem = item.hasEmbeddedRequest && item.slug
            ? `<button class="menu-item reset-btn" data-slug="${item.slug}">↺ Reset to Collection</button>`
            : '';

        const descText = item.description ? escapeHtml(item.description.replace(/\n/g, ' ')) : 'Click to add description\u2026';
        const descClass = item.description ? 'description-display' : 'description-display placeholder';

        return `
            <div class="request-item" data-index="${index}" draggable="true" title="Drag to reorder">
                <input type="checkbox" ${item.selected ? 'checked' : ''} data-index="${index}" class="request-checkbox">
                <span class="request-method ${item.method}">${item.method}</span>
                <span class="request-path">
                    ${fullPath}
                    <span class="request-name-row">
                        <span class="request-name">${escapeHtml(item.name)}</span>
                        ${modifiedDot}
                    </span>
                </span>
                <div class="request-actions-menu">
                    <button class="menu-trigger" title="Actions">⋯</button>
                    <div class="menu-dropdown">
                        <button class="menu-item edit-btn" data-slug="${item.slug || ''}" data-index="${index}">✎ Edit</button>
                        <button class="menu-item open-original-btn" data-slug="${item.slug || ''}">↗ Open Original</button>
                        ${resetMenuItem}
                        <button class="menu-item delete-btn danger" data-index="${index}">× Remove</button>
                    </div>
                </div>
                <div class="request-description" data-index="${index}">
                    <span class="${descClass}" data-index="${index}">${descText}</span>
                    <div class="description-tooltip"></div>
                    <textarea class="description-edit hidden" data-index="${index}" placeholder="Describe what this request does\u2026"></textarea>
                </div>
            </div>
        `;
    }).join('');

    // Add checkbox change handlers
    elements.requestList.querySelectorAll('.request-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            state.requests[index].selected = e.target.checked;
            setDirty(true);
            updateRunButton();
        });
    });

    // Add delete button handlers
    elements.requestList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.closest('.request-item').dataset.index);
            closeAllMenus();
            removeRequest(index);
        });
    });

    // Add edit button handlers
    elements.requestList.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slug = btn.dataset.slug;
            closeAllMenus();
            if (slug) {
                vscode.postMessage({ command: 'editSuiteRequest', slug });
            }
        });
    });

    // Add open-original button handlers
    elements.requestList.querySelectorAll('.open-original-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slug = btn.dataset.slug;
            closeAllMenus();
            if (slug) {
                vscode.postMessage({ command: 'openOriginalRequest', slug });
            }
        });
    });

    // Add reset button handlers
    elements.requestList.querySelectorAll('.reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const slug = btn.dataset.slug;
            closeAllMenus();
            if (slug && confirm('Reset to collection version? Your suite customizations will be lost.')) {
                vscode.postMessage({ command: 'resetSuiteRequest', slug });
            }
        });
    });

    // Add menu trigger handlers
    elements.requestList.querySelectorAll('.menu-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = trigger.nextElementSibling;
            const wasOpen = menu.classList.contains('open');
            closeAllMenus();
            if (!wasOpen) {
                menu.classList.add('open');
            }
        });
    });

    // Add drag and drop handlers
    setupDragAndDrop();

    // Add per-request description interaction handlers
    elements.requestList.querySelectorAll('.request-description').forEach(container => {
        const index = parseInt(container.dataset.index);
        const displayEl = container.querySelector('.description-display');
        const tooltipEl = container.querySelector('.description-tooltip');
        const editEl = container.querySelector('.description-edit');
        setupDescriptionInteraction(
            displayEl, tooltipEl, editEl,
            () => state.requests[index]?.description || '',
            (value) => { if (state.requests[index]) { state.requests[index].description = value; setDirty(true); } }
        );
    });
}

/**
 * Set up drag and drop for request reordering
 */
function setupDragAndDrop() {
    let draggedIndex = null;

    elements.requestList.querySelectorAll('.request-item').forEach((item, index) => {
        item.addEventListener('dragstart', (e) => {
            draggedIndex = index;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            elements.requestList.querySelectorAll('.request-item').forEach(el => {
                el.classList.remove('drag-over');
            });
            draggedIndex = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (draggedIndex !== null && draggedIndex !== index) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            
            if (draggedIndex !== null && draggedIndex !== index) {
                const [removed] = state.requests.splice(draggedIndex, 1);
                state.requests.splice(index, 0, removed);
                setDirty(true);
                renderRequestList();
            }
        });
    });
}

/**
 * Remove a request from the suite
 * @param {number} index
 */
function removeRequest(index) {
    const removed = state.requests.splice(index, 1)[0];
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Update run button state
 */
function updateRunButton() {
    const selectedCount = state.requests.filter(r => r.selected).length;
    elements.runBtn.disabled = selectedCount === 0 || state.isRunning;
}

/**
 * Select all requests
 */
function selectAllRequests() {
    state.requests.forEach(r => r.selected = true);
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Deselect all requests
 */
function deselectAllRequests() {
    state.requests.forEach(r => r.selected = false);
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Browse for data file
 */
function browseDataFile() {
    vscode.postMessage({ type: 'browseDataFile' });
}

/**
 * Clear data file
 */
function clearDataFile() {
    state.dataFile = null;
    elements.dataFilePath.value = '';
    elements.clearDataBtn.disabled = true;
}

/**
 * Start the test suite run
 */
async function startRun() {
    state.isRunning = true;
    state.results = [];
    state.statistics = null;
    state.passed = 0;
    state.failed = 0;
    state.skipped = 0;
    state.currentRunId = null;
    state.autoScroll = true;
    state.runStartTime = Date.now();  // Track start time for duration

    // Reset virtual scroll state
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;

    // Calculate total requests
    const iterations = parseInt(elements.iterationsInput.value) || 1;
    const selectedRequests = state.requests.filter(r => r.selected);
    state.iterations = iterations;
    state.totalRequests = iterations * selectedRequests.length;

    // Update UI
    elements.runBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressSection.style.display = 'block';
    
    // Hide empty state when run starts
    const emptyState = elements.resultsList?.querySelector('.empty-state');
    if (emptyState) emptyState.style.display = 'none';
    
    // Clear previous results and reset virtual scroll containers
    const itemsContainer = elements.resultsList?.querySelector('.virtual-items');
    if (itemsContainer) itemsContainer.innerHTML = '';
    const spacer = elements.resultsList?.querySelector('.virtual-spacer');
    if (spacer) spacer.style.height = '0px';
    if (elements.resultsList) elements.resultsList.scrollTop = 0;
    
    resetStatistics();

    // Reset request statuses
    state.requests.forEach(r => {
        r.status = r.selected ? 'pending' : 'skipped';
        if (!r.selected) state.skipped++;
    });
    renderRequestList();
    updateProgress();

    // Get configuration
    const config = {
        iterations: iterations,
        delay: parseInt(elements.delayInput.value) || 0,
        environmentId: state.selectedEnvironment,
        stopOnError: elements.stopOnErrorCheck.checked,
        readFromSharedSession: elements.readFromSharedSessionCheck.checked,
        writeToSharedSession: elements.writeToSharedSessionCheck.checked,
        dataFile: state.dataFile
    };

    // Get selected request indices in current order
    const selectedIndices = state.requests
        .map((r, i) => r.selected ? i : -1)
        .filter(i => i >= 0);

    vscode.postMessage({
        type: 'startRun',
        selectedIndices,
        config
    });
}

/**
 * Stop the test suite run
 */
function stopRun() {
    state.isRunning = false;
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    
    vscode.postMessage({ type: 'stopRun' });
}

/**
 * Handle run started
 * @param {string} runId
 * @param {string} suiteId
 */
function handleRunStarted(runId, suiteId) {
    state.currentRunId = runId;
    state.suiteId = suiteId;
    state.autoScroll = true;

    // Clear history view if active
    if (state.viewingHistoryRun) {
        state.viewingHistoryRun = null;
        state.historyManifest = null;
        if (elements.historyBanner) {
            elements.historyBanner.classList.add('hidden');
        }
    }
}

/**
 * Handle run progress update
 * @param {number} current
 * @param {number} total
 * @param {number} currentIteration
 * @param {number} totalIterations
 */
function handleRunProgress(current, total, currentIteration, totalIterations) {
    elements.progressText.textContent = `${current} / ${total} (Iteration ${currentIteration}/${totalIterations})`;
    const percent = total > 0 ? (current / total) * 100 : 0;
    elements.progressBar.style.width = `${percent}%`;
}

/**
 * Handle a request result (summary)
 * @param {Object} result - ResultSummary from extension (compact or expanded format)
 */
function handleRequestResult(result) {
    // Store compact/summary format directly (saves memory)
    state.results.push(result);
    
    // Expand for processing
    const expanded = expandSummary(result);
    
    // Update passed/failed counts
    if (expanded.passed) {
        state.passed++;
    } else {
        state.failed++;
    }
    
    updateProgress();
    
    // Update virtual scroll (only re-render visible items)
    renderVirtualResults();

    // Auto-scroll to bottom if enabled
    if (state.autoScroll && elements.resultsList) {
        const totalHeight = state.results.length * VIRTUAL_SCROLL.itemHeight;
        const containerHeight = elements.resultsList.clientHeight || 400;
        elements.resultsList.scrollTop = totalHeight - containerHeight;
    }
}

/**
 * Handle statistics update (real-time during run)
 * @param {Object} statistics
 */
function handleStatisticsUpdate(statistics) {
    state.statistics = statistics;
    renderStatistics();
}

/**
 * Update progress display with real-time stats
 */
function updateProgress() {
    const total = state.totalRequests || state.requests.filter(r => r.selected).length;
    const completed = state.passed + state.failed;
    const percent = total > 0 ? (completed / total) * 100 : 0;
    
    elements.progressBar.style.width = `${percent}%`;
    elements.progressText.textContent = `${completed} / ${total}`;
    elements.passedCount.textContent = state.passed;
    elements.failedCount.textContent = state.failed;
    elements.skippedCount.textContent = state.skipped;
    
    // Update progress bar color if there are failures
    if (state.failed > 0) {
        const passPercent = (state.passed / completed) * percent;
        elements.progressBar.classList.add('has-failures');
        elements.progressBar.style.setProperty('--pass-percent', `${passPercent}%`);
    }

    // Update stats summary in real-time (both in progress section and Statistics tab)
    updateRealTimeStats();
}

/**
 * Update statistics in real-time during run
 * Updates the summary cards above tabs (in progress section)
 */
function updateRealTimeStats() {
    const total = state.passed + state.failed;
    const passRate = total > 0 ? (state.passed / total) * 100 : 0;
    const duration = state.runStartTime ? (Date.now() - state.runStartTime) / 1000 : 0;
    
    // Update summary cards above tabs (in progress section)
    if (elements.summaryPassed) elements.summaryPassed.textContent = state.passed;
    if (elements.summaryFailed) elements.summaryFailed.textContent = state.failed;
    if (elements.summarySkipped) elements.summarySkipped.textContent = state.skipped;
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = `${passRate.toFixed(1)}%`;
    if (elements.summaryDuration) elements.summaryDuration.textContent = `${duration.toFixed(2)}s`;
}

/**
 * Handle run completion
 * @param {Object} summary - Final run summary
 */
function handleRunComplete(summary) {
    state.isRunning = false;
    state.autoScroll = false;
    
    // Calculate final duration
    const finalDuration = state.runStartTime ? Date.now() - state.runStartTime : 0;
    
    // Update statistics from summary if provided
    if (summary) {
        state.statistics = {
            ...state.statistics,
            passed: summary.passed,
            failed: summary.failed,
            skipped: summary.skipped,
            passRate: summary.passRate,
            duration: finalDuration  // Use calculated duration
        };
    } else {
        // Ensure we have duration even without summary
        state.statistics = {
            ...state.statistics,
            duration: finalDuration
        };
    }
    
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
    
    renderStatistics();
    
    // Refresh history cache so new run appears if user switches to History tab
    if (state.historyRuns.length > 0) {
        requestRunHistory();
    }
}

/**
 * Handle run stopped by user
 */
function handleRunStopped() {
    state.isRunning = false;
    state.autoScroll = false;
    
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
}

/**
 * Handle suite saved
 * @param {Object} suite - The saved suite
 */
function handleSuiteSaved(suite) {
    const saveBtn = elements.saveSuiteBtn;
    
    if (suite) {
        state.suite = suite;
        state.suiteId = suite.id;
        setDirty(false);
        
        // Show success feedback on button
        if (saveBtn) {
            saveBtn.classList.remove('saving');
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '✓ Saved!';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                saveBtn.classList.remove('saved');
                saveBtn.innerHTML = 'Save Suite';
                saveBtn.disabled = false;
            }, 2000);
        }
    } else {
        // Reset button on failure
        if (saveBtn) {
            saveBtn.classList.remove('saving');
            saveBtn.innerHTML = 'Save Suite';
            saveBtn.disabled = false;
        }
    }
}

/**
 * Reset statistics display
 */
function resetStatistics() {
    // Reset summary cards
    if (elements.summaryPassed) elements.summaryPassed.textContent = '0';
    if (elements.summaryFailed) elements.summaryFailed.textContent = '0';
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = '0%';
    if (elements.summaryDuration) elements.summaryDuration.textContent = '0s';
    
    // Reset Statistics tab (Response Time table and Error Summary)
    if (elements.statsTableBody) elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No data yet</td></tr>';
    if (elements.errorSummary) elements.errorSummary.style.display = 'none';
    if (elements.errorList) elements.errorList.innerHTML = '';
}

/**
 * Render statistics from current state (Response Time table and Error Summary)
 */
function renderStatistics() {
    const stats = state.statistics;
    if (!stats) return;
    
    // Response time table - byRequest is an array of RequestStatistics
    if (stats.byRequest && stats.byRequest.length > 0) {
        elements.statsTableBody.innerHTML = stats.byRequest
            .map(reqStats => `
                <tr>
                    <td>${escapeHtml(reqStats.name || 'Unknown')}</td>
                    <td>${reqStats.min}ms</td>
                    <td>${Math.round(reqStats.avg)}ms</td>
                    <td>${reqStats.p95}ms</td>
                    <td>${reqStats.p99}ms</td>
                    <td>${reqStats.max}ms</td>
                </tr>
            `).join('');
    } else {
        elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No data yet</td></tr>';
    }
    
    // Error summary
    if (stats.errors && Object.keys(stats.errors).length > 0) {
        elements.errorSummary.style.display = 'block';
        elements.errorList.innerHTML = Object.entries(stats.errors)
            .map(([errorType, count]) => `
                <div class="error-item">
                    <span class="error-type">${escapeHtml(errorType)}</span>
                    <span class="error-count">${count} occurrence${count > 1 ? 's' : ''}</span>
                </div>
            `).join('');
    } else {
        elements.errorSummary.style.display = 'none';
    }
}

/**
 * Save the test suite
 */
function saveSuite() {
    if (!state.suite) return;
    
    // Show saving state on button
    const saveBtn = elements.saveSuiteBtn;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('saving');
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
    }
    
    // Build updated suite object
    // Include all SuiteRequest fields (name, method, etc.) to preserve display info
    const updatedSuite = {
        ...state.suite,
        requests: state.requests.map(r => ({
            slug: r.slug,
            collectionId: r.collectionId,
            requestId: r.requestId || r.id,
            name: r.name,
            method: r.method,
            collectionName: r.collectionName,
            folderPath: r.folderPath || '',
            enabled: r.selected,
            description: r.description || undefined
        })),
        config: {
            iterations: parseInt(elements.iterationsInput.value) || 1,
            delay: parseInt(elements.delayInput.value) || 0,
            stopOnError: elements.stopOnErrorCheck.checked,
            readFromSharedSession: elements.readFromSharedSessionCheck.checked,
            writeToSharedSession: elements.writeToSharedSessionCheck.checked
        }
    };
    
    vscode.postMessage({
        type: 'saveSuite',
        suite: updatedSuite
    });
}

/**
 * Handle save suite result
 * @param {boolean} success
 * @param {string} suiteId
 * @param {string} error
 */
function handleSaveSuiteResult(success, suiteId, error) {
    const saveBtn = elements.saveSuiteBtn;
    
    if (success) {
        setDirty(false);
        state.suiteId = suiteId;
        
        // Show success feedback on button
        if (saveBtn) {
            saveBtn.classList.remove('saving');
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = '✓ Saved!';
            
            // Reset button after 2 seconds
            setTimeout(() => {
                saveBtn.classList.remove('saved');
                saveBtn.innerHTML = 'Save Suite';
                saveBtn.disabled = false;
            }, 2000);
        }
    } else {
        // Reset button on failure
        if (saveBtn) {
            saveBtn.classList.remove('saving');
            saveBtn.innerHTML = 'Save Suite';
            saveBtn.disabled = false;
        }
    }
}

// ============================================
// Add Request Modal
// ============================================

/**
 * Open Add Request modal
 */
function openAddRequestModal() {
    // Request available requests from extension
    vscode.postMessage({ type: 'getAvailableRequests' });
    
    elements.requestSearch.value = '';
    elements.addRequestModal.classList.remove('hidden');
    elements.requestSearch.focus();
}

/**
 * Close Add Request modal
 */
function closeAddRequestModal() {
    elements.addRequestModal.classList.add('hidden');
    elements.availableRequestsList.innerHTML = '';
}

/**
 * Render available requests list
 */
function renderAvailableRequestsList() {
    const searchTerm = (elements.requestSearch.value || '').toLowerCase();
    
    // Group by collection
    const byCollection = {};
    for (const req of state.availableRequests) {
        if (searchTerm && !req.name.toLowerCase().includes(searchTerm) && 
            !req.collectionName?.toLowerCase().includes(searchTerm)) {
            continue;
        }
        
        const collectionName = req.collectionName || 'Unknown Collection';
        if (!byCollection[collectionName]) {
            byCollection[collectionName] = [];
        }
        byCollection[collectionName].push(req);
    }
    
    if (Object.keys(byCollection).length === 0) {
        elements.availableRequestsList.innerHTML = '<div class="empty-state"><p>No requests found</p></div>';
        return;
    }
    
    elements.availableRequestsList.innerHTML = Object.entries(byCollection)
        .map(([collectionName, requests]) => `
            <div class="collection-group">
                <div class="collection-group-header">${escapeHtml(collectionName)}</div>
                ${requests.map(req => {
                    const folderDisplay = req.folderPath ? 
                        `<span class="available-request-folder">${escapeHtml(req.folderPath)}</span>` : '';
                    return `
                    <div class="available-request-item" data-collection-id="${req.collectionId}" data-request-id="${req.requestId}">
                        <input type="checkbox" class="add-request-checkbox">
                        <span class="request-method ${req.method}">${req.method}</span>
                        <div class="available-request-info">
                            ${folderDisplay}
                            <span class="available-request-name">${escapeHtml(req.name)}</span>
                        </div>
                    </div>
                `}).join('')}
            </div>
        `).join('');
    
    // Add click handlers
    elements.availableRequestsList.querySelectorAll('.available-request-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = item.querySelector('.add-request-checkbox');
                checkbox.checked = !checkbox.checked;
            }
            item.classList.toggle('selected', item.querySelector('.add-request-checkbox').checked);
            updateAddSelectedButton();
        });
    });
    
    updateAddSelectedButton();
}

/**
 * Filter available requests by search term
 */
function filterAvailableRequests() {
    renderAvailableRequestsList();
}

/**
 * Update Add Selected button state
 */
function updateAddSelectedButton() {
    const checkedCount = elements.availableRequestsList.querySelectorAll('.add-request-checkbox:checked').length;
    elements.addSelectedBtn.disabled = checkedCount === 0;
    elements.addSelectedBtn.textContent = checkedCount > 0 ? `Add Selected (${checkedCount})` : 'Add Selected';
}

/**
 * Add selected requests to suite
 */
function addSelectedRequests() {
    const selectedItems = elements.availableRequestsList.querySelectorAll('.available-request-item');
    const toAdd = [];
    
    selectedItems.forEach(item => {
        const checkbox = item.querySelector('.add-request-checkbox');
        if (checkbox.checked) {
            const collectionId = item.dataset.collectionId;
            const requestId = item.dataset.requestId;
            const req = state.availableRequests.find(r => r.requestId === requestId && r.collectionId === collectionId);
            if (req) {
                toAdd.push({
                    ...req,
                    selected: true,
                    status: 'pending'
                });
            }
        }
    });
    
    if (toAdd.length > 0) {
        // Add to local state
        state.requests.push(...toAdd);
        setDirty(true);
        
        // Notify backend to update suite.requests (batch all at once)
        vscode.postMessage({
            type: 'addRequests',
            requests: toAdd.map(req => ({
                collectionId: req.collectionId,
                requestId: req.requestId,
                name: req.name,
                method: req.method,
                collectionName: req.collectionName,
                folderPath: req.folderPath || '',
                enabled: true
            }))
        });
        
        renderRequestList();
        updateRunButton();
    }
    
    closeAddRequestModal();
}

// ============================================
// Response Detail Modal
// ============================================

/**
 * Show result detail modal - requests full details from extension
 * @param {number} index - Index of the result in state.results
 */
function showResultDetail(index) {
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
function showModalWithSummary(result) {
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
    if (responseBodyMonacoEditor) {
        responseBodyMonacoEditor.setValue('Loading...');
    }
    
    elements.responseModal.classList.remove('hidden');
}

/**
 * Handle result details
 * @param {Object} details
 */
function handleResultDetails(details) {
    if (details) {
        populateModalWithDetails(details);
    }
}

/**
 * Handle result details error
 * @param {string} error
 */
function handleResultDetailsError(error) {
    if (responseBodyMonacoEditor) {
        responseBodyMonacoEditor.setValue(`Error loading details: ${error}`);
    }
}

/**
 * Populate modal with full result details
 * @param {Object} result
 */
function populateModalWithDetails(result) {
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
    if (elements.requestMethod) elements.requestMethod.textContent = result.method || '';
    if (elements.requestDuration) elements.requestDuration.textContent = `${result.duration}ms`;
    
    if (elements.requestHeadersTable) {
        elements.requestHeadersTable.innerHTML = Object.entries(requestHeaders)
            .map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(value))}</td></tr>`)
            .join('') || '<tr><td colspan="2">No headers</td></tr>';
    }
    
    if (elements.requestBodyContent) {
        if (requestBody) {
            elements.requestBodyContent.textContent = typeof requestBody === 'object' 
                ? JSON.stringify(requestBody, null, 2) 
                : String(requestBody);
        } else {
            elements.requestBodyContent.textContent = 'No body';
        }
    }
    
    // Test results
    populateTestResults(result.assertions || []);
}

/**
 * Initialize Monaco editor for response body
 */
function initResponseBodyEditor() {
    if (!elements.responseBodyEditor) return;
    
    if (!responseBodyMonacoEditor && window.monaco) {
        responseBodyMonacoEditor = monaco.editor.create(elements.responseBodyEditor, {
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
function formatAndDisplayBody(body) {
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
    if (!responseBodyMonacoEditor && window.monaco) {
        initResponseBodyEditor();
    }
    
    if (responseBodyMonacoEditor) {
        monaco.editor.setModelLanguage(responseBodyMonacoEditor.getModel(), language);
        responseBodyMonacoEditor.setValue(displayText);
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
function populateTestResults(assertions) {
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
function closeModal() {
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
function exportJsonReport() {
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
function exportHtmlReport() {
    // Expand compact results to readable format for export
    const expandedResults = state.results.map(r => expandSummary(r));
    
    vscode.postMessage({
        type: 'exportReport',
        format: 'html',
        data: {
            suite: state.suite,
            results: expandedResults,
            statistics: state.statistics
        }
    });
}

/**
 * Export statistics report
 */
function exportStatisticsReport() {
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
function initPanelResizer() {
    if (!elements.panelResizer) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    const leftPanel = document.querySelector('.runner-left-panel');
    const main = document.querySelector('.runner-main');
    
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
        const newWidth = Math.max(200, Math.min(500, startWidth + delta));
        main.style.gridTemplateColumns = `${newWidth}px 4px 1fr`;
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
// Utility Functions
// ============================================

/**
// ============================================
// Description Interaction Helper
// ============================================

/**
 * Update suite description display text (called on suite load)
 */
function updateSuiteDescriptionDisplay() {
    const display = elements.suiteDescriptionDisplay;
    if (!display) return;
    const value = state.suite?.description || '';
    if (value) {
        display.textContent = value.replace(/\n/g, ' ');
        display.classList.remove('placeholder');
    } else {
        display.textContent = 'Click to add description\u2026';
        display.classList.add('placeholder');
    }
}

/**
 * Set up click-to-edit, hover tooltip for a description element.
 * Reusable for both suite-level and per-request descriptions.
 * @param {HTMLElement} displayEl - The span showing truncated text
 * @param {HTMLElement} tooltipEl - The multi-line tooltip div
 * @param {HTMLElement} editEl - The textarea for editing
 * @param {Function} getValue - Returns current description string
 * @param {Function} setValue - Called with new description string on save
 */
function setupDescriptionInteraction(displayEl, tooltipEl, editEl, getValue, setValue) {
    if (!displayEl || !editEl) return;

    let hoverTimeout = null;

    // Update display text
    function updateDisplay() {
        const value = getValue();
        if (value) {
            displayEl.textContent = value.replace(/\n/g, ' ');
            displayEl.classList.remove('placeholder');
        } else {
            displayEl.textContent = 'Click to add description\u2026';
            displayEl.classList.add('placeholder');
        }
    }

    // Show tooltip on hover (only if has content and not in edit mode)
    displayEl.addEventListener('mouseenter', () => {
        const value = getValue();
        if (!value || !editEl.classList.contains('hidden')) return;
        hoverTimeout = setTimeout(() => {
            if (tooltipEl) {
                tooltipEl.textContent = value;
                tooltipEl.classList.add('visible');
            }
        }, 400);
    });

    displayEl.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        if (tooltipEl) tooltipEl.classList.remove('visible');
    });

    // Click to edit
    displayEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tooltipEl) tooltipEl.classList.remove('visible');
        clearTimeout(hoverTimeout);
        editEl.value = getValue();
        editEl.classList.remove('hidden');
        displayEl.style.visibility = 'hidden';
        editEl.focus();
    });

    // Save on blur
    editEl.addEventListener('blur', () => {
        const newValue = editEl.value.trim();
        setValue(newValue);
        editEl.classList.add('hidden');
        displayEl.style.visibility = '';
        updateDisplay();
    });

    // Ctrl+Enter to save, Escape to cancel
    editEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            editEl.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            editEl.value = getValue(); // revert
            editEl.classList.add('hidden');
            displayEl.style.visibility = '';
        }
    });

    // Prevent click inside textarea from propagating
    editEl.addEventListener('click', (e) => e.stopPropagation());

    // Initial display
    updateDisplay();
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Virtual Scrolling Functions
// ============================================

/**
 * Initialize virtual scroll for results list
 * Call this once when setting up the results section
 */
function initVirtualScroll() {
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
function onResultsScroll() {
    if (!elements.resultsList) return;

    // Disable auto-scroll when user manually scrolls
    const scrollTop = elements.resultsList.scrollTop;
    const totalHeight = state.results.length * VIRTUAL_SCROLL.itemHeight;
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
function renderVirtualResults() {
    if (!elements.resultsList) return;

    const totalItems = state.results.length;
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
        const result = state.results[i];
        if (result) {
            fragment.appendChild(createResultItemElement(result, i));
        }
    }

    itemsContainer.innerHTML = '';
    itemsContainer.appendChild(fragment);
}

/**
 * Create a result item DOM element
 * @param {Object} compactResult - Compact ResultSummary
 * @param {number} index
 * @returns {HTMLElement}
 */
function createResultItemElement(compactResult, index) {
    // Expand compact summary for display
    const result = expandSummary(compactResult);
    
    // Find matching request from state to get collection/folder path
    const matchingRequest = state.requests.find(r => 
        r.requestId === result.requestId || r.id === result.requestId
    );
    
    // Build full path: Collection > Folder > Request Name
    let fullPath = '';
    if (matchingRequest) {
        const parts = [];
        if (matchingRequest.collectionName) parts.push(matchingRequest.collectionName);
        if (matchingRequest.folderPath) parts.push(matchingRequest.folderPath);
        parts.push(result.name);
        fullPath = parts.join(' › ');
    } else {
        fullPath = result.name;
    }

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

// ============================================
// Run History Functions
// ============================================

/**
 * Request run history from extension
 */
function requestRunHistory() {
    vscode.postMessage({ type: 'getRunHistory' });
}

/**
 * Handle run history response
 * @param {Array} runs - RunHistoryEntry[]
 */
function handleRunHistory(runs) {
    state.historyRuns = runs || [];
    renderHistoryList();
}

/**
 * Handle loaded history run
 * @param {Object} manifest - RunManifest
 * @param {Array} summaries - ResultSummary[]
 */
function handleHistoryRunLoaded(manifest, summaries) {
    const isLatest = state.loadingAsLatest;
    state.loadingAsLatest = false;

    state.viewingHistoryRun = isLatest ? null : manifest.runId;
    state.historyManifest = isLatest ? null : manifest;
    state.results = summaries;
    state.currentRunId = manifest.runId;
    state.passed = manifest.stats.passed;
    state.failed = manifest.stats.failed;
    state.skipped = manifest.stats.skipped || 0;

    // Populate statistics from manifest.requestStats
    if (manifest.requestStats) {
        const byRequest = Object.values(manifest.requestStats).map(rs => ({
            name: rs.name || 'Unknown',
            min: rs.minDuration || 0,
            max: rs.maxDuration || 0,
            avg: rs.avgDuration || 0,
            p95: rs.p95 || 0,
            p99: rs.p99 || 0
        }));
        state.statistics = { byRequest, errors: [] };
    }

    // Show banner only when viewing a non-latest history run
    if (elements.historyBanner) {
        if (isLatest) {
            elements.historyBanner.classList.add('hidden');
        } else {
            elements.historyBanner.classList.remove('hidden');
            const date = new Date(manifest.startTime).toLocaleString();
            elements.historyBannerText.textContent = `Viewing run from ${date}`;
        }
    }

    // Update summary cards
    updateSummaryCards();

    // Update config inputs from manifest
    if (manifest.config) {
        elements.iterationsInput.value = manifest.config.iterations || 1;
        elements.delayInput.value = manifest.config.delayBetweenRequests || 0;
        elements.stopOnErrorCheck.checked = manifest.config.stopOnError || false;
    }

    // Switch to Results tab to show loaded data
    switchToTab('results-tab');

    // Show progress section with loaded stats
    elements.progressSection.style.display = '';
    elements.progressBar.style.width = '100%';
    elements.progressText.textContent = `${manifest.stats.totalRequests} / ${manifest.stats.totalRequests} (completed)`;
    if (elements.passedCount) elements.passedCount.textContent = manifest.stats.passed;
    if (elements.failedCount) elements.failedCount.textContent = manifest.stats.failed;
    if (elements.skippedCount) elements.skippedCount.textContent = state.skipped;

    // Render results with virtual scroll
    renderVirtualScrollResults();

    // Render statistics tab
    renderStatistics();
}

/**
 * Handle history run deleted
 * @param {string} runId
 */
function handleHistoryRunDeleted(runId) {
    state.historyRuns = state.historyRuns.filter(r => r.runId !== runId);
    renderHistoryList();

    // If we were viewing the deleted run, clear the view
    if (state.viewingHistoryRun === runId) {
        clearHistoryView();
    }
}

/**
 * Clear history view and load the latest run
 */
function clearHistoryView() {
    if (state.historyRuns.length > 0) {
        // Load the most recent run (same action as clicking Load)
        state.loadingAsLatest = true;
        loadHistoryRun(state.historyRuns[0].runId);
    } else {
        // No history at all - reset to empty
        state.viewingHistoryRun = null;
        state.historyManifest = null;
        state.results = [];
        state.passed = 0;
        state.failed = 0;
        state.skipped = 0;
        state.currentRunId = null;

        if (elements.historyBanner) {
            elements.historyBanner.classList.add('hidden');
        }
        elements.progressSection.style.display = 'none';
        const itemsContainer = elements.resultsList?.querySelector('.virtual-items');
        if (itemsContainer) itemsContainer.innerHTML = '';
        const spacer = elements.resultsList?.querySelector('.virtual-spacer');
        if (spacer) spacer.style.height = '0px';

        updateSummaryCards();
    }
}

/**
 * Load a historical run's results
 * @param {string} runId
 */
function loadHistoryRun(runId) {
    vscode.postMessage({ type: 'loadHistoryRun', runId });
}

/**
 * Delete a historical run
 * @param {string} runId
 */
function deleteHistoryRun(runId) {
    vscode.postMessage({ type: 'deleteHistoryRun', runId });
}

/**
 * Render the history list
 */
function renderHistoryList() {
    if (!elements.historyList) return;

    if (state.historyRuns.length === 0) {
        elements.historyList.innerHTML = `
            <div class="empty-state">
                <p>No run history</p>
                <p class="hint">Run the suite to generate history</p>
            </div>
        `;
        return;
    }

    const html = state.historyRuns.map(run => {
        const date = new Date(run.startTime).toLocaleString();
        const total = run.stats.totalRequests;
        const passRate = total > 0 ? ((run.stats.passed / total) * 100).toFixed(0) : '0';
        const duration = formatHistoryDuration(run.stats.totalDuration);
        const statusClass = run.status === 'completed' ? 'success' : (run.status === 'aborted' ? 'warning' : 'error');
        const isActive = state.viewingHistoryRun === run.runId;

        return `
            <div class="history-entry ${statusClass} ${isActive ? 'active' : ''}" data-run-id="${escapeHtml(run.runId)}">
                <div class="history-entry-header">
                    <span class="history-date">${escapeHtml(date)}</span>
                    <span class="history-status badge-${run.status}">${escapeHtml(run.status)}</span>
                </div>
                <div class="history-entry-stats">
                    <span class="history-pass-rate">${passRate}%</span>
                    <span class="history-counts">
                        <span class="stat-passed">${run.stats.passed}✓</span>
                        <span class="stat-failed">${run.stats.failed}✗</span>
                    </span>
                    <span class="history-duration">${duration}</span>
                    <span class="history-iterations">${run.config.iterations} iter</span>
                </div>
                <div class="history-entry-actions">
                    <button class="btn-link history-load-btn" data-run-id="${escapeHtml(run.runId)}">Load</button>
                    <button class="btn-link danger history-delete-btn" data-run-id="${escapeHtml(run.runId)}">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    elements.historyList.innerHTML = html;

    // Attach event listeners for Load/Delete buttons
    elements.historyList.querySelectorAll('.history-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const runId = btn.dataset.runId;
            if (runId) loadHistoryRun(runId);
        });
    });
    elements.historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const runId = btn.dataset.runId;
            if (runId) deleteHistoryRun(runId);
        });
    });
}

/**
 * Format duration for history display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatHistoryDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
}

/**
 * Update summary cards with current state
 */
function updateSummaryCards() {
    const total = state.passed + state.failed + state.skipped;
    const passRate = total > 0 ? ((state.passed / total) * 100).toFixed(0) : '0';

    if (elements.summaryPassed) elements.summaryPassed.textContent = state.passed;
    if (elements.summaryFailed) elements.summaryFailed.textContent = state.failed;
    if (elements.summarySkipped) elements.summarySkipped.textContent = state.skipped;
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = `${passRate}%`;

    if (state.historyManifest && elements.summaryDuration) {
        elements.summaryDuration.textContent = formatHistoryDuration(state.historyManifest.stats.totalDuration);
    }
}

/**
 * Switch to a specific tab
 * @param {string} tabId
 */
function switchToTab(tabId) {
    elements.tabBtns?.forEach(t => t.classList.remove('active'));
    elements.tabContents?.forEach(c => c.classList.remove('active'));
    const targetTab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (targetTab) targetTab.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
}

/**
 * Re-render virtual scroll results (used when loading history)
 */
function renderVirtualScrollResults() {
    if (!elements.resultsList) return;

    // Reset virtual scroll
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;

    // Update spacer height
    const spacer = elements.resultsList.querySelector('.virtual-spacer');
    if (spacer) {
        spacer.style.height = `${state.results.length * VIRTUAL_SCROLL.itemHeight}px`;
    }

    // Remove empty state if present
    const emptyState = elements.resultsList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    // Trigger re-render by dispatching scroll event
    elements.resultsList.scrollTop = 0;
    elements.resultsList.dispatchEvent(new Event('scroll'));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
