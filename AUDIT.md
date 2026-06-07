# Public Repo Readiness Audit — Maya After Dark

**Date:** 2026-06-07  
**Branch:** audit/public-repo-readiness  
**Project:** cloud-chat (Cloudflare Pages + Workers AI companion chat)

---

## Verdict

**ALMOST READY — FIX THESE FIRST**

The codebase has no exposed secrets, no committed credentials, and zero npm vulnerabilities. The architecture is sound. A small set of fixes around documentation, metadata, and .gitignore hygiene are needed before the repo is comfortable to make public.

---

## Critical Issues

Issues that **must** be resolved before making the repo public.

### 1. `.claude/` directory not in .gitignore

`.claude/settings.local.json` is a Claude Code internal file containing tool permission rules. It is not tracked by git right now, but there is no `.gitignore` entry protecting it. Any future `git add .` could accidentally commit it and expose that the project was built with Claude Code, along with its permission configuration.

**Fix:** Add `.claude/` to `.gitignore`.

### 2. No `.env.example` file

There is no `.env.example` to show contributors what environment variables are expected. A developer cloning the repo cannot tell what to put in `.dev.vars` without reading the source code.

**Fix:** Create `.env.example` with placeholder values only.

### 3. README title is wrong

`README.md` opens with `# Messages` — a leftover placeholder that does not match the project. A public visitor will be confused immediately.

**Fix:** Update the README title to match the actual project name.

---

## Recommended Fixes

Important before going public, but not immediately dangerous.

### 4. README is too thin

The README is 1.1 KB and covers only install/run/deploy. It is missing everything a new visitor or contributor needs.

Missing sections:
- What the project actually is (one-paragraph description)
- Tech stack (Cloudflare Pages, Workers AI, Llama 3.1 8B, plain HTML/CSS/JS)
- Required environment variables table (Cloudflare AI binding, optional OpenAI fallback)
- Age gate and safety note (explains the 18+ confirmation, why it is there)
- Known limitations (client-side age gate, no rate limiting, no persistence)
- License section
- Optional: screenshot

### 5. `package.json` missing metadata fields

```json
"license": "MIT",
"repository": {
  "type": "git",
  "url": "https://github.com/YOUR_USERNAME/YOUR_REPO.git"
}
```

Both are missing. A public npm-style repo should declare its license explicitly.

### 6. No rate limiting on `/api/chat`

The endpoint has no per-IP or per-session throttle. A malicious actor could send unlimited requests and exhaust your Cloudflare Workers AI quota or trigger billing.

**Options (cheapest first):**
- Add a Cloudflare Rate Limiting rule in the dashboard (no code change).
- Add a simple in-memory token bucket in `functions/api/chat.js` (works only within a single worker instance lifetime).
- Use Cloudflare KV or Durable Objects for persistent rate limiting across instances.

This is not a blocker for going public, but it is the highest-impact security gap in the app.

### 7. Age gate is client-side only

`isAgeConfirmed` lives in browser memory. Anyone can open DevTools and set it to `true`, bypassing the gate entirely. The backend checks `adultConfirmed` as a boolean but trusts the value the client sends.

This is a known limitation for purely client-rendered apps. It is acceptable to document it rather than immediately fix it, but it should be acknowledged in the README under Known Limitations.

---

## Nice-to-Have Improvements

Polish items that would make the repo look more professional but are not blocking.

- Add `keywords` and `homepage` to `package.json`.
- Add a `lint` script (e.g., `"lint": "npx eslint ."`) even if no config exists yet.
- Add a brief contributing guide or link to issues in README.
- Consider a screenshot or GIF of the chat UI in the README.
- Add an explicit `LICENSE` file (MIT or similar) in the repo root.

---

## Secrets Check

**Result: CLEAN — no secrets found**

Searched all non-binary committed files for: `sk-`, `apiKey`, `api_key`, `API_KEY`, `token`, `password`, `secret`, `OPENAI`, `ANTHROPIC`, `GEMINI`, `CLOUDFLARE_`, `Bearer`, `Authorization`, `webhook`, hardcoded private URLs.

| File | Finding |
|------|---------|
| `.dev.vars` | **Not tracked by git.** Contains only `MODEL_PROVIDER=cloudflare` and a commented placeholder (`# OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE`). No real key. |
| `.claude/settings.local.json` | **Not tracked by git.** Claude Code permission config. |
| `wrangler.toml` | Clean. No secrets. Uses `[ai]` binding (Cloudflare-managed). |
| `functions/api/chat.js` | Uses `context.env.AI` (Cloudflare AI binding — no key in code). |
| `package.json` | Clean. |
| `index.html` | One Google Fonts CDN link. No secrets. |
| `app.js` | No hardcoded keys, tokens, or private URLs. |
| `styles.css` | No scripts or external resources. |

Git history was also checked for any historical commits of `.dev.vars` or `.env*` files — none found.

---

## Gitignore Check

**Result: GOOD, one gap**

Current `.gitignore` covers:

