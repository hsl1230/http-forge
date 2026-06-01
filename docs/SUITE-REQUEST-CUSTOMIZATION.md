# Suite Request Customization — Detailed Implementation Plan

## Overview

Allow users to open and edit individual requests within a test suite **without modifying the source collection**. Each suite becomes a self-contained test scenario where request data is a **full snapshot** (deep copy) from the collection at add-time.

### Design Principles

| Principle | Decision |
|-----------|----------|
| **Request data** | Full copy (snapshot) stored in suite — collection changes do not affect suite |
| **Collection/folder scripts** | Resolved live from collection at execution time — NOT snapshotted |
| **Collection variables** | Resolved live from collection at execution time — NOT snapshotted |
| **Environment/global variables** | Resolved live as always |
| **Editing entry point** | Reuse existing Request Tester panel with suite-aware save |
| **Storage format** | Folder-based (like collections) — each request in its own directory |

### Rationale

- **Request data snapshot**: Test scenarios should be deterministic. If a collection request changes (URL, body, headers), existing suites should not break. Users opt-in to updates via "Re-sync from Collection".
- **Scripts live from collection**: Collection/folder scripts are shared infrastructure (auth flows, logging, common assertions). They evolve independently and should auto-update. If a user needs custom script behavior per request, they edit the request-level `scripts` field (which IS snapshotted).
- **Variables live**: Variables are configuration (`baseUrl`, `apiKey`). Snapshotting them would cause failures when environments change (API migrations, key rotations).
- **Folder-based storage**: Scripts as `.js` files get full IDE support (syntax highlighting, IntelliSense). Git diffs are clean per-request. Consistent with the existing collection folder format. Fewer merge conflicts for teams.

---

## Storage Format — Folder-Based

### Directory Structure

```
suites/
└── login-flow/
    ├── suite.json                    ← metadata + config + request order
    ├── login-request/
    │   ├── request.json              ← full CollectionRequest snapshot
    │   ├── body.json                 ← external body (optional, for large bodies)
    │   └── scripts/
    │       ├── pre-request.js
    │       └── post-response.js
    ├── get-user-profile/
    │   ├── request.json
    │   └── scripts/
    │       └── post-response.js
    └── update-profile/
        └── request.json
```

### `suite.json` format

```json
{
    "id": "suite_login_flow",
    "name": "Login Flow — Happy Path",
    "description": "Tests the full login → profile → logout flow",
    "config": {
        "iterations": 1,
        "delayBetweenRequests": 0,
        "stopOnError": false
    },
    "requests": [
        {
            "slug": "login-request",
            "collectionId": "auth_api",
            "requestId": "login_req_001",
            "enabled": true
        },
        {
            "slug": "get-user-profile",
            "collectionId": "auth_api",
            "requestId": "profile_req_002",
            "enabled": true
        }
    ],
    "createdAt": 1700000000000,
    "updatedAt": 1700000000000
}
```

### `request.json` format (same as collection request.json)

```json
{
    "id": "login_req_001",
    "name": "Login",
    "method": "POST",
    "url": "{{baseUrl}}/auth/login",
    "headers": [
        { "key": "Content-Type", "value": "application/json", "enabled": true }
    ],
    "body": {
        "mode": "raw",
        "raw": "{\"username\": \"test-user\", \"password\": \"{{password}}\"}"
    },
    "settings": {
        "timeout": 30000,
        "followRedirects": true,
        "includeCookies": true
    }
}
```

Scripts are stored as separate files (not embedded in JSON):
- `scripts/pre-request.js` — full IDE syntax support
- `scripts/post-response.js` — full IDE syntax support

### Slug and ID Naming

- **`requestId`** — Same UUID as the collection source. Used for provenance tracking, "Re-sync from Collection", and resolving collection/folder script chains.
- **`slug`** (folder name) — Defaults to the same slug as the collection's folder name for immediate visual correlation:
  - Collection: `collections/auth-api/login-request/request.json`
  - Suite: `suites/login-flow/login-request/request.json`

**Duplicate handling**: When the same collection request is added to a suite multiple times (different test scenarios), a numeric suffix is appended:

```
suites/login-flow/
├── login-request/         ← first instance (valid credentials scenario)
├── login-request-2/       ← second instance (expired token scenario)
└── suite.json
```

Both reference the same `collectionId:requestId` (same provenance, same script context) but have independent request data for different test scenarios.

---

## Data Model Changes

### 1. `SuiteRequest` — folder-based reference

**File**: `http-forge.core/src/infrastructure/test-suite/interfaces.ts`

