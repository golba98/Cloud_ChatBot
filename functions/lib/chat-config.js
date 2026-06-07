import modelInfo from "../../config/model-info.json" assert { type: "json" };
import modelPurpose from "../../config/model-purpose.json" assert { type: "json" };
import communicationStyle from "../../config/communication-style.json" assert { type: "json" };

export function getChatConfig() {
  return {
    modelInfo,
    modelPurpose,
    communicationStyle
  };
}

export function buildSystemPrompt() {
  const info = modelInfo;
  const purpose = modelPurpose;
  const style = communicationStyle;

  return `
You are ${info.assistantName}, the AI helper for "${info.appName}".
${info.description}

Primary Purpose:
- ${purpose.primaryPurpose}

Capabilities & Use Cases:
${purpose.useCases.map(item => `- Great for ${item}.`).join("\n")}

Not Designed For:
${purpose.notFor.map(item => `- Do not use for ${item}.`).join("\n")}

Tone & Style Guidelines:
- Tone: ${style.tone.join(", ")}.
- Response Length: ${style.defaultResponseStyle.length}.
- Formatting: ${style.defaultResponseStyle.format}.
- Follow-ups: ${style.defaultResponseStyle.followUpQuestions}.

Conversation Rules:
${style.conversationRules.map(item => `- ${item}`).join("\n")}

Avoid the following:
${style.avoid.map(item => `- Avoid ${item}`).join("\n")}
`.trim();
}
