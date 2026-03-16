# @http-forge/codegen Guide

Generate typed TypeScript API clients directly from HTTP Forge collections.

## Features
- CLI and programmatic generation
- Full TypeScript typings for params, query, headers, and body
- Variable resolution with `{{var}}`
- Barrel exports for easy imports
- Generate all collections, one collection, or one request

## Install
Install `@http-forge/codegen` from npm and use the CLI or programmatic API.

## Input structure
Codegen expects collections under `storage.root/collections`.
Each collection folder can contain:
- `collection.json`
- request folders with `request.json`

## CLI usage
Common examples include:
- Generate all collections
- Generate a single collection
- Generate a single request

For CLI flags and options, see the package README in this repo.

### Example: generate all collections
```bash
npx http-forge-codegen --input ./http-forge/collections --output ./api-clients
```

### Example: using an npm script
```bash
npm run codegen
```

If your project defines script arguments, you can run:
```bash
npm run codegen -- --input ./http-forge/collections --output ./api-clients
```

### Example: generate a single collection
```bash
npx http-forge-codegen -i ./http-forge/collections -o ./api-clients -c auth
```

### Example: generate a single request
```bash
npx http-forge-codegen -i ./http-forge/collections -o ./api-clients -r auth/login
```

## Programmatic usage
Use `generateClients`, `generateCollection`, or `generateSingleRequest`.

### Example
```ts
import { generateClients } from '@http-forge/codegen';

await generateClients({
	input: './http-forge/collections',
	output: './api-clients',
	overwrite: true
});
```

## Using generated clients
1. Import the generated collection client.
2. Create a `ForgeEnv` instance with variables.
3. Call request functions with `env`, `query`, `params`, `headers`, and `body`.

## ForgeEnv
`ForgeEnv` manages variables and resolves `{{var}}` placeholders.

## Tips
- Keep collection names and request names stable
- Regenerate after collection changes
- Store generated clients in a dedicated folder

## Reference
- Collections and requests: collections-requests.md
- Environments and variables: environments-variables.md