| Entry | Status |
|-------|--------|
| `.env` | ✓ |
| `.dev.vars` | ✓ |
| `node_modules/` | ✓ |
| `.wrangler/` | ✓ |
| `.cache/` | ✓ |
| `dist/` | ✓ |
| `*.log` / `logs/` | ✓ |
| `AGENTS.md` / `CLAUDE.md` | ✓ |
| `.work-backups/` | ✓ |
| `.claude/` | **MISSING** |
| `.env.example` | Not ignored — correct, it should be committed |

**Fix:** Add `.claude/` to `.gitignore`.

---

## README Check

**Result: NEEDS WORK**

| Section | Status |
|---------|--------|
| Project title | Wrong — says "Messages" |
| Description (what it is) | Missing |
| Tech stack | Missing |
| Install | ✓ |
| Run locally | ✓ |
| Deploy | ✓ (well documented) |
| Environment variables | Partially — mentioned in deploy section, no table |
| Age gate / safety note | Missing |
| Known limitations | Missing |
| License | Missing |
| Screenshots | Missing |

---

## Security Check

**Result: SOLID FOUNDATION, two notable gaps**

| Check | Status |
|-------|--------|
| Frontend calls own backend (`/api/chat`), not provider directly | ✓ |
| No API keys in frontend JavaScript | ✓ |
| Input validation: type check, length limit, boolean check | ✓ |
| History normalization: role filter, length cap, type validation | ✓ |
| Error handling: try/catch in both app.js and chat.js | ✓ |
| `console.error()` only for errors, no secrets logged | ✓ |
| No `eval()` or `new Function()` | ✓ |
| No unnecessary third-party scripts (only Google Fonts CDN) | ✓ |
| `onRequestGet` returns 405 (rejects non-POST requests) | ✓ |
| Rate limiting | **MISSING** |
| CORS headers | **MISSING** — `Response.json()` returns no `Access-Control-Allow-Origin` |
| Server-side age verification | **BY DESIGN** — `adultConfirmed` is client-sent; server validates type but trusts value |

The CORS gap means any origin can call `/api/chat`. For a public app this is acceptable but worth being aware of — add an explicit origin allowlist if you want to restrict cross-origin requests.

---

## Adult / 18+ Presentation Check

**Result: ACCEPTABLE — acknowledge limitations publicly**

| Check | Status |
|-------|--------|
| Age gate modal required before chat access | ✓ |
| Backend validates `adultConfirmed` is a boolean | ✓ |
| System prompt enforces consent rules, refuses minors/non-consent | ✓ |
| No explicit test messages or generated content committed | ✓ |
| No private logs or conversation dumps committed | ✓ |
| System prompt is visible in public source | Expected — this is a public repo |
| Age gate bypassable client-side | Known limitation — document it |

The system prompt's content (refusing minors, non-consent, etc.) will be visible to anyone who clones the repo. This is the correct approach — it demonstrates responsible adult content handling, not hiding it. A recruiter seeing this will see safety-first design, not something embarrassing.

---

## Commands Run

| Command | Result |
|---------|--------|
| `git checkout -b audit/public-repo-readiness` | ✓ Branch created |
| `git ls-files .dev.vars` | Empty — not tracked |
| `git ls-files .claude/` | Empty — not tracked |
| `git log --all -- '.dev.vars'` | Empty — never committed |
| `git log --all -- '.claude/settings.local.json'` | Empty — never committed |
| `git log --all -p -- '*.env*'` | Empty — no env file history |
| `npm audit` | `found 0 vulnerabilities` |
| `npm outdated` | No output — all up to date |
| `find . -size +100k` (excl. node_modules, .git) | Only `.wrangler/` temp files — gitignored |

---

## Exact Next Steps

Run these in order. Each is safe and reversible.

**Step 1 — Fix .gitignore (protect .claude/ going forward):**
```bash
echo "" >> .gitignore
echo "# Claude Code local settings" >> .gitignore
echo ".claude/" >> .gitignore
```

**Step 2 — Create .env.example:**
```bash
cat > .env.example << 'EOF'
# Cloudflare Workers AI binding is configured in the Pages dashboard.
# No API key is required when using MODEL_PROVIDER=cloudflare.
MODEL_PROVIDER=cloudflare

# Optional: switch to OpenAI instead of Cloudflare Workers AI
# MODEL_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
# OPENAI_MODEL=gpt-4o-mini
EOF
```

**Step 3 — Add license and repository to package.json:**
```bash
# Edit package.json to add "license": "MIT" and "repository" fields
```

**Step 4 — Fix README title and expand it (ask Claude Code to rewrite README).**

**Step 5 — Add rate limiting (Cloudflare Dashboard → Security → Rate Limiting rules):**
- Rule: `/api/chat` — max 30 requests per minute per IP — action: block

**Step 6 — Stage and commit the audit artifacts:**
```bash
git add AUDIT.md .gitignore .env.example
git commit -m "Add public repo readiness audit and gitignore/env fixes"
```

**Step 7 — When ready to go public:**
- Merge `audit/public-repo-readiness` → `main`
- Go to GitHub repo → Settings → Change visibility → Public
