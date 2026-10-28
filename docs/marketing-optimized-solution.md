# HTTP Forge — Optimized Marketing Solution

## Core Principle

**Lead with the loop, not the competitors.** "Discover → Generate → Run → Report" is the headline — something no competitor can claim. Competitor comparisons are supporting evidence in docs and SEO, never the hook.

---

## 🎯 Positioning: One Loop, Three Audiences

| Audience | Their Pain | One-Sentence Pitch (docs/SEO, not hook) |
| :--- | :--- | :--- |
| **Postman users** | "I export collections to CI and pray the scripts still work." | "Your Postman collection runs in CI with zero rewrites — and your AI agent can fix it when it breaks." |
| **Thunder Client users** | "I like VS Code, but I can't run suites or let AI help." | "Stay in VS Code. Now your AI agent runs the whole test lifecycle." |
| **Bruno users** | "I love local-first, but I miss AI integration." | "Local-first like Bruno. AI-native like nothing else." |

**The competitor rule (two separate rules — do not conflate them):**
- **Hooks (video/Reddit/X):** Never name a competitor. Center the Loop. ❌ "Postman users—" ✅ "Your AI agent discovers your endpoints, generates tests, runs them, and reports back."
- **SEO metadata (Marketplace, docs, comparison pages):** Competitor keywords are required. People search "postman alternative," "bruno mcp," "thunder client alternative." Use them in titles, descriptions, and article headlines — never in the first spoken sentence of a video.

---

## 🧱 Phase 0: Foundation (Week 1 — nothing else happens this week)

### 0.1 Verify the 60-second quickstart (the gate)
- Have **3 developers who are not you** install from scratch and follow the README quickstart.
- Time every step. Fix every point of confusion.
- **Conversion event:** reader successfully sends their first request.
- **Gate:** if it takes >2 minutes, fix the docs before any promotion. Do not start Phase 1 until this passes.

### 0.2 Community infrastructure
- **GitHub Discussions** — enable; pin a "Welcome / Introduce yourself" thread.
- **CONTRIBUTING.md** — build/test/release workflow, coding conventions, how to run tests.
- **Issue templates** — bug report, feature request, with environment/version fields.
- **Response SLA** — commit to responding to issues within 24 hours. This is your #1 growth lever as a solo dev.

### 0.3 Monetization transparency
- README states clearly: "Open source (MIT). Free forever. No cloud account required."
- If a paid tier is planned later, say so: "Core is free; team features may come later."
- Developers distrust "free" without a sustainability story.

### 0.4 Marketplace SEO (90% of installs come from here)
- **Title:** "HTTP Forge — API Testing, OpenAPI, MCP Server"
- **Description first paragraph:** "Free Postman/Bruno/Thunder Client alternative. Run API tests in VS Code, CI/CD, and let AI agents drive your entire test lifecycle via MCP."
- **Keywords:** postman alternative, bruno alternative, thunder client alternative, api testing, mcp server, openapi, websocket
- **Screenshots:** 5–7 showing the Loop (Discover → Generate → Run → Report), not just the UI.
- **Categories:** "Testing", "Other"

### 0.5 The Loop GIF (named deliverable — do not skip)
Produce a **5-second looping GIF** of Discover → Generate → Run → Report. This single asset goes in the README, Reddit post, X thread, and Marketplace listing. Arguably higher ROI than either video. Assign it to Phase 0.

---

## 📝 Phase 1: Content marketing (Week 2–3)

Developers form opinions in documentation and technical articles, not ads.

**Article 1 (write first — strongest angle): "How I built an MCP server that lets AI agents run my API tests"**
- Platform: dev.to + Hashnode
- Length: 1,500–2,000 words
- Content: Technical story. Show MCP tool calls, the transcript, assertion healing. Include code snippets.
- CTA: "Try HTTP Forge" → Marketplace link.
- Why: dev.to content ranks high in search and is cited by AI assistants.

