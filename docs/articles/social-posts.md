# Social drafts — top two articles

Drafts for the two highest-upside pieces:

1. **Run Postman collections in CI without Postman** — search-driven reach.
2. **How I built an MCP server** — AI/agent-community reach.

Replace `[ARTICLE_URL]` after publishing. Add the UTM from
`publishing-metadata.md` if you want attribution.

Posting notes:

- Do not publish both articles on the same day.
- Disclose that you are the author in Reddit posts.
- Reply to comments; that matters more than the initial upvotes.
- Do not post the same text to multiple subreddits on the same day. Pick the
  best fit, then crosspost after 2–3 days if the response is good.
- LinkedIn does not render Markdown. Before pasting, remove `**`, backticks,
  and triple-backtick fences. Keep line breaks, put commands on one line, or
  attach a screenshot of the command/report instead of a code block.

---

## 1. Run Postman collections in CI without Postman

### LinkedIn

Your Postman collection is green locally. Then CI fails because nobody
installed Postman.

The usual fix is Newman, or a paid cloud runner. Both work, but they add a
second runtime and another place for environment handling to drift.

I took a different route with HTTP Forge:

1. Import the Postman collection and environment once.
2. Run the collection headlessly.
3. Emit JUnit XML.
4. Wire it into GitHub Actions.

The CI command is the whole story:

http-forge run collection "My API" --environment staging --var BASE_URL="$STAGING_BASE_URL" --reporter junit:results/junit.xml --exit-code

--exit-code fails the build. The JUnit file gives the PR a readable test
report. No Postman, no Newman, no GUI.

I wrote up the full setup, including the GitHub Actions workflow and the
gotchas I hit with environment variables:

[ARTICLE_URL]

If you already run imported Postman collections in CI, I'd be interested in
where this still falls short.

### Reddit — r/QualityAssurance

**Title:** Running imported Postman collections in CI without Postman or Newman (JUnit + GitHub Actions)

**Body:**

I kept running into the same setup: a Postman collection that works locally,
but CI either needs Newman, a paid runner, or a hand-maintained export step.

I'm the author of HTTP Forge, so take this with the usual bias warning. I
wrote up the workflow I use:

1. Import the collection as Collection v2.x JSON.
2. Import the Postman environment as a named environment.
3. Run the collection headlessly with `--exit-code` and a JUnit reporter.
4. Publish the JUnit file as a PR check.

The core command:

```bash
http-forge run collection "My API" \
  --environment staging \
  --var BASE_URL="$STAGING_BASE_URL" \
  --reporter junit:results/junit.xml \
  --exit-code
```

A few things that mattered in practice:

- `--exit-code` is what actually gates CI. Without it the run can fail but the
  job stays green.
- `--reporter junit:<path>` is separate from `--include report`; mixing those
  up gives you an empty JUnit file.
- Variable names are case-sensitive. `{{baseUrl}}` and `{{BASE_URL}}` are not
  the same, and that was the cause of most of my early failures.
- If you keep Postman as the source of truth, import from the exported JSON in
  CI. If you don't, commit the converted collection and skip the import.

Full walkthrough with the GitHub Actions YAML:

[ARTICLE_URL]

I'm not claiming this replaces Newman for everyone. If your collection depends
on Postman-specific behavior, Newman is still the safer answer. But if you want
the same engine in the editor, CLI, and CI, this has been much less work to
maintain.

Happy to answer questions about the import or the workflow.

---

## 2. How I built an MCP server that lets AI agents run my API tests

### LinkedIn

Most AI testing demos stop at "write me a test."

That's the easy part. The hard part is letting an agent actually run the
lifecycle: discover endpoints, generate a suite, execute it, read the failure,
and fix a stale assertion without a human copying JSON between tools.

That's why I built an MCP server into HTTP Forge.

The agent gets a real tool surface:

- create_request_from_endpoint / generate_test_suite
- run_request / run_collection / run_suite
- get_run_summary / get_failed_requests / explain_failure
- heal_assertions + set_request_script

Two design choices made the biggest difference:

1. Bounded output. MCP responses go into a context window. The server
   truncates large bodies and lets the agent ask for failures only.
2. Errors are prompts. Instead of "not found", the server returns the
   available collection names so the agent can self-correct in one turn.

The agent isn't calling an opaque API. It's reading and writing plain files in
the same workspace as the code, so a human can review every change in git.

I wrote up the architecture, the tool design, and a real agent transcript here:

[ARTICLE_URL]

The interesting question isn't whether an agent can write a test. It's whether
it can operate the tool end-to-end without hiding state from the person
reviewing the diff.

### Reddit — r/mcp

**Title:** I built an MCP server so an agent can drive the full API test lifecycle (discover → generate → run → diagnose → heal)

**Body:**

I'm the author of HTTP Forge, an API testing tool. The part I care about is
making the whole lifecycle agent-operable, not just adding a "generate test"
button.

The MCP server exposes roughly these groups:

- Inspection: `list_collections`, `list_requests`, `get_request`,
  `get_run_summary`, `get_failed_requests`
- Execution: `run_request`, `run_folder`, `run_collection`, `run_suite`
- Discovery: `create_request_from_endpoint`, `generate_test_suite`,
  `suggest_workflow`, `check_drift`
- AI: `suggest_assertions`, `explain_failure`, `heal_assertions`,
  `generate_scenarios`

A real run looks like:

1. `create_request_from_endpoint` creates a request with provenance
   (`framework`, `source file`, `confidence`).
2. `generate_test_suite` creates suite nodes that assert the discovered status
   code.
3. `run_suite` returns a run ID and failure list.
4. `explain_failure` returns the request, response, assertion results, script
   errors, and a diagnosis.
5. `heal_assertions` returns the current script, the last response, and
   instructions. The agent calls `set_request_script` to apply the change.

Design choices that mattered:

- **Bounded outputs.** Large response bodies are truncated; the agent asks for
  `failedOnly` or `perRequest` when needed.
- **Structured errors.** Returning available names instead of `not found` lets
  the model self-correct in one turn.
- **No hidden state.** Every change lands in plain JSON/text files in the repo,
  so it shows up in git like any other edit.
- **`heal_assertions` is advisory.** It does not silently weaken assertions;
  the agent has to write the new script explicitly.

The full write-up, including a transcript and the parts I got wrong:

[ARTICLE_URL]

I'd be interested in feedback from anyone running MCP servers in production:
what does your error contract look like, and how do you keep tool output small
enough for the context window?

---

## Short X / Bluesky / Mastodon versions

### Postman CI

> Your Postman collection is green locally. Then CI fails because nobody
> installed Postman.
>
> Import it once, run it headlessly, emit JUnit, gate the build with
> `--exit-code`. No Postman, no Newman, no GUI.
>
> Full GitHub Actions walkthrough: [ARTICLE_URL]

### MCP server

> Most AI testing demos stop at "write me a test."
>
> I built an MCP server so an agent can discover endpoints, generate a suite,
> run it, read the failure, and fix a stale assertion — with every change
> visible in git.
>
> Architecture + transcript: [ARTICLE_URL]
