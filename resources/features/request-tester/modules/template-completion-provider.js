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


/**
 * Build template suggestions for a text prefix.
 *
 * Returns plain suggestion objects plus the number of characters that should be
 * replaced when one is accepted. This is shared by Monaco editors and plain
 * HTML inputs.
 */

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

            const result = getTemplateSuggestions(state, textUntilPosition);
            if (!result.suggestions.length) {
                return { suggestions: [] };
            }

            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - result.replaceLength,
                endColumn: position.column
            };

            const monacoKind = (kind) => {
                const kindMap = {
                    variable: monaco.languages.CompletionItemKind.Variable,
                    constant: monaco.languages.CompletionItemKind.Constant,
                    function: monaco.languages.CompletionItemKind.Function,
                    snippet: monaco.languages.CompletionItemKind.Snippet,
                };
                return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
            };

            return {
                suggestions: result.suggestions.map((suggestion, i) => ({
                    label: suggestion.label,
                    kind: monacoKind(suggestion.kind),
                    insertText: suggestion.monacoInsertText || suggestion.insertText,
                    insertTextRules: suggestion.snippet
                        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                        : undefined,
                    detail: suggestion.detail || '',
                    documentation: suggestion.documentation,
                        sortText: suggestion.sortText || String(i).padStart(3, '0')
                }))
            };
        }    };
}

// ─── Suggestion Builders ─────────────────────────────────────────────────────

/**
 * Strip the internal typed-value marker (\x1E) before showing a variable value
 * in completion, hover, or tooltip text. The marker is still required for
 * template resolution of typed script variables.
 */
export function displayVariableValue(value) {
    if (typeof value === 'string' && value.charCodeAt(0) === 0x1E) {
        const json = value.slice(1);
        return json === 'undefined' ? '' : json;
    }
    return value;
}

/**
 * Build suggestions for environment / global / session / collection variables
 */
