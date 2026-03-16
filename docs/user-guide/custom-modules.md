# Custom Modules

HTTP Forge scripts can load custom npm modules installed in your workspace. This enables richer scripting for data generation, validation, parsing, and HTTP calls.

## How it works
1. Install a module in the workspace root.
2. Use `require()` in pre‑request or post‑response scripts.

Example install:
```bash
npm install axios
```

Example usage:
```javascript
const axios = require('axios');
const response = await axios.get('https://api.example.com/status');
ctx.environment.set('status', response.data.status);
```

## Built‑in modules (no install needed)

### Utility
- lodash (`_` or `require('lodash')`)
- moment (`moment` or `require('moment')`)
- uuid (`require('uuid')`)
- cheerio (`require('cheerio')`)
- xml2js (`require('xml2js')`)

### Validation
- tv4 (`require('tv4')`)
- ajv (`require('ajv')`)

### Crypto
- crypto (`require('crypto')`)
- CryptoJS — Full library:
  - **Hashing**: SHA1, SHA256, SHA384, SHA512, SHA3, MD5, RIPEMD160
  - **HMAC**: HmacSHA1, HmacSHA256, HmacSHA384, HmacSHA512, HmacMD5
  - **Encryption**: AES, DES, TripleDES (encrypt/decrypt)
  - **Key derivation**: PBKDF2
  - **Encoding**: `CryptoJS.enc.Hex`, `.Base64`, `.Utf8`, `.Latin1`, `.Utf16`

### Node.js built‑ins
- querystring
- URL / URLSearchParams
- Buffer
- atob / btoa

## Recommended modules

### HTTP clients
- axios
- node-fetch

### Data processing
- lodash (built‑in)
- ramda
- jsonpath-plus

### Date/time
- moment (built‑in)
- dayjs
- date-fns

### Validation
- tv4 (built‑in)
- ajv (built‑in)
- joi

### Data generation
- faker
- chance
- uuid (built‑in)

### Parsers
- cheerio (built‑in)
- xml2js (built‑in)
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
const $ = require('cheerio').load(ctx.response.body);
const csrfToken = $('meta[name="csrf-token"]').attr('content');
ctx.session.set('csrf', csrfToken);
```

## Security and module allowlist
Modules are available when:
1. They are built‑ins listed above, or
2. They are installed in the workspace and declared in `package.json`.

Other modules are blocked and will show a message instructing you to install them.

## Best practices
- Prefer built‑ins when possible.
- Keep dependencies minimal.
- Pin versions in `package.json`.
- Restart VS Code after installing new modules.

## Technical details (implementation)
- Script executor scans workspace `package.json` at startup.
- Dependencies from `dependencies` and `devDependencies` are cached.
- Modules are loaded with Node’s `require()` inside the vm2 sandbox.

## Source references
- `script-executor.ts`: module loading and require function
- `service-bootstrap.ts`: dependency injection for script executor

## Troubleshooting

### Module not available
Error:
```
Module 'xxx' is not available. Install it with: npm install xxx
```
Fix:
1. Run `npm install xxx` at the workspace root.
2. Ensure it appears in `package.json`.
3. Reload VS Code.

### Module listed but failed to load
Fix:
1. Verify install: `npm list xxx`.
2. Reinstall: `npm install xxx --force`.
3. Check Node.js compatibility.
