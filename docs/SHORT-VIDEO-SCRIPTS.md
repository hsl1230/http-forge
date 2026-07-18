# HTTP Forge — Short Video Scripts

> Three series. Tone: empathetic, solution-focused — universal pain points, no competitor criticism.
> Format: ~30 seconds each. Hook (pain) → Body (solution) → CTA.

---

## Series 1 — "API Testing Without the Friction" (6 Episodes)
*Universal workflow pain points. No tool named critically.*

| EP | Pain Point |
|----|-----------|
| S1E1 | Account walls before you can do anything |
| S1E2 | Your API data living somewhere you don't control |
| S1E3 | Collections that don't play well with Git |
| S1E4 | Constantly switching out of your editor |
| S1E5 | Key features locked behind a paid plan |
| S1E6 | AI assistants that stop at your code boundary |

---

### S1E1 — "Install it. Use it. That's all."

**Hook (0–3s)**
> "Have you ever had to create an account, verify an email, and accept a terms-of-service agreement — just to send your first API request?"

**Body (3–25s)**
> That friction adds up. Every new teammate, every fresh machine, every onboarding session starts the same way — with a login wall before any real work happens.
>
> HTTP Forge is a VS Code extension. Install it, click the icon, and your first request is ready in under 10 seconds. No account. No email. No sign-in flow. Nothing between you and your API.

**CTA (25–30s)**
> Search **"HTTP Forge"** in the VS Code Marketplace. Free. No account required.

---

### S1E2 — "Your API workspace should live where your code lives"

**Hook (0–3s)**
> "Your source code is on your machine, in your Git repo, under your control. Your API collections — are they?"

**Body (3–28s)**
> For teams in regulated industries, having API collections on a third-party cloud is a compliance concern. For everyone else, it's just uncomfortable. And when you're offline or on a restricted network, it becomes a blocker.
>
> HTTP Forge stores everything as plain JSON files in a folder on your machine. That folder lives wherever you want — next to your source code, in a private repo, on an air-gapped network. It works offline, always.
>
> Your API workspace, fully under your control.

**CTA (28–30s)**
> **HTTP Forge** — local-first API development. VS Code Marketplace.

---

### S1E3 — "API collections that work with Git, not against it"

**Hook (0–3s)**
> "Two developers update the same collection. They both push. Now there's a merge conflict in a file that's thousands of lines long."

**Body (3–28s)**
> When an entire collection lives in one giant file, any two edits will collide in Git. There's no clean diff, and resolving it manually risks losing work.
>
> HTTP Forge stores **one file per request**. Add a request — one file added. Edit a test script — one file changed. Two people working on different requests? Zero conflicts. Pull request reviews show exactly what changed, nothing more.
>
> API collections as merge-friendly as your source code.

**CTA (28–30s)**
> **HTTP Forge** — Git-native by design. VS Code Marketplace.

---

### S1E4 — "Test your API without leaving your editor"

**Hook (0–3s)**
> "Write code. Switch app. Send request. Check response. Switch back. Find your place. Repeat — all day."

**Body (3–25s)**
> Every context switch costs you momentum. The more tools you juggle, the harder it is to stay in deep work.
>
> HTTP Forge lives in the VS Code sidebar. Your requests are one click from your code. You write a function, fire a request, check the response, and go straight back to editing — same window, same keyboard shortcuts, same Git panel.
>
> No switching. No losing your place.

**CTA (25–30s)**
> **HTTP Forge** — API testing inside VS Code. Marketplace.

---

### S1E5 — "All the features. None of the paywalls."

**Hook (0–3s)**
> "You run your test suite in CI. You want an HTML report. You want P90 latency numbers. You open the pricing page."

**Body (3–28s)**
> Detailed reports, performance percentiles, and pipeline integration are the kind of features you expect from a mature testing tool — not the kind you expect to pay extra for.
>
> HTTP Forge ships HTML and JUnit reports on every run, for every user, for free. P50, P90, P95, P99 latency stats — included. Test Suites that span multiple collections — included. CI/CD via the CLI — included.
>
> Everything you need to ship with confidence. Zero tiers.

**CTA (28–30s)**
> **HTTP Forge** — no paywalls, no tiers. VS Code Marketplace.

---

### S1E6 — "Your AI assistant should be able to run your tests too"

