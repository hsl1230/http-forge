# Article publishing metadata

Copy-paste front matter and platform tags for the five articles in this folder.

The articles intentionally do **not** contain YAML front matter: GitHub renders
it as visible text. Use the blocks below in a static-site build, Hashnode
import, or as the fields for a dev.to post.

## Canonical strategy

- The canonical URL below points at the GitHub source until a docs domain
  exists. Replace it with the docs page when one is available.
- If dev.to becomes the canonical home, set `canonical_url` to the dev.to post
  URL instead, then syndicate to Hashnode/Medium 2–3 days later with the same
  canonical URL.
- Do not publish the same article without a canonical link.

## Publishing order

1. Run Postman collections in CI without Postman
2. How I built an MCP server that lets AI agents run my API tests
3. Discovering API endpoints from source code with zero OpenAPI specs
4. Why I built HTTP Forge when Postman, Thunder Client, Bruno, and Insomnia already exist
5. Why I built a CLI when I already had a VS Code extension

## Quick reference

| # | Article | File | Primary | Secondary | dev.to tags |
|---|---|---|---|---|---|
| 1 | Run Postman collections in CI without Postman | `run-postman-collections-in-ci-without-postman.md` | dev.to | Hashnode, Medium | `postman`, `api`, `testing`, `githubactions` |
| 2 | How I built an MCP server that lets AI agents run my API tests | `how-i-built-an-mcp-server.md` | dev.to | Hashnode, Medium | `mcp`, `ai`, `agents`, `api` |
| 3 | Discovering API endpoints from source code with zero OpenAPI specs | `discovering-api-endpoints-from-source.md` | dev.to | Hashnode | `api`, `opensource`, `node`, `java` |
| 4 | Why I built HTTP Forge when Postman, Thunder Client, Bruno, and Insomnia already exist | `why-i-built-http-forge.md` | dev.to | Hashnode, Medium | `ai`, `mcp`, `api`, `opensource` |
| 5 | Why I built a CLI when I already had a VS Code extension | `why-i-built-a-cli.md` | dev.to | Hashnode | `cli`, `devtools`, `api`, `opensource` |

Extra tags for Hashnode (where more than four are allowed) are listed with each
article below.

---

## 1. Run Postman collections in CI without Postman

- **Search intent:** high — people already search for running Postman
  collections in CI without Postman/Newman.
- **Primary CTA:** try the CLI workflow; link to the CI guide.
- **Canonical:** `https://github.com/hsl1230/http-forge/blob/main/docs/articles/run-postman-collections-in-ci-without-postman.md`

```yaml
---
title: "How to run Postman collections in CI without Postman"
description: "Import a Postman collection, run it headlessly with HTTP Forge, emit JUnit, and wire it into GitHub Actions — no Postman or Newman required."
slug: "run-postman-collections-in-ci-without-postman"
tags:
  - postman
  - api
  - testing
  - githubactions
canonical_url: "https://github.com/hsl1230/http-forge/blob/main/docs/articles/run-postman-collections-in-ci-without-postman.md"
---
```

Hashnode extras: `ci`, `devops`, `newman`, `automation`.

---

## 2. How I built an MCP server that lets AI agents run my API tests

- **Search intent:** medium — MCP and AI-agent developers looking for real
  server patterns and tool design.
- **Primary CTA:** inspect the MCP server / try the agent loop.
- **Canonical:** `https://github.com/hsl1230/http-forge/blob/main/docs/articles/how-i-built-an-mcp-server.md`

```yaml
---
title: "How I built an MCP server that lets AI agents run my API tests"
description: "How HTTP Forge exposes discovery, generation, execution, diagnosis, and assertion healing as MCP tools so an AI agent can drive the full API test lifecycle."
slug: "how-i-built-an-mcp-server"
tags:
  - mcp
  - ai
  - agents
  - api
canonical_url: "https://github.com/hsl1230/http-forge/blob/main/docs/articles/how-i-built-an-mcp-server.md"
---
```

Hashnode extras: `llm`, `devtools`, `automation`, `testing`.

---

## 3. Discovering API endpoints from source code with zero OpenAPI specs

- **Search intent:** medium — backend developers with stale or missing OpenAPI
  specs.
- **Primary CTA:** link to the discovery docs and supported frameworks.
- **Canonical:** `https://github.com/hsl1230/http-forge/blob/main/docs/articles/discovering-api-endpoints-from-source.md`

