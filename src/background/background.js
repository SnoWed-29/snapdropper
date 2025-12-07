// Background service worker for screenshot capture
console.log('[BACKGROUND] Service worker loaded');

// Message types for communication
const MESSAGE_TYPES = {
  CAPTURE_VISIBLE: 'capture_visible',
  CAPTURE_FULL_PAGE: 'capture_full_page',
  CAPTURE_SELECTION: 'capture_selection',
  INIT_SELECTION_MODE: 'init_selection_mode',
  SCREENSHOT_CAPTURED: 'screenshot_captured',
  CAPTURE_ERROR: 'capture_error'
};

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BACKGROUND] Message received:', message.type);

  // Handle each message type
  if (message.type === MESSAGE_TYPES.CAPTURE_VISIBLE) {
    handleCaptureVisible(sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.type === MESSAGE_TYPES.INIT_SELECTION_MODE) {
    handleInitSelection(sendResponse);
    return true;
  }

  if (message.type === MESSAGE_TYPES.CAPTURE_SELECTION) {
    handleCaptureSelection(message.data, sendResponse);
    return true;
  }

  if (message.type === 'test_connection') {
    sendResponse({ success: true, message: 'Connected' });
    return false;
  }

  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

// Capture visible area of active tab
async function handleCaptureVisible(sendResponse) {
  try {
    console.log('[BACKGROUND] Capturing visible area...');

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    console.log('[BACKGROUND] Active tab:', tab.id, tab.url);

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    });

    console.log('[BACKGROUND] Capture complete, size:', dataUrl.length);

    // Handle auto-save
    await handleAutoSave({
      imageData: dataUrl,
      url: tab.url,
      title: tab.title,
      type: 'visible',
      timestamp: Date.now()
    });

    // Send back the result
    sendResponse({
      success: true,
      type: MESSAGE_TYPES.SCREENSHOT_CAPTURED,
      data: {
        imageData: dataUrl,
        url: tab.url,
        title: tab.title,
        type: 'visible',
        timestamp: Date.now(),
        dimensions: { width: 0, height: 0 } // Will be determined by image
      }
    });

  } catch (error) {
    console.error('[BACKGROUND] Capture error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to capture screenshot'
    });
  }
}

// Initialize selection mode on content script
async function handleInitSelection(sendResponse) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    // Send message to content script to start selection
    await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.INIT_SELECTION_MODE });
    sendResponse({ success: true, message: 'Selection mode started' });

  } catch (error) {
    console.error('[BACKGROUND] Selection init error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Capture and crop selection area
async function handleCaptureSelection(selectionData, sendResponse) {
  try {
    console.log('[BACKGROUND] Capturing selection:', selectionData.selection);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Capture visible area first
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    console.log('[BACKGROUND] Captured visible tab, cropping...');

    // Crop to selection using OffscreenCanvas
    const croppedData = await cropImage(dataUrl, selectionData.selection);
    console.log('[BACKGROUND] Cropped image, returning to content script...');

    // Check settings for auto-save
    await handleAutoSave({
      imageData: croppedData,
      url: tab.url,
      title: tab.title,
      type: 'selection',
      timestamp: Date.now()
    });

    // Return screenshot data to content script for saving
    sendResponse({
      success: true,
      type: MESSAGE_TYPES.SCREENSHOT_CAPTURED,
      data: {
        imageData: croppedData,
        url: tab.url,
        title: tab.title,
        type: 'selection',
        timestamp: Date.now(),
        dimensions: {
          width: selectionData.selection.width,
          height: selectionData.selection.height
        }
      }
    });

  } catch (error) {
    console.error('[BACKGROUND] Selection capture error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Get user settings from storage
async function getSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    return {
      autoClipboard: true,
      autoSave: false,
      saveLocation: '',
      maxImages: 50,
      ...result.settings
    };
  } catch (error) {
    console.error('[BACKGROUND] Error getting settings:', error);
    return {
      autoClipboard: true,
      autoSave: false,
      saveLocation: '',
      maxImages: 50
    };
  }
}

// Handle auto-save feature
async function handleAutoSave(screenshotData) {
  try {
    const settings = await getSettings();
    
    if (settings.autoSave) {
      console.log('[BACKGROUND] Auto-save enabled, downloading screenshot...');
      
      // Generate filename
      const timestamp = new Date(screenshotData.timestamp).toISOString().replace(/[:.]/g, '-');
      const filename = `snapdropper-${screenshotData.type}-${timestamp}.png`;
      
      // Use chrome.downloads API to save to PC
      chrome.downloads.download({
        url: screenshotData.imageData,
        filename: filename,
        saveAs: false // Save directly without prompt
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('[BACKGROUND] Auto-save failed:', chrome.runtime.lastError);
        } else {
          console.log('[BACKGROUND] Auto-save successful, download ID:', downloadId);
        }
      });
    }
  } catch (error) {
    console.error('[BACKGROUND] Auto-save error:', error);
  }
}

// Crop image using OffscreenCanvas
async function cropImage(dataUrl, selection) {
  const canvas = new OffscreenCanvas(selection.width, selection.height);
  const ctx = canvas.getContext('2d');

  // Load image
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  // Draw cropped portion
  ctx.drawImage(
    bitmap,
    selection.x, selection.y, selection.width, selection.height,
    0, 0, selection.width, selection.height
  );

  // Convert back to data URL
  const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(resultBlob);
  });
}
