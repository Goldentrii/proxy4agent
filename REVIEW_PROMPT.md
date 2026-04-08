# AgentProxy — Independent Code Review Brief

You are a senior engineer conducting an independent review of **AgentProxy v1.1.0**, a new MCP (Model Context Protocol) server product built by Novada. You have no prior context on this project. Review everything from first principles.

---

## What Was Built

**AgentProxy** is an MCP server that gives AI agents residential proxy access to the web. It is designed for **agent-to-agent** workflows — one AI agent calls these tools to fetch, search, or render web content autonomously, with no human in the loop.

**Product goal:** An AI developer signs up at novada.com, gets one API key, adds the MCP server to their Claude Code setup in 60 seconds, and their agents can immediately bypass anti-bot systems and access any website.

**GitHub:** https://github.com/NovadaLabs/agentproxy  
**Local path:** `~/Projects/agentproxy/`

---

## Tech Stack

- TypeScript + Node.js (ES modules)
- `@modelcontextprotocol/sdk` — MCP server protocol
- `axios` — HTTP client
- `https-proxy-agent` — CONNECT tunnel for residential proxy routing
- `zlib` (stdlib) — manual decompression (arraybuffer strategy)

---

## Five Tools

| Tool | What it does |
|------|-------------|
| `agentproxy_fetch` | Fetch any URL via residential proxy — geo-targeting, session control, anti-bot bypass |
| `agentproxy_render` | Render JS-heavy pages via Novada Browser API (real Chromium) |
| `agentproxy_search` | Structured web search via Novada (Google/Bing/DDG) |
| `agentproxy_session` | Sticky session — same residential IP across multiple requests |
| `agentproxy_status` | Proxy network health check |

---

## Key Technical Decisions (explain your reasoning if you'd change any)

1. **Single `NOVADA_API_KEY`** — all tools use one env var. Proxy layer (residential IPs) and search layer (Scraper API) both authenticated with the same key from novada.com.

2. **arraybuffer + manual zlib** — fetch uses `responseType: "arraybuffer"` + `decompress: false` + manual `gunzip/brotliDecompress`. Reason: axios's built-in `decompress: true` conflicts with `https-proxy-agent`'s CONNECT tunnel on large pages (Amazon 1.6MB returned "aborted"). This was the root-cause fix.

3. **100KB output truncation** — MCP responses are truncated at 100KB to keep agent context windows sane. Large pages show `[... truncated]`.

4. **`agentproxy_session` wraps `agentproxy_fetch`** — session is implemented by passing `session_id` to the same fetch function (auth string: `APIKEY-session-ID`). No separate session management state.

5. **`agentproxy_render` is wired but endpoint TBD** — Novada Browser API endpoint (`browserapi.novada.com/extract`) is a placeholder. The tool architecture is complete; the endpoint will be confirmed by Novada team. Returns an error if the endpoint isn't live yet.

---

## What Was Tested (passing)

- Amazon.com (1.6MB, anti-bot) — title + price extracted ✅
- Cloudflare protected site (nowsecure.nl) — 200/176KB ✅
- LinkedIn company page — 346KB ✅
- HackerNews — 34KB ✅
- Google search — structured results ✅
- Bing search — structured results ✅
- Geo-targeting: US, DE, JP, BR — different IPs confirmed ✅
- Sticky sessions — same IP across 2 separate processes ✅
- Error handling: bad URL rejected, 404 surfaced correctly ✅

## Known Limitations (documented)

- Zillow, BestBuy, Nike — need `agentproxy_render` (JS execution)
- DuckDuckGo search — intermittently 502 from proxy IPs
- `fetch.sh` in ProxyClaw (the reference implementation) uses `${VAR^^}` which breaks on macOS bash 3.2 — our impl avoids this

---

## Files to Review

```
src/
  index.ts          — MCP server entry, tool dispatch, key handling
  config.ts         — API endpoints, proxy host, constants
  tools/
    fetch.ts        — Core proxy fetch (arraybuffer + zlib)
    render.ts       — Browser API wrapper
    search.ts       — Novada search (GET query params, not POST)
    session.ts      — Sticky session (wraps fetch)
    status.ts       — Gateway health check
    index.ts        — Exports
README.md           — User-facing docs
package.json        — Dependencies, build config
tsconfig.json       — TypeScript config
```

---

## Review Criteria

Please evaluate each area and provide **specific, actionable feedback** with file:line references where applicable.

### 1. Correctness
- Does the proxy auth string building logic cover all edge cases? (`fetch.ts: buildProxyAuth`)
- Is the zlib decompression fallback strategy safe? Could it silently corrupt non-gzip content?
- Is the 100KB truncation threshold appropriate? Could it cut critical content mid-tag?
- Does `agentproxy_session` correctly guarantee session stickiness, or is there a race condition?

### 2. Error Handling
- Are all axios errors properly caught and surfaced to the agent?
- What happens on proxy timeout — does the agent get a useful message?
- What happens if `NOVADA_API_KEY` works for search but the proxy rejects it? (Two different auth systems currently using the same key)
- Are there cases where an error is swallowed silently?

### 3. Security
- API key is passed in proxy URL (`http://user:KEY@host:port`). Is this safe? Could it leak in logs, error messages, or stack traces?
- Is there any input validation risk on `url`, `country`, `session_id` params?
- Could a malicious `url` parameter cause SSRF or unexpected behavior?

### 4. TypeScript Quality
- Are types strict enough? Any `unknown` or `as` casts that should be narrowed?
- Is the `Record<string, unknown>` pattern in validators the right approach?
- Any missing return type annotations on exported functions?

### 5. MCP Protocol Compliance
- Are tool descriptions good enough for an LLM to pick the right tool in context?
- Is the `inputSchema` complete and accurate for each tool?
- Should `agentproxy_render` be clearly marked as "coming soon" in its description since the endpoint is TBD?

### 6. Developer Experience (the agent using this)
- Is the `--help` output clear?
- Is the onboarding path (novada.com → key → `claude mcp add`) friction-free?
- Are error messages actionable? If an agent calls a tool and it fails, does it know what to do?

### 7. Missing Features / Gaps
- ProxyClaw had a 66-site QA test suite. Should AgentProxy have one?
- Should there be a `agentproxy_crawl` tool (multi-page) to match novada-mcp's feature set?
- Is `agentproxy_session` sufficient or should there be explicit session creation/deletion?

---

## Output Format

Provide your review in this structure:

```
## Critical Issues (must fix before publish)
[List with file:line references]

## Important Issues (fix soon)
[List with file:line references]

## Suggestions (nice to have)
[List]

## What's Good (don't change)
[List]

## Overall Assessment
[2-3 sentences: is this ready for npm publish?]
```

Be direct. This is going to production as an npm package and MCP server used by AI agents at scale.
