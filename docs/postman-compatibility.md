# Script API Reference - CTX Object

## Overview
This document describes the `ctx` script API with full Postman compatibility. The `ctx` object is available in pre-request and post-response scripts, with `agl` and `pm` as equivalent aliases.

## ✅ Fully Implemented Features

### Pre-request Script Context

#### Request Object
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.request.url` | `ctx.request.url` | ✅ | Getter/Setter |
| `pm.request.method` | `ctx.request.method` | ✅ | Getter/Setter |
| `pm.request.headers` | `ctx.request.headers` | ✅ | Object access |
| `pm.request.body` | `ctx.request.body` | ✅ | Read/Write |
| `pm.request.addHeader()` | `ctx.request.setHeader()` | ✅ | Different name |
| `pm.request.removeHeader()` | `ctx.request.removeHeader()` | ✅ | Same |
| - | `ctx.request.params` | ✅ | Path parameters |
| - | `ctx.request.query` | ✅ | Query parameters |

#### Variables
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.variables.get()` | `ctx.variables.get()` | ✅ | |
| `pm.variables.set()` | `ctx.variables.set()` | ✅ | |
| `pm.variables.has()` | `ctx.variables.has()` | ✅ | |
| `pm.variables.unset()` | `ctx.variables.unset()` | ✅ | |
| `pm.variables.clear()` | `ctx.variables.clear()` | ✅ | |
| `pm.variables.toObject()` | `ctx.variables.toObject()` | ✅ | |
| `pm.environment.*` | `ctx.environment.*` | ✅ | All methods |
| `pm.collectionVariables.*` | `ctx.collectionVariables.*` | ✅ | All methods - **Collection scope** |
| `pm.globals.*` | `ctx.globals.*` | ✅ | All methods - **Workspace-wide scope, persists across requests** |

### Post-response Script Context

#### Request Object (Read-only)
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.request.url` | `ctx.request.url` | ✅ | Read-only |
| `pm.request.method` | `ctx.request.method` | ✅ | Read-only |
| `pm.request.headers` | `ctx.request.headers` | ✅ | Read-only |
| `pm.request.body` | `ctx.request.body` | ✅ | Read-only |
| - | `ctx.request.params` | ✅ | Path parameters |
| - | `ctx.request.query` | ✅ | Query parameters |

#### Response Object
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.response.code` | `ctx.response.code` | ✅ | Status code |
| `pm.response.status` | `ctx.response.status` | ✅ | Status code |
| `pm.response.reason()` | `ctx.response.reason()` | ✅ | Status text |
| `pm.response.statusText` | `ctx.response.statusText` | ✅ | Status text |
| `pm.response.headers` | `ctx.response.headers` | ✅ | Headers object |
| `pm.response.body` | `ctx.response.body` | ✅ | Response body |
| `pm.response.json()` | `ctx.response.json()` | ✅ | Parse JSON |
| `pm.response.text()` | `ctx.response.text()` | ✅ | Get as text |
| `pm.response.cookies` | `ctx.response.cookies` | ✅ | Cookies object |
| `pm.response.responseTime` | `ctx.response.responseTime` | ✅ | Time in ms |
| `pm.response.responseSize` | `ctx.response.responseSize` | ✅ | Size in bytes |
| - | `ctx.response.cookie(name)` | ✅ | Get specific cookie |
| - | `ctx.response.hasCookie(name)` | ✅ | Check cookie exists |

