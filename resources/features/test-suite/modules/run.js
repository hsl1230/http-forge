/**
 * Run lifecycle: starting/stopping a run and handling progress, per-request
 * results, real-time statistics, and completion messages from the extension.
 */

import { requestRunHistory } from './history.js';
import { buildDisplayItems, renderVirtualResults } from './results-view.js';
import { elements, state, VIRTUAL_SCROLL, virtualScrollState, vscode } from './state.js';
import { renderStatistics, resetStatistics } from './statistics.js';
import { expandSummary, renderProgressBar } from './utils.js';

function countEnabledRequestNodes(nodes) {
    let count = 0;
    for (const node of nodes || []) {
        if (!node || node.enabled === false) continue;
        if (node.type === 'request') {
            count += 1;
            continue;
        }
        if (Array.isArray(node.nodes)) {
            count += countEnabledRequestNodes(node.nodes);
        }
        if (node.type === 'if') {
            count += countEnabledRequestNodes(node.then);
            count += countEnabledRequestNodes(node.else);
            if (Array.isArray(node.elseif)) {
                for (const branch of node.elseif) {
                    count += countEnabledRequestNodes(branch?.nodes);
                }
            }
        }
        if (node.type === 'switch') {
            if (Array.isArray(node.cases)) {
                for (const c of node.cases) {
                    count += countEnabledRequestNodes(c?.nodes);
                }
            }
            count += countEnabledRequestNodes(node.default);
        }
    }
    return count;
}

/**
 * Start the test suite run
 */
export async function startRun() {
    state.isRunning = true;
    state.results = [];
    state.displayItems = [];
    state.collapsedGroups.clear();
    state.collapsedIterations.clear();
    state.statistics = null;
    state.passed = 0;
    state.failed = 0;
    state.skipped = 0;
    state.currentRunId = null;
    state.autoScroll = true;
    state.reportPath = null;
    state.completedRequests = 0;
    state.runStartTime = Date.now();  // Track start time for duration

    // Reset virtual scroll state
    virtualScrollState.startIndex = 0;
    virtualScrollState.endIndex = 0;
    virtualScrollState.scrollTop = 0;

    // Calculate total requests from enabled nodes in the flow
    const iterations = parseInt(elements.iterationsInput.value) || 1;
    const enabledRequestCount = countEnabledRequestNodes(state.suite?.nodes || []);
    state.iterations = iterations;
    state.totalRequests = iterations * enabledRequestCount;

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

    // Flow-first: backend drives execution from suite.nodes directly
    vscode.postMessage({
        type: 'startRun',
        config
    });
}

/**
 * Stop the test suite run
 */
export function stopRun() {
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
export function handleRunStarted(runId, suiteId, totalRequests, iterations) {
    state.currentRunId = runId;
    state.suiteId = suiteId;
    state.autoScroll = true;
    state.completedRequests = 0;
    if (typeof totalRequests === 'number') {
        state.totalRequests = totalRequests;
    }
    if (typeof iterations === 'number') {
        state.iterations = iterations;
    }

    updateProgress();

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
export function handleRunProgress(current, total, passed, failed, skipped) {
    state.completedRequests = Number(current) || 0;
    state.totalRequests = Number(total) || 0;

    if (typeof passed === 'number') {
        state.passed = passed;
    }
    if (typeof failed === 'number') {
        state.failed = failed;
    }
    if (typeof skipped === 'number') {
        state.skipped = skipped;
    }

    updateProgress();
}

/**
 * Handle a request result (summary)
 * @param {Object} result - ResultSummary from extension (compact or expanded format)
 */
export function handleRequestResult(result) {
    // Store compact/summary format directly (saves memory)
    state.results.push(result);
    
    // Expand for processing
    const expanded = expandSummary(result);
    
    // Rebuild grouped display list, then update virtual scroll
    buildDisplayItems();
    renderVirtualResults();

    // Auto-scroll to bottom if enabled
    if (state.autoScroll && elements.resultsList) {
        const totalHeight = state.displayItems.length * VIRTUAL_SCROLL.itemHeight;
        const containerHeight = elements.resultsList.clientHeight || 400;
        elements.resultsList.scrollTop = totalHeight - containerHeight;
    }
}

/**
 * Handle statistics update (real-time during run)
 * @param {Object} statistics
 */
export function handleStatisticsUpdate(statistics) {
    state.statistics = statistics;
    renderStatistics();
}

/**
 * Update progress display with real-time stats
 */
export function updateProgress() {
    const total = state.totalRequests || 0;
    const completed = Math.max(0, Math.min(total, state.completedRequests || 0));

    renderProgressBar(elements.progressBar, {
        total,
        passed: state.passed,
        failed: state.failed
    });

    elements.progressText.textContent = `${completed} / ${total}`;
    elements.passedCount.textContent = state.passed;
    elements.failedCount.textContent = state.failed;
    elements.skippedCount.textContent = state.skipped;

    // Update stats summary in real-time (both in progress section and Statistics tab)
    updateRealTimeStats();
}

/**
 * Update statistics in real-time during run
 * Updates the summary cards above tabs (in progress section)
 */
export function updateRealTimeStats() {
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
export function handleRunComplete(summary, reportPath) {
    state.isRunning = false;
    state.autoScroll = false;
    state.reportPath = reportPath || null;
    
    // Calculate final duration
    const finalDuration = state.runStartTime ? Date.now() - state.runStartTime : 0;
    
    // Update statistics from summary if provided
    if (summary) {
        state.passed = summary.passed || 0;
        state.failed = summary.failed || 0;
        state.skipped = summary.skipped || 0;
        state.completedRequests = state.totalRequests || (state.passed + state.failed + state.skipped);

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

    updateProgress();
    
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
export function handleRunStopped() {
    state.isRunning = false;
    state.autoScroll = false;
    updateProgress();
    
    elements.runBtn.disabled = false;
    elements.stopBtn.disabled = true;
}
