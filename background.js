'use strict';

// Constants
const BADGE_COLORS = {
  ENABLED: '#4CAF50',
  DISABLED: '#9E9E9E'
};
const DEFAULT_DOMAINS = ['sf-mco'];
const CORS_HEADERS = [
  { name: 'Access-Control-Allow-Origin', value: '*' },
  { name: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS' },
  { name: 'Access-Control-Allow-Headers', value: '*' },
  { name: 'Access-Control-Allow-Credentials', value: 'true' },
  { name: 'Access-Control-Expose-Headers', value: '*' }
];

// State
let isEnabled = true;
let targetDomains = [];
let interceptAll = true; // By default, intercept all domains

// Cookie cache: hostname -> cookie header string (populated asynchronously, read synchronously)
const cookieCache = {};

const updateCookieCache = (hostname) => {
  chrome.cookies.getAll({ domain: hostname }, (cookies) => {
    if (cookies && cookies.length > 0) {
      cookieCache[hostname] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
  });
};

// Keep cookie cache warm whenever cookies change
chrome.cookies.onChanged.addListener(({ cookie }) => {
  const hostname = cookie.domain.replace(/^\./, '');
  updateCookieCache(hostname);
});

// Utilities
const shouldProcessUrl = (url) => {
  if (interceptAll) return true;
  if (targetDomains.length === 0) return true;
  return targetDomains.some(domain => url.includes(domain));
};

const updateIcon = () => {
  if (isEnabled) {
    chrome.browserAction.setBadgeText({ text: 'ON' });
    chrome.browserAction.setBadgeBackgroundColor({ color: BADGE_COLORS.ENABLED });
  } else {
    chrome.browserAction.setBadgeText({ text: 'OFF' });
    chrome.browserAction.setBadgeBackgroundColor({ color: BADGE_COLORS.DISABLED });
  }
};

// Initialize state
chrome.storage.local.get(['corsEnabled', 'targetDomains', 'interceptAll'], (result) => {
  isEnabled = result.corsEnabled !== false;
  targetDomains = result.targetDomains || DEFAULT_DOMAINS;
  interceptAll = result.interceptAll !== false; // Default to true

  updateIcon();
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.corsEnabled) {
    isEnabled = changes.corsEnabled.newValue;
    updateIcon();
  }
  if (changes.targetDomains) {
    targetDomains = changes.targetDomains.newValue || DEFAULT_DOMAINS;
  }
  if (changes.interceptAll) {
    interceptAll = changes.interceptAll.newValue;
  }
});

// Pre-warm the cookie cache for any domain we see traffic to
chrome.webRequest.onBeforeRequest.addListener(
  ({ url }) => {
    try {
      const hostname = new URL(url).hostname;
      if (hostname && !cookieCache[hostname]) {
        updateCookieCache(hostname);
      }
    } catch (_) {}
  },
  { urls: ['<all_urls>'] }
);

// Intercept requests - add Origin header; inject cookies into OPTIONS preflights to avoid 401
chrome.webRequest.onBeforeSendHeaders.addListener(
  ({ url, method, requestHeaders = [] }) => {
    if (!isEnabled || !shouldProcessUrl(url)) return;

    const origin = new URL(url).origin;
    let headers = requestHeaders.filter(h => h.name.toLowerCase() !== 'origin');
    headers.push({ name: 'Origin', value: origin });

    // OPTIONS = preflight request. Browsers strip credentials from preflights, which causes
    // servers that require auth (e.g. Jira) to return 401. Inject session cookies so the
    // server can authenticate the preflight and return 200 instead.
    if (method === 'OPTIONS') {
      const hostname = new URL(url).hostname;
      // Trigger async cache fill if not already cached (helps future retries)
      if (!cookieCache[hostname]) updateCookieCache(hostname);
      const cookieStr = cookieCache[hostname];
      if (cookieStr) {
        headers = headers.filter(h => h.name.toLowerCase() !== 'cookie');
        headers.push({ name: 'Cookie', value: cookieStr });
      }
    }

    return { requestHeaders: headers };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders', 'extraHeaders']
);

// Intercept responses - add CORS headers
chrome.webRequest.onHeadersReceived.addListener(
  ({ url, responseHeaders = [] }) => {
    if (!isEnabled || !shouldProcessUrl(url)) return;

    const headers = responseHeaders.filter(h => !h.name.toLowerCase().startsWith('access-control-'));
    headers.push(...CORS_HEADERS);

    return { responseHeaders: headers };
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'responseHeaders', 'extraHeaders']
);
