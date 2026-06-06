/**
 * Cloud Chat - Client Side Application Logic
 */

// State Management
let conversation = [];
const MAX_MESSAGE_LENGTH = 2000;

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const charCounter = document.getElementById('char-counter');
const clearBtn = document.getElementById('clear-btn');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const closeErrorBtn = document.getElementById('close-error-btn');

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
  // Focus message input on load
  messageInput.focus();
  
  // Setup Event Listeners
  chatForm.addEventListener('submit', handleFormSubmit);
  messageInput.addEventListener('keydown', handleKeyDown);
  messageInput.addEventListener('input', handleInput);
  clearBtn.addEventListener('click', handleClearChat);
  closeErrorBtn.addEventListener('click', hideError);
  
  // Initial count update
  updateCharCount();
});

/**
 * Handle input changes in textarea (character count & autogrow)
 */
function handleInput() {
  updateCharCount();
  autoGrowTextarea();
}

/**
 * Update the character counter styling and text
 */
function updateCharCount() {
  const currentLength = messageInput.value.length;
  charCounter.textContent = `${currentLength} / ${MAX_MESSAGE_LENGTH}`;
  
  // Styling indicators
  if (currentLength >= MAX_MESSAGE_LENGTH) {
    charCounter.className = 'char-counter limit';
  } else if (currentLength > MAX_MESSAGE_LENGTH * 0.9) {
    charCounter.className = 'char-counter warning';
  } else {
    charCounter.className = 'char-counter';
  }
}

/**
 * Auto-grow textarea height as content expands
 */
function autoGrowTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${messageInput.scrollHeight}px`;
}

/**
 * Handle keyboard events on textarea (Enter to send, Shift+Enter for newline)
 */
function handleKeyDown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit(); // Triggers the submit event and respects validation
  }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const rawMessage = messageInput.value.trim();
  
  // Prevent sending empty messages
  if (!rawMessage) return;
  
  // Prevent sending messages exceeding limit
  if (rawMessage.length > MAX_MESSAGE_LENGTH) {
    showError(`Message exceeds the maximum limit of ${MAX_MESSAGE_LENGTH} characters.`);
    return;
  }
  
  // Hide any active error from previous attempts
  hideError();
  
  // 1. Add user message to UI and local state
  appendMessage('user', rawMessage);
  conversation.push({ role: 'user', content: rawMessage });
  
  // Clear input fields and reset height
  messageInput.value = '';
  messageInput.style.height = 'auto';
  updateCharCount();
  
  // Disable fields during API call
  setFormDisabled(true);
  
  // 2. Add thinking state loading bubble
  const thinkingId = appendThinkingState();
  scrollToBottom();
  
  try {
    // 3. Call serverless backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: rawMessage }),
    });
    
    // Parse backend response
    const data = await response.json();
    
    // Remove thinking state bubble
    removeThinkingState(thinkingId);
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    const reply = data.reply;
    
    // 4. Add assistant response to UI and local state
    appendMessage('assistant', reply);
    conversation.push({ role: 'assistant', content: reply });
    
  } catch (error) {
    console.error('Failed to communicate with chat API:', error);
    removeThinkingState(thinkingId);
    showError(error.message || 'An error occurred while connecting to the AI assistant. Please try again.');
  } finally {
    // Re-enable fields
    setFormDisabled(false);
    messageInput.focus();
    scrollToBottom();
  }
}

/**
 * Enable/Disable form inputs
 */
function setFormDisabled(disabled) {
  messageInput.disabled = disabled;
  sendBtn.disabled = disabled;
}

/**
 * Render message and append to the message log
 */
function appendMessage(role, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}-message`;
  
  // Avatar setup
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  
  if (role === 'assistant') {
    avatarDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
  } else {
    avatarDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  
  // Content setup with basic markdown parsing (code formatting & HTML escaping)
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = formatMessageContent(text);
  
  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(messageDiv);
  scrollToBottom();
}

/**
 * Escape HTML and parse basic Markdown tags like code blocks and inline code
 */
function formatMessageContent(text) {
  // First escape HTML to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    
  // Format code blocks: ```code```
  escaped = escaped.replace(/```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g, (match, codeBlock) => {
    return `<pre><code>${codeBlock}</code></pre>`;
  });
  
  // Format inline code: `code`
  escaped = escaped.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  return escaped;
}

/**
 * Append a temporary thinking bubble returning its unique ID
 */
function appendThinkingState() {
  const uniqueId = `thinking-${Date.now()}`;
  
  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'message assistant-message';
  thinkingDiv.id = uniqueId;
  
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'avatar';
  avatarDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content thinking-bubble';
  contentDiv.innerHTML = `
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  `;
  
  thinkingDiv.appendChild(avatarDiv);
  thinkingDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(thinkingDiv);
  return uniqueId;
}

/**
 * Remove thinking state bubble by ID
 */
function removeThinkingState(id) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

/**
 * Scroll chat container to latest message
 */
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Error banner management
 */
function showError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove('hidden');
  scrollToBottom();
}

function hideError() {
  errorContainer.classList.add('hidden');
}

/**
 * Clear chat history and UI resets
 */
function handleClearChat() {
  if (confirm('Are you sure you want to clear the conversation?')) {
    conversation = [];
    
    // Clear chat area except for default system message
    chatMessages.innerHTML = `
      <div class="message assistant-message">
        <div class="avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
        </div>
        <div class="message-content">
          <p>Hello! I am your AI assistant. How can I help you today?</p>
        </div>
      </div>
    `;
    
    hideError();
    messageInput.value = '';
    messageInput.style.height = 'auto';
    updateCharCount();
    messageInput.focus();
  }
}
