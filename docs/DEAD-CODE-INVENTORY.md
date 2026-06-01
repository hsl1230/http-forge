# Dead Code Inventory — Test Suite `main.js`

> **File**: `resources/features/test-suite/modules/main.js`  
> **Date**: 2026-05-19  
> **Status**: Identified, pending cleanup

---

## Summary

| # | Item | Type | Lines | Issue |
|---|------|------|-------|-------|
| 1 | `state.currentIndex` | State property | 114, 783, 919 | Only assigned, never read |
| 2 | `state.requestsPerIteration` | State property | 124, 800 | Only assigned, never read |
| 3 | `elements.resultsSummary` | DOM element ref | 170 | Stored but never accessed after assignment |
| 4 | `elements.summaryTotal` | Dead reference | 502 | Not defined in `elements` object — guard is always falsy (no-op) |

---

## Details

### 1. `state.currentIndex`

```js
// Declaration (line 114)
currentIndex: 0,    // deprecated - can be derived from results.length, but kept for clarity

// Assignments (lines 783, 919)
state.currentIndex = 0;
state.currentIndex++;
```

**Analysis**: Incremented during result processing, but no code ever reads this value. It could be replaced by `state.results.length` if needed, but nothing consumes it.

**Recommended action**: Remove declaration and both assignment sites.

---

### 2. `state.requestsPerIteration`

```js
// Declaration (line 124)
requestsPerIteration: 0,    //deprecated - can be derived from state.requests, but kept for clarity

// Assignment (line 800)
state.requestsPerIteration = selectedRequests.length;
```

**Analysis**: Set once when a run starts but never read. The equivalent value is `state.requests.length`.

**Recommended action**: Remove declaration and assignment.

---

### 3. `elements.resultsSummary`

```js
// Assignment (line 170)
resultsSummary: document.getElementById('results-summary'),
```

**Analysis**: The DOM element reference is stored in the `elements` object during `initialize()`, but no subsequent code accesses `elements.resultsSummary`. The actual element may still be used via other selectors or direct ID lookups elsewhere in the HTML, but this cached reference is unused.

**Recommended action**: Remove from the `elements` object.

---

### 4. `elements.summaryTotal` (no-op guard)

```js
// Usage (line 502)
if (elements.summaryTotal) elements.summaryTotal.textContent = '0';
```

**Analysis**: `summaryTotal` is never assigned in the `elements` object (see `initialize()` at lines 147–223). The `if` guard prevents a runtime error, but the statement can never execute — it's dead code.

**Recommended action**: Remove the entire line.

---

## Previously Removed

| Item | Removed | Reason |
|------|---------|--------|
| `getStatusIcon(status)` | 2026-05-19 | Handled statuses (`pending`, `running`, `skipped`) that can never appear in the results list |
| `renderResultItem()` | 2026-05-19 | Superseded by virtual-scroll row renderer |

---

## Cleanup Priority

All items are **low risk** — removing them won't change behavior. They can be cleaned up in a single commit with no functional impact.
