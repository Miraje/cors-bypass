# CORS Bypass Chrome Extension
Chrome extension for bypassing CORS restrictions during development using the webRequest API.
## Features
- ✅ Automatic Origin header injection
- ✅ CORS header management for responses
- ✅ Toggle on/off with visual indicator
- ✅ **User-configurable domain list**
- ✅ **Intercept all domains by default** (or specific domains only)
## Installation
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
## Usage
### Basic Usage
Click the extension icon to toggle CORS bypass on/off:
- 🟢 Green indicator = Enabled
- 🔴 Red indicator = Disabled
### Domain Configuration
**By default, the extension intercepts ALL domains.**
To configure specific domains:
1. Click the extension icon
2. Select "Intercept specific domains only"
3. Enter domain fragments (one per line):
   ```
   api.example.com
   ```
4. Click "Save Domains"
### How Domain Matching Works
**Important: Domain matching uses substring matching (contains).**
The extension checks if the URL **contains** the text you enter.
**Examples:**
- `sf-mco` matches any URL containing "sf-mco":
  - ✅ `https://sf-mco.com/api`
  - ✅ `https://my-sf-mco-test.com/data`
- `api.github` matches:
  - ✅ `https://api.github.com/repos`
  - ✅ `https://api.github.io/docs`
- `localhost:4200` matches:
  - ✅ `http://localhost:4200/app`
  - ❌ `http://localhost:3000/app` (different port)
**Best Practices:**
- ✅ Use specific strings: `api.example.com` instead of just `api`
- ✅ Include protocol if needed: `https://secure-api.com`
- ✅ Include ports for localhost: `localhost:4200`
- ❌ Avoid generic terms that might match unintended URLs
**Tip:** The matching is case-sensitive and looks for exact substring matches.
## How It Works
Uses Chrome's **webRequest API** to intercept and modify HTTP headers:
**Request Modification:**
```javascript
// For request to: https://sf-mco.com/api
// Adds header: Origin: https://sf-mco.com
```
**Response Modification:**
```javascript
// Adds headers:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
// Access-Control-Allow-Headers: *
// Access-Control-Allow-Credentials: true
// Access-Control-Expose-Headers: *
```
## Technical Details
- **API:** Chrome webRequest API (standard, reliable)
- **Manifest:** Version 2
- **Permissions:** `webRequest`, `webRequestBlocking`, `storage`, `<all_urls>`
- **Default Mode:** Intercept all domains
- **Custom Mode:** User-configurable domain list (substring matching)
- **Performance:** Minimal overhead, efficient filtering
## Default Domains
The extension comes pre-configured with these domains (when using specific mode):
- `sf-mco`
- You can customize this list at any time through the popup interface.
## Configuration Options
### Intercept All Domains (Default)
- Most flexible option
- Works with any API endpoint
- No configuration needed
- Best for general development
### Intercept Specific Domains
- More controlled approach
- Better performance (less processing)
- Specify domain fragments to match
- Uses substring matching (URL contains)
- Good for focused testing
## Development Warning
⚠️ **This extension is for development purposes only.**
- CORS is a security feature
- Never use CORS bypass in production
- Never use with sensitive data
- Disable when not needed
- Only intercept domains you control
## Troubleshooting
**Extension not working?**
1. Make sure the extension is enabled (green indicator)
2. Check if you're using "specific domains" mode and the domain is in your list
3. Reload the extension: `chrome://extensions/` → Click refresh button
4. Reload the webpage you're testing
**Domains not being intercepted?**
1. Check domain spelling in the configuration
2. Remember: matching is substring-based (contains)
3. Make sure the fragment exists in the full URL
4. Try switching to "Intercept all domains" to test
5. Check the background console for any errors
**Unintended URLs being intercepted?**
1. Your domain fragment might be too generic
2. Use more specific strings (e.g., `api.example.com` instead of `api`)
3. Include protocol or port if needed
## Examples
### Example 1: SF-MCO Development
```
Mode: Intercept specific domains only
Domains:
  sf-mco
Result:
✅ https://sf-mco.com/api
❌ https://other-api.com/endpoint
```
### Example 2: Multiple Localhost Ports
```
Mode: Intercept specific domains only
Domains:
  localhost:4200
  localhost:3000
Result:
✅ http://localhost:4200/app
✅ http://localhost:3000/api
❌ http://localhost:8080/test
```
### Example 3: Third-Party APIs
```
Mode: Intercept specific domains only
Domains:
  api.github.com
  api.stripe.com
Result:
✅ https://api.github.com/repos
✅ https://api.stripe.com/charges
❌ https://api.twitter.com/tweets
```
## Changelog
### Version 1.1.0
- ✨ Added user-configurable domain list
- ✨ Added "Intercept all domains" option (default)
- ✨ Added domain configuration UI
- ✨ Substring-based domain matching
- ✨ Added current interception mode display
- 🔧 Improved popup interface
- 📝 Enhanced documentation
### Version 1.0.1
- 🐛 Fixed webRequest API implementation
- ⚡ Performance optimizations
- 📝 Code cleanup and refactoring
### Version 1.0.0
- 🎉 Initial release
- ✨ Basic CORS bypass functionality
- ✨ Toggle on/off feature
## License
MIT
## Support
For issues or questions, please check the code or documentation.
