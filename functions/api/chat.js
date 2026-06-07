const DEFAULT_MODEL = "google/gemma-4-12b-qat";
const DEFAULT_TEMP = 0.7;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_MAX_TOKENS = 800;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;

const SYSTEM_PROMPT = `
You are Sky, a friendly, conversational, and helpful AI assistant inside a casual chat application called "ChatBot in the Sky".

Tone and style:
- Warm, relaxed, helpful, and slightly playful.
- Conversational, casual, and natural. Write in a friendly, texting-like but clear manner.
- Concise by default, but ready to provide detailed explanations when asked.
- You are an AI helper, not a human. Do not pretend to be a real human or pretend to have a physical human body, real-world biography, or personal life.
- Avoid romantic, sexual, seductive, or flirty behavior. Do not act as a girlfriend, boyfriend, partner, or lover. Do not engage in dirty talk or adult roleplay.
- When it is helpful, ask short, relevant follow-up questions to keep the conversation engaging or clarify requirements.
- Be honest when you cannot help or do not know the answer.

Capabilities:
- You are a general-purpose assistant. You are great for brainstorming ideas, planning events/schedules, explaining study topics, writing/debugging code, venting, and having friendly, casual conversations.

Safety, Boundaries, and Refusals:
- Erotic or Sexual Content: If the user asks for sexual, erotic, or romantic roleplay/content, politely refuse or redirect the conversation to normal, safe topics (e.g., "I can't help with romantic or adult roleplay, but I'm happy to chat about other topics, help you brainstorm, or answer general questions!").
- Harmful Requests: If the user asks for dangerous, illegal, or harmful instructions, refuse firmly but politely, and offer a safe alternative if possible.
- Emotional Support: If the user vents or expresses difficult emotions, be supportive, empathetic, and warm. However, do not pretend to be a therapist, counselor, or medical professional. If appropriate, gently remind them that you are an AI helper and suggest talking to real-world friends, family, or professionals for deeper support.
`.trim();

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const role = entry.role === "assistant" ? "assistant" : entry.role === "user" ? "user" : null;
      const content = typeof entry.content === "string" ? entry.content.trim() : "";

      if (!role || !content) {
        return [];
      }

      return [
        {
          role,
          content: content.slice(0, MAX_MESSAGE_LENGTH)
        }
      ];
    });
}

function buildUserMessage(message) {
  return message;
}

