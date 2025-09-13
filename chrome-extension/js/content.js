let explainerModal = null;
let isSelecting = false;
let lastSelectedTextForButton = '';

function formatExplanation(text) {
  console.log('formatExplanation input:', typeof text, text?.substring(0, 100) + '...');
  
  if (!text || typeof text !== 'string') {
    console.error('Invalid input to formatExplanation:', text);
    return 'テキストの解析でエラーが発生しました。';
  }
  
  // Format the explanation text with better structure
  let formatted = text;
  
  // Handle H3 headers (### header)
  formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 style="color: #34a853; font-size: 16px; margin: 12px 0 8px 0; font-weight: bold;">$1</h3>');
  
  // Handle H2 headers (## header)
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 style="color: #1a73e8; font-size: 18px; margin: 15px 0 10px 0; font-weight: bold;">$1</h2>');
  
  // Format bold and italic
  formatted = formatted
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1a73e8;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p style="margin: 10px 0;">')
    .replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags
  if (!formatted.startsWith('<')) {
    formatted = '<p style="margin: 10px 0;">' + formatted + '</p>';
  }
  
  // Format numbered lists
  formatted = formatted.replace(/(\d+\.\s)/g, '<br><strong style="color: #34a853;">$1</strong>');
  
  console.log('formatExplanation output length:', formatted?.length);
  
  return formatted;
}

function createExplainerButton() {
  // Check if button already exists
  let button = document.getElementById('readable-explainer-btn');
  if (button) {
    return button;
  }
  
  button = document.createElement('button');
  button.id = 'readable-explainer-btn';
  button.textContent = '💡 解説';
  button.style.cssText = `
    position: absolute;
    z-index: 10000;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    display: none;
  `;
  
  button.addEventListener('click', async (event) => {
    console.log('Button clicked!');
    event.preventDefault();
    event.stopPropagation();
    
    // Get selected text before it disappears
    const selectedText = lastSelectedTextForButton || window.getSelection().toString().trim();
    console.log('Button click - selected text:', selectedText);
    
    if (selectedText) {
      // Hide button immediately
      hideButton();
      
      // Call the explain function directly with the text
      await handleContextMenuExplanation(selectedText);
    } else {
      console.error('No text selected for explanation');
    }
  });
  
  document.body.appendChild(button);
  console.log('Button created and attached to body');
  return button;
}

function createExplainerModal() {
  const modal = document.createElement('div');
  modal.id = 'readable-explainer-modal';
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10001;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    max-width: 900px;
    max-height: 600px;
    overflow: auto;
    padding: 20px;
    display: none;
  `;
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  `;
  closeButton.addEventListener('click', hideModal);
  
  const content = document.createElement('div');
  content.id = 'readable-explainer-content';
  content.style.cssText = `
    margin-top: 10px;
    line-height: 1.6;
    color: #333;
  `;
  
  modal.appendChild(closeButton);
  modal.appendChild(content);
  document.body.appendChild(modal);
  return modal;
}

function showButton(x, y) {
  console.log('showButton called at position:', x, y);
  const button = document.getElementById('readable-explainer-btn') || createExplainerButton();
  button.style.left = `${x}px`;
  button.style.top = `${y + 10}px`;
  button.style.display = 'block';
  console.log('Button displayed with text:', lastSelectedTextForButton);
}

function hideButton() {
  const button = document.getElementById('readable-explainer-btn');
  if (button) {
    button.style.display = 'none';
  }
}