**Hook (0–3s)**
> "You use AI to write code, explain errors, and review PRs. But when it comes to running your API tests — it hits a wall."

**Body (3–28s)**
> Most API clients weren't built with AI agents in mind. There's no interface for a Copilot or Claude agent to read your collections, run a suite, inspect responses, or explain what failed — so AI stops at your code and never touches your tests.
>
> HTTP Forge ships with a built-in **MCP Server** that gives any AI agent — GitHub Copilot, Claude, Cursor — direct access to your API workspace. Run a collection, read results, diagnose failures, all from your chat window.
>
> And because HTTP Forge collections are plain JSON files, your AI can author and edit them directly — without consuming any MCP tokens at all. MCP is only needed when you actually execute something.
>
> Less overhead. More work done.

**CTA (28–30s)**
> **HTTP Forge** — API testing built for AI agents. VS Code Marketplace.

---
---

## Series 2 — "What Your API Client Should Be Able to Do" (10 Episodes)
*Capability showcase. No comparison framing — just what's now possible.*

| EP | Capability |
|----|-----------|
| S2E1 | Template filters and inline expressions |
| S2E2 | Cross-collection test orchestration |
| S2E3 | Secrets pulled from your vault at runtime |
| S2E4 | TypeScript clients generated from your collection |
| S2E5 | Performance insights: P50 / P90 / P99 |
| S2E6 | One command, three environments |
| S2E7 | Control flow in test suites: if, for, while, switch |
| S2E8 | AI edits your collection directly — no MCP tokens needed |
| S2E9 | AI that already knows your workspace on day one |
| S2E10 | For AI agents with a terminal, skip MCP entirely |

---

### S2E1 — "Templates that do real work"

**Hook (0–3s)**
> "You need to format a date, uppercase a header value, or build a URL from two variables. So you write a script — for a one-liner."

**Body (3–28s)**
> Simple transformations shouldn't require a pre-request script. When your template engine only does straight substitution, even small things become ceremony.
>
> HTTP Forge templates support **filter pipelines** — `{{name | upper}}`, `{{createdAt | date:'YYYY-MM-DD'}}`, `{{price | currency:'USD'}}` — 25+ built-in filters used directly in URLs, headers, and body fields. No script file needed.
>
> You can even embed JS expressions inline: `{{userId + '-' + region}}`. Right there in the template, right where it belongs.

**CTA (28–30s)**
> **HTTP Forge** — templates that transform, not just substitute. VS Code Marketplace.

---

### S2E2 — "End-to-end tests that actually go end-to-end"

**Hook (0–3s)**
> "Your auth flow is in one collection. Your checkout flow is in another. A real user journey needs both — but your runner handles one at a time."

**Body (3–28s)**
> When a complete test scenario spans multiple collections, you end up writing shell scripts or CI glue to stitch runs together — with separate reports and no shared environment state.
>
> HTTP Forge has **Test Suites** — a dedicated layer above collections. One suite pulls requests from any collection, runs them in sequence, shares variables across all of them, and produces a single unified HTML and JUnit report.
>
> One run. One report. One environment. No glue.

**CTA (28–30s)**
> **HTTP Forge** — cross-collection test orchestration. VS Code Marketplace.

---

### S2E3 — "Your API secrets should come from your vault"

**Hook (0–3s)**
> "You rotate a key in your secrets manager. Now you have to update it in your API client too — manually, again."

**Body (3–28s)**
> Keeping credentials in sync across tools is error-prone and easy to forget. A rotated key in your vault doesn't automatically reach your API client — so tests silently break until someone notices.
>
> HTTP Forge integrates directly with your secrets infrastructure: **AWS Secrets Manager, Azure Key Vault, GCP Secret Manager, HashiCorp Vault, 1Password, and Doppler**. Variables resolve from the vault at runtime. Rotate a key once — it's current everywhere.
>
> Credentials where they belong. Not scattered across tools.

**CTA (28–30s)**
> **HTTP Forge** — vault-native secrets. VS Code Marketplace.

---

### S2E4 — "Your collection already knows your API. Let it write the client."

**Hook (0–3s)**
> "You've defined every endpoint in your collection — method, URL, headers, body shape. Why write the TypeScript client by hand?"

