/**
 * Form Manager Module
 * Single Responsibility: Manage form elements (params, headers, body)
 */

import { safeSetEditorValue } from './monaco-editors-manager.js';

/**
 * Create a form manager instance
 * @param {Object} options
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.state - Application state
 * @param {Function} options.escapeHtml - HTML escape function
 * @param {Function} options.updateUrlPreview - Function to update URL preview
 * @param {Function} options.syncUrlWithQueryParams - Function to sync URL with query params (optional)
 * @param {Function} options.markDirty - Function to mark request as having unsaved changes (optional)
 * @returns {Object} Form manager interface
 */
function createFormManager({ elements, state, escapeHtml, updateUrlPreview, syncUrlWithQueryParams, markDirty }) {

    /**
     * OpenAPI type options for type dropdowns
     */
    const TYPE_OPTIONS = ['string', 'integer', 'number', 'boolean', 'array'];
    
    /**
     * Common format suggestions per type
     */
    const FORMAT_SUGGESTIONS = {
        string: ['date-time', 'date', 'time', 'email', 'uri', 'uuid', 'hostname', 'ipv4', 'ipv6', 'byte', 'binary', 'password'],
        integer: ['int32', 'int64'],
        number: ['float', 'double'],
    };

    /**
     * Build the metadata detail panel HTML for a param/header row
     * @param {Object} meta - Existing metadata { type, required, description, format, enum, deprecated }
     * @returns {string} HTML string for the detail panel
     */
    function buildMetaDetailHtml(meta = {}) {
        const typeOptions = TYPE_OPTIONS.map(t => 
            `<option value="${t}" ${meta.type === t ? 'selected' : ''}>${t}</option>`
        ).join('');
        
        const enumTags = (meta.enum || []).map(v =>
            `<span class="enum-tag">${escapeHtml(v)}<span class="remove-enum" title="Remove">×</span></span>`
        ).join('');

        return `
            <div class="meta-field">
                <label>Type</label>
                <select class="meta-type">
                    <option value="">—</option>
                    ${typeOptions}
                </select>
            </div>
            <div class="meta-field">
                <label>Format</label>
                <input type="text" class="meta-format" placeholder="e.g. date-time, int32" value="${escapeHtml(meta.format || '')}" list="format-suggestions">
            </div>
            <div class="meta-field full-width">
                <label>Description</label>
                <textarea class="meta-description" placeholder="Parameter description" rows="1">${escapeHtml(meta.description || '')}</textarea>
            </div>
            <div class="meta-toggles">
                <label class="meta-toggle-label">
                    <input type="checkbox" class="meta-required" ${meta.required ? 'checked' : ''}>
                    Required
                </label>
                <label class="meta-toggle-label">
                    <input type="checkbox" class="meta-deprecated" ${meta.deprecated ? 'checked' : ''}>
                    Deprecated
                </label>
            </div>
            <div class="enum-editor">
                <label style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--vscode-descriptionForeground,#808080);font-weight:600;">Enum Values</label>
                <div class="enum-tags">${enumTags}</div>
                <div class="enum-input-row">
                    <input type="text" class="enum-new-value" placeholder="Add enum value">
                    <button class="enum-add-btn" type="button">+</button>
                </div>
            </div>
        `;
    }

    /**
     * Check if a metadata object has any meaningful content
     * @param {Object} meta
     * @returns {boolean}
     */
    function hasMetaContent(meta) {
        if (!meta) return false;
        return !!(meta.type || meta.required || meta.description || meta.format || 
                  (meta.enum && meta.enum.length > 0) || meta.deprecated);
    }

    /**
     * Read current metadata values from a detail panel DOM element
     * @param {HTMLElement} detailEl - The .param-meta-detail element
     * @returns {Object} metadata object
     */
    function readMetaFromPanel(detailEl) {
        const meta = {};
        const typeVal = detailEl.querySelector('.meta-type')?.value;
        if (typeVal) meta.type = typeVal;
        
        const formatVal = detailEl.querySelector('.meta-format')?.value?.trim();
        if (formatVal) meta.format = formatVal;
        
        const descVal = detailEl.querySelector('.meta-description')?.value?.trim();
        if (descVal) meta.description = descVal;
        
        const reqCheck = detailEl.querySelector('.meta-required');
        if (reqCheck?.checked) meta.required = true;
        
        const depCheck = detailEl.querySelector('.meta-deprecated');
        if (depCheck?.checked) meta.deprecated = true;
        
        // Read enum tags
        const enumVals = [];
        detailEl.querySelectorAll('.enum-tag').forEach(tag => {
            // Text content minus the × remove button
            const text = tag.childNodes[0]?.textContent?.trim();
            if (text) enumVals.push(text);
        });
        if (enumVals.length > 0) meta.enum = enumVals;
        
        return meta;
    }

    /**
     * Sync the value element in a row based on current enum/format metadata.
     * Replaces input↔select as needed and re-wires event listeners.
     * @param {HTMLElement} row - The .param-row element
     * @param {string} type - 'path', 'query', or 'header'
     * @param {string} itemKey - The param/header key name
     * @param {Object} meta - Current metadata from the detail panel
     */
    function syncValueElementFromMeta(row, type, itemKey, meta) {
        const oldEl = row.querySelector('input.value, select.value');
        if (!oldEl) return;

        const currentValue = oldEl.value || '';
        const enumValues = Array.isArray(meta.enum) && meta.enum.length > 0 ? meta.enum : null;
        const isCurrentlySelect = oldEl.tagName === 'SELECT';

        if (enumValues && !isCurrentlySelect) {
            // Replace text input with select dropdown
            const sel = document.createElement('select');
            sel.className = 'value';
            let effectiveValue = currentValue;
            if (!currentValue || !enumValues.includes(currentValue)) {
                effectiveValue = enumValues[0];
            }
            enumValues.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                option.selected = opt === effectiveValue;
                sel.appendChild(option);
            });
            oldEl.replaceWith(sel);
            attachValueListener(sel, type, itemKey);
            updateValueState(type, itemKey, effectiveValue);
        } else if (!enumValues && isCurrentlySelect) {
            // Replace select with text input
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'value';
            inp.placeholder = 'Value or {{variable}}';
            inp.value = currentValue;
            if (meta.format) {
                inp.title = `Must match: ${meta.format}`;
            }
            oldEl.replaceWith(inp);
            attachValueListener(inp, type, itemKey);
            attachBlurValidation(inp, meta.format);
        } else if (enumValues && isCurrentlySelect) {
            // Update existing select options
            const sel = oldEl;
            sel.innerHTML = '';
            let effectiveValue = currentValue;
            if (!currentValue || !enumValues.includes(currentValue)) {
                effectiveValue = enumValues[0];
            }
            enumValues.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                option.selected = opt === effectiveValue;
                sel.appendChild(option);
            });
            updateValueState(type, itemKey, effectiveValue);
        } else if (!enumValues && !isCurrentlySelect) {
            // Update format hint on existing text input
            const inp = oldEl;
            inp.title = meta.format ? `Must match: ${meta.format}` : '';
            // Re-attach blur validation with new format
            attachBlurValidation(inp, meta.format);
        }
    }

    /**
     * Attach the value-change event listener on a new value element
     */
    function attachValueListener(el, type, itemKey) {
        const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventType, () => {
            updateValueState(type, itemKey, el.value);
            if (markDirty) markDirty();
            if (type === 'query') {
                updateQueryParamsState();
                if (syncUrlWithQueryParams) syncUrlWithQueryParams();
            }
            updateUrlPreview();
        });
    }

    /**
     * Update the appropriate state map when a value changes
     */
    function updateValueState(type, itemKey, value) {
        if (type === 'path') {
            state.pathParams[itemKey] = value;
        }
        // query state is sync'd via updateQueryParamsState()
    }

    /**
     * Attach blur validation for a text input with a regex format pattern
     */
    function attachBlurValidation(inp, format) {
        if (!format) return;
        inp.addEventListener('blur', () => {
            const val = inp.value;
            if (!val || val.startsWith('{{')) {
                inp.classList.remove('invalid');
                return;
            }
            try {
                const regex = new RegExp(`^(${format})$`);
                inp.classList.toggle('invalid', !regex.test(val));
            } catch (e) {
                console.warn('Invalid regex pattern:', format, e);
            }
        });
    }

    /**
     * Attach event listeners to a metadata detail panel
     * @param {HTMLElement} detailEl - The .param-meta-detail element
     * @param {HTMLElement} row - The parent .param-row element
     * @param {string} metaMapKey - '_headersMeta', '_queryMeta', or '_paramsMeta'
     * @param {string} itemKey - The key/name of the param/header
     * @param {HTMLElement} toggleBtn - The schema toggle button
     */
    function attachMetaListeners(detailEl, row, metaMapKey, itemKey, toggleBtn) {
        // Derive the param type from metaMapKey
        const type = metaMapKey === '_paramsMeta' ? 'path' : metaMapKey === '_queryMeta' ? 'query' : 'header';

        const updateMeta = () => {
            const meta = readMetaFromPanel(detailEl);
            if (!state[metaMapKey]) state[metaMapKey] = {};
            state[metaMapKey][itemKey] = meta;
            
            // Update visual markers on the row
            row.classList.toggle('is-deprecated', !!meta.deprecated);
            row.classList.toggle('is-required', !!meta.required);
            toggleBtn.classList.toggle('has-meta', hasMetaContent(meta));

            // Sync value element (input ↔ select) based on updated enum/format
            syncValueElementFromMeta(row, type, itemKey, meta);
            
            if (markDirty) markDirty();
        };

        // Type, format, description, required, deprecated
        detailEl.querySelector('.meta-type')?.addEventListener('change', updateMeta);
        detailEl.querySelector('.meta-format')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-description')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-required')?.addEventListener('change', updateMeta);
        detailEl.querySelector('.meta-deprecated')?.addEventListener('change', updateMeta);

        // Enum add
        const enumAddBtn = detailEl.querySelector('.enum-add-btn');
        const enumInput = detailEl.querySelector('.enum-new-value');
        const enumTagsContainer = detailEl.querySelector('.enum-tags');

        const addEnumValue = () => {
            const val = enumInput?.value?.trim();
            if (!val) return;
            const tag = document.createElement('span');
            tag.className = 'enum-tag';
            tag.innerHTML = `${escapeHtml(val)}<span class="remove-enum" title="Remove">×</span>`;
            tag.querySelector('.remove-enum').addEventListener('click', () => {
                tag.remove();
                updateMeta();
            });
            enumTagsContainer.appendChild(tag);
            enumInput.value = '';
            updateMeta();
        };

        enumAddBtn?.addEventListener('click', addEnumValue);
        enumInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addEnumValue(); }
        });

        // Enum remove (for pre-existing tags)
        detailEl.querySelectorAll('.enum-tag .remove-enum').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.parentElement.remove();
                updateMeta();
            });
        });
    }

    /**
     * Wrap a param-row + metadata detail panel in a wrapper element
     * @param {HTMLElement} row - The .param-row element
     * @param {string} type - 'path', 'query', or 'header'
     * @param {string} key - The param/header key name
     * @param {string} metaMapKey - State metadata map key
     * @returns {HTMLElement} The wrapper element
     */
    function wrapRowWithMeta(row, type, key, metaMapKey) {
        const meta = (state[metaMapKey] && state[metaMapKey][key]) || {};
        
        // Create schema toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'schema-toggle' + (hasMetaContent(meta) ? ' has-meta' : '');
        toggleBtn.type = 'button';
        toggleBtn.title = 'Edit OpenAPI schema metadata';
        toggleBtn.textContent = '{}';

        // Insert toggle before remove button (or at end)
        const removeBtn = row.querySelector('.remove-btn');
        if (removeBtn) {
            row.insertBefore(toggleBtn, removeBtn);
        } else {
            row.appendChild(toggleBtn);
        }

        // Create detail panel
        const detailEl = document.createElement('div');
        detailEl.className = 'param-meta-detail';
        detailEl.innerHTML = buildMetaDetailHtml(meta);

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'param-row-wrapper';
        wrapper.dataset.type = type;
        wrapper.appendChild(row);
        wrapper.appendChild(detailEl);

        // Apply initial visual markers
        if (meta.deprecated) row.classList.add('is-deprecated');
        if (meta.required) row.classList.add('is-required');

        // Toggle click
        toggleBtn.addEventListener('click', () => {
            const isOpen = detailEl.classList.toggle('open');
            toggleBtn.classList.toggle('active', isOpen);
        });

        // Attach metadata editing listeners
        attachMetaListeners(detailEl, row, metaMapKey, key, toggleBtn);

        return wrapper;
    }

    /**
     * Add a parameter row (path or query)
     * @param {string} type - 'path' or 'query'
     * @param {string} key - Parameter key
     * @param {string} value - Parameter value
     * @param {boolean} isNew - Whether this is a new (removable) param
     * @param {boolean} keyDisabled - Whether the key input should be disabled
     * @param {boolean} enabled - Whether the param is enabled (for query params)
     * @param {string[]|null} options - If provided, render a select box with these options
     * @param {string|null} pattern - If provided, validate input against this regex pattern on blur
     */
    function addParamRow(type, key, value, isNew = false, keyDisabled = false, enabled = true, options = null, pattern = null) {
        const container = type === 'path' ? elements.pathParams : elements.queryParams;
        const row = document.createElement('div');
        row.className = 'param-row';
        row.dataset.type = type;
        row.dataset.key = key;

        const checkboxHtml = type === 'query' 
            ? `<input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Include in request">`
            : '';

        // For path params with options, render a select box instead of input
        let valueHtml;
        let effectiveValue = value;
        if (options && options.length > 0) {
            // If value is empty or not in options, default to first option
            if (!value || !options.includes(value)) {
                effectiveValue = options[0];
                // Update state immediately if this is a path param
                if (type === 'path') {
                    state.pathParams[key] = effectiveValue;
                }
            }
            const optionsHtml = options.map(opt => 
                `<option value="${escapeHtml(opt)}" ${opt === effectiveValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`
            ).join('');
            valueHtml = `<select class="value">${optionsHtml}</select>`;
        } else {
            // Add title with pattern hint if there's a validation pattern
            const patternHint = pattern ? ` title="Must match: ${escapeHtml(pattern)}"` : '';
            valueHtml = `<input type="text" class="value" placeholder="Value or {{variable}}" value="${escapeHtml(value)}"${patternHint}>`;
        }

        row.innerHTML = `
            ${checkboxHtml}
            <input type="text" class="key" placeholder="Key" value="${escapeHtml(key)}" ${keyDisabled ? 'disabled' : ''}>
            ${valueHtml}
            ${isNew ? '<button class="icon-btn remove-btn" title="Remove">×</button>' : ''}
        `;

        const checkbox = row.querySelector('.param-checkbox');
        const keyInput = row.querySelector('.key');
        const valueElement = row.querySelector('.value');  // Can be input or select
        const removeBtn = row.querySelector('.remove-btn');

        if (checkbox) {
            checkbox.addEventListener('change', () => {
                updateQueryParamsState();
                if (syncUrlWithQueryParams) syncUrlWithQueryParams();
                if (markDirty) markDirty();
                updateUrlPreview();
            });
        }

        keyInput.addEventListener('input', () => {
            if (type === 'query') {
                updateQueryParamsState();
                if (syncUrlWithQueryParams) syncUrlWithQueryParams();
            }
            if (markDirty) markDirty();
            updateUrlPreview();
        });

        // Handle both input and select elements
        const valueEventType = valueElement.tagName === 'SELECT' ? 'change' : 'input';
        valueElement.addEventListener(valueEventType, () => {
            if (type === 'path') {
                state.pathParams[key] = valueElement.value;
            } else if (type === 'query') {
                updateQueryParamsState();
                if (syncUrlWithQueryParams) syncUrlWithQueryParams();
            }
            if (markDirty) markDirty();
            updateUrlPreview();
        });

        // Add blur validation for inputs with regex pattern
        if (pattern && valueElement.tagName === 'INPUT') {
            valueElement.addEventListener('blur', () => {
                const val = valueElement.value;
                // Skip validation if empty or is a variable placeholder
                if (!val || val.startsWith('{{')) {
                    valueElement.classList.remove('invalid');
                    return;
                }
                try {
                    // Create regex that matches the entire string
                    const regex = new RegExp(`^(${pattern})$`);
                    if (regex.test(val)) {
                        valueElement.classList.remove('invalid');
                    } else {
                        valueElement.classList.add('invalid');
                    }
                } catch (e) {
                    // Invalid regex pattern, skip validation
                    console.warn('Invalid regex pattern:', pattern, e);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                // Remove the wrapper (or row if no wrapper)
                const wrapper = row.closest('.param-row-wrapper');
                if (wrapper) {
                    wrapper.remove();
                } else {
                    row.remove();
                }
                // Clean up metadata when a query param is removed
                if (type === 'query' && key && state._queryMeta) {
                    delete state._queryMeta[key];
                }
                if (type === 'path' && key && state._paramsMeta) {
                    delete state._paramsMeta[key];
                }
                updateQueryParamsState();
                if (syncUrlWithQueryParams) syncUrlWithQueryParams();
                if (markDirty) markDirty();
                updateUrlPreview();
            });
        }

        // Wrap with metadata detail panel and append
        const metaMapKey = type === 'path' ? '_paramsMeta' : '_queryMeta';
        const wrapper = wrapRowWithMeta(row, type, key, metaMapKey);

        if (container) {
            container.appendChild(wrapper);
        } else {
            console.error('Container not found for param type:', type);
        }
    }

    /**
     * Add a header row
     * @param {string} key - Header name
     * @param {string} value - Header value
     * @param {boolean} isNew - Whether this is a new (removable) header
     * @param {boolean} enabled - Whether the header is enabled
     * @param {string[]|null} options - If provided, render a select box with these options
     * @param {string|null} pattern - If provided, validate input against this regex pattern on blur
     */
    function addHeaderRow(key, value, isNew = false, enabled = true, options = null, pattern = null) {
        const row = document.createElement('div');
        row.className = 'param-row';

        const checkboxHtml = `<input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Enable/disable this header">`;

        // Render select dropdown for enum options, or text input otherwise
        let valueHtml;
        if (options && options.length > 0) {
            let effectiveValue = value;
            if (!value || !options.includes(value)) {
                effectiveValue = options[0];
            }
            const optionsHtml = options.map(opt => 
                `<option value="${escapeHtml(opt)}" ${opt === effectiveValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`
            ).join('');
            valueHtml = `<select class="value">${optionsHtml}</select>`;
        } else {
            const patternHint = pattern ? ` title="Must match: ${escapeHtml(pattern)}"` : '';
            valueHtml = `<input type="text" class="value" placeholder="Value or {{variable}}" value="${escapeHtml(value)}"${patternHint}>`;
        }

        row.innerHTML = `
            ${checkboxHtml}
            <input type="text" class="key" placeholder="Header name" value="${escapeHtml(key)}">
            ${valueHtml}
            ${isNew ? '<button class="icon-btn remove-btn" title="Remove">×</button>' : ''}
        `;

        // Add change listeners for dirty state
        const checkbox = row.querySelector('.param-checkbox');
        const keyInput = row.querySelector('.key');
        const valueElement = row.querySelector('.value');  // Can be input or select
        const removeBtn = row.querySelector('.remove-btn');
        
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (markDirty) markDirty();
            });
        }
        
        if (keyInput) {
            keyInput.addEventListener('input', () => {
                if (markDirty) markDirty();
            });
        }
        
        // Handle both input and select elements
        if (valueElement) {
            const valueEventType = valueElement.tagName === 'SELECT' ? 'change' : 'input';
            valueElement.addEventListener(valueEventType, () => {
                if (markDirty) markDirty();
            });
        }

        // Add blur validation for inputs with regex pattern
        if (pattern && valueElement && valueElement.tagName === 'INPUT') {
            valueElement.addEventListener('blur', () => {
                const val = valueElement.value;
                if (!val || val.startsWith('{{')) {
                    valueElement.classList.remove('invalid');
                    return;
                }
                try {
                    const regex = new RegExp(`^(${pattern})$`);
                    if (regex.test(val)) {
                        valueElement.classList.remove('invalid');
                    } else {
                        valueElement.classList.add('invalid');
                    }
                } catch (e) {
                    console.warn('Invalid regex pattern:', pattern, e);
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                // Remove the wrapper (or row if no wrapper)
                const wrapper = row.closest('.param-row-wrapper');
                if (wrapper) {
                    wrapper.remove();
                } else {
                    row.remove();
                }
                // Clean up metadata
                if (key && state._headersMeta) {
                    delete state._headersMeta[key];
                }
                if (markDirty) markDirty();
            });
        }

        // Wrap with metadata detail panel and append
        const wrapper = wrapRowWithMeta(row, 'header', key, '_headersMeta');

        if (elements.headersList) {
            elements.headersList.appendChild(wrapper);
        } else {
            console.error('Headers list element not found');
        }
    }

    /**
     * Update query params state from DOM.
     * Re-attaches OpenAPI metadata from parallel map for save round-trip.
     */
    function updateQueryParamsState() {
        state.queryParams = [];
        elements.queryParams?.querySelectorAll('.param-row').forEach(row => {
            const checkbox = row.querySelector('.param-checkbox');
            const key = row.querySelector('.key')?.value;
            const value = row.querySelector('.value')?.value;
            const enabled = checkbox ? checkbox.checked : true;
            if (key) {
                const entry = { key, value: value || '', enabled };
                // Re-attach OpenAPI metadata if present
                if (state._queryMeta && state._queryMeta[key]) {
                    Object.assign(entry, state._queryMeta[key]);
                }
                state.queryParams.push(entry);
            }
        });
    }

    /**
     * Clear all form fields and metadata
     */
    function clearForm() {
        if (elements.pathParams) elements.pathParams.innerHTML = '';
        if (elements.queryParams) elements.queryParams.innerHTML = '';
        if (elements.headersList) elements.headersList.innerHTML = '';
        state.pathParams = {};
        state.queryParams = [];
        state._headersMeta = {};
        state._queryMeta = {};
        state._paramsMeta = {};
    }

    /**
     * Apply body data to Monaco editor
     * @param {Object} options
     * @param {Array} options.bodyFields - Array of field names
     * @param {string} options.method - HTTP method
     * @param {Object} options.editor - Monaco editor instance
     */
    function applyBodyData({ bodyFields, method, editor }) {
        if (!editor) {
            console.warn('[FormManager] Cannot apply body data - Monaco not ready');
            return;
        }
        
        const upperMethod = method?.toUpperCase();
        const methodsWithBody = ['POST', 'PUT', 'PATCH'];
        const supportsBody = methodsWithBody.includes(upperMethod);
        
        editor.updateOptions({ readOnly: !supportsBody });
        
        const bodyEditorContainer = document.getElementById('body-editor');
        if (bodyEditorContainer) {
            bodyEditorContainer.classList.toggle('disabled', !supportsBody);
        }
        
        if (!supportsBody) {
            const message = `// Request body is not supported for ${upperMethod} requests.\n// Only POST, PUT, and PATCH methods can include a request body.`;
            safeSetEditorValue(editor, message);
            state.body = '';
            return;
        }
        
        if (bodyFields && bodyFields.length > 0) {
            const bodyTemplate = {};
            bodyFields.forEach(field => {
                const parts = field.split('.');
                let current = bodyTemplate;
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (i === parts.length - 1) {
                        if (current[part] === undefined) {
                            current[part] = '';
                        }
                    } else {
                        if (current[part] === undefined || typeof current[part] !== 'object') {
                            current[part] = {};
                        }
                        current = current[part];
                    }
                }
            });
            const bodyStr = JSON.stringify(bodyTemplate, null, 2);
            safeSetEditorValue(editor, bodyStr);
            state.body = bodyStr;
        } else {
            const emptyTemplate = '{\n  \n}';
            safeSetEditorValue(editor, emptyTemplate);
            state.body = emptyTemplate;
        }
    }

    return {
        addParamRow,
        addHeaderRow,
        updateQueryParamsState,
        clearForm,
        applyBodyData
    };
}

// ES Module export
export { createFormManager };

