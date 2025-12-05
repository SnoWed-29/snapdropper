import React, { useState, useEffect } from "react";
import { getScreenshots, deleteScreenshot } from "../storage/db.js";

/**
 * Convert a Data URL to a Blob (used for clipboard)
 */
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

// SVG Icons as components
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

const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
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

const GalleryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

export default function Gallery({ onBack }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadAllScreenshots();
  }, []);

  /**
   * Load all screenshots from storage
   */
  const loadAllScreenshots = async () => {
    try {
      setLoading(true);
      const allScreenshots = await getScreenshots({ limit: 1000 }); // Load all
      setScreenshots(allScreenshots);
    } catch (error) {
      console.error('Error loading screenshots:', error);
      setError('Failed to load screenshots');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy screenshot to clipboard
   */
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
   * Delete screenshot
   */
  const handleDeleteScreenshot = async (screenshotId) => {
    try {
      await deleteScreenshot(screenshotId);
      await loadAllScreenshots();
      setSuccess('Screenshot deleted');
      setTimeout(() => setSuccess(null), 2000);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      setError('Failed to delete screenshot');
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
  const truncateUrl = (url, maxLength = 30) => {
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
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          onClick={onBack}
          className="icon-btn"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-cream)',
            color: 'var(--color-dark)'
          }}
          title="Back to main"
        >
          <ArrowLeftIcon />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GalleryIcon />
            <h1 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--color-dark)',
              margin: 0
            }}>
              Gallery
            </h1>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-gray-600)',
            margin: '2px 0 0 0'
          }}>
            {loading ? 'Loading...' : `${screenshots.length} screenshot${screenshots.length !== 1 ? 's' : ''}`}
          </p>
        </div>
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

      {/* Loading */}
      {loading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: '12px'
        }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }} />
          <span style={{
            fontSize: '13px',
            color: 'var(--color-gray-600)'
          }}>
            Loading screenshots...
          </span>
        </div>
      ) : (
        <>
          {/* Screenshots List */}
          {screenshots.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <ImageIcon />
              <p className="empty-state-text" style={{ marginBottom: '12px' }}>
                No screenshots yet
              </p>
              <button
                onClick={onBack}
                className="btn btn-primary"
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                Capture your first one
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '280px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {screenshots.map((screenshot, index) => (
                <div
                  key={screenshot.id}
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px',
                    animation: `slideIn 200ms ease-out ${index * 30}ms both`
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ flexShrink: 0 }}>
                    <img
                      src={screenshot.imageData}
                      alt={`Screenshot from ${screenshot.url}`}
                      className="thumbnail"
                      style={{
                        width: '52px',
                        height: '40px'
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
          )}
        </>
      )}

      {/* Footer */}
      <div style={{
        marginTop: '14px',
        paddingTop: '12px',
        borderTop: '1.5px solid var(--color-cream-dark)',
        textAlign: 'center'
      }}>
        <button
          onClick={onBack}
          className="btn btn-ghost"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            color: 'var(--color-gray-600)'
          }}
        >
          <ArrowLeftIcon />
          Back to Capture
        </button>
      </div>
    </div>
  );
}
