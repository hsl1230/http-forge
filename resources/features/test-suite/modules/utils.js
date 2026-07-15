/**
 * Pure helper functions shared across the Test Suite webview modules.
 */

// HTTP Method mapping (matches backend HTTP_METHOD_MAP)
const HTTP_METHOD_REVERSE = {
    0: 'GET', 1: 'POST', 2: 'PUT', 3: 'DELETE', 4: 'PATCH',
    5: 'HEAD', 6: 'OPTIONS', 7: 'TRACE', 8: 'CONNECT'
};

/**
 * Sanitize a name for use in filenames.
 * Must match backend sanitizeName() in helpers.ts
 */
export function sanitizeName(name) {
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
export function buildResultFileName(index, iteration, requestId) {
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
export function expandSummary(s) {
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
            folderPath: s.fp ?? '',
            groupPath: s.gp ?? (s.fp ?? ''),
            groupType: s.gt,
            collectionName: s.cn ?? '',
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
        folderPath: s.folderPath ?? s.fp ?? '',
        groupPath: s.groupPath ?? s.gp ?? s.folderPath ?? s.fp ?? '',
        groupType: s.groupType ?? s.gt,
        collectionName: s.collectionName ?? s.cn ?? '',
        resultFile: s.resultFile || (s.index !== undefined && s.iteration !== undefined && (s.requestId || s.r)
            ? buildResultFileName(s.index, s.iteration, s.requestId || s.r)
            : null),
        error: s.error || null
    };
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render the test-suite progress bar as full-width segments.
 * Green = passed, red = failed, blue = remaining/skipped.
 * @param {HTMLElement | null | undefined} progressBar
 * @param {{ total?: number, passed?: number, failed?: number }} stats
 */
export function renderProgressBar(progressBar, stats = {}) {
    if (!progressBar) return;

    const total = Math.max(0, Number(stats.total) || 0);
    const passed = Math.max(0, Math.min(total, Number(stats.passed) || 0));
    const failed = Math.max(0, Math.min(total - passed, Number(stats.failed) || 0));
    const passEnd = total > 0 ? (passed / total) * 100 : 0;
    const failEnd = total > 0 ? ((passed + failed) / total) * 100 : 0;

    progressBar.style.width = total > 0 ? '100%' : '0%';
    progressBar.style.setProperty('--pass-end', `${passEnd}%`);
    progressBar.style.setProperty('--fail-end', `${failEnd}%`);
}
