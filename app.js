const MAX_MESSAGE_LENGTH = 2000;
const INITIAL_MESSAGES = [
  {
    role: "received",
    text: "Hey, I'm here. Send me a message.",
  },
];

let isWaiting = false;

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

document.addEventListener("DOMContentLoaded", () => {
  chatForm.addEventListener("submit", handleSubmit);
  messageInput.addEventListener("keydown", handleKeyDown);
  messageInput.addEventListener("input", handleInput);
  clearBtn.addEventListener("click", resetChat);
  closeErrorBtn.addEventListener("click", hideError);

  setSidebarTime();
  resetChat();
  updateCharacterCounter();
  messageInput.focus();
});

function handleInput() {
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
      body: JSON.stringify({ message }),
    });

    const data = await response.json().catch(() => ({}));
    removeElement(typingIndicator);

    if (!response.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    appendMessage("received", data.reply || "I did not get that. Try sending it again.");
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
  chatMessages.textContent = "";
  appendDateSeparator("Today");

  INITIAL_MESSAGES.forEach((message) => {
    appendMessage(message.role, message.text);
  });

  clearComposer();
  setWaiting(false);
  scrollToLatest();
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

  scrollToLatest();
}

function appendTypingIndicator() {
  const message = document.createElement("article");
  message.className = "message received";

  const bubble = document.createElement("div");
  bubble.className = "bubble typing-bubble";
  bubble.setAttribute("aria-label", "Maya is typing");

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
