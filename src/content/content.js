console.log("[CONTENT] SnapDropper loaded");

const MESSAGE_TYPES = {
  CAPTURE_SELECTION: 'capture_selection',
  INIT_SELECTION_MODE: 'init_selection_mode',
  SCREENSHOT_CAPTURED: 'screenshot_captured',
  CAPTURE_ERROR: 'capture_error'
};

const STORAGE_KEY = 'screenshots';
const SETTINGS_KEY = 'settings';

// Default settings (must match db.js)
const DEFAULT_SETTINGS = {
  autoClipboard: true,
  autoSave: false,
  saveLocation: '',
  maxImages: 50
};

// Get settings from chrome storage
async function getSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  } catch (error) {
    console.error('[CONTENT] Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Convert base64 data URL to Blob
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: mime });
}

// Copy image to clipboard
async function copyToClipboard(imageData) {
  try {
    const blob = dataURLtoBlob(imageData);
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    console.log('[CONTENT] Screenshot copied to clipboard');
    return true;
  } catch (error) {
    console.error('[CONTENT] Failed to copy to clipboard:', error);
    return false;
  }
}

// Design system colors
const COLORS = {
  orange: '#FF6D1F',
  orangeLight: '#FF8A47',
  orangeDark: '#E55A0D',
  cream: '#F5E7C6',
  creamLight: '#FAF3E1',
  dark: '#222222',
  success: '#10b981',
  error: '#ef4444'
};

// Save screenshot to chrome.storage.local
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

    console.log('[CONTENT] Screenshot saved to chrome.storage, id:', screenshot.id);
    return { id: screenshot.id, imageData: screenshotData.imageData };
  } catch (error) {
    console.error('[CONTENT] Error saving screenshot:', error);
    throw error;
  }
}

