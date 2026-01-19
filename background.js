// Constants
const DEBUGGER_VERSION = '1.3';
const ATTACH_DELAY = 500;
const INITIAL_ATTACH_DELAY = 1000;
const ICON_ENABLED_COLOR = '#4CAF50';
const ICON_DISABLED_COLOR = '#9E9E9E';
const INTERNAL_URL_PREFIXES = ['chrome://', 'edge://', 'chrome-extension://', 'about:'];

// State
let isEnabled = true;
let activeTabId = null;

// Utility: Check if URL is internal browser page
function isInternalUrl(url) {
  return !url || INTERNAL_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

// Create dynamic icon
function createIcon(color, size) {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = size * 0.35;
  const lineLength = size * 0.25;

  // Background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.15);
  ctx.fill();

  // Circle
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Cross lines
  ctx.beginPath();
  ctx.moveTo(center - lineLength, center);
  ctx.lineTo(center - lineLength * 0.4, center);
  ctx.moveTo(center + lineLength * 0.4, center);
  ctx.lineTo(center + lineLength, center);
  ctx.moveTo(center, center - lineLength);
  ctx.lineTo(center, center - lineLength * 0.4);
  ctx.moveTo(center, center + lineLength * 0.4);
  ctx.lineTo(center, center + lineLength);
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

// Update extension icon
function updateIcon() {
  const color = isEnabled ? ICON_ENABLED_COLOR : ICON_DISABLED_COLOR;
  chrome.browserAction.setIcon({
    imageData: {
      16: createIcon(color, 16),
      32: createIcon(color, 32),
      48: createIcon(color, 48),
      128: createIcon(color, 128)
    }
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[CORS] Icon update failed:', chrome.runtime.lastError.message);
    }
  });
}

// Initialize extension state
chrome.storage.local.get(['corsEnabled'], (result) => {
  isEnabled = result.corsEnabled !== false;
  updateIcon();
});

// Listen for state changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.corsEnabled) {
    isEnabled = changes.corsEnabled.newValue;
    updateIcon();

    if (activeTabId) {
      isEnabled ? startDebugger(activeTabId) : stopDebugger(activeTabId);
    }
  }
});

// Validate and process tab activation
function handleTabActivation(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url || isInternalUrl(tab.url)) {
      return;
    }
    callback(tab);
  });
}

// Track active tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  const previousTabId = activeTabId;

  if (previousTabId && previousTabId !== activeInfo.tabId) {
    stopDebugger(previousTabId);
  }

  handleTabActivation(activeInfo.tabId, () => {
    activeTabId = activeInfo.tabId;
    if (isEnabled) {
      setTimeout(() => startDebugger(activeTabId), ATTACH_DELAY);
    }
  });
});

// Initialize on startup
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && !isInternalUrl(tabs[0].url)) {
    activeTabId = tabs[0].id;
    if (isEnabled) {
      setTimeout(() => startDebugger(activeTabId), INITIAL_ATTACH_DELAY);
    }
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    stopDebugger(tabId);
    activeTabId = null;
  }
});

// Handle external debugger detachment
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId === activeTabId) {
    activeTabId = null;
  }
});

// Attach debugger to tab
function startDebugger(tabId) {
  if (!tabId || !isEnabled) return;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url || isInternalUrl(tab.url)) {
      return;
    }

    // Detach first (ignore errors), then attach
    chrome.debugger.detach({ tabId }, () => {
      chrome.debugger.attach({ tabId }, DEBUGGER_VERSION, () => {
        if (chrome.runtime.lastError) return;

        chrome.debugger.sendCommand({ tabId }, 'Fetch.enable', {
          patterns: [{ requestStage: 'Request' }]
        });
      });
    });
  });
}

// Detach debugger from tab
function stopDebugger(tabId) {
  if (!tabId) return;
  chrome.debugger.detach({ tabId }, () => {});
}

// Handle intercepted requests
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (source.tabId !== activeTabId || method !== 'Fetch.requestPaused') {
    return;
  }

  if (params.responseHeaders) {
    // Response - continue without modification
    chrome.debugger.sendCommand(source, 'Fetch.continueRequest', {
      requestId: params.requestId
    }, () => {});
  } else {
    // Request - add Origin header
    modifyRequestHeaders(source, params);
  }
});

// Modify request headers to add Origin
function modifyRequestHeaders(source, params) {
  try {
    const origin = new URL(params.request.url).origin;
    const headers = Object.entries(params.request.headers).map(([name, value]) => ({ name, value }));

    // Update or add Origin header
    const originIndex = headers.findIndex(h => h.name.toLowerCase() === 'origin');
    if (originIndex >= 0) {
      headers[originIndex].value = origin;
    } else {
      headers.push({ name: 'Origin', value: origin });
    }

    chrome.debugger.sendCommand(source, 'Fetch.continueRequest', {
      requestId: params.requestId,
      headers
    }, () => {});
  } catch (e) {
    // Invalid URL, continue without modification
    chrome.debugger.sendCommand(source, 'Fetch.continueRequest', {
      requestId: params.requestId
    }, () => {});
  }
}