#### Script Metadata
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.info.eventName` | `ctx.info.eventName` | ✅ | 'prerequest' or 'test' |
| `pm.info.requestName` | `ctx.info.requestName` | ✅ | Name of the request |
| `pm.info.requestId` | `ctx.info.requestId` | ✅ | ID of the request |
| `pm.info.iteration` | `ctx.info.iteration` | ✅ | Current iteration (collection runs only) |
| `pm.info.iterationCount` | `ctx.info.iterationCount` | ✅ | Total iterations (collection runs only) |

#### Response Assertions
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.response.to.have.status()` | `ctx.response.to.have.status()` | ✅ | Check status code |
| `pm.response.to.have.header()` | `ctx.response.to.have.header()` | ✅ | Check header exists |
| `pm.response.to.have.body()` | `ctx.response.to.have.body()` | ✅ | Check body content |
| `pm.response.to.have.jsonBody()` | `ctx.response.to.have.jsonBody()` | ✅ | Check JSON body |
| `pm.response.to.be.ok` | `ctx.response.to.be.ok` | ✅ | 2xx status (getter or function) |
| `pm.response.to.be.success` | `ctx.response.to.be.success` | ✅ | 2xx status (alias for ok) |
| `pm.response.to.be.error` | `ctx.response.to.be.error` | ✅ | 4xx/5xx status (getter or function) |
| `pm.response.to.be.clientError` | `ctx.response.to.be.clientError` | ✅ | 4xx status (getter or function) |
| `pm.response.to.be.serverError` | `ctx.response.to.be.serverError` | ✅ | 5xx status (getter or function) |

#### Testing
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.test(name, fn)` | `ctx.test(name, fn)` | ✅ | Define test (sync and async) |
| `pm.test(name, async fn)` | `ctx.test(name, async fn)` | ✅ | Async test support |
| `pm.expect(value)` | `ctx.expect(value)` | ✅ | Chai expect |

#### Chai Assertions
| Postman | AGL | Status | Notes |
|---------|-----|--------|-------|
| `.to.equal()` | `.to.equal()` | ✅ | Strict equality |
| `.to.eql()` | `.to.eql()` | ✅ | Deep equality |
| `.to.have.property()` | `.to.have.property()` | ✅ | Object property |
| `.to.be.ok` | `.to.be.ok` | ✅ | Truthy |
| `.to.be.true` | `.to.be.true` | ✅ | Boolean true |
| `.to.be.false` | `.to.be.false` | ✅ | Boolean false |
| `.to.be.null` | `.to.be.null` | ✅ | Null value |
| `.to.be.undefined` | `.to.be.undefined` | ✅ | Undefined |
| `.to.be.empty` | `.to.be.empty` | ✅ | Empty array/object/string |
| `.to.include()` | `.to.include()` | ✅ | Contains value |
| `.to.match()` | `.to.match()` | ✅ | Regex match |
| `.to.be.above()` | `.to.be.above()` | ✅ | Greater than |
| `.to.be.below()` | `.to.be.below()` | ✅ | Less than |
| `.to.be.greaterThan()` | `.to.be.greaterThan()` | ✅ | Alias for above |
| `.to.be.lessThan()` | `.to.be.lessThan()` | ✅ | Alias for below |
| `.to.be.within()` | `.to.be.within()` | ✅ | Range check |
| `.to.have.length()` | `.to.have.length()` | ✅ | Array/string length |
| `.not` | `.not` | ✅ | Negation |
| `.to.deep.equal()` | `.to.deep.equal()` | ✅ | Deep equality (alias for eql) |
| `.to.have.lengthOf()` | `.to.have.lengthOf()` | ✅ | Array/string length |
| `.to.exist` | `.to.exist` | ✅ | Not null/undefined |
| `.to.be.a()` / `.to.be.an()` | `.to.be.a()` / `.to.be.an()` | ✅ | Type checking |
| `.to.have.members()` | `.to.have.members()` | ✅ | Array members |
| `.to.have.keys()` | `.to.have.keys()` | ✅ | Object keys |
| `.to.have.string()` | `.to.have.string()` | ✅ | String contains |

## ✅ Advanced Features (All Implemented)

| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.sendRequest()` | `ctx.sendRequest()` | ✅ | Send HTTP requests from scripts |
| `pm.collectionVariables` | `ctx.collectionVariables` | ✅ | Collection-level variables |
| `pm.globals` | `ctx.globals` | ✅ | Global variables |
| `pm.info.*` | `ctx.info.*` | ✅ | Request/collection metadata |
| `pm.response.responseSize` | `ctx.response.responseSize` | ✅ | Response size in bytes |
| `pm.iterationData.*` | `ctx.iterationData.*` | ✅ | Data-driven testing with iteration variables |
| `pm.cookies.toObject()` | `ctx.cookies.toObject()` | ✅ | Flat `{name: value}` cookie map |
| `pm.cookies.jar()` | `ctx.cookies.jar()` | ✅ | Cookie jar management (set/get/clear/getAll) |

