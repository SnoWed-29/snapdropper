/**
 * Utility functions for screenshot capture and processing
 */

/**
 * Convert blob to base64 data URL
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert data URL to blob
 * @param {string} dataUrl - Data URL to convert
 * @returns {Promise<Blob>} Blob object
 */
export function dataURLToBlob(dataUrl) {
  return new Promise((resolve) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    resolve(new Blob([u8arr], { type: mime }));
  });
}

/**
 * Get image dimensions from data URL
 * @param {string} dataUrl - Image data URL
 * @returns {Promise<{width: number, height: number}>} Image dimensions
 */
export function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.src = dataUrl;
  });
}

/**
 * Resize image to maximum dimensions while maintaining aspect ratio
 * @param {string} dataUrl - Original image data URL
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<string>} Resized image data URL
 */
export function resizeImage(dataUrl, maxWidth = 1920, maxHeight = 1080) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);
        
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

/**
 * Crop image to specified region
 * @param {string} dataUrl - Original image data URL
 * @param {Object} region - Crop region {x, y, width, height}
 * @returns {Promise<string>} Cropped image data URL
 */
export function cropImage(dataUrl, region) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = region.width;
      canvas.height = region.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        region.x, region.y, region.width, region.height, // Source
        0, 0, region.width, region.height // Destination
      );
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

/**
 * Generate filename for screenshot
 * @param {string} type - Capture type (visible, full, selection)
 * @param {string} url - Page URL
 * @param {number} timestamp - Timestamp
 * @returns {string} Generated filename
 */
export function generateFilename(type, url, timestamp = Date.now()) {
  try {
    const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const date = new Date(timestamp).toISOString().split('T')[0];
    const time = new Date(timestamp).toTimeString().split(' ')[0].replace(/:/g, '-');
    
    return `snapdropper_${type}_${domain}_${date}_${time}.png`;
  } catch {
    // Fallback if URL parsing fails
    return `snapdropper_${type}_${timestamp}.png`;
  }
}

/**
 * Generate metadata object for screenshot
 * @param {string} url - Page URL
 * @param {string} title - Page title
 * @param {string} type - Capture type
 * @param {Object} dimensions - Image dimensions
 * @param {Object} selection - Selection area (optional)
 * @returns {Object} Metadata object
 */
export function generateMetadata(url, title, type, dimensions, selection = null) {
  return {
    url,
    title: title || 'Untitled',
    type,
    timestamp: Date.now(),
    dimensions,
    selectionArea: selection,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };
}

/**
 * Validate screenshot data
 * @param {Object} screenshotData - Screenshot data to validate
 * @returns {boolean} True if valid
 */
export function validateScreenshotData(screenshotData) {
  const requiredFields = ['imageData', 'url', 'type', 'timestamp'];
  
  for (const field of requiredFields) {
    if (!screenshotData[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Validate capture type
  const validTypes = ['visible', 'full', 'selection'];
  if (!validTypes.includes(screenshotData.type)) {
    console.error(`Invalid capture type: ${screenshotData.type}`);
    return false;
  }
  
  // Validate image data format
  if (!screenshotData.imageData.startsWith('data:image/')) {
    console.error('Invalid image data format');
    return false;
  }
  
  return true;
}

/**
 * Calculate file size from data URL
 * @param {string} dataUrl - Image data URL
 * @returns {number} File size in bytes
 */
export function calculateFileSize(dataUrl) {
  try {
    const base64 = dataUrl.split(',')[1];
    const padding = (base64.match(/=/g) || []).length;
    return Math.round((base64.length * 0.75) - padding);
  } catch {
    return 0;
  }
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}