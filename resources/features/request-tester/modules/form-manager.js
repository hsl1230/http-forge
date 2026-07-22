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
        // Layout: Parameter section → Schema section → Variants section
        // Determine initial visibility: no type selected → hide all constraint groups + show hint
        const t = meta.type || '';
        const isStr = t === 'string';
        const isNum = t === 'integer' || t === 'number';
        const isArr = t === 'array';
        const hasType = !!t;

        // oneOf variant items
        const oneOfVariants = (meta.oneOf && meta.oneOf.length > 0) ? meta.oneOf : [];
        const variantItems = oneOfVariants.map((v, i) => {
            const summary = variantSummary(v);
            const jsonAttr = escapeHtml(JSON.stringify(v));
            return `<div class="oneof-variant-item" data-index="${i}" data-variant="${jsonAttr}" title="Click to load into fields above">
                <span class="oneof-variant-label">Variant ${i + 1}:</span>
                <span class="oneof-variant-summary">${summary}</span>
                <button class="oneof-remove-btn icon-btn" type="button" title="Remove variant">×</button>
            </div>`;
        }).join('');

        return `
            <div class="meta-section meta-section-parameter">
                <label class="section-label">Parameter</label>
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
            </div>
            <div class="meta-section meta-section-schema">
                <label class="section-label">Schema</label>
                <div class="schema-type-row">
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
                    <label class="meta-toggle-label nullable-toggle">
                        <input type="checkbox" class="meta-nullable" ${meta.nullable ? 'checked' : ''}>
                        Nullable
                    </label>
                </div>
                <div class="enum-editor">
                    <label class="section-sublabel">Enum Values</label>
                    <div class="enum-tags">${enumTags}</div>
                    <div class="enum-input-row">
                        <input type="text" class="enum-new-value" placeholder="Add enum value">
                        <button class="enum-add-btn" type="button">+</button>
                    </div>
                </div>
                <div class="constraint-type-hint" ${hasType ? 'style="display:none"' : ''}>
                    <span>Select a type to configure constraints</span>
                </div>
                <div class="constraint-group constraint-group-string" ${isStr ? '' : 'style="display:none"'}>
                    <label class="group-label">String</label>
                    <div class="meta-field full-width">
                        <label>Pattern</label>
                        <input type="text" class="meta-pattern" placeholder="e.g. ^[a-z]+$" value="${escapeHtml(meta.pattern || '')}">
                    </div>
                    <div class="constraint-fields-grid two-col">
                        <div class="meta-field">
                            <label>Min Length</label>
                            <input type="number" class="meta-min-length" placeholder="—" value="${meta.minLength !== undefined ? meta.minLength : ''}" min="0">
                        </div>
                        <div class="meta-field">
                            <label>Max Length</label>
                            <input type="number" class="meta-max-length" placeholder="—" value="${meta.maxLength !== undefined ? meta.maxLength : ''}" min="0">
                        </div>
                    </div>
                </div>
                <div class="constraint-group constraint-group-numeric" ${isNum ? '' : 'style="display:none"'}>
                    <label class="group-label">Numeric</label>
                    <div class="constraint-inline-pairs">
                        <div class="constraint-inline-pair">
                            <div class="meta-field">
                                <label>Minimum</label>
                                <input type="number" class="meta-minimum" placeholder="—" value="${meta.minimum !== undefined ? meta.minimum : ''}">
                            </div>
                            <label class="meta-toggle-label inline-toggle">
                                <input type="checkbox" class="meta-exclusive-minimum" ${meta.exclusiveMinimum ? 'checked' : ''}>
                                Exclusive
                            </label>
                        </div>
                        <div class="constraint-inline-pair">
                            <div class="meta-field">
                                <label>Maximum</label>
                                <input type="number" class="meta-maximum" placeholder="—" value="${meta.maximum !== undefined ? meta.maximum : ''}">
                            </div>
                            <label class="meta-toggle-label inline-toggle">
                                <input type="checkbox" class="meta-exclusive-maximum" ${meta.exclusiveMaximum ? 'checked' : ''}>
                                Exclusive
                            </label>
                        </div>
                    </div>
                    <div class="meta-field" style="max-width:140px">
                        <label>Multiple Of</label>
                        <input type="number" class="meta-multiple-of" placeholder="—" value="${meta.multipleOf !== undefined ? meta.multipleOf : ''}" min="0">
                    </div>
                </div>
                <div class="constraint-group constraint-group-array" ${isArr ? '' : 'style="display:none"'}>
                    <label class="group-label">Array</label>
                    <div class="constraint-inline-pairs">
                        <div class="meta-field">
                            <label>Min Items</label>
                            <input type="number" class="meta-min-items" placeholder="—" value="${meta.minItems !== undefined ? meta.minItems : ''}" min="0">
                        </div>
                        <div class="meta-field">
                            <label>Max Items</label>
                            <input type="number" class="meta-max-items" placeholder="—" value="${meta.maxItems !== undefined ? meta.maxItems : ''}" min="0">
                        </div>
                        <label class="meta-toggle-label inline-toggle" style="align-self:flex-end;padding-bottom:3px">
                            <input type="checkbox" class="meta-unique-items" ${meta.uniqueItems ? 'checked' : ''}>
                            Unique Items
                        </label>
                    </div>
                </div>
            </div>
            <div class="meta-section meta-section-variants">
                <label class="section-label">Variants (oneOf)</label>
                <div class="oneof-variants-list">${variantItems}</div>
                <button class="oneof-add-btn" type="button">+ Add Current as Variant</button>
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
                  (meta.enum && meta.enum.length > 0) || meta.deprecated || meta.nullable ||
                  meta.pattern || meta.minimum !== undefined || meta.maximum !== undefined ||
                  meta.exclusiveMinimum !== undefined || meta.exclusiveMaximum !== undefined ||
                  meta.minLength !== undefined || meta.maxLength !== undefined ||
                  meta.multipleOf !== undefined ||
                  meta.minItems !== undefined || meta.maxItems !== undefined || meta.uniqueItems ||
                  (meta.oneOf && meta.oneOf.length > 0));
    }

    /**
     * Build a compact summary string for a oneOf variant object.
     * @param {Object} v - Variant object with constraint properties
     * @returns {string} HTML summary
     */
    function variantSummary(v) {
        const parts = [];
        if (v.type) parts.push(`<b>type:</b> ${escapeHtml(v.type)}`);
        if (v.format) parts.push(`<b>format:</b> ${escapeHtml(v.format)}`);
        if (v.nullable) parts.push(`<b>nullable</b>`);
        if (v.pattern) parts.push(`<b>pattern:</b> <code>${escapeHtml(v.pattern)}</code>`);
        if (v.minimum !== undefined) parts.push(`<b>min${v.exclusiveMinimum ? ' (excl)' : ''}:</b> ${v.minimum}`);
        if (v.maximum !== undefined) parts.push(`<b>max${v.exclusiveMaximum ? ' (excl)' : ''}:</b> ${v.maximum}`);
        if (v.multipleOf !== undefined) parts.push(`<b>multipleOf:</b> ${v.multipleOf}`);
        if (v.minLength !== undefined) parts.push(`<b>minLen:</b> ${v.minLength}`);
        if (v.maxLength !== undefined) parts.push(`<b>maxLen:</b> ${v.maxLength}`);
        if (v.minItems !== undefined) parts.push(`<b>minItems:</b> ${v.minItems}`);
        if (v.maxItems !== undefined) parts.push(`<b>maxItems:</b> ${v.maxItems}`);
        if (v.uniqueItems) parts.push(`<b>uniqueItems</b>`);
        if (v.enum && v.enum.length > 0) parts.push(`<b>enum:</b> [${v.enum.map(e => escapeHtml(e)).join(', ')}]`);
        return parts.length > 0 ? parts.join(', ') : '<i>empty</i>';
    }

    /**
     * Read current metadata values from a detail panel DOM element.
     * All fields including constraints and oneOf variants are read from the DOM.
     * @param {HTMLElement} detailEl - The .param-meta-detail element
     * @param {string} [metaMapKey] - State metadata map key (e.g. '_paramsMeta')
     * @param {string} [itemKey] - The param/header key name
     * @returns {Object} metadata object
     */
    function readMetaFromPanel(detailEl, metaMapKey, itemKey) {
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

        // Read constraint fields
        const patternVal = detailEl.querySelector('.meta-pattern')?.value?.trim();
        if (patternVal) meta.pattern = patternVal;

        const minVal = detailEl.querySelector('.meta-minimum')?.value;
        if (minVal !== '' && minVal != null) meta.minimum = Number(minVal);

        const maxVal = detailEl.querySelector('.meta-maximum')?.value;
        if (maxVal !== '' && maxVal != null) meta.maximum = Number(maxVal);

        const exMinCheck = detailEl.querySelector('.meta-exclusive-minimum');
        if (exMinCheck?.checked) meta.exclusiveMinimum = true;

        const exMaxCheck = detailEl.querySelector('.meta-exclusive-maximum');
        if (exMaxCheck?.checked) meta.exclusiveMaximum = true;

        const multipleOfVal = detailEl.querySelector('.meta-multiple-of')?.value;
        if (multipleOfVal !== '' && multipleOfVal != null) meta.multipleOf = Number(multipleOfVal);

        const minLenVal = detailEl.querySelector('.meta-min-length')?.value;
        if (minLenVal !== '' && minLenVal != null) meta.minLength = Number(minLenVal);

        const maxLenVal = detailEl.querySelector('.meta-max-length')?.value;
        if (maxLenVal !== '' && maxLenVal != null) meta.maxLength = Number(maxLenVal);

        const minItemsVal = detailEl.querySelector('.meta-min-items')?.value;
        if (minItemsVal !== '' && minItemsVal != null) meta.minItems = Number(minItemsVal);

        const maxItemsVal = detailEl.querySelector('.meta-max-items')?.value;
        if (maxItemsVal !== '' && maxItemsVal != null) meta.maxItems = Number(maxItemsVal);

        const uniqueItemsCheck = detailEl.querySelector('.meta-unique-items');
        if (uniqueItemsCheck?.checked) meta.uniqueItems = true;

        const nullableCheck = detailEl.querySelector('.meta-nullable');
        if (nullableCheck?.checked) meta.nullable = true;

        // oneOf is managed via add/remove buttons, preserve from state
        const existing = (metaMapKey && itemKey && state[metaMapKey]?.[itemKey]) || {};
        if (existing.oneOf && existing.oneOf.length > 0) meta.oneOf = existing.oneOf;

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

        const metaMapKey = type === 'path' ? '_paramsMeta' : type === 'query' ? '_queryMeta' : '_headersMeta';
        const currentValue = oldEl.value || '';
        const enumValues = Array.isArray(meta.enum) && meta.enum.length > 0 ? meta.enum : null;
        const hasOneOf = meta.oneOf && meta.oneOf.length > 0;
        const isCurrentlySelect = oldEl.tagName === 'SELECT';
        const isCurrentlyInput = oldEl.tagName === 'INPUT';

        if (enumValues && hasOneOf) {
            // Combobox mode: enum + oneOf → input with custom dropdown
            const existingContainer = oldEl.closest('.combobox-container');
            if (existingContainer) {
                // Already a combobox — update options in-place
                updateComboboxOptions(existingContainer, enumValues);
                oldEl.title = meta.pattern
                    ? `Suggestions from enum; also accepts: ${meta.pattern}`
                    : 'Type or select a value';
            } else {
                // Replace select or plain input with combobox
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = buildComboboxHtml(itemKey, currentValue, enumValues, meta.pattern);
                const container = tempDiv.firstElementChild;
                oldEl.replaceWith(container);
                attachComboboxBehavior(container);
                const newInput = container.querySelector('input.value');
                attachValueListener(newInput, type, itemKey);
                attachBlurValidation(newInput, meta.pattern, metaMapKey, itemKey);
            }
        } else if (enumValues && !isCurrentlySelect) {
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
            // Remove any combobox container from previous combobox mode
            const prevContainer = oldEl.closest('.combobox-container');
            if (prevContainer) {
                prevContainer.replaceWith(sel);
            } else {
                oldEl.replaceWith(sel);
            }
            attachValueListener(sel, type, itemKey);
            updateValueState(type, itemKey, effectiveValue);
        } else if (!enumValues && isCurrentlySelect) {
            // Replace select with text input
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'value';
            inp.placeholder = 'Value or {{variable}}';
            inp.value = currentValue;
            if (meta.pattern) {
                inp.title = `Must match: ${meta.pattern}`;
            } else if (meta.format) {
                inp.title = `Format: ${meta.format}`;
            }
            oldEl.replaceWith(inp);
            attachValueListener(inp, type, itemKey);
            attachBlurValidation(inp, meta.pattern, metaMapKey, itemKey);
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
            // If previously a combobox, unwrap from container
            const prevContainer = inp.closest('.combobox-container');
            if (prevContainer) {
                prevContainer.replaceWith(inp);
            }
            inp.title = meta.pattern ? `Must match: ${meta.pattern}` : (meta.format ? `Format: ${meta.format}` : '');
            // Re-attach blur validation with pattern (regex), not format (semantic hint)
            attachBlurValidation(inp, meta.pattern, metaMapKey, itemKey);
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
     * Test whether a value passes validation for a given pattern and/or oneOf variants.
     * Returns true if valid, false if invalid.
     * - If pattern is provided and no oneOf, validates against pattern.
     * - If oneOf variants exist, value is valid if it matches ANY variant's constraints.
     * - Each variant can have: pattern, enum, minimum, maximum, exclusiveMinimum,
     *   exclusiveMaximum, minLength, maxLength.
     * @param {string} val - The input value
     * @param {string|null} pattern - Direct pattern (used when no oneOf)
     * @param {Array|null} oneOf - Array of variant constraint objects
     * @returns {boolean}
     */
    function isValueValid(val, pattern, oneOf) {
        if (oneOf && oneOf.length > 0) {
            // Valid if it matches ANY variant
            return oneOf.some(variant => matchesVariant(val, variant));
        }
        // Fall back to direct pattern check
        if (pattern) {
            try {
                return new RegExp(`^(${pattern})$`).test(val);
            } catch { return true; } // bad regex — don't flag
        }
        return true; // no constraints
    }

    /**
     * Check if a value satisfies a single oneOf variant's constraints.
     */
    function matchesVariant(val, variant) {
        // Type check — validate the value is compatible with the declared type
        if (variant.type) {
            switch (variant.type) {
                case 'integer':
                    if (!/^-?\d+$/.test(val)) return false;
                    break;
                case 'number':
                    if (isNaN(Number(val)) || val === '') return false;
                    break;
                case 'boolean':
                    if (val !== 'true' && val !== 'false') return false;
                    break;
                // 'string' and 'array' accept any text value
            }
        }
        // Pattern check
        if (variant.pattern) {
            try {
                if (!new RegExp(`^(${variant.pattern})$`).test(val)) return false;
            } catch { /* bad regex — skip */ }
        }
        // Enum check
        if (variant.enum && variant.enum.length > 0) {
            if (!variant.enum.includes(val)) return false;
        }
        // Numeric checks (only if value is numeric)
        const num = Number(val);
        if (!isNaN(num) && val !== '') {
            if (variant.minimum !== undefined) {
                // OpenAPI 3.0: exclusiveMinimum is a boolean modifier on minimum
                if (variant.exclusiveMinimum && num <= variant.minimum) return false;
                if (!variant.exclusiveMinimum && num < variant.minimum) return false;
            }
            if (variant.maximum !== undefined) {
                if (variant.exclusiveMaximum && num >= variant.maximum) return false;
                if (!variant.exclusiveMaximum && num > variant.maximum) return false;
            }
            if (variant.multipleOf !== undefined && variant.multipleOf !== 0 && num % variant.multipleOf !== 0) return false;
        }
        // Length checks
        if (variant.minLength !== undefined && val.length < variant.minLength) return false;
        if (variant.maxLength !== undefined && val.length > variant.maxLength) return false;
        return true;
    }

    /**
     * Attach blur validation for a text input.
     * Looks up the metadata map at validation time so oneOf changes are always reflected.
     * @param {string} metaMapKey - e.g. '_paramsMeta', '_queryMeta', '_headersMeta'
     * @param {string} itemKey - The param/header key
     */
    function attachBlurValidation(inp, pattern, metaMapKey, itemKey) {
        // Remove previous blur validator if any to prevent duplicate listeners
        if (inp._blurValidator) {
            inp.removeEventListener('blur', inp._blurValidator);
        }
        inp._blurValidator = () => {
            const val = inp.value;
            if (!val || val.startsWith('{{')) {
                inp.classList.remove('invalid');
                return;
            }
            const meta = (metaMapKey && itemKey && state[metaMapKey]?.[itemKey]) || {};
            const effectivePattern = pattern || meta.pattern || null;
            const oneOf = (meta.oneOf && meta.oneOf.length > 0) ? meta.oneOf : null;
            inp.classList.toggle('invalid', !isValueValid(val, effectivePattern, oneOf));
        };
        inp.addEventListener('blur', inp._blurValidator);
    }

    /**
     * Build combobox HTML (input + custom dropdown instead of native datalist).
     * Returns the HTML string for the combobox container.
     * @param {string} key - Unique key for this combobox
     * @param {string} value - Current value
     * @param {string[]} options - Suggestion options
     * @param {string|null} pattern - Regex pattern hint
     * @returns {string} HTML string
     */
    function buildComboboxHtml(key, value, options, pattern) {
        const patternHint = pattern
            ? ` title="Suggestions from enum; also accepts: ${escapeHtml(pattern)}"`
            : ' title="Type or select a value"';
        const optionsHtml = options.map(opt =>
            `<div class="combobox-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
        return `<span class="combobox-container"><input type="text" class="value" placeholder="Value or {{variable}}" value="${escapeHtml(value)}"${patternHint}><div class="combobox-dropdown hidden">${optionsHtml}</div></span>`;
    }

    /**
     * Attach combobox behavior to a container element.
     * Wires up focus/blur/input/keyboard/click to show/hide and filter the dropdown.
     * @param {HTMLElement} container - The .combobox-container element
     */
    function attachComboboxBehavior(container) {
        const input = container.querySelector('input.value');
        const dropdown = container.querySelector('.combobox-dropdown');
        if (!input || !dropdown) return;

        let highlightIndex = -1;

        function getVisibleOptions() {
            return [...dropdown.querySelectorAll('.combobox-option:not(.hidden-opt)')];
        }

        function filterOptions() {
            const val = input.value.toLowerCase();
            const allOpts = dropdown.querySelectorAll('.combobox-option');
            allOpts.forEach(opt => {
                const match = !val || opt.dataset.value.toLowerCase().includes(val);
                opt.classList.toggle('hidden-opt', !match);
                if (!match) opt.style.display = 'none';
                else opt.style.display = '';
            });
            highlightIndex = -1;
            updateHighlight();
        }

        function updateHighlight() {
            const opts = getVisibleOptions();
            opts.forEach((opt, i) => {
                opt.classList.toggle('highlighted', i === highlightIndex);
            });
            // Scroll highlighted item into view
            if (highlightIndex >= 0 && opts[highlightIndex]) {
                opts[highlightIndex].scrollIntoView({ block: 'nearest' });
            }
        }

        function showDropdown() {
            filterOptions();
            dropdown.classList.remove('hidden');
        }

        function hideDropdown() {
            dropdown.classList.add('hidden');
            highlightIndex = -1;
        }

        function selectOption(value) {
            input.value = value;
            hideDropdown();
            // Trigger input event so value change is picked up
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Show on focus
        input.addEventListener('focus', () => showDropdown());

        // Filter as user types
        input.addEventListener('input', () => showDropdown());

        // Hide on blur (delayed to allow click on option)
        input.addEventListener('blur', () => {
            setTimeout(() => hideDropdown(), 150);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            const opts = getVisibleOptions();
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (dropdown.classList.contains('hidden')) showDropdown();
                highlightIndex = Math.min(highlightIndex + 1, opts.length - 1);
                updateHighlight();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                highlightIndex = Math.max(highlightIndex - 1, 0);
                updateHighlight();
            } else if (e.key === 'Enter' && highlightIndex >= 0 && opts[highlightIndex]) {
                e.preventDefault();
                selectOption(opts[highlightIndex].dataset.value);
            } else if (e.key === 'Escape') {
                hideDropdown();
            }
        });

        // Click on option
        dropdown.addEventListener('mousedown', (e) => {
            // Use mousedown instead of click so it fires before blur
            const opt = e.target.closest('.combobox-option');
            if (opt) {
                e.preventDefault();
                selectOption(opt.dataset.value);
            }
        });
    }

    /**
     * Update the options in an existing combobox dropdown.
     * @param {HTMLElement} container - The .combobox-container element
     * @param {string[]} options - New option values
     */
    function updateComboboxOptions(container, options) {
        const dropdown = container.querySelector('.combobox-dropdown');
        if (!dropdown) return;
        dropdown.innerHTML = options.map(opt =>
            `<div class="combobox-option" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</div>`
        ).join('');
    }

    /**
     * Attach event listeners to a metadata detail panel
     * @param {HTMLElement} detailEl - The .param-meta-detail element
     * @param {HTMLElement} row - The parent .param-row element
     * @param {string} metaMapKey - '_headersMeta', '_queryMeta', or '_paramsMeta'
     * @param {string} itemKey - The key/name of the param/header
     * @param {HTMLElement} toggleBtn - The schema toggle button
     */

    /**
     * Show/hide constraint groups based on selected type.
     * No type → hide all groups and show hint; type selected → show relevant group(s).
     */
    function updateConstraintGroupVisibility(detailEl, selectedType) {
        const t = selectedType || '';
        const showStr = t === 'string';
        const showNum = t === 'integer' || t === 'number';
        const showArr = t === 'array';
        const hasType = !!t;
        const strGroup = detailEl.querySelector('.constraint-group-string');
        const numGroup = detailEl.querySelector('.constraint-group-numeric');
        const arrGroup = detailEl.querySelector('.constraint-group-array');
        const hint = detailEl.querySelector('.constraint-type-hint');
        if (hint) hint.style.display = hasType ? 'none' : '';
        if (strGroup) {
            strGroup.style.display = showStr ? '' : 'none';
            if (!showStr) clearGroupFields(strGroup);
        }
        if (numGroup) {
            numGroup.style.display = showNum ? '' : 'none';
            if (!showNum) clearGroupFields(numGroup);
        }
        if (arrGroup) {
            arrGroup.style.display = showArr ? '' : 'none';
            if (!showArr) clearGroupFields(arrGroup);
        }
    }

    /** Clear all input/checkbox values within a hidden constraint group */
    function clearGroupFields(group) {
        group.querySelectorAll('input[type="number"], input[type="text"]').forEach(inp => { inp.value = ''; });
        group.querySelectorAll('input[type="checkbox"]').forEach(chk => { chk.checked = false; });
    }

    function attachMetaListeners(detailEl, row, metaMapKey, itemKey, toggleBtn) {
        // Derive the param type from metaMapKey
        const type = metaMapKey === '_paramsMeta' ? 'path' : metaMapKey === '_queryMeta' ? 'query' : 'header';

        const updateMeta = () => {
            const meta = readMetaFromPanel(detailEl, metaMapKey, itemKey);
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
        detailEl.querySelector('.meta-type')?.addEventListener('change', () => {
            const selectedType = detailEl.querySelector('.meta-type')?.value || '';
            updateConstraintGroupVisibility(detailEl, selectedType);
            updateMeta();
        });
        detailEl.querySelector('.meta-format')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-description')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-required')?.addEventListener('change', updateMeta);
        detailEl.querySelector('.meta-deprecated')?.addEventListener('change', updateMeta);

        // Constraint fields — common
        detailEl.querySelector('.meta-nullable')?.addEventListener('change', updateMeta);
        // String constraints
        detailEl.querySelector('.meta-pattern')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-min-length')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-max-length')?.addEventListener('input', updateMeta);
        // Numeric constraints
        detailEl.querySelector('.meta-minimum')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-maximum')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-exclusive-minimum')?.addEventListener('change', updateMeta);
        detailEl.querySelector('.meta-exclusive-maximum')?.addEventListener('change', updateMeta);
        detailEl.querySelector('.meta-multiple-of')?.addEventListener('input', updateMeta);
        // Array constraints
        detailEl.querySelector('.meta-min-items')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-max-items')?.addEventListener('input', updateMeta);
        detailEl.querySelector('.meta-unique-items')?.addEventListener('change', updateMeta);

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

        // oneOf variant management
        const oneOfList = detailEl.querySelector('.oneof-variants-list');
        const oneOfAddBtn = detailEl.querySelector('.oneof-add-btn');

        /**
         * Read current constraint field values as a variant object.
         * Captures type, format, pattern, min/max, minLength/maxLength, and enum.
         */
        function readConstraintFieldsAsVariant() {
            const v = {};
            const t = detailEl.querySelector('.meta-type')?.value;
            if (t) v.type = t;
            const f = detailEl.querySelector('.meta-format')?.value?.trim();
            if (f) v.format = f;
            const nullableCheck = detailEl.querySelector('.meta-nullable');
            if (nullableCheck?.checked) v.nullable = true;
            const p = detailEl.querySelector('.meta-pattern')?.value?.trim();
            if (p) v.pattern = p;
            const min = detailEl.querySelector('.meta-minimum')?.value;
            if (min !== '' && min != null) v.minimum = Number(min);
            const max = detailEl.querySelector('.meta-maximum')?.value;
            if (max !== '' && max != null) v.maximum = Number(max);
            const exMinChk = detailEl.querySelector('.meta-exclusive-minimum');
            if (exMinChk?.checked) v.exclusiveMinimum = true;
            const exMaxChk = detailEl.querySelector('.meta-exclusive-maximum');
            if (exMaxChk?.checked) v.exclusiveMaximum = true;
            const multipleOf = detailEl.querySelector('.meta-multiple-of')?.value;
            if (multipleOf !== '' && multipleOf != null) v.multipleOf = Number(multipleOf);
            const minL = detailEl.querySelector('.meta-min-length')?.value;
            if (minL !== '' && minL != null) v.minLength = Number(minL);
            const maxL = detailEl.querySelector('.meta-max-length')?.value;
            if (maxL !== '' && maxL != null) v.maxLength = Number(maxL);
            const minI = detailEl.querySelector('.meta-min-items')?.value;
            if (minI !== '' && minI != null) v.minItems = Number(minI);
            const maxI = detailEl.querySelector('.meta-max-items')?.value;
            if (maxI !== '' && maxI != null) v.maxItems = Number(maxI);
            const uniqueCheck = detailEl.querySelector('.meta-unique-items');
            if (uniqueCheck?.checked) v.uniqueItems = true;
            // Enum from tags
            const enums = [];
            detailEl.querySelectorAll('.enum-tag').forEach(tag => {
                const text = tag.childNodes[0]?.textContent?.trim();
                if (text) enums.push(text);
            });
            if (enums.length > 0) v.enum = enums;
            return v;
        }

        /**
         * Populate constraint fields from a variant object.
         */
        function populateFieldsFromVariant(v) {
            const setVal = (sel, val) => { const el = detailEl.querySelector(sel); if (el) el.value = val ?? ''; };
            const setCheck = (sel, checked) => { const el = detailEl.querySelector(sel); if (el) el.checked = !!checked; };
            setVal('.meta-type', v.type || '');
            setVal('.meta-format', v.format || '');
            setCheck('.meta-nullable', v.nullable);
            setVal('.meta-pattern', v.pattern || '');
            setVal('.meta-minimum', v.minimum !== undefined ? v.minimum : '');
            setVal('.meta-maximum', v.maximum !== undefined ? v.maximum : '');
            setCheck('.meta-exclusive-minimum', v.exclusiveMinimum);
            setCheck('.meta-exclusive-maximum', v.exclusiveMaximum);
            setVal('.meta-multiple-of', v.multipleOf !== undefined ? v.multipleOf : '');
            setVal('.meta-min-length', v.minLength !== undefined ? v.minLength : '');
            setVal('.meta-max-length', v.maxLength !== undefined ? v.maxLength : '');
            setVal('.meta-min-items', v.minItems !== undefined ? v.minItems : '');
            setVal('.meta-max-items', v.maxItems !== undefined ? v.maxItems : '');
            setCheck('.meta-unique-items', v.uniqueItems);
            // Rebuild enum tags
            if (enumTagsContainer) {
                enumTagsContainer.innerHTML = '';
                (v.enum || []).forEach(val => {
                    const tag = document.createElement('span');
                    tag.className = 'enum-tag';
                    tag.innerHTML = `${escapeHtml(val)}<span class="remove-enum" title="Remove">×</span>`;
                    tag.querySelector('.remove-enum').addEventListener('click', () => { tag.remove(); updateMeta(); });
                    enumTagsContainer.appendChild(tag);
                });
            }
            // Update constraint group visibility based on loaded variant type
            updateConstraintGroupVisibility(detailEl, v.type || '');
        }

        /** Re-render the oneOf variant list from state */
        function rerenderOneOfList() {
            if (!oneOfList) return;
            const current = (state[metaMapKey]?.[itemKey]?.oneOf) || [];
            oneOfList.innerHTML = current.map((v, i) => {
                const summary = variantSummary(v);
                const jsonAttr = escapeHtml(JSON.stringify(v));
                return `<div class="oneof-variant-item" data-index="${i}" data-variant="${jsonAttr}" title="Click to load into fields above">
                    <span class="oneof-variant-label">Variant ${i + 1}:</span>
                    <span class="oneof-variant-summary">${summary}</span>
                    <button class="oneof-remove-btn icon-btn" type="button" title="Remove variant">×</button>
                </div>`;
            }).join('');
            wireAllOneOfItems();
        }

        function wireAllOneOfItems() {
            oneOfList?.querySelectorAll('.oneof-variant-item').forEach(item => {
                // Click to populate fields
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.oneof-remove-btn')) return; // don't trigger on remove click
                    try {
                        const v = JSON.parse(item.dataset.variant);
                        populateFieldsFromVariant(v);
                    } catch { /* ignore parse errors */ }
                });
                // Remove button
                item.querySelector('.oneof-remove-btn')?.addEventListener('click', () => {
                    const idx = Number(item.dataset.index);
                    const meta = state[metaMapKey]?.[itemKey];
                    if (meta?.oneOf) {
                        meta.oneOf.splice(idx, 1);
                        if (meta.oneOf.length === 0) delete meta.oneOf;
                    }
                    rerenderOneOfList();
                    // Update has-meta indicator
                    toggleBtn.classList.toggle('has-meta', hasMetaContent(state[metaMapKey]?.[itemKey] || {}));
                    if (markDirty) markDirty();
                });
            });
        }

        // Wire initial items
        wireAllOneOfItems();

        // Add current constraint values as a new oneOf variant
        oneOfAddBtn?.addEventListener('click', () => {
            const variant = readConstraintFieldsAsVariant();
            if (Object.keys(variant).length === 0) return; // nothing to add
            if (!state[metaMapKey]) state[metaMapKey] = {};
            if (!state[metaMapKey][itemKey]) state[metaMapKey][itemKey] = {};
            const meta = state[metaMapKey][itemKey];
            if (!meta.oneOf) meta.oneOf = [];
            meta.oneOf.push(variant);
            rerenderOneOfList();
            toggleBtn.classList.toggle('has-meta', hasMetaContent(meta));
            // Sync value element in case enum+oneOf triggers combobox mode
            syncValueElementFromMeta(row, type, itemKey, readMetaFromPanel(detailEl, metaMapKey, itemKey));
            if (markDirty) markDirty();
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
     * @param {boolean} combobox - If true, render options as a custom dropdown (editable input with suggestions) instead of strict select
     */
    function addParamRow(type, key, value, isNew = false, keyDisabled = false, enabled = true, options = null, pattern = null, combobox = false) {
        const container = type === 'path' ? elements.pathParams : elements.queryParams;
        const row = document.createElement('div');
        row.className = 'param-row';
        row.dataset.type = type;
        row.dataset.key = key;

        const checkboxHtml = type === 'query' 
            ? `<input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Include in request">`
            : '';

        // For path params with options, render a select box instead of input
        // Exception: combobox mode renders an input with custom dropdown for free-form + suggestions
        let valueHtml;
        let effectiveValue = value;
        if (options && options.length > 0 && !combobox) {
            // Strict select — value must be one of the options
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
        } else if (options && options.length > 0 && combobox) {
            // Combobox — editable input with custom dropdown suggestions
            valueHtml = buildComboboxHtml(key, value, options, pattern);
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

        // Wire up custom combobox dropdown if present
        const comboboxContainer = row.querySelector('.combobox-container');
        if (comboboxContainer) attachComboboxBehavior(comboboxContainer);

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

        // Add blur validation for inputs with regex pattern / oneOf
        if (valueElement.tagName === 'INPUT') {
            const metaMapKey = type === 'path' ? '_paramsMeta' : '_queryMeta';
            attachBlurValidation(valueElement, pattern, metaMapKey, key);
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
    function addHeaderRow(key, value, isNew = false, enabled = true, options = null, pattern = null, combobox = false) {
        const row = document.createElement('div');
        row.className = 'param-row';

        const checkboxHtml = `<input type="checkbox" class="param-checkbox" ${enabled ? 'checked' : ''} title="Enable/disable this header">`;

        // Render select dropdown for enum options, or text input otherwise
        // Exception: combobox mode renders an input with custom dropdown for free-form + suggestions
        let valueHtml;
        if (options && options.length > 0 && !combobox) {
            let effectiveValue = value;
            if (!value || !options.includes(value)) {
                effectiveValue = options[0];
            }
            const optionsHtml = options.map(opt => 
                `<option value="${escapeHtml(opt)}" ${opt === effectiveValue ? 'selected' : ''}>${escapeHtml(opt)}</option>`
            ).join('');
            valueHtml = `<select class="value">${optionsHtml}</select>`;
        } else if (options && options.length > 0 && combobox) {
            // Combobox — editable input with custom dropdown suggestions
            valueHtml = buildComboboxHtml(key, value, options, pattern);
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

        // Wire up custom combobox dropdown if present
        const comboboxContainer = row.querySelector('.combobox-container');
        if (comboboxContainer) attachComboboxBehavior(comboboxContainer);
        
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

        // Add blur validation for inputs with regex pattern / oneOf
        if (valueElement && valueElement.tagName === 'INPUT') {
            attachBlurValidation(valueElement, pattern, '_headersMeta', key);
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
        
        editor.updateOptions({ readOnly: false });
        
        const bodyEditorContainer = document.getElementById('body-editor');
        if (bodyEditorContainer) {
            bodyEditorContainer.classList.remove('disabled');
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

