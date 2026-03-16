/**
 * Body Type Manager Module
 * Single Responsibility: Manage HTTP request body types and their UI
 * 
 * Follows:
 * - SRP: Only handles body type switching and state
 * - OCP: New body types can be added via BODY_TYPES constant
 * - DIP: Uses callbacks for state updates
 */

import { escapeHtml } from './utils.js';

/**
 * Supported body types
 */
const BODY_TYPES = Object.freeze({
    NONE: 'none',
    FORM_DATA: 'form-data',
    URL_ENCODED: 'x-www-form-urlencoded',
    RAW: 'raw',
    BINARY: 'binary',
    GRAPHQL: 'graphql'
});

/**
 * Raw format types
 */
const RAW_FORMATS = Object.freeze({
    JSON: 'json',
    TEXT: 'text',
    XML: 'xml',
    HTML: 'html',
    JAVASCRIPT: 'javascript'
});

/**
 * Panel ID mapping
 */
const PANEL_MAP = Object.freeze({
    [BODY_TYPES.NONE]: 'body-none',
    [BODY_TYPES.FORM_DATA]: 'body-form-data',
    [BODY_TYPES.URL_ENCODED]: 'body-urlencoded',
    [BODY_TYPES.RAW]: 'body-raw',
    [BODY_TYPES.BINARY]: 'body-binary',
    [BODY_TYPES.GRAPHQL]: 'body-graphql'
});

/**
 * Create a body type manager instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.editorsManager - Monaco editors manager
 * @param {Function} options.onTypeChange - Callback when body type changes
 * @returns {Object} Body type manager interface
 */
