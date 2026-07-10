# HTTP Forge CLI & Standalone Guide

Use the standalone tooling when you need HTTP Forge outside VS Code, such as CI, pipelines, or scripted runs.

---

## Launcher (Standalone GUI)

The launcher scripts let you run HTTP Forge as a **standalone tool** — isolated from your other VS Code extensions and settings. Perfect for QA testing or focused API work.

### Quick Start

The launcher scripts are in the `scripts/` folder:

| Platform | File |
|----------|------|
| Linux / macOS | `scripts/http-forge.sh` |
| Windows | `scripts/http-forge.bat` |

### Usage

```bash
# Launch HTTP Forge in a clean, isolated profile (test mode)
./scripts/http-forge.sh

# Launch with a specific workspace
./scripts/http-forge.sh /path/to/workspace

# Launch in your default profile (all extensions — dev mode)
./scripts/http-forge.sh --dev

# Launch TWO instances side by side: dev + test (same workspace)
./scripts/http-forge.sh --both /path/to/workspace
```

### How It Works

1. **Detects** VS Code on your system (checks PATH and common install locations)
2. **Downloads** VS Code automatically if not found (user-mode, no admin required)
3. **Installs** the HTTP Forge extension into an isolated "HTTP Forge" profile
4. **Launches** VS Code in that profile — only HTTP Forge is installed, no other extensions

### Profiles

