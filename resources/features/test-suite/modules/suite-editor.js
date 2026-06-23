/**
 * Suite editor: request list, drag/drop, add-request modal, save, description
 * interaction, and suite/environment/data-file setters.
 */

import { elements, state, virtualScrollState, vscode } from './state.js';
import { renderStatistics } from './statistics.js';
import { escapeHtml } from './utils.js';

/**
 * Set dirty state and notify extension + update Save button highlight
 * @param {boolean} dirty
 */
export function setDirty(dirty) {
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
export function buildCurrentSuiteState() {
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
 * Set the suite and its resolved requests
 * @param {Object} suite - TestSuite object
 * @param {Array} requests - Resolved requests with full data
 */
export function setSuite(suite, requests) {
    // Reset run-related state when switching suites
    state.results = [];
    state.displayItems = [];
    state.collapsedGroups.clear();
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
export function setEnvironments(environments) {
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
export function setAvailableRequests(requests) {
    state.availableRequests = requests;
    renderAvailableRequestsList();
}

/**
 * Set data file
 * @param {string} filePath
 * @param {string} content
 */
export function setDataFile(filePath, content) {
    state.dataFile = { path: filePath, content };
    elements.dataFilePath.value = filePath;
    elements.clearDataBtn.disabled = false;
}

/**
 * Close all open action menus
 */
export function closeAllMenus() {
    document.querySelectorAll('.menu-dropdown.open').forEach(m => m.classList.remove('open'));
}

// Close menus when clicking outside
document.addEventListener('click', () => closeAllMenus());

/**
 * Render the request list with delete buttons
 */
export function renderRequestList() {
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
export function setupDragAndDrop() {
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
export function removeRequest(index) {
    const removed = state.requests.splice(index, 1)[0];
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Update run button state
 */
export function updateRunButton() {
    const selectedCount = state.requests.filter(r => r.selected).length;
    elements.runBtn.disabled = selectedCount === 0 || state.isRunning;
}

/**
 * Select all requests
 */
export function selectAllRequests() {
    state.requests.forEach(r => r.selected = true);
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Deselect all requests
 */
export function deselectAllRequests() {
    state.requests.forEach(r => r.selected = false);
    setDirty(true);
    renderRequestList();
    updateRunButton();
}

/**
 * Browse for data file
 */
export function browseDataFile() {
    vscode.postMessage({ type: 'browseDataFile' });
}

/**
 * Clear data file
 */
export function clearDataFile() {
    state.dataFile = null;
    elements.dataFilePath.value = '';
    elements.clearDataBtn.disabled = true;
}

/**
 * Handle suite saved
 * @param {Object} suite - The saved suite
 */
export function handleSuiteSaved(suite) {
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
 * Save the test suite
 */
export function saveSuite() {
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
export function handleSaveSuiteResult(success, suiteId, error) {
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
export function openAddRequestModal() {
    // Request available requests from extension
    vscode.postMessage({ type: 'getAvailableRequests' });
    
    elements.requestSearch.value = '';
    elements.addRequestModal.classList.remove('hidden');
    elements.requestSearch.focus();
}

/**
 * Close Add Request modal
 */
export function closeAddRequestModal() {
    elements.addRequestModal.classList.add('hidden');
    elements.availableRequestsList.innerHTML = '';
}

/**
 * Render available requests list
 */
export function renderAvailableRequestsList() {
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
export function filterAvailableRequests() {
    renderAvailableRequestsList();
}

/**
 * Update Add Selected button state
 */
export function updateAddSelectedButton() {
    const checkedCount = elements.availableRequestsList.querySelectorAll('.add-request-checkbox:checked').length;
    elements.addSelectedBtn.disabled = checkedCount === 0;
    elements.addSelectedBtn.textContent = checkedCount > 0 ? `Add Selected (${checkedCount})` : 'Add Selected';
}

/**
 * Add selected requests to suite
 */
export function addSelectedRequests() {
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
// Description Interaction Helpers
// ============================================

/**
 * Update suite description display text (called on suite load)
 */
export function updateSuiteDescriptionDisplay() {
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
export function setupDescriptionInteraction(displayEl, tooltipEl, editEl, getValue, setValue) {
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
