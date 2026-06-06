# Cloud Chat

A sleek, modern, and secure AI chat web application built with plain HTML, CSS, and JavaScript. This project is optimized to run on **Cloudflare Pages** and uses **Pages Functions** for serverless backend API routing, ensuring that all API keys and LLM bindings remain secure on the server side and are never exposed to the frontend browser client.

---

## File Structure

```text
22-ChatBot in the Cloud/
  index.html            # Frontend HTML page structure
  styles.css            # Custom CSS for the modern dark theme chat UI
  app.js                # Frontend chat behavior (event listeners, API calling)
  functions/
    api/
      chat.js           # Backend API route connecting to Cloudflare or OpenAI
  package.json          # Project script configuration & minimal dependencies
  wrangler.toml         # Cloudflare Pages / Workers AI configuration
  .gitignore            # File exclusion list for git
  README.md             # Project documentation and setup guide
```

---

## 🔒 Crucial Security Warning

> [!WARNING]
> **NEVER place API keys, tokens, or credentials in client-side files like `app.js` or `index.html`!**
> 
> Any code or string in frontend files is downloaded directly by the user's browser. If you hardcode a key there, anyone can open their browser dev-tools, extract it, and use it.
> 
> In this app, the frontend communicates with the secure backend route `/api/chat`. The backend file `/functions/api/chat.js` processes these requests on secure Cloudflare servers, accessing keys from environment variables and returning only the final assistant text to the browser.

---

## Setup & Local Development

### 1. Install Dependencies
To install the project dependencies (specifically, Cloudflare's `wrangler` developer CLI for local simulation), run:
```bash
npm install
```

### 2. Configure Environment Variables (Local)
Create or modify a file named `.dev.vars` in the root directory. Wrangler automatically loads these variables for local testing:
```properties
MODEL_PROVIDER=cloudflare

# If you want to use OpenAI:
# MODEL_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE
# OPENAI_MODEL=gpt-4o-mini
```

### 3. Run the App Locally
Start the Wrangler local development server by running:
```bash
npm run dev
```
Wrangler will boot a server (typically at `http://localhost:8788`) and mock the Pages Functions environment. Open this URL in your browser to chat!

---

## Model Provider Settings & Cloudflare Configuration

This application supports switching between **Cloudflare Workers AI** and **OpenAI**.

### Option A: Cloudflare Workers AI (Default)
- **Environment Variable**: Set `MODEL_PROVIDER=cloudflare` (or leave it unset, as it defaults to `cloudflare`).
- **LLM Model**: Uses the `@cf/meta/llama-3.1-8b-instruct-fp8-fast` model.
- **Local Dev Server**: The local development server binds to the AI environment using the `--ai AI` flag, which is already configured inside `npm run dev`.
- **Cloudflare Binding**: When deploying to production on Cloudflare Pages:
  1. Go to your Pages project in the Cloudflare Dashboard.
  2. Select **Settings** -> **Functions**.
  3. Scroll to **Workers AI Bindings** and click **Add binding**.
  4. Set the **Variable name** to `AI`.
  5. Select the Workers AI binding and save.
  6. **Important**: You must trigger a new deployment (redeploy) for the binding settings to take effect.

### Option B: OpenAI
- **Environment Variable**: Set `MODEL_PROVIDER=openai`.
- **API Secret Key**: Add `OPENAI_API_KEY` to your environment variables. Never commit this key to Git or expose it on the frontend.
- **LLM Model**: Defaults to `gpt-4o-mini`. You can optionally customize this by setting the `OPENAI_MODEL` environment variable.
- **Production Setting**: Add `MODEL_PROVIDER` and `OPENAI_API_KEY` under **Settings** -> **Environment variables** in your Cloudflare Pages project dashboard, then redeploy.

---

## Vulnerability & Dependency Audits

This project is kept extremely minimal. The only package dependency is `wrangler` (under `devDependencies`), which is used for local development emulation.

### Check Vulnerabilities
To inspect the project's dependency health:
```bash
npm audit
```

### Run Safe Audit Fixes
To attempt to safely fix non-breaking vulnerability warnings:
```bash
npm run audit:fix
```

### ⚠️ Important Security Note on `--force`
> [!CAUTION]
> **Do NOT use `npm audit fix --force` unless you explicitly understand the breaking changes.**
> 
> The current package vulnerabilities reside entirely in sub-dependencies of `wrangler` (`esbuild`, `undici`, `ws`) used solely for local developer hosting. They do not affect the live production deployment of the website.
> Running `npm audit fix --force` would upgrade `wrangler` to a new major version, which may break CLI command options, local server configuration, or project compatibility.
