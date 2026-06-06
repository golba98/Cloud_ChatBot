# Messages

Plain HTML, CSS, and JavaScript messaging demo with a Pages Function at `/api/chat`.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

The local dev command uses:

```bash
wrangler pages dev . --ai AI
```

If the AI binding or local auth fails, run:

```bash
npx wrangler login
```

## Deploy

This project uses **Cloudflare Pages Git integration** — pushing to `main` triggers a build automatically. No deploy command is needed.

### Cloudflare Pages dashboard settings

| Setting | Value |
|---|---|
| Build command | *(leave empty)* |
| Build output directory | `.` |
| Functions directory | `functions` |

> **Do not** set the build command to `npx wrangler deploy`. That command is for Cloudflare Workers, not Pages, and will fail with "Missing entry-point to Worker script or to assets directory."

### AI binding

In the Pages dashboard → Settings → Environment variables, add:

| Type | Variable name |
|---|---|
| Workers AI Binding | `AI` |

### Manual deploy

```bash
npm run deploy:pages
```

## Security

Never put API keys or provider secrets in frontend JavaScript. Browser files are public.