function buildVariableSuggestions(state) {
    const suggestions = [];
    const seen = new Set();

    const addScope = (vars, scopeLabel, sortPrefix) => {
        if (!vars || typeof vars !== 'object') return;
        for (const [key, value] of Object.entries(vars)) {
            if (seen.has(key)) continue;
            seen.add(key);
            suggestions.push({
                label: key,
                kind: 'variable',
                insertText: key,
                monacoInsertText: key,
                snippet: false,
                detail: `(${scopeLabel}) ${truncate(String(displayVariableValue(value) ?? ''), 60)}`,
                documentation: {
                    value: `**${key}**  \nScope: *${scopeLabel}*  \nValue: \`${String(displayVariableValue(value) ?? '')}\``
                },
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
function buildDynamicVarSuggestions() {
    return DYNAMIC_VARIABLE_COMPLETIONS.map((dv, i) => {
        const hasSnippet = !!dv.snippet;
        return {
            label: dv.name,
            kind: 'constant',
            insertText: dv.name,
            monacoInsertText: hasSnippet ? dv.snippet : dv.name,
            snippet: hasSnippet,
            detail: dv.description,
            documentation: { value: `**${dv.name}**  \n${dv.description}` },
            sortText: 'e' + String(i).padStart(2, '0')
        };
    });
}

/**
 * Build suggestions for filter names (after pipe)
 */
function buildFilterSuggestions() {
    return FILTER_COMPLETIONS.map((f, i) => {
        const hasSnippet = !!f.snippet;
        return {
            label: f.name,
            kind: 'function',
            insertText: f.name,
            monacoInsertText: hasSnippet ? f.snippet : f.name,
            snippet: hasSnippet,
            detail: `[${f.category}] ${f.description}`,
            documentation: { value: `**${f.name}**  \nCategory: *${f.category}*  \n${f.description}` },
            sortText: String(i).padStart(2, '0')
        };
    });
}

/**
 * Build the "@ | filter" snippet suggestion
 */
function buildAtSnippet() {
    return {
        label: '@ | filter',
        kind: 'snippet',
        insertText: '@ | filterName',
        monacoInsertText: '@ | ${1:filterName}',
        snippet: true,
        detail: 'No-input filter expression',
        documentation: { value: 'Insert a no-input filter expression: `{{@ | filterName}}`' },
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

// ─── Plain suggestion builder for non-Monaco inputs ──────────────────────────

/**
 * Build template suggestions for a text prefix.
 */
function getTemplateSuggestions(state, textUntilPosition) {
    const lastOpen = textUntilPosition.lastIndexOf('{{');
    const lastClose = textUntilPosition.lastIndexOf('}}');
    const insideTemplate = lastOpen !== -1 && lastOpen > lastClose;

    if (textUntilPosition.endsWith('{{')) {
        return {
            replaceLength: 0,
            suggestions: [
                ...buildVariableSuggestions(state),
                ...buildDynamicVarSuggestions(),
                buildAtSnippet()
            ]
        };
    }

    if (!insideTemplate) {
        return { replaceLength: 0, suggestions: [] };
    }

    const templateContent = textUntilPosition.substring(lastOpen + 2);

    const pipeMatch = templateContent.match(/\\|\\s*(\\w*)$/);
    if (pipeMatch) {
        return {
            replaceLength: pipeMatch[1].length,
            suggestions: buildFilterSuggestions()
        };
    }

    const dollarMatch = templateContent.match(/\\$(\\w*)$/);
    if (dollarMatch) {
        return {
            replaceLength: dollarMatch[1].length + 1,
            suggestions: buildDynamicVarSuggestions()
        };
    }

    const wordMatch = templateContent.match(/(\\w*)$/);
    const partial = wordMatch ? wordMatch[1] : '';
    return {
        replaceLength: partial.length,
        suggestions: [
            ...buildVariableSuggestions(state),
            ...buildDynamicVarSuggestions()
        ]
    };
}

// ─── Hover Provider ──────────────────────────────────────────────────────────

/**
 * Register hover providers for template expressions.
 *
 * @param {Object} state - Live application state
 * @returns {import('monaco-editor').IDisposable[]} Disposables
 */
function registerTemplateHoverProviders(state) {
    const languages = ['json', 'plaintext', 'xml', 'html', 'javascript'];
    const disposables = [];

    const getVariableEntries = (name) => {
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
    };

    const findCatalogEntry = (catalog, name) => catalog.find((entry) => entry.name === name);

    for (const lang of languages) {
        try {
            disposables.push(monaco.languages.registerHoverProvider(lang, {
                provideHover(model, position) {
                    const text = model.getValue();
                    const offset = model.getOffsetAt(position);
                    const regex = /\\{\\{([\\s\\S]*?)\\}\\}/g;
                    let match;

                    while ((match = regex.exec(text)) !== null) {
                        const contentStart = match.index + 2;
                        const contentEnd = match.index + match[0].length - 2;
                        if (offset < contentStart || offset > contentEnd) {
                            continue;
                        }

                        const content = match[1];
                        const relativeOffset = offset - contentStart;
                        const tokenRegex = /\$?\w+/g;
                        let tokenMatch;
                        let token = null;
                        let tokenStart = -1;
                        let tokenEnd = -1;

                        while ((tokenMatch = tokenRegex.exec(content)) !== null) {
                            const start = tokenMatch.index;
                            const end = start + tokenMatch[0].length;
                            if (relativeOffset >= start && relativeOffset <= end) {
                                token = tokenMatch[0];
                                tokenStart = start;
                                tokenEnd = end;
                                break;
                            }
                        }

                        if (!token) {
                            return null;
                        }

                        const lastPipe = content.lastIndexOf('|');
                        const isFilter = lastPipe !== -1 && tokenStart > lastPipe;
                        const isDynamic = token.startsWith('$');
                        const lines = [];

                        if (isFilter) {
                            const entry = findCatalogEntry(FILTER_COMPLETIONS, token);
                            lines.push(`**${token}** — ${entry ? entry.description : 'Template filter'}`);
                            if (entry?.category) {
                                lines.push(`Category: *${entry.category}*`);
                            }
                        } else if (isDynamic) {
                            const entry = findCatalogEntry(DYNAMIC_VARIABLE_COMPLETIONS, token);
                            lines.push(`**${token}** — ${entry ? entry.description : 'Dynamic variable'}`);
                        } else {
                            const entries = getVariableEntries(token);
                            if (entries.length === 0) {
                                lines.push(`**${token}** — _(not defined)_`);
                            } else if (entries.length === 1) {
                                lines.push(`**${token}** = \`${String(displayVariableValue(entries[0][1]))}\``);
                                lines.push(`Scope: *${entries[0][0]}*`);
                            } else {
                                lines.push(`**${token}**`);
                                for (const [scope, value] of entries) {
                                    lines.push(`- *${scope}*: \`${String(displayVariableValue(value))}\``);
                                }
                            }
                        }

                        const startPos = model.getPositionAt(contentStart + tokenStart);
                        const endPos = model.getPositionAt(contentStart + tokenEnd);
                        return {
                            range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
                            contents: [{ value: lines.join('\\n') }]
                        };
                    }

                    return null;
                }
            }));
        } catch (e) {
            console.warn(`[TemplateHover] Could not register for "${lang}":`, e.message);
        }
    }

    return disposables;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { registerTemplateCompletionProviders, getTemplateSuggestions, registerTemplateHoverProviders, DYNAMIC_VARIABLE_COMPLETIONS, FILTER_COMPLETIONS };

// Expose helpers for non-bundled editors (folder/collection)
if (typeof window !== 'undefined') {
    window.registerHttpForgeTemplateCompletionProviders = registerTemplateCompletionProviders;
    window.getHttpForgeTemplateSuggestions = getTemplateSuggestions;
    window.registerHttpForgeTemplateHoverProviders = registerTemplateHoverProviders;
    window.DYNAMIC_VARIABLE_COMPLETIONS = DYNAMIC_VARIABLE_COMPLETIONS;
    window.FILTER_COMPLETIONS = FILTER_COMPLETIONS;
}
