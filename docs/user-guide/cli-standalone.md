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

## Configure
Create `http-forge.config.json` in the working directory and set:
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

## Scripts and tests
Scripts and assertions are the same as in the extension.

See: scripts-assertions.md

## CI tips
- Keep history/results in a temp location
- Export results as build artifacts

## Reference
- Collections and requests: collections-requests.md
- Environments and variables: environments-variables.md
- Scripts and assertions: scripts-assertions.md
