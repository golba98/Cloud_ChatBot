const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
let isAgeConfirmed = false;

const CASUAL_OPENERS = [
  "heyy",
  "oh hi",
  "there you are",
  "mm hey you",
  "took you long enough",
  "hey stranger",
  "was wondering when you’d show up",
  "hi lol"
];

function getRandomOpener() {
  return CASUAL_OPENERS[Math.floor(Math.random() * CASUAL_OPENERS.length)];
}

let isWaiting = false;
let conversationHistory = [];
let activeRequestId = 0;
let pendingTypingTimeoutId = null;
let pendingTypingTimeoutResolve = null;
let activeTypingIndicator = null;
let inactivityTimeoutId = null;
let currentStatus = "online";

// Presence states variables
let currentPresenceState = "online";
let sleepingMessageCount = 0;
const SLEEPY_RESPONSES = [
  "mm half asleep rn",
  "barely awake lol",
  "i’ll talk properly later",
  "sleepy. come back later maybe",
  "too tired, talk tomorrow ok",
  "zzz sleepy, text me in the morning"
];

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
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const appShell = document.querySelector(".app-shell");

document.addEventListener("DOMContentLoaded", () => {
  chatForm.addEventListener("submit", handleSubmit);
  messageInput.addEventListener("keydown", handleKeyDown);
  messageInput.addEventListener("input", handleInput);
  if (clearBtn) {
    clearBtn.addEventListener("click", () => resetChat());
  }
  closeErrorBtn.addEventListener("click", hideError);
  ageGateConfirmBtn.addEventListener("click", confirmAgeGate);

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      setSidebarCollapsed(true);
    });
  }

  // Active status interaction helpers
  document.addEventListener("click", () => {
    resetInactivityTimer();
  });
  document.addEventListener("focus", () => {
    resetInactivityTimer();
  });

  initializeSettings();
  initializeSidebarState();
  setSidebarTime();
  cleanupOldStorage();
  updatePresenceState();
  resetChat();
  updateCharacterCounter();

  // Periodically update presence state (e.g., every 30 seconds)
  setInterval(updatePresenceState, 30000);
});

function setStatus(status) {
  currentStatus = status;
  
  const contactStatusEl = document.querySelector(".contact-status");
  const statusDots = document.querySelectorAll(".status-dot");
  
  if (contactStatusEl) {
    if (status === "online") {
      contactStatusEl.textContent = "online now";
    } else if (status === "typing...") {
      contactStatusEl.textContent = "typing...";
    } else if (status === "away") {
      contactStatusEl.textContent = "away";
    } else if (status === "busy") {
      contactStatusEl.textContent = "busy";
    } else if (status === "sleeping") {
      contactStatusEl.textContent = "sleeping";
    }
  }
  
  statusDots.forEach((dot) => {
    dot.className = "status-dot";
    if (status === "away") {
      dot.classList.add("away");
    } else if (status === "busy") {
      dot.classList.add("busy");
    } else if (status === "sleeping") {
      dot.classList.add("sleeping");
    }
  });

  updateComposerPlaceholder(status);
}

function updateComposerPlaceholder(status) {
  if (!messageInput) return;
  const isRealistic = localStorage.getItem("mayaRealisticAvailability") !== "false";
  const wrap = document.querySelector(".message-input-wrap");
  
  if (!isRealistic || status === "online" || status === "typing...") {
    messageInput.placeholder = "Type a message...";
    if (wrap) wrap.classList.remove("unavailable");
  } else if (status === "away") {
    messageInput.placeholder = "Maya is away right now...";
    if (wrap) wrap.classList.add("unavailable");
  } else if (status === "busy") {
    messageInput.placeholder = "Maya might reply later...";
    if (wrap) wrap.classList.add("unavailable");
  } else if (status === "sleeping") {
    messageInput.placeholder = "Maya is sleeping...";
    if (wrap) wrap.classList.add("unavailable");
  }
}

