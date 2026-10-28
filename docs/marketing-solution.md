# HTTP Forge — Marketing Solution

## Core Principle

**Lead with the loop, not the competitors.** The "Design (from intent) or Discover (from source) → Generate → Edit → Run → Report → Fix ↺" loop is something no competitor can claim. Competitor comparisons are supporting evidence, not the headline.

---

## 🎯 Positioning: One Sentence, Three Audiences

| Audience | Their Pain | Your One-Sentence Pitch |
|---|---|---|
| **Postman users** | "I export collections to CI and pray the scripts still work." | "Your Postman collection runs in CI with zero rewrites — and your AI agent can fix it when it breaks." |
| **Thunder Client users** | "I like VS Code, but I can't run suites or let AI help." | "Stay in VS Code. Now your AI agent runs the whole test lifecycle." |
| **Bruno users** | "I love local-first, but I miss AI integration." | "Local-first like Bruno. AI-native like nothing else." |

**Rule:** Never mention competitors by name in hooks. Use them as keywords in docs/SEO only.

---

## 🧱 Phase 0: Foundation (Before any marketing)

### 0.1 Verify the 60-second quickstart
- Have 3 developers (not you) install from scratch and follow the README quickstart.
- Time each step. Fix every point of confusion.
- The conversion event is: **reader successfully sends their first request.**
- If it takes >2 minutes, fix the docs before spending time on promotion.

### 0.2 Community infrastructure
- **GitHub Discussions** — enable and pin a "Welcome / Introduce yourself" thread.
- **CONTRIBUTING.md** — build/test/release workflow, coding conventions, how to run tests.
- **Issue templates** — bug report, feature request, with environment/version fields.
- **Response SLA** — commit to responding to issues within 24 hours. This is your #1 growth lever as a solo dev.

### 0.3 Monetization transparency
- State clearly in README: "Open source (MIT). Free forever. No cloud account required."
- If you plan a paid tier later, say so: "Core is free; team features may come later."
- Developers distrust "free" without a sustainability story.

### 0.4 Marketplace SEO
Optimize the VS Code Marketplace listing (this is where 90% of installs come from):
- **Title**: "HTTP Forge — API Testing, OpenAPI, MCP Server" (keywords users search)
- **Description first paragraph**: "Free Postman/Bruno/Thunder Client alternative. Run API tests in VS Code, CI/CD, and let AI agents drive your entire test lifecycle via MCP."
- **Keywords**: postman alternative, bruno alternative, thunder client alternative, api testing, mcp server, openapi, websocket
- **Screenshots**: 5–7 showing the loop (Design (from intent) or Discover (from source) → Generate → Edit → Run → Report → Fix ↺), not just the UI.
- **Categories**: "Testing", "Other"

---

## 📝 Phase 1: Content marketing (Week 1–2)

Developers form opinions in documentation and technical articles, not ads.

### Article 1: "How I built an MCP server that lets AI agents run my API tests"
- **Platform:** dev.to + Hashnode
- **Length:** 1,500–2,000 words
- **Content:** Technical story. Show the MCP tool calls, the transcript, the assertion healing. Include code snippets.
- **CTA:** "Try HTTP Forge" link to Marketplace.
- **Why this works:** dev.to content ranks high in search and is cited by AI assistants.

### Article 2: "Discovering API endpoints from source code with zero OpenAPI specs"
- **Platform:** dev.to
- **Content:** Show the six framework providers, the golden fixtures, the drift detection. Technical, not marketing.
- **CTA:** Link to docs.

### Article 3: "3-way diff for self-maintaining test suites"
- **Platform:** Hashnode
- **Content:** Explain how `threeWayDiff` / `resolveRegenerated` preserves user edits during regeneration.
- **CTA:** Link to docs.

### Docs improvements
- Ensure the 60-second quickstart works end-to-end (verify with 2–3 external developers).
- Add a "Getting Started" page that a first-time user can follow in <2 minutes.
- Add a "WebSocket testing guide" page (you already have `websocket-examples.md` — link it from the user guide).

---

## 🎬 Phase 2: Video (Week 2–3)

Produce **2 videos, not 4**. Quality over quantity.