### Execution Flow Control
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.execution.setNextRequest()` | `ctx.execution.setNextRequest()` | ✅ | Jump to named request in suite runner |
| `pm.execution.skipRequest()` | `ctx.execution.skipRequest()` | ✅ | Skip HTTP call from pre-request scripts |
| `pm.setNextRequest()` | `ctx.setNextRequest()` | ✅ | Top-level alias for `pm.execution.setNextRequest()` |

### Visualizer
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.visualizer.set(template, data)` | `ctx.visualizer.set(template, data)` | ✅ | Custom HTML visualization with Handlebars templates |

### Request URL Object
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.request.url` (Url object) | `ctx.request.url` | ✅ | Postman SDK-compatible Url with `getHost()`, `getPath()`, `getQueryString()`, `protocol`, `host`, `port`, `path`, `query`, `hash` |

### Response Headers (HeaderList API)
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.response.headers.get()` | `ctx.response.headers.get()` | ✅ | Get header by name |
| `pm.response.headers.has()` | `ctx.response.headers.has()` | ✅ | Check header exists |
| `pm.response.headers.toObject()` | `ctx.response.headers.toObject()` | ✅ | Flat `{name: value}` header map |
| `pm.response.headers.each()` | `ctx.response.headers.each()` | ✅ | Iterate headers with callback |

### Request Headers API
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.request.headers.toObject()` | `ctx.request.headers.toObject()` | ✅ | Flat `{name: value}` header map |
| `pm.request.headers.each()` | `ctx.request.headers.each()` | ✅ | Iterate headers with callback |

### Sandbox Globals
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `xml2Json()` | `xml2Json()` | ✅ | Convert XML string to JSON |
| `jsonStringify()` | `jsonStringify()` | ✅ | `JSON.stringify()` alias |
| `jsonParse()` | `jsonParse()` | ✅ | `JSON.parse()` alias |

### Variable replaceIn
| Postman | CTX | Status | Notes |
|---------|-----|--------|-------|
| `pm.variables.replaceIn()` | `ctx.variables.replaceIn()` | ✅ | Runtime variable interpolation |
| `pm.environment.replaceIn()` | `ctx.environment.replaceIn()` | ✅ | Environment scope |
| `pm.collectionVariables.replaceIn()` | `ctx.collectionVariables.replaceIn()` | ✅ | Collection scope |
| `pm.globals.replaceIn()` | `ctx.globals.replaceIn()` | ✅ | Global scope |

### Cookie Management
- `pm.cookies.jar()` returns a cookie jar with `set()`, `get()`, `clear()`, `getAll()`
- `pm.cookies.toObject()` returns flat `{name: value}` map
- Cookies are also accessible via `ctx.response.cookies`

### Request Auth
- Postman has `pm.request.auth` for authentication
- HTTP Forge handles auth via request configuration UI
- Could be added if needed for dynamic auth in scripts

## Usage Examples

### Pre-request Script
```javascript
// Set variables
ctx.variables.set('timestamp', Date.now().toString());
ctx.environment.set('requestId', Math.random().toString(36));

// Modify request
ctx.request.url = 'https://api.example.com/v2/users';
ctx.request.setHeader('X-Request-ID', ctx.variables.get('requestId'));
ctx.request.method = 'POST';
ctx.request.setBody({ name: 'Test User' });

