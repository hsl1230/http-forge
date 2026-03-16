/**
 * GraphQL Language Definition for Monaco Editor
 * 
 * Single Responsibility: Register GraphQL as a Monaco language with
 * Monarch tokenizer for syntax highlighting and language configuration
 * for bracket matching, comments, and auto-closing pairs.
 * 
 * Zero Dependencies: Uses only the Monaco API (globally available in webview).
 */

/**
 * Register the GraphQL language with Monaco
 * @param {typeof import('monaco-editor')} monaco
 */
export function registerGraphQLLanguage(monaco) {
    // Don't register twice
    const languages = monaco.languages.getLanguages();
    if (languages.some(l => l.id === 'graphql')) return;

    // Register language ID
    monaco.languages.register({
        id: 'graphql',
        extensions: ['.graphql', '.gql'],
        aliases: ['GraphQL', 'graphql'],
        mimetypes: ['application/graphql']
    });

    // ─── Monarch Tokenizer ──────────────────────────

    monaco.languages.setMonarchTokensProvider('graphql', {
        keywords: [
            'query', 'mutation', 'subscription', 'fragment', 'on',
            'type', 'interface', 'union', 'enum', 'input', 'scalar',
            'extend', 'implements', 'directive', 'schema',
            'true', 'false', 'null'
        ],

        typeKeywords: ['Int', 'Float', 'String', 'Boolean', 'ID'],

        operators: ['!', '=', ':', '|', '&', '...'],

        // Symbol patterns
        symbols: /[=!:@|&]+/,

        // Escape sequences for strings
        escapes: /\\(?:["\\/bfnrt]|u[0-9A-Fa-f]{4})/,

        tokenizer: {
            root: [
                // Comments (# to end of line)
                [/#.*$/, 'comment'],

                // Block strings (triple-quoted)
                [/"""/, 'string', '@blockString'],

                // Regular strings
                [/"/, 'string', '@string'],

                // Numbers
                [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],

                // Variables ($name)
                [/\$[a-zA-Z_]\w*/, 'variable'],

                // Directives (@name)
                [/@[a-zA-Z_]\w*/, 'annotation'],

                // Spread operator
                [/\.\.\./, 'delimiter'],

                // Type references (PascalCase identifiers)
                [/[A-Z][a-zA-Z_0-9]*/, {
                    cases: {
                        '@typeKeywords': 'type',
                        '@default': 'type.identifier'
                    }
                }],

                // Keywords and field names (camelCase/lowercase identifiers)
                [/[a-z_]\w*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@default': 'identifier'
                    }
                }],

                // Brackets and punctuation
                [/[{}()\[\]]/, '@brackets'],
                [/[!:=|&]/, 'delimiter'],

                // Whitespace
                [/\s+/, 'white'],
            ],

            string: [
                [/[^"\\]+/, 'string'],
                [/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop'],
            ],

            blockString: [
                [/"""/, 'string', '@pop'],
                [/./, 'string'],
            ],
        }
    });

    // ─── Language Configuration ─────────────────────

    monaco.languages.setLanguageConfiguration('graphql', {
        comments: {
            lineComment: '#'
        },

        brackets: [
            ['{', '}'],
            ['(', ')'],
            ['[', ']']
        ],

        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"', notIn: ['string'] },
            { open: '"""', close: '"""', notIn: ['string'] },
        ],

        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '[', close: ']' },
            { open: '"', close: '"' },
        ],

        folding: {
            markers: {
                start: /^\s*#\s*region\b/,
                end: /^\s*#\s*endregion\b/
            }
        },

        indentationRules: {
            increaseIndentPattern: /^\s*.*\{\s*$/,
            decreaseIndentPattern: /^\s*\}/
        },

        onEnterRules: [
            {
                // After opening brace, indent
                beforeText: /^\s*.*\{\s*$/,
                afterText: /^\s*\}/,
                action: { indentAction: monaco.languages.IndentAction.IndentOutdent }
            },
            {
                // After opening brace without closing
                beforeText: /^\s*.*\{\s*$/,
                action: { indentAction: monaco.languages.IndentAction.Indent }
            }
        ]
    });
}
