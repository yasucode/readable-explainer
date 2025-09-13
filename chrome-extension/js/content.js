let explainerModal = null;
let isSelecting = false;

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
  
  const contentDiv = document.getElementById('readable-explainer-content');
  showModal('<div style="text-align: center;">解説を生成中...</div>');
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'explainText',
      text: selectedText
    });
    
    if (response.success) {
      contentDiv.innerHTML = `
        <h3>選択されたテキスト:</h3>
        <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0;">${selectedText}</p>
        <h3>解説:</h3>
        <div>${response.explanation.replace(/\n/g, '<br>')}</div>
      `;
    } else {
      contentDiv.innerHTML = `<div style="color: red;">エラー: ${response.error}</div>`;
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