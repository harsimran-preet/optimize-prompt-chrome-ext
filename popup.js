// popup.js
const apiKeyInput = document.getElementById("api-key");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");
const toggleBtn = document.getElementById("toggle-visibility");

// Load saved key
chrome.storage.sync.get("geminiApiKey", ({ geminiApiKey }) => {
  if (geminiApiKey) apiKeyInput.value = geminiApiKey;
});

// Toggle visibility
toggleBtn.addEventListener("click", () => {
  apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

// Save key
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus("Please enter an API key.", true);
    return;
  }
  if (!key.startsWith("AIza")) {
    showStatus("Key should start with 'AIza'. Double-check it.", true);
    return;
  }
  chrome.storage.sync.set({ geminiApiKey: key }, () => {
    showStatus("✓ Saved!");
  });
});

// Enter key to save
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

function showStatus(msg, isError = false) {
  statusMsg.textContent = msg;
  statusMsg.className = "status-msg" + (isError ? " error" : "");
  setTimeout(() => { statusMsg.textContent = ""; statusMsg.className = "status-msg"; }, 3000);
}
