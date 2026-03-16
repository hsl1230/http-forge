/**
 * Template Completion Provider Module
 * Single Responsibility: Provide IntelliSense for {{}} template expressions in Monaco editors
 *
 * Features:
 * - Environment, global, session, and collection variable suggestions
 * - Dynamic variable suggestions ($guid, $timestamp, etc.)
 * - Filter suggestions after pipe operator (upper, lower, hash, etc.)
 * - Context-aware triggering (only inside {{ }} blocks)
 */

// ─── Dynamic Variable Catalog ────────────────────────────────────────────────

const DYNAMIC_VARIABLE_COMPLETIONS = [
    { name: '$guid', description: 'Generate a UUID v4' },
    { name: '$uuid', description: 'Generate a UUID v4' },
    { name: '$randomUUID', description: 'Generate a UUID v4' },
    { name: '$randomInt', description: 'Random integer (0-999), or $randomInt(min, max)', snippet: '\\$randomInt($1, $2)' },
    { name: '$timestamp', description: 'Current Unix timestamp in milliseconds' },
    { name: '$timestamp_s', description: 'Current Unix timestamp in seconds' },
    { name: '$isoTimestamp', description: 'Current ISO 8601 timestamp' },
    { name: '$datetime', description: 'Current ISO 8601 datetime' },
    { name: '$date', description: 'Current date (YYYY-MM-DD)' },
    { name: '$time', description: 'Current time (HH:mm:ss)' },
    { name: '$randomString', description: 'Random alphanumeric string (default 10 chars)', snippet: '\\$randomString($1)' },
    { name: '$randomHexadecimal', description: 'Random hex string (default 10 chars)', snippet: '\\$randomHexadecimal($1)' },
    { name: '$randomEmail', description: 'Random email address' },
    { name: '$randomBoolean', description: 'Random true/false' },
    { name: '$base64Encode', description: 'Base64 encode text', snippet: '\\$base64Encode($1)' },
    { name: '$base64Decode', description: 'Base64 decode text', snippet: '\\$base64Decode($1)' },
    { name: '$urlEncode', description: 'URL encode text', snippet: '\\$urlEncode($1)' },
    { name: '$urlDecode', description: 'URL decode text', snippet: '\\$urlDecode($1)' },
];

// ─── Filter Catalog ──────────────────────────────────────────────────────────

