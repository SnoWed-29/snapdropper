# SnapDropper

A Chrome browser extension for screenshot capture with Windows Snipping Tool-style selection, featuring a comprehensive gallery and customizable settings.

## Features

### Screenshot Capture
- **Capture Visible Area** - Instantly capture the visible portion of any webpage
- **Selection Capture** - Windows Snipping Tool-style click-and-drag selection
  - Fullscreen overlay with crosshair cursor
  - Live selection preview with dimension display (width × height)
  - ESC to cancel selection
  - Success/error toast notifications

### Gallery & Management
- **Screenshot Gallery** - Browse all captured screenshots with thumbnails
- **Copy to Clipboard** - One-click copy for easy pasting
- **Download** - Save screenshots to your local system
- **Delete Management** - Remove unwanted screenshots
- **Auto-organize** - Screenshots automatically sorted by capture time

### Settings & Customization
- **Auto-clipboard** - Automatically copy screenshots to clipboard
- **Auto-save** - Automatically download screenshots
- **Storage Management** - Configurable max screenshots limit (default: 50)
- **Dynamic Storage** - Smart storage capacity calculation
- **Persistent Settings** - Preferences saved across browser sessions

### Design
- **Modern UI** - Clean interface with Tailwind CSS v4
- **Color Scheme** - Cream Light (#FAF3E1), Orange (#FF6D1F), Dark (#222222)
- **Responsive** - Optimized for extension popup constraints

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

## Usage

1. Click the SnapDropper extension icon
2. Choose capture mode:
   - **Capture Visible Area** - Takes screenshot immediately
   - **Capture Selection** - Opens selection overlay on the page
3. For selection mode:
   - Click and drag to select the area you want
   - Release to capture
   - Press ESC to cancel
4. Screenshots appear in the popup gallery
5. Download or delete screenshots as needed

## Development

```bash
# Install dependencies
npm install

# Development server (popup only)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool with multi-entry configuration
- **Tailwind CSS v4** - Styling
- **Chrome Extension Manifest V3** - Extension platform

## Architecture

```
src/
├── popup/
│   ├── Popup.jsx        # Main extension popup UI with navigation
│   ├── Gallery.jsx      # Screenshot gallery with management features
│   └── Settings.jsx     # Configuration and preferences
├── background/          # Service worker for capture API
├── content/             # Selection overlay (SnippingTool class)
├── storage/db.js        # chrome.storage.local utilities & settings
└── utils/              # Shared utilities and helpers
public/
└── manifest.json        # Extension manifest (V3)
```

## Permissions

- `tabs` - Access tab information for capture
- `activeTab` - Capture screenshots of active tab
- `storage` - Store screenshots and settings locally
- `scripting` - Inject selection overlay content scripts
- `downloads` - Save screenshots to local file system
- `<all_urls>` - Capture screenshots on any accessible webpage

## Limitations

- Cannot capture chrome://, edge://, or about: pages (browser security)
- Screenshots stored in extension's local storage (configurable limit, default 50)
- Content script requires page refresh if extension is updated while page is open
- Selection capture requires user interaction (click and drag)
- Large screenshots may impact storage quota

## License

MIT
