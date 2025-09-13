async function getApiConfig() {
  const result = await chrome.storage.sync.get(['geminiApiKey', 'geminiApiUrl']);
  return {
    apiKey: result.geminiApiKey,
    apiUrl: result.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'
  };
}

async function callGeminiAPI(text, context, apiConfig) {
  const prompt = `あなたは学習効率を最大化する教育支援AIです。以下の選択されたテキストについて、学習者の理解と記憶定着を促進する詳細な解説を提供してください。

【ページ情報】
- タイトル: "${context.title}"
- URL: ${context.url}

【選択テキスト】
"${text}"

【解説指針】
1. **背景・文脈の説明**: このテキストがどのような文脈で使用されているかを説明
2. **重要概念の詳述**: 含まれる専門用語や重要概念を具体例とともに解説
3. **学習ポイント**: なぜこの内容が重要なのか、どう活用できるかを説明
4. **関連知識の提供**: より深い理解のための関連情報や応用例
5. **記憶のコツ**: 覚えやすくするための方法や覚え方のヒント

学習者がこのテキストを完全に理解し、長期記憶に定着させることを目標とした解説をお願いします。`;

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
      maxOutputTokens: 2048,
    }
  };

  try {
    const response = await fetch(`${apiConfig.apiUrl}?key=${apiConfig.apiKey}`, {
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
    handleExplainText(request.text, request.context)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep the message channel open for async response
  }
});

async function handleExplainText(text, context) {
  try {
    const apiConfig = await getApiConfig();
    
    if (!apiConfig.apiKey) {
      throw new Error('Gemini API キーが設定されていません。拡張機能のポップアップで設定してください。');
    }

    if (!apiConfig.apiUrl) {
      throw new Error('APIリクエストURLが設定されていません。拡張機能のポップアップで設定してください。');
    }

    const explanation = await callGeminiAPI(text, context, apiConfig);
    
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