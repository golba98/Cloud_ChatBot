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

## Security

Never put API keys or provider secrets in frontend JavaScript. Browser files are public.
