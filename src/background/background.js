/**
 * SnapDropper Background Service Worker
 * Handles screenshot capture using Chrome Extension APIs
 */

console.log("[BACKGROUND] SnapDropper service worker loaded");

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

/**
 * Handle visible area capture
 */
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

/**
 * Handle selection mode initialization
 */
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

/**
 * Handle selection capture - captures and crops, returns data to content script for saving
 */
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

/**
 * Crop image to selection
 */
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
