/**
 * Test Suite webview entry point.
 *
 * Wires together the feature modules: initializes the DOM element cache,
 * registers event listeners, and routes messages from the extension host.
 */

import {
    applyIncomingFlowNodes,
    closeNodeEditor,
    closeTypePicker,
    onTypePicked,
    openTypePicker,
    saveNodeEditor
} from './flow-editor.js';
import {
    clearHistoryView,
    handleHistoryRunDeleted,
    handleHistoryRunLoaded,
    handleRunHistory,
    requestRunHistory
} from './history.js';
import {
    closeModal,
    exportHtmlReport,
    exportJsonReport,
    exportStatisticsReport,
    formatAndDisplayBody,
    handleResultDetails,
    handleResultDetailsError,
    initPanelResizer,
    initResponseBodyEditor,
    initVirtualScroll
} from './results-view.js';
import {
    handleRequestResult,
    handleRunComplete,
    handleRunProgress,
    handleRunStarted,
    handleRunStopped,
    handleStatisticsUpdate,
    startRun,
    stopRun
} from './run.js';
import { editorState, elements, state, vscode } from './state.js';
import {
    addSelectedRequests,
    browseDataFile,
    clearDataFile,
    closeAddRequestModal,
    filterAvailableRequests,
    handleSaveSuiteResult,
    handleSuiteSaved,
    saveSuite,
    setAvailableRequests,
    setDataFile,
    setDirty,
    setEnvironments,
    setSuite,
    setupDescriptionInteraction
} from './suite-editor.js';

/**
 * Initialize the runner
 */
function initialize() {
    // Populate DOM elements after DOM is ready
    Object.assign(elements, {
        suiteName: document.getElementById('suite-name'),
        suiteDescriptionContainer: document.getElementById('suite-description-container'),
        suiteDescriptionDisplay: document.getElementById('suite-description-display'),
        suiteDescriptionTooltip: document.getElementById('suite-description-tooltip'),
        suiteDescriptionEdit: document.getElementById('suite-description-edit'),
        suiteActionsBtn: document.getElementById('suite-actions-btn'),
        suiteActionsDropdown: document.getElementById('suite-actions-dropdown'),
        suiteActionsMenuContainer: document.getElementById('suite-actions-menu-container'),
        // Flow editor (primary UI)
        addFlowNodeBtn: document.getElementById('add-flow-node-btn'),
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
    });

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
    // Suite actions menu
    elements.suiteActionsBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = elements.suiteActionsDropdown?.classList.contains('hidden');
        elements.suiteActionsDropdown?.classList.toggle('hidden', !isHidden);
    });

    elements.suiteActionsDropdown?.addEventListener('click', (e) => {
        const action = e.target?.dataset?.suiteAction;
        if (!action) {
            return;
        }
        elements.suiteActionsDropdown?.classList.add('hidden');
        vscode.postMessage({
            type: 'manageSuiteFiles',
            action
        });
    });

    document.addEventListener('click', (e) => {
        if (!elements.suiteActionsMenuContainer?.contains(e.target)) {
            elements.suiteActionsDropdown?.classList.add('hidden');
        }
    });

    // ── Flow view (primary) ────────────────────────────────────────────────
    elements.addFlowNodeBtn?.addEventListener('click', () => openTypePicker());

    // Node type picker
    document.getElementById('node-type-picker-close')?.addEventListener('click', closeTypePicker);
    document.getElementById('node-type-grid')?.addEventListener('click', e => {
        const card = e.target.closest('.node-type-card');
        if (card) onTypePicked(card.dataset.type);
    });

    // Node editor
    document.getElementById('node-editor-close')?.addEventListener('click', closeNodeEditor);
    document.getElementById('node-editor-cancel')?.addEventListener('click', closeNodeEditor);
    document.getElementById('node-editor-save')?.addEventListener('click', saveNodeEditor);

    // Run/Stop buttons
    elements.runBtn?.addEventListener('click', startRun);
    elements.stopBtn?.addEventListener('click', stopRun);

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
        const content = editorState.responseBodyMonacoEditor ? editorState.responseBodyMonacoEditor.getValue() : '';
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
            elements.suiteActionsDropdown?.classList.add('hidden');
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
            applyIncomingFlowNodes(message.suite?.nodes || []);
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
            handleRunStarted(message.runId, message.suiteId, message.totalRequests, message.iterations);
            break;
        case 'runProgress':
            handleRunProgress(message.current, message.total, message.passed, message.failed, message.skipped);
            break;
        case 'requestResult':
            handleRequestResult(message.result);
            break;
        case 'statisticsUpdate':
            handleStatisticsUpdate(message.statistics);
            break;
        case 'runComplete':
            handleRunComplete(message.summary, message.reportPath);
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
