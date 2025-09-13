const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

async function getApiKey() {
  const result = await chrome.storage.sync.get(['geminiApiKey']);
  return result.geminiApiKey;
}

async function callGeminiAPI(text, apiKey) {
  const prompt = `以下のテキストについて、わかりやすく日本語で解説してください。専門用語がある場合は、その意味も含めて説明してください。

テキスト: "${text}"

解説:`;

  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'explainText') {
    handleExplainText(request.text)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep the message channel open for async response
  }
});

async function handleExplainText(text) {
  try {
    const apiKey = await getApiKey();
    
    if (!apiKey) {
      throw new Error('Gemini API キーが設定されていません。拡張機能のオプションページで設定してください。');
    }

    const explanation = await callGeminiAPI(text, apiKey);
    
    return {
      success: true,
      explanation: explanation
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'explainSelectedText',
    title: 'Readable Explainerで解説',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'explainSelectedText') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'explainFromContextMenu',
      text: info.selectionText
    });
  }
});