const FILTER_COMPLETIONS = [
    // String filters
    { name: 'upper', description: 'Convert to UPPERCASE', category: 'String' },
    { name: 'lower', description: 'Convert to lowercase', category: 'String' },
    { name: 'trim', description: 'Remove leading/trailing whitespace', category: 'String' },
    { name: 'length', description: 'Get string or array length', category: 'String' },
    { name: 'substring', description: 'Extract substring(start, end)', snippet: 'substring($1, $2)', category: 'String' },
    { name: 'replace', description: 'Replace all occurrences: replace("search", "replacement")', snippet: 'replace("$1", "$2")', category: 'String' },
    { name: 'split', description: 'Split into array: split(",")', snippet: 'split("$1")', category: 'String' },
    { name: 'join', description: 'Join array to string: join(",")', snippet: 'join("$1")', category: 'String' },
    { name: 'removeQuotes', description: 'Remove all quote characters', category: 'String' },
    { name: 'removeSpaces', description: 'Remove all whitespace', category: 'String' },
    { name: 'format', description: 'Format template: format("Hello {0}")', snippet: 'format("$1")', category: 'String' },

    // Math filters
    { name: 'add', description: 'Add number: add(5)', snippet: 'add($1)', category: 'Math' },
    { name: 'subtract', description: 'Subtract number: subtract(5)', snippet: 'subtract($1)', category: 'Math' },
    { name: 'multiply', description: 'Multiply by number: multiply(2)', snippet: 'multiply($1)', category: 'Math' },
    { name: 'abs', description: 'Absolute value', category: 'Math' },

    // Encoding filters
    { name: 'btoa', description: 'Base64 encode', category: 'Encoding' },
    { name: 'atob', description: 'Base64 decode', category: 'Encoding' },
    { name: 'urlEncode', description: 'URL encode (percent-encoding)', category: 'Encoding' },
    { name: 'urlDecode', description: 'URL decode', category: 'Encoding' },

    // Hash filters
    { name: 'hash', description: 'Hash: hash("md5"|"sha256", "hex"|"base64")', snippet: 'hash("$1")', category: 'Hash' },
    { name: 'hmac', description: 'HMAC: hmac("secret", "sha256", "base64")', snippet: 'hmac("$1")', category: 'Hash' },

    // Array filters
    { name: 'first', description: 'First element of array', category: 'Array' },
    { name: 'last', description: 'Last element of array', category: 'Array' },
    { name: 'at', description: 'Element at index: at(0)', snippet: 'at($1)', category: 'Array' },
    { name: 'slice', description: 'Slice array: slice(start, end)', snippet: 'slice($1, $2)', category: 'Array' },
    { name: 'unique', description: 'Remove duplicate values', category: 'Array' },
    { name: 'filter', description: 'Filter array: filter(field>value)', snippet: 'filter($1)', category: 'Array' },
    { name: 'map', description: 'Extract fields: map("field")', snippet: 'map("$1")', category: 'Array' },

    // Object filters
    { name: 'prop', description: 'Get property: prop("key") or prop("a.b.c")', snippet: 'prop("$1")', category: 'Object' },
    { name: 'parseJSON', description: 'Parse JSON string to object', category: 'Object' },
    { name: 'stringify', description: 'Convert to JSON string', category: 'Object' },

    // Validation filters
    { name: 'isEmail', description: 'Check if value is a valid email', category: 'Validation' },
    { name: 'isUrl', description: 'Check if value is a valid URL', category: 'Validation' },
];

// ─── Completion Provider ─────────────────────────────────────────────────────

/**
 * Create a Monaco completion provider for template expressions.
 * Reads variables from the live `state` object on every invocation so that
 * newly-loaded environments / session vars are picked up automatically.
 *
 * @param {Object} state - Application state (resolvedEnvironment, globalVariables, …)
 * @returns {import('monaco-editor').languages.CompletionItemProvider}
 */
function createTemplateCompletionProvider(state) {
    return {
        triggerCharacters: ['{', '$', '|', ' '],

        provideCompletionItems(model, position) {
            // Text on the current line up to the cursor
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            // ── Detect template context ──────────────────────────────────
            const lastOpen = textUntilPosition.lastIndexOf('{{');
            const lastClose = textUntilPosition.lastIndexOf('}}');
            const insideTemplate = lastOpen !== -1 && lastOpen > lastClose;

            // Helper: range covering a partial word of `len` chars ending at cursor
            const rangeFor = (len) => ({
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - len,
                endColumn: position.column
            });

            // ── 1. Just typed "{{" — show all variables + dynamic vars ──
            if (textUntilPosition.endsWith('{{')) {
                const range = rangeFor(0);
                return {
                    suggestions: [
                        ...buildVariableSuggestions(state, range),
                        ...buildDynamicVarSuggestions(range),
                        buildAtSnippet(range)
                    ]
                };
            }

            if (!insideTemplate) {
                return { suggestions: [] };
            }

            // Content between "{{" and cursor
            const templateContent = textUntilPosition.substring(lastOpen + 2);

            // ── 2. After a pipe — suggest filters ────────────────────────
            const pipeMatch = templateContent.match(/\|\s*(\w*)$/);
            if (pipeMatch) {
                const partial = pipeMatch[1]; // partial filter name typed so far
                const range = rangeFor(partial.length);
                return { suggestions: buildFilterSuggestions(range) };
            }

            // ── 3. After "$" — suggest dynamic variables ─────────────────
            const dollarMatch = templateContent.match(/\$(\w*)$/);
            if (dollarMatch) {
                const partial = dollarMatch[1];
                // Range includes the "$" so the inserted text replaces it
                const range = rangeFor(partial.length + 1);
                return { suggestions: buildDynamicVarSuggestions(range) };
            }

            // ── 4. General typing inside {{ }} — variables + dynamic vars ─
            const word = model.getWordUntilPosition(position);
            const range = rangeFor(word.word.length);
            return {
                suggestions: [
                    ...buildVariableSuggestions(state, range),
                    ...buildDynamicVarSuggestions(range)
                ]
            };
        }
    };
}

