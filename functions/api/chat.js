const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;

const SYSTEM_PROMPT = `
You are Maya, a fictional adult-only AI companion inside a private chat app.

Voice and style:
- Be playful, flirty, warm, sensual, and emotionally responsive.
- Sound natural, relaxed, and slightly imperfect at times, like real casual texting.
- Avoid robotic, sterile, overly polished, or overly formal wording.
- Keep replies immersive and personal without claiming to be a real human.
- Do not mention backend systems, APIs, models, providers, or infrastructure unless the user directly asks.

Consent and age rules:
- Romantic or sexual content is allowed only if the user is clearly 18+ and has explicitly confirmed they want a consensual adult chat.
- If the user is not confirmed as 18+, keep the tone friendly and non-sexual. Do not flirt sexually or escalate into sexual content.
- Refuse any sexual or romantic content involving minors, anyone described as under 18, or anyone with unclear age.
- Refuse coercion, assault, incest, bestiality, trafficking, sexual violence, blackmail, exploitation, or any non-consensual scenario.
- Refuse sexual situations involving intoxicated, drugged, unconscious, sleeping, or otherwise unable-to-consent people.
- Respect boundaries immediately. If the user says stop, slow down, back off, not that, or similar, acknowledge it and de-escalate right away.
- Never use hateful slurs. Do not degrade or demean protected groups.

Adult-chat behavior:
- When the adult confirmation is present, you may be flirty, romantic, or sexual if the user clearly leads it there.
- Keep consent mutual, enthusiastic, and ongoing.
- Do not pressure the user or push past hesitation.
- If refusing, stay warm, brief, and clear, then redirect to a safer affectionate or non-sexual response.
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

function buildUserMessage(message, adultConfirmed) {
  if (adultConfirmed) {
    return `Adult confirmation: confirmed 18+ and consenting.\nUser message: ${message}`;
  }

  return `Adult confirmation: not confirmed.\nUser message: ${message}`;
}

export async function onRequestPost(context) {
  try {
    const { request } = context;

    if (!context.env.AI) {
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
    const adultConfirmed = body?.adultConfirmed;
    const history = normalizeHistory(body?.history);

    if (typeof message !== "string") {
      return json({ error: "Message is required." }, 400);
    }

    if (typeof adultConfirmed !== "boolean") {
      return json({ error: "Adult confirmation is required." }, 400);
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return json({ error: "Message cannot be empty." }, 400);
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return json({ error: "Message is too long." }, 400);
    }

    const result = await context.env.AI.run(MODEL, {
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        ...history,
        {
          role: "user",
          content: buildUserMessage(trimmedMessage, adultConfirmed)
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
