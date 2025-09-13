let explainerModal = null;
let isSelecting = false;

function formatExplanation(text) {
  // Format the explanation text with better structure
  let formatted = text
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
  
  return formatted;
}

function createExplainerButton() {
  const button = document.createElement('button');
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
  
  button.addEventListener('click', handleExplainRequest);
  document.body.appendChild(button);
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
    max-width: 500px;
    max-height: 400px;
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
  const button = document.getElementById('readable-explainer-btn') || createExplainerButton();
  button.style.left = `${x}px`;
  button.style.top = `${y + 10}px`;
  button.style.display = 'block';
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
  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) return;
  
  hideButton();
  
  // Get page title and URL for context
  const pageTitle = document.title;
  const pageUrl = window.location.href;
  
  const contentDiv = document.getElementById('readable-explainer-content');
  showModal('<div style="text-align: center;">解説を生成中...</div>');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'explainText',
      text: selectedText,
      context: {
        title: pageTitle,
        url: pageUrl
      }
    });
    
    if (response.success) {
      // Format the explanation with better styling
      const formattedExplanation = formatExplanation(response.explanation);
      
      contentDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #1a73e8; margin-bottom: 8px;">📖 選択されたテキスト:</h3>
          <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #1a73e8; font-style: italic; color: #5f6368;">
            "${selectedText}"
          </div>
        </div>
        <div>
          <h3 style="color: #1a73e8; margin-bottom: 15px;">🎓 学習ポイント解説:</h3>
          <div style="line-height: 1.8; color: #333;">${formattedExplanation}</div>
        </div>
      `;
    } else {
      contentDiv.innerHTML = `<div style="color: #d93025; padding: 15px; background: #fce8e6; border-radius: 6px; border-left: 4px solid #d93025;">❌ エラー: ${response.error}</div>`;
    }
  } catch (error) {
    contentDiv.innerHTML = `<div style="color: red;">解説の取得に失敗しました: ${error.message}</div>`;
  }
}

document.addEventListener('mouseup', (event) => {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showButton(rect.left + rect.width / 2 - 30, rect.bottom + window.scrollY);
    } else {
      hideButton();
    }
  }, 10);
});

document.addEventListener('mousedown', () => {
  hideButton();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideButton();
    hideModal();
  }
});