class SnippingTool {
  constructor() {
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.isSelecting = false;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  start() {
    console.log('[CONTENT] Starting snipping tool');
    this.cleanup();
    this.createOverlay();
    this.addListeners();
  }

  // Create fullscreen overlay for selection
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'snapdropper-snip';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      cursor: crosshair;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;

    this.ctx = this.canvas.getContext('2d');
    this.drawDimmedScreen();

    const tooltip = document.createElement('div');
    tooltip.id = 'snapdropper-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${COLORS.dark};
      color: ${COLORS.creamLight};
      padding: 16px 28px;
      border-radius: 14px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      pointer-events: none;
      z-index: 2147483648;
      box-shadow: 0 8px 32px rgba(34, 34, 34, 0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      animation: snapdropper-fadeIn 200ms ease-out;
    `;

    // Add icon
    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${COLORS.orange}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 3h4M15 3h4M3 5v4M21 5v4M3 15v4M21 15v4M5 21h4M15 21h4"/>
      </svg>
    `;
    iconContainer.style.marginBottom = '4px';

    const mainText = document.createElement('div');
    mainText.textContent = 'Click and drag to select area';
    mainText.style.cssText = `
      font-size: 15px;
      font-weight: 600;
      color: ${COLORS.creamLight};
    `;

    const subText = document.createElement('div');
    subText.textContent = 'Press ESC to cancel';
    subText.style.cssText = `
      font-size: 12px;
      color: ${COLORS.cream};
      opacity: 0.7;
    `;

    tooltip.appendChild(iconContainer);
    tooltip.appendChild(mainText);
    tooltip.appendChild(subText);

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes snapdropper-fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes snapdropper-slideUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    this.overlay.appendChild(style);

    this.overlay.appendChild(this.canvas);
    this.overlay.appendChild(tooltip);
    document.body.appendChild(this.overlay);
  }

  // Draw semi-transparent dark overlay
  drawDimmedScreen() {
    // Fill with semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(34, 34, 34, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Draw selection rectangle with handles
  drawSelection() {
    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const w = Math.abs(this.endX - this.startX);
    const h = Math.abs(this.endY - this.startY);

    // Clear and redraw dimmed background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawDimmedScreen();

    // Cut out the selection area (make it clear)
    this.ctx.clearRect(x, y, w, h);

    // Draw selection border with orange accent
    this.ctx.strokeStyle = COLORS.orange;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);

    // Draw corner handles with orange color
    const handleSize = 10;
    this.ctx.fillStyle = COLORS.orange;

    // Round corner handles
    const drawHandle = (hx, hy) => {
      this.ctx.beginPath();
      this.ctx.arc(hx, hy, handleSize / 2, 0, Math.PI * 2);
      this.ctx.fill();
    };

    // Top-left
    drawHandle(x, y);
    // Top-right
    drawHandle(x + w, y);
    // Bottom-left
    drawHandle(x, y + h);
    // Bottom-right
    drawHandle(x + w, y + h);

    // Draw dimensions tooltip with modern styling
    if (w > 60 && h > 30) {
      const dimText = `${w} × ${h}`;
      this.ctx.font = '600 13px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
      const textWidth = this.ctx.measureText(dimText).width;
      const padding = 10;
      const tooltipWidth = textWidth + padding * 2;
      const tooltipHeight = 28;
      const tooltipX = x + w / 2 - tooltipWidth / 2;
      const tooltipY = y + h / 2 - tooltipHeight / 2;

      // Tooltip background with rounded corners
      this.ctx.fillStyle = COLORS.dark;
      this.ctx.beginPath();
      const radius = 8;
      this.ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, radius);
      this.ctx.fill();

      // Tooltip text
      this.ctx.fillStyle = COLORS.creamLight;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(dimText, x + w / 2, y + h / 2);
    }

    // Hide the center tooltip when selecting
    const tooltip = document.getElementById('snapdropper-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  // Add mouse and keyboard event listeners
  addListeners() {
    this.overlay.addEventListener('mousedown', this.boundMouseDown);
    this.overlay.addEventListener('mousemove', this.boundMouseMove);
    this.overlay.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('keydown', this.boundKeyDown);
    this.overlay.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Remove all event listeners
  removeListeners() {
    if (this.overlay) {
      this.overlay.removeEventListener('mousedown', this.boundMouseDown);
      this.overlay.removeEventListener('mousemove', this.boundMouseMove);
      this.overlay.removeEventListener('mouseup', this.boundMouseUp);
    }
    document.removeEventListener('keydown', this.boundKeyDown);
  }

  // Start selection on mouse down
  onMouseDown(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.endX = e.clientX;
    this.endY = e.clientY;
  }

  // Update selection while dragging
  onMouseMove(e) {
    if (!this.isSelecting) return;
    this.endX = e.clientX;
    this.endY = e.clientY;
    this.drawSelection();
  }

  // Finish selection and capture
  onMouseUp(e) {
    if (!this.isSelecting) return;
    this.isSelecting = false;

    const x = Math.min(this.startX, this.endX);
    const y = Math.min(this.startY, this.endY);
    const w = Math.abs(this.endX - this.startX);
    const h = Math.abs(this.endY - this.startY);

    // Minimum size check
    if (w < 10 || h < 10) {
      console.log('[CONTENT] Selection too small, canceling');
      this.cleanup();
      return;
    }

    console.log('[CONTENT] Selection complete:', { x, y, w, h });

    // Store reference to this
    const self = this;
    const selection = { x, y, width: w, height: h };

    // Hide overlay before capture
    this.overlay.style.display = 'none';

    // Small delay to ensure overlay is hidden, then capture
    setTimeout(() => {
      console.log('[CONTENT] Sending capture request to background...');

      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.CAPTURE_SELECTION,
        data: { selection }
      }, (response) => {
        console.log('[CONTENT] Got response from background:', response);

        if (chrome.runtime.lastError) {
          console.error('[CONTENT] Runtime error:', chrome.runtime.lastError);
          self.showErrorToast('Capture failed');
          self.cleanup();
          return;
        }

        if (response && response.success && response.data) {
          console.log('[CONTENT] Capture successful, saving to storage...');

          // Save to storage and handle auto-clipboard
          saveScreenshot(response.data)
            .then(async (result) => {
              console.log('[CONTENT] Screenshot saved successfully');

              // Check settings for auto-clipboard
              const settings = await getSettings();
              let copiedToClipboard = false;

              if (settings.autoClipboard) {
                copiedToClipboard = await copyToClipboard(result.imageData);
              }

              self.showSuccessToast(copiedToClipboard);
              self.cleanup();
            })
            .catch((err) => {
              console.error('[CONTENT] Failed to save:', err);
              self.showErrorToast('Failed to save screenshot');
              self.cleanup();
            });
        } else {
          console.error('[CONTENT] Capture failed:', response);
          self.showErrorToast(response?.error || 'Capture failed');
          self.cleanup();
        }
      });
    }, 100);
  }

  // Handle ESC key to cancel
  onKeyDown(e) {
    if (e.key === 'Escape') {
      console.log('[CONTENT] Selection canceled');
      this.cleanup();
    }
  }

  // Show success notification
  showSuccessToast(copiedToClipboard = false) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, ${COLORS.success} 0%, #059669 100%);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: snapdropper-slideUp 200ms ease-out;
    `;

    // Add checkmark icon
    const icon = document.createElement('span');
    icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    `;

    const text = document.createElement('span');
    text.textContent = copiedToClipboard ? 'Screenshot saved & copied!' : 'Screenshot saved!';

    toast.appendChild(icon);
    toast.appendChild(text);

    // Add animation keyframes if not already present
    if (!document.getElementById('snapdropper-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'snapdropper-toast-styles';
      style.textContent = `
        @keyframes snapdropper-slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes snapdropper-fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Animate out and remove
    setTimeout(() => {
      toast.style.animation = 'snapdropper-fadeOut 200ms ease-out forwards';
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  // Show error notification
  showErrorToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, ${COLORS.error} 0%, #dc2626 100%);
      color: white;
      padding: 14px 20px;
      border-radius: 12px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 8px 24px rgba(239, 68, 68, 0.35);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: snapdropper-slideUp 200ms ease-out;
    `;

    // Add error icon
    const icon = document.createElement('span');
    icon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `;

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);

    // Add animation keyframes if not already present
    if (!document.getElementById('snapdropper-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'snapdropper-toast-styles';
      style.textContent = `
        @keyframes snapdropper-slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes snapdropper-fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Animate out and remove
    setTimeout(() => {
      toast.style.animation = 'snapdropper-fadeOut 200ms ease-out forwards';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  // Remove overlay and cleanup
  cleanup() {
    this.removeListeners();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
    this.isSelecting = false;
  }
}

// Create singleton instance
const snippingTool = new SnippingTool();

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[CONTENT] Message received:', message.type);

  if (message.type === MESSAGE_TYPES.INIT_SELECTION_MODE) {
    snippingTool.start();
    sendResponse({ success: true });
    return true;
  }

  sendResponse({ success: false, error: 'Unknown message' });
  return false;
});
