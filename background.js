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

// Intercept requests - add Origin header
chrome.webRequest.onBeforeSendHeaders.addListener(
  ({ url, requestHeaders = [] }) => {
    if (!isEnabled || !shouldProcessUrl(url)) return;

    const origin = new URL(url).origin;
    const headers = requestHeaders.filter(h => h.name.toLowerCase() !== 'origin');
    headers.push({ name: 'Origin', value: origin });

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
