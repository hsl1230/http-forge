/**
 * History Renderer Module
 * Shared between endpoint-tester and http-api-tester
 * Single Responsibility: Render and manage request history UI
 */

/**
 * Create a history renderer instance
 * @param {Object} options
 * @param {Function} options.escapeHtml - Function to escape HTML
 * @param {Function} options.formatTime - Function to format timestamps
 * @param {Function} options.formatDuration - Function to format durations
 * @param {Function} options.postMessage - Function to post messages to VS Code
 * @returns {Object} History renderer interface
 */
function createHistoryRenderer({ escapeHtml, formatTime, formatDuration, postMessage }) {
    let historyListElement = null;
    let onEntryClick = null;
    let onEntryDelete = null;
    let onEntryShare = null;
    let onEntryMove = null;
    let onGroupRename = null;

    /**
     * Set the history list DOM element
     * @param {HTMLElement} element
     */
    function setElement(element) {
        historyListElement = element;
    }

    /**
     * Set click handler for history entries
     * @param {Function} handler
     */
    function setOnEntryClick(handler) {
        onEntryClick = handler;
    }

    /**
     * Set delete handler for history entries
     * @param {Function} handler
     */
    function setOnEntryDelete(handler) {
        onEntryDelete = handler;
    }

    /**
     * Set share handler for history entries
     * @param {Function} handler
     */
    function setOnEntryShare(handler) {
        onEntryShare = handler;
    }

    /**
     * Set move handler for shared history entries
     * @param {Function} handler
     */
    function setOnEntryMove(handler) {
        onEntryMove = handler;
    }

    /**
     * Set rename handler for shared history groups
     * @param {Function} handler
     */
    function setOnGroupRename(handler) {
        onGroupRename = handler;
    }

    /**
     * Render history to the UI
     * @param {Array} history - Array of history groups
     */
    function render(history) {
        if (!historyListElement) return;
        
        historyListElement.innerHTML = '';

        if (!history || !Array.isArray(history) || history.length === 0) {
            historyListElement.innerHTML = '<div class="history-empty">No history yet</div>';
            return;
        }

        history.forEach((historyGroup, index) => {
            const { ticket, branch, isCurrent, entries } = historyGroup;
            
            if (!entries || !Array.isArray(entries) || entries.length === 0) {
                return;
            }

            const group = createGroupElement(historyGroup);
            historyListElement.appendChild(group);
        });
    }

    /**
     * Create a history group element
     * @param {Object} historyGroup
     * @returns {HTMLElement}
     */
    function createGroupElement({ ticket, branch, isCurrent, isShared, entries }) {
        const group = document.createElement('div');
        group.className = 'history-group';
        if (isCurrent) {
            group.classList.add('current-branch');
        }

        const displayName = ticket || branch || 'Unknown';
        const header = createGroupHeader(displayName, ticket, isCurrent, isShared, branch);
        group.appendChild(header);
        
        const entriesContainer = createEntriesContainer(entries, isShared);
        group.appendChild(entriesContainer);

        return group;
    }

    /**
     * Create group header element
     * @param {string} displayName
     * @param {string|null} ticket
     * @param {boolean} isCurrent
     * @returns {HTMLElement}
     */
    function createGroupHeader(displayName, ticket, isCurrent, isShared, branch) {
        const header = document.createElement('div');
        header.className = 'history-group-header';
        
        const ticketSpan = ticket 
            ? `<span class="ticket-link">${escapeHtml(displayName)}</span>` 
            : escapeHtml(displayName);
        const sharedBadge = isShared ? ' <span class="shared-badge">shared</span>' : '';
        const renameButton = isShared ? ' <button class="rename-button" title="Rename shared group">✎</button>' : '';
        
        header.innerHTML = `<span class="chevron">▼</span> ${ticketSpan}${isCurrent ? ' <span class="current-badge" title="Current branch">📍</span>' : ''}${sharedBadge}${renameButton}`;
        
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('ticket-link')) return;
            header.parentElement.classList.toggle('collapsed');
        });
        
        if (ticket) {
            const ticketEl = header.querySelector('.ticket-link');
            ticketEl?.addEventListener('click', (e) => {
                e.stopPropagation();
                postMessage({ command: 'openJiraTicket', ticket });
            });
        }

        if (isShared) {
            const renameEl = header.querySelector('.rename-button');
            renameEl?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onGroupRename) {
                    onGroupRename(branch);
                }
            });
        }

        return header;
    }

    /**
     * Create entries container element
     * @param {Array} entries
     * @returns {HTMLElement}
     */
    function createEntriesContainer(entries, isShared) {
        const container = document.createElement('div');
        container.className = 'history-group-entries';

        entries.forEach(entry => {
            const entryDiv = createEntryElement(entry, isShared);
            container.appendChild(entryDiv);
        });

        return container;
    }

    /**
     * Create a single entry element
     * @param {Object} entry
     * @returns {HTMLElement}
     */
    function createEntryElement(entry, isShared) {
        const statusCode = entry.response?.status || entry.statusCode || 0;
        const timestamp = entry.timestamp || Date.now();
        const executionTime = entry.response?.time || 0;
        
        let durationClass = '';
        if (executionTime > 0) {
            if (executionTime < 500) durationClass = 'fast';
            else if (executionTime > 3000) durationClass = 'very-slow';
            else if (executionTime > 1000) durationClass = 'slow';
        }
        
        const entryDiv = document.createElement('div');
        entryDiv.className = 'history-entry';
        entryDiv.dataset.entryId = entry.id;
        const actionButton = isShared
            ? '<button class="icon-btn move-btn" title="Move to shared group">⇄</button>'
            : '<button class="icon-btn share-btn" title="Share">⤴</button>';
        entryDiv.innerHTML = `
            <span class="time">${formatTime(timestamp)}</span>
            <span class="status ${statusCode >= 200 && statusCode < 400 ? 'success' : 'error'}">${statusCode}</span>
            <span class="duration ${durationClass}">${formatDuration(executionTime)}</span>
            ${actionButton}
            <button class="icon-btn delete-btn" title="Delete">×</button>
        `;

        entryDiv.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn') && !e.target.classList.contains('share-btn') && !e.target.classList.contains('move-btn')) {
                document.querySelectorAll('.history-entry.active').forEach(el => el.classList.remove('active'));
                entryDiv.classList.add('active');
                if (onEntryClick) {
                    onEntryClick(entry.id, isShared);
                }
            }
        });

        entryDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (onEntryDelete) {
                onEntryDelete(entry.id, isShared);
            }
        });

        const shareEl = entryDiv.querySelector('.share-btn');
        if (shareEl) {
            shareEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onEntryShare) {
                    onEntryShare(entry.id);
                }
            });
        }

        const moveEl = entryDiv.querySelector('.move-btn');
        if (moveEl) {
            moveEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onEntryMove) {
                    onEntryMove(entry.id);
                }
            });
        }

        return entryDiv;
    }

    return {
        setElement,
        setOnEntryClick,
        setOnEntryDelete,
        setOnEntryShare,
        setOnEntryMove,
        setOnGroupRename,
        render
    };
}

// ES Module export
export { createHistoryRenderer };

