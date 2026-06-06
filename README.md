# Cloud Chat

A sleek, modern, and secure AI chat web application built with plain HTML, CSS, and JavaScript. This project is optimized to run on **Cloudflare Pages** and uses **Pages Functions** for serverless backend API routing, ensuring that all API keys and LLM bindings remain secure on the server side and are never exposed to the frontend browser client.

---

## Features
- **Modern UI**: Dark-themed centered app shell, smooth scroll behavior, responsive mobile layouts, and custom code-block styling.
- **Secure Architecture**: Serverless API endpoint (`/api/chat`) proxies calls to LLM providers. Zero API keys in frontend code.
- **Dual Provider Support**: Switch between **Cloudflare Workers AI** and **OpenAI** using a single environment variable.
- **UX Protections**: Send button disabling during execution, maximum character limits (2000 chars) both on frontend and backend, character counters, local history tracking, and error-handling alerts.

---

## File Structure

```text
├── index.html          # Chat interface structure & layouts
├── styles.css          # Theme variables, custom scrollbars, animations & responsive styling
├── app.js              # State management, form submission, and safe message rendering
├── wrangler.toml       # Cloudflare Pages configurations
├── package.json        # Node script definitions and wrangler dev-dependency
├── .dev.vars           # Local environment variables (git-ignored)
├── .gitignore          # Git exclusion lists
└── functions/
    └── api/
        └── chat.js     # Serverless Pages Function for LLM proxying
```

---

## 🔒 Crucial Security Warning

> [!WARNING]
> **NEVER place API keys, tokens, or credentials in client-side files like `app.js` or `index.html`!**
> 
> Any code or string in frontend files is downloaded directly by the user's browser. If you hardcode a key there, anyone can open their browser dev-tools, extract it, and run up massive bills on your account.
> 
> In this app, the frontend communicates with the local serverless route `/api/chat`. The backend file `/functions/api/chat.js` processes these requests on secure Cloudflare servers, accessing keys from environment variables and returning only the final assistant text to the browser.

---

## Local Development Quickstart

### Prerequisites
- **Node.js** (v18 or higher recommended) installed on your system.

### 1. Install Dependencies
Initialize the project dependencies (specifically, Cloudflare's `wrangler` CLI):
```bash
npm install
```

### 2. Configure Environment Variables
Copy or modify `.dev.vars` in your root folder. This file is parsed by Wrangler locally:
```properties
MODEL_PROVIDER=cloudflare

# If you want to use OpenAI:
# MODEL_PROVIDER=openai
# OPENAI_API_KEY=your-secret-openai-api-key
# OPENAI_MODEL=gpt-5.4-mini
```

### 3. Run Locally
Launch the Wrangler local development server:
```bash
npm run dev
```
Wrangler will boot a server (typically at `http://localhost:8788`) and compile the Pages Function locally. Open your browser and navigate to this URL to chat!

---

## Deploying to Cloudflare Pages

You can deploy this application directly to Cloudflare Pages using two methods:

### Method A: Git Integration (Recommended)
1. Commit your code and push it to a repository on GitHub or GitLab.
2. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
3. Select your repository.
4. In **Build Settings**:
   - **Framework preset**: None
   - **Build command**: *Leave empty*
   - **Build output directory**: `.`
5. Click **Save and Deploy**.

### Method B: Wrangler CLI
Deploy directly from your command line:
```bash
npx wrangler pages deploy .
```

---

## Model Provider Settings & Bindings

To make your deployed site work, configure the model settings in the Cloudflare dashboard:

### 1. Enabling Workers AI Binding (Cloudflare Mode)
If `MODEL_PROVIDER` is unset or set to `cloudflare`, the backend will look for a Workers AI binding named `AI`.
1. Go to your Pages project in the Cloudflare Dashboard.
2. Select **Settings** -> **Functions**.
3. Scroll down to **Workers AI Bindings** and click **Add binding**.
4. Set the **Variable name** to `AI`.
5. Select a binding source and save.
6. **Important**: You must trigger a new deployment (redeploy) for the binding changes to take effect!

### 2. Environment Variables in Production (OpenAI or custom settings)
To set environment variables for your live site:
1. Navigate to **Settings** -> **Environment variables** in your Pages project.
2. Click **Add variables**.
3. Add the following variables:
   - `MODEL_PROVIDER`: Set to `cloudflare` or `openai`.
   - `OPENAI_API_KEY`: Required if provider is `openai`. Enter your OpenAI API secret key.
   - `OPENAI_MODEL`: (Optional) Defaults to `gpt-5.4-mini` if using OpenAI.
4. Save and redeploy.
# Cloud_ChatBot
