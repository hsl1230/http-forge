# Collections & Requests

## Collections
Collections group related requests and folders. Each collection lives under:
`storage.root/collections/<collection-name>`.

## Requests
Requests are stored in request folders with a `request.json` file.

### Request parts
- **Method**: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- **URL/path**: absolute or relative
- **Path params**: `:id` or `{{id}}`
- **Query params**: key/value pairs, toggleable
- **Headers**: key/value pairs, toggleable
- **Body**: JSON, form-data, raw, or none
- **Auth**: inherit/bearer/none
- **Settings**: timeout, redirects, SSL, decompression
- **Scripts**: pre‑request and post‑response

### Example: request path and params
```
GET {{baseUrl}}/users/:id?include=profile
```

Path params:
```
id = 123
```

Query params:
```
include = profile
```

## Folder structure example
```
http-forge/
└── collections/
    └── my-collection/
        ├── collection.json
        ├── login/
        │   ├── request.json
        │   └── doc.md           ← Optional request documentation (Markdown)
        └── users/
            ├── request.json
            └── doc.md
```

## Request documentation (doc.md)
Each request folder can contain a `doc.md` file alongside `request.json`. This Markdown file is displayed in the **Document tab** of the Request Tester panel.

- Create a `doc.md` file in any request folder to add documentation
- The Document tab renders the Markdown content with headings, lists, tables, code blocks, etc.
- Use the "Open File" button in the Document tab to edit the file in VS Code
- Changes saved to `doc.md` are reflected in the Document tab immediately

## File watching
Changes to any file under the collections directory (create, edit, delete) automatically:
- Refresh the **Collections tree view** in the sidebar
- Reload all **open Request Tester panels** with the latest data from disk

No manual refresh is needed — edits from other VS Code tabs, external editors, or git operations are reflected immediately.

## Naming and stability
- Keep request names stable to preserve history and codegen output.
- Avoid duplicate request names within the same folder.

## Import/Export
See: import-export.md
