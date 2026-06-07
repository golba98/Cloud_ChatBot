const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
let isWelcomeConfirmed = false;

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
let standbyMessageCount = 0;
const STANDBY_RESPONSES = [
  "System is currently in standby mode. I'll respond fully when I'm back online!",
  "Low-power standby is active. Talk to you soon!",
  "Currently in standby mode. Let's chat more later!",
  "System is in scheduled standby. I'll get back to you shortly."
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
const welcomeGate = document.getElementById("welcome-gate");
const welcomeGateStart = document.getElementById("welcome-gate-start");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const appShell = document.querySelector(".app-shell");
const moreOptionsBtn = document.getElementById("more-options-btn");
const moreOptionsDropdown = document.getElementById("more-options-dropdown");
const dropdownSettingsBtn = document.getElementById("dropdown-settings-btn");
const dropdownClearBtn = document.getElementById("dropdown-clear-btn");

document.addEventListener("DOMContentLoaded", () => {
  chatForm.addEventListener("submit", handleSubmit);
  messageInput.addEventListener("keydown", handleKeyDown);
  messageInput.addEventListener("input", handleInput);
  if (clearBtn) {
    clearBtn.addEventListener("click", () => resetChat());
  }
  closeErrorBtn.addEventListener("click", hideError);
  
  if (welcomeGateStart) {
    welcomeGateStart.addEventListener("click", confirmWelcomeGate);
  }

  // Handle welcome suggestion buttons
  const suggestionBtns = document.querySelectorAll(".suggestion-btn");
  suggestionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-text");
      if (text && messageInput) {
        messageInput.value = text;
        resizeInput();
      }
      confirmWelcomeGate();
    });
  });

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", toggleSidebar);
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      setSidebarCollapsed(true);
    });
  }

  // Options dropdown menu listeners
  if (moreOptionsBtn && moreOptionsDropdown) {
    moreOptionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      moreOptionsDropdown.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (e) => {
    if (moreOptionsDropdown && !moreOptionsDropdown.classList.contains("hidden")) {
      if (!moreOptionsDropdown.contains(e.target) && e.target !== moreOptionsBtn) {
        moreOptionsDropdown.classList.add("hidden");
      }
    }
  });

  if (dropdownSettingsBtn) {
    dropdownSettingsBtn.addEventListener("click", () => {
      const settingsModal = document.getElementById("settings-modal");
      if (settingsModal) {
        settingsModal.classList.remove("hidden");
      }
      if (moreOptionsDropdown) {
        moreOptionsDropdown.classList.add("hidden");
      }
    });
  }

  if (dropdownClearBtn) {
    dropdownClearBtn.addEventListener("click", () => {
      resetChat();
      if (moreOptionsDropdown) {
        moreOptionsDropdown.classList.add("hidden");
      }
    });
  }

  if (messageInput) {
    messageInput.addEventListener("focus", () => {
      setTimeout(scrollToLatest, 150);
      setTimeout(scrollToLatest, 300);
    });
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scrollToLatest);
    window.visualViewport.addEventListener("scroll", scrollToLatest);
  }
  
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

  // Periodically update presence state (every 30 seconds)
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
    } else if (status === "standby") {
      contactStatusEl.textContent = "standby";
    }
  }
  
  statusDots.forEach((dot) => {
    dot.className = "status-dot";
    if (status === "away") {
      dot.classList.add("away");
    } else if (status === "busy") {
      dot.classList.add("busy");
    } else if (status === "standby") {
      dot.classList.add("standby");
    }
  });

  updateComposerPlaceholder(status);
}