function resetInactivityTimer() {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  
  if (currentStatus === "typing...") {
    return;
  }
  
  const isRealistic = localStorage.getItem("mayaRealisticAvailability") !== "false";
  const timeoutMs = isRealistic ? 300000 : 60000; // 5 minutes if realistic, 1 minute otherwise
  
  inactivityTimeoutId = setTimeout(() => {
    if (isRealistic) {
      if (currentPresenceState === "online") {
        setPresenceState("away", 15 * 60 * 1000);
      }
    } else {
      setStatus("away");
    }
  }, timeoutMs);
}

function splitResponse(text) {
  // If message is safety-related, don't split
  const safetyKeywords = [
    "consent", "boundary", "boundaries", "inappropriate", "minor", "under 18", 
    "age limit", "comfort", "uncomfortable", "de-escalate", "rules", "policy", 
    "policies", "guidelines", "safety", "unable to", "cannot", "can't", "respect",
    "stop", "slow down", "back off", "not that"
  ];
  const lowercaseText = text.toLowerCase();
  const isSafety = safetyKeywords.some(kw => lowercaseText.includes(kw));
  if (isSafety) {
    return [text];
  }

  // 35% chance to split
  if (Math.random() > 0.35) {
    return [text];
  }

  // Split by newlines first if available
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    if (lines.length === 2) {
      return lines;
    }
    // Max 3, join the rest into the last part
    if (lines.length >= 3) {
      const parts = [lines[0], lines[1], lines.slice(2).join("\n")];
      if (Math.random() < 0.8) {
        return [lines[0], lines.slice(1).join("\n")];
      }
      return parts;
    }
  }

  // Otherwise split by sentence boundaries (. ! ?) followed by space
  const sentences = text.split(/(?<=[.!?])\s+/);
  if (sentences.length > 1) {
    if (sentences.length === 2) {
      return sentences;
    }
    // We have 3 or more sentences. 20% chance to split into 3, otherwise 2.
    if (Math.random() < 0.2) {
      return [sentences[0], sentences[1], sentences.slice(2).join(" ")];
    } else {
      return [sentences[0], sentences.slice(1).join(" ")];
    }
  }

  return [text];
}