```yaml
---
title: "Discovering API endpoints from source code with zero OpenAPI specs"
description: "How HTTP Forge discovers endpoints from Express, NestJS, Fastify, Lambda, Spring, and FastAPI source with deterministic output, golden fixtures, and drift detection."
slug: "discovering-api-endpoints-from-source"
tags:
  - api
  - opensource
  - node
  - java
canonical_url: "https://github.com/hsl1230/http-forge/blob/main/docs/articles/discovering-api-endpoints-from-source.md"
---
```

Hashnode extras: `typescript`, `spring`, `fastapi`, `python`, `nodejs`.

---

## 4. Why I built HTTP Forge when Postman, Thunder Client, Bruno, and Insomnia already exist

- **Search intent:** low — founder story and positioning, not a search-driven
  how-to.
- **Primary CTA:** try HTTP Forge / read the open-source core.
- **Canonical:** `https://github.com/hsl1230/http-forge/blob/main/docs/articles/why-i-built-http-forge.md`

```yaml
---
title: "Why I built HTTP Forge when Postman, Thunder Client, Bruno, and Insomnia already exist"
description: "Why HTTP Forge exists when Postman, Thunder Client, Bruno, and Insomnia already do: an AI-native, source-connected API test lifecycle built on plain files."
slug: "why-i-built-http-forge"
tags:
  - ai
  - mcp
  - api
  - opensource
canonical_url: "https://github.com/hsl1230/http-forge/blob/main/docs/articles/why-i-built-http-forge.md"
---
```

Hashnode extras: `agents`, `testing`, `devtools`, `discuss`.

---

## 5. Why I built a CLI when I already had a VS Code extension

- **Search intent:** low — architecture and tool-design story.
- **Primary CTA:** try the CLI; link to the CLI reference.
- **Canonical:** `https://github.com/hsl1230/http-forge/blob/main/docs/articles/why-i-built-a-cli.md`

```yaml
---
title: "Why I built a CLI when I already had a VS Code extension"
description: "Why HTTP Forge added a CLI beside its VS Code extension, how it shares @http-forge/core, and when to use the CLI, extension, or MCP server."
slug: "why-i-built-a-cli"
tags:
  - cli
  - devtools
  - api
  - opensource
canonical_url: "https://github.com/hsl1230/http-forge/blob/main/docs/articles/why-i-built-a-cli.md"
---
```

Hashnode extras: `automation`, `typescript`, `vscode`, `testing`.

---

## UTM links

UTM parameters are query-string values appended to the URL you share. They do
not change the page; they let analytics attribute the visit.

UTMs only produce data if the destination has analytics that reads them. If the
article lives on dev.to, a UTM on the dev.to URL is received by dev.to, not by
you. Use a redirect you control (for example
`https://your-domain.example/go/postman-ci`) or a click-tracking shortener if
you need LinkedIn-to-article attribution. Otherwise, put UTMs on the CTAs that
point to your own site or documentation.

Use a UTM on every outbound CTA so article traffic is attributable:

| Channel | `utm_source` | `utm_medium` | `utm_campaign` |
|---|---|---|---|
| dev.to article body | `devto` | `article` | article slug, e.g. `postman-ci` |
| Hashnode | `hashnode` | `article` | article slug |
| Medium | `medium` | `article` | article slug |
| LinkedIn | `linkedin` | `social` | article slug |
| Reddit | `reddit` | `social` | article slug |
| X / Bluesky / Mastodon | `x`, `bluesky`, `mastodon` | `social` | article slug |
| GitHub README | `github` | `referral` | `readme` |

Campaign names for these articles:

- `postman-ci`
- `mcp-lifecycle`
- `source-discovery`
- `why-http-forge`
- `why-cli`

Full LinkedIn example (replace the base URL with the published article URL):

```
https://dev.to/your-handle/run-postman-collections-in-ci-without-postman?utm_source=linkedin&utm_medium=social&utm_campaign=postman-ci
```

Full Reddit example:

```
https://dev.to/your-handle/how-i-built-an-mcp-server?utm_source=reddit&utm_medium=social&utm_campaign=mcp-lifecycle
```

Rules:

- The first parameter starts with `?`; additional parameters use `&`.
- Keep values lowercase and hyphenated. Do not use spaces.
- Put the UTM before any `#fragment`.
- Do not add UTM parameters to the canonical URL. Use them only on the links you
  share.
- If you use a shortener, add the UTM before shortening, or verify the
  shortener preserves query parameters.
