# Hashnode publication — HTTP Forge

Copy the settings into the publication settings, then paste the About page into
Hashnode's About page.

## Publication settings

- **Name:** HTTP Forge
- **Subdomain:** `httpforge` (fallback: `http-forge`, `httpforge-dev`)
- **Tagline:** AI-native API testing, discovery, and CI
- **Description:** Practical writing on API testing, source discovery, MCP, and
  running collections in CI with HTTP Forge.
- **Language:** English
- **Logo:** use the HTTP Forge icon from `docs/http-forge-icon.png`
- **Cover:** use a 1200×630 image with the HTTP Forge name and the loop
  (Discover → Generate → Run → Report)
- **Navigation:** Home, Docs, GitHub, VS Code Marketplace
- **Canonical strategy:** dev.to is the primary publisher for now; set each
  Hashnode post's canonical URL to the matching dev.to URL.

## About page

> Hashnode limits the About field to 500 words. The copy below is about 281
> words. Paste only the text after this note, not the publication settings.

HTTP Forge is an AI-native API testing tool for developers who want the whole
test lifecycle to be something a human or an AI agent can drive.

It runs as a VS Code extension, a CLI, and an MCP server. All three share
`@http-forge/core`, the open-source engine (MIT), so a collection runs the same
way in the editor, CI, and through an agent. Requests, suites, and assertions are
plain files in your repo, so every generated change is reviewable in git.

This publication covers:

- discovering endpoints from source when OpenAPI is missing or stale;
- generating requests and suites without losing hand edits;
- running collections headlessly with reports CI can read;
- designing an MCP server an agent can operate end-to-end;
- the trade-offs of file-based, local-first API testing.

You will find practical walkthroughs, architecture notes, and honest write-ups of
what did not work. The goal is not to claim HTTP Forge replaces every API tool.
It is to show where an AI-native, source-connected workflow fits, and where it
does not.

It is for developers who keep API tests next to the code, QA and platform teams
who want the same collection locally and in CI, and teams exploring MCP who want
a real tool surface rather than a chat wrapper.

The core is MIT-licensed. The extension, CLI, and MCP server are adapters over
the same engine, so behavior does not fork.

- GitHub: https://github.com/hsl1230/http-forge
- CLI: https://github.com/hsl1230/http-forge.cli
- Core: https://github.com/hsl1230/http-forge.core
- Marketplace: https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge

Questions and corrections: [CONTACT EMAIL] or
https://github.com/hsl1230/http-forge/issues.

I write here as the developer behind HTTP Forge. Nothing here claims affiliation
with Postman, Bruno, Thunder Client, Insomnia, Microsoft, GitHub, or any other
vendor mentioned in the articles.
