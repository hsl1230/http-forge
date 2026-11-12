/**
 * Template Input Autocomplete
 *
 * Lightweight autocomplete for plain HTML inputs (URL, params, headers, …).
 * Monaco editors already have template completion; this brings the same
 * variable / dynamic-variable / filter suggestions to ordinary inputs.
 */

import { getTemplateSuggestions, DYNAMIC_VARIABLE_COMPLETIONS, FILTER_COMPLETIONS } from '../features/request-tester/modules/template-completion-provider.js';

const ATTACHED = new WeakSet();
let dropdown = null;
let activeInput = null;
let suggestions = [];
let selectedIndex = 0;
let replaceLength = 0;
let justSelected = false;

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getTemplateContext(textUntilCursor) {
    const lastOpen = textUntilCursor.lastIndexOf('{{');
    const lastClose = textUntilCursor.lastIndexOf('}}');
    const insideTemplate = lastOpen !== -1 && lastOpen > lastClose;

    if (textUntilCursor.endsWith('{{')) {
        return { inside: true, partial: '', replaceLength: 0 };
    }
    if (!insideTemplate) {
        return null;
    }

    const templateContent = textUntilCursor.substring(lastOpen + 2);

    const pipeMatch = templateContent.match(/\|\s*(\w*)$/);
    if (pipeMatch) {
        return { inside: true, partial: pipeMatch[1], replaceLength: pipeMatch[1].length, mode: 'filter' };
    }

    const dollarMatch = templateContent.match(/\$(\w*)$/);
    if (dollarMatch) {
        return { inside: true, partial: '$' + dollarMatch[1], replaceLength: dollarMatch[1].length + 1, mode: 'dynamic' };
    }

    const wordMatch = templateContent.match(/(\w*)$/);
    const partial = wordMatch ? wordMatch[1] : '';
    return { inside: true, partial, replaceLength: partial.length, mode: 'variable' };
}

function ensureDropdown() {
    if (dropdown) return dropdown;
    dropdown = document.createElement('div');
    dropdown.className = 'template-input-autocomplete';
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '100000';
    dropdown.style.display = 'none';
    dropdown.style.maxHeight = '220px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.background = 'var(--vscode-editorWidget-background, #252526)';
    dropdown.style.border = '1px solid var(--vscode-editorWidget-border, #454545)';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.35)';
    dropdown.style.fontSize = '12px';
    dropdown.style.minWidth = '180px';
    document.body.appendChild(dropdown);

    dropdown.addEventListener('mousedown', (event) => {
        event.preventDefault();
    });

    return dropdown;
}

function hideDropdown() {
    if (dropdown) dropdown.style.display = 'none';
    activeInput = null;
    suggestions = [];
    selectedIndex = 0;
}

function positionDropdown(input) {
    const rect = input.getBoundingClientRect();
    const dropdownEl = ensureDropdown();
    dropdownEl.style.left = `${rect.left}px`;
    dropdownEl.style.top = `${rect.bottom + 2}px`;
    dropdownEl.style.width = `${Math.max(rect.width, 180)}px`;

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 240 && rect.top > 240) {
        dropdownEl.style.top = `${rect.top - dropdownEl.offsetHeight - 2}px`;
    }
}

function filterSuggestions(list, partial) {
    if (!partial) return list.slice(0, 12);
    const lower = partial.toLowerCase();
    return list
        .filter((suggestion) => String(suggestion.label || '').toLowerCase().startsWith(lower))
        .slice(0, 12);
}

function renderDropdown(input) {
    const dropdownEl = ensureDropdown();
    dropdownEl.innerHTML = suggestions.map((suggestion, index) => {
        const selectedClass = index === selectedIndex ? ' template-autocomplete-selected' : '';
        return `
            <div class="template-autocomplete-item${selectedClass}" data-index="${index}">
                <span class="template-autocomplete-label">${escapeHtml(suggestion.label)}</span>
                <span class="template-autocomplete-detail">${escapeHtml(suggestion.detail || '')}</span>
            </div>
        `;
    }).join('');

    dropdownEl.querySelectorAll('.template-autocomplete-item').forEach((item) => {
        item.addEventListener('mousedown', (event) => {
            event.preventDefault();
            const index = Number(item.dataset.index);
            if (!Number.isNaN(index)) {
                selectSuggestion(input, suggestions[index]);
            }
        });
    });

    positionDropdown(input);
    dropdownEl.style.display = 'block';
}

