/**
 * Run history: list, load, delete, and the summary-card / tab helpers used when
 * viewing a historical run.
 */

import { renderVirtualScrollResults } from './results-view.js';
import { elements, state, vscode } from './state.js';
import { renderStatistics } from './statistics.js';
import { escapeHtml } from './utils.js';

/**
 * Request run history from extension
 */
export function requestRunHistory() {
    vscode.postMessage({ type: 'getRunHistory' });
}

/**
 * Handle run history response
 * @param {Array} runs - RunHistoryEntry[]
 */
export function handleRunHistory(runs) {
    state.historyRuns = runs || [];
    renderHistoryList();
}

/**
 * Handle loaded history run
 * @param {Object} manifest - RunManifest
 * @param {Array} summaries - ResultSummary[]
 */
export function handleHistoryRunLoaded(manifest, summaries) {
    const isLatest = state.loadingAsLatest;
    state.loadingAsLatest = false;

    state.viewingHistoryRun = isLatest ? null : manifest.runId;
    state.historyManifest = isLatest ? null : manifest;
    state.results = summaries;
    state.collapsedGroups.clear();
    state.collapsedIterations.clear();
    state.currentRunId = manifest.runId;
    state.passed = manifest.stats.passed;
    state.failed = manifest.stats.failed;
    state.skipped = manifest.stats.skipped || 0;

    // Populate statistics from manifest.requestStats
    if (manifest.requestStats) {
        const byRequest = Object.values(manifest.requestStats).map(rs => ({
            name: rs.name || 'Unknown',
            count: rs.count || 0,
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
export function handleHistoryRunDeleted(runId) {
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
export function clearHistoryView() {
    if (state.historyRuns.length > 0) {
        // Load the most recent run (same action as clicking Load)
        state.loadingAsLatest = true;
        loadHistoryRun(state.historyRuns[0].runId);
    } else {
        // No history at all - reset to empty
        state.viewingHistoryRun = null;
        state.historyManifest = null;
        state.results = [];
        state.displayItems = [];
        state.collapsedGroups.clear();
        state.collapsedIterations.clear();
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
export function loadHistoryRun(runId) {
    vscode.postMessage({ type: 'loadHistoryRun', runId });
}

/**
 * Delete a historical run
 * @param {string} runId
 */
export function deleteHistoryRun(runId) {
    vscode.postMessage({ type: 'deleteHistoryRun', runId });
}

/**
 * Render the history list
 */
export function renderHistoryList() {
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
export function formatHistoryDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
}

/**
 * Update summary cards with current state
 */
export function updateSummaryCards() {
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
export function switchToTab(tabId) {
    elements.tabBtns?.forEach(t => t.classList.remove('active'));
    elements.tabContents?.forEach(c => c.classList.remove('active'));
    const targetTab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (targetTab) targetTab.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
}
