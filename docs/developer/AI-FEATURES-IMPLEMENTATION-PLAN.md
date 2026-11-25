# HTTP Forge — AI Features Implementation Plan

> **Purpose:** Solution design for borrowing high-value AI features from Postman, Bruno, Insomnia, Thunder Client, and Hoppscotch.
> **Scope:** No code changes in this document — design and implementation guidance only.

---

## Dependency Analysis

```
                    ┌─────────────────────────────┐
                    │  Phase 1: Foundation (no deps) │
                    └─────────────┬───────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
   │ BYOK (P4)   │     │ --agent CLI (P8)│     │ http-forge init  │
   │ AI provider │     │ Output format   │     │ (P5) Scaffolding │
   │ for all     │     │ (no AI needed)  │     │ (no AI needed)   │
   └──────┬──────┘     └─────────────────┘     └──────────────────┘
          │
          │  (AI provider available)
          │
          ├───────────────────────┬───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
   │ Autocomplete │     │ AI Debugging    │     │ AI Test Gen     │
   │ (P1) Monaco  │     │ (P2/P7) Env/Auth│     │ (P6) Inline UI  │
   │ ghost-text   │     │ diagnostics     │     │ (wire existing) │
   └─────────────┘     └─────────────────┘     └──────────────────┘
          │
          │  (AI provider + skills directory)
          │
          ▼
   ┌─────────────────────────────────────────────────────┐
   │  Phase 3: Agent Skills + Enhancement (medium deps)  │
   │  ├── Agent Skills full (P3) — MCP tools + CLI       │
   │  └── AI collection enhancement (P10) — structural   │
   └─────────────────────────────────────────────────────┘
          │
          │  (AI provider + Playwright + skills)
          │
          ▼
   ┌─────────────────────────────────────────────────────┐
   │  Phase 4: Advanced (high effort)                    │
   │  ├── Browser testing → API test gen (Postman)       │
   │  ├── AI mock server generation (Insomnia)           │
   │  └── AI test coverage reports (Postman)             │
   └─────────────────────────────────────────────────────┘
```

### Dependency Matrix

| Feature | Depends On | Blocks | Effort | Impact |
|---|---|---|---|---|
| **P4: BYOK** | None | P1, P2, P7 | Medium | High |
| **P8: --agent CLI** | None | None | Low | Low |
| **P5: http-forge init** | None | None | Medium | Medium |
| **P3a: Skills directory** | None | P3b | Low | Medium |
| **P1: Autocomplete** | P4 (for non-Copilot) | None | Medium | High |
| **P2: AI Debugging** | P4 (for non-Copilot) | None | Medium | High |
| **P6: AI Test Gen (inline)** | None (uses existing) | None | Low | Medium |
| **P7: AI Diagnosis** | P4 (for non-Copilot) | None | Medium | High |
| **P3b: Agent Skills (full)** | P3a | None | Medium | High |
| **P10: Collection enhancement** | None (extends existing) | None | Low | Medium |
| **Browser → API tests** | Playwright integration | None | High | Medium |
| **AI mock server** | New infrastructure | None | High | Medium |
| **Coverage reports** | None | None | Medium | Low |

---

## Phase 1: Foundation (No Dependencies)

These features have no dependencies and can be implemented in parallel.

---

### 1. BYOK (Bring Your Own Key) for AI in Extension

**Source:** Bruno (BYOK with OpenAI, Anthropic, custom endpoints)
**Depends on:** None
**Blocks:** P1, P2, P7 (for non-Copilot users)

**Problem:** The VS Code extension only uses Copilot (`vscode.lm`). Users without Copilot subscription can't use AI features.

**Solution:**
- Add settings: `httpForge.ai.provider`, `httpForge.ai.model`, `httpForge.ai.apiKey` (secret storage), `httpForge.ai.customBaseUrl`
- Modify `copilot-ai-provider.ts` to check provider setting
- If provider is `openai`/`anthropic`/`custom`, use `createEnvAiProvider()` from core
- Store API key in VS Code SecretStorage
- Add "Configure AI Provider" command

**Files to modify:**
- `http-forge/src/infrastructure/copilot-ai-provider.ts`
- `http-forge/src/extension.ts`
- `http-forge/package.json`

**Dependencies:** None new (core already has OpenAiProvider, AnthropicProvider)

---

### 2. `--agent` CLI Output Mode

**Source:** Insomnia (Koh CLI — structured JSON for LLMs)
**Depends on:** None
**Blocks:** None

**Problem:** CLI output is human-readable or JSON, but not optimized for LLM consumption.

**Solution:**
- Add `--agent` flag to parseArgs
- Output structured JSON with `nextSteps` array
- Example: `{ "status": "completed", "summary": "5/6 passed", "failedRequests": [...], "nextSteps": [...] }`

**Files to modify:**
- `http-forge.cli/src/output/format.ts`
- `http-forge.cli/src/commands/run.ts`

**Dependencies:** None new

---

### 3. `http-forge init` Project Scaffolding