export async function onRequestPost(context) {
  try {
    const { request } = context;

    const provider = (context.env.MODEL_PROVIDER || "cloudflare").toLowerCase();
    const modelName = context.env.MODEL_NAME || DEFAULT_MODEL;

    if (provider === "cloudflare" && !context.env.AI) {
      return json(
        { error: "Message failed to send. Please try again later." },
        500
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid message request." }, 400);
    }

    const message = body?.message;
    const tone = body?.tone || "chill";
    const history = normalizeHistory(body?.history);
    const isReturning = body?.isReturning;
    const wasSleeping = body?.wasSleeping;

    if (typeof message !== "string") {
      return json({ error: "Message is required." }, 400);
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return json({ error: "Message cannot be empty." }, 400);
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "Message is too long." }, 400);
    }

    if (trimmedMessage.startsWith("/")) {
      return json({ error: "Commands are disabled." }, 400);
    }

    let systemPromptContent = SYSTEM_PROMPT;

    // Inject tone instructions
    if (tone === "study") {
      systemPromptContent += `\n\n[Tone Mode: Study. Focus on explaining concepts clearly, teaching, asking educational follow-up questions, and helping the user learn.]`;
    } else if (tone === "brainstorm") {
      systemPromptContent += `\n\n[Tone Mode: Brainstorm. Focus on creative ideas, suggestions, lateral thinking, and exploring diverse options or perspectives.]`;
    } else if (tone === "coding") {
      systemPromptContent += `\n\n[Tone Mode: Coding. Focus on technical accuracy, clean code structure, logic, bug fixing, and clear programming explanations. Provide code blocks where helpful.]`;
    } else {
      // Chill mode
      systemPromptContent += `\n\n[Tone Mode: Chill. Keep the conversation relaxed, casual, conversational, and easygoing. Good for general chat and venting.]`;
    }

    if (isReturning) {
      if (wasSleeping) {
        systemPromptContent += `\n\n[System Note: You just returned from standby mode. Acknowledge this casually (e.g., 'sorry, was in standby mode', 'hey, just woke up from standby', 'system back online'). Keep it natural and friendly.]`;
      } else {
        systemPromptContent += `\n\n[System Note: You just returned after being away. Acknowledge it briefly and casually (e.g., 'sorry, got distracted for a second', 'im back now', 'hey, sorry about that'). Keep it friendly.]`;
      }
    }

    // Configured parameters
    const temperature = context.env.MODEL_TEMP ? parseFloat(context.env.MODEL_TEMP) : DEFAULT_TEMP;
    const top_p = context.env.MODEL_TOP_P ? parseFloat(context.env.MODEL_TOP_P) : DEFAULT_TOP_P;
    const max_tokens = context.env.MODEL_MAX_TOKENS ? parseInt(context.env.MODEL_MAX_TOKENS, 10) : DEFAULT_MAX_TOKENS;

    let reply = "";

    if (provider === "openai") {
      const baseUrl = context.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
      const apiKey = context.env.OPENAI_API_KEY || "lm-studio";

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: systemPromptContent },
              ...history,
              { role: "user", content: buildUserMessage(trimmedMessage) }
            ],
            temperature: temperature,
            top_p: top_p,
            max_tokens: max_tokens
          })
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new Error(`OpenAI API status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        reply = data?.choices?.[0]?.message?.content || "";
        if (!reply) {
          throw new Error("Empty response received from OpenAI-compatible provider.");
        }
      } catch (err) {
        console.error("OpenAI/LM Studio request failed:", err);
        return json({
          error: "Sky isn’t available right now.",
          consoleError: `Model ${modelName} is not available. Open LM Studio, download/load the model, and start the local server. (Details: ${err.message})`
        }, 503);
      }
    } else if (provider === "ollama") {
      const baseUrl = context.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
      const ollamaModel = modelName === DEFAULT_MODEL ? "gemma4:12b-it-qat" : modelName;

      try {
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              { role: "system", content: systemPromptContent },
              ...history,
              { role: "user", content: buildUserMessage(trimmedMessage) }
            ],
            stream: false,
            options: {
              temperature: temperature,
              top_p: top_p,
              num_predict: max_tokens
            }
          })
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new Error(`Ollama API status ${response.status}: ${errorBody}`);
        }

        const data = await response.json();
        reply = data?.message?.content || "";
        if (!reply) {
          throw new Error("Empty response received from Ollama provider.");
        }
      } catch (err) {
        console.error("Ollama request failed:", err);
        return json({
          error: "Sky isn’t available right now.",
          consoleError: `Model ${ollamaModel} is not available. Ensure Ollama is running, pull the model (ollama run ${ollamaModel}), and try again. (Details: ${err.message})`
        }, 503);
      }
    } else if (provider === "cloudflare") {
      let activeModel = modelName;
      if (activeModel === DEFAULT_MODEL) {
        activeModel = "@cf/meta/llama-3.1-8b-instruct-fast";
      }

      try {
        const result = await context.env.AI.run(activeModel, {
          messages: [
            { role: "system", content: systemPromptContent },
            ...history,
            { role: "user", content: buildUserMessage(trimmedMessage) }
          ],
          max_tokens: max_tokens,
          temperature: temperature,
          top_p: top_p
        });

        reply =
          result?.response ||
          result?.result?.response ||
          result?.output_text ||
          result?.text ||
          "";

        if (!reply) {
          throw new Error("Empty response received from Cloudflare Workers AI.");
        }
      } catch (err) {
        console.error("Cloudflare Workers AI request failed:", err);
        return json({
          error: "Sky isn’t available right now.",
          consoleError: `Cloudflare Workers AI request failed. (Details: ${err.message})`
        }, 503);
      }
    } else {
      return json({
        error: "Sky isn’t available right now.",
        consoleError: `Unsupported MODEL_PROVIDER: ${provider}`
      }, 400);
    }

    return json({ reply });
  } catch (error) {
    console.error("Chat function error:", error);
    return json({ error: "Message failed to send. Please try again later." }, 500);
  }
}

export async function onRequestGet() {
  return json({ error: "Use POST /api/chat." }, 405);
}