**Body (3–28s)**
> A well-maintained collection contains everything needed to call your API. But that knowledge stays inside the testing tool and never flows into your application code.
>
> HTTP Forge CLI includes **`@http-forge/codegen`** — run one command and get a fully-typed TypeScript client generated directly from your collection. The same client plugs into your Playwright tests via `@http-forge/playwright`.
>
> One source of truth. Code, tests, and API client — all in sync.

**CTA (28–30s)**
> **HTTP Forge** — from collection to typed client in one command. VS Code Marketplace.

---

### S2E5 — "How fast is your API, really?"

**Hook (0–3s)**
> "Your API passes all its tests. But do you know what the P90 response time looks like under realistic load?"

**Body (3–28s)**
> Pass/fail tells you whether something works. Latency percentiles tell you how it performs under pressure — and P90 or P99 spikes often reveal real-world problems that average response times hide.
>
> Every HTTP Forge test run includes **P50, P90, P95, and P99 latency stats** per request, visible in the HTML report. No extra setup, no separate load testing tool — just run your suite and see the distribution.
>
> Know your API's real performance before your users do.

**CTA (28–30s)**
> **HTTP Forge** — performance insights built in. VS Code Marketplace.

---

### S2E6 — "Run once. Test everywhere."

**Hook (0–3s)**
> "You want to run the same test suite against dev, staging, and production. That's three commands, three reports, and a lot of copy-pasting."

**Body (3–28s)**
> Switching environments for each run is manual, repetitive, and easy to get wrong — especially when reports need to be compared side by side.
>
> HTTP Forge CLI lets you run a suite against any environment by passing a single flag: `--env dev`, `--env staging`, `--env prod`. Each run produces its own scoped HTML and JUnit report, stored and named automatically.
>
> One suite definition. Every environment covered.

**CTA (28–30s)**
> **HTTP Forge** — multi-environment testing made simple. VS Code Marketplace.

---

### S2E7 — "API test suites with real control flow"

**Hook (0–3s)**
> "Your login request fails. Your test suite keeps running — executing 15 authenticated requests that were never going to pass."

**Body (3–28s)**
> Most API test suites are just a flat list of requests. There's no way to say "skip the rest if auth fails", "retry until the job is ready", or "run this block for every item in my test data".
>
> HTTP Forge Test Suites support real control flow — **`if/else`** to branch on response values, **`for`** to loop over data sets, **`while`** to poll until a condition is met, **`switch`** to route based on response content, **`block`** to group and reuse steps, and **`script`** for inline logic.
>
> Your test suite can now reason about what it's doing — not just execute blindly from top to bottom.

**CTA (28–30s)**
> **HTTP Forge** — test suites that think. VS Code Marketplace.

---

### S2E8 — "Let your AI edit the collection. Save the tokens for running it."

**Hook (0–3s)**
> "You ask your AI to add a request, update a header across 20 endpoints, or reorganise a folder. It calls tool after tool — burning tokens on every step."

**Body (3–28s)**
> MCP tools are powerful for *running* requests and reading results — but for *authoring* a collection, there's a much cheaper path.
>
> HTTP Forge collections are plain JSON files in a folder — one file per request, each with a built-in `$schema` field. Your AI assistant can read and write those files directly, the same way it edits your source code. Add a request: create a file. Rename a folder: rename a directory. Bulk-update a base URL across every endpoint: a single find-and-replace.
>
> HTTP Forge even generates an `AGENTS.md` guide in your workspace automatically — so any AI agent that opens the project immediately knows the file layout, the schema for each file type, and exactly when to edit files vs when to call MCP tools.
>
> Use MCP when you need to execute. Use the file system when you need to author.

**CTA (28–30s)**
> **HTTP Forge** — collections your AI can read, write, and run. VS Code Marketplace.

---

### S2E9 — "Your AI already knows your workspace on day one"

**Hook (0–3s)**
> "Every time you start a new AI conversation, your agent has to rediscover your workspace — calling tool after tool just to find out what collections you have and what requests are in them."

**Body (3–28s)**
> That discovery cost compounds fast. Listing collections, listing requests, reading schemas — before a single request is even run, a significant slice of your token budget is already spent.
>
> HTTP Forge takes a different approach. When you open a workspace, it automatically generates an `AGENTS.md` guide and writes a `$schema` URL into every collection file. Your AI reads those files directly — zero tool calls, zero discovery overhead.
>
> And when it's time to run? HTTP Forge detects that your AI has file access and automatically switches its MCP server to expose only the tools that genuinely require a runtime — about 20, down from 60. The rest, your AI handles itself.
>
> Less setup. Every conversation, from the first message.

