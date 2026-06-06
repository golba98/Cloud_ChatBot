# Messages

A plain HTML, CSS, and JavaScript demo messaging interface with a Cloudflare Pages Function at `/api/chat`. The frontend behaves like a normal conversation with a contact named Maya, while secrets and service credentials stay on the server side.

## File Structure

```text
22-ChatBot in the Cloud/
  index.html
  styles.css
  app.js
  functions/
    api/
      chat.js
  package.json
  wrangler.toml
  .gitignore
  README.md
```

## Security

Never place API keys, tokens, or credentials in `index.html`, `styles.css`, or `app.js`. Browser files are public to anyone who opens the site.

The frontend sends messages to `/api/chat`. The Pages Function reads server-side environment variables and returns only the reply text to the browser.

## Setup

Install dependencies:

```bash
npm install
```

Create or update `.dev.vars` for local testing:

```properties
MODEL_PROVIDER=cloudflare

# Optional alternate provider:
# MODEL_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE
# OPENAI_MODEL=gpt-4o-mini
```

Run locally:

```bash
npm run dev
```

Wrangler usually serves the app at `http://localhost:8788`.

## Cloudflare Pages

This project is a static frontend plus a Pages Function.

- Build command: none
- Output directory: `.`
- Function route: `/api/chat`
- Workers AI binding name, when used: `AI`

When deploying with Workers AI, add the `AI` binding in the Cloudflare Pages dashboard under Functions settings and redeploy.

## Maintenance

Check dependency issues:

```bash
npm audit
```

Apply safe audit fixes:

```bash
npm run audit:fix
```