**Source:** Postman (`postman init`)
**Depends on:** None
**Blocks:** None

**Problem:** New users must manually create the `.http-forge/` directory structure.

**Solution:**
- Command: `http-forge init [--template <name>] [--examples]`
- Scaffolds: `.http-forge/AGENTS.md`, `assets/collections/`, `assets/environments/dev.json`, `assets/suites/`, `.http-forge/knowledge/`
- Templates: `default`, `examples`, `openapi`

**Files to modify:**
- `http-forge.cli/src/commands/init.ts` (new)
- `http-forge.cli/src/commands.ts`
- `http-forge.cli/templates/` (new)

**Dependencies:** None new

---

### 4. Agent Skills Directory Convention (partial)

**Source:** Bruno (Agent Skills), Postman (CLI skills)
**Depends on:** None
**Blocks:** Agent Skills full (Phase 3)

**Problem:** No reusable AI workflow templates. Teams can't standardize how agents interact with APIs.

**Solution (Phase 1 scope — directory convention only):**
- Add `.http-forge/skills/` directory convention
- Create `gatherWorkspaceSkills()` in `ai-context.ts`
- Skills are markdown files with YAML frontmatter (name, description, triggers)
- Loaded into AI prompts alongside knowledge files

**Files to modify:**
- `http-forge.core/src/infrastructure/ai/ai-context.ts`

**Dependencies:** None new

---

## Phase 2: AI Provider Available (Depends on Phase 1)

These features need an AI provider (Copilot or BYOK) to function.

---

### 5. Inline Autocomplete in Script Editors

**Source:** Bruno (ghost-text suggestions in scripts/tests)
**Depends on:** P4 (BYOK) for non-Copilot users; works with Copilot alone
**Blocks:** None

**Problem:** Monaco editor shows type definitions but no AI-powered ghost-text completion.

**Solution:**
- Register Monaco `InlineCompletionsProvider` in `monaco-editors-manager.js`
- On typing pause (300ms), extract current line + 20 lines of context
- Send to extension host → AI provider → return completion text
- BYOK support via Priority 4 settings
- Cache completions by (file hash + cursor position)
- Setting: `httpForge.ai.autocomplete.enabled` (default: false), `httpForge.ai.autocomplete.triggerMode` (aggressive/debounced/manual)

**Files to modify:**
- `http-forge/src/presentation/webview/panels/request-tester/modules/monaco-editors-manager.js`
- `http-forge/src/presentation/webview/panels/request-tester/request-tester-panel.ts`
- `http-forge/src/infrastructure/copilot-ai-provider.ts`

**Dependencies:** P4 for non-Copilot users

---

### 6. AI Debugging with Specific Diagnosis

**Source:** Postman (Agent Mode checks env vars, tokens, headers, expiry)
**Depends on:** P4 (for non-Copilot users)
**Blocks:** None

**Problem:** `explain_failure` analyzes response patterns but doesn't check environment/auth configuration.

**Solution:**
- Enhance `explain_failure` with a diagnostic checklist:
  1. Environment variables: all `{{var}}` references resolve to non-empty values
  2. Auth: token present, not expired, Authorization header set
  3. Headers: Content-Type matches body format
  4. URL: path parameters resolved, base URL correct
  5. Response: status code, error message, schema mismatch
- Return structured diagnosis: `{ checks: [...], suggestion: string }`
- Feed checks into LLM prompt for human-readable explanation

**Files to modify:**
- `http-forge.core/src/runtime/mcp-handlers/ai.ts`
- `http-forge.core/src/infrastructure/analysis/` (new diagnostic utility)

**Dependencies:** P4 for non-Copilot users

---

### 7. AI Test Generation from Response (Inline)

**Source:** Postman (Agent Mode generates tests from observed responses)
**Depends on:** None (uses existing `suggest_assertions`)
**Blocks:** None

**Problem:** `suggest_assertions` MCP tool exists but isn't wired into the Request Tester webview.

**Solution:**
- Add "✨ Suggest Assertions" button in Request Tester's Tests tab
- On click, send request + response to AI provider
- Display suggested assertions in preview panel
- User clicks "Apply" to insert into test script

**Files to modify:**
- `http-forge/src/presentation/webview/panels/request-tester/handlers/suggest-assertions-handler.ts` (already exists, wire to UI)
- `http-forge/resources/features/request-tester/bundle.js` (rebuild)

**Dependencies:** None new

---

## Phase 3: Agent Skills + Enhancement (Medium Dependencies)

These features build on Phase 1-2 infrastructure.

---

### 8. Agent Skills (Full Implementation)

**Source:** Bruno (Agent Skills), Postman (CLI skills)
**Depends on:** P3a (skills directory convention)
**Blocks:** None

**Problem:** No reusable, shareable AI workflow templates.

**Solution:**
- MCP tools: `list_skills`, `get_skill`
- CLI: `http-forge skills list`, `http-forge skills run <name>`
- Extension: Skills panel or command palette entry
- Agent Skills loaded into AI prompts alongside knowledge files
- Skills can include helper scripts and reference docs