**Article 2: "Discovering API endpoints from source code with zero OpenAPI specs"**
- Platform: dev.to
- Content: The six framework providers, golden fixtures, drift detection. Technical, not marketing.
- CTA: Link to docs.

**Article 3 (replaces the 3-way diff piece — higher intent): "How to run Postman collections in CI without Postman"**
- Platform: dev.to
- Content: A practical, search-driven how-to. Import → run headless → JUnit report → wire into GitHub Actions.
- Why: this is a high-intent search query that funnels your exact target audience. Save the 3-way diff deep-dive for Month 2 when you have an audience.

**Docs improvements (ongoing through Phase 1):**
- 60-second quickstart verified end-to-end (done in Phase 0).
- "Getting Started" page a first-time user can follow in <2 minutes.
- "WebSocket testing guide" page — link `websocket-examples.md` from the user guide.

---

## 🎬 Phase 2: Video (Week 3 — quality over quantity)

Produce **2 videos**, not 4.

**Video 1: The Loop (60 seconds — all platforms)**
- **Content:** Discover endpoints → generate suite → run collection → see report, all in one take.
- **Hook (no competitor names):** "Your AI agent discovers your endpoints, generates the tests, runs them, and reports back. Here's the loop."
- **Production:** Screen recording with narration. Trupeer or Clueso for zoom/highlights. **Write the hook yourself — do not let AI generate it.** Keep the agent as the protagonist ("your agent runs the loop"), not "HTTP Forge's AI does everything automatically."
- **Platforms:** YouTube (long-form), X, LinkedIn, Reddit.

**Video 2: CLI one-liner (20 seconds — X/LinkedIn)**
- **Content:** One command `http-forge run collection MyApi --env dev --json`, output JUnit report.
- **Hook:** "Your collection, running headless in 10 seconds."
- **Production:** agentreel (`--cmd "http-forge run ..."`) or simple screen recording.

**Skipped deliberately (revisit later):**
- TikTok/Shorts/Reels — low conversion for dev tools.
- Product Hunt — low ROI for VS Code extensions; move to a separate "Post-v1.0 backlog" section. Do not put it in the active timeline.

---

## 💬 Phase 3: Community & distribution (Week 4–5)

**Reddit** (r/webdev, r/programming, r/SideProject — not r/vscode, too niche)
- Title: "I built an API testing tool that lets AI agents run your entire test lifecycle"
- Body: honest story — "I got tired of exporting Postman collections to CI and fixing broken scripts. So I built HTTP Forge." Include the Loop GIF. Invite feedback.
- Rules: no "check out my tool" titles; disclose you're the author; respond to every comment.