function handleInput() {
  hideError();
  updateCharacterCounter();
  resizeInput();
  resetInactivityTimer();
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

  const trimmedLowerMessage = message.toLowerCase().trim();
  if (trimmedLowerMessage === "/clear" || trimmedLowerMessage === "/reset") {
    clearComposer();
    resetChat();
    return;
  }

  if (isBlockedSlashCommand(message)) {
    clearComposer();
    showError("Commands are disabled in chat.");
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    showError("Message is too long.");
    return;
  }

  const isRealistic = localStorage.getItem("mayaRealisticAvailability") !== "false";
  let targetStateBeforeReply = currentPresenceState;
  let isReturning = false;
  let wasSleeping = false;

  hideError();
  appendMessage("sent", message);
  clearComposer();
  setWaiting(true);

  // If Maya is sleeping, process sleeping state behaviors
  if (isRealistic && targetStateBeforeReply === "sleeping") {
    sleepingMessageCount++;
    if (sleepingMessageCount >= 3) {
      // Wakes up!
      setPresenceState("online", 25 * 60 * 1000);
      isReturning = true;
      wasSleeping = true;
      targetStateBeforeReply = "online";
    } else {
      // 60% chance to ignore, 40% chance of a short sleepy reply
      const roll = Math.random();
      if (roll < 0.6) {
        // No reply - wait 5-8 seconds, then unlock composer
        const ignoreDelay = randomRange(5000, 8000);
        setStatus("sleeping");
        
        setTimeout(() => {
          setWaiting(false);
          setStatus("sleeping");
          resetInactivityTimer();
          messageInput.focus();
        }, ignoreDelay);
        return;
      } else {
        // Sleepy reply - wait 10-20 seconds before replying, show typing indicator only for last 3.5s
        const sleepyReply = SLEEPY_RESPONSES[Math.floor(Math.random() * SLEEPY_RESPONSES.length)];
        const delay = randomRange(10000, 20000);
        setStatus("sleeping");
        
        setTimeout(async () => {
          setStatus("typing...");
          removeAllTypingIndicators();
          activeTypingIndicator = appendTypingIndicator();
          scrollToLatest();
          
          setTimeout(() => {
            removeAllTypingIndicators();
            appendMessage("received", sleepyReply);
            setWaiting(false);
            setStatus("sleeping");
            resetInactivityTimer();
            messageInput.focus();
          }, 3500);
        }, delay - 3500);
        return;
      }
    }
  } else if (isRealistic && (targetStateBeforeReply === "away" || targetStateBeforeReply === "busy")) {
    isReturning = true;
    wasSleeping = false;
  }

  // Calculate reply delay pacing
  const initialDelay = calculateReplyDelay(message, targetStateBeforeReply, isRealistic);
  
  if (initialDelay > 4000) {
    setStatus(targetStateBeforeReply);
    removeAllTypingIndicators();
  } else {
    setStatus("typing...");
    removeAllTypingIndicators();
    activeTypingIndicator = appendTypingIndicator();
    scrollToLatest();
  }

  const requestId = activeRequestId + 1;
  const requestStartedAt = performance.now();
  activeRequestId = requestId;

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
        isReturning,
        wasSleeping
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (requestId !== activeRequestId) {
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Message could not be sent.");
    }

    const reply = data.reply || "Mm, I missed that. Try sending it again.";
    const parts = splitResponse(reply);

    // Wait out the rest of the initial delay if needed
    const elapsed = performance.now() - requestStartedAt;
    let remainingDelay = initialDelay - elapsed;
    if (remainingDelay < 300) {
      remainingDelay = randomRange(300, 700);
    }

    if (initialDelay > 4000) {
      if (remainingDelay > 3500) {
        await sleep(remainingDelay - 3500);
        if (requestId !== activeRequestId) return;
        setStatus("typing...");
        removeAllTypingIndicators();
        activeTypingIndicator = appendTypingIndicator();
        scrollToLatest();
        await sleep(3500);
      } else {
        setStatus("typing...");
        removeAllTypingIndicators();
        activeTypingIndicator = appendTypingIndicator();
        scrollToLatest();
        await sleep(remainingDelay);
      }
    } else {
      await sleep(remainingDelay);
    }

    if (requestId !== activeRequestId) {
      return;
    }

    // Display first part
    removeAllTypingIndicators();
    appendMessage("received", parts[0]);

    // Handle remaining split parts
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const splitDelay = randomRange(800, 2000);
      
      setStatus("typing...");
      removeAllTypingIndicators();
      activeTypingIndicator = appendTypingIndicator();
      scrollToLatest();
      
      await sleep(splitDelay);
      
      if (requestId !== activeRequestId) {
        return;
      }
      
      removeAllTypingIndicators();
      appendMessage("received", part);
    }

    // Transition back to online if she was away/busy and responded
    if (isRealistic && (targetStateBeforeReply === "away" || targetStateBeforeReply === "busy")) {
      setPresenceState("online", 15 * 60 * 1000);
    }

    clearPendingResponse({ invalidateRequest: false });
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    clearPendingResponse({ invalidateRequest: false });
    console.error("Message request failed:", error);
    showError("Message could not be sent. Please try again.");
  } finally {
    if (requestId === activeRequestId) {
      setWaiting(false);
      setStatus(currentPresenceState);
      resetInactivityTimer();
      messageInput.focus();
      scrollToLatest();
    }
  }
}

function resetChat() {
  clearPendingResponse();
  hideError();
  conversationHistory = [];
  chatMessages.textContent = "";
  
  appendPrivacyNote();
  appendDateSeparator("Today");

  const opener = getRandomOpener();
  appendMessage("received", opener);

  clearComposer();
  setWaiting(false);
  
  updatePresenceState();
  resetInactivityTimer();
  
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

  const label = document.createElement("span");
  label.className = "typing-label";
  label.textContent = "Maya is typing";

  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(document.createElement("span"));
  }

  bubble.appendChild(label);
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
  messageInput.readOnly = waiting;
}

