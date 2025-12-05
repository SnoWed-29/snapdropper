# SnapDropper

A Chrome browser extension for screenshot capture with Windows Snipping Tool-style selection.

## Features

- **Capture Visible Area** - Instantly capture the visible portion of any webpage
- **Selection Capture** - Windows Snipping Tool-style click-and-drag selection
  - Fullscreen overlay with crosshair cursor
  - Live selection preview with blue border and corner handles
  - Dimension display (width × height)
  - ESC to cancel
- **Screenshot Gallery** - View, download, and manage captured screenshots
- **Toast Notifications** - Visual feedback on capture success/failure

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
├── popup/Popup.jsx      # Extension popup UI
├── background/          # Service worker for capture API
├── content/             # Selection overlay (SnippingTool class)
└── storage/db.js        # chrome.storage.local utilities
```

## Permissions

- `tabs` - Access tab information
- `activeTab` - Capture active tab
- `storage` - Store screenshots
- `scripting` - Inject content scripts
- `<all_urls>` - Capture any webpage

## Limitations

- Cannot capture chrome://, edge://, or about: pages
- Screenshots stored locally (max 50 to avoid storage limits)
- Requires page refresh if extension is updated while page is open

## License

MIT