```typescript
export interface SuiteRequest {
    /** Folder slug (directory name) within the suite */
    slug: string;
    /** Source collection ID (provenance) */
    collectionId: string;
    /** Source request ID (provenance) */
    requestId: string;
    /** Whether this request is enabled for execution */
    enabled?: boolean;

    // Display cache fields (optional — can be derived from request.json)
    collectionName?: string;
    name?: string;
    method?: string;
    folderPath?: string;
}
```

The full request data (URL, headers, body, auth, settings, scripts) lives in the `{slug}/request.json` file + `{slug}/scripts/*.js` files.

### 2. `SuiteRequestEntry` — no structural changes

```typescript
// Already exists in test-suite-store.ts — no change needed
export interface SuiteRequestEntry {
    request: CollectionRequest;           // Loaded from suite's request.json
    suiteRequest: SuiteRequest;
    collectionScripts?: RequestScripts;   // Always from live collection
    folderScriptsChain: RequestScripts[]; // Always from live collection
}
```

### 3. `RequestContext` — add suite metadata

**File**: `http-forge/src/shared/utils.ts`

```typescript
export interface RequestContext {
    // Existing fields...
    title?: string;
    collectionId?: string;
    requestId?: string;
    request?: CollectionRequest;
    readonly?: boolean;
    allowSave?: boolean;
    // ...

    // NEW — suite editing context
    suiteId?: string;          // Suite being edited
    suiteRequestKey?: string;  // Format: "collectionId:requestId" or slug
    disableSchemas?: boolean;  // Hide schema tabs/actions in webview
    disableHistory?: boolean;  // Hide history tab in webview
}
```

When `suiteId` is set:
- The save handler writes back to the suite folder instead of the collection
- `disableSchemas: true` hides Body Schema / Response Schema tabs and disables all schema operations (infer, validate, capture, generate). Schemas are a collection-level API contract concern.
- `disableHistory: true` hides the History tab (suite requests have no individual execution history).

### 4. Request Tester Panel — Tab Visibility

When opened in suite context, the following tabs/features are controlled:

| Tab / Feature | Visible | Reason |
|---------------|---------|--------|
| **Params** (path + query) | ✅ Keep | Core request data |
| **Headers** | ✅ Keep | Core request data |
| **Body** | ✅ Keep | Core request data |
| **Auth** | ✅ Keep | Different auth per scenario |
| **Settings** | ✅ Keep | Timeout, redirects, cookies per scenario |
| **Pre-request Script** | ✅ Keep | Custom test setup |
| **Post-response Script** | ✅ Keep | Custom assertions |
| **Send + Response** | ✅ Keep | Test the request before saving |
| **Cookies** | ✅ Keep | Debug auth flows |
| **Console** | ✅ Keep | Debug scripts |
| **Body Schema** | ❌ Hide | Collection-level concern |
| **Response Schema** | ❌ Hide | Collection-level concern |
| **History** | ❌ Hide | Not relevant in suite context |

---

## Implementation Steps

### Phase 1: Core — Folder-Based Suite Storage & Resolution

#### Step 1.1: Update `SuiteRequest` interface

**File**: `http-forge.core/src/infrastructure/test-suite/interfaces.ts`

Replace the current `SuiteRequest` with the folder-based version (add `slug`, make `request` field removed — data lives in files). Keep `collectionId` + `requestId` for provenance.

#### Step 1.2: Create `FolderSuiteStore` (or update `TestSuiteStore`)

**File**: `http-forge.core/src/infrastructure/test-suite/test-suite-store.ts`

Add methods to read/write request data from suite folders:

```typescript
/**
 * Load a suite request from its folder.
 * Reads request.json + scripts/pre-request.js + scripts/post-response.js
 */
private loadSuiteRequest(suiteDir: string, slug: string): CollectionRequest | undefined {
    const requestPath = path.join(suiteDir, slug, 'request.json');
    if (!fs.existsSync(requestPath)) return undefined;
    
    const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
    
    // Load scripts from separate files
    const scriptsDir = path.join(suiteDir, slug, 'scripts');
    request.scripts = readScriptsFromDir(scriptsDir);  // reuse existing utility
    
    // Load external body file if applicable
    request.body = readBodyFromDir(path.join(suiteDir, slug), request.body);
    
    return request;
}

/**
 * Save a suite request to its folder.
 * Writes request.json + scripts/pre-request.js + scripts/post-response.js
 */
private saveSuiteRequest(suiteDir: string, slug: string, request: CollectionRequest): void {
    const requestDir = path.join(suiteDir, slug);
    fs.mkdirSync(requestDir, { recursive: true });
    
    // Extract scripts to separate files
    const { scripts, ...requestWithoutScripts } = request;
    writeScriptsToDir(path.join(requestDir, 'scripts'), scripts);
    
    // Write request.json (without inline scripts)
    fs.writeFileSync(
        path.join(requestDir, 'request.json'),
        JSON.stringify(requestWithoutScripts, null, 2)
    );
}
```

