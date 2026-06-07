const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
let isAgeConfirmed = false;

const INITIAL_MESSAGES = [
  {
    role: "received",
    text: "Hey, I'm Maya. Before we start, tell me the vibe you want tonight — sweet, teasing, romantic, or playful. We'll keep it adult, consensual, and at your pace.",
  },
];

let isWaiting = false;
let conversationHistory = [];

const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const charCounter = document.getElementById("char-counter");
const clearBtn = document.getElementById("clear-btn");
const errorContainer = document.getElementById("error-container");
const errorText = document.getElementById("error-text");
const closeErrorBtn = document.getElementById("close-error-btn");
const sidebarTime = document.getElementById("sidebar-time");
const ageGate = document.getElementById("age-gate");
const ageGateConfirmBtn = document.getElementById("age-gate-confirm");

document.addEventListener("DOMContentLoaded", () => {
  chatForm.addEventListener("submit", handleSubmit);
  messageInput.addEventListener("keydown", handleKeyDown);
  messageInput.addEventListener("input", handleInput);
  clearBtn.addEventListener("click", () => resetChat());
  closeErrorBtn.addEventListener("click", hideError);
  ageGateConfirmBtn.addEventListener("click", confirmAgeGate);

  setSidebarTime();
  resetChat();
  updateCharacterCounter();
});

function handleInput() {
  hideError();
  updateCharacterCounter();
  resizeInput();
}


function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (isWaiting) {
    return;
  }

  const message = messageInput.value.trim();

  if (!isAgeConfirmed) {
    showAgeGate();
    return;
  }

  if (!message) {
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    showError("Message is too long.");
    return;
  }

  hideError();
  appendMessage("sent", message);
  clearComposer();
  setWaiting(true);

  const typingIndicator = appendTypingIndicator();
  scrollToLatest();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        adultConfirmed: isAgeConfirmed,
        history: getRecentHistory(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    removeElement(typingIndicator);

    if (!response.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    appendMessage("received", data.reply || "Mm, I missed that. Try sending it again.");
  } catch (error) {
    removeElement(typingIndicator);
    console.error("Message request failed:", error);
    showError("Message could not be sent. Please try again.");
  } finally {
    setWaiting(false);
    messageInput.focus();
    scrollToLatest();
  }
}

function resetChat() {
  hideError();
  conversationHistory = [];
  chatMessages.textContent = "";
  
  appendPrivacyNote();
  appendDateSeparator("Today");

  INITIAL_MESSAGES.forEach((message) => {
    appendMessage(message.role, message.text);
  });

  clearComposer();
  setWaiting(false);
  scrollToLatest();
}

function confirmAgeGate() {
  isAgeConfirmed = true;
  hideAgeGate();
  messageInput.focus();
}

function hideAgeGate() {
  ageGate.classList.add("hidden");
}

function showAgeGate() {
  ageGate.classList.remove("hidden");
}

function appendPrivacyNote() {
  const note = document.createElement("div");
  note.className = "chat-privacy-note";
  note.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" class="lock-icon-small">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
    <span>This is a private conversation. You’re in control.</span>
  `;
  chatMessages.appendChild(note);
}

function appendDateSeparator(label) {
  const separator = document.createElement("div");
  separator.className = "date-separator";
  separator.textContent = label;
  chatMessages.appendChild(separator);
}

function appendMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const messageText = document.createElement("p");
  messageText.className = "message-text";
  messageText.textContent = text;

  const time = document.createElement("time");
  time.className = "message-meta";
  time.dateTime = new Date().toISOString();
  time.textContent = formatTime(new Date());

  bubble.appendChild(messageText);
  bubble.appendChild(time);
  message.appendChild(bubble);
  chatMessages.appendChild(message);

  trackHistory(role, text);
  scrollToLatest();
}

function appendTypingIndicator() {
  const message = document.createElement("article");
  message.className = "message received";

  const bubble = document.createElement("div");
  bubble.className = "bubble typing-bubble";
  bubble.setAttribute("aria-label", "Maya is composing a reply");

  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(document.createElement("span"));
  }

  bubble.appendChild(dots);
  message.appendChild(bubble);
  chatMessages.appendChild(message);

  return message;
}

function trackHistory(role, text) {
  const normalizedRole = role === "sent" ? "user" : role === "received" ? "assistant" : null;

  if (!normalizedRole) {
    return;
  }

  conversationHistory.push({
    role: normalizedRole,
    content: text,
  });

  if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
    conversationHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
  }
}

function getRecentHistory() {
  return conversationHistory.slice(-MAX_HISTORY_MESSAGES);
}

function removeElement(element) {
  if (element && element.parentNode) {
    element.remove();
  }
}

function setWaiting(waiting) {
  isWaiting = waiting;
  sendBtn.disabled = waiting;
}

function clearComposer() {
  messageInput.value = "";
  messageInput.style.height = "auto";
  updateCharacterCounter();
}

function updateCharacterCounter() {
  const length = messageInput.value.length;
  charCounter.textContent = `${length} / ${MAX_MESSAGE_LENGTH}`;

  charCounter.classList.toggle("warning", length > MAX_MESSAGE_LENGTH * 0.9 && length < MAX_MESSAGE_LENGTH);
  charCounter.classList.toggle("limit", length >= MAX_MESSAGE_LENGTH);
}


function resizeInput() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 132)}px`;
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function showError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove("hidden");
}

function hideError() {
  errorContainer.classList.add("hidden");
}

function setSidebarTime() {
  if (sidebarTime) {
    sidebarTime.dateTime = new Date().toISOString();
    sidebarTime.textContent = formatTime(new Date());
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
