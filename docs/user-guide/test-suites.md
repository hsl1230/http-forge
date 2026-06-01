# Test Suites

Test suites let you run multiple requests across collections with summary results.

## Create a suite
1. Create a suite under `storage.root/suites`.
2. Add requests from collections.
3. Save the suite.

## Suite & Request Descriptions

Document what a suite tests and what each request does within the flow.

### Suite description
- Click the **"Click to add description…"** placeholder in the header (between suite name and Run button).
- A dropdown textarea appears as an overlay — the rest of the page stays unchanged.
- Type your description (supports multiple lines with Enter).
- **Save**: Click outside (blur) or press `Ctrl+Enter`.
- **Cancel**: Press `Escape` to discard changes.
- In read mode, the description shows as a single truncated line. Hover to see the full multi-line text in a tooltip.

### Per-request description
Each request in the suite list has a description line below its name:
- Click **"Click to add description…"** to add a note.
- Same interaction as suite description: overlay textarea on click, multi-line tooltip on hover.
- Use descriptions to document what each request validates (e.g. "Create user for downstream tests", "Verify 401 without token").

Descriptions are persisted in the suite JSON and copied when duplicating a suite.

## Run a suite
1. Select a suite.
2. Run it from the suite runner.
3. Review results in `storage.results`.

> **Security note:** Suite result files automatically redact sensitive headers (`Authorization`, tokens, cookies) and body fields (passwords, secrets, API keys) before writing to disk. See [Security & Sensitive Data](security.md).

## Request Customization

You can edit individual requests within a suite without modifying the source collection. This is useful for changing URLs, parameters, headers, or body for a specific test scenario.

### Edit a suite request
1. In the request list, click the `⋯` menu on a request row.
2. Select **✎ Edit** to open the request in a dedicated suite editor panel.
3. Make your changes (URL, params, headers, body, auth, scripts).
4. Click **Save to Suite** to persist changes.

Customized requests show a small colored dot indicator next to the request name.

### Open original collection request
1. Click the `⋯` menu on a request row.
2. Select **↗ Open Original** to open the source collection request in a standard Request Tester panel.

This lets you view or edit the original request without any suite context. Changes made here affect the collection, not the suite.

### Reset to collection version
1. Click the `⋯` menu on a modified request.
2. Select **↺ Reset to Collection** to revert to the latest version from the source collection.

### Duplicate a suite
Right-click a suite in the Test Suites tree and select **Duplicate**. Enter a name for the copy.

The duplicate includes:
- All request references and ordering
- Run configuration (iterations, delay, stop-on-error, shared session flags)
- Description
- **All customized request data** (body, headers, auth, scripts stored in suite folders)

### What's restricted in suite edit mode
- **Body Schema** and **Response Schema** tabs are hidden
- **Document tab** is hidden
- Per-field **OpenAPI schema metadata** toggles (`{}` buttons) are disabled
- Request history sidebar is hidden

### How storage works
Each customized request is stored in a folder under the suite directory:
```
suites/<suite-id>/<request-slug>/
├── request.json       # Full request snapshot
└── scripts/
    ├── pre-request.js
    └── post-response.js
```

Scripts (pre-request and post-response) are always resolved live from the collection at execution time — only the request data (URL, params, headers, body, auth, settings) is snapshotted.

## Save-on-close

Both the Test Suite panel and the suite request editor track unsaved changes. When closing a panel with unsaved modifications:

- **Test Suite panel**: A modal dialog prompts "Save" or "Don't Save" for the suite configuration (requests, ordering, descriptions, settings).
- **Suite request editor**: Same confirm-before-close behavior as any Request Tester panel — see [Request Tester: Save-on-close](request-tester.md#save-on-close-confirmation).

## Run History

The **History** tab shows past suite runs with pass rate, duration, and status.

### Load a historical run
Click **Load** on any history entry to populate the Results and Statistics tabs with that run's data. A banner indicates you're viewing a historical run.

### Delete a historical run
Click **Delete** to remove a run from disk permanently.

## Authentication
Test suites fully support all authentication types:
- **Inherit**: Uses environment or collection auth
- **OAuth 2.0**: All four grant types (Authorization Code + PKCE, Client Credentials, Password, Implicit) with token caching and refresh
- **Bearer**: Token-based authentication
- **Basic**: Username/password authentication
- **API Key**: Header or query parameter auth

Auth settings from individual requests are preserved when running in a suite.

## Pass/Fail Logic

### With Assertions
When a request has assertions defined (using `ctx.test()` in post-response scripts), **pass/fail is determined entirely by assertion results**. This allows you to test expected error responses:

```javascript
// Test that invalid ID returns 404
ctx.test('Invalid ID returns 404', () => {
    ctx.expect(ctx.response.status).to.equal(404);
});

ctx.test('Error message present', () => {
    ctx.expect(ctx.response.json()).to.have.property('error');
});
```

### Without Assertions
When no assertions are defined, pass/fail is based on HTTP status code:
- **Pass**: Status 200-302 (success and redirect responses)
- **Fail**: All other status codes (4xx, 5xx errors)

## Results
- Pass/fail summary
- Individual request results with status and duration
- Performance stats: P50/P90/P95/P99
- Error breakdown
- Per-request percentile stats (p50, p90, p95, p99) are stored in the run manifest and shown in the Test Suite UI for detailed bottleneck analysis.

## Virtual Scrolling
Results use virtual scrolling for performance with large test runs. The results panel automatically adjusts to container height.

## Example suite run
Run the "smoke" suite against `sit` to validate core endpoints before release.

## Tips
- Keep suite names stable for reporting.
- Use environments to run the same suite against different targets.
- Define assertions for requests that test error conditions (404, 401, etc.).

## Execution flow control

Control request order within a suite run using `pm.setNextRequest()`:

### Jump to a request
```javascript
// In post-response script: jump to a specific request by name
pm.setNextRequest('Get User Details');
```

### Stop execution
```javascript
// Stop the suite after the current request
pm.setNextRequest(null);
```

### Skip HTTP call
```javascript
// In pre-request script: skip this request's HTTP call entirely
pm.execution.skipRequest();
```

### How it works
- `pm.setNextRequest(name)` / `pm.execution.setNextRequest(name)` — After the current request completes, the suite runner jumps to the named request instead of proceeding sequentially.
- `pm.setNextRequest(null)` — Stops suite execution after the current request finishes.
- `pm.execution.skipRequest()` — Skips the HTTP call but still runs post-response scripts. Useful for conditional logic in pre-request scripts.

> **Note**: These APIs only affect the **suite runner**. In the Request Tester (single request mode), they are silently ignored.

## Data-driven testing

Use `pm.iterationData` to access variables from a data file during suite runs:

```javascript
pm.test('User name matches', () => {
    const expected = pm.iterationData.get('expectedName');
    pm.expect(pm.response.json().name).to.equal(expected);
});
```
