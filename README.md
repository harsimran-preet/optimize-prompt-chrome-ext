# ✨ Optimize Prompt — Chrome Extension

**Instantly optimize your prompts on Claude, ChatGPT, and Gemini using the power of Gemini 2.5 Flash.**

Have you ever written a prompt that felt vague, incomplete, or rambling? Instead of spending minutes tweaking it manually, **Optimize Prompt** acts as your personal prompt engineer right inside your favorite AI chat interfaces. With a single click or keyboard shortcut, it rewrites your prompt for maximum clarity, structure, and effectiveness before you hit send.

## 🌟 Features

- **Seamless Integration**: Works on **ANY website**, natively integrating into text areas where you type your prompts.
- **One-Click Optimization**: A subtle floating ✨ button sits in your text box on Claude, ChatGPT, and Gemini. Click it, and watch your prompt transform.
- **Lightning Fast**: Powered by Google's latest **Gemini 2.5 Flash** model, the optimization happens almost instantly.
- **Universal Keyboard Shortcut**: Use it anywhere! Just press `Ctrl+Shift+O` (`Cmd+Shift+O` on Mac) inside any input field on any website.
- **Interactive Review**: Review, accept, copy, or regenerate the optimized prompt in a beautiful, unobtrusive modal before it replaces your original text.
- **Privacy-First**: Your Gemini API key is stored securely in your browser's local storage and is never sent anywhere else.

---

## 🚀 Installation (Unpacked)

Since this extension is not yet published on the Chrome Web Store, you can easily load it locally as an "unpacked extension".

1. **Clone or Download** this repository to your local machine:
   ```bash
   git clone https://github.com/harsimran-preet/optimize-prompt-chrome-ext.git
   ```
2. Open Google Chrome (or any Chromium-based browser like Brave or Edge).
3. Type `chrome://extensions/` in your address bar and press Enter.
4. Enable **"Developer mode"** using the toggle switch in the top right corner.
5. Click the **"Load unpacked"** button in the top left.
6. Select the folder containing this project (`optimize-prompt-chrome-ext`).
7. The extension should now appear in your list of extensions! 🎉

---

## ⚙️ Configuration & Setup

Before you can optimize your first prompt, you need to provide a Google Gemini API Key.

### 1. Get a Free Gemini API Key
- Go to Google AI Studio: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Sign in with your Google account.
- Click **"Create API Key"**.
- Copy your new API key.

### 2. Add it to the Extension
- Pin the **Optimize Prompt** extension to your Chrome toolbar for easy access.
- Click the extension icon to open the **Settings Page**.
- Navigate to the **🔑 API Key** section.
- Paste your API key and hit **Save**.

You're all set!

---

## 💡 Usage

1. Go to [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com).
2. Start typing a prompt in the chat box (e.g., *"write me an email to my boss asking for a raise but make it sound nice"*).
3. Click the floating **✨ button** inside the text box, or press `Cmd+Shift+O` (Mac) / `Ctrl+Shift+O` (Windows/Linux).
4. A beautiful modal will pop up with an optimized, structured, and highly detailed version of your prompt.
5. Review the result, and click **Accept** to replace your original text. (You can also hit **Regenerate** if you want a different variation, or simply **Copy**).
6. Send your newly optimized prompt and enjoy the vastly improved AI response!

---

## 🛠️ Development

Want to tweak the extension or add support for another AI platform?

- `manifest.json`: The extension configuration, permissions, and platform matching.
- `background.js`: Service worker handling API calls to Gemini to avoid CORS issues.
- `content.js`: The script injected into the AI platforms. It handles the UI overlay, text extraction, insertion, and the floating button.
- `settings.js` / `settings.html` / `settings.css`: The settings page dashboard for API key and preference management.
- `modal.css`: Styling for the optimization popup overlay on host websites.

**Adding a new platform:**
1. Add the domain to `host_permissions` and `content_scripts.matches` in `manifest.json`.
2. In `content.js`, add the domain to the `detectPlatform()` function and specify its textarea selector in `getInputSelectors()`.

---

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome! 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the [MIT License](LICENSE). 

---
*Built to help you get the best answers from AI, with minimal effort.*