function updateComposerPlaceholder(status) {
  if (!messageInput) return;
  const isRealistic = localStorage.getItem("skyRealisticAvailability") !== "false";
  const wrap = document.querySelector(".message-input-wrap");
  
  if (!isRealistic || status === "online" || status === "typing...") {
    messageInput.placeholder = "Message Sky...";
    if (wrap) wrap.classList.remove("unavailable");
  } else if (status === "away") {
    messageInput.placeholder = "Sky is away right now...";
    if (wrap) wrap.classList.add("unavailable");
  } else if (status === "busy") {
    messageInput.placeholder = "Sky might reply later...";
    if (wrap) wrap.classList.add("unavailable");
  } else if (status === "standby") {
    messageInput.placeholder = "Sky is in standby...";
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
  
  const isRealistic = localStorage.getItem("skyRealisticAvailability") !== "false";
  const timeoutMs = isRealistic ? 300000 : 60000;
  
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
  // Do not split responses to preserve code blocks and structured formatting
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

  if (!isWelcomeConfirmed) {
    showWelcomeGate();
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

  const isRealistic = localStorage.getItem("skyRealisticAvailability") !== "false";
  let targetStateBeforeReply = currentPresenceState;
  let isReturning = false;
  let wasSleeping = false;

  hideError();
  appendMessage("sent", message);
  clearComposer();
  setWaiting(true);

  // If Sky is in standby, process standby behaviors
  if (isRealistic && targetStateBeforeReply === "standby") {
    standbyMessageCount++;
    if (standbyMessageCount >= 3) {
      setPresenceState("online", 25 * 60 * 1000);
      isReturning = true;
      wasSleeping = true;
      targetStateBeforeReply = "online";
    } else {
      const roll = Math.random();
      if (roll < 0.6) {
        const ignoreDelay = randomRange(5000, 8000);
        setStatus("standby");
        
        setTimeout(() => {
          setWaiting(false);
          setStatus("standby");
          resetInactivityTimer();
          messageInput.focus();
        }, ignoreDelay);
        return;
      } else {
        const standbyReply = STANDBY_RESPONSES[Math.floor(Math.random() * STANDBY_RESPONSES.length)];
        const delay = randomRange(10000, 18000);
        setStatus("standby");
        
        setTimeout(async () => {
          setStatus("typing...");
          removeAllTypingIndicators();
          activeTypingIndicator = appendTypingIndicator();
          scrollToLatest();
          
          setTimeout(() => {
            removeAllTypingIndicators();
            appendMessage("received", standbyReply);
            setWaiting(false);
            setStatus("standby");
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
        tone: localStorage.getItem("skyChatTone") || "chill",
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
      if (data.consoleError) {
        console.error(data.consoleError);
      }
      throw new Error(data.error || "Message could not be sent.");
    }

    const reply = data.reply || "Hmm, I missed that. Try sending it again.";
    const parts = splitResponse(reply);

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

    removeAllTypingIndicators();
    appendMessage("received", parts[0]);

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
    showError(error.message || "Message could not be sent. Please try again.");
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
  appendEmptyState();

  clearComposer();
  setWaiting(false);
  
  updatePresenceState();
  resetInactivityTimer();
  
  scrollToLatest();
}

function confirmWelcomeGate() {
  isWelcomeConfirmed = true;
  hideWelcomeGate();
  messageInput.focus();
}

function hideWelcomeGate() {
  if (welcomeGate) welcomeGate.classList.add("hidden");
}

function showWelcomeGate() {
  if (welcomeGate) welcomeGate.classList.remove("hidden");
}

function appendPrivacyNote() {
  const note = document.createElement("div");
  note.className = "chat-privacy-note";
  note.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" class="lock-icon-small">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
    <span>Conversations are saved locally on your device.</span>
  `;
  chatMessages.appendChild(note);
}

function appendDateSeparator(label) {
  const separator = document.createElement("div");
  separator.className = "date-separator";
  separator.textContent = label;
  chatMessages.appendChild(separator);
}

function appendEmptyState() {
  if (document.getElementById("chat-empty-state")) return;
  
  const emptyState = document.createElement("div");
  emptyState.id = "chat-empty-state";
  emptyState.className = "chat-empty-state";
  emptyState.innerHTML = `
    <div class="empty-state-brand">
      <img src="assets/logo.svg" alt="ChatBot in the Sky Logo" class="empty-state-logo" />
      <span class="empty-state-title">ChatBot in the Sky</span>
    </div>
    <p class="empty-state-subtitle">Your friendly AI helper. Send a message below to start talking.</p>
  `;
  chatMessages.appendChild(emptyState);
}

function hideEmptyState() {
  const emptyState = document.getElementById("chat-empty-state");
  if (emptyState) {
    emptyState.remove();
  }
}

function appendMessage(role, text) {
  hideEmptyState();
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
  bubble.setAttribute("aria-label", "Sky is composing a reply");

  const label = document.createElement("span");
  label.className = "typing-label";
  label.textContent = "Sky is typing";

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

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
      if (key.startsWith("maya")) {
        localStorage.removeItem(key);
        console.debug(`Cleared old storage key: ${key}`);
      }
    });

    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.startsWith("maya")) {
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
  const stored = localStorage.getItem("skySidebarCollapsed");
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
    localStorage.setItem("skySidebarCollapsed", "true");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-label", "Show sidebar");
      sidebarToggle.setAttribute("aria-expanded", "false");
    }
  } else {
    appShell.classList.remove("sidebar-collapsed");
    localStorage.setItem("skySidebarCollapsed", "false");
    if (sidebarToggle) {
      sidebarToggle.setAttribute("aria-label", "Hide sidebar");
      sidebarToggle.setAttribute("aria-expanded", "true");
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateReplyDelay(userMessage, state, isRealistic) {
  let baseDelay = randomRange(1000, 3000);
  const len = userMessage.length;
  if (len < 15) {
    baseDelay = randomRange(600, 1200);
  } else if (len > 120) {
    baseDelay = randomRange(2500, 4500);
  }

  if (!isRealistic) {
    return baseDelay;
  }

  if (state === "away") {
    if (Math.random() < 0.3) {
      return randomRange(6000, 15000);
    }
  } else if (state === "busy") {
    if (Math.random() < 0.5) {
      return randomRange(8000, 18000);
    }
  } else if (state === "standby") {
    return randomRange(10000, 22000);
  }

  return baseDelay;
}

function updatePresenceState() {
  const isRealistic = localStorage.getItem("skyRealisticAvailability") !== "false";
  if (!isRealistic) {
    currentPresenceState = "online";
    sessionStorage.removeItem("skyPresenceState");
    sessionStorage.removeItem("skyPresenceStateExpires");
    setStatus("online");
    return;
  }

  const now = Date.now();
  const savedState = sessionStorage.getItem("skyPresenceState");
  const savedExpires = sessionStorage.getItem("skyPresenceStateExpires");

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
      newState = "standby";
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
      newState = "standby";
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
  sessionStorage.setItem("skyPresenceState", state);
  sessionStorage.setItem("skyPresenceStateExpires", (Date.now() + durationMs).toString());
  
  if (oldState === "standby" && state !== "standby") {
    standbyMessageCount = 0;
  }
  
  setStatus(state);
}

function initializeSettings() {
  const toggle = document.getElementById("realistic-availability-toggle");
  const stored = localStorage.getItem("skyRealisticAvailability");
  const isEnabled = stored !== "false";
  
  localStorage.setItem("skyRealisticAvailability", isEnabled ? "true" : "false");
  
  if (toggle) {
    toggle.checked = isEnabled;
    toggle.addEventListener("change", (e) => {
      localStorage.setItem("skyRealisticAvailability", e.target.checked ? "true" : "false");
      updatePresenceState();
    });
  }

  // Bind radio button selections for chat-tone
  const toneRadios = document.querySelectorAll('input[name="chat-tone"]');
  const storedTone = localStorage.getItem("skyChatTone") || "chill";
  toneRadios.forEach((radio) => {
    if (radio.value === storedTone) {
      radio.checked = true;
    }
    radio.addEventListener("change", (e) => {
      if (e.target.checked) {
        localStorage.setItem("skyChatTone", e.target.value);
      }
    });
  });

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