function createBodyTypeManager({ state, elements, editorsManager, onTypeChange }) {
    
    /**
     * Switch body panel visibility based on selected type
     * @param {string} bodyType - The body type to switch to
     */
    function switchPanel(bodyType) {
        // Hide all panels
        Object.values(PANEL_MAP).forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.classList.remove('active');
                panel.classList.add('hidden');
            }
        });

        // Show selected panel
        const targetPanel = document.getElementById(PANEL_MAP[bodyType]);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            targetPanel.classList.add('active');
        }

        // Show/hide raw format selector
        if (elements.rawFormatSelector) {
            elements.rawFormatSelector.classList.toggle('hidden', bodyType !== BODY_TYPES.RAW);
        }

        // Show/hide GraphQL toolbar
        if (elements.graphqlToolbar) {
            elements.graphqlToolbar.classList.toggle('hidden', bodyType !== BODY_TYPES.GRAPHQL);
        }

        // Layout editors when switching to their panels
        requestAnimationFrame(() => {
            if (bodyType === BODY_TYPES.RAW && editorsManager) {
                editorsManager.layout('body');
            }
            if (bodyType === BODY_TYPES.GRAPHQL && editorsManager) {
                editorsManager.layout('graphqlQuery');
                editorsManager.layout('graphqlVariables');
            }
        });
    }

    /**
     * Set body type and update UI
     * @param {string} bodyType - Body type to set
     */
    function setType(bodyType) {
        if (!Object.values(BODY_TYPES).includes(bodyType)) {
            console.warn(`[BodyTypeManager] Invalid body type: ${bodyType}`);
            bodyType = BODY_TYPES.NONE;
        }
        
        state.bodyType = bodyType;
        switchPanel(bodyType);
        
        // Update radio button selection
        elements.bodyTypeRadios?.forEach(radio => {
            radio.checked = radio.value === bodyType;
        });
        
        if (onTypeChange) {
            onTypeChange(bodyType);
        }
    }

    /**
     * Get current body type
     * @returns {string}
     */
    function getType() {
        return state.bodyType || BODY_TYPES.NONE;
    }

    /**
     * Set raw format
     * @param {string} format - Raw format
     */
    function setRawFormat(format) {
        if (!Object.values(RAW_FORMATS).includes(format)) {
            console.warn(`[BodyTypeManager] Invalid raw format: ${format}`);
            format = RAW_FORMATS.JSON;
        }
        
        state.rawFormat = format;
        
        if (elements.rawFormatSelect) {
            elements.rawFormatSelect.value = format;
        }
        
        if (editorsManager) {
            editorsManager.updateRawEditorLanguage(format);
        }
    }

    /**
     * Get raw format
     * @returns {string}
     */
    function getRawFormat() {
        return state.rawFormat || RAW_FORMATS.JSON;
    }

    /**
     * Reset body state to defaults
     */
    function reset() {
        state.body = '';
        state.bodyType = BODY_TYPES.NONE;
        state.rawFormat = RAW_FORMATS.JSON;
        state.formData = [];
        state.urlEncodedData = [];
        state.graphql = { query: '', variables: '', operationName: '' };
        state.binaryFile = null;
        
        // Clear UI
        if (editorsManager) {
            editorsManager.setBodyValue('');
            editorsManager.setGraphqlQuery('');
            editorsManager.setGraphqlVariables('');
        }
        
        if (elements.formDataList) {
            elements.formDataList.innerHTML = '';
        }
        if (elements.urlencodedList) {
            elements.urlencodedList.innerHTML = '';
        }
        if (elements.selectedFileName) {
            elements.selectedFileName.textContent = 'No file selected';
            elements.selectedFileName.classList.remove('selected');
        }
        if (elements.rawFormatSelect) {
            elements.rawFormatSelect.value = RAW_FORMATS.JSON;
        }
        
        // Switch to none panel
        switchPanel(BODY_TYPES.NONE);
        
        // Update radio buttons
        elements.bodyTypeRadios?.forEach(radio => {
            radio.checked = radio.value === BODY_TYPES.NONE;
        });
    }

    /**
     * Add a form-data row
     * @param {string} key - Field key
     * @param {string} value - Field value
     * @param {string} type - Field type ('text' or 'file')
     * @param {boolean} enabled - Whether the field is enabled
     */
    function addFormDataRow(key = '', value = '', type = 'text', enabled = true) {
        const row = document.createElement('div');
        row.className = `param-row form-data-row ${type === 'file' ? 'file-type' : ''}`;

        row.innerHTML = `
            <input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Include in request">
            <input type="text" class="key" placeholder="Key" value="${escapeHtml(key)}">
            <select class="type-select">
                <option value="text" ${type === 'text' ? 'selected' : ''}>Text</option>
                <option value="file" ${type === 'file' ? 'selected' : ''}>File</option>
            </select>
            <input type="text" class="value text-value" placeholder="Value" value="${escapeHtml(value)}">
            <div class="file-value">
                <input type="file" class="file-input">
                <button class="secondary select-file-btn" type="button">Select</button>
                <span class="file-name">No file selected</span>
            </div>
            <button class="icon-btn remove-btn" title="Remove">×</button>
        `;

        // Type selector change
        const typeSelect = row.querySelector('.type-select');
        typeSelect.addEventListener('change', () => {
            row.classList.toggle('file-type', typeSelect.value === 'file');
            updateFormDataState();
        });

        // File selection
        const fileInput = row.querySelector('.file-input');
        const selectFileBtn = row.querySelector('.select-file-btn');
        const fileName = row.querySelector('.file-name');
        
        selectFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileName.textContent = fileInput.files[0].name;
                updateFormDataState();
            }
        });

        // Remove button
        row.querySelector('.remove-btn').addEventListener('click', () => {
            row.remove();
            updateFormDataState();
        });

        // Update state on changes
        row.querySelector('.param-checkbox').addEventListener('change', updateFormDataState);
        row.querySelector('.key').addEventListener('input', updateFormDataState);
        row.querySelector('.value.text-value').addEventListener('input', updateFormDataState);

        elements.formDataList?.appendChild(row);
    }

    /**
     * Update formData state from DOM
     */
    function updateFormDataState() {
        state.formData = [];
        elements.formDataList?.querySelectorAll('.param-row').forEach(row => {
            const enabled = row.querySelector('.param-checkbox')?.checked ?? true;
            const key = row.querySelector('.key')?.value || '';
            const type = row.querySelector('.type-select')?.value || 'text';
            const textValue = row.querySelector('.value.text-value')?.value || '';
            const fileInput = row.querySelector('.file-input');
            const file = fileInput?.files?.[0] || null;
            
            if (key) {
                state.formData.push({
                    key,
                    value: type === 'file' ? file : textValue,
                    type,
                    enabled
                });
            }
        });
        if (onTypeChange) {
            onTypeChange(state.bodyType);
        }
    }

    /**
     * Add a URL-encoded row
     * @param {string} key - Field key
     * @param {string} value - Field value
     * @param {boolean} enabled - Whether the field is enabled
     */
    function addUrlencodedRow(key = '', value = '', enabled = true) {
        const row = document.createElement('div');
        row.className = 'param-row';

        row.innerHTML = `
            <input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Include in request">
            <input type="text" class="key" placeholder="Key" value="${escapeHtml(key)}">
            <input type="text" class="value" placeholder="Value" value="${escapeHtml(value)}">
            <button class="icon-btn remove-btn" title="Remove">×</button>
        `;

        row.querySelector('.remove-btn').addEventListener('click', () => {
            row.remove();
            updateUrlencodedState();
        });

        row.querySelector('.param-checkbox').addEventListener('change', updateUrlencodedState);
        row.querySelector('.key').addEventListener('input', updateUrlencodedState);
        row.querySelector('.value').addEventListener('input', updateUrlencodedState);

        elements.urlencodedList?.appendChild(row);
    }

    /**
     * Update urlEncodedData state from DOM
     */
    function updateUrlencodedState() {
        state.urlEncodedData = [];
        elements.urlencodedList?.querySelectorAll('.param-row').forEach(row => {
            const enabled = row.querySelector('.param-checkbox')?.checked ?? true;
            const key = row.querySelector('.key')?.value || '';
            const value = row.querySelector('.value')?.value || '';
            
            if (key) {
                state.urlEncodedData.push({ key, value, enabled });
            }
        });
        if (onTypeChange) {
            onTypeChange(state.bodyType);
        }
    }

    /**
     * Initialize event listeners
     */
    function initEventListeners() {
        // Body type radio buttons
        elements.bodyTypeRadios?.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    setType(radio.value);
                }
            });
        });

        // Raw format selector
        if (elements.rawFormatSelect) {
            elements.rawFormatSelect.addEventListener('change', () => {
                setRawFormat(elements.rawFormatSelect.value);
                if (onTypeChange) onTypeChange(state.bodyType);
            });
        }

        // Add form-data button
        if (elements.addFormDataBtn) {
            elements.addFormDataBtn.addEventListener('click', () => {
                addFormDataRow();
            });
        }

        // Add URL-encoded button
        if (elements.addUrlencodedBtn) {
            elements.addUrlencodedBtn.addEventListener('click', () => {
                addUrlencodedRow();
            });
        }

        // Binary file selection
        if (elements.selectFileBtn && elements.binaryFileInput) {
            elements.selectFileBtn.addEventListener('click', () => {
                elements.binaryFileInput.click();
            });
            
            elements.binaryFileInput.addEventListener('change', () => {
                if (elements.binaryFileInput.files.length > 0) {
                    state.binaryFile = elements.binaryFileInput.files[0];
                    if (elements.selectedFileName) {
                        elements.selectedFileName.textContent = state.binaryFile.name;
                        elements.selectedFileName.classList.add('selected');
                    }
                    if (onTypeChange) {
                        onTypeChange(state.bodyType);
                    }
                }
            });
        }
    }

    /**
     * Apply body data from saved request
     * Format: { type: 'raw', format: 'json', content: ... }
     * @param {Object} bodyData - Saved body data
     */
    function applyFromRequest(bodyData) {
        if (!bodyData || typeof bodyData !== 'object') {
            reset();
            return;
        }

        const bodyType = bodyData.type || BODY_TYPES.RAW;
        const rawFormat = bodyData.format;
        const bodyContent = bodyData.content;
        
        // Apply based on body type
        if (bodyType === BODY_TYPES.RAW) {
            setType(BODY_TYPES.RAW);
            setRawFormat(rawFormat || RAW_FORMATS.JSON);
            
            // Set body content in editor
            const content = typeof bodyContent === 'string' 
                ? bodyContent 
                : JSON.stringify(bodyContent, null, 2);
            state.body = content;
            
            if (editorsManager) {
                editorsManager.setBodyValue(content);
            }
        } else if (bodyType === BODY_TYPES.FORM_DATA) {
            setType(BODY_TYPES.FORM_DATA);
            state.formData = Array.isArray(bodyContent) ? bodyContent : [];
            
            // Populate form-data rows
            if (elements.formDataList) {
                elements.formDataList.innerHTML = '';
            }
            state.formData.forEach(item => {
                addFormDataRow(item.key, item.value, item.type || 'text', item.enabled !== false);
            });
        } else if (bodyType === BODY_TYPES.URL_ENCODED) {
            setType(BODY_TYPES.URL_ENCODED);
            
            // Handle both array format and string format
            if (Array.isArray(bodyContent)) {
                state.urlEncodedData = bodyContent;
            } else if (typeof bodyContent === 'string' && bodyContent) {
                // Parse URL-encoded string into key-value pairs
                state.urlEncodedData = bodyContent.split('&').map(pair => {
                    const [key, value] = pair.split('=');
                    return {
                        key: decodeURIComponent(key || ''),
                        value: decodeURIComponent(value || ''),
                        enabled: true
                    };
                }).filter(item => item.key); // Only keep items with keys
            } else {
                state.urlEncodedData = [];
            }
            
            // Populate urlencoded rows
            if (elements.urlencodedList) {
                elements.urlencodedList.innerHTML = '';
            }
            state.urlEncodedData.forEach(item => {
                addUrlencodedRow(item.key, item.value, item.enabled !== false);
            });
        } else if (bodyType === BODY_TYPES.GRAPHQL) {
            setType(BODY_TYPES.GRAPHQL);
            
            if (typeof bodyContent === 'object') {
                state.graphql = {
                    query: bodyContent.query || '',
                    variables: bodyContent.variables || ''
                };
                if (editorsManager) {
                    editorsManager.setGraphqlQuery(state.graphql.query);
                    editorsManager.setGraphqlVariables(
                        typeof state.graphql.variables === 'string' 
                            ? state.graphql.variables 
                            : JSON.stringify(state.graphql.variables, null, 2)
                    );
                }
            }
        } else if (bodyType === BODY_TYPES.BINARY) {
            setType(BODY_TYPES.BINARY);
            state.binaryFile = null;
            if (elements.selectedFileName) {
                elements.selectedFileName.textContent = 'No file selected';
                elements.selectedFileName.classList.remove('selected');
            }
        } else if (bodyType === BODY_TYPES.NONE) {
            setType(BODY_TYPES.NONE);
        } else {
            setType(bodyType);
        }
    }

    /**
     * Get body data for saving
     * Uses separate fields format: { type, format, content }
     * @returns {Object|null} Body data object
     */
    function getBodyForSave() {
        switch (state.bodyType) {
            case BODY_TYPES.NONE:
                return null;
            case BODY_TYPES.RAW:
                return {
                    type: BODY_TYPES.RAW,
                    format: state.rawFormat,
                    content: state.body
                };
            case BODY_TYPES.GRAPHQL:
                return {
                    type: BODY_TYPES.GRAPHQL,
                    content: {
                        query: state.graphql.query,
                        variables: state.graphql.variables,
                        operationName: state.graphql.operationName || undefined
                    }
                };
            case BODY_TYPES.FORM_DATA:
                return {
                    type: BODY_TYPES.FORM_DATA,
                    content: state.formData
                };
            case BODY_TYPES.URL_ENCODED:
                return {
                    type: BODY_TYPES.URL_ENCODED,
                    content: state.urlEncodedData
                };
            default:
                return { type: state.bodyType, content: state.body };
        }
    }

    return {
        BODY_TYPES,
        RAW_FORMATS,
        switchPanel,
        setType,
        getType,
        setRawFormat,
        getRawFormat,
        reset,
        addFormDataRow,
        addUrlencodedRow,
        updateFormDataState,
        updateUrlencodedState,
        initEventListeners,
        applyFromRequest,
        getBodyForSave
    };
}

export { BODY_TYPES, createBodyTypeManager, RAW_FORMATS };

