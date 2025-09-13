document.addEventListener('DOMContentLoaded', async function() {
    const apiUrlInput = document.getElementById('apiUrl');
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('saveButton');
    const statusDiv = document.getElementById('status');
    
    // Load existing settings
    const result = await chrome.storage.sync.get(['geminiApiKey', 'geminiApiUrl']);
    if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
    }
    if (result.geminiApiUrl) {
        apiUrlInput.value = result.geminiApiUrl;
    } else {
        // Set default URL if not set
        apiUrlInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    }
    
    if (result.geminiApiKey && result.geminiApiUrl) {
        showStatus('API設定が完了しています', 'success');
    }
    
    saveButton.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        const apiUrl = apiUrlInput.value.trim();
        
        if (!apiKey) {
            showStatus('API キーを入力してください', 'error');
            return;
        }
        
        if (!apiUrl) {
            showStatus('APIリクエストURLを入力してください', 'error');
            return;
        }
        
        // Validate URL format
        try {
            new URL(apiUrl);
        } catch {
            showStatus('無効なURL形式です', 'error');
            return;
        }
        
        // Validate API key format (basic check)
        if (!apiKey.startsWith('AIza')) {
            showStatus('無効なAPI キー形式です', 'error');
            return;
        }
        
        try {
            await chrome.storage.sync.set({ 
                geminiApiKey: apiKey,
                geminiApiUrl: apiUrl
            });
            showStatus('API設定を保存しました', 'success');
        } catch (error) {
            showStatus('保存に失敗しました: ' + error.message, 'error');
        }
    });
    
    [apiKeyInput, apiUrlInput].forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                saveButton.click();
            }
        });
    });
    
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = '';
            }, 3000);
        }
    }
});