// Log
console.log('Request URL:', ctx.request.url);
```

### Post-response Script
```javascript
// Test status code
ctx.test('Status is 200', () => {
    ctx.expect(ctx.response.status).to.equal(200);
});

// Use globals (workspace-wide variables)
ctx.globals.set('lastUserId', ctx.response.json().id);
const globalToken = ctx.globals.get('authToken');

// Test with response assertions
ctx.test('Response is OK', () => {
    ctx.response.to.be.ok();
    ctx.response.to.have.status(200);
});

// Parse and test JSON
ctx.test('Response has user data', () => {
    const json = ctx.response.json();
    ctx.expect(json).to.have.property('id');
    ctx.expect(json.name).to.equal('Test User');
});

// Test headers
ctx.test('Has Content-Type header', () => {
    ctx.response.to.have.header('Content-Type', 'application/json');
});

// Test response time
ctx.test('Response time is acceptable', () => {
    ctx.expect(ctx.response.responseTime).to.be.below(500);
});

// Test cookies
ctx.test('Has session cookie', () => {
    ctx.expect(ctx.response.hasCookie('sessionId')).to.be.true;
    const sessionId = ctx.response.cookie('sessionId');
    ctx.expect(sessionId).to.not.be.empty;
});

// Complex assertions
ctx.test('Response body validation', () => {
    const data = ctx.response.json();
    ctx.expect(data.items).to.be.an('array');
    ctx.expect(data.items).to.have.length(5);
    ctx.expect(data.total).to.be.above(0);
    ctx.expect(data.status).to.include('success');
});

