/**
 * Statistics rendering (Response Time table and Error Summary).
 */

import { elements, state } from './state.js';
import { escapeHtml } from './utils.js';

/**
 * Reset statistics display
 */
export function resetStatistics() {
    // Reset summary cards
    if (elements.summaryPassed) elements.summaryPassed.textContent = '0';
    if (elements.summaryFailed) elements.summaryFailed.textContent = '0';
    if (elements.summaryPassRate) elements.summaryPassRate.textContent = '0%';
    if (elements.summaryDuration) elements.summaryDuration.textContent = '0s';
    
    // Reset Statistics tab (Response Time table and Error Summary)
    if (elements.statsTableBody) elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No data yet</td></tr>';
    if (elements.errorSummary) elements.errorSummary.style.display = 'none';
    if (elements.errorList) elements.errorList.innerHTML = '';
}

/**
 * Render statistics from current state (Response Time table and Error Summary)
 */
export function renderStatistics() {
    const stats = state.statistics;
    if (!stats) return;
    
    // Response time table - byRequest is an array of RequestStatistics
    if (stats.byRequest && stats.byRequest.length > 0) {
        // Build a name -> {collectionName, folderPath} map from the suite requests
        // so the Request column can show the same full label as the Requests list.
        const metaByName = new Map();
        for (const r of state.requests) {
            const nm = r.name || r.requestName;
            if (nm && !metaByName.has(nm)) {
                metaByName.set(nm, { cn: r.collectionName || '', fp: r.folderPath || '' });
            }
        }
        elements.statsTableBody.innerHTML = stats.byRequest
            .map(reqStats => {
                const name = reqStats.name || 'Unknown';
                const meta = metaByName.get(name);
                const pathParts = [];
                if (meta && meta.cn) pathParts.push(meta.cn);
                if (meta && meta.fp) pathParts.push(meta.fp);
                const collectionPath = pathParts.join(' \u203a ');
                const fullLabel = collectionPath ? `${collectionPath} \u203a ${name}` : name;
                const pathLine = collectionPath
                    ? `<span class="stat-collection-path">${escapeHtml(collectionPath)}</span>`
                    : '';
                const calls = reqStats.count != null ? reqStats.count : '-';
                return `
                <tr>
                    <td title="${escapeHtml(fullLabel)}">
                        <span class="stat-request-cell">
                            ${pathLine}
                            <span class="stat-request-name">${escapeHtml(name)}</span>
                        </span>
                    </td>
                    <td>${calls}</td>
                    <td>${reqStats.min}ms</td>
                    <td>${Math.round(reqStats.avg)}ms</td>
                    <td>${reqStats.p95}ms</td>
                    <td>${reqStats.p99}ms</td>
                    <td>${reqStats.max}ms</td>
                </tr>
            `;
            }).join('');
    } else {
        elements.statsTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No data yet</td></tr>';
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