// ─── Suggestion Builders ─────────────────────────────────────────────────────

/**
 * Build suggestions for environment / global / session / collection variables
 */
function buildVariableSuggestions(state, range) {
    const suggestions = [];
    const seen = new Set();

    const addScope = (vars, scopeLabel, sortPrefix) => {
        if (!vars || typeof vars !== 'object') return;
        for (const [key, value] of Object.entries(vars)) {
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push({
                label: key,
                kind: monaco.languages.CompletionItemKind.Variable,
                insertText: key,
                detail: `(${scopeLabel}) ${truncate(String(value ?? ''), 60)}`,
                documentation: {
                    value: `**${key}**  \nScope: *${scopeLabel}*  \nValue: \`${String(value ?? '')}\``
                },
                range,
                sortText: sortPrefix + key.toLowerCase()
            });
        }
    };

    // Priority order: environment > collection > global > session
    addScope(state.resolvedEnvironment?.variables, 'env', 'a');
    addScope(state.collectionVariables, 'collection', 'b');
    addScope(state.globalVariables, 'global', 'c');
    addScope(state.sessionVariables, 'session', 'd');

    return suggestions;
}

/**
 * Build suggestions for $dynamic variables
 */
function buildDynamicVarSuggestions(range) {
    return DYNAMIC_VARIABLE_COMPLETIONS.map((dv, i) => {
        const hasSnippet = !!dv.snippet;
        return {
            label: dv.name,
            kind: monaco.languages.CompletionItemKind.Constant,
            insertText: hasSnippet ? dv.snippet : dv.name,
            insertTextRules: hasSnippet
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            detail: dv.description,
            documentation: { value: `**${dv.name}**  \n${dv.description}` },
            range,
            sortText: 'e' + String(i).padStart(2, '0')
        };
    });
}

/**
 * Build suggestions for filter names (after pipe)
 */
function buildFilterSuggestions(range) {
    return FILTER_COMPLETIONS.map((f, i) => {
        const hasSnippet = !!f.snippet;
        return {
            label: f.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: hasSnippet ? f.snippet : f.name,
            insertTextRules: hasSnippet
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            detail: `[${f.category}] ${f.description}`,
            documentation: { value: `**${f.name}**  \nCategory: *${f.category}*  \n${f.description}` },
            range,
            sortText: String(i).padStart(2, '0')
        };
    });
}

/**
 * Build the "@ | filter" snippet suggestion
 */
function buildAtSnippet(range) {
    return {
        label: '@ | filter',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '@ | ${1:filterName}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: 'No-input filter expression',
        documentation: { value: 'Insert a no-input filter expression: `{{@ | filterName}}`' },
        range,
        sortText: 'zz'
    };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function truncate(str, maxLen) {
    return str.length <= maxLen ? str : str.substring(0, maxLen - 1) + '…';
}

// ─── Registration ────────────────────────────────────────────────────────────

/**
 * Register template completion providers for all languages used in editors.
 *
 * @param {Object} state - Live application state
 * @returns {import('monaco-editor').IDisposable[]} Disposables (call .dispose() to unregister)
 */
function registerTemplateCompletionProviders(state) {
    const provider = createTemplateCompletionProvider(state);
    const languages = ['json', 'plaintext', 'xml', 'html', 'javascript'];
    const disposables = [];

    for (const lang of languages) {
        try {
            disposables.push(
                monaco.languages.registerCompletionItemProvider(lang, provider)
            );
        } catch (e) {
            console.warn(`[TemplateCompletion] Could not register for "${lang}":`, e.message);
        }
    }

    return disposables;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { registerTemplateCompletionProviders };