// Send additional HTTP request
ctx.sendRequest({
    url: 'https://api.example.com/v1/status',
    method: 'GET'
}, (err, response) => {
    if (err) {
        console.log('Request failed:', err);
    } else {
        console.log('Status check:', response.status);
    }
});
```

> **Global variable persistence:** values written with `pm.globals.set()` /
> `ctx.globals.set()` are saved to the shared global store immediately and are
> visible to every later request in the run (same live mechanism as
> `pm.environment.set()`). Globals declared in `_global.json` act as defaults —
> `pm.globals.unset()` / `clear()` remove session-set globals but leave the
> file-defined defaults in place.

## Compatibility Alias

The script context is available through three equivalent aliases - `agl`, `pm`, and `ctx`:
```javascript
// All three work identically
agl.test('Test', () => { ... });
pm.test('Test', () => { ... });   // Postman compatibility
ctx.test('Test', () => { ... });  // Context alias
```

Use whichever feels most natural for your workflow:

Use whichever feels most natural for your workflow:
- `agl` - AGL native syntax
- `pm` - Postman compatibility (drop-in replacement)
- `ctx` - Concise context alias

## Script Scope

Postman runs every script (collection, folder, request — and the pre-request vs. post-response phases) in its **own isolated sandbox**. State is shared only through `pm.variables` / `pm.environment` / `pm.globals`.

HTTP Forge supports two modes, selected via `scripts.scope` in `http-forge.config.json`:

| Mode | Behavior |
|---|---|
| `"shared"` *(default)* | All script levels (collection → folder → request) and both phases run in **one shared scope**. Variables/functions declared in an earlier script are visible to later scripts, and top-level `var`/`function` declarations from the pre-request phase persist into the post-response phase. Lowest overhead. |
| `"isolated"` | Each script level runs in **its own scope** (Postman-compatible). Declarations cannot collide between levels or leak across phases; share state through `pm.variables` / `pm.environment` / `pm.globals`. |

```jsonc
// http-forge.config.json
{
  "scripts": {
    "scope": "isolated"   // Postman-compatible; omit or "shared" for default behavior
  }
}
```

**When to use `"isolated"`:** importing Postman collections whose scripts declare the same `const`/`function`/`let` at multiple levels (which throws `Identifier already declared` in shared mode), or any time you want strict Postman scoping semantics.

> **Note:** In `shared` mode only `var`/`function`/global assignments leak across the pre-request → post-response boundary; top-level `let`/`const` are scoped to a single phase and do **not** persist. Always pass cross-phase state through `pm.*` for predictable behavior.

## Async Script Execution (Event-Loop Draining)

Postman does **not** end a script the moment its synchronous code returns. It keeps the sandbox alive and pumps the event loop until pending timers (`setTimeout`/`setInterval`) and microtasks (un-awaited `Promise`s) settle, bounded by a script timeout. Variable scopes are committed **after** the loop drains, so deferred `pm.globals` / `pm.environment` / `pm.variables` writes are still visible to the next request — even without `await`.

HTTP Forge replicates this lifecycle:

| Behavior | HTTP Forge | Notes |
|---|---|---|
| Sandbox kept alive after sync return | ✅ | Pending timers/microtasks drained before the request advances |
| No `await` required for deferred writes | ✅ | `setTimeout(() => pm.globals.set(...), 2000)` is committed for the next request |
| Un-awaited Promises complete | ✅ | Late `pm.*` writes from a fire-and-forget `async` IIFE are captured |
| Nested timers drain | ✅ | A `setTimeout` that schedules another `setTimeout` drains within the budget |
| Errors in deferred callbacks are non-fatal | ✅ | Reported as a console error; the request/test is **not** failed |
| Infinite timers bounded | ✅ | A runaway `setInterval`/timer loop is force-cancelled at the timeout |

The budget is the `scripts.timeout` config value (default **5000 ms**), which bounds **both** synchronous CPU time and the asynchronous drain window. When exceeded, pending async work is cancelled and a warning is logged.

```javascript
// Post-response script — no await needed; the value is committed for the next request
setTimeout(() => {
  pm.globals.set('authToken', generateToken());
}, 1500);
```

```jsonc
// http-forge.config.json — raise the budget for slow async work
{
  "scripts": {
    "timeout": 10000
  }
}
```

### Divergences from Postman

- HTTP Forge uses **real Node timers** with a poll-based wall-clock drain rather than Postman's bridged sandbox loop. There is no exact pending-promise count, so pathological microtask recursion is bounded by the wall-clock budget rather than a precise idle signal.
- A `setInterval` that is never cleared runs until the budget, then is force-cleared (matching Postman's "bounded by timeout" guarantee).
- A single `scripts.timeout` value bounds both CPU time and the async-drain window (rather than two separate limits).
- Scripts with no pending async work return immediately — draining adds no measurable latency.

## Migration from Postman

Most Postman scripts work without any changes:

1. ✅ Keep using `pm` (works identically) or switch to `ctx` (recommended)
2. ✅ All common assertions work the same
3. ✅ Request/response structure is compatible
4. ✅ `ctx.sendRequest()` / `pm.sendRequest()` supported (callback or Promise)
5. ✅ `ctx.globals` / `pm.globals` for workspace-wide variables
6. ✅ `ctx.collectionVariables` / `pm.collectionVariables` for collection-scoped variables
7. ✅ Full Postman `pm` API compatibility

## Future Enhancements

Potential additions for extended Postman parity:
- `pm.request.auth` — Dynamic authentication object access in scripts
- WebSocket support for real-time API testing

---

## Template Engine — Variable Resolution

HTTP Forge extends Postman's `{{variable}}` syntax with filter pipes and JavaScript expressions. This section compares the template capabilities.

### Variable Syntax Comparison
| Feature | Postman / Thunder Client | HTTP Forge | Notes |
|---|---|---|---|
| Variable lookup | `{{varName}}` | `{{varName}}` | ✅ Compatible |
| Dynamic variables | `{{$guid}}`, `{{$timestamp}}` | `{{$guid}}`, `{{$timestamp}}` | ✅ Compatible — 18 dynamic variables |
| Parameterized dynamic | `{{$randomInt}}` (no args in Postman) | `{{$randomInt(1, 100)}}` | ✅ Extended — supports arguments |
| Env vars in dynamic args | ❌ | `{{$randomInt(minVal, maxVal)}}` | ✅ Extended |
| Filter pipes | `{{var \| filter}}` (Thunder Client) | `{{var \| filter1 \| filter2(args)}}` | ✅ Thunder Client compatible + extended |
| JS expressions | ❌ (script tab only) | `{{price * quantity}}` | ✅ Extended — inline JS |
| String concatenation | ❌ (script tab only) | `{{firstName + ' ' + lastName}}` | ✅ Extended — inline concat |
| Template literals | ❌ | `` {{`Hello ${name}`}} `` | ✅ Extended |
| No-input filters | `{{@ \| filter}}` (Thunder Client) | `{{@ \| filter}}` | ✅ Compatible |

### Built-in Filters (Thunder Client Parity + Extensions)
| Filter | Thunder Client | HTTP Forge | Notes |
|---|---|---|---|
| `upper` / `lower` | ✅ | ✅ | Compatible |
| `trim` | ✅ | ✅ | Compatible |
| `length` | ✅ | ✅ | Compatible |
| `substring` | ✅ | ✅ | Compatible |
| `replace` | ✅ | ✅ | Compatible |
| `split` / `join` | ✅ | ✅ | Compatible |
| `removeQuotes` / `removeSpaces` | ✅ | ✅ | Compatible |
| `format` | ✅ | ✅ | Compatible |
| `add` / `subtract` / `multiply` / `abs` | ✅ | ✅ | Compatible |
| `btoa` / `atob` | ✅ | ✅ | Compatible |
| `urlEncode` / `urlDecode` | ✅ | ✅ | Compatible |
| `hash` / `hmac` | ✅ | ✅ | Compatible |
| `first` / `last` / `at` / `slice` | ✅ | ✅ | Compatible |
| `filter` / `map` / `unique` | ✅ | ✅ | Compatible + nested paths |
| `prop` | ✅ | ✅ | Compatible + nested paths (`a.b.c`) |
| `parseJSON` / `stringify` | ✅ | ✅ | Compatible |
| `isEmail` / `isUrl` | ✅ | ✅ | Compatible |
| Variable refs in args | ❌ | ✅ | Extended — `add(tax)` resolves var |
| Nested property paths | ❌ | ✅ | Extended — `prop("a.b.c")`, `map("x.y")` |

### Resolution Pipeline
HTTP Forge resolves `{{content}}` in this order:
1. Dynamic variables (`$guid`, `$randomInt(1,100)`)
2. Filter chains (`variable | upper | trim`)
3. Environment/collection variable lookup
4. JavaScript expression evaluation (sandboxed)
5. Original text preserved (unresolved)

### Script Template Pre-Resolution
| Behavior | Postman | HTTP Forge | Notes |
|---|---|---|---|
| `{{var}}` in script source | ❌ Requires `replaceIn()` | ✅ Auto-resolves before execution | Postman-compatible — `replaceIn()` still works |
| Filters in script source | ❌ Not available | ✅ `'{{name \| upper}}'` resolves inline | Full 5-step pipeline |
| Double-resolution safety | N/A | ✅ `replaceIn()` on resolved string is a no-op | No `{{}}` markers left |

### IntelliSense / Autocomplete
| Feature | Postman | Thunder Client | HTTP Forge |
|---|---|---|---|
| Variable autocomplete | ✅ In-app variable picker | ✅ Variable picker | ✅ Monaco IntelliSense with live values, scope labels |
| Filter autocomplete | ❌ | ❌ | ✅ 30+ filters with category tags and snippet tab-stops |
| Dynamic variable autocomplete | ✅ Dropdown in app | ✅ System vars in picker | ✅ Monaco completions with descriptions |
| Script API autocomplete | ✅ In-app editor hints | ❌ | ✅ Full `hf.`/`pm.`/`ctx.` chain completion (variables, request, response, cookies, expect) |
