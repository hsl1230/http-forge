/**
 * Script Completion Provider Module
 * Single Responsibility: Provide IntelliSense for script API (hf.*, pm.*, ctx.*) in Monaco editors
 *
 * Covers all three aliases: hf, pm, ctx — they share the same API surface.
 * Provides completions for:
 * - Variable scopes: variables, environment, session, globals, collectionVariables
 * - Request/Response objects and their methods
 * - Test & assertion API
 * - Cookies API
 * - Utility functions: sendRequest, expect
 * - Info object
 */

// ─── API Catalog ─────────────────────────────────────────────────────────────
// Each entry: { label, insertText, detail, documentation, kind? }
// kind defaults to Method; override with 'Property', 'Function', 'Snippet', 'Variable'

/**
 * Top-level members on hf / pm / ctx
 */
const ROOT_MEMBERS = [
    // Variable scopes
    { label: 'variables', detail: 'Merged variable scope (cascading lookup)', kind: 'Module', doc: 'Cascading variable access: environment → collection → global → session.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`, `replaceIn(str)`' },
    { label: 'environment', detail: 'Environment variables', kind: 'Module', doc: 'Current environment variables.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`\nProperty: `name`' },
    { label: 'session', detail: 'Session variables (persisted across requests)', kind: 'Module', doc: 'Session variables persisted in workspace state.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`' },
    { label: 'globals', detail: 'Global variables', kind: 'Module', doc: 'Global variables from environments.json.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`' },
    { label: 'collectionVariables', detail: 'Collection-scoped variables', kind: 'Module', doc: 'Variables scoped to the current collection.\nMethods: `get(key)`, `set(key, value)`, `has(key)`, `unset(key)`, `clear()`, `toObject()`' },
    { label: 'request', detail: 'Request object (modifiable in pre-request)', kind: 'Module', doc: 'The HTTP request being sent.\nProperties: `url`, `method`, `headers`, `body`\nModifiable in pre-request scripts.' },
    { label: 'response', detail: 'Response object (available in post-response)', kind: 'Module', doc: 'The HTTP response received.\nProperties: `status`, `code`, `statusText`, `headers`, `body`, `cookies`, `responseTime`, `responseSize`\nMethods: `json()`, `text()`, `reason()`, `getHeader(name)`, `getCookie(name)`' },
    { label: 'cookies', detail: 'Cookie management', kind: 'Module', doc: 'Domain-aware cookie operations.\nMethods: `get(name)`, `set(name, value)`, `has(name)`, `list()`, `jar()`, `remove(name)`, `clear()`' },
    { label: 'test', detail: 'Define a test assertion', kind: 'Function', insertText: 'test(\'${1:Test name}\', () => {\n    ${2:// assertions}\n});', snippet: true, doc: 'Define a named test:\n```js\nhf.test(\'Status is 200\', () => {\n    hf.expect(hf.response.status).to.equal(200);\n});\n```' },
    { label: 'expect', detail: 'Chai-style expect assertion', kind: 'Function', insertText: 'expect(${1:value})', snippet: true, doc: 'Chai-style assertion chain:\n```js\nhf.expect(value).to.equal(expected);\nhf.expect(arr).to.include(item);\nhf.expect(obj).to.have.property(\'key\');\n```' },
    { label: 'sendRequest', detail: 'Send an HTTP request from script', kind: 'Function', insertText: 'sendRequest(${1:urlOrOptions})', snippet: true, doc: 'Send an HTTP request:\n```js\nhf.sendRequest(\'https://api.example.com/data\', (err, res) => {\n    console.log(res.json());\n});\n// or with options:\nhf.sendRequest({ url, method: \'POST\', headers: {}, body: {} });\n```' },
    { label: 'info', detail: 'Request execution info', kind: 'Module', doc: 'Execution metadata.\nProperties: `eventName`, `requestName`, `requestId`, `iteration`, `iterationCount`' },
];

/**
 * Members for variable scopes: variables, environment, session, globals, collectionVariables
 */
