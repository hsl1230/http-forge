/**
 * HTTP Tester Core - Test Results Module
 * Manage and display test results from scripts
 */

/**
 * Create a test results manager
 * @param {Function|Object} escapeHtmlFnOrOptions - Function to escape HTML, or options object
 * @returns {Object} Test results manager interface
 */
function createTestResultsManager(escapeHtmlFnOrOptions) {
    let results = [];
    let sectionElement = null;
    let summaryElement = null;
    let listElement = null;
    let badgeElement = null;
    let onUpdate = null;
    
    // Support both old API (function) and new API (options object)
    let escapeHtmlFn;
    if (typeof escapeHtmlFnOrOptions === 'function') {
        escapeHtmlFn = escapeHtmlFnOrOptions;
    } else if (escapeHtmlFnOrOptions && typeof escapeHtmlFnOrOptions === 'object') {
        escapeHtmlFn = escapeHtmlFnOrOptions.escapeHtml || ((s) => s);
        onUpdate = escapeHtmlFnOrOptions.onUpdate || null;
    } else {
        escapeHtmlFn = (s) => s;
    }

    /**
     * Set DOM elements for rendering
     * @param {Object} elements
     * @param {HTMLElement} elements.section
     * @param {HTMLElement} elements.summary
     * @param {HTMLElement} elements.list
     * @param {HTMLElement} [elements.badge] - Badge element for tab count
     */
    function setElements({ section, summary, list, badge }) {
        sectionElement = section;
        summaryElement = summary;
        listElement = list;
        badgeElement = badge;
    }

    /**
     * Render results to UI
     */
    function renderToUI() {
        // Call onUpdate callback if provided
        if (onUpdate) {
            onUpdate();
            return;
        }
        
        if (!listElement) return;
        
        if (results.length === 0) {
            if (sectionElement) sectionElement.classList.add('hidden');
            if (listElement) listElement.innerHTML = '<div class="test-placeholder">Run tests to see results</div>';
            if (summaryElement) summaryElement.textContent = '';
            if (badgeElement) badgeElement.classList.add('hidden');
            return;
        }
        
        if (sectionElement) sectionElement.classList.remove('hidden');
        
        const passed = results.filter(r => r.passed).length;
        const failed = results.length - passed;
        
        if (summaryElement) {
            summaryElement.textContent = `${passed}/${results.length} passed`;
            summaryElement.className = 'test-summary ' + (failed === 0 ? 'all-passed' : 'some-failed');
        }
        
        // Update badge on response tab
        if (badgeElement) {
            badgeElement.textContent = `${passed}/${results.length}`;
            badgeElement.classList.remove('hidden');
            badgeElement.classList.toggle('all-passed', failed === 0);
            badgeElement.classList.toggle('has-failed', failed > 0);
        }
        
        const html = results.map(result => `
            <div class="test-result ${result.passed ? 'passed' : 'failed'}">
                <span class="test-icon">${result.passed ? '✓' : '✗'}</span>
                <span class="test-name">${escapeHtmlFn(result.name)}</span>
                ${result.error ? `<div class="test-error">${escapeHtmlFn(result.error)}</div>` : ''}
            </div>
        `).join('');
        listElement.innerHTML = html;
    }

    return {
        setElements,

        clear() {
            results = [];
            renderToUI();
        },

        /**
         * Add a test result
         * @param {string} name - Test name
         * @param {boolean} passed - Whether test passed
         * @param {string|null} error - Error message if failed
         */
        addResult(name, passed, error = null) {
            results.push({ name, passed, error });
            renderToUI();
        },

        /**
         * Get results for testing/debugging
         * @returns {Array}
         */
        getResults() {
            return [...results];
        },

        /**
         * Get summary stats
         * @returns {{total: number, passed: number, failed: number}}
         */
        getSummary() {
            const passed = results.filter(r => r.passed).length;
            return {
                total: results.length,
                passed,
                failed: results.length - passed
            };
        }
    };
}

// ES Module export
export { createTestResultsManager };