**X/Twitter**
- Post the CLI one-liner video + command.
- Thread: "I built an MCP server with 60+ tools. Here's how Copilot runs my API tests."
- Tag communities (#buildinpublic, #devtools), not competitors.

**Stack Overflow / Quora**
- Answer questions about "postman run collection in ci", "api testing mcp server", "websocket testing vscode".
- Mention HTTP Forge as one option among several. These answers rank well and are cited by AI.

**GitHub**
- Discussions enabled (Phase 0).
- CONTRIBUTING.md and issue templates in place (Phase 0).
- Respond to issues within 24 hours.

---

## 🚀 Post-v1.0 backlog (not in the active timeline)

- Product Hunt launch — only with 5–7 GIFs and a hunter; Tuesday/Wednesday 12:01 AM PST; honest first comment. Trigger: v1.0, not a calendar week.
- TikTok/Shorts/Reels — revisit only if Month 1 video→install attribution shows positive signal.
- 3-way diff deep-dive article — Month 2, once there's an audience.

---

## ⚡ Execution timeline (6 weeks — realistic for one person)

| Week | Action | Output |
| :--- | :--- | :--- |
| **1** | Phase 0 only: verify quickstart with 3 external devs, fix docs, GitHub Discussions + CONTRIBUTING + issue templates, Marketplace SEO, produce Loop GIF | Working onboarding + community infra + Loop GIF |
| **2** | Record Video 1 (The Loop) + Video 2 (CLI one-liner); write Article 1 | 2 videos + 1 article draft |
| **3** | Publish videos on X/LinkedIn/YouTube; publish Article 1 on dev.to; write Article 2 | Videos live + 1 article live |
| **4** | Reddit post (with Loop GIF); X thread; publish Article 2 | Multi-channel distribution |
| **5** | Write + publish Article 3 (Postman in CI); Stack Overflow/Quora answers | 3 articles live + Q&A footprint |
| **6** | Respond to feedback, iterate docs, collect testimonials, measure video→install attribution | Updated docs + user quotes + attribution data |

If you must compress to 4 weeks, cut Article 2 and the X thread — not the quickstart verification or the Loop GIF.

---

## ⚠️ Key principles

1. **The product and docs are the marketing.** Videos drive traffic; whether users stay depends on whether they succeed in running their first request within 2 minutes. Verify the quickstart first — it is the gate for everything else.
2. **Lead with the loop, not the competitors.** "Discover → Generate → Run → Report" is the headline. Competitor comparisons live in docs and SEO metadata only — never in the first spoken sentence of a video.
3. **MCP is the real differentiator.** Postman has Newman (CI). Bruno has CLI. HTTP Forge has an MCP server with 60+ tools that lets AI agents drive the entire lifecycle. That's the story.
4. **Keep the agent as the protagonist.** "Your agent runs The HTTP Forge Loop" — accurate and relatable. Avoid "HTTP Forge's AI does everything automatically," which invites "so it's just MCP wrappers?" pushback.
5. **Be honest about limitations.** "Free forever, open source, local-first" is strong. Don't overclaim — say "Postman alternative for developers who want local-first + AI," not "better than Postman."
6. **Community > ads.** Fast issue response and genuine engagement outperform paid promotion for dev tools at this stage.

---

## 📊 Metrics to track

| Metric | Tool | Target (Month 1) | How measured |
| :--- | :--- | :--- | :--- |
| Marketplace installs | VS Code Marketplace | 500+ | Baseline at Week 0; track weekly |
| **Video→install attribution** | Marketplace + UTM on video description links | Install lift in video launch week vs. baseline | Compare installs the week videos go live vs. the prior 2-week average |
| GitHub stars | GitHub | 100+ | Weekly |
| Article views | dev.to / Hashnode | 2,000+ | Per article |
| Video views | YouTube/X | 1,000+ | Per video |
| Issue response time | GitHub | <24 hours | Spot-check weekly |
| Quickstart success rate | Manual re-test | 3/3 fresh devs, re-tested quarterly | Schedule quarterly re-tests with fresh devs — otherwise this metric is dead after Week 1 |

---

## 🔑 What changed from the original, and why

| Change | Why |
| :--- | :--- |
| 4 weeks → 6 weeks | Week 1 (Phase 0) is a full week of solo work; the original timeline stacked content on top of it unrealistically. |
| Added the Loop GIF as a Phase 0 deliverable | It's referenced in the Reddit post but never assigned. Highest-ROI single asset — goes in README, Reddit, X, Marketplace. |
| Split the competitor rule into "hooks" vs. "SEO metadata" | The original said "never mention competitors" but then put competitor names in the Marketplace description. Both rules are correct — they just apply to different surfaces. |
| Swapped Article 3 (3-way diff → "Postman in CI") | "Run Postman collections in CI" is a high-intent search query that funnels the exact target audience. The 3-way diff piece is niche; save it for Month 2. |
| Removed Product Hunt from the active timeline | Listing it creates a false obligation. Moved to a Post-v1.0 backlog with a v1.0 trigger. |
| Added video→install attribution metric | Video views alone don't tell you if video was worth the effort. The honest answer might be "the GIF did more." |
| Clarified "agent as protagonist" in Video 1 production notes | Prevents the overclaim that invites technical pushback. |
