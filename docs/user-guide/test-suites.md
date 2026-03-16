# Test Suites

Test suites let you run multiple requests across collections with summary results.

## Create a suite
1. Create a suite under `storage.root/suites`.
2. Add requests from collections.
3. Save the suite.

## Run a suite
1. Select a suite.
2. Run it from the suite runner.
3. Review results in `storage.results`.

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
