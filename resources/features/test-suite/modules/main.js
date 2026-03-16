/**
 * Test Suite Main Module
 * Handles test suite execution, statistics, and UI updates
 */

// VS Code API
const vscode = acquireVsCodeApi();

/**
 * Log function stub - disabled to reduce console noise
 * Enable for debugging by uncommenting the console calls
 */
function log() {
    // Intentionally empty - logging disabled
}

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
 * Build result filename from summary components
 * Must match backend formula in result-storage-service.ts
 */
function buildResultFileName(index, iteration, requestId) {
    const indexStr = String(index).padStart(6, '0');
    const iterStr = String(iteration).padStart(4, '0');
    return `result-${indexStr}-iter-${iterStr}-${requestId}.json`;
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
    currentIndex: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    selectedResultIndex: -1,
    currentRunId: null,
    suiteId: null,
    autoScroll: true,
    totalRequests: 0,
    iterations: 1,
    requestsPerIteration: 0,
    isDirty: false,  // Track unsaved changes
    availableRequests: [],  // Available requests for Add modal
    runStartTime: null      // Track start time for duration calculation
};

// Monaco editor instance for response body
let responseBodyMonacoEditor = null;

// DOM Elements - populated in initialize()
let elements = {};

/**
 * Initialize the runner
 */
function initialize() {
    // Populate DOM elements after DOM is ready
    elements = {
        suiteName: document.getElementById('suite-name'),
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
        panelResizer: document.getElementById('panel-resizer')
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
    
    log('Test Suite Runner initialized', 'info');
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
            state.isDirty = true;
        }
    });

    // Data file buttons
    elements.browseDataBtn?.addEventListener('click', browseDataFile);
    elements.clearDataBtn?.addEventListener('click', clearDataFile);

    // Export buttons
    elements.exportJsonBtn?.addEventListener('click', exportJsonReport);
    elements.exportHtmlBtn?.addEventListener('click', exportHtmlReport);
    elements.exportReportBtn?.addEventListener('click', exportStatisticsReport);

    // Environment select (disabled - display only)
    // elements.environmentSelect?.addEventListener('change', (e) => {
    //     state.selectedEnvironment = e.target.value;
    // });

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
        status: 'pending'
    }));
    state.isDirty = false;
    
    // Set suite name in editable input
    elements.suiteName.value = suite.name;
    elements.runBtn.disabled = state.requests.length === 0;
    
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
    log(`Loaded test suite: ${suite.name} (${state.requests.length} requests)`, 'info');
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
    log(`Loaded data file: ${filePath}`, 'info');
}

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
        const statusIcon = getStatusIcon(item.status);
        // Build full path: Collection › Folder › Request
        const pathParts = [];
        if (item.collectionName) pathParts.push(item.collectionName);
        if (item.folderPath) pathParts.push(item.folderPath);
        const fullPath = pathParts.length > 0 ? 
            `<span class="collection-path">${escapeHtml(pathParts.join(' › '))}</span>` : '';
        
        return `
            <div class="request-item" data-index="${index}" draggable="true">
                <input type="checkbox" ${item.selected ? 'checked' : ''} data-index="${index}" class="request-checkbox">
                <span class="request-method ${item.method}">${item.method}</span>
                <span class="request-path">
                    ${fullPath}
                    <span class="request-name">${escapeHtml(item.name)}</span>
                </span>
                <span class="request-status ${item.status}">${statusIcon}</span>
                <button class="delete-btn" data-index="${index}" title="Remove from suite">×</button>
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
            </div>
        `;
    }).join('');

    // Add checkbox change handlers
    elements.requestList.querySelectorAll('.request-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            state.requests[index].selected = e.target.checked;
            state.isDirty = true;
            updateRunButton();
        });
    });

    // Add delete button handlers
    elements.requestList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(e.target.dataset.index);
            removeRequest(index);
        });
    });

    // Add drag and drop handlers
    setupDragAndDrop();
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
                state.isDirty = true;
                renderRequestList();
                log(`Reordered: moved "${removed.name}" to position ${index + 1}`, 'info');
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
    state.isDirty = true;
    renderRequestList();
    updateRunButton();
    log(`Removed "${removed.name}" from suite`, 'info');
}

