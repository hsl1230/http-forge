# Test Suites

Test suites let you run multi-step API scenarios as a flow graph with summary results.

## Create a suite
1. Create a suite under `storage.root/suites`.
2. Build the flow with nodes:
   - request
   - script
   - if / elseif / else
   - switch / case / default
   - for / while
   - block
3. Save the suite.

Legacy suites that only contain a flat `requests` list are automatically migrated to `nodes` when loaded.

## Suite and request descriptions

Document what a suite validates and what each request node does in the flow.

### Suite description
- Click the **Click to add description...** placeholder in the header.
- A dropdown textarea opens as an overlay.
- **Save**: click outside or press `Ctrl+Enter`.
- **Cancel**: press `Escape`.

### Request-node description
- Request nodes in the flow can include a description line below the name.
- Use it to explain each step, for example setup, auth bootstrap, or validation intent.

Descriptions are persisted in the suite JSON and copied when duplicating a suite.

## Flow editing

Suites are edited as a tree flow in the left panel.

### Add nodes
Use the add action on a parent (or root) to insert a node.

For non-request nodes, the edit dialog opens immediately after creation so conditions/scripts can be configured without extra clicks.

### Branch lifecycle controls
- `if` nodes: add/remove `elseif`, add/remove `else`
- `switch` nodes: add/remove `default`

### Reorder and structure
- Drag and drop to reorder nodes and move request nodes across branches.
- Collapse/expand nodes to keep large suites manageable.

## Run a suite
1. Select a suite.
2. Run it from the suite runner.
3. Review results in `storage.results`.

> **Security note:** Suite result files automatically redact sensitive headers (`Authorization`, tokens, cookies) and body fields (passwords, secrets, API keys) before writing to disk. See [Security & Sensitive Data](security.md).

## Run a collection or folder

You do not need to create a suite first to run grouped requests.

- **Run Collection**: right-click a collection and select **Run Collection**.
- **Run Folder**: right-click a folder and select **Run Folder**.

Both actions open the suite runner backed by a temporary suite. The temporary suite is not saved unless you choose to save it.
2 
**Run Folder is recursive** and includes nested subfolders.

### Save a collection/folder run as a suite
1. Make any edits you want in the temporary suite.
2. Close the panel and choose **Save** (or use the save action).
3. The suite is written to `storage.root/suites` and appears in the **Test Suites** tree.

## Request customization inside suites

You can edit request nodes in a suite without modifying the source collection request.

### Edit a suite request
1. In the flow tree, open the `...` menu on a request node.
2. Select **Edit** to open the dedicated suite request editor panel.
3. Update URL, params, headers, body, auth, scripts, or settings.
4. Click **Save to Suite**.

Customized requests show a colored indicator in the flow.

### Open original collection request
1. In a request node menu, select **Open Original**.
2. The source collection request opens in a normal Request Tester panel.

### Reset to collection version
1. In a modified request node menu, select **Reset to Collection**.
2. The suite-local customization is discarded.

### Duplicate a suite
Right-click a suite in the **Test Suites** tree and select **Duplicate**.

The duplicate includes:
- flow nodes and ordering
- run configuration (iterations, delay, stop-on-error, shared session)
- suite description
- suite request customizations (body, headers, auth, scripts)

### What is restricted in suite edit mode
- **Body Schema** and **Response Schema** tabs are hidden
- **Document** tab is hidden
- OpenAPI metadata toggle buttons are disabled
- request history sidebar is hidden

### Suite storage layout for customized requests
Each customized request is stored under the suite directory:

```
suites/<suite-id>/<request-slug>/
|-- request.json
`-- scripts/
    |-- pre-request.js
    `-- post-response.js
```

## Save on close

Both the suite flow panel and the suite request editor track unsaved changes.

- **Test Suite panel**: prompts to save or discard suite changes
- **Suite request editor**: uses the same save-on-close behavior as Request Tester

## Run history

The **History** tab shows past suite runs with pass rate, duration, and status.

### Load a historical run
Click **Load** on an entry to populate Results and Statistics.

### Delete a historical run
Click **Delete** to permanently remove that run from disk.

## Authentication in suites
Suites support all auth types used by requests:
- Inherit
- OAuth 2.0
- Bearer
- Basic
- API Key

## Pass/fail logic

### With assertions
When assertions exist, pass/fail is determined by assertion results.

