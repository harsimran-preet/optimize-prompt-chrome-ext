// content.js - Injected into Claude, ChatGPT, Gemini pages

(function () {
  let floatingBtn = null;
  let activeTextarea = null;
  let isModalOpen = false;

  // ─── Platform Detection ───────────────────────────────────────────────────

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes("claude.ai")) return "claude.ai";
    if (host.includes("chatgpt.com")) return "chatgpt.com";
    if (host.includes("gemini.google.com")) return "gemini.google.com";
    return "unknown";
  }

  // ─── Input Field Selectors per Platform ──────────────────────────────────

  function getInputSelectors() {
    const platform = detectPlatform();
    const selectors = {
      "claude.ai": [
        'div[contenteditable="true"]',
        'div.ProseMirror',
      ],
      "chatgpt.com": [
        'div[contenteditable="true"]',
        '#prompt-textarea',
        'textarea',
      ],
      "gemini.google.com": [
        'div[contenteditable="true"]',
        'rich-textarea div[contenteditable="true"]',
        'textarea',
      ]
    };
    return selectors[platform] || ['div[contenteditable="true"]', 'textarea'];
  }

  // ─── Get Text from Active Element ────────────────────────────────────────

  function getTextFromElement(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      return el.value.trim();
    }
    return (el.innerText || el.textContent || "").trim();
  }

  function setTextToElement(el, text) {
    if (!el) return;

    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, "value"
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
      )?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      // contenteditable
      el.focus();
      // Select all and replace
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("insertText", false, text);

      // Fallback if execCommand doesn't work
      if ((el.innerText || "").trim() !== text.trim()) {
        el.innerText = text;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
      }
    }
  }

  // ─── Floating Button ─────────────────────────────────────────────────────

  function createFloatingButton() {
    if (floatingBtn) return;

    floatingBtn = document.createElement("button");
    floatingBtn.id = "op-float-btn";
    floatingBtn.innerHTML = `<span>✨</span>`;
    floatingBtn.title = "Optimize Prompt (Ctrl+Shift+O)";
    floatingBtn.setAttribute("aria-label", "Optimize Prompt");

    floatingBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      triggerOptimize();
    });

    document.body.appendChild(floatingBtn);
  }

  function positionFloatingButton(el) {
    if (!floatingBtn || !el) return;

    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    const top = rect.bottom + scrollTop - 44;
    const left = rect.right + scrollLeft - 52;

    floatingBtn.style.top = `${Math.max(8, top)}px`;
    floatingBtn.style.left = `${Math.max(8, left)}px`;
    floatingBtn.style.display = "flex";
  }

  function hideFloatingButton() {
    if (floatingBtn) floatingBtn.style.display = "none";
  }

  // ─── Focus tracking ───────────────────────────────────────────────────────

  function setupFocusTracking() {
    const selectors = getInputSelectors();

    document.addEventListener("focusin", (e) => {
      const el = e.target;
      const isInputEl = selectors.some(sel => el.matches?.(sel));
      if (isInputEl) {
        activeTextarea = el;
        // Only show floating button if enabled in settings
        chrome.storage.sync.get("floatingBtn").then(({ floatingBtn }) => {
          if (floatingBtn !== false) {
            createFloatingButton();
            positionFloatingButton(el);
          }
        });
      }
    });

    document.addEventListener("focusout", (e) => {
      // Small delay so button click doesn't hide before being registered
      setTimeout(() => {
        if (!isModalOpen) hideFloatingButton();
      }, 200);
    });

    // Reposition on scroll/resize
    window.addEventListener("scroll", () => {
      if (activeTextarea) positionFloatingButton(activeTextarea);
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (activeTextarea) positionFloatingButton(activeTextarea);
    }, { passive: true });
  }

  // ─── Main Optimize Flow ───────────────────────────────────────────────────

  async function triggerOptimize() {
    if (isModalOpen) return;

    // Find active input
    const el = activeTextarea || findActiveInput();
    if (!el) {
      showModal({ error: "Could not find an active prompt field. Click inside the prompt box first." });
      return;
    }

    const originalText = getTextFromElement(el);
    if (!originalText) {
      showModal({ error: "Your prompt is empty. Type something first, then optimize." });
      return;
    }

    // Get settings
    const { geminiApiKey, outputMode, floatingBtn } = await chrome.storage.sync.get(["geminiApiKey", "outputMode", "floatingBtn"]);
    if (!geminiApiKey) {
      showModal({ error: "No API key found. Click the ✨ extension icon in your toolbar to add your Gemini API key." });
      return;
    }

    const platform = detectPlatform();
    const mode = outputMode || "popup";

    if (mode === "replace") {
      // Direct replace — call API and swap immediately, show error modal only on failure
      showModal({ loading: true, original: originalText, element: el, platform, directReplace: true });
    } else {
      // Show loading modal with review popup
      showModal({ loading: true, original: originalText, element: el, platform });
    }
  }

  function findActiveInput() {
    const selectors = getInputSelectors();
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ─── Modal ────────────────────────────────────────────────────────────────

  function showModal({ loading = false, original = "", error = null, element = null, platform = "", directReplace = false }) {
    isModalOpen = true;
    hideFloatingButton();
    removeModal();

    const overlay = document.createElement("div");
    overlay.id = "op-modal-overlay";

    const modal = document.createElement("div");
    modal.id = "op-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Optimize Prompt");

    if (error) {
      modal.innerHTML = `
        <div class="op-modal-header">
          <span class="op-logo">✨ Optimize Prompt</span>
          <button class="op-close-btn" aria-label="Close">✕</button>
        </div>
        <div class="op-error-box">
          <span class="op-error-icon">⚠️</span>
          <p>${error}</p>
        </div>
        <div class="op-modal-footer">
          <button class="op-btn op-btn-secondary op-cancel">Close</button>
        </div>
      `;
    } else if (loading) {
      modal.innerHTML = `
        <div class="op-modal-header">
          <span class="op-logo">✨ Optimize Prompt</span>
          <button class="op-close-btn" aria-label="Close">✕</button>
        </div>
        <div class="op-sections">
          <div class="op-section">
            <label class="op-label">Original Prompt</label>
            <div class="op-original-text">${escapeHtml(original)}</div>
          </div>
          <div class="op-section">
            <label class="op-label">Optimized Prompt</label>
            <div class="op-loading">
              <div class="op-spinner"></div>
              <span>Optimizing with Gemini 2.5 Flash…</span>
            </div>
            <textarea class="op-optimized-textarea" placeholder="Optimized prompt will appear here…" style="display:none"></textarea>
          </div>
        </div>
        <div class="op-error-box" style="display:none"></div>
        <div class="op-modal-footer">
          <button class="op-btn op-btn-secondary op-cancel">Cancel</button>
          <button class="op-btn op-btn-primary op-use-btn" disabled>Use This ↵</button>
        </div>
      `;
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close handlers
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    modal.querySelector(".op-close-btn")?.addEventListener("click", closeModal);
    modal.querySelector(".op-cancel")?.addEventListener("click", closeModal);

    // Keyboard close
    document.addEventListener("keydown", handleKeydown);

    // If loading, fire the API call
    if (loading) {
      const { geminiApiKey } = {};
      chrome.storage.sync.get("geminiApiKey").then(({ geminiApiKey }) => {
        chrome.runtime.sendMessage(
          { action: "callGeminiAPI", payload: { apiKey: geminiApiKey, prompt: original, platform } },
          (response) => {
            const currentModal = document.getElementById("op-modal");
            if (!currentModal) return; // Modal was closed

            const loadingEl = currentModal.querySelector(".op-loading");
            const textareaEl = currentModal.querySelector(".op-optimized-textarea");
            const useBtn = currentModal.querySelector(".op-use-btn");
            const errorBox = currentModal.querySelector(".op-error-box");

            if (response?.success) {
              if (directReplace) {
                // Skip popup — apply immediately and close
                if (element && response.data) {
                  setTextToElement(element, response.data.trim());
                }
                closeModal();
                return;
              }

              loadingEl.style.display = "none";
              textareaEl.style.display = "block";
              textareaEl.value = response.data;
              useBtn.removeAttribute("disabled");

              useBtn.addEventListener("click", () => {
                const finalText = textareaEl.value.trim();
                if (element && finalText) {
                  setTextToElement(element, finalText);
                }
                closeModal();
              });

              // Enter key to confirm
              textareaEl.focus();
            } else {
              loadingEl.style.display = "none";
              textareaEl.style.display = "none";
              errorBox.style.display = "flex";
              errorBox.innerHTML = `<span class="op-error-icon">⚠️</span><p>${escapeHtml(response?.error || "Unknown error occurred.")}</p>`;
            }
          }
        );
      });
    }
  }

  function closeModal() {
    isModalOpen = false;
    removeModal();
    document.removeEventListener("keydown", handleKeydown);
    if (activeTextarea) {
      positionFloatingButton(activeTextarea);
      floatingBtn && (floatingBtn.style.display = "flex");
    }
  }

  function removeModal() {
    document.getElementById("op-modal-overlay")?.remove();
  }

  function handleKeydown(e) {
    if (e.key === "Escape") closeModal();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ─── Listen for keyboard shortcut from background ─────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "triggerOptimize") {
      triggerOptimize();
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────

  setupFocusTracking();
})();
