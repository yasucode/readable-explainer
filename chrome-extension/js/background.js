async function getApiConfig() {
  const result = await chrome.storage.sync.get(['geminiApiKey', 'geminiApiUrl']);
  return {
    apiKey: result.geminiApiKey,
    apiUrl: result.geminiApiUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  };
}

async function callGeminiAPI(text, context, apiConfig, onChunk = null) {
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
      maxOutputTokens: 2048
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH", 
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      }
    ]
  };

  // Add streaming parameter if callback is provided
  if (onChunk) {
    const streamingUrl = apiConfig.apiUrl.replace(':generateContent', ':streamGenerateContent');
    return await callGeminiStreamingAPI(streamingUrl, apiConfig.apiKey, requestBody, onChunk);
  }

  try {
    console.log('Making API request to:', `${apiConfig.apiUrl}?key=${apiConfig.apiKey.substring(0, 10)}...`);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${apiConfig.apiUrl}?key=${apiConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      
      // Handle specific API errors
      if (response.status === 400) {
        throw new Error(`APIリクエストエラー: リクエスト形式が無効です (${response.status})`);
      } else if (response.status === 401) {
        throw new Error(`認証エラー: APIキーが無効です (${response.status})`);
      } else if (response.status === 403) {
        throw new Error(`権限エラー: APIアクセスが拒否されました (${response.status})`);
      } else if (response.status === 404) {
        throw new Error(`エンドポイントエラー: APIエンドポイントが見つかりません (${response.status})`);
      } else {
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
    }

    const data = await response.json();
    console.log('API response data:', JSON.stringify(data, null, 2));
    
    // Check for safety blocks
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      throw new Error(`コンテンツフィルターによりブロックされました: ${data.promptFeedback.blockReason}`);
    }
    
    // Check for candidates
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', data);
      throw new Error('AIからの応答が生成されませんでした。別のテキストでお試しください。');
    }
    
    const candidate = data.candidates[0];
    
    // Check for finish reason
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn('Unusual finish reason:', candidate.finishReason);
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('安全性フィルターにより生成が停止されました。');
      } else if (candidate.finishReason === 'MAX_TOKENS') {
        console.warn('Response truncated due to max tokens');
      }
    }
    
    // Extract content
    if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
      const result = candidate.content.parts[0].text;
      console.log('Extracted text length:', result?.length);
      
      if (!result || result.trim() === '') {
        throw new Error('AIからの応答が空でした。');
      }
      
      return result;
    } else {
      console.error('Unexpected response structure:', candidate);
      throw new Error('予期しないレスポンス形式です: ' + JSON.stringify(candidate));
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

async function callGeminiStreamingAPI(url, apiKey, requestBody, onChunk) {
  try {
    console.log('Making streaming API request to:', `${url}?key=${apiKey.substring(0, 10)}...`);
    
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Streaming API error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            // Remove "data: " prefix if present
            const jsonStr = line.startsWith('data: ') ? line.slice(6) : line;
            if (jsonStr === '[DONE]') continue;
            
            const data = JSON.parse(jsonStr);
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              const text = data.candidates[0].content.parts[0].text;
              fullText += text;
              
              // Send chunk to callback
              if (onChunk) {
                onChunk(text);
              }
            }
          } catch (e) {
            console.warn('Failed to parse streaming chunk:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    return fullText;
    
  } catch (error) {
    console.error('Streaming API error:', error);
    throw error;
  }
}

// Simplified message listener with immediate response handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  
  if (request.action === 'explainText') {
    console.log('Processing explainText action...');
    
    // Handle async operation with immediate promise resolution
    const processRequest = async () => {
      try {
        console.log('Starting handleExplainText...');
        const result = await handleExplainText(request.text, request.context);
        console.log('handleExplainText completed successfully');
        console.log('Result object keys:', Object.keys(result || {}));
        console.log('Result success:', result?.success);
        console.log('Result explanation length:', result?.explanation?.length);
        return result;
      } catch (error) {
        console.error('Error in handleExplainText:', error);
        return { success: false, error: error.message };
      }
    };
    
    // Execute immediately and send response
    processRequest()
      .then(result => {
        console.log('About to send response:', result);
        try {
          sendResponse(result);
          console.log('Response sent successfully via sendResponse');
        } catch (error) {
          console.error('Error sending response:', error);
        }
      })
      .catch(error => {
        console.error('Unexpected error in processRequest:', error);
        try {
          sendResponse({ success: false, error: 'Unexpected error: ' + error.message });
          console.log('Error response sent');
        } catch (sendError) {
          console.error('Failed to send error response:', sendError);
        }
      });
    
    // Return true to keep message channel open
    console.log('Returning true to keep message channel open');
    return true;
  }
  
  // Handle other actions
  console.warn('Unknown action received:', request.action);
  return false;
});

async function handleExplainTextStreaming(text, context, tabId) {
  console.log('handleExplainTextStreaming called with:', { text: text?.substring(0, 50) + '...', context, tabId });
  
  try {
    const apiConfig = await getApiConfig();
    console.log('API config retrieved:', { hasApiKey: !!apiConfig.apiKey, apiUrl: apiConfig.apiUrl });
    
    if (!apiConfig.apiKey) {
      throw new Error('Gemini API キーが設定されていません。拡張機能のポップアップで設定してください。');
    }

    if (!apiConfig.apiUrl) {
      throw new Error('APIリクエストURLが設定されていません。拡張機能のポップアップで設定してください。');
    }

    console.log('Calling Gemini API with streaming...');
    
    // Send streaming chunks to content script
    const onChunk = (chunk) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'streamingChunk',
        chunk: chunk
      }).catch(err => console.warn('Failed to send chunk:', err));
    };
    
    const explanation = await callGeminiAPI(text, context, apiConfig, onChunk);
    console.log('API call successful, total length:', explanation?.length);
    
    return {
      success: true,
      explanation: explanation
    };
  } catch (error) {
    console.error('Error in handleExplainTextStreaming:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleExplainText(text, context) {
  console.log('handleExplainText called with:', { text: text?.substring(0, 50) + '...', context });
  
  try {
    const apiConfig = await getApiConfig();
    console.log('API config retrieved:', { hasApiKey: !!apiConfig.apiKey, apiUrl: apiConfig.apiUrl });
    
    if (!apiConfig.apiKey) {
      throw new Error('Gemini API キーが設定されていません。拡張機能のポップアップで設定してください。');
    }

    if (!apiConfig.apiUrl) {
      throw new Error('APIリクエストURLが設定されていません。拡張機能のポップアップで設定してください。');
    }

    console.log('Calling Gemini API...');
    const explanation = await callGeminiAPI(text, context, apiConfig);
    console.log('API call successful');
    
    return {
      success: true,
      explanation: explanation
    };
  } catch (error) {
    console.error('Error in handleExplainText:', error);
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