#### Step 1.3: Update `resolveRequest()`

```typescript
private resolveRequest(suiteRequest: SuiteRequest): SuiteRequestEntry | undefined {
    const collection = this.collectionService.getCollection(suiteRequest.collectionId);

    // Request data: load from suite folder
    const request = this.loadSuiteRequest(this.suiteDir, suiteRequest.slug);
    if (!request) {
        // Fallback: try collection lookup (backward compat for old suites)
        if (!collection) return undefined;
        const requestData = this.findRequestInCollection(collection, suiteRequest.requestId);
        if (!requestData) return undefined;
        return { request: requestData.request, suiteRequest, collectionScripts: collection.scripts, folderScriptsChain: requestData.folderScriptsChain };
    }

    // Scripts: ALWAYS resolve live from collection (not snapshotted)
    let collectionScripts: RequestScripts | undefined;
    let folderScriptsChain: RequestScripts[] = [];

    if (collection) {
        collectionScripts = collection.scripts;
        const requestData = this.findRequestInCollection(collection, suiteRequest.requestId);
        if (requestData) {
            folderScriptsChain = requestData.folderScriptsChain;
        }
    }

    return { request, suiteRequest, collectionScripts, folderScriptsChain };
}
```

#### Step 1.4: Update `getResolvedRequests()` return type

Add `hasEmbeddedRequest: boolean` to the return objects so the webview can show a visual indicator:

```typescript
getResolvedRequests(): Array<{
    // ...existing fields...
    hasEmbeddedRequest: boolean;  // NEW — true when request.json exists in suite folder
}>
```

#### Step 1.5: Add `updateSuiteRequest()` method

```typescript
/**
 * Update the request data in the suite folder.
 * Called when user edits a request from the suite panel.
 */
updateSuiteRequest(slug: string, updatedRequest: CollectionRequest): void {
    if (!this.suite || !this.suiteDir) return;
    this.saveSuiteRequest(this.suiteDir, slug, updatedRequest);

    // Sync cached display fields in suite.json
    const sr = this.suite.requests.find(r => r.slug === slug);
    if (sr) {
        sr.name = updatedRequest.name || sr.name;
        sr.method = updatedRequest.method || sr.method;
    }
}
```

#### Step 1.6: Add `resyncFromCollection()` method

```typescript
/**
 * Replace the suite request with the latest version from the collection.
 * Overwrites the request folder content.
 */
resyncFromCollection(slug: string): CollectionRequest | undefined {
    if (!this.suite || !this.suiteDir) return undefined;
    
    const sr = this.suite.requests.find(r => r.slug === slug);
    if (!sr) return undefined;

    const collection = this.collectionService.getCollection(sr.collectionId);
    if (!collection) return undefined;

    const requestData = this.findRequestInCollection(collection, sr.requestId);
    if (!requestData) return undefined;

    // Overwrite suite folder with fresh collection data
    this.saveSuiteRequest(this.suiteDir, slug, requestData.request);
    
    // Sync display fields
    sr.name = requestData.request.name || sr.name;
    sr.method = requestData.request.method || sr.method;

    return requestData.request;
}
```

#### Step 1.7: Update `addRequest()` to create folder

```typescript
addRequest(suiteRequest: SuiteRequest, fullRequest: CollectionRequest): void {
    if (!this.suite || !this.suiteDir) return;
    
    // Resolve slug (handle duplicates)
    suiteRequest.slug = this.resolveUniqueSlug(suiteRequest.slug);
    
    // Write request to folder
    this.saveSuiteRequest(this.suiteDir, suiteRequest.slug, fullRequest);
    
    // Add to suite manifest
    this.suite.requests.push(suiteRequest);
}

private resolveUniqueSlug(baseSlug: string): string {
    const existingSlugs = new Set(this.suite!.requests.map(r => r.slug));
    if (!existingSlugs.has(baseSlug)) return baseSlug;
    
    let counter = 2;
    while (existingSlugs.has(`${baseSlug}-${counter}`)) counter++;
    return `${baseSlug}-${counter}`;
}
```

#### Step 1.8: Update `ITestSuiteStore` interface

Add new methods:
- `updateSuiteRequest(slug, updatedRequest)`
- `resyncFromCollection(slug)`
- Updated `addRequest(suiteRequest, fullRequest)` signature
- `loadSuiteRequest(suiteDir, slug)`

---

### Phase 2: Extension — Add-to-Suite with Folder Creation