const VARIABLE_SCOPE_MEMBERS = [
    { label: 'get', detail: 'Get variable value', insertText: 'get(\'${1:key}\')', snippet: true, doc: 'Get a variable by key. Returns `undefined` if not found.' },
    { label: 'set', detail: 'Set variable value', insertText: 'set(\'${1:key}\', ${2:value})', snippet: true, doc: 'Set a variable key-value pair.' },
    { label: 'has', detail: 'Check if variable exists', insertText: 'has(\'${1:key}\')', snippet: true, doc: 'Returns `true` if the key exists in this scope.' },
    { label: 'unset', detail: 'Remove a variable', insertText: 'unset(\'${1:key}\')', snippet: true, doc: 'Remove a variable by key.' },
    { label: 'clear', detail: 'Remove all variables', insertText: 'clear()', doc: 'Clear all variables in this scope.' },
    { label: 'toObject', detail: 'Get all variables as object', insertText: 'toObject()', doc: 'Returns a plain object `{ key: value, ... }` of all variables.' },
];

/**
 * Extra members on `variables` (merged scope)
 */
const MERGED_SCOPE_EXTRAS = [
    { label: 'replaceIn', detail: 'Resolve {{}} templates in a string', insertText: 'replaceIn(\'${1:string with {{vars}}}\')', snippet: true, doc: 'Replace `{{variable}}` placeholders in a string using the cascading variable lookup.\nSupports filters, dynamic vars, and JS expressions.' },
];

/**
 * Extra members on `environment`
 */
const ENVIRONMENT_EXTRAS = [
    { label: 'name', detail: 'Current environment name', kind: 'Property', doc: 'The name of the currently selected environment.' },
];

/**
 * Members for request object
 */
const REQUEST_MEMBERS = [
    { label: 'url', detail: 'Request URL', kind: 'Property', doc: 'The full request URL. Modifiable in pre-request scripts.' },
    { label: 'method', detail: 'HTTP method (GET, POST, …)', kind: 'Property', doc: 'The HTTP method. Modifiable in pre-request scripts.' },
    { label: 'headers', detail: 'Request headers', kind: 'Module', doc: 'Request headers object.\nMethods: `add({key, value})`, `get(name)`, `has(name)`, `remove(name)`, `update({key, value})`, `upsert({key, value})`' },
    { label: 'body', detail: 'Request body', kind: 'Module', doc: 'Request body object.\nProperties: `mode` (raw/formdata/urlencoded/file/graphql/none), `raw`, `formdata`, `urlencoded`, `graphql`' },
    { label: 'params', detail: 'Path parameters', kind: 'Property', doc: 'Path parameters object `{ paramName: value }`.' },
    { label: 'query', detail: 'Query parameters', kind: 'Property', doc: 'Query parameters object `{ key: value }`.' },
];

/**
 * Members for request.headers
 */
const REQUEST_HEADERS_MEMBERS = [
    { label: 'add', detail: 'Add a header', insertText: 'add({ key: \'${1:name}\', value: \'${2:value}\' })', snippet: true, doc: 'Add a new header to the request.' },
    { label: 'get', detail: 'Get header value', insertText: 'get(\'${1:name}\')', snippet: true, doc: 'Get header value (case-insensitive lookup).' },
    { label: 'has', detail: 'Check if header exists', insertText: 'has(\'${1:name}\')', snippet: true, doc: 'Check if a header exists (case-insensitive).' },
    { label: 'remove', detail: 'Remove a header', insertText: 'remove(\'${1:name}\')', snippet: true, doc: 'Remove a header (case-insensitive).' },
    { label: 'update', detail: 'Update existing header', insertText: 'update({ key: \'${1:name}\', value: \'${2:value}\' })', snippet: true, doc: 'Update an existing header (no-op if not found).' },
    { label: 'upsert', detail: 'Update or insert header', insertText: 'upsert({ key: \'${1:name}\', value: \'${2:value}\' })', snippet: true, doc: 'Update header if exists, otherwise insert it.' },
];

/**
 * Members for request.body
 */
