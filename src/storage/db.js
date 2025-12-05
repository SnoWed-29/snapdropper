/**
 * Storage utilities for SnapDropper screenshots
 * Uses chrome.storage.local which is shared across all extension contexts
 */

const STORAGE_KEY = 'screenshots';

/**
 * Save a screenshot to storage
 */
async function saveScreenshot(screenshotData) {
  try {
    // Get existing screenshots
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const screenshots = result[STORAGE_KEY] || [];

    // Create screenshot object with unique id
    const screenshot = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      imageData: screenshotData.imageData,
      url: screenshotData.url,
      title: screenshotData.title,
      type: screenshotData.type,
      dimensions: screenshotData.dimensions,
      timestamp: screenshotData.timestamp || Date.now()
    };

    // Add new screenshot at the beginning
    screenshots.unshift(screenshot);

    // Keep only the last 50 screenshots to avoid storage limits
    const trimmed = screenshots.slice(0, 50);

    // Save back to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });

    console.log('[STORAGE] Screenshot saved, id:', screenshot.id);
    return screenshot.id;
  } catch (error) {
    console.error('[STORAGE] Error saving screenshot:', error);
    throw error;
  }
}

/**
 * Get all screenshots from storage
 */
async function getScreenshots(options = {}) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    let screenshots = result[STORAGE_KEY] || [];

    // Apply type filter if specified
    if (options.type) {
      screenshots = screenshots.filter(s => s.type === options.type);
    }

    // Apply limit if specified
    if (options.limit) {
      screenshots = screenshots.slice(0, options.limit);
    }

    return screenshots;
  } catch (error) {
    console.error('[STORAGE] Error getting screenshots:', error);
    throw error;
  }
}

/**
 * Delete a screenshot by ID
 */
async function deleteScreenshot(id) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const screenshots = result[STORAGE_KEY] || [];

    const filtered = screenshots.filter(s => s.id !== id);

    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    console.log('[STORAGE] Screenshot deleted, id:', id);
  } catch (error) {
    console.error('[STORAGE] Error deleting screenshot:', error);
    throw error;
  }
}

/**
 * Get screenshot by ID
 */
async function getScreenshotById(id) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const screenshots = result[STORAGE_KEY] || [];

    return screenshots.find(s => s.id === id);
  } catch (error) {
    console.error('[STORAGE] Error getting screenshot by ID:', error);
    throw error;
  }
}

/**
 * Clear all screenshots
 */
async function clearAllScreenshots() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    console.log('[STORAGE] All screenshots cleared');
  } catch (error) {
    console.error('[STORAGE] Error clearing screenshots:', error);
    throw error;
  }
}

export {
  saveScreenshot,
  getScreenshots,
  deleteScreenshot,
  getScreenshotById,
  clearAllScreenshots
};