```javascript
ctx.test('Invalid ID returns 404', () => {
    ctx.expect(ctx.response.status).to.equal(404);
});
```

### Without assertions
When no assertions exist:
- **Pass**: status 200-302
- **Fail**: all other status codes

## Results and statistics
- pass/fail summary
- individual request results with status and duration
- latency stats (P50/P90/P95/P99)
- error breakdown

### Grouping
Results are grouped by iteration, then by collection and folder path.

The **Statistics** response-time table shows full `Collection > Folder > Request` labels and a **Calls** count.

## CLI runs and on-disk results
Runs started from `@http-forge/cli` (or any direct execution host) persist results to:

`.http-forge/.cache/results/<suiteId>/<runId>/`

CLI runs appear in the suite **History** tab when you open the panel.

## Virtual scrolling
Results use virtual scrolling for large runs.

## Execution flow control APIs

Control request execution using Postman-compatible APIs.

### Jump to a request
```javascript
pm.setNextRequest('Get User Details');
```

### Stop execution
```javascript
pm.setNextRequest(null);
```

### Skip HTTP call
```javascript
pm.execution.skipRequest();
```

These APIs affect suite runs only.

## Data-driven testing
Use `pm.iterationData` in suite runs:

```javascript
pm.test('User name matches', () => {
    const expected = pm.iterationData.get('expectedName');
    pm.expect(pm.response.json().name).to.equal(expected);
});
```

## Postman Flow migration mapping

Use this table to translate common Postman Flow patterns into HTTP Forge suite nodes.

| Postman Flow pattern | HTTP Forge equivalent |
|---|---|
| Request block | `request` node |
| If/Else branching | `if` node with `then` + optional `elseif` + optional `else` |
| Switch/router branching | `switch` node with `cases` + optional `default` |
| Repeat/loop behavior | `for` or `while` node |
| Grouped sub-flow | `block` node |
| Inline transform/logic block | `script` node |
| Stop sequence early | `pm.setNextRequest(null)` in script |
| Jump to a named step | `pm.setNextRequest('Request Name')` in script |
| Skip current HTTP call | `pm.execution.skipRequest()` in pre-request script |
| Data-file driven assertions | `pm.iterationData.get('key')` |

### Example: If/Else branch

Postman-style intent: run login, branch on response status, run recovery step on failure.

HTTP Forge pattern:
1. `request` node: Login
2. `if` node condition: `pm.response && pm.response.status === 200`
3. `then` branch: next happy-path request nodes
4. `else` branch: fallback request or script node

### Example: Switch branch by role

Use a `script` node first to set context:

```javascript
pm.variables.set('role', pm.environment.get('userRole') || 'guest');
```

Then use a `switch` node expression:

```javascript
pm.variables.get('role')
```

Create cases like:
- `admin` -> admin-only requests
- `editor` -> editor path
- `viewer` -> read-only path
- `default` -> guest path

### Example: Poll-until-ready loop

Use a `while` node condition such as:

```javascript
pm.variables.get('status') !== 'READY'
```

Inside loop body:
1. `request` node: poll endpoint
2. `script` node: parse response and set `status`

```javascript
const body = pm.response.json();
pm.variables.set('status', body.status);
```

Set `maxIterations` on the `while` node to prevent runaway loops.

### Example: Preserve Postman script behavior

HTTP Forge suite runs are Postman-compatible for common control APIs:
- `pm.setNextRequest(name)`
- `pm.setNextRequest(null)`
- `pm.execution.skipRequest()`
- `pm.iterationData.get(key)`

This means most script-driven Flow logic can be migrated with minimal script rewrites.

### Variable alias support in flow contexts

HTTP Forge supports three equivalent aliases in both **script nodes** and **condition expressions** (`if`, `while`, `switch`, `for`):

| Alias | Description |
|---|---|
| `pm` | Postman-compatible namespace |
| `ctx` | HTTP Forge idiomatic alias |
| `hf` | HTTP Forge shorthand |

All three point to the same API (`variables`, `environment`, `globals`):

```javascript
// These are all equivalent in conditions and script nodes
pm.variables.get('token')
ctx.variables.get('token')
hf.variables.get('token')
```

## Tips
- Keep suite names stable for reporting.
- Use environments to run the same suite across targets.
- Add assertions for expected error-path tests (401/403/404).