#### Step 2.1: Update `handleAddRequests()` in save-handler

**File**: `http-forge/src/presentation/webview/panels/test-suite/handlers/save-handler.ts`

When adding requests to a suite, resolve the full `CollectionRequest` and write it to a suite subfolder:

```typescript
private async handleAddRequests(
    message: { requests: any[] },
    messenger: IWebviewMessenger
): Promise<void> {
    const suite = this.suiteStore.getSuite();
    if (!suite || !message.requests?.length) return;

    for (const ref of message.requests) {
        // Resolve full request from collection
        const entry = this.suiteStore.getRequestWithContext(ref.collectionId, ref.requestId);
        if (!entry) continue;

        const suiteRequest: SuiteRequest = {
            slug: sanitizeName(entry.request.name),  // generate slug from request name
            collectionId: ref.collectionId,
            requestId: ref.requestId,
            collectionName: ref.collectionName || '',
            name: entry.request.name,
            method: entry.request.method || 'GET',
            folderPath: ref.folderPath || '',
            enabled: ref.enabled !== false
        };

        // Creates folder + writes request.json + scripts/*.js
        this.suiteStore.addRequest(suiteRequest, entry.request);
    }

    // Save suite.json manifest and notify webview
    await this.suiteService.saveSuite(suite);
    // ...send updated data to webview
}
```

---

### Phase 3: Extension — Suite Request Editing UX

#### Step 3.1: Add `RequestContext.suiteId`, `suiteRequestKey`, and feature flags

**File**: `http-forge/src/shared/utils.ts`

Add optional fields to `RequestContext`:
```typescript
suiteId?: string;
suiteRequestKey?: string;   // slug
disableSchemas?: boolean;
disableHistory?: boolean;
```

#### Step 3.2: Create `edit-request-handler.ts`

**File**: `http-forge/src/presentation/webview/panels/test-suite/handlers/edit-request-handler.ts`

New handler for suite request editing commands:

```typescript
export class EditRequestHandler implements IMessageHandler {
    constructor(
        private suiteStore: ITestSuiteStore,
        private suiteService: ITestSuiteService,
        private panelManager: RequestTesterPanelManager
    ) {}

    getSupportedCommands(): string[] {
        return ['editSuiteRequest', 'resetSuiteRequest', 'openOriginalRequest'];
    }

    async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
        switch (command) {
            case 'editSuiteRequest':
                await this.handleEditRequest(message, messenger);
                return true;
            case 'resetSuiteRequest':
                await this.handleResetRequest(message, messenger);
                return true;
            case 'openOriginalRequest':
                await this.handleOpenOriginalRequest(message);
                return true;
            default:
                return false;
        }
    }
}
```

#### Step 3.3: `handleEditRequest` — open in Request Tester panel

```typescript
private async handleEditRequest(
    message: { slug: string },
    messenger: IWebviewMessenger
): Promise<void> {
    const suite = this.suiteStore.getSuite();
    if (!suite) return;

    const sr = suite.requests.find(r => r.slug === message.slug);
    if (!sr) return;

    const entry = this.suiteStore.getRequestWithContext(sr.collectionId, sr.requestId);
    if (!entry) return;

    const context: RequestContext = {
        title: `[${suite.name}] ${entry.request.name}`,
        collectionId: sr.collectionId,
        requestId: sr.requestId,
        collectionName: sr.collectionName,
        request: entry.request,
        allowSave: true,
        suiteId: suite.id,
        suiteRequestKey: sr.slug,
        disableSchemas: true,
        disableHistory: true
    };

    await this.panelManager.show(context, true);
}
```

#### Step 3.4: Tab visibility in Request Tester webview

When the webview receives initial data with suite context flags:

**Visible tabs** (core editing):
- Params, Headers, Body, Auth, Settings
- Pre-request Script, Post-response Script
- Send + Response viewer, Cookies, Console

**Hidden tabs** (collection-level concerns):
- Body Schema (`disableSchemas: true`)
- Response Schema (`disableSchemas: true`)
- History (`disableHistory: true`)

**Extension-side safety**: `SchemaHandler` early-returns for any save operations if `context?.disableSchemas` is true.

#### Step 3.5: Suite-aware save in `SaveRequestHandler`

**File**: `http-forge/src/presentation/webview/panels/request-tester/handlers/save-request-handler.ts`

Add a check at the top of the save flow:

```typescript
async handle(command: string, message: any, messenger: IWebviewMessenger): Promise<boolean> {
    if (command !== 'saveRequest') return false;

    const context = this.contextProvider.getCurrentContext();

    // Suite-aware save: write back to suite folder instead of collection
    if (context?.suiteId && context?.suiteRequestKey) {
        await this.handleSaveSuiteRequest(message, context, messenger);
        return true;
    }

    // Existing collection save flow...
}

private async handleSaveSuiteRequest(
    message: any,
    context: RequestContext,
    messenger: IWebviewMessenger
): Promise<void> {
    const slug = context.suiteRequestKey!;

    // Build CollectionRequest from the UI message
    const updatedRequest = this.buildRequestFromMessage(message);

    // Update the suite's request folder (request.json + scripts/)
    this.suiteStore.updateSuiteRequest(slug, updatedRequest);

    // Persist suite.json (updates cached name/method)
    const suite = this.suiteStore.getSuite();
    if (suite) {
        await this.suiteService.saveSuite(suite);
    }

    messenger.postMessage({ command: 'requestSaved', data: { request: updatedRequest } });
}
```

#### Step 3.6: `handleResetRequest` — re-sync from collection

```typescript
private async handleResetRequest(
    message: { slug: string },
    messenger: IWebviewMessenger
): Promise<void> {
    const updatedRequest = this.suiteStore.resyncFromCollection(message.slug);
    if (!updatedRequest) return;

    // Persist suite.json
    const suite = this.suiteStore.getSuite();
    if (suite) {
        await this.suiteService.saveSuite(suite);
    }

    // Refresh webview
    this.sendUpdatedSuiteData(messenger);
}
```

#### Step 3.7: Register handler in `TestSuitePanel`

**File**: `http-forge/src/presentation/webview/panels/test-suite/test-suite-panel.ts`

Add `EditRequestHandler` to the message router's handler list.

---

### Phase 4: Webview UI

#### Step 4.1: Add "Edit" button to each request row

**File**: `http-forge/resources/features/test-suite/modules/main.js`

In the request list rendering, add a pencil icon button:

```html
<button class="edit-btn" title="Edit request in this suite"
        onclick="editSuiteRequest('${slug}')">
    <i class="codicon codicon-edit"></i>
</button>
```

```javascript
function editSuiteRequest(slug) {
    vscode.postMessage({ type: 'editSuiteRequest', slug });
}
```

#### Step 4.2: Add "Modified" badge

Requests with `hasEmbeddedRequest: true` show a small badge:

```html
<span class="modified-badge" title="Customized in this suite">●</span>
```

Style with a subtle color indicator (e.g., blue dot).

#### Step 4.3: Add "Re-sync from Collection" button/menu

For requests with embedded data, add a refresh icon:

```html
<button class="resync-btn" title="Reset to collection version"
        onclick="resetSuiteRequest('${slug}')">
    <i class="codicon codicon-sync"></i>
</button>
```

With a confirmation dialog before executing:

```javascript
function resetSuiteRequest(slug) {
    if (confirm('Reset to collection version? Your suite customizations will be lost.')) {
        vscode.postMessage({ type: 'resetSuiteRequest', slug });
    }
}
```

---

### Phase 5: Migration (Backward Compatibility)

#### Step 5.1: Migrate old `.suite.json` files to folder format

**File**: `http-forge.core/src/infrastructure/test-suite/test-suite-service.ts`

On startup, detect old single-file suites and migrate:

```typescript
private migrateLegacySuite(legacyFile: string): void {
    const suite = JSON.parse(fs.readFileSync(legacyFile, 'utf-8')) as TestSuite;
    const suiteDir = path.join(this.suitesDir, sanitizeName(suite.name));
    
    fs.mkdirSync(suiteDir, { recursive: true });
    
    // Migrate each request reference → create folder with request.json
    for (const sr of suite.requests) {
        const slug = sanitizeName(sr.name || sr.requestId);
        sr.slug = slug;
        
        // If old format had embedded `request` field, use it
        if ((sr as any).request) {
            this.saveSuiteRequest(suiteDir, slug, (sr as any).request);
            delete (sr as any).request;  // remove from manifest
        } else {
            // Resolve from collection and create folder
            const collection = this.collectionService.getCollection(sr.collectionId);
            if (collection) {
                const found = this.findRequestInCollection(collection, sr.requestId);
                if (found) {
                    this.saveSuiteRequest(suiteDir, slug, found.request);
                }
            }
        }
    }
    
    // Write new suite.json manifest (without embedded request data)
    fs.writeFileSync(path.join(suiteDir, 'suite.json'), JSON.stringify(suite, null, 2));
    
    // Remove old single-file suite
    fs.unlinkSync(legacyFile);
}
```

Detection: if `*.suite.json` files exist in the suites directory, they are legacy format. Folder-based suites are detected by the presence of a `suite.json` inside a subdirectory.

---

## Execution Flow — No Changes Needed