function showModal(content) {
  if (!explainerModal) {
    explainerModal = createExplainerModal();
  }
  
  const contentDiv = document.getElementById('readable-explainer-content');
  contentDiv.innerHTML = content;
  explainerModal.style.display = 'block';
  
  const overlay = document.createElement('div');
  overlay.id = 'readable-explainer-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 10000;
  `;
  overlay.addEventListener('click', hideModal);
  document.body.appendChild(overlay);
}

function hideModal() {
  if (explainerModal) {
    explainerModal.style.display = 'none';
  }
  const overlay = document.getElementById('readable-explainer-overlay');
  if (overlay) {
    overlay.remove();
  }
}

async function handleExplainRequest() {
  // Use stored text or current selection
  const selectedText = lastSelectedTextForButton || window.getSelection().toString().trim();
  if (!selectedText) return;
  
  console.log('handleExplainRequest called with text:', selectedText);
  
  hideButton();
  
  // Store selected text for streaming
  window.lastSelectedText = selectedText;
  
  // Get page title and URL for context
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  
  // Ensure modal exists
  if (!explainerModal) {
    explainerModal = createExplainerModal();
  }
  
  // Enable streaming
  currentStreamingContent = '';
  isStreaming = true;
  
  // Show initial modal with selected text
  showModal(`
    <div style="margin-bottom: 20px;">
      <h3 style="color: #1a73e8; margin-bottom: 8px;">📊 送信プロンプト情報:</h3>
      <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; color: #5f6368; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong>選択テキスト:</strong> "${selectedText}"</div>
        <div style="margin-bottom: 8px;"><strong>ページタイトル:</strong> ${pageTitle}</div>
        <div><strong>ページURL:</strong> <span style="word-break: break-all;">${pageUrl}</span></div>
      </div>
    </div>
    <div>
      <h3 style="color: #1a73e8; margin-bottom: 15px;">🎓 学習ポイント解説:</h3>
      <div id="streaming-content" style="line-height: 1.8; color: #333; min-height: 100px;">
        <span class="typing-cursor">▋</span>
      </div>
    </div>
  `);
  
  try {
    console.log('About to call sendMessageToBackground...');
    
    // Start simulated streaming
    startStreamingSimulation();
    
    const response = await sendMessageToBackground({
      action: 'explainText',
      text: selectedText,
      context: {
        title: pageTitle,
        url: pageUrl
      }
    });
    
    console.log('sendMessageToBackground completed!');
    console.log('Received response in content script:', response);
    
    // Stop streaming
    isStreaming = false;
    
    if (response && response.success) {
      console.log('Response is successful, explanation length:', response.explanation?.length);
      
      // Stream the explanation text
      await streamExplanationText(response.explanation, selectedText);
      
      console.log('UI updated with streamed explanation');
      
    } else {
      console.error('Response failed or invalid:', response);
      const errorMessage = response?.error || '不明なエラーが発生しました';
      const contentDiv = document.getElementById('readable-explainer-content');
      if (contentDiv) {
        contentDiv.innerHTML = `<div style="color: #d93025; padding: 15px; background: #fce8e6; border-radius: 6px; border-left: 4px solid #d93025;">❌ エラー: ${errorMessage}</div>`;
      }
    }
  } catch (error) {
    console.error('Error in explanation request:', error);
    isStreaming = false;
    const contentDiv = document.getElementById('readable-explainer-content');
    if (contentDiv) {
      contentDiv.innerHTML = `<div style="color: #d93025; padding: 15px; background: #fce8e6; border-radius: 6px; border-left: 4px solid #d93025;">❌ 解説の取得に失敗しました: ${error.message}</div>`;
    }
  }
}

document.addEventListener('mouseup', (event) => {
  // Don't show button if clicking on the button itself
  if (event.target && event.target.id === 'readable-explainer-btn') {
    return;
  }
  
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('mouseup - selected text:', selectedText);
    
    if (selectedText.length > 0) {
      // Store the selected text for button click
      lastSelectedTextForButton = selectedText;
      console.log('Stored text for button:', lastSelectedTextForButton);
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showButton(rect.left + rect.width / 2 - 30, rect.bottom + window.scrollY);
    } else {
      hideButton();
      lastSelectedTextForButton = '';
    }
  }, 10);
});

document.addEventListener('mousedown', (event) => {
  // Don't hide button if clicking on the button itself
  if (event.target && event.target.id === 'readable-explainer-btn') {
    return;
  }
  hideButton();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideButton();
    hideModal();
  }
});

// Listen for messages from context menu and streaming chunks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'explainFromContextMenu') {
    handleContextMenuExplanation(request.text);
  } else if (request.action === 'streamingChunk') {
    handleStreamingChunk(request.chunk);
  }
});

let currentStreamingContent = '';
let isStreaming = false;
let streamingInterval = null;

// Simulated streaming while waiting for response
function startStreamingSimulation() {
  const streamingDiv = document.getElementById('streaming-content');
  if (!streamingDiv) return;
  
  const loadingTexts = [
    '解説を生成中',
    '解説を生成中.',
    '解説を生成中..',
    '解説を生成中...'
  ];
  let index = 0;
  
  streamingInterval = setInterval(() => {
    if (!isStreaming) {
      clearInterval(streamingInterval);
      return;
    }
    streamingDiv.innerHTML = `<span style="color: #666;">${loadingTexts[index % loadingTexts.length]}</span> <span class="typing-cursor">▋</span>`;
    index++;
  }, 500);
}

// Stream the actual explanation text with progressive markdown formatting
async function streamExplanationText(text, selectedText) {
  if (!text) return;
  
  // Clear the loading animation
  if (streamingInterval) {
    clearInterval(streamingInterval);
  }
  
  const contentDiv = document.getElementById('readable-explainer-content');
  if (!contentDiv) return;
  
  // Get page context
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  
  // Create full content structure
  const fullContent = `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #1a73e8; margin-bottom: 8px;">📊 送信プロンプト情報:</h3>
      <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; color: #5f6368; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong>選択テキスト:</strong> "${selectedText}"</div>
        <div style="margin-bottom: 8px;"><strong>ページタイトル:</strong> ${pageTitle}</div>
        <div><strong>ページURL:</strong> <span style="word-break: break-all;">${pageUrl}</span></div>
      </div>
    </div>
    <div>
      <h3 style="color: #1a73e8; margin-bottom: 15px;">🎓 学習ポイント解説:</h3>
      <div id="streaming-content" style="line-height: 1.8; color: #333;">
        <div id="streamed-html"></div><span class="typing-cursor">▋</span>
      </div>
    </div>
  `;
  
  contentDiv.innerHTML = fullContent;
  
  const streamedHtmlDiv = document.getElementById('streamed-html');
  if (!streamedHtmlDiv) return;
  
  // Stream characters with progressive formatting
  let currentIndex = 0;
  const charsPerFrame = 3; // Characters to add per frame
  const delay = 20; // Delay between frames in ms
  
  return new Promise((resolve) => {
    const streamNextChars = () => {
      if (currentIndex >= text.length) {
        // Finished streaming, remove cursor and apply final formatting
        const streamingContentDiv = document.getElementById('streaming-content');
        if (streamingContentDiv) {
          streamingContentDiv.innerHTML = formatExplanation(text);
        }
        resolve();
        return;
      }
      
      // Get next chunk of text
      currentIndex = Math.min(currentIndex + charsPerFrame, text.length);
      const currentText = text.substring(0, currentIndex);
      
      // Apply progressive formatting to current text
      streamedHtmlDiv.innerHTML = formatStreamingText(currentText);
      
      // Schedule next update (removed auto-scroll to let user read at their own pace)
      setTimeout(streamNextChars, delay);
    };
    
    streamNextChars();
  });
}

// Format text progressively during streaming
function formatStreamingText(text) {
  if (!text) return '';
  
  // Apply formatting that works well during streaming
  let formatted = text;
  
  // Handle H3 headers (### header)
  formatted = formatted.replace(/^###\s+(.+)$/gm, '<h3 style="color: #34a853; font-size: 16px; margin: 12px 0 8px 0; font-weight: bold;">$1</h3>');
  formatted = formatted.replace(/<br>###\s+(.+)/g, '<h3 style="color: #34a853; font-size: 16px; margin: 12px 0 8px 0; font-weight: bold;">$1</h3>');
  
  // Handle H2 headers (## header)
  formatted = formatted.replace(/^##\s+(.+)$/gm, '<h2 style="color: #1a73e8; font-size: 18px; margin: 15px 0 10px 0; font-weight: bold;">$1</h2>');
  formatted = formatted.replace(/<br>##\s+(.+)/g, '<h2 style="color: #1a73e8; font-size: 18px; margin: 15px 0 10px 0; font-weight: bold;">$1</h2>');
  
  // Handle incomplete markdown patterns gracefully
  // Bold: **text** - only format complete pairs
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #1a73e8;">$1</strong>');
  
  // Italic: *text* - only format complete pairs (avoid conflict with bold)
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Line breaks and paragraphs
  formatted = formatted.replace(/\n\n/g, '</p><p style="margin: 10px 0;">');
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Numbered lists - format even partial ones
  formatted = formatted.replace(/^(\d+\.\s)/gm, '<strong style="color: #34a853;">$1</strong>');
  formatted = formatted.replace(/<br>(\d+\.\s)/g, '<br><strong style="color: #34a853;">$1</strong>');
  
  // Wrap in paragraph if needed
  if (!formatted.startsWith('<')) {
    formatted = '<p style="margin: 10px 0;">' + formatted;
  }
  
  // Close any open paragraph tags
  const openPTags = (formatted.match(/<p[^>]*>/g) || []).length;
  const closePTags = (formatted.match(/<\/p>/g) || []).length;
  if (openPTags > closePTags) {
    formatted += '</p>';
  }
  
  return formatted;
}

// Simple message communication with proper promise handling
async function sendMessageToBackground(message) {
  console.log('Sending message to background script:', message);

  // Check if runtime is available
  if (!chrome.runtime || !chrome.runtime.sendMessage) {
    throw new Error('Chrome 拡張の通信機能が利用できません。拡張機能を再読み込みしてください。');
  }

  return new Promise((resolve, reject) => {
    let responseReceived = false;
    
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!responseReceived) {
        responseReceived = true;
        console.error('Request timed out after 30 seconds');
        reject(new Error('リクエストがタイムアウトしました（30秒）'));
      }
    }, 30000);

    console.log('Calling chrome.runtime.sendMessage...');
    
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (responseReceived) {
          console.warn('Response already received, ignoring duplicate');
          return;
        }
        
        responseReceived = true;
        clearTimeout(timeoutId);
        
        console.log('Message callback executed');
        console.log('chrome.runtime.lastError:', chrome.runtime.lastError);
        console.log('Response received:', response);
        
        if (chrome.runtime.lastError) {
          console.error('Runtime error in callback:', chrome.runtime.lastError);
          reject(new Error(`通信エラー: ${chrome.runtime.lastError.message}`));
        } else if (!response) {
          console.error('Response is null/undefined');
          reject(new Error('バックグラウンドスクリプトから応答がありません'));
        } else {
          console.log('Response successfully processed:', response);
          resolve(response);
        }
      });
      
      console.log('chrome.runtime.sendMessage called, waiting for response...');
      
    } catch (error) {
      if (!responseReceived) {
        responseReceived = true;
        clearTimeout(timeoutId);
        console.error('Exception in sendMessage:', error);
        reject(new Error(`メッセージ送信エラー: ${error.message}`));
      }
    }
  });
}

function handleStreamingChunk(chunk) {
  if (!isStreaming) return;
  
  currentStreamingContent += chunk;
  
  const contentDiv = document.getElementById('readable-explainer-content');
  if (contentDiv) {
    const formattedContent = formatExplanation(currentStreamingContent);
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    
    contentDiv.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1a73e8; margin-bottom: 8px;">📊 送信プロンプト情報:</h3>
        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; color: #5f6368; font-size: 13px;">
          <div style="margin-bottom: 8px;"><strong>選択テキスト:</strong> "${window.lastSelectedText || ''}"</div>
          <div style="margin-bottom: 8px;"><strong>ページタイトル:</strong> ${pageTitle}</div>
          <div><strong>ページURL:</strong> <span style="word-break: break-all;">${pageUrl}</span></div>
        </div>
      </div>
      <div>
        <h3 style="color: #1a73e8; margin-bottom: 15px;">🎓 学習ポイント解説:</h3>
        <div style="line-height: 1.8; color: #333;">${formattedContent}</div>
        <div style="color: #666; margin-top: 10px; font-style: italic;">生成中...</div>
      </div>
    `;
    
    // Auto-scroll removed to let user read at their own pace
  }
}