const REQUEST_BODY_MEMBERS = [
    { label: 'mode', detail: 'Body type (raw, formdata, urlencoded, …)', kind: 'Property', doc: 'Body mode: `raw`, `formdata`, `urlencoded`, `file`, `graphql`, `none`.' },
    { label: 'raw', detail: 'Raw body content', kind: 'Property', doc: 'The raw body string (when mode is "raw").' },
    { label: 'formdata', detail: 'Form data entries', kind: 'Property', doc: 'Array of `{ key, value, type, enabled }` for multipart form data.' },
    { label: 'urlencoded', detail: 'URL-encoded form data', kind: 'Property', doc: 'Array of `{ key, value, enabled }` for URL-encoded form data.' },
    { label: 'graphql', detail: 'GraphQL query and variables', kind: 'Property', doc: 'Object with `query` and `variables` strings.' },
];

/**
 * Members for response object
 */
const RESPONSE_MEMBERS = [
    { label: 'status', detail: 'HTTP status code', kind: 'Property', doc: 'The HTTP status code (e.g. 200, 404).' },
    { label: 'code', detail: 'HTTP status code (alias)', kind: 'Property', doc: 'Alias for `status`.' },
    { label: 'statusText', detail: 'HTTP status text', kind: 'Property', doc: 'The status text (e.g. "OK", "Not Found").' },
    { label: 'headers', detail: 'Response headers', kind: 'Property', doc: 'Response headers as `{ name: value }` object.' },
    { label: 'body', detail: 'Response body', kind: 'Property', doc: 'The response body (string or parsed object).' },
    { label: 'cookies', detail: 'Response cookies', kind: 'Property', doc: 'Cookies from the response as `{ name: value }` object.' },
    { label: 'responseTime', detail: 'Response time in ms', kind: 'Property', doc: 'How long the request took in milliseconds.' },
    { label: 'responseSize', detail: 'Response size in bytes', kind: 'Property', doc: 'Size of the response body in bytes.' },
    { label: 'json', detail: 'Parse body as JSON', insertText: 'json()', doc: 'Parse the response body as JSON. Returns the parsed object.' },
    { label: 'text', detail: 'Get body as text', insertText: 'text()', doc: 'Get the response body as a string.' },
    { label: 'reason', detail: 'Get status text', insertText: 'reason()', doc: 'Returns the status text (alias for `statusText`).' },
    { label: 'getHeader', detail: 'Get response header', insertText: 'getHeader(\'${1:name}\')', snippet: true, doc: 'Get a response header value (case-insensitive).' },
    { label: 'getCookie', detail: 'Get response cookie', insertText: 'getCookie(\'${1:name}\')', snippet: true, doc: 'Get a cookie value by name.' },
    { label: 'cookie', detail: 'Get response cookie (alias)', insertText: 'cookie(\'${1:name}\')', snippet: true, doc: 'Alias for `getCookie(name)`.' },
    { label: 'hasCookie', detail: 'Check if cookie exists', insertText: 'hasCookie(\'${1:name}\')', snippet: true, doc: 'Returns `true` if the named cookie exists.' },
    { label: 'to', detail: 'Response assertions', kind: 'Module', doc: 'Response assertion chain.\n`to.have.status(200)`, `to.have.header("Content-Type")`, `to.be.ok()`' },
];

/**
 * Members for response.to
 */
const RESPONSE_TO_MEMBERS = [
    { label: 'have', detail: 'Assertion: have', kind: 'Module', doc: 'Chain to `have.status()`, `have.header()`, `have.body()`, `have.jsonBody()`.' },
    { label: 'be', detail: 'Assertion: be', kind: 'Module', doc: 'Chain to `be.ok()`, `be.error()`, `be.clientError()`, `be.serverError()`.' },
];

/**
 * Members for response.to.have
 */
const RESPONSE_TO_HAVE_MEMBERS = [
    { label: 'status', detail: 'Assert status code', insertText: 'status(${1:200})', snippet: true, doc: 'Assert the response has a specific status code.' },
    { label: 'header', detail: 'Assert header exists', insertText: 'header(\'${1:name}\')', snippet: true, doc: 'Assert a response header exists (optionally with a specific value).' },
    { label: 'body', detail: 'Assert body content', insertText: 'body(${1})', snippet: true, doc: 'Assert the response body matches.' },
    { label: 'jsonBody', detail: 'Assert JSON body', insertText: 'jsonBody(${1})', snippet: true, doc: 'Assert the response JSON body matches.' },
];

/**
 * Members for response.to.be
 */
