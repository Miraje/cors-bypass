# CORS Bypass Chrome Extension

A Chrome extension that bypasses CORS restrictions for development using the Chrome Debugger API.

## Installation

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. Allow debugger permission when prompted

## Usage

1. Click extension icon to toggle on/off
2. Navigate to your development app
3. Make sure the tab is active
4. Extension adds `Origin` header to all requests

**Note:** "DevTools is debugging this browser" notification is normal and required.

## How It Works

Intercepts HTTP requests using Chrome Debugger API and adds Origin header:

```javascript
// For request to: https://api.example.com/data
// Extension adds: Origin: https://api.example.com
```

## Features

- ✅ Active tab only (no interference with other tabs)
- ✅ Toggle on/off with visual indicator
- ✅ Icon color: green = enabled, gray = disabled
- ✅ Automatic tab reload on toggle

## Technical Details

- **API:** Chrome Debugger (Fetch.enable)
- **Manifest:** V2 (required for blocking debugger commands)
- **Scope:** Active tab only
- **Permissions:** `debugger`, `storage`, `tabs`, `<all_urls>`

## Considerations

- Only works on http:// and https:// pages
- Cannot intercept chrome://, edge://, or extension pages
- Tab must be active for interception
- Shows debugging notification

## ⚠️ Development Only

This extension is **for development purposes only**. Never use in production or with sensitive data.

## License

MIT
