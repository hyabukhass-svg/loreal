const WORKER_URL =
  "https://loreal-chatbot-worker.hudayasin2842.workers.dev/";

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const latestQuestion = document.getElementById("latestQuestion");
const statusMessage = document.getElementById("statusMessage");

const conversationHistory = [
  {
    role: "system",
    content: `
You are a friendly and professional L'Oréal Beauty Advisor.

You help users with:
- L'Oréal makeup products
- L'Oréal skincare products
- L'Oréal haircare products
- L'Oréal fragrances
- Personalized beauty routines
- Product recommendations
- General beauty questions

Rules:
- Only answer questions related to L'Oréal products, beauty, skincare,
  haircare, makeup, fragrances, and beauty routines.
- Politely refuse unrelated questions.
- Ask follow-up questions when you need more information.
- Remember details the user shares, such as their name, skin type,
  hair type, concerns, preferences, and previous questions.
- Do not diagnose medical conditions.
- For serious irritation, allergic reactions, or health concerns,
  recommend speaking with a qualified healthcare professional.
- Do not invent L'Oréal products or product details.
- Keep answers clear, friendly, helpful, and reasonably short.
    `.trim(),
  },
];

chatForm.addEventListener("submit", async (event) => {
  // Prevent the page from refreshing.
  event.preventDefault();

  // Get the user's question and remove extra spaces.
  const question = userInput.value.trim();

  // Stop if the input is empty.
  if (question === "") {
    return;
  }

  // Check whether the class Worker URL was added.
  if (WORKER_URL.includes("your-subdomain") || WORKER_URL === "") {
    showStatus(
      "Please replace the example Worker URL in script.js with the URL from your README.",
    );
    return;
  }

  // Remove any old error message.
  clearStatus();

  // Update the latest-question section.
  latestQuestion.textContent = question;

  // Display the user's message in the chat.
  addMessage("user", question);

  // Save the user's message in conversation history.
  conversationHistory.push({
    role: "user",
    content: question,
  });

  // Clear the input.
  userInput.value = "";

  // Disable the form while waiting for the AI.
  setLoading(true);

  // Show animated typing dots.
  const typingIndicator = addTypingIndicator();

  try {
    // Send the conversation to the class Cloudflare Worker.
    const response = await fetch(WORKER_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "gpt-4.1",
        messages: conversationHistory,
      }),
    });

    // Convert the response into JavaScript data.
    const data = await response.json();

    // Check whether the Worker returned an error.
    if (!response.ok) {
      const errorMessage =
        data.error?.message ||
        data.error ||
        "The chatbot request was unsuccessful.";

      throw new Error(errorMessage);
    }

    // Read the chatbot's answer.
    const reply = data.choices?.[0]?.message?.content?.trim();

    // Make sure an answer was returned.
    if (!reply) {
      throw new Error("The chatbot returned an empty response.");
    }

    // Remove the typing animation.
    typingIndicator.remove();

    // Display the chatbot's response.
    addMessage("assistant", reply);

    // Save the chatbot response in conversation history.
    conversationHistory.push({
      role: "assistant",
      content: reply,
    });

    // Keep the conversation from becoming too large.
    trimConversationHistory();
  } catch (error) {
    console.error("Chatbot error:", error);

    // Remove the typing animation if it still exists.
    if (typingIndicator.parentNode) {
      typingIndicator.remove();
    }

    // Display a friendly error message.
    addMessage(
      "assistant",
      "I’m sorry, but I couldn’t connect to the beauty assistant. Please check the class Worker URL and try again.",
    );

    showStatus(error.message);

    // Remove the failed user message from the stored API history.
    if (conversationHistory[conversationHistory.length - 1]?.role === "user") {
      conversationHistory.pop();
    }
  } finally {
    // Re-enable the form.
    setLoading(false);

    // Return the cursor to the input.
    userInput.focus();
  }
});

// Create and display a user or assistant message bubble.
function addMessage(role, text) {
  const messageRow = document.createElement("div");
  const avatar = document.createElement("div");
  const messageBubble = document.createElement("div");
  const messageText = document.createElement("p");

  const isUser = role === "user";

  // Add the correct row classes.
  messageRow.className = isUser
    ? "message-row user-row"
    : "message-row assistant-row";

  // Add the correct avatar classes.
  avatar.className = isUser ? "avatar user-avatar" : "avatar assistant-avatar";

  avatar.textContent = isUser ? "You" : "L";
  avatar.setAttribute("aria-hidden", "true");

  // Add the correct message bubble classes.
  messageBubble.className = isUser
    ? "message user-message"
    : "message assistant-message";

  // Use textContent for safety.
  messageText.textContent = text;

  messageBubble.appendChild(messageText);

  // Put the user avatar on the right.
  if (isUser) {
    messageRow.appendChild(messageBubble);
    messageRow.appendChild(avatar);
  } else {
    // Put the assistant avatar on the left.
    messageRow.appendChild(avatar);
    messageRow.appendChild(messageBubble);
  }

  chatWindow.appendChild(messageRow);

  scrollToBottom();
}

// Create the assistant typing animation.
function addTypingIndicator() {
  const messageRow = document.createElement("div");
  const avatar = document.createElement("div");
  const typingBubble = document.createElement("div");

  messageRow.className = "message-row assistant-row";

  avatar.className = "avatar assistant-avatar";
  avatar.textContent = "L";
  avatar.setAttribute("aria-hidden", "true");

  typingBubble.className = "message assistant-message typing-message";

  typingBubble.setAttribute("aria-label", "The beauty advisor is typing");

  // Create three animated dots.
  for (let i = 0; i < 3; i += 1) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    typingBubble.appendChild(dot);
  }

  messageRow.appendChild(avatar);
  messageRow.appendChild(typingBubble);

  chatWindow.appendChild(messageRow);

  scrollToBottom();

  return messageRow;
}

// Disable or enable the input and send button.
function setLoading(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;

  if (isLoading) {
    sendBtn.setAttribute("aria-label", "Sending message");
  } else {
    sendBtn.setAttribute("aria-label", "Send message");
  }
}

// Display an error or status message.
function showStatus(message) {
  statusMessage.textContent = message;
}

// Clear the status message.
function clearStatus() {
  statusMessage.textContent = "";
}

// Keep the system prompt and the most recent messages.
function trimConversationHistory() {
  const systemMessage = conversationHistory[0];

  // Keep the 16 most recent user and assistant messages.
  const recentMessages = conversationHistory.slice(-16);

  conversationHistory.length = 0;

  conversationHistory.push(systemMessage, ...recentMessages);
}

// Scroll the chat window to the newest message.
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Place the cursor in the input when the page loads.
userInput.focus();
