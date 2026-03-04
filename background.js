// background.js - Service worker for Optimize Prompt extension

// Open settings page when toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});


chrome.runtime.onInstalled.addListener(async () => {
  // Inject content script into all existing matching tabs
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      // Avoid injecting into restricted pages
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("https://chrome.google.com/webstore")) {
        continue;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["content.js"]
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id, allFrames: true },
          files: ["modal.css"]
        });
      } catch (err) {
        // Ignore errors for tabs that cannot be scripted
      }
    }
  } catch (e) {
    console.error("Install script injection error:", e);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  try {
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs.length === 0) {
      tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    }
    if (tabs.length > 0) {
      const tab = tabs[0];
      if (command === "optimize-prompt") {
        await chrome.tabs.sendMessage(tab.id, { action: "triggerOptimize" }).catch(() => {});
      } else if (command === "formalize-message") {
        await chrome.tabs.sendMessage(tab.id, { action: "triggerFormalize" }).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Command error:", error);
  }
});

// Handle API call from content script (avoids CORS issues)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "callGeminiAPI") {
    handleGeminiCall(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

async function handleGeminiCall({ apiKey, prompt, platform, actionType = "optimize" }) {
  let metaPrompt = "";

  if (actionType === "generate") {
    metaPrompt = `You are an expert writer and assistant. The user has given you an instruction inside curly braces. Your job is to generate the requested content directly.

Rules:
- Follow the user's instruction precisely
- Return ONLY the generated content, nothing else
- No explanations, no preamble, no "Here is your text:" — just the content itself
- Match the appropriate tone and format for the request (email, message, paragraph, etc.)

User's instruction:
"""
${prompt}
"""`;
  } else if (actionType === "formalize") {
    metaPrompt = `You are an expert copywriter. Your job is to take the user's rough message and rewrite it to be formal, professional, clear, and polite.

Apply these improvements:
1. Fix any grammar or spelling mistakes.
2. Ensure the tone is professional, respectful, and appropriate for business communication.
3. Keep the original intent and core message intact.
4. Improve clarity and readability.

Rules:
- Preserve the user's original intent completely
- Return ONLY the formalized text, nothing else
- No explanations, no preamble, no "Here is your formalized message:" — just the message itself

User's original message:
"""
${prompt}
"""`;
  } else {
    const platformInstructions = {
      "claude.ai": `You are optimizing a prompt that will be sent to Claude (Anthropic's AI). 
Claude responds well to: clear role definitions, explicit task descriptions, structured formatting requests, 
step-by-step reasoning instructions, and specific output format guidance.`,

      "chatgpt.com": `You are optimizing a prompt that will be sent to ChatGPT (OpenAI's AI). 
ChatGPT responds well to: persona/role assignment, clear objectives, context setting, 
output format specifications, and explicit constraints.`,

      "gemini.google.com": `You are optimizing a prompt that will be sent to Gemini (Google's AI). 
Gemini responds well to: clear task framing, factual grounding requests, multi-part structured questions, 
and requests that leverage its multimodal and research strengths.`
    };

    const platformContext = platformInstructions[platform] ||
      `You are optimizing a prompt that will be sent to an AI assistant on the website ${platform}.`;

    metaPrompt = `${platformContext}

Your job is to take the user's rough, vague, or incomplete prompt and transform it into a highly effective, 
well-structured prompt that will get the best possible response from the AI.

Apply these improvements:
1. **Role/Persona**: Add a clear role or expert persona if appropriate
2. **Task Clarity**: Make the core task crystal clear and specific
3. **Context**: Add relevant context that helps the AI understand the situation
4. **Format**: Specify the desired output format, length, or structure
5. **Constraints**: Add any useful constraints or requirements
6. **Examples**: Add a brief example if it would help clarify the request

Rules:
- Preserve the user's original intent completely
- Do NOT answer the prompt — only optimize it
- Return ONLY the optimized prompt text, nothing else
- No explanations, no preamble, no "Here is your optimized prompt:" — just the prompt itself

User's original prompt:
"""
${prompt}
"""`;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: metaPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || `API error: ${response.status} ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response returned from Gemini. Please try again.");
  }

  return text.trim();
}