function removeAllTypingIndicators() {
  const indicators = chatMessages.querySelectorAll(".typing-bubble");
  indicators.forEach((indicator) => {
    const messageNode = indicator.closest(".message");
    if (messageNode) {
      removeElement(messageNode);
    } else {
      removeElement(indicator);
    }
  });
  activeTypingIndicator = null;
}

function clearPendingResponse({ invalidateRequest = true } = {}) {
  if (pendingTypingTimeoutId !== null) {
    clearTimeout(pendingTypingTimeoutId);
    pendingTypingTimeoutId = null;
  }

  if (pendingTypingTimeoutResolve) {
    const resolve = pendingTypingTimeoutResolve;
    pendingTypingTimeoutResolve = null;
    resolve();
  }

  removeAllTypingIndicators();

  if (invalidateRequest) {
    activeRequestId += 1;
  }
}

function waitForTypingDelay(delayMs) {
  if (delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    pendingTypingTimeoutResolve = resolve;
    pendingTypingTimeoutId = window.setTimeout(() => {
      pendingTypingTimeoutId = null;
      pendingTypingTimeoutResolve = null;
      resolve();
    }, delayMs);
  });
}

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateHumanTypingDelay(text) {
  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText) {
    return randomRange(500, 900);
  }

  // 0.04 - 0.06 seconds per character is 40 - 60 ms per character
  const msPerChar = randomRange(40, 60);
  let delay = trimmedText.length * msPerChar;

  // Very short replies (less than 15 chars) have a small delay around 500-900ms
  if (trimmedText.length < 15) {
    delay = Math.max(delay, randomRange(500, 900));
  }

  // Cap normal delays around 4-6 seconds
  const cap = randomRange(4000, 6000);
  return Math.min(delay, cap);
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

function isBlockedSlashCommand(input) {
  return input.trim().startsWith("/");
}

function cleanupOldStorage() {
  try {
    const localKeys = Object.keys(localStorage);
    localKeys.forEach((key) => {
      const value = localStorage.getItem(key);
      if (value && (value.includes("Hey, I'm Maya") || value.includes("vibe you want tonight") || value.includes("consensual, and at your pace"))) {
        localStorage.removeItem(key);
        console.debug(`Cleared old storage key: ${key}`);
      }
    });

    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      const value = sessionStorage.getItem(key);
      if (value && (value.includes("Hey, I'm Maya") || value.includes("vibe you want tonight") || value.includes("consensual, and at your pace"))) {
        sessionStorage.removeItem(key);
        console.debug(`Cleared old sessionStorage key: ${key}`);
      }
    });
  } catch (e) {
    console.warn("Storage cleanup failed:", e);
  }
}
function initializeSidebarState() {
  const isMobile = window.innerWidth <= 840;
  const stored = localStorage.getItem("mayaSidebarCollapsed");
  const isCollapsed = stored === "true" || (stored === null && isMobile);
  
  setSidebarCollapsed(isCollapsed);
}

function toggleSidebar() {
  if (!appShell) return;
  const isCollapsed = appShell.classList.contains("sidebar-collapsed");
  setSidebarCollapsed(!isCollapsed);
}

function setSidebarCollapsed(collapsed) {
  if (!appShell) return;
  if (collapsed) {
    appShell.classList.add("sidebar-collapsed");
    localStorage.setItem("mayaSidebarCollapsed", "true");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-label", "Show sidebar");
      sidebarToggle.setAttribute("aria-expanded", "false");
    }
  } else {
    appShell.classList.remove("sidebar-collapsed");
    localStorage.setItem("mayaSidebarCollapsed", "false");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-label", "Hide sidebar");
      sidebarToggle.setAttribute("aria-expanded", "true");
    }
  }
}

