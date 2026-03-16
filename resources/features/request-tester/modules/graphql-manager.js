/**
 * GraphQL Schema Manager Module
 * 
 * Single Responsibility: Manage GraphQL schema state in the webview — 
 * schema fetching, caching, Monaco completion registration, Schema Explorer 
 * rendering, and operation selector updates.
 * 
 * Follows SOLID:
 * - SRP: Only handles GraphQL schema concerns
 * - OCP: Completion items come from backend, this module just wires them in
 * - DIP: Communicates with backend via vscode.postMessage abstraction
 */

/**
 * Create a GraphQL schema manager instance
 * @param {Object} options
 * @param {Object} options.state - Application state
 * @param {Object} options.elements - DOM elements
 * @param {Object} options.vscode - VS Code API
 * @param {Object} options.editorsManager - Monaco editors manager
 * @param {Function} options.getRequestUrl - Returns current request URL
 * @param {Function} options.getHeaders - Returns current request headers
 * @returns {Object} GraphQL schema manager interface
 */
export function createGraphQLSchemaManager({ state, elements, vscode, editorsManager, getRequestUrl, getHeaders }) {
    /** @type {any|null} Cached schema data from backend */
    let schemaData = null;
    /** @type {any|null} Monaco completion provider disposable */
    let completionDisposable = null;
    /** @type {string|null} Endpoint URL the schema was fetched from */
    let schemaEndpointUrl = null;
    /** @type {boolean} Whether a fetch is in progress */
    let isFetching = false;

    // ─── DOM References ──────────────────────────────

    const fetchSchemaBtn = document.getElementById('graphql-fetch-schema');
    const operationSelect = document.getElementById('graphql-operation-select');
    const schemaStatus = document.getElementById('graphql-schema-status');
    const toggleExplorerBtn = document.getElementById('graphql-toggle-explorer');
    const explorerPanel = document.getElementById('graphql-explorer');
    const typeSearch = document.getElementById('graphql-type-search');
    const typeTree = document.getElementById('graphql-type-tree');

    // ─── Initialization ──────────────────────────────

    function initialize() {
        // Fetch Schema button
        fetchSchemaBtn?.addEventListener('click', () => fetchSchema());

        // Toggle Schema Explorer
        toggleExplorerBtn?.addEventListener('click', () => {
            if (explorerPanel) {
                const isHidden = explorerPanel.classList.contains('hidden');
                explorerPanel.classList.toggle('hidden');
                toggleExplorerBtn.classList.toggle('active');

                // If showing explorer, switch to Query tab
                if (isHidden) {
                    document.querySelectorAll('.graphql-tab-vertical').forEach(t => {
                        t.classList.remove('active');
                        t.setAttribute('aria-selected', 'false');
                    });
                    document.querySelectorAll('.graphql-tab-panel').forEach(p => p.classList.remove('active'));
                    const queryTab = document.querySelector('.graphql-tab-vertical[data-graphql-tab="query"]');
                    if (queryTab) {
                        queryTab.classList.add('active');
                        queryTab.setAttribute('aria-selected', 'true');
                    }
                    document.getElementById('graphql-query-panel')?.classList.add('active');
                }

                // Re-layout editors when explorer toggles
                requestAnimationFrame(() => {
                    editorsManager.layout('graphqlQuery');
                });
            }
        });

        // Type search filter
        typeSearch?.addEventListener('input', () => {
            filterExplorerTree(typeSearch.value.trim());
        });

        // Operation selector
        operationSelect?.addEventListener('change', () => {
            state.graphql.operationName = operationSelect.value || '';
        });

        // Monitor query editor changes for operation extraction
        // Editors are created asynchronously, so defer listener attachment
        editorsManager.onReady(() => {
            const queryEditor = editorsManager.getGraphqlQueryEditor();
            if (queryEditor) {
                queryEditor.onDidChangeModelContent(() => {
                    updateOperationSelector();
                });
            }
        });
    }

    // ─── Schema Fetching ─────────────────────────────

    function fetchSchema() {
        if (isFetching) return;

        const endpointUrl = getRequestUrl();
        if (!endpointUrl) {
            setStatus('⚠ Enter a URL first', 'warning');
            return;
        }

        isFetching = true;
        setStatus('⟳ Fetching schema...', 'loading');
        if (fetchSchemaBtn) fetchSchemaBtn.disabled = true;

        const headers = getHeaders() || {};
        // Convert headers array to object if needed
        const headerObj = Array.isArray(headers)
            ? headers.reduce((acc, h) => {
                if (h.enabled !== false && h.key) acc[h.key] = h.value || '';
                return acc;
            }, {})
            : headers;

        // Inject Authorization from the Auth tab if not already set in headers
        const hasAuthHeader = Object.keys(headerObj).some(k => k.toLowerCase() === 'authorization');
        if (!hasAuthHeader) {
            const authType = state.authType || 'none';
            if (authType === 'bearer' && state.bearerToken) {
                headerObj['Authorization'] = `Bearer ${state.bearerToken}`;
            } else if (authType === 'basic' && state.basicAuth) {
                const user = state.basicAuth.username || '';
                const pass = state.basicAuth.password || '';
                headerObj['Authorization'] = `Basic ${btoa(user + ':' + pass)}`;
            } else if (authType === 'apikey' && state.apiKey) {
                const addTo = state.apiKey.in || 'header';
                if (addTo === 'header' && state.apiKey.key) {
                    headerObj[state.apiKey.key] = state.apiKey.value || '';
                }
            } else if (authType === 'oauth2' && state.oauth2?.accessToken) {
                const prefix = state.oauth2.tokenPrefix || 'Bearer';
                headerObj['Authorization'] = `${prefix} ${state.oauth2.accessToken}`;
            }
        }

        vscode.postMessage({
            command: 'graphqlFetchSchema',
            endpointUrl,
            headers: headerObj
        });
    }

    function onSchemaReceived(msg) {
        isFetching = false;
        if (fetchSchemaBtn) fetchSchemaBtn.disabled = false;

        schemaData = msg.schema;
        schemaEndpointUrl = msg.endpointUrl;

        const typeCount = msg.typeCount || 0;
        const parts = [];
        if (msg.hasQuery) parts.push('Query');
        if (msg.hasMutation) parts.push('Mutation');
        if (msg.hasSubscription) parts.push('Subscription');

        setStatus(`✓ ${typeCount} types (${parts.join(', ')})`, 'success');

        // Register Monaco completions
        registerCompletions();

        // Render explorer
        renderExplorer();

        // Update operations
        updateOperationSelector();
    }

    function onSchemaError(msg) {
        isFetching = false;
        if (fetchSchemaBtn) fetchSchemaBtn.disabled = false;
        setStatus(`✗ ${msg.error}`, 'error');
    }

    // ─── Monaco Completions ──────────────────────────

    function registerCompletions() {
        // Dispose previous provider
        if (completionDisposable) {
            completionDisposable.dispose();
            completionDisposable = null;
        }

        if (!schemaData || typeof monaco === 'undefined') return;

        completionDisposable = monaco.languages.registerCompletionItemProvider('graphql', {
            triggerCharacters: ['{', '(', ' ', '\n', '@', '.', ':'],
            provideCompletionItems(model, position) {
                const textUntilPosition = model.getValueInRange({
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                });

                const offset = textUntilPosition.length;
                const fullDocument = model.getValue();

                // Request completions from backend synchronously using cached schema
                // We compute completions client-side from the serialized schema
                const items = computeCompletionsLocally(fullDocument, offset);

                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endLineNumber: position.lineNumber,
                    endColumn: word.endColumn
                };

                return {
                    suggestions: items.map((item, index) => ({
                        label: item.label,
                        kind: mapCompletionKind(item.kind),
                        detail: item.detail || '',
                        documentation: item.description || '',
                        insertText: item.insertText || item.label,
                        insertTextRules: (item.insertText && item.insertText.includes('$'))
                            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                            : undefined,
                        range,
                        sortText: String(item.sortOrder ?? index).padStart(4, '0'),
                        deprecated: item.deprecated || false
                    }))
                };
            }
        });
    }

    /**
     * Compute completions locally from the cached schema data.
     * This mirrors the backend logic but runs in the webview for zero-latency.
     */
    function computeCompletionsLocally(document, offset) {
        if (!schemaData) return [];

        const types = schemaData.types || {};
        const textBefore = document.slice(0, offset);
        const prefixMatch = textBefore.match(/([a-zA-Z_]\w*)$/);
        const prefix = prefixMatch ? prefixMatch[1] : '';

        // Strip comments and strings
        const cleaned = textBefore
            .replace(/"""[\s\S]*?"""/g, '""')
            .replace(/"(?:[^"\\]|\\.)*"/g, '""')
            .replace(/#[^\n]*/g, '');

        // Count unmatched braces and parens
        let braceDepth = 0;
        let parenDepth = 0;
        for (const ch of cleaned) {
            if (ch === '{') braceDepth++;
            else if (ch === '}') braceDepth--;
            else if (ch === '(') parenDepth++;
            else if (ch === ')') parenDepth--;
        }

        // Root level
        if (braceDepth <= 0) {
            return getRootCompletions(prefix);
        }

        // Inside parentheses — provide argument completions
        if (parenDepth > 0) {
            return getArgumentCompletionsLocal(cleaned, prefix);
        }

        // Inside selection set — resolve parent type
        const parentTypeName = resolveParentType(cleaned);
        const parentType = parentTypeName ? types[parentTypeName] : null;

        if (parentType && (parentType.kind === 'OBJECT' || parentType.kind === 'INTERFACE')) {
            return getFieldCompletions(parentType, prefix);
        }

        return [];
    }

    function getRootCompletions(prefix) {
        const items = [];
        const keywords = ['query', 'mutation', 'subscription', 'fragment'];
        const snippets = {
            query: 'query ${1:Name} {\n  $0\n}',
            mutation: 'mutation ${1:Name} {\n  $0\n}',
            subscription: 'subscription ${1:Name} {\n  $0\n}',
            fragment: 'fragment ${1:Name} on ${2:Type} {\n  $0\n}'
        };

        for (const kw of keywords) {
            if (kw === 'mutation' && !schemaData.mutationType) continue;
            if (kw === 'subscription' && !schemaData.subscriptionType) continue;
            if (!prefix || kw.startsWith(prefix.toLowerCase())) {
                items.push({
                    label: kw,
                    kind: 'keyword',
                    detail: `${kw.charAt(0).toUpperCase() + kw.slice(1)} operation`,
                    insertText: snippets[kw],
                    sortOrder: 0
                });
            }
        }
        return items;
    }

    function getFieldCompletions(parentType, prefix) {
        const items = [];
        const fields = parentType.fields || [];
        for (const field of fields) {
            if (!prefix || field.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                const baseType = (field.type || '').replace(/[!\[\]]/g, '');
                const typeObj = schemaData.types[baseType];
                const isObject = typeObj && (typeObj.kind === 'OBJECT' || typeObj.kind === 'INTERFACE' || typeObj.kind === 'UNION');

                let insertText = field.name;
                // Add required args
                const requiredArgs = (field.args || []).filter(a => (a.type || '').endsWith('!'));
                if (requiredArgs.length > 0) {
                    const argSnippets = requiredArgs.map((a, i) => `${a.name}: \${${i + 1}}`).join(', ');
                    insertText = `${field.name}(${argSnippets})`;
                }
                if (isObject) {
                    insertText += ' {\n  $0\n}';
                }

                items.push({
                    label: field.name,
                    kind: 'field',
                    detail: field.type,
                    description: field.description || '',
                    insertText,
                    deprecated: field.isDeprecated,
                    sortOrder: 1
                });
            }
        }

        // __typename
        if (!prefix || '__typename'.startsWith(prefix.toLowerCase())) {
            items.push({
                label: '__typename',
                kind: 'field',
                detail: 'String!',
                description: 'The name of the current object type',
                sortOrder: 10
            });
        }

        return items;
    }

    /**
     * Provide argument completions when the cursor is inside parentheses.
     * Finds the field name before the opening paren and looks up its args.
     */
    function getArgumentCompletionsLocal(cleaned, prefix) {
        if (!schemaData) return [];
        const types = schemaData.types || {};

        // Find the field name immediately before the unmatched opening parenthesis
        let depth = 0;
        let fieldName = null;
        for (let i = cleaned.length - 1; i >= 0; i--) {
            if (cleaned[i] === ')') depth++;
            else if (cleaned[i] === '(') {
                if (depth === 0) {
                    const before = cleaned.slice(0, i).trimEnd();
                    const m = before.match(/(\w+)$/);
                    fieldName = m ? m[1] : null;
                    break;
                }
                depth--;
            }
        }
        if (!fieldName) return [];

        // Resolve the parent type at the cursor level
        const parentTypeName = resolveParentType(cleaned);
        const parentType = parentTypeName ? types[parentTypeName] : null;
        if (!parentType) return [];

        const field = (parentType.fields || []).find(f => f.name === fieldName);
        if (!field || !field.args) return [];

        const items = [];
        for (const arg of field.args) {
            if (!prefix || arg.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                items.push({
                    label: arg.name,
                    kind: 'argument',
                    detail: arg.type,
                    description: arg.description || '',
                    insertText: `${arg.name}: `,
                    sortOrder: 0
                });
            }
        }
        return items;
    }

    /**
     * Resolve the parent type name at the cursor's nesting level.
     * Walks through the cleaned text tracking field → type transitions.
     */
    function resolveParentType(cleaned) {
        if (!schemaData) return null;

        const types = schemaData.types || {};
        
        // Determine root type
        let rootTypeName = schemaData.queryType || 'Query';
        const opMatch = cleaned.match(/\b(query|mutation|subscription)\b/);
        if (opMatch) {
            if (opMatch[1] === 'mutation' && schemaData.mutationType) rootTypeName = schemaData.mutationType;
            else if (opMatch[1] === 'subscription' && schemaData.subscriptionType) rootTypeName = schemaData.subscriptionType;
        }

        // Tokenize and track brace nesting
        const tokens = [];
        const tokenRegex = /([a-zA-Z_]\w*|[{}(),:=@!\[\].]|\.\.\.|"[^"]*"|\d+)/g;
        let m;
        while ((m = tokenRegex.exec(cleaned)) !== null) {
            tokens.push(m[1]);
        }

        const typePath = [rootTypeName];
        let currentType = types[rootTypeName];

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token === '{') continue;

            if (token === '}') {
                typePath.pop();
                currentType = typePath.length > 0 ? types[typePath[typePath.length - 1]] : null;
                continue;
            }

            // Check if next meaningful token is { (possibly after args)
            let nextIdx = i + 1;
            if (nextIdx < tokens.length && tokens[nextIdx] === '(') {
                let pd = 1;
                nextIdx++;
                while (nextIdx < tokens.length && pd > 0) {
                    if (tokens[nextIdx] === '(') pd++;
                    else if (tokens[nextIdx] === ')') pd--;
                    nextIdx++;
                }
            }

            if (nextIdx < tokens.length && tokens[nextIdx] === '{') {
                if (currentType) {
                    const field = (currentType.fields || []).find(f => f.name === token);
                    if (field) {
                        const resolvedName = (field.type || '').replace(/[!\[\]]/g, '');
                        typePath.push(resolvedName);
                        currentType = types[resolvedName] || null;
                    }
                }
            }
        }

        return typePath.length > 0 ? typePath[typePath.length - 1] : null;
    }

    function mapCompletionKind(kind) {
        if (typeof monaco === 'undefined') return 0;
        const map = {
            'field': monaco.languages.CompletionItemKind.Field,
            'keyword': monaco.languages.CompletionItemKind.Keyword,
            'argument': monaco.languages.CompletionItemKind.Property,
            'enum': monaco.languages.CompletionItemKind.EnumMember,
            'type': monaco.languages.CompletionItemKind.Class,
            'directive': monaco.languages.CompletionItemKind.Function,
            'fragment': monaco.languages.CompletionItemKind.Reference,
            'snippet': monaco.languages.CompletionItemKind.Snippet
        };
        return map[kind] || monaco.languages.CompletionItemKind.Text;
    }

    // ─── Operation Selector ──────────────────────────

    function updateOperationSelector() {
        if (!operationSelect) return;

        const queryEditor = editorsManager.getGraphqlQueryEditor();
        if (!queryEditor) return;

        const gqlText = queryEditor.getValue();
        const operations = extractOperations(gqlText);

        // Update dropdown
        operationSelect.innerHTML = '<option value="">All operations</option>';
        for (const op of operations) {
            const opt = document.createElement('option');
            opt.value = op.name;
            opt.textContent = `${op.type}: ${op.name}`;
            operationSelect.appendChild(opt);
        }

        // Show/hide based on operation count
        operationSelect.classList.toggle('hidden', operations.length <= 1);

        // Restore selection
        if (state.graphql.operationName) {
            operationSelect.value = state.graphql.operationName;
        }
    }

    /**
     * Extract operation names from a GraphQL document (client-side)
     */
    function extractOperations(gqlDocument) {
        const operations = [];
        const lines = gqlDocument.split('\n');
        const regex = /^\s*(query|mutation|subscription)\s+(\w+)/;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(regex);
            if (match) {
                operations.push({
                    type: match[1],
                    name: match[2],
                    line: i + 1
                });
            }
        }

        return operations;
    }

    // ─── Schema Explorer ─────────────────────────────

    function renderExplorer() {
        if (!typeTree || !schemaData) return;

        const types = schemaData.types || {};
        let html = '';

        // Root operations
        const rootTypes = [
            { label: 'Query', name: schemaData.queryType },
            { label: 'Mutation', name: schemaData.mutationType },
            { label: 'Subscription', name: schemaData.subscriptionType },
        ].filter(r => r.name && types[r.name]);

        for (const root of rootTypes) {
            html += renderTypeNode(root.label, types[root.name], true);
        }

        // Non-root types (categorized)
        const enums = [];
        const inputTypes = [];
        const interfaces = [];
        const unions = [];
        const objectTypes = [];
        const scalars = [];

        for (const [name, type] of Object.entries(types)) {
            // Skip root types and built-in scalars
            if (rootTypes.some(r => r.name === name)) continue;
            if (['String', 'Int', 'Float', 'Boolean', 'ID'].includes(name)) continue;

            switch (type.kind) {
                case 'ENUM': enums.push(type); break;
                case 'INPUT_OBJECT': inputTypes.push(type); break;
                case 'INTERFACE': interfaces.push(type); break;
                case 'UNION': unions.push(type); break;
                case 'SCALAR': scalars.push(type); break;
                case 'OBJECT': objectTypes.push(type); break;
            }
        }

        if (enums.length > 0) {
            html += renderCategory('Enums', enums.map(t => renderEnumNode(t)));
        }
        if (inputTypes.length > 0) {
            html += renderCategory('Input Types', inputTypes.map(t => renderInputTypeNode(t)));
        }
        if (interfaces.length > 0) {
            html += renderCategory('Interfaces', interfaces.map(t => renderTypeNode(t.name, t, false)));
        }
        if (unions.length > 0) {
            html += renderCategory('Unions', unions.map(t => renderUnionNode(t)));
        }
        if (objectTypes.length > 0) {
            html += renderCategory('Types', objectTypes.map(t => renderTypeNode(t.name, t, false)));
        }
        if (scalars.length > 0) {
            html += renderCategory('Scalars', scalars.map(t => `<div class="explorer-leaf" data-type="${esc(t.name)}"><span class="explorer-scalar">${esc(t.name)}</span></div>`));
        }

        typeTree.innerHTML = html;

        // Add click handlers for expand/collapse
        typeTree.querySelectorAll('.explorer-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const node = toggle.closest('.explorer-node');
                if (node) node.classList.toggle('collapsed');
            });
        });

        // Add click handlers for field insertion
        typeTree.querySelectorAll('.explorer-field-name').forEach(fieldEl => {
            fieldEl.addEventListener('click', () => {
                const fieldName = fieldEl.getAttribute('data-field');
                if (fieldName) insertFieldIntoEditor(fieldName);
            });
        });
    }

    function renderTypeNode(label, type, expanded) {
        if (!type) return '';
        const fields = type.fields || [];
        const collapsedClass = expanded ? '' : 'collapsed';
        
        let html = `<div class="explorer-node ${collapsedClass}" data-type="${esc(type.name)}">`;
        html += `<div class="explorer-toggle"><span class="explorer-icon">▶</span> <span class="explorer-type-name">${esc(label)}</span>`;
        if (type.description) html += ` <span class="explorer-desc" title="${esc(type.description)}">ℹ</span>`;
        html += `</div>`;
        html += `<div class="explorer-children">`;

        for (const field of fields) {
            const deprecated = field.isDeprecated ? ' deprecated' : '';
            html += `<div class="explorer-field${deprecated}">`;
            html += `<span class="explorer-field-name" data-field="${esc(field.name)}">${esc(field.name)}</span>`;
            if (field.args && field.args.length > 0) {
                const argsStr = field.args.map(a => `${a.name}: ${a.type}`).join(', ');
                html += `<span class="explorer-args">(${esc(argsStr)})</span>`;
            }
            html += `<span class="explorer-field-type">: ${esc(field.type)}</span>`;
            if (field.description) html += ` <span class="explorer-desc" title="${esc(field.description)}">ℹ</span>`;
            if (field.isDeprecated) html += ` <span class="explorer-deprecated" title="${esc(field.deprecationReason || 'Deprecated')}">⚠</span>`;
            html += `</div>`;
        }

        html += `</div></div>`;
        return html;
    }

    function renderEnumNode(type) {
        const values = type.enumValues || [];
        let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
        html += `<div class="explorer-toggle"><span class="explorer-icon">▶</span> <span class="explorer-enum-name">${esc(type.name)}</span></div>`;
        html += `<div class="explorer-children">`;
        for (const v of values) {
            html += `<div class="explorer-enum-value">${esc(v.name)}</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    function renderInputTypeNode(type) {
        const fields = type.inputFields || [];
        let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
        html += `<div class="explorer-toggle"><span class="explorer-icon">▶</span> <span class="explorer-input-name">${esc(type.name)}</span></div>`;
        html += `<div class="explorer-children">`;
        for (const field of fields) {
            html += `<div class="explorer-field">`;
            html += `<span class="explorer-field-name">${esc(field.name)}</span>`;
            html += `<span class="explorer-field-type">: ${esc(field.type)}</span>`;
            html += `</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    function renderUnionNode(type) {
        const possible = type.possibleTypes || [];
        let html = `<div class="explorer-node collapsed" data-type="${esc(type.name)}">`;
        html += `<div class="explorer-toggle"><span class="explorer-icon">▶</span> <span class="explorer-union-name">${esc(type.name)}</span></div>`;
        html += `<div class="explorer-children">`;
        for (const t of possible) {
            html += `<div class="explorer-leaf">${esc(t)}</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    function renderCategory(title, childrenHtml) {
        let html = `<div class="explorer-category">`;
        html += `<div class="explorer-category-header">${esc(title)}</div>`;
        html += childrenHtml.join('');
        html += `</div>`;
        return html;
    }

    function filterExplorerTree(query) {
        if (!typeTree) return;
        const nodes = typeTree.querySelectorAll('.explorer-node, .explorer-leaf');
        nodes.forEach(node => {
            const typeName = node.getAttribute('data-type') || '';
            const text = node.textContent || '';
            const matches = !query || 
                typeName.toLowerCase().includes(query.toLowerCase()) || 
                text.toLowerCase().includes(query.toLowerCase());
            node.style.display = matches ? '' : 'none';
        });
    }

    function insertFieldIntoEditor(fieldName) {
        const queryEditor = editorsManager.getGraphqlQueryEditor();
        if (!queryEditor) return;

        const position = queryEditor.getPosition();
        if (!position) return;

        queryEditor.executeEdits('graphql-explorer', [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: fieldName + '\n'
        }]);

        queryEditor.focus();
    }

    // ─── Status Helper ───────────────────────────────

    function setStatus(text, type) {
        if (!schemaStatus) return;
        schemaStatus.textContent = text;
        schemaStatus.className = 'graphql-status';
        if (type) schemaStatus.classList.add(`graphql-status-${type}`);
    }

    function esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Message Handlers ────────────────────────────

    function getMessageHandlers() {
        return {
            'graphqlSchemaReceived': (msg) => onSchemaReceived(msg),
            'graphqlSchemaError': (msg) => onSchemaError(msg),
            'graphqlSchemaCacheCleared': () => {
                schemaData = null;
                schemaEndpointUrl = null;
                setStatus('Cache cleared', 'info');
                if (typeTree) typeTree.innerHTML = '';
            }
        };
    }

    // ─── Cleanup ─────────────────────────────────────

    function dispose() {
        if (completionDisposable) {
            completionDisposable.dispose();
            completionDisposable = null;
        }
        schemaData = null;
    }

    // ─── Public Interface ────────────────────────────

    return {
        initialize,
        fetchSchema,
        getMessageHandlers,
        dispose,
        getSchemaData: () => schemaData,
        hasSchema: () => schemaData !== null
    };
}
