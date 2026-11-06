# Custom Modules

> For implementation details, see [Custom Modules (developer)](../developer/CUSTOM-MODULES.md).

HTTP Forge scripts can load built-in modules, npm packages installed in a
configured module directory, and your own local JavaScript files. This enables
richer scripting for data generation, validation, parsing, and HTTP calls.

## Where modules come from

HTTP Forge resolves custom modules from `scripts.modulePaths` in
`.http-forge/http-forge.config.json`. A typical config uses:

```json
{
  "scripts": {
    "modulePaths": ["./.http-forge/assets/src", "./.http-forge/assets/lib"]
  }
}
```

Relative paths are resolved from the config file directory (usually
`.http-forge`). HTTP Forge uses the **first** module path that contains a
`package.json`. If no path has a `package.json`, npm packages and local module
files are unavailable, but the built-in modules still work.

## Installing an existing npm module

Install the package in the active module directory, not necessarily the
workspace root:

```bash
cd .http-forge/assets/lib
npm init -y
npm install axios
```

Then declare and use it in a script:

```javascript
const axios = require('axios');
const response = await axios.get('https://api.example.com/status');
ctx.environment.set('status', response.data.status);
```

The package must be listed in that directory's `package.json` (`dependencies`
or `devDependencies`). HTTP Forge reads the active `package.json` when it starts
or reloads configuration.

## Creating your own module file

You can also create a local JavaScript file in an active module directory and
require it with a relative path:

```text
.http-forge/assets/lib/
|-- package.json
|-- helpers.js
`-- formatters/
    `-- currency.js
```

```javascript
// helpers.js
function slugify(value) {
    return String(value).trim().toLowerCase().replace(/\s+/g, '-');
}

module.exports = { slugify };
```

```javascript
// Pre-request or post-response script
const { slugify } = require('./helpers');
const { formatCurrency } = require('./formatters/currency');

ctx.environment.set('slug', slugify(ctx.request.name));
```

Relative requires such as `./helpers` and `../shared/utils` are resolved inside
the active module directory. For security, HTTP Forge blocks relative requires
that resolve outside that directory.

## Global setup

If the active module directory contains `global-setup.js`, HTTP Forge loads it
once and spreads its exports into the script sandbox:

```javascript
// .http-forge/assets/lib/global-setup.js
module.exports = {
    apiBaseUrl: 'https://api.example.com',
    defaultHeaders: { 'X-Client': 'http-forge' }
};
```

```javascript
// Script
ctx.request.url = `${global.apiBaseUrl}/users`;
```

## Built-in modules

Built-in modules are always available and do not need a module directory or
`package.json`:

- `lodash` (`_` or `require('lodash')`)
- `moment` (`moment` or `require('moment')`)
- `uuid` (`require('uuid')`)
- `crypto` (`require('crypto')`)
- `path` (`require('path')`)
- `querystring` (`require('querystring')`)
- `tv4` (`tv4` or `require('tv4')`)
- `ajv` (`ajv` or `require('ajv')`)

`CryptoJS` is also available as a global object. `require('crypto-js')` works
only when the npm package is installed in the active module directory.

Node.js globals available in scripts include `URL`, `URLSearchParams`,
`Buffer`, `atob`, and `btoa`.

npm packages such as `cheerio`, `xml2js`, `axios`, `dayjs`, or `faker` are not
built in. Install them in the active module directory, declare them in its
`package.json`, and then require them normally.

## Recommended modules

These are common choices, but they are not built in unless listed above. Install
them in the active module directory and declare them in its `package.json`.

### HTTP clients
- axios
- node-fetch

### Data processing
- lodash (built-in)
- ramda
- jsonpath-plus

### Date/time
- moment (built-in)
- dayjs
- date-fns

### Validation
- tv4 (built-in)
- ajv (built-in)
- joi

### Data generation
- faker
- chance
- uuid (built-in)

### Parsers
- cheerio (install if needed)
- xml2js (install if needed)
- csv-parse

## Examples

### Built‑in: UUID
```javascript
const { v4: uuid } = require('uuid');
ctx.environment.set('requestId', uuid());
```

### OAuth HMAC signature
```javascript
const timestamp = Math.floor(Date.now() / 1000);
const nonce = require('uuid').v4();

const signatureBase = `${timestamp}\n${nonce}\n${ctx.request.url}`;
const signature = CryptoJS.HmacSHA256(signatureBase, ctx.environment.get('oauth_secret'));

ctx.request.setHeader('Authorization', `OAuth signature="${signature}"`);
```

### JSON schema validation
```javascript
const schema = {
	type: 'object',
	properties: {
		id: { type: 'number' },
		name: { type: 'string' }
	},
	required: ['id', 'name']
};

const data = ctx.response.json();
const valid = tv4.validate(data, schema);

ctx.test('Response matches schema', () => {
	if (!valid) throw new Error(tv4.error.message);
});
```

### HTML parsing
```javascript
// Requires cheerio to be installed in the active module directory.
const $ = require('cheerio').load(ctx.response.body);
const csrfToken = $('meta[name="csrf-token"]').attr('content');
ctx.environment.set('csrf', csrfToken);
```

## Security and module allowlist

Modules are available when:

1. They are built-ins listed above.
2. They are npm packages installed in the active module directory and declared in
   its `package.json`.
3. They are local `.js` files required with a relative path inside the active
   module directory.

Other modules are blocked and produce a message instructing you to install
them. Relative requires that resolve outside the active module directory are
blocked as a security violation.

## Best practices

- Prefer built-ins when possible.
- Install npm packages in the active module directory, not the workspace root,
  unless that directory is your configured module path.
- Keep `modulePaths` short and intentional; HTTP Forge uses the first path that
  contains a `package.json`.
- Pin versions in the active module directory's `package.json`.
- Use local `.js` files for shared helpers instead of duplicating script code.
- Reload or restart HTTP Forge after changing `modulePaths`, `package.json`, or
  local module files.

## Technical details (implementation)
- HTTP Forge resolves `scripts.modulePaths` and uses the first directory that
  contains a `package.json`.
- That directory's `dependencies` and `devDependencies` become the available npm
  module list.
- Built-ins are resolved before npm packages and local module files.
- Relative requires are resolved inside the active module directory.
- If the active directory contains `global-setup.js`, its exports are spread into
  the script sandbox.
- Modules are loaded with Node’s `require()` inside the script sandbox.

## Source references
- `module-loader.ts`: module resolution, built-ins, relative requires, and
  `global-setup.js`
- `script-executor.ts`: script sandbox and `require()` injection
- `config-service.ts`: `scripts.modulePaths` resolution
- `.http-forge/http-forge.config.json`: `scripts.modulePaths` configuration

## Troubleshooting

### Module not available
Error:
```
Module 'xxx' is not available. Install it with: npm install xxx
```
Fix:
1. Run `npm install xxx` in the active module directory.
2. Ensure it appears in that directory's `package.json`.
3. Confirm the directory is listed in `scripts.modulePaths`.
4. Reload VS Code or rerun the request.

### Module listed but failed to load
Fix:
1. Verify install in the active module directory: `npm list xxx`.
2. Reinstall: `npm install xxx --force`.
3. Check that the package is compatible with the Node.js version used by HTTP
   Forge.
4. Check that a local relative module does not import outside the active module
   directory.