async function handleContextMenuExplanation(selectedText) {
  if (!selectedText) return;
  
  // Store selected text for streaming
  window.lastSelectedText = selectedText;
  
  // Get page title and URL for context
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  
  const contentDiv = document.getElementById('readable-explainer-content');
  if (!explainerModal) {
    explainerModal = createExplainerModal();
  }
  
  // Enable streaming
  currentStreamingContent = '';
  isStreaming = true;
  
  showModal(`
    <div style="margin-bottom: 20px;">
      <h3 style="color: #1a73e8; margin-bottom: 8px;">📊 送信プロンプト情報:</h3>
      <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; color: #5f6368; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong>選択テキスト:</strong> "${selectedText}"</div>
        <div style="margin-bottom: 8px;"><strong>ページタイトル:</strong> ${pageTitle}</div>
        <div><strong>ページURL:</strong> <span style="word-break: break-all;">${pageUrl}</span></div>
      </div>
    </div>
    <div>
      <h3 style="color: #1a73e8; margin-bottom: 15px;">🎓 学習ポイント解説:</h3>
      <div id="streaming-content" style="line-height: 1.8; color: #333; min-height: 100px;">
        <span class="typing-cursor">▋</span>
      </div>
    </div>
  `);
  
  try {
    // Start simulated streaming
    startStreamingSimulation();
    
    const response = await sendMessageToBackground({
      action: 'explainText',
      text: selectedText,
      context: {
        title: pageTitle,
        url: pageUrl
      }
    });
    
    console.log('Received response in context menu handler:', response);
    
    // Stop streaming
    isStreaming = false;
    
    if (response && response.success) {
      console.log('Context menu response is successful, explanation length:', response.explanation?.length);
      
      // Stream the explanation text
      await streamExplanationText(response.explanation, selectedText);
      
      console.log('Context menu UI updated with streamed explanation');
      
    } else {
      console.error('Context menu response failed or invalid:', response);
      const errorMessage = response?.error || '不明なエラーが発生しました';
      contentDiv.innerHTML = `<div style="color: #d93025; padding: 15px; background: #fce8e6; border-radius: 6px; border-left: 4px solid #d93025;">❌ エラー: ${errorMessage}</div>`;
    }
  } catch (error) {
    console.error('Error in explanation request:', error);
    isStreaming = false;
    contentDiv.innerHTML = `<div style="color: #d93025; padding: 15px; background: #fce8e6; border-radius: 6px; border-left: 4px solid #d93025;">❌ 解説の取得に失敗しました: ${error.message}</div>`;
  }
}