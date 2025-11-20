let currentTab = null;

// Get current tab info when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  if (tabs[0]) {
    currentTab = tabs[0];
    
    // Get stored custom name if exists (check both tab ID and URL)
    const urlKey = `url_${currentTab.url}`;
    const result = await chrome.storage.local.get([`tab_${currentTab.id}`, urlKey]);
    const customName = result[`tab_${currentTab.id}`] || result[urlKey];
    
    // Display original title (stored) or current title
    const originalTitle = customName ? 
      await getOriginalTitle(currentTab.id, currentTab.url) : 
      currentTab.title;
    
    document.getElementById('originalTitle').textContent = originalTitle || 'Untitled';
    
    // Pre-fill input with current custom name if exists
    if (customName) {
      document.getElementById('newTitle').value = customName;
    }
  }
});

// Get original title from storage
async function getOriginalTitle(tabId, url) {
  const urlKey = `original_url_${url}`;
  const result = await chrome.storage.local.get([`original_${tabId}`, urlKey]);
  return result[`original_${tabId}`] || result[urlKey];
}

// Show message
function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 3000);
}

// Rename tab button
document.getElementById('renameBtn').addEventListener('click', async () => {
  const newTitle = document.getElementById('newTitle').value.trim();
  
  if (!newTitle) {
    showMessage('Please enter a new tab name', 'error');
    return;
  }
  
  if (!currentTab) {
    showMessage('No active tab found', 'error');
    return;
  }
  
  try {
    // Store original title if not already stored (by both tab ID and URL)
    const urlKey = `original_url_${currentTab.url}`;
    const originalResult = await chrome.storage.local.get([`original_${currentTab.id}`, urlKey]);
    if (!originalResult[`original_${currentTab.id}`] && !originalResult[urlKey]) {
      await chrome.storage.local.set({
        [`original_${currentTab.id}`]: currentTab.title,
        [urlKey]: currentTab.title
      });
    }
    
    // Store custom name (by both tab ID and URL)
    await chrome.storage.local.set({
      [`tab_${currentTab.id}`]: newTitle
    });
    
    // Send message to background script to rename tab
    chrome.runtime.sendMessage({
      action: 'renameTab',
      tabId: currentTab.id,
      newTitle: newTitle
    }, (response) => {
      if (response && response.success) {
        showMessage('Tab renamed successfully!', 'success');
      } else {
        showMessage('Failed to rename tab', 'error');
      }
    });
  } catch (error) {
    console.error('Error renaming tab:', error);
    showMessage('Error: ' + error.message, 'error');
  }
});

// Reset tab button
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (!currentTab) {
    showMessage('No active tab found', 'error');
    return;
  }
  
  try {
    // Get original title
    const originalTitle = await getOriginalTitle(currentTab.id, currentTab.url);
    
    if (!originalTitle) {
      showMessage('No custom name to reset', 'error');
      return;
    }
    
    // Remove custom name from storage (both tab ID and URL-based)
    const urlKey = `url_${currentTab.url}`;
    const originalUrlKey = `original_url_${currentTab.url}`;
    await chrome.storage.local.remove([
      `tab_${currentTab.id}`, 
      `original_${currentTab.id}`,
      urlKey,
      originalUrlKey
    ]);
    
    // Send message to background script to reset tab
    chrome.runtime.sendMessage({
      action: 'resetTab',
      tabId: currentTab.id,
      originalTitle: originalTitle
    }, (response) => {
      if (response && response.success) {
        showMessage('Tab title reset!', 'success');
        document.getElementById('newTitle').value = '';
        document.getElementById('originalTitle').textContent = originalTitle;
      } else {
        showMessage('Failed to reset tab', 'error');
      }
    });
  } catch (error) {
    console.error('Error resetting tab:', error);
    showMessage('Error: ' + error.message, 'error');
  }
});

// Allow Enter key to rename
document.getElementById('newTitle').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('renameBtn').click();
  }
});