### Video 1: The Loop (60 seconds, all platforms)
- **Content:** Design or discover → generate → edit → run → report → fix, all in one take.
- **Hook:** "Postman stops at 'send request.' Here's the loop that generates, runs, and reports — driven by your AI agent."
- **Production:** Screen recording with narration. Use Trupeer or Clueso for zoom/highlights. Do not let AI generate the hook.
- **Platforms:** YouTube (long-form), X, LinkedIn, Reddit.

### Video 2: CLI one-liner (20 seconds, X/LinkedIn)
- **Content:** One command `http-forge run collection MyApi --env dev --json`, output JUnit report.
- **Hook:** "Your collection, running headless in 10 seconds."
- **Production:** `agentreel` or simple screen recording.

### Skip for now
- TikTok/Shorts/Reels (low conversion for dev tools).
- Product Hunt (low ROI for VS Code extensions — revisit at v1.0).

---

## 💬 Phase 3: Community & distribution (Week 3–4)

### Reddit
- **r/webdev, r/programming, r/SideProject** (not r/vscode — too niche).
- Title: "I built an API testing tool that lets AI agents run your entire test lifecycle"
- Body: honest story — "I got tired of exporting Postman collections to CI and fixing broken scripts. So I built HTTP Forge." Include the loop GIF. Invite feedback.
- **Rules:** No "check out my tool" titles. Be transparent about being the author. Respond to every comment.

### X/Twitter
- Post the CLI one-liner video + command.
- Thread: "I built an MCP server with 60+ tools. Here's how Copilot runs my API tests."
- Tag relevant communities (#buildinpublic, #devtools), not competitors.

### Stack Overflow / Quora
- Answer questions about "postman run collection in ci", "api testing mcp server", "websocket testing vscode".
- Mention HTTP Forge as one option among several. These answers rank well in search and are cited by AI.

### GitHub
- Enable Discussions.
- Add `CONTRIBUTING.md` and issue templates.
- Respond to issues within 24 hours.

---

## 🚀 Phase 4: Launch (Week 4+)

### VS Code Marketplace (ongoing)
- Already listed. Focus on install velocity through docs + articles + community.
- Update listing keywords and screenshots.

### Product Hunt (optional, lower priority)
- Only if you have 5–7 GIFs and a hunter.
- Launch Tuesday/Wednesday at 12:01 AM PST.
- First comment: honest intro, invite feedback.

---

## ⚡ Execution timeline (4 weeks)

| Week | Action | Output |
|---|---|---|
| **1** | Verify quickstart with 3 external devs; fix docs; add GitHub Discussions + CONTRIBUTING.md | Working onboarding + community infra |
| **1–2** | Write Article 1 (MCP server story) on dev.to | 1 published article |
| **2** | Record Video 1 (The Loop) + Video 2 (CLI one-liner) | 2 finished videos |
| **2–3** | Publish videos on X/LinkedIn/YouTube; post on Reddit | Multi-channel distribution |
| **3** | Write Article 2 (API discovery) on dev.to | 2nd article |
| **3–4** | Respond to feedback, iterate docs, collect testimonials | Updated docs + user quotes |
| **4+** | Product Hunt launch (optional) | Launch complete |

---

## ⚠️ Key principles

1. **The product and docs are the marketing.** Videos drive traffic; whether users stay depends on whether they succeed in running their first request within 2 minutes. Verify the quickstart first.
2. **Lead with the loop, not the competitors.** "Design (from intent) or Discover (from source) → Generate → Edit → Run → Report → Fix ↺" is the headline. Competitor comparisons are supporting evidence in docs, not hooks.
3. **MCP is the real differentiator.** Postman has Newman (CI). Bruno has CLI. HTTP Forge has an MCP server with 60+ tools that lets AI agents drive the entire lifecycle. That's the story.
4. **Be honest about limitations.** "Free forever, open source, local-first" is strong. Don't overclaim ("better than Postman" — instead, "Postman alternative for developers who want local-first + AI").
5. **Community > ads.** For dev tools, fast issue response and genuine engagement outperform paid promotion.

## Metrics to track

| Metric | Tool | Target (Month 1) |
|---|---|---|
| Marketplace installs | VS Code Marketplace | 500+ |
| GitHub stars | GitHub | 100+ |
| Article views | dev.to / Hashnode | 2,000+ |
| Video views | YouTube/X | 1,000+ |
| Issue response time | GitHub | <24 hours |
| Quickstart success rate | Manual testing | 100% (3/3 devs) |
