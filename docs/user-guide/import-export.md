# Import/Export & Postman Compatibility

## Import

### Import Postman Collection
You can import Postman collections (v2.1). Imported collections are saved under `storage.root/collections`.

### Import OpenAPI Spec
Import an OpenAPI 3.0 specification (`.yaml` or `.json`) to create a fully hydrated HTTP Forge collection.

1. Click the **Import OpenAPI Spec** button in the Collections view title bar, or run the `HTTP Forge: Import OpenAPI Spec` command from the Command Palette.
2. Select a `.yaml`, `.yml`, or `.json` file.
3. Choose import options:
   - **Collection name** — auto-detected from the spec's `info.title`, editable.
   - **Create environments from servers** — creates environment files from the `servers` entries.
4. HTTP Forge will create:
   - A collection with folders based on OpenAPI tags.
   - A `request.json` for each operation, including path params, query params, headers, body, and auth.
   - `body.schema.json` for each request with a `requestBody` schema.
   - `response.schema.json` for each request with documented responses.
   - Example bodies generated from schemas via the built-in `ExampleGenerator`.
   - Environment files with `baseUrl` variables from `servers`.

All `$ref` pointers are resolved before import (including external and circular references).

## Export

### Export to Postman
Export collections to a Postman‑compatible format for sharing.

### Export as OpenAPI
Generate a valid OpenAPI 3.0.3 specification from an HTTP Forge collection.

1. Right-click a collection in the **Collections** tree and choose **Export as OpenAPI**.
2. Choose export options:
   - **Format** — JSON or YAML.
   - **Include inferred responses** — optionally, run schema inference from history before exporting.
   - **Environments for servers** — select which environments to include as `servers` entries.
3. Choose an output file location.
4. The exporter maps:
   - Collection folders → OpenAPI tags.
   - Requests → OpenAPI operations (path + method).
   - Path/query/header params (with metadata annotations) → OpenAPI parameters.
   - Request body (with `body.schema.json`) → `requestBody`.
   - Response schema (`response.schema.json`) → `responses`.
   - Auth (OAuth 2.0, Bearer, Basic, API Key) → `securitySchemes`.
   - Shared components are deduplicated.

### Export to REST Client
Right‑click a collection in the **Collections** tree and choose **Export Collection as REST Client**.
The extension will automatically write the output under the path specified by
`restClientExport.path` in your `http-forge.config.json` file (defaults to
`collections-rest-client` in the workspace root).  No additional dialog is shown.
The exporter will write:

* one `.http` file per request, mirroring your collection/folder hierarchy
* `<collection-name>.env` containing collection‑scoped variables
* `.pre.js`/`.post.js` script files for each request/folder/collection
* `<envName>.env` files for every defined HTTP‑Forge environment

The files can be opened with the [REST‑Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension which will pick up the `.env` files for variable substitution.  Any
scripts are preserved in separate files for reference.

Global variable behaviour is controlled via the `restClientExport.mergeGlobals`
field in `http-forge.config.json`.  When `true` (the default) globals are merged
into each environment file; when `false` a standalone `globals.env` file is
produced instead.

You can then share or source‑control the generated directory; REST‑Client users
typically open individual `.http` files and select an environment from the status
bar before sending the request.

## Example
Export a collection to share with another team, then import it into their workspace.

## Compatibility notes
- Most Postman request structures are supported.
- Script API is Postman‑compatible via `pm`/`ctx` aliases.

## Tips
- Avoid duplicate request names inside a collection.
- Keep folder and request names stable for codegen.
