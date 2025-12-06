import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getSettings, saveSettings, calculateMaxStorageCapacity } from "../storage/db.js";

// SVG Icons
const ArrowLeftIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const SettingsGearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const ImageStackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
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

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    onClick={onChange}
    disabled={disabled}
    style={{
      position: 'relative',
      display: 'inline-flex',
      height: '24px',
      width: '44px',
      alignItems: 'center',
      borderRadius: '9999px',
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background-color 200ms ease',
      backgroundColor: enabled ? 'var(--color-orange)' : 'var(--color-cream-dark)',
      opacity: disabled ? 0.6 : 1,
      flexShrink: 0
    }}
  >
    <span
      style={{
        display: 'inline-block',
        height: '18px',
        width: '18px',
        borderRadius: '9999px',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 200ms ease',
        transform: enabled ? 'translateX(23px)' : 'translateX(3px)'
      }}
    />
  </button>
);

// Setting Row Component
const SettingRow = ({ icon: Icon, label, description, children }) => (
  <div
    className="card"
    style={{
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}
  >
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-cream-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-orange)',
        flexShrink: 0
      }}
    >
      <Icon />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <label
        style={{
          fontSize: '14px',
          fontWeight: '500',
          color: 'var(--color-dark)',
          display: 'block'
        }}
      >
        {label}
      </label>
      <p
        style={{
          fontSize: '12px',
          color: 'var(--color-gray-400)',
          margin: '2px 0 0 0'
        }}
      >
        {description}
      </p>
    </div>
    {children}
  </div>
);

export default function Settings({ onBack }) {
  const [settings, setSettings] = useState({
    autoClipboard: true,
    autoSave: false,
    saveLocation: '',
    maxImages: 50
  });
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [savingKey, setSavingKey] = useState(null); // Track which setting is saving
  const [success, setSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Load settings and calculate max capacity on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [currentSettings, capacity] = await Promise.all([
          getSettings(),
          calculateMaxStorageCapacity()
        ]);
        setSettings(currentSettings);
        setMaxCapacity(capacity);
      } catch (err) {
        console.error('Error initializing settings:', err);
        setErrorMsg('Failed to load settings');
      }
    };
    init();
  }, []);

  const handleSettingChange = useCallback(async (key, value) => {
    // Optimistically update UI immediately
    setSettings(prev => ({ ...prev, [key]: value }));
    setSavingKey(key);
    setErrorMsg(null);

    try {
      // Validate maxImages value
      if (key === 'maxImages') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 10 || numValue > maxCapacity) {
          setErrorMsg(`Max images must be between 10 and ${maxCapacity}`);
          // Revert on validation error
          const currentSettings = await getSettings();
          setSettings(currentSettings);
          setTimeout(() => setErrorMsg(null), 3000);
          return;
        }
        value = numValue;
      }

      // Save to storage
      await saveSettings({ [key]: value });

      // Show brief success feedback
      setSuccess('Saved');
      setTimeout(() => setSuccess(null), 1500);
    } catch (err) {
      console.error('Error saving setting:', err);
      setErrorMsg('Failed to save');
      // Revert on error
      const currentSettings = await getSettings();
      setSettings(currentSettings);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSavingKey(null);
    }
  }, [maxCapacity]);

  // Generate max images options (10 to maxCapacity in steps of 10)
  const maxImagesOptions = useMemo(() => {
    const options = [];
    for (let i = 10; i <= maxCapacity; i += 10) {
      options.push(i);
    }
    // Ensure maxCapacity is included if not already
    if (options[options.length - 1] !== maxCapacity) {
      options.push(maxCapacity);
    }
    return options;
  }, [maxCapacity]);

  return (
    <div
      className="animate-fade-in"
      style={{
        width: '320px',
        padding: '16px',
        backgroundColor: 'var(--color-cream-light)'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px'
          }}
        >
          <button
            onClick={onBack}
            className="icon-btn"
            style={{
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-gray-600)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              width: 'auto'
            }}
            title="Go back"
          >
            <ArrowLeftIcon />
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Back</span>
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-orange) 0%, var(--color-orange-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 8px rgba(255, 109, 31, 0.25)'
            }}
          >
            <SettingsGearIcon />
          </div>
          <div>
            <h1
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--color-dark)',
                margin: 0
              }}
            >
              Settings
            </h1>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-gray-400)',
                margin: 0
              }}
            >
              Configure your preferences
            </p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="toast toast-success animate-fade-in" style={{ marginBottom: '12px' }}>
          <CheckIcon />
          {success}
        </div>
      )}

      {errorMsg && (
        <div className="toast toast-error animate-fade-in" style={{ marginBottom: '12px' }}>
          <AlertIcon />
          {errorMsg}
        </div>
      )}

      {/* Settings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Auto-clipboard Setting */}
        <SettingRow
          icon={ClipboardIcon}
          label="Auto-clipboard"
          description="Copy screenshots automatically"
        >
          <ToggleSwitch
            enabled={settings.autoClipboard}
            onChange={() => handleSettingChange('autoClipboard', !settings.autoClipboard)}
            disabled={savingKey === 'autoClipboard'}
          />
        </SettingRow>

        {/* Auto-save Setting */}
        <SettingRow
          icon={DownloadIcon}
          label="Auto-save"
          description="Save screenshots to your PC"
        >
          <ToggleSwitch
            enabled={settings.autoSave}
            onChange={() => handleSettingChange('autoSave', !settings.autoSave)}
            disabled={savingKey === 'autoSave'}
          />
        </SettingRow>

        {/* Max Images Setting */}
        <div
          className="card"
          style={{ padding: '14px 16px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '10px'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-cream-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-orange)',
                flexShrink: 0
              }}
            >
              <ImageStackIcon />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--color-dark)',
                  display: 'block'
                }}
              >
                Storage Limit
              </label>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-gray-400)',
                  margin: '2px 0 0 0'
                }}
              >
                Max screenshots to keep
              </p>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={settings.maxImages}
              onChange={(e) => handleSettingChange('maxImages', parseInt(e.target.value, 10))}
              disabled={savingKey === 'maxImages'}
              style={{
                width: '100%',
                padding: '10px 12px',
                paddingRight: '36px',
                backgroundColor: 'var(--color-cream-light)',
                border: '1.5px solid var(--color-cream-dark)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--color-dark)',
                appearance: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease'
              }}
            >
              {maxImagesOptions.map(num => (
                <option key={num} value={num}>
                  {num} images{num === maxCapacity ? ' (max)' : ''}
                </option>
              ))}
            </select>
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--color-gray-400)'
              }}
            >
              <ChevronDownIcon />
            </div>
          </div>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--color-gray-400)',
              margin: '8px 0 0 0'
            }}
          >
            Oldest screenshots removed when limit reached
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1.5px solid var(--color-cream-dark)'
        }}
      >
        <p
          style={{
            fontSize: '11px',
            color: 'var(--color-gray-400)',
            textAlign: 'center',
            margin: 0
          }}
        >
          Settings save automatically
        </p>
      </div>
    </div>
  );
}