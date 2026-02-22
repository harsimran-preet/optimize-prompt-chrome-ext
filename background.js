// background.js - Service worker for Optimize Prompt extension

// Open settings page when toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
});


chrome.commands.onCommand.addListener(async (command) => {
  if (command === "optimize-prompt") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "triggerOptimize" });
    }
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

async function handleGeminiCall({ apiKey, prompt, platform }) {
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
    `You are optimizing a prompt that will be sent to an AI assistant.`;

  const metaPrompt = `${platformContext}

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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: metaPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
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
