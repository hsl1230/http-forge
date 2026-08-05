# DEVELOPMENT

This document outlines recommended setup and workflows for developing the `http-forge` VS Code extension.

Prereqs

- Node.js 18+ and npm
- VS Code (for extension debugging)
- `vsce` (for packaging): `npm i -g vsce` (optional)

Install

```bash
npm install
```

Note on Node.js version

- This repository and some dev-dependencies (ESLint v10, recent plugins) target Node.js >= 20.0.0. For the best developer experience and to avoid runtime errors when running lint/test scripts, use Node 20 via `nvm` or `fnm`.

Install Node 20 (nvm example):

```bash
nvm install 20
nvm use 20
node -v # should show 20.x
```

Useful scripts

- `npm run compile` — builds the extension (uses esbuild)
- `npm run watch` — watch build for development
- `npm run compile:tsc` — compile with `tsc`
- `npm run type-check` — run TypeScript type checks
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `npm test` — run Jest unit tests
- `npm run package` — produce a VSIX via `vsce`

Debugging in VS Code

1. Open the project in VS Code
2. Run the `Run Extension` debug target (Launch Extension) from the Run panel

Testing

- Unit tests are configured with Jest and `ts-jest` and live alongside `src`.
- Use `npm test` or `npm run test:watch`.

Code style

- ESLint + Prettier are configured. Run `npm run lint` and `npm run format` before committing.

Claude hooks

This repository includes a `.claude` folder with helper scripts and Git hooks used for developer automation. See the `.claude` directory for details.
