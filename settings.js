// settings.js

const DEFAULTS = {
  geminiApiKey: "",
  outputMode: "popup",       // "popup" | "replace"
  floatingBtn: true,
};

// ── Load settings ──────────────────────────────────────────────────────────

async function loadSettings() {
  const settings = await chrome.storage.sync.get(Object.keys(DEFAULTS));

  // API Key
  const key = settings.geminiApiKey || "";
  document.getElementById("api-key").value = key;

  // Output mode
  const mode = settings.outputMode || DEFAULTS.outputMode;
  document.querySelector(`input[name="output-mode"][value="${mode}"]`).checked = true;

  // Floating button
  const floatOn = settings.floatingBtn !== undefined ? settings.floatingBtn : DEFAULTS.floatingBtn;
  document.getElementById("floating-btn-toggle").checked = floatOn;
}

// ── Save settings ──────────────────────────────────────────────────────────

async function saveSettings() {
  const apiKey = document.getElementById("api-key").value.trim();
  const outputMode = document.querySelector('input[name="output-mode"]:checked')?.value || "popup";
  const floatingBtn = document.getElementById("floating-btn-toggle").checked;

  // Validate API key if provided
  if (apiKey && !apiKey.startsWith("AIza")) {
    showStatus("⚠️ API key should start with 'AIza' — double-check it.", true);
    return;
  }

  await chrome.storage.sync.set({ geminiApiKey: apiKey, outputMode, floatingBtn });
  showStatus("✓ Settings saved");
}

// ── Reset ──────────────────────────────────────────────────────────────────

async function resetSettings() {
  await chrome.storage.sync.set(DEFAULTS);
  await loadSettings();
  showStatus("✓ Reset to defaults");
}

// ── Status message ─────────────────────────────────────────────────────────

function showStatus(msg, isError = false) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.className = "save-status" + (isError ? " error" : "");
  setTimeout(() => { el.textContent = ""; el.className = "save-status"; }, 3000);
}

// ── Toggle API key visibility ──────────────────────────────────────────────

document.getElementById("toggle-visibility").addEventListener("click", () => {
  const input = document.getElementById("api-key");
  input.type = input.type === "password" ? "text" : "password";
});

// ── Open Chrome shortcuts page ─────────────────────────────────────────────

document.getElementById("open-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// ── Sidebar nav smooth scroll + active state ───────────────────────────────

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const sectionId = link.dataset.section;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");
  });
});

// Update active nav on scroll
const sections = document.querySelectorAll(".settings-section");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      document.querySelectorAll(".nav-link").forEach(l => {
        l.classList.toggle("active", l.dataset.section === id);
      });
    }
  });
}, { threshold: 0.3 });

sections.forEach(s => observer.observe(s));

// ── Wire up buttons ────────────────────────────────────────────────────────

document.getElementById("save-btn").addEventListener("click", saveSettings);
document.getElementById("reset-btn").addEventListener("click", resetSettings);

// Save on Enter in API key field
document.getElementById("api-key").addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveSettings();
});

// ── Init ───────────────────────────────────────────────────────────────────

loadSettings();