const RESPONSE_TO_BE_MEMBERS = [
    { label: 'ok', detail: 'Assert 2xx status', insertText: 'ok()', doc: 'Assert the response is OK (status 200-299).' },
    { label: 'error', detail: 'Assert 4xx/5xx status', insertText: 'error()', doc: 'Assert the response is an error (status 400+).' },
    { label: 'clientError', detail: 'Assert 4xx status', insertText: 'clientError()', doc: 'Assert the response is a client error (status 400-499).' },
    { label: 'serverError', detail: 'Assert 5xx status', insertText: 'serverError()', doc: 'Assert the response is a server error (status 500-599).' },
];

/**
 * Members for cookies object
 */
const COOKIES_MEMBERS = [
    { label: 'get', detail: 'Get cookie value', insertText: 'get(\'${1:name}\')', snippet: true, doc: 'Get a cookie value by name.' },
    { label: 'set', detail: 'Set a cookie', insertText: 'set(\'${1:name}\', \'${2:value}\')', snippet: true, doc: 'Set a cookie for the current domain.' },
    { label: 'has', detail: 'Check if cookie exists', insertText: 'has(\'${1:name}\')', snippet: true, doc: 'Returns `true` if the named cookie exists.' },
    { label: 'list', detail: 'List all cookies', insertText: 'list()', doc: 'Returns array of `{ name, value }` for all cookies.' },
    { label: 'jar', detail: 'Get all cookies as object', insertText: 'jar()', doc: 'Returns a plain object `{ name: value, ... }` of all cookies.' },
    { label: 'remove', detail: 'Remove a cookie', insertText: 'remove(\'${1:name}\')', snippet: true, doc: 'Remove a cookie by name.' },
    { label: 'clear', detail: 'Clear all cookies', insertText: 'clear()', doc: 'Clear all cookies.' },
];

/**
 * Members for expect() chain
 */
const EXPECT_CHAIN_MEMBERS = [
    { label: 'to', detail: 'Chain: to', kind: 'Property', doc: 'Chain for readability: `expect(x).to.equal(y)`' },
    { label: 'be', detail: 'Chain: be', kind: 'Property', doc: 'Chain for readability: `expect(x).to.be.ok`' },
    { label: 'have', detail: 'Chain: have', kind: 'Property', doc: 'Chain for readability: `expect(x).to.have.property("key")`' },
    { label: 'not', detail: 'Negate assertion', kind: 'Property', doc: 'Negate the assertion: `expect(x).to.not.equal(y)`' },
    { label: 'equal', detail: 'Assert strict equality', insertText: 'equal(${1:expected})', snippet: true, doc: 'Assert strict equality (`===`).' },
    { label: 'eql', detail: 'Assert deep equality', insertText: 'eql(${1:expected})', snippet: true, doc: 'Assert deep equality.' },
    { label: 'property', detail: 'Assert property exists', insertText: 'property(\'${1:name}\')', snippet: true, doc: 'Assert the value has a property with the given name.' },
    { label: 'include', detail: 'Assert inclusion', insertText: 'include(${1:value})', snippet: true, doc: 'Assert the value includes the given value (string/array).' },
    { label: 'oneOf', detail: 'Assert is one of values', insertText: 'oneOf([${1}])', snippet: true, doc: 'Assert the value is one of the given values.' },
    { label: 'match', detail: 'Assert regex match', insertText: 'match(/${1}/)', snippet: true, doc: 'Assert the value matches the given regex.' },
    { label: 'above', detail: 'Assert greater than', insertText: 'above(${1:number})', snippet: true, doc: 'Assert the value is above (>) the given number.' },
    { label: 'below', detail: 'Assert less than', insertText: 'below(${1:number})', snippet: true, doc: 'Assert the value is below (<) the given number.' },
    { label: 'greaterThan', detail: 'Assert greater than (alias)', insertText: 'greaterThan(${1:number})', snippet: true, doc: 'Alias for `above()`.' },
    { label: 'lessThan', detail: 'Assert less than (alias)', insertText: 'lessThan(${1:number})', snippet: true, doc: 'Alias for `below()`.' },
    { label: 'within', detail: 'Assert within range', insertText: 'within(${1:start}, ${2:end})', snippet: true, doc: 'Assert the value is within the given range [start, end].' },
    { label: 'length', detail: 'Assert length', insertText: 'length(${1:len})', snippet: true, doc: 'Assert the length of the value.' },
    { label: 'ok', detail: 'Assert truthy', kind: 'Property', doc: 'Assert the value is truthy.' },
    { label: 'true', detail: 'Assert true', kind: 'Property', doc: 'Assert the value is strictly `true`.' },
    { label: 'false', detail: 'Assert false', kind: 'Property', doc: 'Assert the value is strictly `false`.' },
    { label: 'null', detail: 'Assert null', kind: 'Property', doc: 'Assert the value is `null`.' },
    { label: 'undefined', detail: 'Assert undefined', kind: 'Property', doc: 'Assert the value is `undefined`.' },
    { label: 'empty', detail: 'Assert empty', kind: 'Property', doc: 'Assert the value is empty (empty string, array, or object).' },
];

