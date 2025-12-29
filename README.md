# Thymer Web Capture

A Chrome extension + Thymer plugin combo for quickly capturing web links, highlights, and pages to your Thymer workspace.

## Features

- **Smart Capture:**
  - Captures selected text (when a selection exists)
  - Falls back to a clean Title + URL capture (when nothing is selected)

- **Flexible Destinations:**
  - Send to Journal (today's entry)
  - Search and select any page in your workspace

- **UI/UX:**
  - Compact destination selector buttons
  - Respects browser theme (light/dark mode)

- **Tags:**
  - Autocomplete from existing tags in your workspace
  - Create new tags on the fly
  - Default tag setting (defaults to `#web-capture`)
  - Recent tags (last 3) shown for quick reuse

- **Recent Pages:**
  - Recent pages (last 3) shown when choosing a specific page

- **Timestamping:**
  - Adds a timestamp when sending to a specific page (not needed for Journal)

- **Keyboard Shortcuts:**
  - `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Windows) - Web capture (selection if present, otherwise link)

- **Context Menu:**
  - Right-click to send selection, link, image, or page to Thymer

## Installation

### 1. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this project

### 2. Install the Thymer Plugin

1. Open Thymer in your browser
2. Press `Cmd+P` / `Ctrl+P` to open the Command Palette
3. Select "Plugins"
4. Click "Create Plugin" to create a new Global Plugin
5. In the Edit Code dialog:
   - **Custom Code tab:** Paste the contents of `thymer-plugin/plugin.js`
   - **Configuration tab:** Paste the contents of `thymer-plugin/plugin.json`
6. Click Save

### 3. Generate Icons (Optional)

1. Open `chrome-extension/icons/generate-icons.html` in a browser
2. Right-click each canvas and save as:
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

Or create your own 16x16, 48x48, and 128x128 PNG icons.

## Usage

### Basic Capture

1. Make sure Thymer is open in a browser tab
2. Navigate to any webpage you want to capture
3. Click the Thymer Web Capture extension icon (or use `Cmd+Shift+T`)
4. Choose destination (Journal or specific page)
5. (Optional) Select text on the page before sending to include it in the capture
6. Add optional tags
7. Click "Send to Thymer"

### Web Capture

Use `Cmd+Shift+Y` / `Ctrl+Shift+Y` to instantly capture the current selection (or link if nothing selected) to your default destination.

### Context Menu

Right-click on:
- Selected text → "Send selection to Thymer"
- A link → "Send link to Thymer"
- An image → "Send image to Thymer"
- Any page → "Send page to Thymer"

## Settings

Click the ⚙️ Settings button in the popup to configure:

- **Default Destination** - Journal, Last Used Page, or Always Ask
- **Default Tag** - Defaults to `#web-capture`
- **Auto-close popup** - Close after sending
- **Show notifications** - Display success notifications

## Architecture

```
Chrome Extension                    Thymer App
┌─────────────────┐                ┌─────────────────┐
│  Popup UI       │                │  Web Capture    │
│  Background SW  │◄──postMessage──►  Plugin         │
│  Content Script │                │                 │
└─────────────────┘                └─────────────────┘
        │                                  │
        │                                  │
        ▼                                  ▼
   Any webpage                      Thymer workspace
   (capture content)               (create line items)
```

## Development

### Extension Development

The extension uses Manifest V3 with:
- Service worker for background tasks
- Content scripts for page capture
- Popup for main UI

### Thymer Plugin Development

For hot-reloading during development:
1. Clone the [Thymer Plugin SDK](https://github.com/thymerapp/thymer-plugin-sdk)
2. Copy `thymer-plugin/plugin.js` and `plugin.json` to the SDK
3. Follow the SDK's hot-reload instructions

## Troubleshooting

**"Not connected to Thymer"**
- Make sure Thymer is open in a browser tab
- Refresh the Thymer tab
- Check that the Web Capture plugin is installed and enabled

**Capture not working**
- Check the browser console for errors
- Ensure the extension has permission for the current site
- Try refreshing both the source page and Thymer

**Images not capturing**
- Some sites block cross-origin image access
- Large images (>2MB) are skipped
- Base64 images in selections may not transfer

## License

MIT
