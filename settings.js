// settings.js

const DEFAULTS = {
  geminiApiKey: "",
  outputMode: "popup",       // "popup" | "replace"
  floatingBtn: true,
  platAny: false,
  platClaude: true,
  platChatgpt: true,
  platGemini: true
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

  // Platforms
  document.getElementById("plat-any-toggle").checked = settings.platAny !== undefined ? settings.platAny : DEFAULTS.platAny;
  document.getElementById("plat-claude-toggle").checked = settings.platClaude !== undefined ? settings.platClaude : DEFAULTS.platClaude;
  document.getElementById("plat-chatgpt-toggle").checked = settings.platChatgpt !== undefined ? settings.platChatgpt : DEFAULTS.platChatgpt;
  document.getElementById("plat-gemini-toggle").checked = settings.platGemini !== undefined ? settings.platGemini : DEFAULTS.platGemini;
}

// ── Save settings ──────────────────────────────────────────────────────────

async function saveSettings() {
  const apiKey = document.getElementById("api-key").value.trim();
  const outputMode = document.querySelector('input[name="output-mode"]:checked')?.value || "popup";
  const floatingBtn = document.getElementById("floating-btn-toggle").checked;
  const platAny = document.getElementById("plat-any-toggle").checked;
  const platClaude = document.getElementById("plat-claude-toggle").checked;
  const platChatgpt = document.getElementById("plat-chatgpt-toggle").checked;
  const platGemini = document.getElementById("plat-gemini-toggle").checked;

  // Validate API key if provided
  if (apiKey && !apiKey.startsWith("AIza")) {
    showStatus("⚠️ API key should start with 'AIza' — double-check it.", true);
    return;
  }

  await chrome.storage.sync.set({ 
    geminiApiKey: apiKey, 
    outputMode, 
    floatingBtn,
    platAny, platClaude, platChatgpt, platGemini
  });
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

// ── Dynamic shortcut display ──────────────────────────────────────────────

const KEY_LABELS = {
  "⇧": "Shift", "⌘": "Cmd", "⌥": "Alt", "⌃": "Ctrl",
  "MacCtrl": "Ctrl", "Command": "Cmd", "Ctrl": "Ctrl",
  "Shift": "Shift", "Alt": "Alt",
};

function parseShortcut(shortcut) {
  if (!shortcut) return [];
  // Chrome on Mac returns symbol strings like "⇧⌘O"; on Windows/Linux "Ctrl+Shift+O"
  if (shortcut.includes("+")) {
    return shortcut.split("+");
  }
  // Split symbol string: each known symbol is a key, remaining chars are individual keys
  const keys = [];
  let rest = shortcut;
  for (const sym of Object.keys(KEY_LABELS)) {
    if (rest.includes(sym)) {
      keys.push(sym);
      rest = rest.replace(sym, "");
    }
  }
  // Remaining characters are the final key(s)
  for (const ch of rest) {
    if (ch.trim()) keys.push(ch.toUpperCase());
  }
  return keys;
}

function shortcutToKbds(shortcut) {
  const keys = parseShortcut(shortcut);
  if (!keys.length) return '<span class="shortcut-not-set">Not set</span>';
  return keys
    .map(k => `<kbd>${KEY_LABELS[k] || k}</kbd>`)
    .join('<span class="key-sep">+</span>');
}

function shortcutToText(shortcut) {
  const keys = parseShortcut(shortcut);
  if (!keys.length) return "Not set";
  return keys.map(k => KEY_LABELS[k] || k).join("+");
}

async function loadShortcuts() {
  const commands = await chrome.commands.getAll();
  const map = {};
  for (const cmd of commands) {
    map[cmd.name] = cmd.shortcut || "";
  }

  const optimizeShortcut = map["optimize-prompt"] || "";
  const formalizeShortcut = map["formalize-message"] || "";

  // Shortcut section
  document.getElementById("shortcut-keys").innerHTML = shortcutToKbds(optimizeShortcut);
  document.getElementById("formalize-shortcut-keys").innerHTML = shortcutToKbds(formalizeShortcut);

  // How to Use section
  document.getElementById("howto-optimize-keys").innerHTML = shortcutToKbds(optimizeShortcut);
  document.getElementById("howto-formalize-keys").innerHTML = shortcutToKbds(formalizeShortcut);
}

// ── Init ───────────────────────────────────────────────────────────────────

loadSettings();
loadShortcuts();