function updateAutocomplete(input) {
    if (justSelected) {
        justSelected = false;
        hideDropdown();
        return;
    }

    const cursor = input.selectionStart ?? input.value.length;
    const textUntilCursor = input.value.slice(0, cursor);
    const context = getTemplateContext(textUntilCursor);

    if (!context || !context.inside) {
        hideDropdown();
        return;
    }

    const state = typeof window.__templateInputStateGetter === 'function'
        ? window.__templateInputStateGetter()
        : (window.__requestTesterApp?.state || {});
    const result = getTemplateSuggestions(state, textUntilCursor);
    const filtered = filterSuggestions(result.suggestions || [], context.partial);
    if (!filtered.length) {
        hideDropdown();
        return;
    }

    activeInput = input;
    suggestions = filtered;
    selectedIndex = 0;
    replaceLength = result.replaceLength || 0;
    renderDropdown(input);
}

function selectSuggestion(input, suggestion) {
    if (!suggestion) return;
    const cursor = input.selectionStart ?? input.value.length;
    const value = input.value;
    const textUntilCursor = value.slice(0, cursor);
    const start = cursor - replaceLength;
    const inserted = suggestion.label;
    let newValue = value.slice(0, start) + inserted + value.slice(cursor);
    let newCursor = start + inserted.length;

    const afterCursor = newValue.slice(newCursor);
    if (!afterCursor.startsWith('}}')) {
        newValue = newValue.slice(0, newCursor) + '}}' + newValue.slice(newCursor);
    }

    input.value = newValue;
    input.selectionStart = input.selectionEnd = newCursor;
    justSelected = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    hideDropdown();
}

function handleKeydown(event) {
    if (!dropdown || dropdown.style.display === 'none' || activeInput !== event.target) {
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex = (selectedIndex + 1) % suggestions.length;
        renderDropdown(activeInput);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
        renderDropdown(activeInput);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        selectSuggestion(activeInput, suggestions[selectedIndex]);
    } else if (event.key === 'Escape') {
        hideDropdown();
    }
}

function attach(input) {
    if (!input || ATTACHED.has(input)) return;
    ATTACHED.add(input);
    updateInputTitle(input);
    input.addEventListener('input', () => {
        updateAutocomplete(input);
        updateInputTitle(input);
    });
    input.addEventListener('click', () => updateAutocomplete(input));
    input.addEventListener('focus', () => {
        updateAutocomplete(input);
        updateInputTitle(input);
    });
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (activeInput === input) hideDropdown();
        }, 150);
    });
}

function getTemplateState() {
    if (typeof window.getTemplateState === 'function') {
        return window.getTemplateState() || {};
    }
    return window.__requestTesterApp?.state || {};
}

function getVariableEntries(state, name) {
    const entries = [];
    const resolved = state?.resolvedEnvironment?.variables?.[name];
    if (resolved !== undefined) entries.push(['env', resolved]);
    const collection = state?.collectionVariables?.[name];
    if (collection !== undefined) entries.push(['collection', collection]);
    const global = state?.globalVariables?.[name];
    if (global !== undefined) entries.push(['global', global]);
    const session = state?.sessionVariables?.[name];
    if (session !== undefined) entries.push(['session', session]);
    return entries;
}

function updateInputTitle(input) {
    if (!input) return;
    const state = getTemplateState();
    const value = input.value || '';
    const regex = /\\{\\{([\\s\\S]*?)\\}\\}/g;
    const lines = [];
    let match;
    while ((match = regex.exec(value)) !== null) {
        const content = match[1].trim();
        const variablePart = content.split('|')[0].trim();
        if (!/^\\$?\\w+$/.test(variablePart)) continue;

        const entries = getVariableEntries(state, variablePart);
        if (entries.length) {
            entries.forEach(([scope, val]) => lines.push(`${variablePart} (${scope}) = ${String(val)}`));
        } else if (variablePart.startsWith('$')) {
            const dv = (DYNAMIC_VARIABLE_COMPLETIONS || []).find((item) => item.name === variablePart);
            lines.push(`${variablePart} — ${dv ? dv.description : 'Dynamic variable'}`);
        } else {
            lines.push(`${variablePart} — (not defined)`);
        }
    }
    input.title = lines.join('\\n');
}

function isTemplateInput(input) {
    return input && (
        input.id === 'request-path-input' ||
        input.classList.contains('value')
    );
}

function attachAll() {
    document.querySelectorAll('input.value, #request-path-input').forEach((input) => {
        if (isTemplateInput(input)) {
            updateInputTitle(input);
            attach(input);
        }
    });
}

export function initTemplateInputAutocomplete(stateOrGetter) {
    const getState = typeof stateOrGetter === 'function'
        ? stateOrGetter
        : () => stateOrGetter || {};

    window.__templateInputStateGetter = getState;

    attachAll();
    const observer = new MutationObserver(() => attachAll());
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('click', (event) => {
        if (dropdown && !dropdown.contains(event.target) && event.target !== activeInput) {
            hideDropdown();
        }
    });
}

if (typeof window !== 'undefined') {
    window.initTemplateInputAutocomplete = initTemplateInputAutocomplete;
}