The launcher uses VS Code [Profiles](https://code.visualstudio.com/docs/editor/profiles) to isolate HTTP Forge:

| Mode | Profile | Extensions |
|------|---------|------------|
| `--dev` | Default | All your installed extensions |
| (default) | HTTP Forge | Only HTTP Forge — clean & fast |
| `--both` | Both | Opens two separate VS Code windows |

You can switch profiles inside VS Code anytime: **Ctrl+Shift+P** → "Profiles: Switch Profile".

---

## When to use (CLI / Headless)
- Run flows or tests in CI
- Execute collections without VS Code
- Integrate with scripts or pipelines

## CLI Commands

The CLI package provides direct execution commands and MCP server lifecycle management.

Install from npm:

```bash
npm install -g @http-forge/cli
```

CLI source on GitHub: [http-forge.cli](https://github.com/hsl1230/http-forge.cli)

### MCP server lifecycle

```bash
# Start MCP server (foreground)
http-forge mcp-server start --workspace . --host 127.0.0.1 --port 3100

# Stop previously started managed MCP server
http-forge mcp-server stop --workspace .

# Check managed MCP server status
http-forge mcp-server status --workspace .
```

### Direct execution

```bash
# Run one request
http-forge run-request --workspace . --collection my-api --request get-users --environment dev --output json

# Run a collection
http-forge run-collection --workspace . --collection my-api --iterations 3 --stop-on-error --include perRequest --output json

# Run a single folder within a collection (recursive by default)
http-forge run-folder --workspace . --collection my-api --folder "Auth/Login" --environment dev --include perRequest --output json

# Run only the requests directly in a folder (exclude subfolders)
http-forge run-folder --workspace . --collection my-api --folder Users --no-recursive --include report

# Run a suite
http-forge run-suite --workspace . --suite smoke --environment staging --include perRequest --include report --output json
```

### Import collections

```bash
# From a curl command — parses method, URL, headers, and body
http-forge generate-collection --workspace . \
  --curl "curl -X POST https://api.example.com/users -H 'Authorization: Bearer sk-abc123' -d '{\"name\":\"Alice\"}'" \
  --env dev

# From a Postman Collection v2.x export
http-forge generate-collection --workspace . --postman ./MyApi.postman_collection.json

# From an OpenAPI 3.0 spec — creates a collection and an environment from server URLs
http-forge generate-collection --workspace . \
  --openapi ./openapi.yaml --name "Payments API" --create-envs --env staging

# Any source + AI enhancement (writes realistic bodies and pm.test() assertions)
# Requires OPENAI_API_KEY or ANTHROPIC_API_KEY
http-forge generate-collection --workspace . --postman ./MyApi.postman_collection.json --ai
```

**Sources (exactly one required):** `--curl <cmd>`, `--postman <file>`, `--openapi <file>`

**Key options:**
- `--name <name>` — Collection name (default: derived from source)
- `--env <name>` — `curl`: write detected vars to this env · `openapi`: create env from server URLs
- `--create-envs` — OpenAPI: create environments from all server URLs
- `--ai` — Enhance the collection with AI after import
- `--output json|table`

### Suggest and apply environment variables

Scan a collection for hardcoded values and replace them with `{{ENV_VAR}}` placeholders.

```bash
# Dry-run: see what would be replaced (heuristic rules — no LLM needed)
http-forge suggest-env --workspace . --collection my-api --output table

# AI-powered detection (better recall for complex collections)
OPENAI_API_KEY=sk-... http-forge suggest-env --workspace . --collection my-api --ai --output table

# Apply: replace in collection and write originals to "staging" env
http-forge suggest-env --workspace . --collection my-api --apply --env staging

# Apply with AI detection
http-forge suggest-env --workspace . --collection my-api --ai --apply --env staging
```

**Key options:**
- `--collection <ref>` — Collection name, slug, or id (required)
- `--apply` — Write changes to the collection
- `--env <name>` — Target environment for `--apply`
- `--ai` — Use AI for detection (requires `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- `--min-occurrences <n>` — Heuristic mode only: only flag values in ≥ N locations (default: 1)
- `--output json|table`

### Reporters — HTML and JUnit

Use `--reporter <name>` or `--reporter <name>:<path>` to generate machine-readable or human-readable reports. The flag is **repeatable** — pass it multiple times to produce several formats in one run.

```bash
# JUnit XML — machine-readable, parsed by every CI system
http-forge run-suite --workspace . --suite smoke-tests \
  --reporter junit:results/junit.xml

# HTML report — human-friendly, opens in a browser
http-forge run-suite --workspace . --suite smoke-tests \
  --reporter html:reports/run.html

# Both at once
http-forge run-suite --workspace . --suite smoke-tests \
  --reporter junit:results/junit.xml \
  --reporter html:reports/run.html

# Gate the CI build: exit 1 when any assertion fails
http-forge run-suite --workspace . --suite smoke-tests \
  --reporter junit:results/junit.xml \
  --exit-code
```

| Reporter | Output | Best for |
|---|---|---|
| `junit` | JUnit 5 XML | CI systems (GitHub Actions, Jenkins, GitLab, CircleCI…) |
| `html` | Self-contained HTML | Local review, email, Confluence |

When no `:<path>` is specified, the file is written to the HTTP Forge cache (`.http-forge/.cache/results/<suite>/<run>/`) and the path is returned in the JSON result under `junitReport.path` / `report.uri`.

### CI integration quick-start

For a complete guide covering GitHub Actions (composite action and npm install), Docker, Jenkins/GitLab/CircleCI/Azure Pipelines, multi-environment matrices, PR annotations, and troubleshooting, see **[ci-guide.md](../../docs/ci-guide.md)** in the CLI package.

**Minimal GitHub Actions example:**

```yaml
- name: Run API tests
  run: |
    http-forge run-suite \
      --workspace ./.http-forge/assets \
      --suite smoke-tests \
      --environment staging \
      --reporter junit:test-results/junit.xml \
      --exit-code
  env:
    API_KEY: ${{ secrets.API_KEY }}

- name: Upload results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: api-test-results
    path: test-results/junit.xml
```

Common options:
- `--workspace <path>`
- `--environment <name>`
- `--output json|table`
- `--include <value>` (repeatable)

> **Addressing by id, slug, or name.** `--collection`, `--request`, and each
> `--folder` segment accept an **id**, a **slug**, or a **display name**.
> Resolution tries id, then slug, then name, and stops at the first match — so
> you can pass whichever is handiest. How each value resolved is printed to
> stderr (stdout stays reserved for the result). If a name matches more than one
> item, the command lists the candidates and exits non-zero; pass the id or slug
> to disambiguate. For `run-request`, an optional `--folder` narrows request
> resolution to that folder's subtree.
>
> ```bash
> # All three address the same collection
> http-forge run-collection --workspace . --collection http_forge_showcase_abc123   # id
> http-forge run-collection --workspace . --collection http-forge-showcase           # slug
> http-forge run-collection --workspace . --collection "HTTP Forge Showcase"         # name
>
> # Scope a request by folder when the name is shared across folders
> http-forge run-request --workspace . --collection my-api --folder Auth --request "Get User"
> ```

> **Run Folder.** `run-folder` requires `--collection` **and** `--folder` (a slash-separated folder path; each segment may be an id, slug, or name, e.g. `"Auth/Login"`). It runs every request under that folder — including nested subfolders — using the exact same engine, grouping, and reports as `run-collection`. Pass `--no-recursive` (or `--recursive false`) to run only the requests directly in that folder. All other `run-collection` options apply.

> **Results are always saved.** Collection and suite runs always persist their manifest, per-iteration results, and result index to `storage.results` (`.http-forge/.cache/results/<suiteId>/<runId>/`) — you do **not** need `--include report` for this. Because of that, CLI runs automatically show up in the VS Code **History** tab and can be loaded into the Results/Statistics tabs. `--include report` only additionally generates the self-contained `report.html`.

## Configure
Create `.http-forge/http-forge.config.json` in the working directory and set:
- `storage.root`
- `storage.history`
- `storage.results`

See: configuration.md

## Directory layout
Use the same layout as the extension:
- `storage.root/collections`
- `storage.root/environments`
- `storage.root/flows`
- `storage.root/suites`

## Run collections
1. Ensure collection files exist under `storage.root/collections`.
2. Run the collection runner.
3. Review results in `storage.results`.

Example:
```
Run collection "auth" against environment "sit" in CI.
```

## Run flows
1. Define a flow under `storage.root/flows`.
2. Execute the flow with the standalone runner.
3. Review results in `storage.results`.

## Environment variables
- Variables resolve with `{{var}}`.
- Use shared/local environment configs for secrets and overrides.

## Secrets
- Fetch secrets from AWS, Azure, GCP, HashiCorp Vault, 1Password, or Doppler with `{{secret:alias/path}}`.
- Credentials come from the environment (env vars, cloud identity, CLI session) — never from config.
- Install the relevant cloud SDK (`optionalDependencies`) for AWS/Azure/GCP; Vault/Doppler/1Password need none.

See: secret-providers.md

## Scripts and tests
Scripts and assertions are the same as in the extension.

See: scripts-assertions.md

## CI tips
- Keep history/results in a temp location
- Export results as build artifacts

## Reference
- Collections and requests: collections-requests.md
- Environments and variables: environments-variables.md
- Secret providers: secret-providers.md
- Scripts and assertions: scripts-assertions.md
