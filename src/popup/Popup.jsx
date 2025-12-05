import React, { useState, useEffect } from "react";
import { saveScreenshot, getScreenshots, deleteScreenshot } from "../storage/db.js";

// Message types (matching background and content scripts)
const MESSAGE_TYPES = {
  CAPTURE_VISIBLE: 'capture_visible',
  CAPTURE_FULL_PAGE: 'capture_full_page',
  CAPTURE_SELECTION: 'capture_selection',
  INIT_SELECTION_MODE: 'init_selection_mode',
  SCREENSHOT_CAPTURED: 'screenshot_captured',
  CAPTURE_ERROR: 'capture_error'
};

export default function Popup() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureType, setCaptureType] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [captureTimeout, setCaptureTimeout] = useState(null);

  // Load screenshots on component mount
  useEffect(() => {
    loadScreenshots();
    
    // Test background script connection
    console.log('[POPUP] Testing background script connection...');
    chrome.runtime.sendMessage({ type: 'test_connection' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[POPUP] Background script connection failed:', chrome.runtime.lastError);
      } else {
        console.log('[POPUP] Background script connected successfully:', response);
      }
    });
    
    // Listen for messages from background script
    const messageListener = (message, sender, sendResponse) => {
      handleBackgroundMessage(message);
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    // Cleanup listener on unmount
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
      
      // Clear timeout if component unmounts
      if (captureTimeout) {
        clearTimeout(captureTimeout);
      }
    };
  }, []);

  /**
   * Load screenshots from storage
   */
  const loadScreenshots = async () => {
    try {
      const savedScreenshots = await getScreenshots({ limit: 10 });
      setScreenshots(savedScreenshots);
    } catch (error) {
      console.error('Error loading screenshots:', error);
      setError('Failed to load screenshots');
    }
  };

  /**
   * Handle messages from background script
   */
  const handleBackgroundMessage = async (message) => {
    console.log('[POPUP] Received message:', message.type, message);
    
    switch (message.type) {
      case MESSAGE_TYPES.SCREENSHOT_CAPTURED:
        await handleScreenshotCaptured(message.data);
        break;
        
      case MESSAGE_TYPES.CAPTURE_ERROR:
        handleCaptureError(message.error);
        break;
        
      default:
        console.warn('Unknown message type in popup:', message.type);
    }
  };

  /**
   * Handle successful screenshot capture
   */
  const handleScreenshotCaptured = async (screenshotData) => {
    try {
      // Clear timeout if it exists
      if (captureTimeout) {
        clearTimeout(captureTimeout);
        setCaptureTimeout(null);
      }
      
      setIsCapturing(false);
      setCaptureType(null);
      
      // Save to storage
      await saveScreenshot(screenshotData);
      
      // Reload screenshots list
      await loadScreenshots();
      
      setSuccess(`${screenshotData.type} screenshot captured successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error) {
      console.error('Error saving screenshot:', error);
      setError('Failed to save screenshot');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Handle capture error
   */
  const handleCaptureError = (errorMessage) => {
    // Clear timeout if it exists
    if (captureTimeout) {
      clearTimeout(captureTimeout);
      setCaptureTimeout(null);
    }
    
    setIsCapturing(false);
    setCaptureType(null);
    setError(errorMessage || 'Capture failed');
    setTimeout(() => setError(null), 3000);
  };

  /**
   * Start capture with timeout protection
   */
  const startCaptureWithTimeout = (type, messageType, timeoutMs = 30000) => {
    console.log('[POPUP] Starting capture:', type, messageType);
    setIsCapturing(true);
    setCaptureType(type);
    setError(null);

    // Set timeout to reset state if capture takes too long
    const timeout = setTimeout(() => {
      console.log('[POPUP] Capture timed out:', type);
      handleCaptureError('Capture timed out. Please try again.');
    }, timeoutMs);
    setCaptureTimeout(timeout);

    // Send the capture message
    console.log('[POPUP] Sending message to background:', messageType);
    chrome.runtime.sendMessage({ type: messageType }, async (response) => {
      console.log('[POPUP] Message response:', response);

      // Clear the timeout since we got a response
      clearTimeout(timeout);
      setCaptureTimeout(null);

      if (chrome.runtime.lastError) {
        console.error('[POPUP] Runtime error:', chrome.runtime.lastError);
        handleCaptureError('Failed to communicate with background script');
        return;
      }

      if (!response) {
        console.error('[POPUP] No response received');
        handleCaptureError('No response from background script');
        return;
      }

      if (!response.success) {
        console.error('[POPUP] Capture failed:', response.error);
        handleCaptureError(response.error || 'Capture failed');
        return;
      }

      // Handle successful screenshot capture
      if (response.type === MESSAGE_TYPES.SCREENSHOT_CAPTURED && response.data) {
        await handleScreenshotCaptured(response.data);
      } else if (messageType === MESSAGE_TYPES.INIT_SELECTION_MODE) {
        // Selection mode was initialized, close popup so user can select
        console.log('[POPUP] Selection mode initialized, user should select area on page');
        setIsCapturing(false);
        setCaptureType(null);
        setSuccess('Selection mode active. Go to the page and select an area.');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        // For other message types that don't return screenshot data immediately
        console.log('[POPUP] Response received:', response.message);
      }
    });
  };

  /**
   * Capture visible area
   */
  const captureVisible = () => {
    startCaptureWithTimeout('visible', MESSAGE_TYPES.CAPTURE_VISIBLE, 10000);
  };

  /**
   * Initiate selection mode - closes popup and lets user select on page
   */
  const captureSelection = async () => {
    try {
      // Get active tab first
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        setError('No active tab found');
        return;
      }

      // Check if we can inject into this tab (not chrome:// pages, etc.)
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        setError('Cannot capture on this page');
        return;
      }

      // Send message to content script directly via tabs API
      chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.INIT_SELECTION_MODE }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[POPUP] Content script error:', chrome.runtime.lastError);
          setError('Please refresh the page and try again');
          return;
        }

        if (response?.success) {
          // Close popup after selection mode is confirmed started
          window.close();
        } else {
          setError('Failed to start selection mode');
        }
      });
    } catch (err) {
      console.error('[POPUP] Selection error:', err);
      setError('Failed to start selection');
    }
  };

  /**
   * Delete screenshot
   */
  const handleDeleteScreenshot = async (screenshotId) => {
    try {
      await deleteScreenshot(screenshotId);
      await loadScreenshots();
      setSuccess('Screenshot deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      setError('Failed to delete screenshot');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Download screenshot
   */
  const downloadScreenshot = (screenshot) => {
    try {
      const link = document.createElement('a');
      link.href = screenshot.imageData;
      link.download = `snapdropper-${screenshot.type}-${new Date(screenshot.timestamp).getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('Screenshot downloaded');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Error downloading screenshot:', error);
      setError('Failed to download screenshot');
      setTimeout(() => setError(null), 3000);
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  /**
   * Truncate URL for display
   */
  const truncateUrl = (url, maxLength = 40) => {
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  };

  return (
    <div className="w-80 p-4 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">SnapDropper</h1>
        <p className="text-sm text-gray-600">Capture screenshots with ease</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-3 p-2 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      {/* Capture Status */}
      {isCapturing && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm font-medium text-blue-700">
              Capturing visible area...
            </span>
          </div>
        </div>
      )}

      {/* Capture Buttons */}
      <div className="mb-4 space-y-2">
        <button
          onClick={captureVisible}
          disabled={isCapturing}
          className={`w-full px-4 py-2 rounded font-medium transition-colors ${
            isCapturing
              ? 'bg-blue-400 text-white cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isCapturing ? 'Capturing...' : 'Capture Visible Area'}
        </button>

        <button
          onClick={captureSelection}
          disabled={isCapturing}
          className="w-full px-4 py-2 rounded font-medium transition-colors bg-purple-500 hover:bg-purple-600 text-white"
        >
          Capture Selection
        </button>
      </div>

      {/* Screenshots Gallery */}
      <div className="border-t pt-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Screenshots ({screenshots.length})</h3>
        
        {screenshots.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No screenshots yet. Capture your first one!</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={screenshot.imageData}
                    alt={`Screenshot from ${screenshot.url}`}
                    className="w-12 h-8 object-cover border rounded"
                  />
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">
                    {screenshot.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {truncateUrl(screenshot.url)}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span className={`px-1 rounded ${
                      screenshot.type === 'visible' ? 'bg-blue-100 text-blue-600' :
                      screenshot.type === 'full' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {screenshot.type}
                    </span>
                    <span>{formatTimestamp(screenshot.timestamp)}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex-shrink-0 flex space-x-1">
                  <button
                    onClick={() => downloadScreenshot(screenshot)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDeleteScreenshot(screenshot.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t text-center">
        <p className="text-xs text-gray-400">
          SnapDropper v0.0.1
        </p>
      </div>
    </div>
  );
}