**Files to modify:**
- `http-forge.core/src/runtime/mcp-handlers/` (new skill handlers)
- `http-forge.core/src/runtime/mcp-tool-schemas.ts` (add skill tool names)
- `http-forge.cli/src/commands/` (new skills command)
- `http-forge/src/commands/` (new skills command)

**Dependencies:** P3a

---

### 9. AI Collection Enhancement (Structural)

**Source:** Postman (Agent Mode reorganizes collections)
**Depends on:** None (extends existing `ai_enhance_collection`)
**Blocks:** None

**Problem:** `ai_enhance_collection` improves naming/descriptions but doesn't reorganize structure.

**Solution:**
- Extend `ai_enhance_collection` to also suggest: folder restructuring, request reordering, duplicate detection, naming convention enforcement
- Return suggestions as a structured diff that the user can apply

**Files to modify:**
- `http-forge.core/src/infrastructure/analysis/collection-enhancer.ts`

**Dependencies:** None new

---

## Phase 4: Advanced (High Effort, Medium Impact)

These features require significant new infrastructure.

---

### 10. Browser Testing → API Test Generation

**Source:** Postman (Agent Mode drives browser, records traffic, generates tests)
**Depends on:** Playwright integration (`http-forge.playwright`), AI provider
**Blocks:** None

**Problem:** No connection between browser testing and API test generation.

**Solution:**
- Use Playwright to record browser traffic
- Extract API calls from recorded traffic
- Generate HTTP Forge requests from recorded calls
- Generate test assertions from observed responses
- Run as a single combined command

**Files to modify:**
- `http-forge.playwright/` (new recording capability)
- `http-forge.core/src/infrastructure/api-discovery/` (traffic → requests)
- `http-forge.cli/src/commands/` (new command)

**Dependencies:** Playwright integration, AI provider

---

### 11. AI Mock Server Generation

**Source:** Insomnia (AI Mock Server from natural language)
**Depends on:** None (new infrastructure)
**Blocks:** None

**Problem:** HTTP Forge has no mock server capabilities.

**Solution:**
- New mock server module in core
- AI generates routes/responses from description, URL, JSON sample, or OpenAPI spec
- Mock server runs locally and serves generated responses

**Files to modify:**
- `http-forge.core/src/infrastructure/mock/` (new)
- `http-forge.cli/src/commands/` (new mock command)
- `http-forge/src/commands/` (new mock command)

**Dependencies:** None new (but significant new infrastructure)

---

### 12. AI Test Coverage Reports (Visual Dashboard)

**Source:** Postman (visual coverage reports)
**Depends on:** None
**Blocks:** None

**Problem:** `analyze_coverage` MCP tool exists but no visual dashboard.

**Solution:**
- Webview panel showing coverage heatmap
- Per-endpoint coverage status (tested/untested)
- Coverage trends over time
- Export as HTML/PDF

**Files to modify:**
- `http-forge/src/presentation/webview/panels/` (new coverage panel)
- `http-forge/src/commands/` (new coverage command)

**Dependencies:** None new

---

## Implementation Order Summary

```
Phase 1 (No deps, can parallelize):
  1. BYOK (P4) — foundation for all AI features
  2. --agent CLI output (P8) — output format only
  3. http-forge init (P5) — scaffolding
  4. Agent Skills directory (P3a) — convention + gathering

Phase 2 (Needs AI provider from Phase 1):
  5. Inline autocomplete (P1) — Monaco + AI provider
  6. AI debugging (P2/P7) — extend explain_failure
  7. AI test gen inline (P6) — wire existing tool to UI

Phase 3 (Medium deps):
  8. Agent Skills full (P3b) — MCP tools + CLI + extension
  9. AI collection enhancement (P10) — extend existing tool

Phase 4 (High effort):
  10. Browser → API test gen — Playwright + AI
  11. AI mock server — new infrastructure
  12. Coverage dashboard — webview + analysis
```

---

## Shared Infrastructure Needed

All features build on existing HTTP Forge infrastructure:

| Infrastructure | Status | Used By |
|---|---|---|
| AI Provider (`IAiProvider`) | ✅ Exists | P1, P2, P4, P6, P7, P10, P11 |
| MCP tools (60+) | ✅ Exists | P3b, P8 |
| Business context (`ai-context.ts`) | ✅ Exists | All AI features |
| Monaco editor (webview) | ✅ Exists | P1, P6 |
| Secret management (5 providers) | ✅ Exists | P4 (BYOK) |
| Collection/suite CRUD | ✅ Exists | All management features |
| Environment management | ✅ Exists | P2, P7, P5 |
| CLI command framework | ✅ Exists | P5, P8, P3b |
| File system watcher | ✅ Exists | P3a, P3b |
| Knowledge gathering | ✅ Exists | P3a, P3b |
| Playwright integration | ✅ Exists | P10 |

**No new dependencies required** for any of the proposed features. All build on existing HTTP Forge infrastructure.
