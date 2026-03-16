# HTTP Forge CLI & Standalone Guide

Use the standalone tooling when you need HTTP Forge outside VS Code, such as CI, pipelines, or scripted runs.

## When to use
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
