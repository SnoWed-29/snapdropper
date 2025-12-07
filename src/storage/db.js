// Storage utilities for screenshots and settings using chrome.storage.local

const STORAGE_KEY = 'screenshots';
const SETTINGS_KEY = 'settings';

// Default settings
const DEFAULT_SETTINGS = {
  autoClipboard: true,
  autoSave: false,
  saveLocation: '',
  maxImages: 50 // Will be calculated based on storage quota
};

// Save screenshot to storage
async function saveScreenshot(screenshotData) {
  try {
    // Get existing screenshots and settings
    const result = await chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY]);
    const screenshots = result[STORAGE_KEY] || [];
    const settings = { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };

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

    // Keep only the specified number of screenshots based on settings
    const trimmed = screenshots.slice(0, settings.maxImages);

    // Save back to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });

    console.log('[STORAGE] Screenshot saved, id:', screenshot.id);
    return screenshot.id;
  } catch (error) {
    console.error('[STORAGE] Error saving screenshot:', error);
    throw error;
  }
}

// Get all screenshots from storage
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

// Delete screenshot by ID
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

// Get screenshot by ID
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

// Clear all screenshots
async function clearAllScreenshots() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    console.log('[STORAGE] All screenshots cleared');
  } catch (error) {
    console.error('[STORAGE] Error clearing screenshots:', error);
    throw error;
  }
}

// Get user settings
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  } catch (error) {
    console.error('[STORAGE] Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Save user settings
async function saveSettings(settings) {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await chrome.storage.local.set({ [SETTINGS_KEY]: updatedSettings });
    console.log('[STORAGE] Settings saved:', updatedSettings);
    return updatedSettings;
  } catch (error) {
    console.error('[STORAGE] Error saving settings:', error);
    throw error;
  }
}

// Calculate max storage capacity for images
async function calculateMaxStorageCapacity() {
  try {
    const quota = await chrome.storage.local.getBytesInUse();
    // Chrome storage local has ~5MB limit, estimate ~100KB per screenshot
    // This gives us roughly 50 screenshots, but can be adjusted
    const estimatedCapacity = Math.floor((5 * 1024 * 1024) / (100 * 1024));
    return Math.max(10, Math.min(estimatedCapacity, 100)); // Between 10-100 images
  } catch (error) {
    console.error('[STORAGE] Error calculating storage capacity:', error);
    return 50; // Default fallback
  }
}

export {
  saveScreenshot,
  getScreenshots,
  deleteScreenshot,
  getScreenshotById,
  clearAllScreenshots,
  getSettings,
  saveSettings,
  calculateMaxStorageCapacity,
  DEFAULT_SETTINGS
};