The execution pipeline is transparent to this change:

```
Suite Run:
  1. SuiteRunHandler iterates selected requests
  2. For each: suiteStore.getRequestWithContext(collectionId, requestId)
     → Returns SuiteRequestEntry with:
        - request: from embedded copy (or collection fallback)
        - collectionScripts: live from collection
        - folderScriptsChain: live from collection
  3. CollectionRequestExecutor.execute(entry.request, variables, signal)
     → Uses the embedded (possibly edited) request data
     → Collection/folder scripts run in standard order
```

No changes to `SuiteRunHandler`, `CollectionRequestExecutor`, or the script execution pipeline.

---

## File Summary

| File | Action | Phase |
|------|--------|-------|
| `http-forge.core/src/infrastructure/test-suite/interfaces.ts` | Update `SuiteRequest` with `slug`, remove inline `request` | 1 |
| `http-forge.core/src/infrastructure/test-suite/test-suite-store.ts` | Folder I/O (`loadSuiteRequest`, `saveSuiteRequest`), update `resolveRequest()`, add `updateSuiteRequest()`, `resyncFromCollection()`, `addRequest()` | 1 |
| `http-forge.core/src/infrastructure/test-suite/test-suite-service.ts` | Folder-based suite discovery, legacy migration | 1, 5 |
| `http-forge.core/src/index.ts` | Export new types if needed | 1 |
| `http-forge/src/shared/utils.ts` | Add `suiteId`, `suiteRequestKey`, `disableSchemas`, `disableHistory` to `RequestContext` | 3 |
| `http-forge/src/presentation/webview/panels/test-suite/handlers/save-handler.ts` | Update `handleAddRequests()` to create request folder | 2 |
| `http-forge/src/presentation/webview/panels/test-suite/handlers/edit-request-handler.ts` | **NEW** — `editSuiteRequest`, `resetSuiteRequest` | 3 |
| `http-forge/src/presentation/webview/panels/test-suite/test-suite-panel.ts` | Register `EditRequestHandler` | 3 |
| `http-forge/src/presentation/webview/panels/request-tester/handlers/save-request-handler.ts` | Add suite-aware save path (writes to folder) | 3 |
| `http-forge/src/presentation/webview/panels/request-tester/handlers/schema-handler.ts` | Early-return for save ops when `disableSchemas` | 3 |
| `http-forge/resources/features/test-suite/modules/main.js` | Edit/Reset buttons, Modified badge | 4 |
| `http-forge/resources/features/request-tester/modules/main.js` | Tab visibility based on `disableSchemas` / `disableHistory` flags | 4 |

---

## Verification Plan

### Unit Tests

1. **`TestSuiteStore.resolveRequest()`**
   - Suite folder has `request.json` → loads and returns it
   - Suite folder missing `request.json` → falls back to collection (backward compat)
   - Collection deleted but suite folder has `request.json` → still returns request (scripts empty)

2. **`TestSuiteStore.updateSuiteRequest()`**
   - Writes updated `request.json` + scripts to suite folder
   - Syncs `name` and `method` in `suite.json`

3. **`TestSuiteStore.resyncFromCollection()`**
   - Overwrites suite folder with latest collection version
   - Returns undefined if collection/request not found

4. **`TestSuiteStore.addRequest()` with folder creation**
   - Creates slug-named directory with `request.json` + `scripts/`
   - Handles duplicate slugs with numeric suffix

5. **`resolveUniqueSlug()`**
   - Base slug not taken → returns as-is
   - Base slug taken → returns `slug-2`, `slug-3`, etc.

6. **Migration**
   - Old `.suite.json` single-file → converted to folder structure
   - Legacy file removed after successful migration

### Integration Tests

7. Add request to suite → verify folder created with `request.json` + scripts
8. Edit suite request → save → reload suite → verify edits persisted in folder
9. Modify collection request → verify suite's folder copy unchanged
10. Re-sync from collection → verify suite folder overwritten with latest
11. Edit pre-request script via VS Code file editor → verify suite uses updated `.js` file

### Manual Tests

12. Open suite → click Edit on request → modify URL + body + script → save → run suite → verify modified request is used
13. Reset request to collection version → run suite → verify original request is used
14. Create new suite, add requests → verify folder structure created correctly
15. Open old single-file suite → verify auto-migration to folder format
16. Verify schema tabs are hidden when editing suite request
17. Verify history tab is hidden when editing suite request
18. Verify Settings tab is visible and editable in suite context
19. Add same request twice → verify slug deduplication (`login-request`, `login-request-2`)

### Build Verification

```bash
cd http-forge.core && npx tsup
cp -r dist/* ../http-forge/node_modules/@http-forge/core/dist/
cd ../http-forge && node esbuild.js
cd ../http-forge.core && npx vitest run
```

