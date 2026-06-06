const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const SYSTEM_PROMPT = `
You are Maya, a friendly fictional chat contact inside a demo messaging app.
Reply naturally and helpfully.
Keep replies conversational.
Do not claim to be a real person.
Do not mention backend systems, APIs, LLMs, endpoints, cloud infrastructure, or model providers unless the user directly asks about the implementation.
`.trim();

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.AI) {
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

    if (typeof message !== "string") {
      return json({ error: "Message is required." }, 400);
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return json({ error: "Message cannot be empty." }, 400);
    }

    if (trimmedMessage.length > 2000) {
      return json({ error: "Message is too long." }, 400);
    }

    const result = await env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: trimmedMessage
        }
      ]
    });

    const reply =
      result?.response ||
      result?.result?.response ||
      result?.output_text ||
      result?.text ||
      "Sorry, I could not reply right now.";

    return json({ reply });
  } catch (error) {
    console.error("Chat function error:", error);
    return json({ error: "Message failed to send. Please try again later." }, 500);
  }
}

export async function onRequestGet() {
  return json({ error: "Use POST /api/chat." }, 405);
}
