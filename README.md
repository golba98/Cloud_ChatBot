# ChatBot in the Sky — Friendly AI Chat Helper

ChatBot in the Sky is a polished, lightweight, and modern AI chat application designed to be deployed on Cloudflare Pages. It serves as a friendly and casual assistant that you can "yap" to, vent to, study with, brainstorm ideas, or ask general questions.

## Features

- **Friendly Sky Aesthetic**: A clean, responsive, cloud-inspired visual layout optimized for both desktop and mobile screens.
- **Dynamic Presence State**: Sky simulates being active, away, or in standby depending on the time of day, with adjustable settings.
- **Multiple Tone Modes**: Instantly configure Sky's response style for your specific task:
  - **Chill**: Easygoing, conversational helper for general yapping.
  - **Study**: Educational, concept-explaining tutor.
  - **Brainstorm**: Creative partner for suggestions and exploring new paths.
  - **Coding**: Technical assistant focused on writing and debugging code with formatting.
- **Opening Flow Suggestions**: Quick start buttons to guide the conversation based on what you need today.
- **Multi-Provider AI backend**: Supports Cloudflare Workers AI out-of-the-box, local Ollama endpoints, or OpenAI-compatible servers (e.g., LM Studio).
- **Secure Serverless Proxy**: API keys are securely kept on the serverless backend, protecting credentials from client-side exposure.

## Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript, and Custom CSS.
- **Backend**: Cloudflare Pages Serverless Functions.
- **AI Integration**: Cloudflare Workers AI binding, Ollama, or OpenAI REST APIs.

## Project Structure

```
.
├── config/
│   ├── communication-style.json
│   ├── model-info.json
│   └── model-purpose.json
├── assets/
│   ├── favicon.svg
│   └── logo.svg
├── functions/
│   ├── api/
│   │   └── chat.js
│   └── lib/
│       └── chat-config.js
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

## Chatbot configuration

The chatbot behavior is split across three files:

- [config/model-info.json](file:///home/k9-vortex/Development/1-JavaScript_TypeScript/22-ChatBot%20in%20the%20Cloud/config/model-info.json) — app name, assistant name, provider/model metadata
- [config/model-purpose.json](file:///home/k9-vortex/Development/1-JavaScript_TypeScript/22-ChatBot%20in%20the%20Cloud/config/model-purpose.json) — what the chatbot is designed to help with
- [config/communication-style.json](file:///home/k9-vortex/Development/1-JavaScript_TypeScript/22-ChatBot%20in%20the%20Cloud/config/communication-style.json) — tone, response style, and safety boundaries

This keeps the app cleaner and easier to maintain.


## Local Development & Setup

### Prerequisites

Ensure you have [Node.js](https://nodejs.org) installed on your machine.

### Installation

Clone the repository and install the developer dependencies:

```bash
npm install
```

### Running Locally

To launch the local development environment using Cloudflare Wrangler:

```bash
npm run dev
```

The application will run locally (typically at `http://localhost:8788`). To authenticate and link wrangler with your Cloudflare account (needed for Workers AI bindings):

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
| `MODEL_TEMP` | Model generation temperature (0.0 to 1.0) | `0.7` |
| `MODEL_TOP_P` | Model top_p parameter | `0.9` |
| `MODEL_MAX_TOKENS` | Max tokens per response | `800` |

### Setting Up AI Providers

- **Cloudflare Workers AI**: The default setup. Requires a Pages project binding named `AI` mapping to Workers AI.
- **LM Studio (OpenAI-compatible)**: Load a model in LM Studio, start the local server, and set `MODEL_PROVIDER=openai`.
- **Ollama**: Ensure Ollama is running, pull your model (`ollama run gemma4:12b-it-qat`), and set `MODEL_PROVIDER=ollama`.

## Cloudflare Pages Deployment

This project is optimized for deployment on **Cloudflare Pages**. 

### Cloudflare Pages Settings

- **Build command**: *(leave empty)*
- **Build output directory**: `.`
- **Functions directory**: `functions`

> [!IMPORTANT]
> Do not use `npx wrangler deploy` as a build command. Wrangler Pages handles deployments automatically via git integration or direct directory upload.

Ensure you configure the Compatibility Flags and the `AI` Workers AI binding in the Pages dashboard (Settings → Functions → Compatibility flags / bindings) if using Workers AI.

## Security

Never commit private API keys or credentials. Frontend queries are proxied securely through the Pages Functions serverless backend.

## License

This project is licensed under the MIT License.
