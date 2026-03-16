# Troubleshooting & FAQs

## Common issues

### Configuration not applied
- Ensure `http-forge.config.json` is at the workspace root.
- Validate JSON syntax (errors prevent load).
- See: configuration.md

### Test suite shows request as failed when status is expected
- When testing error conditions (404, 401, etc.), add assertions to define expected behavior.
- Without assertions, pass/fail is based on HTTP status (200-302 = pass).
- With assertions, pass/fail is determined by assertion results only.
- Example assertion for expected 404:
  ```javascript
  ctx.test('Not found returns 404', () => {
      ctx.expect(ctx.response.status).to.equal(404);
  });
  ```
- See: scripts-assertions.md

### History or results not showing
- Verify `storage.history` and `storage.results` paths.
- Ensure the folders are writable.

### Variables not resolving
- Check environment selection.
- Confirm variable names match `{{var}}` usage.
- Verify local vs shared config precedence.
- See: environments-variables.md

### Scripts failing
- Validate syntax and available globals.
- Review script console output in the Response panel.
- If using custom modules, confirm module paths and installation.
- See: scripts-assertions.md and custom-modules.md

### Requests fail with SSL errors
- Set `request.strictSSL` to `false` for non-production endpoints.

### OAuth 2.0 token not acquired
- **Authorization Code / Implicit**: Ensure the callback URL matches your provider's registered redirect URI. The default callback is `vscode://http-forge/oauth2/callback`.
- **PKCE errors**: Some providers only support S256. Switch PKCE method in the advanced options.
- **Token not refreshing**: Verify the provider returns a `refresh_token` in the initial token response.
- **Concurrent flow rejected**: Only one browser-based auth flow can run at a time. Wait for the current flow to complete or time out (60 s).
- **Token lost on restart**: Tokens are persisted in VS Code SecretStorage. If tokens are missing, re-authenticate to refresh the cache.
- **Client authentication errors**: Check whether your provider expects client credentials in the header (Basic) or body. Toggle the "Client Authentication" option in advanced settings.

### Postman import looks wrong
- Check request/folder names for conflicts.
- Validate collection format version.
- See: import-export.md

### Codegen produces empty clients
- Confirm collections are under `storage.root/collections`.
- Ensure `request.json` files exist.

### Playwright integration not finding collections
- Ensure `http-forge.config.json` path is correct.
- Verify collection structure and naming.

## FAQ

### Where are histories stored?
In `storage.history` for local history, and `storage.root/shared-histories` for shared history items.

Note: full response files (the optional `{entryId}.json` saved per transaction) live alongside `transactions.json`. When an entry is shared the associated full-response file is moved (or copied if necessary) into the shared-histories location so restoring a shared entry will also load its saved response.

### Should I commit history files?
No. Keep history/results in .gitignore. Shared history is optional to commit.

### How do I reset state?
Delete `storage.history` and `storage.results` folders.
