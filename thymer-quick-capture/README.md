# Thymer Quick Capture Plugin

A native Thymer plugin for quickly capturing notes and adding them to today's Journal or any page in your workspace.
<img width="491" height="375" alt="image" src="https://github.com/user-attachments/assets/8ff0a936-6f63-44eb-a1aa-825a0b545400" />

## Features

- **Quick Note Capture** - Fast modal interface for capturing thoughts
- **Multi-line Support** - Enter for new lines, Shift+Enter to save
- **Journal Integration** - Automatically finds/creates today's Journal entry
- **Flexible Destinations** - Choose Journal (default) or search for any page
- **Tag Support** - Add hashtags with autocomplete from existing tags
- **Timestamps** - Notes include local timezone timestamps
- **Command Palette** - Access via Cmd+P → "Quick Capture: New Note"
- **Status Bar** - Quick access icon in the status bar

## Installation

1. Open Thymer in your browser
2. Press `Cmd+P` / `Ctrl+P` to open the Command Palette
3. Select **"Plugins"**
4. Click **"Create Plugin"** to create a new Global Plugin
5. In the Edit Code dialog:
   - **Custom Code tab:** Paste the contents of `plugin.js`
   - **Configuration tab:** Paste the contents of `plugin.json`
6. Click **Save**

## Usage

### Opening Quick Capture

**Option 1:** Press `Cmd+P` / `Ctrl+P`, then type "Quick Capture" and select it

**Option 2:** Click the 📝 icon in the status bar (bottom of Thymer)

### Capturing Notes

1. Type your note in the text area
2. Use **Enter** for new lines (multi-line notes supported)
3. Optionally change the destination (defaults to today's Journal)
4. Optionally add tags (with autocomplete)
5. Press **Shift+Enter** or click **Save** to capture

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | New line |
| `Shift+Enter` | Save note |
| `Escape` | Close modal |

## Note Format

Captured notes appear in your destination page with:
- Timestamp (e.g., "Dec 29, 10:15 AM")
- Your note content
- Any tags you added

Multi-line notes are indented under the first line.

**Example output:**
```
Dec 29, 10:15 AM — Remember to review the quarterly report #work #todo
    Also need to schedule the team meeting
    Check budget allocations
```

## Development

For hot-reloading during development:

1. Clone the [Thymer Plugin SDK](https://github.com/thymerapp/thymer-plugin-sdk)
2. Copy `plugin.js` and `plugin.json` to the SDK directory
3. Follow the SDK's hot-reload instructions

## License

MIT