**CTA (28–30s)**
> **HTTP Forge** — the API workspace your AI is ready to use. VS Code Marketplace.

---

### S2E10 — "For AI agents with a terminal, skip MCP entirely"

**Hook (0–3s)**
> "MCP is great — but every tool schema loaded into context is tokens spent before a single request runs. What if your AI could just run the tests directly?"

**Body (3–28s)**
> When an AI agent has shell access — Claude, Cursor, or any agent with a terminal tool — it can use the HTTP Forge CLI as a zero-overhead execution layer.
>
> No tool list to load. No schema to parse. The AI generates one command from its training knowledge, runs it, and reads clean JSON back.
>
> ```
> http-forge run collection auth --env prod --json
> http-forge run suite checkout --json | jq '.failedRequests'
> ```
>
> Piping through `jq` means the AI only reads the slice of results it actually needs — saving tokens on the response side too.
>
> For agents that can read files and run commands, the full workflow needs zero MCP at all: files for discovery and authoring, CLI for execution.

**CTA (28–30s)**
> **HTTP Forge** — files, CLI, or MCP — whatever your AI works best with. VS Code Marketplace.

---
---

## Series 3 — "Bring What You Already Have" (4 Episodes)
*Zero migration cost. Postman-compatible import — collections run identically.*

| EP | Angle |
|----|-------|
| S3E1 | Your existing collection works on day one |
| S3E2 | Same run, same results — then more |
| S3E3 | Your collection, now in Git |
| S3E4 | From manual runs to AI-driven automation |

---

### S3E1 — "Your collection is already compatible"

**Hook (0–3s)**
> "Switching API tools usually means rebuilding everything from scratch. Not this time."

**Body (3–25s)**
> HTTP Forge is fully compatible with Postman collections. Import your collection file and your environment — it takes about 30 seconds. Then run it. The results match what you'd expect: same requests, same assertions, same variables.
>
> You don't have to rebuild anything. Your existing work comes with you, intact, on day one.
>
> Try it once before you decide anything.

**CTA (25–30s)**
> **HTTP Forge** — import your collection. Start immediately. VS Code Marketplace.

---

### S3E2 — "Same results. Then everything else."

**Hook (0–3s)**
> "What if you could keep everything your collection already does — and add everything it can't?"

**Body (3–28s)**
> When you import your collection into HTTP Forge, it runs identically. Every request, every pre-request script, every test assertion — same output you already trust.
>
> But now it lives in Git. Now it has filter pipelines and AI agent support. Now it produces HTML and JUnit reports for free. Now your secrets can come from a vault. Now an AI agent can run it and explain the failures.
>
> Zero migration cost. Immediate new capabilities.

**CTA (28–30s)**
> **HTTP Forge** — keep what works, gain what's missing. VS Code Marketplace.

---

### S3E3 — "Put your collection in Git in 60 seconds"

**Hook (0–3s)**
> "Your API collection represents months of work. Is it backed up? Is it versioned? Can your team review changes to it?"

**Body (3–25s)**
> Import your collection into HTTP Forge and it becomes a folder of plain JSON files — one per request. Add that folder to your Git repo. Now every change is tracked, every update is reviewable, and nothing gets lost.
>
> Your collection becomes part of your codebase. PRs, history, blame, branches — all of it, just like your source code.

**CTA (25–30s)**
> **HTTP Forge** — version your API collection like code. VS Code Marketplace.

---

### S3E4 — "Your collection. Now with an AI co-pilot."

**Hook (0–3s)**
> "You've spent months building a collection that covers your API. What if an AI could run it, read the results, and tell you exactly what's wrong?"

**Body (3–28s)**
> Import your collection into HTTP Forge and connect it to GitHub Copilot, Claude, or Cursor through the built-in MCP server. Your AI agent can now run your entire suite, inspect every response, correlate failures with your source code, and suggest fixes — without you leaving your chat window.
>
> The collection you built — now with an AI that can actually use it.

**CTA (28–30s)**
> **HTTP Forge** — your collection, AI-powered. VS Code Marketplace.
