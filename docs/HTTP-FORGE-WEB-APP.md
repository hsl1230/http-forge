Key Challenges
Types diverged — Extension uses CollectionRequest/ExecutionRequest/UIRequest system; core uses UnifiedRequest/HttpRequest/HttpResponse
Interface names differ — Extension's IHttpRequestService vs core's IHttpClient; Extension's VariableResolver vs core's VariableInterpolator
Extension has richer interfaces — Extension's ICollectionService has CRUD; core's ICollectionLoader is read-only
Extension has VS Code wrappers — CookieService (globalState persistence), EnvironmentConfigService (file watcher), ConfigService (vscode.workspace)# HTTP Forge Web App — Full Solution Design

> **Goal:** Create a standalone web-based HTTP Forge app that reuses the existing `@http-forge/core` engine and the VS Code extension's webview UI. The app runs as a local Node.js server, opens in the user's browser, and can optionally be deployed as a shared team server.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Package Structure](#2-package-structure)
3. [Reuse Inventory](#3-reuse-inventory)
4. [Server Architecture](#4-server-architecture)
5. [Message Bridge — The Key Adapter](#5-message-bridge--the-key-adapter)
6. [IPC Message Protocol](#6-ipc-message-protocol)
7. [App Shell & Navigation](#7-app-shell--navigation)
8. [IPC Handler — Mapping Messages to Core Services](#8-ipc-handler--mapping-messages-to-core-services)
9. [Storage & State Management](#9-storage--state-management)
10. [Configuration](#10-configuration)
11. [File Watching](#11-file-watching)
12. [Distribution](#12-distribution)
13. [Server Mode (Team / Remote)](#13-server-mode-team--remote)
14. [Implementation Phases](#14-implementation-phases)
15. [Technology Choices](#15-technology-choices)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  User's Browser (Chrome / Firefox / Safari / Edge)      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Shell (sidebar + content area)               │  │
│  │  ┌──────────┐ ┌────────────────────────────────┐  │  │
│  │  │ Sidebar  │ │  Feature Panels (iframes)      │  │  │
│  │  │          │ │  ┌──────────────────────────┐  │  │  │
│  │  │ • Colls  │ │  │ request-tester/          │  │  │  │
│  │  │ • Envs   │ │  │ collection-editor/       │  │  │  │
│  │  │ • History│ │  │ environment-editor/       │  │  │  │
│  │  │ • Suites │ │  │ folder-editor/            │  │  │  │
│  │  │          │ │  │ test-suite/               │  │  │  │
│  │  │          │ │  │ (existing HTML/CSS/JS)    │  │  │  │
│  │  └──────────┘ │  └──────────────────────────┘  │  │  │
│  │               └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (static files)
                       │ WebSocket (messages)
                       │ REST API (data queries)
┌──────────────────────▼──────────────────────────────────┐
│  Node.js Server Process                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Express / Fastify                                │  │
│  │  ├── Static file server  (serves existing UI)     │  │
│  │  ├── REST API routes     (collections, envs, …)   │  │
│  │  ├── WebSocket handler   (bidirectional messages)  │  │
│  │  └── File watcher        (chokidar → push updates) │  │
│  │                                                    │  │
│  │  @http-forge/core                                  │  │
│  │  ├── ForgeContainer      (DI wiring)              │  │
│  │  ├── CollectionLoader    (load/parse collections)  │  │
│  │  ├── EnvironmentResolver (variable substitution)   │  │
│  │  ├── RequestExecutor     (full execution pipeline) │  │
│  │  ├── ScriptExecutor      (pre/post scripts)       │  │
│  │  ├── CookieJar           (cookie management)      │  │
│  │  └── ...all other core services                    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Package Structure

```
http-forge/
  packages/
    core/                    ← EXISTS — engine library (unchanged)
    standalone/              ← EXISTS — CLI runner (unchanged)
    app/                     ← NEW — web app
      package.json
      tsconfig.json
      esbuild.config.js      (or tsup.config.ts)
      src/
        server.ts            ← Express app + WebSocket + static serving
        cli.ts               ← CLI entry: `http-forge-app [--port] [--open]`
        config.ts            ← App configuration loader
        watcher.ts           ← File system watcher (chokidar)
        storage.ts           ← Persistent state (cookies, history selection, etc.)
        ipc/
          ipc-router.ts      ← WebSocket message dispatcher
          handlers/
            request-execution-handler.ts
            save-request-handler.ts
            history-handler.ts
            environment-handler.ts
            cookie-handler.ts
            schema-handler.ts
            oauth2-handler.ts
            graphql-handler.ts
            variable-handler.ts
            collection-handler.ts
            suite-handler.ts
        api/
          collections.ts     ← REST: GET /api/collections, GET /api/collections/:id/requests
          environments.ts    ← REST: GET /api/environments, PUT /api/environments/select
          history.ts         ← REST: GET /api/history
          suites.ts          ← REST: GET /api/suites
      public/
        index.html           ← App shell (sidebar + content iframe)
        app.css              ← App shell styles
        app.js               ← App shell logic (sidebar navigation, tabs)
        bridge.js            ← acquireVsCodeApi() shim → WebSocket
        components/
          sidebar.js         ← Collection tree, environment picker, history list
          tab-bar.js         ← Tab management for multiple open requests
        features/            ← SYMLINK or COPY of resources/features/
          request-tester/    ← Existing (unchanged)
          collection-editor/ ← Existing (unchanged)
          environment-editor/← Existing (unchanged)
          folder-editor/     ← Existing (unchanged)
          test-suite/        ← Existing (unchanged)
        shared/              ← SYMLINK or COPY of resources/shared/
```

### New Code Estimate

| File | Lines | Notes |
|------|-------|-------|
| `server.ts` | ~150 | Express + WS + static serving |
| `cli.ts` | ~80 | Arg parsing, open browser |
| `config.ts` | ~60 | Load `.http-forge/http-forge.config.json` |
| `watcher.ts` | ~80 | chokidar file watching → WS push |
| `storage.ts` | ~100 | JSON file-based state persistence |
| `ipc-router.ts` | ~80 | WebSocket message → handler dispatch |
| `handlers/*.ts` (9 files) | ~900 | Maps messages → `@http-forge/core` calls |
| `api/*.ts` (4 files) | ~300 | REST endpoints for sidebar data |
| `index.html` | ~120 | App shell layout |
| `app.css` | ~300 | App shell + sidebar styles |
| `app.js` | ~200 | Shell orchestration |
| `bridge.js` | ~50 | VS Code API shim |
| `sidebar.js` | ~400 | Collection tree + env picker |
| `tab-bar.js` | ~150 | Tab management |
| **Total new code** | **~2,970** | |

Reused code: **~16,000+ lines** (existing webview UI) + **~67 files** (`@http-forge/core`).

---

## 3. Reuse Inventory

### Direct Reuse (Zero Changes)

| Asset | Files | Lines |
|-------|-------|-------|
| `@http-forge/core` (npm dependency) | 67 | ~15,000+ |
| `resources/features/request-tester/` HTML + CSS | 2 | ~3,400 |
| `resources/features/request-tester/modules/` JS (21 of 26 modules) | 21 | ~7,000 |
| `resources/features/collection-editor/` | 3 | ~750 |
| `resources/features/environment-editor/` | 3 | ~660 |
| `resources/features/folder-editor/` | 3 | ~680 |
| `resources/features/test-suite/` | 4 | ~600 |
| `resources/shared/` (Monaco config) | 3 | ~420 |
| `resources/*.schema.json` | 6 | — |

### Reuse with Thin Adapter (bridge.js shim)

These 5 modules use `vscode.postMessage` / `acquireVsCodeApi` — they work unchanged because `bridge.js` provides the shim:

| Module | `postMessage` calls | How bridge handles it |
|--------|--------------------|-----------------------|
| `main.js` | 15 | All routed via WebSocket |
| `request-executor.js` | 2 | `sendRequest`, `cancelRequest` |
| `request-saver.js` | 1 | `saveRequest` |
| `schema-editor-manager.js` | 8 | Schema operations |
| `oauth2-manager.js` | 3 | Token operations |
| `graphql-manager.js` | 1 | Schema fetch |

### New Code (Cannot Reuse)

| Component | Why new | Replaces |
|-----------|---------|----------|
| App shell + sidebar | VS Code tree views are not portable | `collectionsTreeProvider`, `environmentsTreeProvider` |
| Tab bar | VS Code editor tabs are not portable | `vscode.WebviewPanel` multi-instance management |
| Server + WebSocket | New transport layer | `vscode.Webview.postMessage` |
| IPC handlers | Similar to extension handlers, but call core directly | `src/webview-panels/*/handlers/` |

---

## 4. Server Architecture

### `server.ts`

```typescript
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { ForgeContainer } from '@http-forge/core';
import { createIPCRouter } from './ipc/ipc-router';
import { createFileWatcher } from './watcher';
import { loadConfig } from './config';

export async function startServer(options: { port: number; open: boolean }) {
  const config = await loadConfig();
  const container = new ForgeContainer(config.core);

  // Load collections & environments at startup
  await container.collectionLoader.loadAll(config.collectionsRoot);
  await container.environmentStore.load(config.environmentsRoot);

  const app = express();
  const server = createServer(app);

  // ── Static files ──────────────────────────────
  app.use('/features', express.static(path.join(__dirname, '../public/features')));
  app.use('/shared', express.static(path.join(__dirname, '../public/shared')));
  app.use(express.static(path.join(__dirname, '../public')));

  // ── REST API (for sidebar data) ───────────────
  app.use('/api', createRestAPI(container));

  // ── WebSocket (for message bridge) ────────────
  const wss = new WebSocketServer({ server, path: '/ws' });
  const ipcRouter = createIPCRouter(container);

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      const msg = JSON.parse(raw.toString());
      const response = await ipcRouter.handle(msg);
      if (response) {
        ws.send(JSON.stringify(response));
      }
    });

    // Send initial state on connect
    ws.send(JSON.stringify({
      command: 'init',
      environments: container.environmentStore.getAll(),
      selectedEnvironment: container.environmentStore.getSelected(),
    }));
  });

  // ── File watcher → push updates ───────────────
  const watcher = createFileWatcher(config, container);
  watcher.on('collectionsChanged', () => {
    broadcast(wss, { command: 'collectionsChanged' });
  });
  watcher.on('environmentsChanged', () => {
    broadcast(wss, { command: 'environmentChanged' });
  });

  server.listen(options.port, () => {
    console.log(`HTTP Forge running at http://localhost:${options.port}`);
    if (options.open) openBrowser(`http://localhost:${options.port}`);
  });
}
```

### Request Flow

```
Browser                    Server
  │                          │
  │  WS: { command: 'sendRequest', request: {...} }
  │ ──────────────────────►  │
  │                          │  ipcRouter.handle()
  │                          │  → RequestExecutionHandler
  │                          │  → container.requestExecutor.execute(request)
  │                          │    → pre-request scripts
  │                          │    → variable resolution
  │                          │    → HTTP call
  │                          │    → post-response scripts
  │                          │    → save to history
  │                          │
  │  WS: { command: 'scriptProgress', testResults: [...] }
  │ ◄──────────────────────  │  (streamed during execution)
  │                          │
  │  WS: { command: 'requestComplete', response: {...}, history: [...] }
  │ ◄──────────────────────  │
  │                          │
```

---

## 5. Message Bridge — The Key Adapter

This single file makes all existing webview JS work without modification.

### `bridge.js`

```javascript
/**
 * VS Code API shim for browser environment.
 * Replaces acquireVsCodeApi() — routes all postMessage calls through WebSocket.
 * Incoming WebSocket messages are dispatched as native MessageEvents.
 */
(function () {
  'use strict';

  const WS_URL = `ws://${location.host}/ws`;
  let ws = null;
  let reconnectTimer = null;
  const pendingMessages = [];

  // ── WebSocket connection ──────────────────────
  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      // Flush any messages queued while disconnected
      while (pendingMessages.length > 0) {
        ws.send(JSON.stringify(pendingMessages.shift()));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Dispatch as a native MessageEvent — exactly what VS Code does
      window.dispatchEvent(new MessageEvent('message', { data }));
    };

    ws.onclose = () => {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 2000);
    };
  }
  connect();

  // ── VS Code API shim ─────────────────────────
  const STATE_KEY = 'http-forge-webview-state';

  function acquireVsCodeApi() {
    return {
      postMessage(msg) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        } else {
          pendingMessages.push(msg);
        }
      },
      getState() {
        try {
          return JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
        } catch {
          return {};
        }
      },
      setState(state) {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
      }
    };
  }

  // Expose globally — existing webview code calls acquireVsCodeApi()
  window.acquireVsCodeApi = acquireVsCodeApi;
})();
```

### How It Works

| VS Code Extension | Web App | Change Required |
|-------------------|---------|-----------------|
| `const vscode = acquireVsCodeApi()` | Same — `bridge.js` provides the function | None |
| `vscode.postMessage({command, ...})` | → WebSocket `ws.send(JSON.stringify({command, ...}))` | None |
| `window.addEventListener('message', ...)` | ← WebSocket `ws.onmessage` dispatches `MessageEvent` | None |
| `vscode.getState()` / `vscode.setState()` | → `localStorage` | None |

The existing 26 webview modules see no difference.

---

## 6. IPC Message Protocol

### Complete Message Catalog

#### Webview → Server (30 commands)

**Request Tester:**

| Command | Data | Handler |
|---------|------|---------|
| `webviewLoaded` | — | `→ send init state` |
| `sendRequest` | `{ request }` | `RequestExecutionHandler` |
| `cancelRequest` | — | `RequestExecutionHandler` |
| `sendHttpRequest` | `{ requestId, options }` | `RequestExecutionHandler` |
| `saveRequest` | `{ request }` | `SaveRequestHandler` |
| `useHistoryEntry` | `{ entryId, isShared }` | `HistoryHandler` |
| `deleteHistoryEntry` | `{ entryId, isShared }` | `HistoryHandler` |
| `requestShareHistoryEntry` | `{ entryId }` | `HistoryHandler` |
| `requestMoveSharedHistoryEntry` | `{ entryId }` | `HistoryHandler` |
| `requestRenameSharedGroup` | `{ tag }` | `HistoryHandler` |
| `changeEnvironment` | `{ environment }` | `EnvironmentHandler` |
| `openEnvironmentEditor` | `{ environment }` | `→ navigate to env editor panel` |
| `deleteCookie` | `{ name, domain }` | `CookieHandler` |
| `clearCookies` | — | `CookieHandler` |
| `variableChange` | `{ change }` | `VariableHandler` |
| `dirtyStateChanged` | `{ isDirty, requestState? }` | `→ cache state, update tab title` |

**Schema:**

| Command | Data | Handler |
|---------|------|---------|
| `getBodySchema` | `{ collectionId, requestId }` | `SchemaHandler` |
| `getResponseSchema` | `{ collectionId, requestId }` | `SchemaHandler` |
| `inferBodySchema` | `{ collectionId, requestId, sentBody, body }` | `SchemaHandler` |
| `inferResponseSchema` | `{ collectionId, requestId }` | `SchemaHandler` |
| `validateBody` | `{ collectionId, requestId, sentBody, body }` | `SchemaHandler` |
| `generateExampleBody` | `{ collectionId, requestId, bodySchema }` | `SchemaHandler` |
| `generateExampleResponse` | `{ collectionId, requestId, responseSchema, statusCode }` | `SchemaHandler` |
| `captureResponse` | `{ collectionId, requestId, response }` | `SchemaHandler` |

**OAuth2:**

| Command | Data | Handler |
|---------|------|---------|
| `oauth2GetToken` | `{ oauth2Config }` | `OAuth2Handler` |
| `oauth2RefreshToken` | `{ oauth2Config, refreshToken }` | `OAuth2Handler` |
| `oauth2ClearToken` | `{ cacheKey }` | `OAuth2Handler` |

**GraphQL:**

| Command | Data | Handler |
|---------|------|---------|
| `graphqlFetchSchema` | `{ endpointUrl, headers }` | `GraphQLHandler` |

**Collection / Environment Editors** (use `type` instead of `command`):

| Type | Data | Panel |
|------|------|-------|
| `ready` | — | Collection / Environment editor |
| `save` | `{ collection }` | Collection editor |
| `duplicateEnvironment` | `{ environmentName }` | Environment editor |
| `deleteEnvironment` | `{ environmentName }` | Environment editor |
| `openConfigFile` | `{ fileType, environmentName }` | Environment editor |
| `saveSharedConfig` | `{ config }` | Environment editor |
| `saveLocalConfig` | `{ config }` | Environment editor |

#### Server → Webview (26 events)

| Command/Type | Data | Trigger |
|---------|------|---------|
| `init` / `initialize` | Full state: request, env, history, cookies | Panel opened / `webviewLoaded` |
| `requestComplete` | `{ response, testResults, history, cookies, ... }` | Execution done |
| `requestError` | `{ error }` | Execution failed |
| `requestCancelled` | — | User cancelled |
| `scriptProgress` | `{ testResults }` | Streamed during script execution |
| `historyUpdated` | `{ history }` | History changed |
| `applyHistoryEntry` | `{ request, response }` | User clicked history entry |
| `loadRequest` | `{ request, environment, history }` | Navigation to different request |
| `requestSaved` | `{ request }` | Save succeeded |
| `environmentChanged` | `{ environment, variables }` | Env selection changed |
| `environmentVariablesLoaded` | `{ variables }` | Environment vars updated |
| `cookiesLoaded` | `{ cookies }` | Cookie list updated |
| `sendRequestResponse` | `{ requestId, response }` | In-script HTTP call resolved |
| `error` | `{ message }` | Generic error |
| `bodySchemaLoaded` | `{ schema }` | Schema operations |
| `responseSchemaLoaded` | `{ schema, statusCodes }` | Schema operations |
| `bodySchemaInferred` | `{ schema }` | Schema operations |
| `responseSchemaInferred` | `{ schema }` | Schema operations |
| `bodyValidationResult` | `{ valid, errors }` | Schema validation |
| `exampleBodyGenerated` | `{ example }` | Schema operations |
| `oauth2TokenReceived` | `{ token, expiresIn }` | OAuth2 flow complete |
| `oauth2TokenError` | `{ error }` | OAuth2 flow failed |
| `oauth2TokenCleared` | — | Token cleared |
| `graphqlSchemaReceived` | `{ schema }` | Introspection complete |
| `graphqlSchemaError` | `{ error }` | Introspection failed |
| `collectionsChanged` | `{ collections }` | File watcher detected changes |

---

## 7. App Shell & Navigation

The app shell replaces VS Code's sidebar, editor tabs, and status bar with a web-native layout.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  HTTP Forge                                    [env: dev ▾]     │  ← Top bar
├──────────────┬──────────────────────────────────────────────────┤
│              │  [login ×] [get-users ×] [+ New Request]         │  ← Tab bar
│  Collections │ ┌────────────────────────────────────────────┐   │
│  ▸ auth/     │ │                                            │   │
│    • login   │ │  ┌──────────────────────────────────────┐  │   │
│    • refresh │ │  │  request-tester panel                │  │   │
│  ▸ users/    │ │  │  (existing HTML/CSS/JS in iframe)    │  │   │
│    • get-all │ │  │                                      │  │   │
│    • create  │ │  │  Method │ URL │ Send                 │  │   │
│              │ │  │  Headers │ Body │ Auth │ Scripts      │  │   │
│  ──────────  │ │  │  ─────────────────────────────────   │  │   │
│  Environments│ │  │  Response │ Test Results │ Cookies    │  │   │
│  ● dev       │ │  │                                      │  │   │
│  ○ test      │ │  └──────────────────────────────────────┘  │   │
│  ○ prod      │ │                                            │   │
│              │ └────────────────────────────────────────────┘   │
├──────────────┴──────────────────────────────────────────────────┤
│  Ready │ dev │ cookies: 3                                       │  ← Status bar
└─────────────────────────────────────────────────────────────────┘
```

### `index.html` — App Shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HTTP Forge</title>
  <link rel="stylesheet" href="/app.css">
  <!-- Bridge must load BEFORE any feature panel scripts -->
  <script src="/bridge.js"></script>
</head>
<body>
  <header class="top-bar">
    <div class="brand">HTTP Forge</div>
    <div class="env-selector" id="envSelector"></div>
  </header>

  <div class="layout">
    <aside class="sidebar" id="sidebar"></aside>
    <main class="content">
      <div class="tab-bar" id="tabBar"></div>
      <div class="panel-container" id="panelContainer">
        <!-- Feature panels loaded as iframes -->
      </div>
    </main>
  </div>

  <footer class="status-bar" id="statusBar"></footer>

  <script type="module" src="/app.js"></script>
</body>
</html>
```

### Feature Panel Loading (iframe approach)

Each feature panel is loaded in an `<iframe>` so its scripts execute in isolation — exactly like VS Code webviews:

```javascript
// app.js — opening a request
function openRequestPanel(collectionId, requestId) {
  const iframe = document.createElement('iframe');
  iframe.src = `/features/request-tester/index.html?collectionId=${collectionId}&requestId=${requestId}`;
  iframe.className = 'feature-panel';

  // Each iframe gets its own WebSocket connection via bridge.js
  // The server tracks which panel sent which message via a panelId

  panelContainer.appendChild(iframe);
  tabBar.addTab({ collectionId, requestId, iframe });
}
```

### Alternative: Single-Page (No Iframes)

If iframe overhead is a concern, the feature panel HTML can be injected as `innerHTML` into a `<div>`, and `bridge.js` handles message routing by `panelId`. This works because the existing modules use ES module imports and DOM manipulation — they don't assume they own the whole page. However, iframes provide better isolation and match the VS Code webview model more closely.

---

## 8. IPC Handler — Mapping Messages to Core Services

### Handler Architecture

Each handler mirrors the extension's `src/webview-panels/request-tester/handlers/` but calls `@http-forge/core` directly instead of extension services.

```typescript
// ipc/handlers/request-execution-handler.ts

import {
  ForgeContainer,
  RequestExecutor,
  CollectionRequest,
  ExecutionResult
} from '@http-forge/core';

export class RequestExecutionHandler {
  private activeRequests = new Map<string, AbortController>();

  constructor(
    private container: ForgeContainer,
    private send: (msg: any) => void  // WebSocket send function
  ) {}

  async handleSendRequest(message: any): Promise<void> {
    const { request } = message;
    const abortController = new AbortController();
    this.activeRequests.set(request.id, abortController);

    try {
      const result = await this.container.requestExecutor.execute({
        request,
        environment: this.container.forgeEnv.getResolved(),
        signal: abortController.signal,
        onScriptProgress: (testResults) => {
          this.send({ command: 'scriptProgress', testResults });
        },
      });

      // Save to history
      if (this.container.requestHistory) {
        await this.container.requestHistory.save(result);
      }

      // Get updated history & cookies for UI
      const history = await this.container.requestHistory?.getForRequest(request.id);
      const cookies = this.container.cookieJar?.getAll();

      this.send({
        command: 'requestComplete',
        response: result.response,
        testResults: result.testResults,
        executionTime: result.executionTime,
        history,
        cookies,
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.send({ command: 'requestCancelled' });
      } else {
        this.send({ command: 'requestError', error: error.message });
      }
    } finally {
      this.activeRequests.delete(request.id);
    }
  }

  handleCancelRequest(): void {
    // Cancel all active requests
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
  }
}
```

### Handler Registry

```typescript
// ipc/ipc-router.ts

export function createIPCRouter(container: ForgeContainer) {
  const handlers: Record<string, (msg: any, send: SendFn) => Promise<void>> = {};

  function register(handler: IMessageHandler) {
    for (const cmd of handler.getSupportedCommands()) {
      handlers[cmd] = (msg, send) => handler.handle(cmd, msg, send);
    }
  }

  return {
    register,
    async handle(msg: any, send: SendFn) {
      const command = msg.command || msg.type;
      const handler = handlers[command];
      if (handler) {
        await handler(msg, send);
      } else {
        console.warn(`Unknown command: ${command}`);
      }
    }
  };
}
```

### Handler ↔ Extension Handler Mapping

| Server Handler | Extension Handler | Core Service Called |
|---------------|-------------------|-------------------|
| `RequestExecutionHandler` | `request-execution-handler.ts` | `container.requestExecutor.execute()` |
| `SaveRequestHandler` | `save-request-handler.ts` | `container.collectionLoader.saveRequest()` |
| `HistoryHandler` | `history-handler.ts` | `container.requestHistory.*()` |
| `EnvironmentHandler` | `environment-handler.ts` | `container.environmentStore.*()` |
| `CookieHandler` | `cookie-handler.ts` | `container.cookieJar.*()` |
| `SchemaHandler` | `schema-handler.ts` | `container.schemaInferrer.*()` |
| `OAuth2Handler` | `oauth2-handler.ts` | New: lightweight OAuth2 flow via `open` |
| `GraphQLHandler` | `graphql-handler.ts` | `container.graphqlSchemaService.*()` |
| `VariableHandler` | `variable-handler.ts` | `container.forgeEnv.set/unset/clear()` |

---

## 9. Storage & State Management

### What VS Code Stored vs Web App Replacement

| VS Code Storage | Purpose | Web App Replacement |
|-----------------|---------|-------------------|
| `ExtensionContext.globalState` | Cookies, token cache | `~/.http-forge/state.json` (JSON file) |
| `ExtensionContext.workspaceState` | Selected environment, panel states | Project-local `.http-forge/state.json` |
| `ExtensionContext.secrets` | OAuth2 tokens, credentials | OS keychain via `keytar`, or encrypted file |
| `vscode.getState()` / `setState()` | Webview scroll position, form state | `localStorage` (handled by bridge.js) |

### `storage.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';

export class AppStateStorage {
  private globalPath: string;    // ~/.http-forge/state.json
  private projectPath: string;   // <project>/.http-forge/state.json
  private globalState: Record<string, any> = {};
  private projectState: Record<string, any> = {};

  constructor(projectRoot: string) {
    this.globalPath = path.join(os.homedir(), '.http-forge', 'state.json');
    this.projectPath = path.join(projectRoot, '.http-forge', 'state.json');
  }

  async load(): Promise<void> {
    this.globalState = await this.readJSON(this.globalPath);
    this.projectState = await this.readJSON(this.projectPath);
  }

  // Global: cookies, token cache, preferences
  getGlobal<T>(key: string, defaultValue: T): T { ... }
  setGlobal<T>(key: string, value: T): Promise<void> { ... }

  // Project: selected env, history, panel states
  getProject<T>(key: string, defaultValue: T): T { ... }
  setProject<T>(key: string, value: T): Promise<void> { ... }
}
```

---

## 10. Configuration

The app uses the same `.http-forge/http-forge.config.json` as the extension, plus app-specific settings.

### `.http-forge/http-forge.config.json`

```json
{
  "storage": {
    "root": "./",
    "format": "folder",
    "collections": "./collections",
    "environments": "./environments",
    "history": "./.http-forge/.cache/histories",
    "results": "./.http-forge/.cache/results"
  },
  "http": {
    "timeout": 30000,
    "followRedirects": true,
    "maxRedirects": 10,
    "rejectUnauthorized": true
  },
  "scripts": {
    "timeout": 10000,
    "enabled": true
  },
  "app": {
    "port": 3000,
    "openBrowser": true,
    "host": "localhost"
  }
}
```

The `storage` and `http` and `scripts` sections map directly to `ForgeContainerOptions`. The `app` section is new.

---

## 11. File Watching

When collection/environment files change on disk, the server pushes updates to the browser.

### `watcher.ts`

```typescript
import chokidar from 'chokidar';
import { ForgeContainer } from '@http-forge/core';

export function createFileWatcher(config: AppConfig, container: ForgeContainer) {
  const emitter = new EventEmitter();

  // Watch collections
  const collectionWatcher = chokidar.watch(
    path.join(config.storage.collections, '**/*.{json,yaml,yml}'),
    { ignoreInitial: true }
  );
  collectionWatcher.on('all', debounce(async () => {
    await container.collectionLoader.loadAll(config.storage.collections);
    emitter.emit('collectionsChanged');
  }, 300));

  // Watch environments
  const envWatcher = chokidar.watch(
    path.join(config.storage.environments, '**/*.json'),
    { ignoreInitial: true }
  );
  envWatcher.on('all', debounce(async () => {
    await container.environmentStore.load(config.storage.environments);
    emitter.emit('environmentsChanged');
  }, 300));

  return emitter;
}
```

This replaces `vscode.FileSystemWatcher` from the extension.

---

## 12. Distribution

### Option A: `npx` (Recommended for Developers)

```bash
npx @http-forge/app                          # Default: port 3000, opens browser
npx @http-forge/app --port 8080              # Custom port
npx @http-forge/app --no-open                # Don't auto-open browser
npx @http-forge/app --host 0.0.0.0           # Bind to all interfaces (team mode)
```

**Size: 0 MB install** (downloaded on demand). Total download ~5-10 MB (core + app + dependencies).

### Option B: Single Binary (Node.js SEA)

Using Node.js 22+ [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html):

```bash
# Build
node --experimental-sea-config sea-config.json
cp $(command -v node) http-forge
npx postject http-forge NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

# Result: single ~50MB binary — no Node.js install needed
./http-forge
```

### Option C: Docker (for teams)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY dist/ ./
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "server.js", "--host", "0.0.0.0"]
```

```bash
docker run -v $(pwd):/workspace -p 3000:3000 http-forge/app
```

### Size Comparison

| Distribution | Size | Requires Node.js |
|-------------|------|-------------------|
| `npx` | ~5-10 MB download | Yes |
| Single binary (SEA) | ~50 MB | No |
| Docker | ~80 MB image | Docker |
| Electron (if we had chosen it) | ~150 MB | No |

---

## 13. Server Mode (Team / Remote)

The same codebase serves both local and team/remote use — only configuration and middleware change.

### Local Mode (Default)

```
Bind: localhost:3000
Auth: none
Users: single
Storage: local filesystem
```

### Team Mode

```bash
http-forge --host 0.0.0.0 --auth jwt --secret $JWT_SECRET
```

```
Bind: 0.0.0.0:3000
Auth: JWT tokens
Users: multi-user (per-connection state)
Storage: shared filesystem with user namespacing
```

### What Changes for Team Mode

| Feature | Local | Team | Implementation |
|---------|-------|------|----------------|
| Binding | `localhost` | `0.0.0.0` | Config flag |
| Auth | None | JWT / OAuth2 / LDAP | Express middleware |
| Users | Single | Multi | Per WebSocket connection |
| Collections | Shared | Shared (read) + per-user | Path scoping |
| Environments | All visible | Role-based (hide prod secrets) | Middleware filter |
| History | Single file | Per-user directory | User namespace |
| Cookies | Single jar | Per-connection | Connection scope |
| Variables | Single scope | Per-user connection | Environment scope |

### Multi-User Connection Model

```typescript
// Each WebSocket connection gets its own context
wss.on('connection', (ws, req) => {
  const user = authenticateFromToken(req);   // JWT from cookie/header
  const session = new UserSession(user, container);
  // session gets its own: cookieJar, environment overrides, history cursor
  // session shares: collections, environments (read), schemas
});
```

### Deployment Patterns

```
Developer laptop:
  npx @http-forge/app                       → http://localhost:3000

Internal team server:
  docker run ... --host 0.0.0.0             → http://api-tools.internal:3000

Behind reverse proxy (HTTPS):
  nginx → http://localhost:3000              → https://forge.company.com

Kubernetes:
  Deployment + Service + Ingress             → https://forge.k8s.company.com

SSH tunnel (remote dev box):
  ssh -L 3000:localhost:3000 dev-server      → http://localhost:3000
```

---

## 14. Implementation Phases

### Phase 1: Core Web App (MVP)

**Goal:** Single-user local app with request tester panel working.

| Task | Files | Effort |
|------|-------|--------|
| 1.1 Initialize `packages/app` (package.json, tsconfig, esbuild) | 3 files | Small |
| 1.2 Create `server.ts` — Express + WebSocket + static serving | 1 file | Medium |
| 1.3 Create `bridge.js` — `acquireVsCodeApi` shim | 1 file | Small |
| 1.4 Create `ipc-router.ts` — WebSocket message dispatcher | 1 file | Small |
| 1.5 Create `RequestExecutionHandler` — send/cancel request | 1 file | Medium |
| 1.6 Create `EnvironmentHandler` — environment selection & variable resolution | 1 file | Medium |
| 1.7 Create `CookieHandler` — cookie CRUD | 1 file | Small |
| 1.8 Create `HistoryHandler` — history CRUD | 1 file | Medium |
| 1.9 Create `config.ts` — config file loading | 1 file | Small |
| 1.10 Create `storage.ts` — state persistence | 1 file | Small |
| 1.11 Copy/symlink `resources/features/request-tester/` → `public/features/` | Build step | Small |
| 1.12 Create `index.html` — minimal shell (just loads request tester directly) | 1 file | Small |
| 1.13 Create `cli.ts` — `http-forge-app` command | 1 file | Small |
| 1.14 End-to-end test: open browser, send a request, see response | — | Verify |

**Deliverable:** `npx @http-forge/app` opens browser with working request tester.

### Phase 2: Full App Shell

**Goal:** Sidebar navigation, multi-tab, all editor panels.

| Task | Files | Effort |
|------|-------|--------|
| 2.1 Create `app.js` + `app.css` — app shell with sidebar + tabs | 2 files | Large |
| 2.2 Create `sidebar.js` — collection tree, environment picker | 1 file | Large |
| 2.3 Create `tab-bar.js` — multi-request tabs | 1 file | Medium |
| 2.4 REST API: `GET /api/collections` (tree data for sidebar) | 1 file | Medium |
| 2.5 REST API: `GET /api/environments` | 1 file | Small |
| 2.6 Integrate collection-editor, environment-editor, folder-editor panels | Build step | Small |
| 2.7 Create `SaveRequestHandler` | 1 file | Small |
| 2.8 Create `VariableHandler` | 1 file | Small |
| 2.9 File watcher: `watcher.ts` + push updates | 1 file | Medium |

**Deliverable:** Full Postman-like UI with sidebar, tabs, all panels.

### Phase 3: Advanced Features

| Task | Effort |
|------|--------|
| 3.1 Schema handler (body/response schema operations) | Medium |
| 3.2 OAuth2 handler (browser-based token flow) | Medium |
| 3.3 GraphQL handler (introspection + completions) | Medium |
| 3.4 Test suite runner panel | Medium |
| 3.5 Status bar (connection state, env indicator) | Small |

### Phase 4: Distribution & Team Mode

| Task | Effort |
|------|--------|
| 4.1 `npx` publishing (`@http-forge/app` on npm) | Small |
| 4.2 Node.js SEA build script | Medium |
| 4.3 Dockerfile + docker-compose | Small |
| 4.4 Auth middleware (JWT) for team mode | Medium |
| 4.5 Multi-user session management | Large |
| 4.6 HTTPS / TLS support | Small |

---

## 15. Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| **HTTP server** | Express 5 or Fastify | Mature, huge ecosystem. Express for simplicity, Fastify for performance. |
| **WebSocket** | `ws` | Most popular Node.js WS library. Used by VS Code itself. |
| **File watching** | `chokidar` | Industry standard. Replaces `vscode.FileSystemWatcher`. |
| **State persistence** | JSON files (`conf` or hand-rolled) | Simple, no database for single-user. Upgrade to SQLite for team mode. |
| **Secret storage** | `keytar` or Node.js `crypto` | Replaces `vscode.SecretStorage`. `keytar` uses OS keychain. |
| **CLI framework** | `commander` | Already used by `@http-forge/standalone`. |
| **Build** | `esbuild` or `tsup` | Already used in the project. |
| **CSS** | Vanilla CSS | Matches existing webview styles. No framework needed. |
| **Frontend framework** | None (vanilla JS) | Matches existing architecture. Sidebar + tabs are ~500 lines. |
| **Package manager** | npm | Existing project convention. |

### Dependencies for `packages/app`

```json
{
  "dependencies": {
    "@http-forge/core": "workspace:*",
    "express": "^5.0.0",
    "ws": "^8.16.0",
    "chokidar": "^3.6.0",
    "commander": "^12.0.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "@types/express": "^5.0.0",
    "@types/ws": "^8.5.0"
  }
}
```

Total new runtime dependencies: **5 packages** (express, ws, chokidar, commander, open).
