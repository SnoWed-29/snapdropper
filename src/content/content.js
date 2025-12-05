/**
 * SnapDropper Content Script
 * Selection capture like Windows Snipping Tool
 */

console.log("[CONTENT] SnapDropper loaded");

const MESSAGE_TYPES = {
  CAPTURE_SELECTION: 'capture_selection',
  INIT_SELECTION_MODE: 'init_selection_mode',
  SCREENSHOT_CAPTURED: 'screenshot_captured',
  CAPTURE_ERROR: 'capture_error'
};

const STORAGE_KEY = 'screenshots';

/**
 * Save screenshot using chrome.storage.local (shared across extension)
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

    // Keep only the last 50 screenshots
    const trimmed = screenshots.slice(0, 50);

    // Save back to storage
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });

    console.log('[CONTENT] Screenshot saved to chrome.storage, id:', screenshot.id);
    return screenshot.id;
  } catch (error) {
    console.error('[CONTENT] Error saving screenshot:', error);
    throw error;
  }
}

/**
 * Selection overlay - Windows Snipping Tool style
 */
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

  createOverlay() {
    // Create full-screen overlay
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

    // Create canvas for drawing selection
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

    // Instructions tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'snapdropper-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      pointer-events: none;
      z-index: 2147483648;
    `;
    tooltip.textContent = 'Click and drag to select area • ESC to cancel';

    this.overlay.appendChild(this.canvas);
    this.overlay.appendChild(tooltip);
    document.body.appendChild(this.overlay);
  }

  drawDimmedScreen() {
    // Fill with semi-transparent dark overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

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

    // Draw selection border
    this.ctx.strokeStyle = '#0078d4';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, w, h);

    // Draw corner handles
    const handleSize = 8;
    this.ctx.fillStyle = '#0078d4';
    // Top-left
    this.ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
    // Top-right
    this.ctx.fillRect(x + w - handleSize/2, y - handleSize/2, handleSize, handleSize);
    // Bottom-left
    this.ctx.fillRect(x - handleSize/2, y + h - handleSize/2, handleSize, handleSize);
    // Bottom-right
    this.ctx.fillRect(x + w - handleSize/2, y + h - handleSize/2, handleSize, handleSize);

    // Draw dimensions tooltip
    if (w > 50 && h > 20) {
      const dimText = `${w} × ${h}`;
      this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const textWidth = this.ctx.measureText(dimText).width;
      this.ctx.fillRect(x + w/2 - textWidth/2 - 8, y + h/2 - 10, textWidth + 16, 20);
      this.ctx.fillStyle = 'white';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(dimText, x + w/2, y + h/2);
    }

    // Hide the center tooltip when selecting
    const tooltip = document.getElementById('snapdropper-tooltip');
    if (tooltip) tooltip.style.display = 'none';
  }

  addListeners() {
    this.overlay.addEventListener('mousedown', this.boundMouseDown);
    this.overlay.addEventListener('mousemove', this.boundMouseMove);
    this.overlay.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('keydown', this.boundKeyDown);
    this.overlay.addEventListener('contextmenu', e => e.preventDefault());
  }

  removeListeners() {
    if (this.overlay) {
      this.overlay.removeEventListener('mousedown', this.boundMouseDown);
      this.overlay.removeEventListener('mousemove', this.boundMouseMove);
      this.overlay.removeEventListener('mouseup', this.boundMouseUp);
    }
    document.removeEventListener('keydown', this.boundKeyDown);
  }

  onMouseDown(e) {
    this.isSelecting = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.endX = e.clientX;
    this.endY = e.clientY;
  }

  onMouseMove(e) {
    if (!this.isSelecting) return;
    this.endX = e.clientX;
    this.endY = e.clientY;
    this.drawSelection();
  }

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
          console.log('[CONTENT] Capture successful, saving to IndexedDB...');

          // Save to IndexedDB
          saveScreenshot(response.data)
            .then(() => {
              console.log('[CONTENT] Screenshot saved successfully');
              self.showSuccessToast();
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

  onKeyDown(e) {
    if (e.key === 'Escape') {
      console.log('[CONTENT] Selection canceled');
      this.cleanup();
    }
  }

  showSuccessToast() {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = 'Screenshot saved!';
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2000);
  }

  showErrorToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

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