// --- Maya Presence & Human Pacing Helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateReplyDelay(userMessage, state, isRealistic) {
  let baseDelay = randomRange(1500, 4000);
  const len = userMessage.length;
  if (len < 15) {
    baseDelay = randomRange(700, 1500);
  } else if (len > 120) {
    baseDelay = randomRange(3000, 6000);
  }

  if (!isRealistic) {
    return baseDelay;
  }

  if (state === "away") {
    if (Math.random() < 0.3) {
      return randomRange(8000, 30000);
    }
  } else if (state === "busy") {
    if (Math.random() < 0.5) {
      return randomRange(10000, 30000);
    }
  } else if (state === "sleeping") {
    return randomRange(12000, 30000);
  }

  return baseDelay;
}

function updatePresenceState() {
  const isRealistic = localStorage.getItem("mayaRealisticAvailability") !== "false";
  if (!isRealistic) {
    currentPresenceState = "online";
    sessionStorage.removeItem("mayaPresenceState");
    sessionStorage.removeItem("mayaPresenceStateExpires");
    setStatus("online");
    return;
  }

  const now = Date.now();
  const savedState = sessionStorage.getItem("mayaPresenceState");
  const savedExpires = sessionStorage.getItem("mayaPresenceStateExpires");

  if (savedState && savedExpires && now < parseInt(savedExpires, 10)) {
    currentPresenceState = savedState;
    setStatus(currentPresenceState);
    return;
  }

  const hour = new Date().getHours();
  let newState = "online";
  let durationMinutes = 30;

  if (hour >= 2 && hour < 7) {
    const roll = Math.random();
    if (roll < 0.8) {
      newState = "sleeping";
      durationMinutes = randomRange(60, 180);
    } else if (roll < 0.95) {
      newState = "away";
      durationMinutes = randomRange(15, 45);
    } else {
      newState = "online";
      durationMinutes = randomRange(10, 30);
    }
  } else if (hour >= 23 || hour < 2) {
    const roll = Math.random();
    if (roll < 0.4) {
      newState = "sleeping";
      durationMinutes = randomRange(60, 120);
    } else if (roll < 0.8) {
      newState = "away";
      durationMinutes = randomRange(15, 45);
    } else {
      newState = "online";
      durationMinutes = randomRange(15, 30);
    }
  } else {
    const roll = Math.random();
    if (roll < 0.75) {
      newState = "online";
      durationMinutes = randomRange(20, 45);
    } else if (roll < 0.95) {
      newState = "away";
      durationMinutes = randomRange(10, 30);
    } else {
      newState = "busy";
      durationMinutes = randomRange(10, 20);
    }
  }

  setPresenceState(newState, durationMinutes * 60 * 1000);
}

function setPresenceState(state, durationMs) {
  const oldState = currentPresenceState;
  currentPresenceState = state;
  sessionStorage.setItem("mayaPresenceState", state);
  sessionStorage.setItem("mayaPresenceStateExpires", (Date.now() + durationMs).toString());
  
  if (oldState === "sleeping" && state !== "sleeping") {
    sleepingMessageCount = 0;
  }
  
  setStatus(state);
}

function initializeSettings() {
  const toggle = document.getElementById("realistic-availability-toggle");
  const stored = localStorage.getItem("mayaRealisticAvailability");
  const isEnabled = stored !== "false";
  
  localStorage.setItem("mayaRealisticAvailability", isEnabled ? "true" : "false");
  
  if (toggle) {
    toggle.checked = isEnabled;
    toggle.addEventListener("change", (e) => {
      localStorage.setItem("mayaRealisticAvailability", e.target.checked ? "true" : "false");
      updatePresenceState();
    });
  }

  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const settingsCloseBtn = document.getElementById("settings-close-btn");

  if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
      settingsModal.classList.remove("hidden");
    });
  }

  if (settingsCloseBtn && settingsModal) {
    settingsCloseBtn.addEventListener("click", () => {
      settingsModal.classList.add("hidden");
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add("hidden");
      }
    });
  }
}
