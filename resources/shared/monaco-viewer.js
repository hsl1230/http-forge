/**
 * ============================================
 * Shared Monaco Viewer Library
 * Common functionality for all Monaco-based webviews
 * ============================================
 */

(function (global) {
    'use strict';

    // Monaco Editor CDN configuration
    const MONACO_VERSION = '0.45.0';
    const MONACO_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/${MONACO_VERSION}/min/vs`;

    // State management
    let monacoLoaded = false;
    let monacoLoadPromise = null;
    const pendingEditors = [];

    /**
     * Load Monaco Editor from CDN
     * @returns {Promise} Resolves when Monaco is ready
     */
    function loadMonaco() {
        if (monacoLoaded) {
            return Promise.resolve();
        }

        if (monacoLoadPromise) {
            return monacoLoadPromise;
        }

        monacoLoadPromise = new Promise((resolve, reject) => {
            // Check if require is already available
            if (typeof require !== 'undefined' && require.config) {
                require.config({ paths: { vs: MONACO_CDN_BASE } });
                require(['vs/editor/editor.main'], function () {
                    monacoLoaded = true;
                    processPendingEditors();
                    resolve();
                });
                return;
            }

            // Load Monaco loader script
            const loaderScript = document.createElement('script');
            loaderScript.src = `${MONACO_CDN_BASE}/loader.min.js`;
            loaderScript.onload = function () {
                require.config({ paths: { vs: MONACO_CDN_BASE } });
                require(['vs/editor/editor.main'], function () {
                    monacoLoaded = true;
                    processPendingEditors();
                    resolve();
                });
            };
            loaderScript.onerror = reject;
            document.head.appendChild(loaderScript);

            // Also add CSS
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `${MONACO_CDN_BASE}/editor/editor.main.min.css`;
            document.head.appendChild(cssLink);
        });

        return monacoLoadPromise;
    }

    /**
     * Process any editors that were queued before Monaco loaded
     */
    function processPendingEditors() {
        while (pendingEditors.length > 0) {
            const pending = pendingEditors.shift();
            pending.callback();
        }
    }

    /**
     * Queue an editor creation for when Monaco is ready
     */
    function whenMonacoReady(callback) {
        if (monacoLoaded) {
            callback();
        } else {
            pendingEditors.push({ callback });
            loadMonaco();
        }
    }

    /**
     * Create a Monaco editor with common configuration
     * @param {HTMLElement} container - Container element for the editor
     * @param {Object} options - Editor options
     * @returns {Object} Monaco editor instance
     */
    function createEditor(container, options = {}) {
        const defaultOptions = {
            language: 'json',
            theme: 'vs-dark',
            readOnly: true,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            wordWrap: 'on',
            folding: true,
            foldingStrategy: 'indentation',
            links: true
        };

        return monaco.editor.create(container, { ...defaultOptions, ...options });
    }

    /**
     * Apply decorations to highlight clickable links
     * @param {Object} editor - Monaco editor instance
     * @param {Array} links - Array of link objects with line, startCol, endCol
     * @param {string} className - CSS class for the decoration
     * @param {Function} getHoverMessage - Function to get hover message for each link
     */
    function applyLinkDecorations(editor, links, className = 'clickable-link-decoration', getHoverMessage = null) {
        const decorations = links.map(link => ({
            range: new monaco.Range(link.line, link.startCol, link.line, link.endCol),
            options: {
                inlineClassName: className,
                hoverMessage: getHoverMessage ? { value: getHoverMessage(link) } : null
            }
        }));
        return editor.createDecorationsCollection(decorations);
    }

    /**
     * Find which link was clicked based on cursor position
     * @param {Object} position - Monaco position object
     * @param {Array} links - Array of link objects
     * @returns {Object|null} The clicked link or null
     */
    function findClickedLink(position, links) {
        for (const link of links) {
            if (position.lineNumber === link.line &&
                position.column >= link.startCol &&
                position.column <= link.endCol) {
                return link;
            }
        }
        return null;
    }

    /**
     * Setup cursor change on hover for links
     * @param {Object} editor - Monaco editor instance
     * @param {HTMLElement} container - Container element
     * @param {Array} links - Array of link objects
     */
    function setupLinkHoverCursor(editor, container, links) {
        editor.onMouseMove((e) => {
            if (e.target.position) {
                const hoveredLink = findClickedLink(e.target.position, links);
                container.style.cursor = hoveredLink ? 'pointer' : 'text';
            }
        });
    }

    /**
     * Setup expand/collapse all functionality
     * @param {Object} editor - Monaco editor instance
     * @param {HTMLElement} expandBtn - Expand all button
     * @param {HTMLElement} collapseBtn - Collapse all button
     */
    function setupFoldingControls(editor, expandBtn, collapseBtn) {
        if (expandBtn) {
            expandBtn.addEventListener('click', () => {
                editor.getAction('editor.unfoldAll').run();
            });
        }
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                editor.getAction('editor.foldAll').run();
            });
        }
    }

    /**
     * Setup copy JSON functionality
     * @param {HTMLElement} copyBtn - Copy button
     * @param {Function} getContent - Function that returns the content to copy
     * @param {HTMLElement} messageEl - Copy message overlay element
     */
    function setupCopyButton(copyBtn, getContent, messageEl) {
        if (!copyBtn) return;

        copyBtn.addEventListener('click', () => {
            const content = typeof getContent === 'function' ? getContent() : getContent;
            
            navigator.clipboard.writeText(content).then(() => {
                showCopyMessage(messageEl);
            }).catch(() => {
                // Fallback for older browsers
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = content;
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
                showCopyMessage(messageEl);
            });
        });
    }

    /**
     * Show the copy success message
     * @param {HTMLElement} messageEl - Message element
     */
    function showCopyMessage(messageEl) {
        if (!messageEl) return;
        messageEl.classList.add('visible');
        setTimeout(() => messageEl.classList.remove('visible'), 2000);
    }

    /**
     * JSON Viewer - Complete solution for displaying JSON with Monaco
     */
    class JsonViewer {
        constructor(containerId, options = {}) {
            this.containerId = containerId;
            this.options = options;
            this.editor = null;
            this.currentData = null;
            this.links = [];
        }

        /**
         * Render JSON content with Monaco editor
         * @param {string} title - Title to display
         * @param {Object|string} jsonData - JSON data to display
         * @param {Function} linkFinder - Function to find clickable links in the JSON
         * @param {Function} linkClickHandler - Function to handle link clicks
         */
        show(title, jsonData, linkFinder = null, linkClickHandler = null) {
            whenMonacoReady(() => {
                this._render(title, jsonData, linkFinder, linkClickHandler);
            });
        }

        _render(title, jsonData, linkFinder, linkClickHandler) {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            // Parse JSON if string
            if (typeof jsonData === 'string') {
                try {
                    jsonData = JSON.parse(jsonData);
                } catch (error) {
                    console.error('Invalid JSON string', error);
                    return;
                }
            }

            this.currentData = jsonData;
            const jsonString = JSON.stringify(jsonData, null, 2);

            // Create HTML structure
            container.innerHTML = `
                <div class="json-viewer-content">
                    <div class="json-viewer-header${this.options.clickableHeader ? ' clickable' : ''}">
                        <div class="json-viewer-title">${title}</div>
                    </div>
                    <div class="json-viewer-body">
                        <div class="json-viewer-controls">
                            <button id="expand-all" title="Expand All">Expand All</button>
                            <button id="collapse-all" title="Collapse All">Collapse All</button>
                            <button id="copy-json" title="Copy JSON">Copy JSON</button>
                        </div>
                        <div id="monaco-container" class="json-viewer-container"></div>
                        <div id="copy-message" class="json-viewer-copy-message">Copied!</div>
                    </div>
                </div>
            `;

            const monacoContainer = container.querySelector('#monaco-container');

            // Dispose previous editor
            if (this.editor) {
                this.editor.dispose();
            }

            // Create Monaco editor
            this.editor = createEditor(monacoContainer, {
                value: jsonString,
                language: 'json'
            });

            // Find and apply link decorations
            if (typeof linkFinder === 'function') {
                this.links = linkFinder(jsonString, jsonData);
                applyLinkDecorations(this.editor, this.links, 'clickable-link-decoration', 
                    this.options.getHoverMessage || null);
                setupLinkHoverCursor(this.editor, monacoContainer, this.links);

                // Handle link clicks
                if (typeof linkClickHandler === 'function') {
                    this.editor.onMouseDown((e) => {
                        if (e.target.position) {
                            const clickedLink = findClickedLink(e.target.position, this.links);
                            if (clickedLink) {
                                linkClickHandler(clickedLink);
                            }
                        }
                    });
                }
            }

            // Setup controls
            setupFoldingControls(
                this.editor,
                container.querySelector('#expand-all'),
                container.querySelector('#collapse-all')
            );

            setupCopyButton(
                container.querySelector('#copy-json'),
                () => JSON.stringify(this.currentData, null, 2),
                container.querySelector('#copy-message')
            );

            // Header click handler
            if (this.options.onHeaderClick) {
                const header = container.querySelector('.json-viewer-header');
                header.addEventListener('click', () => {
                    this.options.onHeaderClick(title);
                    showCopyMessage(container.querySelector('#copy-message'));
                });
            }
        }

        dispose() {
            if (this.editor) {
                this.editor.dispose();
                this.editor = null;
            }
        }

        getData() {
            return this.currentData;
        }
    }

    // Export to global scope
    global.MonacoViewer = {
        loadMonaco,
        whenMonacoReady,
        createEditor,
        applyLinkDecorations,
        findClickedLink,
        setupLinkHoverCursor,
        setupFoldingControls,
        setupCopyButton,
        showCopyMessage,
        JsonViewer
    };

    // Auto-load Monaco on script load
    loadMonaco();

})(window);
