import React, { useState, useEffect } from "react";
import { saveScreenshot, getScreenshots, deleteScreenshot, getSettings } from "../storage/db.js";
import Gallery from "./Gallery.jsx";
import Settings from "./Settings.jsx";

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

// Message types (matching background and content scripts)
const MESSAGE_TYPES = {
  CAPTURE_VISIBLE: 'capture_visible',
  CAPTURE_FULL_PAGE: 'capture_full_page',
  CAPTURE_SELECTION: 'capture_selection',
  INIT_SELECTION_MODE: 'init_selection_mode',
  SCREENSHOT_CAPTURED: 'screenshot_captured',
  CAPTURE_ERROR: 'capture_error'
};

// SVG Icons as components
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const SelectionIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3h4M15 3h4M3 5v4M21 5v4M3 15v4M21 15v4M5 21h4M15 21h4"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const ImageIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export default function Popup() {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'gallery', or 'settings'
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

  // Load screenshots from storage (only last 2 for main view)
  const loadScreenshots = async () => {
    try {
      const savedScreenshots = await getScreenshots({ limit: 2 });
      setScreenshots(savedScreenshots);
    } catch (error) {
      console.error('Error loading screenshots:', error);
      setError('Failed to load screenshots');
    }
  };

  // Handle messages from background script
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

      // Check settings for auto-clipboard
      const settings = await getSettings();
      if (settings.autoClipboard) {
        try {
          const blob = dataURLtoBlob(screenshotData.imageData);
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          console.log('[POPUP] Screenshot automatically copied to clipboard');
        } catch (clipboardError) {
          console.warn('[POPUP] Failed to auto-copy to clipboard:', clipboardError);
        }
      }

      // Reload screenshots list
      await loadScreenshots();

      const successMessage = settings.autoClipboard 
        ? 'Screenshot captured and copied!' 
        : 'Screenshot captured!';
      setSuccess(successMessage);
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error saving screenshot:', error);
      setError('Failed to save screenshot');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle capture error
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

  // Start capture with timeout protection
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

  // Capture visible area
  const captureVisible = () => {
    startCaptureWithTimeout('visible', MESSAGE_TYPES.CAPTURE_VISIBLE, 10000);
  };

  // Start selection mode
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

  // Delete screenshot
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

  // Copy screenshot to clipboard
  const copyToClipboard = async (screenshot) => {
    try {
      const blob = dataURLtoBlob(screenshot.imageData);
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      setSuccess('Copied to clipboard');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Download screenshot
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
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Otherwise show date
    return date.toLocaleDateString();
  };

  /**
   * Truncate URL for display
   */
  const truncateUrl = (url, maxLength = 35) => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      return domain.length > maxLength ? domain.substring(0, maxLength) + '...' : domain;
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  /**
   * Get badge class for screenshot type
   */
  const getBadgeClass = (type) => {
    switch (type) {
      case 'visible': return 'badge badge-visible';
      case 'full': return 'badge badge-full';
      default: return 'badge badge-selection';
    }
  };

  // Render gallery if in gallery view
  if (currentView === 'gallery') {
    return <Gallery onBack={() => setCurrentView('main')} />;
  }

  // Render settings if in settings view
  if (currentView === 'settings') {
    return <Settings onBack={() => setCurrentView('main')} />;
  }

  return (
    <div
      className="animate-fade-in"
      style={{
        width: '320px',
        padding: '16px',
        maxHeight: '440px',
        overflowY: 'auto',
        backgroundColor: 'var(--color-cream-light)'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--color-dark)',
              margin: 0
            }}>
              SnapDropper
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: '500',
              color: 'var(--color-gray-400)',
              backgroundColor: 'var(--color-cream)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              v0.0.1
            </span>
          </div>
          <button
            onClick={() => setCurrentView('settings')}
            className="icon-btn"
            style={{
              padding: '8px',
              color: 'var(--color-gray-600)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease'
            }}
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-gray-600)',
          margin: 0
        }}>
          Capture and manage screenshots
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="toast toast-error animate-fade-in" style={{ marginBottom: '12px' }}>
          <AlertIcon />
          {error}
        </div>
      )}

      {success && (
        <div className="toast toast-success animate-fade-in" style={{ marginBottom: '12px' }}>
          <CheckIcon />
          {success}
        </div>
      )}

      {/* Capture Status */}
      {isCapturing && (
        <div className="toast toast-info animate-fade-in" style={{ marginBottom: '12px' }}>
          <div className="spinner" />
          <span>Capturing visible area...</span>
        </div>
      )}

      {/* Capture Buttons */}
      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={captureVisible}
          disabled={isCapturing}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px 16px' }}
        >
          <CameraIcon />
          {isCapturing ? 'Capturing...' : 'Capture Visible Area'}
        </button>

        <button
          onClick={captureSelection}
          disabled={isCapturing}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '14px 16px' }}
        >
          <SelectionIcon />
          Select Area to Capture
        </button>
      </div>

      {/* Recent Screenshots */}
      <div style={{
        borderTop: '1.5px solid var(--color-cream-dark)',
        paddingTop: '14px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--color-dark)',
            margin: 0
          }}>
            Recent Screenshots
          </h3>
          {screenshots.length > 0 && (
            <button
              onClick={() => setCurrentView('gallery')}
              className="btn-ghost"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-orange)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 150ms ease'
              }}
            >
              View All
              <ChevronRightIcon />
            </button>
          )}
        </div>

        {screenshots.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            <ImageIcon />
            <p className="empty-state-text">
              No screenshots yet.<br />
              Capture your first one!
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="card animate-slide-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px'
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ flexShrink: 0 }}>
                    <img
                      src={screenshot.imageData}
                      alt={`Screenshot from ${screenshot.url}`}
                      className="thumbnail"
                      style={{
                        width: '48px',
                        height: '36px'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <p style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: 'var(--color-dark)',
                      margin: '0 0 2px 0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {truncateUrl(screenshot.url)}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span className={getBadgeClass(screenshot.type)}>
                        {screenshot.type}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--color-gray-400)'
                      }}>
                        {formatTimestamp(screenshot.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    flexShrink: 0,
                    gap: '2px'
                  }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(screenshot); }}
                      className="icon-btn icon-btn-success"
                      title="Copy to clipboard"
                    >
                      <CopyIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadScreenshot(screenshot); }}
                      className="icon-btn icon-btn-primary"
                      title="Download"
                    >
                      <DownloadIcon />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteScreenshot(screenshot.id); }}
                      className="icon-btn icon-btn-danger"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {screenshots.length >= 2 && (
              <button
                onClick={() => setCurrentView('gallery')}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '10px',
                  fontSize: '13px',
                  color: 'var(--color-gray-600)'
                }}
              >
                View All Screenshots
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
