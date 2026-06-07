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

## Model Configuration

This application supports multiple AI model providers: **Cloudflare Workers AI**, **LM Studio**, and **Ollama**.

The active model is configured to use **`google/gemma-4-12b-qat`** by default.

### Configuration Environment Variables

Create or update `.dev.vars` for local development:

| Variable | Description | Default / Example |
|---|---|---|
| `MODEL_PROVIDER` | AI provider (`cloudflare`, `openai`, `ollama`) | `cloudflare` |
| `MODEL_NAME` | Model ID to use | `google/gemma-4-12b-qat` (OpenAI) or `gemma4:12b-it-qat` (Ollama) |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible server | `http://127.0.0.1:1234/v1` |
| `OLLAMA_BASE_URL` | Base URL for local Ollama server | `http://127.0.0.1:11434` |
| `MODEL_TEMP` | Model generation temperature (0.0 to 1.0) | `0.8` |
| `MODEL_TOP_P` | Model top_p parameter | `0.9` |
| `MODEL_MAX_TOKENS` | Max tokens per response | `150` |

### Setting Up the Model Locally

#### Using LM Studio (OpenAI-compatible)
1. Open **LM Studio**.
2. Search and download the **`google/gemma-4-12b-qat`** model.
3. Load the model into memory.
4. Start the Local Server in LM Studio (defaulting to `http://localhost:1234`).
5. Configure `.dev.vars` with:
   ```env
   MODEL_PROVIDER=openai
   MODEL_NAME=google/gemma-4-12b-qat
   ```

#### Using Ollama
1. Make sure Ollama is installed and running.
2. Pull the model (use the Ollama-compatible name):
   ```bash
   ollama run gemma4:12b-it-qat
   ```
3. Configure `.dev.vars` with:
   ```env
   MODEL_PROVIDER=ollama
   MODEL_NAME=gemma4:12b-it-qat
   ```

#### Using Cloudflare Workers AI
> [!NOTE]
> Cloudflare Workers AI does not natively support the exact custom model ID `google/gemma-4-12b-qat`.
> If `MODEL_PROVIDER=cloudflare` is selected, the application will check the model and automatically fall back to the supported `@cf/meta/llama-3.1-8b-instruct-fast` model to prevent breaking the application silently.

## Security

Never put API keys or provider secrets in frontend JavaScript. Browser files are public.