---

## Suite Run History — Implementation Plan

### Problem

The backend already persists every suite run to disk (`<resultsPath>/<suiteId>/<runId>/`) with full manifests, paginated index pages, and individual result files. However, the webview only shows results from the **current/latest run** — once the panel closes or a new run starts, previous results are lost from the UI (though they remain on disk).

### Existing Backend Support

| Method | Interface | Status |
|--------|-----------|--------|
| `listRuns(suiteId)` | `IResultStorageService` | ✅ Implemented — returns `RunManifest[]` sorted newest-first |
| `getManifest(suiteId, runId)` | `IResultStorageService` | ✅ Implemented |
| `getIndexPage(suiteId, runId, page)` | `IResultStorageService` | ✅ Implemented |
| `getResultDetails(suiteId, runId, resultFile)` | `IResultStorageService` | ✅ Implemented |
| `deleteRun(suiteId, runId)` | `IResultStorageService` | ✅ Implemented |
| `cleanupOldRuns()` | `IResultStorageService` | ✅ Implemented (retention-based) |

### Design

#### UI Concept

Add a **"History" dropdown/panel** in the Results tab area. When no run is active:
- Show a list of past runs with: date/time, status badge, pass/fail counts, duration, environment
- Click a run → load its results into the same virtual-scrolling results view
- "Delete" button per run (with confirmation)

When a run is active:
- History dropdown still accessible but the live results take priority
- After run completes, it appears at the top of history

#### Message Types

Add to `WebviewToExtensionMessage`:

```typescript
| { type: 'getRunHistory' }
| { type: 'loadHistoryRun'; runId: string }
| { type: 'deleteHistoryRun'; runId: string }
```

Add to `ExtensionToWebviewMessage`:

```typescript
| { type: 'runHistory'; runs: RunHistoryEntry[] }
| { type: 'historyRunLoaded'; manifest: RunManifest; summaries: ResultSummary[] }
| { type: 'historyRunDeleted'; runId: string }
```

#### RunHistoryEntry (lightweight for list display)

```typescript
interface RunHistoryEntry {
    runId: string;
    startTime: string;
    endTime?: string;
    status: 'completed' | 'aborted' | 'error';
    environment: string;
    stats: {
        totalRequests: number;
        passed: number;
        failed: number;
        totalDuration: number;
    };
    config: {
        iterations: number;
    };
}
```

Derived from `RunManifest` — just pick the fields needed for the list UI.

---

### Implementation Phases

#### Phase H1: Handler — History Message Handling

**File**: `http-forge/src/presentation/webview/panels/test-suite/handlers/history-handler.ts` (NEW)

```typescript
export class HistoryHandler {
    constructor(
        private panel: WebviewPanel,
        private resultStorageService: IResultStorageService
    ) {}

    async handleGetRunHistory(suiteId: string): Promise<void> {
        const manifests = await this.resultStorageService.listRuns(suiteId);
        const runs: RunHistoryEntry[] = manifests
            .filter(m => m.status !== 'running')
            .map(m => ({
                runId: m.runId,
                startTime: m.startTime,
                endTime: m.endTime,
                status: m.status,
                environment: m.environment,
                stats: {
                    totalRequests: m.stats.totalRequests,
                    passed: m.stats.passed,
                    failed: m.stats.failed,
                    totalDuration: m.stats.totalDuration,
                },
                config: { iterations: m.config.iterations },
            }));
        this.panel.webview.postMessage({ type: 'runHistory', runs });
    }

    async handleLoadHistoryRun(suiteId: string, runId: string): Promise<void> {
        const manifest = await this.resultStorageService.getManifest(suiteId, runId);
        // Load all index pages to reconstruct full summary list
        const summaries: ResultSummary[] = [];
        for (let page = 1; page <= manifest.totalIndexPages; page++) {
            const indexPage = await this.resultStorageService.getIndexPage(suiteId, runId, page);
            summaries.push(...indexPage.summaries);
        }
        this.panel.webview.postMessage({ type: 'historyRunLoaded', manifest, summaries });
    }

    async handleDeleteHistoryRun(suiteId: string, runId: string): Promise<void> {
        await this.resultStorageService.deleteRun(suiteId, runId);
        this.panel.webview.postMessage({ type: 'historyRunDeleted', runId });
    }
}
```

#### Phase H2: Register Handler in Suite Panel

**File**: `http-forge/src/presentation/webview/panels/test-suite/test-suite-panel.ts`

- Import and instantiate `HistoryHandler`
- Add cases to the message switch for `getRunHistory`, `loadHistoryRun`, `deleteHistoryRun`

