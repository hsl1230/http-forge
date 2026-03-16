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
        │   └── request.json
        └── users/
            └── request.json
```

## Naming and stability
- Keep request names stable to preserve history and codegen output.
- Avoid duplicate request names within the same folder.

## Import/Export
See: import-export.md