/**
 * Members for info object
 */
const INFO_MEMBERS = [
    { label: 'eventName', detail: 'Current event (prerequest/test)', kind: 'Property', doc: 'The script event: `"prerequest"` or `"test"`.' },
    { label: 'requestName', detail: 'Name of the request', kind: 'Property', doc: 'The name of the current request.' },
    { label: 'requestId', detail: 'Request ID', kind: 'Property', doc: 'The unique ID of the current request.' },
    { label: 'iteration', detail: 'Current iteration index', kind: 'Property', doc: 'The current iteration index (0-based).' },
    { label: 'iterationCount', detail: 'Total iteration count', kind: 'Property', doc: 'Total number of iterations.' },
];

// ─── Path Resolution ─────────────────────────────────────────────────────────

/** The three aliases that share the same API */
const API_ROOTS = ['hf', 'pm', 'ctx'];

/**
 * Given text up to the cursor, extract the dotted path starting from hf/pm/ctx.
 * Returns null if the cursor is not in an API chain, or an object with:
 *   root: 'hf'|'pm'|'ctx'
 *   segments: ['variables', 'get'] etc.
 *   partial: the last incomplete segment (for matching)
 */
function parseApiPath(textUntilPosition) {
    // Match: hf.variables.ge  or  pm.response.  or  ctx.
    // Use a regex that grabs the full chain from the most relevant root token
    const regex = /\b(hf|pm|ctx)((?:\.[a-zA-Z_]\w*)*)\.\s*(\w*)$/;
    const match = textUntilPosition.match(regex);
    if (match) {
        const root = match[1];
        const middle = match[2]; // e.g. ".variables" or ".response.to"
        const partial = match[3] || '';
        const segments = middle ? middle.split('.').filter(Boolean) : [];
        return { root, segments, partial };
    }

    // Match: hf. or pm. or ctx. with nothing after dot yet
    const dotOnly = textUntilPosition.match(/\b(hf|pm|ctx)\.$/);
    if (dotOnly) {
        return { root: dotOnly[1], segments: [], partial: '' };
    }

    return null;
}

/**
 * Resolve which member list to show for a given path.
 */
function resolveMemberList(segments) {
    if (segments.length === 0) {
        return ROOT_MEMBERS;
    }

    const first = segments[0];

    // Variable scopes
    if (['globals', 'collectionVariables', 'session'].includes(first)) {
        return VARIABLE_SCOPE_MEMBERS;
    }
    if (first === 'variables') {
        return [...VARIABLE_SCOPE_MEMBERS, ...MERGED_SCOPE_EXTRAS];
    }
    if (first === 'environment') {
        return [...VARIABLE_SCOPE_MEMBERS, ...ENVIRONMENT_EXTRAS];
    }

    // Request
    if (first === 'request') {
        if (segments.length === 1) return REQUEST_MEMBERS;
        if (segments[1] === 'headers') return REQUEST_HEADERS_MEMBERS;
        if (segments[1] === 'body') return REQUEST_BODY_MEMBERS;
        return [];
    }

    // Response
    if (first === 'response') {
        if (segments.length === 1) return RESPONSE_MEMBERS;
        if (segments[1] === 'to') {
            if (segments.length === 2) return RESPONSE_TO_MEMBERS;
            if (segments[2] === 'have') return RESPONSE_TO_HAVE_MEMBERS;
            if (segments[2] === 'be') return RESPONSE_TO_BE_MEMBERS;
            return [];
        }
        return [];
    }

    // Cookies
    if (first === 'cookies') {
        return COOKIES_MEMBERS;
    }

    // Info
    if (first === 'info') {
        return INFO_MEMBERS;
    }

    return [];
}