#### Phase H3: Webview UI — History Panel

**File**: `http-forge/resources/features/test-suite/modules/main.js`

1. **History button** in the Results tab toolbar:
   ```html
   <button class="history-btn" title="Run History" onclick="toggleRunHistory()">
       <i class="codicon codicon-history"></i>
   </button>
   ```

2. **History list panel** (slide-in or dropdown):
   ```html
   <div id="run-history-panel" class="hidden">
       <div class="history-header">
           <span>Run History</span>
           <button onclick="toggleRunHistory()">×</button>
       </div>
       <div id="history-list"></div>
   </div>
   ```

3. **Rendering** each history entry:
   ```javascript
   function renderHistoryEntry(run) {
       const date = new Date(run.startTime).toLocaleString();
       const passRate = ((run.stats.passed / run.stats.totalRequests) * 100).toFixed(0);
       const duration = formatDuration(run.stats.totalDuration);
       const statusClass = run.status === 'completed' ? 'success' : 'error';
       return `
           <div class="history-entry ${statusClass}" data-run-id="${run.runId}">
               <div class="history-entry-header">
                   <span class="history-date">${date}</span>
                   <span class="history-status badge-${run.status}">${run.status}</span>
               </div>
               <div class="history-entry-stats">
                   <span class="pass-rate">${passRate}% passed</span>
                   <span>${run.stats.passed}✓ ${run.stats.failed}✗</span>
                   <span>${duration}</span>
                   <span>${run.config.iterations} iter</span>
               </div>
               <div class="history-entry-actions">
                   <button onclick="loadHistoryRun('${run.runId}')">Load</button>
                   <button onclick="deleteHistoryRun('${run.runId}')">
                       <i class="codicon codicon-trash"></i>
                   </button>
               </div>
           </div>
       `;
   }
   ```

4. **Load action** — on click, request full results and populate the same results view:
   ```javascript
   function loadHistoryRun(runId) {
       state.viewingHistoryRun = runId;
       vscode.postMessage({ type: 'loadHistoryRun', runId });
   }
   ```

5. **Handle `historyRunLoaded`** — populate virtual-scroll results list from summaries:
   ```javascript
   case 'historyRunLoaded':
       state.results = msg.summaries;
       state.viewingHistoryRun = msg.manifest.runId;
       state.historyManifest = msg.manifest;
       renderResultsFromHistory(msg.manifest, msg.summaries);
       break;
   ```

6. **History indicator** — when viewing a past run, show a banner:
   ```html
   <div class="history-banner">
       Viewing run from ${date} · <a onclick="clearHistoryView()">Back to latest</a>
   </div>
   ```

#### Phase H4: Auto-refresh History on Run Complete

After a run completes, if the history panel is open, re-fetch the list so the new run appears.

In `handleRunComplete`:
```javascript
if (state.historyPanelOpen) {
    vscode.postMessage({ type: 'getRunHistory' });
}
```

#### Phase H5: Detail View from History

Clicking an individual result in a loaded history run should still work — the existing `getResultDetails` message already accepts `suiteId` + `runId` + `resultFile`. Just ensure the webview passes the history run's `runId` instead of the `currentRunId`:

```javascript
function showResultDetail(summary) {
    const runId = state.viewingHistoryRun || state.currentRunId;
    vscode.postMessage({
        type: 'getResultDetails',
        suiteId: state.suiteId,
        runId,
        resultFile: buildResultFileName(summary.i, summary.it, summary.r)
    });
}
```

---

### File Summary (History Feature)

| File | Action | Phase |
|------|--------|-------|
| `http-forge/src/presentation/webview/panels/test-suite/interfaces.ts` | Add history message types | H1 |
| `http-forge/src/presentation/webview/panels/test-suite/handlers/history-handler.ts` | **NEW** — handle history messages | H1 |
| `http-forge/src/presentation/webview/panels/test-suite/test-suite-panel.ts` | Register HistoryHandler, wire messages | H2 |
| `http-forge/resources/features/test-suite/modules/main.js` | History UI panel, entry rendering, load/delete actions | H3 |
| `http-forge/resources/features/test-suite/styles/main.css` | Styles for history panel, entries, banner | H3 |

### Verification (History Feature)

1. Run suite → close panel → reopen → click History → verify past runs listed
2. Click "Load" on a past run → verify results populate the results view with correct data
3. Click individual result in loaded history → verify detail modal shows request/response
4. Delete a run → confirm prompt → verify removed from list and disk
5. Run suite again → verify new run appears at top of history list
6. Run with multiple iterations → load from history → verify all results present
7. Verify "Back to latest" clears history view and shows current state
