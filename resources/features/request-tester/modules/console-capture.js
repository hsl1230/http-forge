/**
 * HTTP Tester Core - Console Capture Module
 * Capture and display console output from scripts
 */

/**
 * Create a console capture instance
 * @param {Function|Object} escapeHtmlFnOrOptions - Function to escape HTML, or options object
 * @param {Function} [escapeHtmlFnOrOptions.escapeHtml] - Function to escape HTML
 * @param {number} [escapeHtmlFnOrOptions.maxEntries] - Maximum entries to keep
 * @param {Function} [escapeHtmlFnOrOptions.onCapture] - Callback when entry is captured
 * @returns {Object} Console capture interface
 */
function createConsoleCapture(escapeHtmlFnOrOptions) {
    let logs = [];
    let consoleElement = null;
    
    // Support both old API (function) and new API (options object)
    let escapeHtmlFn;
    let maxEntries = 1000;
    let onCapture = null;
    
    if (typeof escapeHtmlFnOrOptions === 'function') {
        escapeHtmlFn = escapeHtmlFnOrOptions;
    } else if (escapeHtmlFnOrOptions && typeof escapeHtmlFnOrOptions === 'object') {
        escapeHtmlFn = escapeHtmlFnOrOptions.escapeHtml || ((s) => s);
        maxEntries = escapeHtmlFnOrOptions.maxEntries || 1000;
        onCapture = escapeHtmlFnOrOptions.onCapture || null;
    } else {
        escapeHtmlFn = (s) => s;
    }

    /**
     * Set the DOM element to render console output
     * @param {HTMLElement} element
     */
    function setElement(element) {
        consoleElement = element;
    }

    /**
     * Render logs to UI
     */
    function renderToUI() {
        if (!consoleElement) return;
        
        if (logs.length === 0) {
            consoleElement.innerHTML = '<div class="console-placeholder">Console output will appear here...</div>';
            return;
        }
        
        consoleElement.innerHTML = logs.map(entry => `
            <div class="console-entry ${entry.type}">
                <span class="console-prefix">[${entry.type.toUpperCase()}]</span>
                <span class="console-message">${escapeHtmlFn(entry.message)}</span>
                <span class="console-timestamp">${entry.timestamp}</span>
            </div>
        `).join('');
        
        // Auto-scroll to bottom
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }

    /**
     * Add a log entry
     * @param {string} type - Log type (log, info, warn, error)
     * @param {Array} args - Arguments to log
     */
    function addEntry(type, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        const entry = {
            type,
            level: type, // Alias for compatibility
            message,
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString()
        };
        
        logs.push(entry);
        
        // Enforce max entries
        if (logs.length > maxEntries) {
            logs = logs.slice(-maxEntries);
        }
        
        // Call onCapture callback if provided
        if (onCapture) {
            onCapture(entry);
        }
        
        renderToUI();
    }

    return {
        setElement,
        
        clear() {
            logs = [];
            renderToUI();
        },
        
        log(...args) {
            addEntry('log', args);
        },
        
        info(...args) {
            addEntry('info', args);
        },
        
        warn(...args) {
            addEntry('warn', args);
        },
        
        error(...args) {
            addEntry('error', args);
        },

        /**
         * Get logs for testing/debugging
         * @returns {Array}
         */
        getLogs() {
            return [...logs];
        },
        
        /**
         * Get entries (alias for getLogs for compatibility)
         * @returns {Array}
         */
        getEntries() {
            return [...logs];
        }
    };
}

// ES Module export
export { createConsoleCapture };