/**
 * Get status icon for request
 * @param {string} status
 * @returns {string}
 */
function getStatusIcon(status) {
    switch (status) {
        case 'pending': return '○';
        case 'running': return '⟳';
        case 'passed': return '✓';
        case 'failed': return '✗';
        case 'skipped': return '○';
        default: return '○';
    }
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
    state.isDirty = true;
    renderRequestList();
    updateRunButton();
}

/**
 * Deselect all requests
 */
function deselectAllRequests() {
    state.requests.forEach(r => r.selected = false);
    state.isDirty = true;
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
    log('Cleared data file', 'info');
}

/**
 * Start the test suite run
 */
async function startRun() {
    state.isRunning = true;
    state.results = [];
    state.statistics = null;
    state.currentIndex = 0;
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
    state.requestsPerIteration = selectedRequests.length;
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

    log(`Starting run: ${config.iterations} iteration(s), ${config.delay}ms delay, ${selectedIndices.length} requests`, 'info');

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
    log('Run stopped by user', 'warning');
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
    log(`Run started: ${runId}`, 'info');
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
    
    state.currentIndex++;
    updateProgress();
    
    // Update virtual scroll (only re-render visible items)
    renderVirtualResults();

    // Auto-scroll to bottom if enabled
    if (state.autoScroll && elements.resultsList) {
        const totalHeight = state.results.length * VIRTUAL_SCROLL.itemHeight;
        const containerHeight = elements.resultsList.clientHeight || 400;
        elements.resultsList.scrollTop = totalHeight - containerHeight;
    }
    
    // Log result
    const icon = expanded.passed ? '✓' : '✗';
    const logLevel = expanded.passed ? 'success' : 'error';
    log(`${icon} ${expanded.name} - ${expanded.status} (${expanded.duration}ms)`, logLevel);
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
    
    log(`Run complete: ${state.passed} passed, ${state.failed} failed, ${state.skipped} skipped`, 
        state.failed > 0 ? 'warning' : 'success');
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
        state.isDirty = false;
        log(`Suite saved: ${suite.name}`, 'success');
        
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
 * Render a single result item
 * @param {Object} result
 * @param {number} index
 */
function renderResultItem(result, index) {
    const item = document.createElement('div');
    item.className = `result-item ${result.passed ? 'passed' : 'failed'}`;
    item.dataset.resultIndex = index;
    item.title = 'Click to view details';
    
    item.innerHTML = `
        <span class="result-icon ${result.passed ? 'passed' : 'failed'}">
            ${result.passed ? '✓' : '✗'}
        </span>
        <div class="result-details">
            <div class="result-name">${escapeHtml(result.name)}</div>
            <div class="result-meta">${escapeHtml(result.method || '')} ${escapeHtml(String(result.status || ''))}</div>
        </div>
        <span class="result-duration">${result.duration}ms</span>
    `;
    
    item.addEventListener('click', () => {
        state.autoScroll = false;
        showResultDetail(index);
    });
    
    elements.resultsList.appendChild(item);
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
            collectionId: r.collectionId,
            requestId: r.requestId || r.id,
            name: r.name,
            method: r.method,
            collectionName: r.collectionName,
            folderPath: r.folderPath || '',
            enabled: r.selected
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
    
    log('Saving suite...', 'info');
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
        state.isDirty = false;
        state.suiteId = suiteId;
        log(`Suite saved: ${suiteId}`, 'success');
        
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
        log(`Failed to save suite: ${error}`, 'error');
        
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
        state.isDirty = true;
        
        // Notify backend to update suite.requests (batch all at once)
        vscode.postMessage({
            type: 'addRequests',
            requests: toAdd.map(req => ({
                collectionId: req.collectionId,
                requestId: req.requestId,
                enabled: true
            }))
        });
        
        renderRequestList();
        updateRunButton();
        log(`Added ${toAdd.length} request(s) to suite`, 'info');
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
        vscode.postMessage({
            type: 'getResultDetails',
            suiteId: state.suiteId,
            runId: state.currentRunId,
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
