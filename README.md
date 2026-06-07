# Maya After Dark — Private AI Companion Chat

Maya After Dark is a polished, responsive private AI companion chat application built on Cloudflare Pages. It features a consent-first design with 18+ boundaries, realistic scheduling simulations, and natural typing pacing with optional chat imperfections.

## Features

- **Consent-First Design**: Includes clear 18+ boundary settings and consent confirmation.
- **Simulated Activity Schedules**: Realistic presence indicators showing online, away, or sleeping states based on time and interaction.
- **Immersive Chat Experience**: Natural typing delay indicators and human-like text imperfections.
- **Multi-Provider AI Support**: Works out-of-the-box with Cloudflare Workers AI, local Ollama servers, or OpenAI-compatible endpoints (like LM Studio).
- **Modern Responsive Design**: Sleek, themeable interface optimized for both desktop and mobile devices.

## Project Structure

```
.
├── assets/
│   ├── favicon.svg
│   └── logo.svg
├── functions/
│   └── api/
│       └── chat.js
├── app.js
├── index.html
├── styles.css
├── README.md
├── package.json
├── package-lock.json
├── wrangler.toml
├── .env.example
└── .gitignore
```

## Setup & Local Development

### Prerequisites

Ensure you have Node.js installed on your machine.

### Installation

Install the required dependencies:

```bash
npm install
```

### Running Locally

To start the local development server using Cloudflare Wrangler:

```bash
npm run dev
```

The application will be served locally. If you run into issues with Cloudflare Workers AI bindings or local credentials, log in to your Cloudflare account:

```bash
npx wrangler login
```

## Environment Variables

For local development, copy `.env.example` to create `.dev.vars` (which is gitignored) and configure the variables:

| Variable | Description | Default / Example |
|---|---|---|
| `MODEL_PROVIDER` | AI provider (`cloudflare`, `openai`, `ollama`) | `cloudflare` |
| `MODEL_NAME` | Model ID to use | `google/gemma-4-12b-qat` |
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible server | `http://127.0.0.1:1234/v1` |
| `OLLAMA_BASE_URL` | Base URL for local Ollama server | `http://127.0.0.1:11434` |
| `MODEL_TEMP` | Model generation temperature (0.0 to 1.0) | `0.8` |
| `MODEL_TOP_P` | Model top_p parameter | `0.9` |
| `MODEL_MAX_TOKENS` | Max tokens per response | `150` |

### Setting Up AI Providers

- **Cloudflare Workers AI**: The default provider. It requires an active Cloudflare Workers AI binding named `AI`.
- **LM Studio (OpenAI-compatible)**: Run LM Studio locally, download the model, load it, start the server, and set `MODEL_PROVIDER=openai`.
- **Ollama**: Ensure Ollama is running, pull the model (`ollama run gemma4:12b-it-qat`), and set `MODEL_PROVIDER=ollama`.

## Cloudflare Deployment

This project uses **Cloudflare Pages Git integration**. Pushing changes to the `main` branch will automatically trigger a new deployment.

### Cloudflare Pages Settings

- **Build command**: *(leave empty)*
- **Build output directory**: `.`
- **Functions directory**: `functions`

> [!IMPORTANT]
> Do not set the build command to `npx wrangler deploy`. That command is for standalone Workers and will fail on Pages.

Ensure the `AI` Workers AI binding is configured in the Cloudflare Pages settings (Settings → Functions → Compatibility flags / bindings) if using Workers AI.

## Security

Never commit API keys or credentials. Frontend scripts are public, and all requests are proxied securely through Serverless Functions.

## License

This project is licensed under the MIT License.