// ─── Expect Chain Detection ──────────────────────────────────────────────────

/**
 * Detect if cursor is inside an expect chain: expect(…).to.xxx
 * Returns partial word for filtering, or null if not in expect chain.
 */
function parseExpectChain(textUntilPosition) {
    // Match patterns like:
    // expect(x).to.  or  hf.expect(x).to.be.
    const regex = /\b(?:hf|pm|ctx)?\.?expect\([^)]*\)((?:\.[a-zA-Z_]\w*)*)\.\s*(\w*)$/;
    const match = textUntilPosition.match(regex);
    if (match) {
        return { partial: match[2] || '' };
    }
    return null;
}

// ─── Provider Creation ───────────────────────────────────────────────────────

/**
 * Build Monaco completion items from a member list.
 *
 * @param {Array} members - Member definitions
 * @param {string} partial - Partial text typed (for range calculation)
 * @param {Object} range - Monaco range for replacement
 * @returns {Array} Monaco CompletionItem[]
 */
function buildCompletionItems(members, partial, range) {
    return members.map((m, i) => {
        const isSnippet = !!m.snippet;
        const kindMap = {
            'Module': monaco.languages.CompletionItemKind.Module,
            'Property': monaco.languages.CompletionItemKind.Property,
            'Function': monaco.languages.CompletionItemKind.Function,
            'Snippet': monaco.languages.CompletionItemKind.Snippet,
            'Variable': monaco.languages.CompletionItemKind.Variable,
            'Method': monaco.languages.CompletionItemKind.Method,
        };
        const kind = kindMap[m.kind] || monaco.languages.CompletionItemKind.Method;

        return {
            label: m.label,
            kind,
            insertText: m.insertText || m.label,
            insertTextRules: isSnippet
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
            detail: m.detail || '',
            documentation: m.doc ? { value: m.doc } : undefined,
            range,
            sortText: String(i).padStart(3, '0')
        };
    });
}

/**
 * Create a Monaco completion provider for script API (hf/pm/ctx).
 *
 * @returns {import('monaco-editor').languages.CompletionItemProvider}
 */
function createScriptCompletionProvider() {
    return {
        triggerCharacters: ['.'],

        provideCompletionItems(model, position) {
            const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            // ── 1. Check for expect() chain ──────────────────────────────
            const expectPath = parseExpectChain(textUntilPosition);
            if (expectPath) {
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: position.column - expectPath.partial.length,
                    endColumn: position.column
                };
                return { suggestions: buildCompletionItems(EXPECT_CHAIN_MEMBERS, expectPath.partial, range) };
            }

            // ── 2. Check for hf./pm./ctx. API chain ─────────────────────
            const apiPath = parseApiPath(textUntilPosition);
            if (!apiPath) {
                return { suggestions: [] };
            }

            const members = resolveMemberList(apiPath.segments);
            if (members.length === 0) {
                return { suggestions: [] };
            }

            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - apiPath.partial.length,
                endColumn: position.column
            };

            return { suggestions: buildCompletionItems(members, apiPath.partial, range) };
        }
    };
}

// ─── Registration ────────────────────────────────────────────────────────────

/**
 * Register script API completion provider for JavaScript language (used by script editors).
 *
 * @returns {import('monaco-editor').IDisposable[]} Disposables
 */
function registerScriptCompletionProviders() {
    const provider = createScriptCompletionProvider();
    const disposables = [];

    // Only register for JavaScript — hf/pm/ctx API is only valid in script editors
    try {
        disposables.push(
            monaco.languages.registerCompletionItemProvider('javascript', provider)
        );
    } catch (e) {
        console.warn('[ScriptCompletion] Could not register for "javascript":', e.message);
    }

    return disposables;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { registerScriptCompletionProviders };
