'use strict';

// DOM elements
const toggleButton = document.getElementById('toggleButton');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const interceptAllRadio = document.getElementById('interceptAllRadio');
const interceptSpecificRadio = document.getElementById('interceptSpecificRadio');
const domainListContainer = document.getElementById('domainListContainer');
const domainInput = document.getElementById('domainInput');
const saveDomains = document.getElementById('saveDomains');
const saveMessage = document.getElementById('saveMessage');
const currentDomains = document.getElementById('currentDomains');

// State
let isEnabled = true;
let interceptAll = true;
let targetDomains = ['sf-mco', 'gateway-service', 'configuration-service'];

// Update UI
const updateUI = () => {
  const state = isEnabled ? 'enabled' : 'disabled';
  statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
  statusIndicator.className = `status-indicator ${state}`;
  toggleButton.textContent = `${isEnabled ? 'Disable' : 'Enable'} CORS Bypass`;
  toggleButton.className = `toggle-btn ${state}`;

  // Update domain display
  updateDomainDisplay();
};

const updateDomainDisplay = () => {
  if (interceptAll) {
    currentDomains.innerHTML = '• Currently intercepting: <strong>All domains</strong>';
  } else {
    const domainList = targetDomains.length > 0 ? targetDomains.join(', ') : 'None';
    currentDomains.innerHTML = `• Currently intercepting: <strong>${domainList}</strong>`;
  }
};

// Load state
chrome.storage.local.get(['corsEnabled', 'interceptAll', 'targetDomains'], (result) => {
  isEnabled = result.corsEnabled !== false;
  interceptAll = result.interceptAll !== false;
  targetDomains = result.targetDomains || ['sf-mco', 'gateway-service', 'configuration-service'];

  // Update radio buttons
  if (interceptAll) {
    interceptAllRadio.checked = true;
    domainListContainer.style.display = 'none';
  } else {
    interceptSpecificRadio.checked = true;
    domainListContainer.style.display = 'block';
  }

  // Populate domain input
  domainInput.value = targetDomains.join('\n');

  updateUI();
});

// Toggle CORS bypass
toggleButton.addEventListener('click', () => {
  isEnabled = !isEnabled;
  chrome.storage.local.set({ corsEnabled: isEnabled }, () => {
    updateUI();

    // Reload active tab (skip internal pages)
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
        chrome.tabs.reload(tab.id);
      }
    });
  });
});

// Radio button handlers
interceptAllRadio.addEventListener('change', () => {
  if (interceptAllRadio.checked) {
    interceptAll = true;
    domainListContainer.style.display = 'none';
    chrome.storage.local.set({ interceptAll: true }, () => {
      updateDomainDisplay();
    });
  }
});

interceptSpecificRadio.addEventListener('change', () => {
  if (interceptSpecificRadio.checked) {
    interceptAll = false;
    domainListContainer.style.display = 'block';
    chrome.storage.local.set({ interceptAll: false }, () => {
      updateDomainDisplay();
    });
  }
});

// Save domains button
saveDomains.addEventListener('click', () => {
  const domains = domainInput.value
    .split('\n')
    .map(d => d.trim())
    .filter(d => d.length > 0);

  targetDomains = domains;

  chrome.storage.local.set({ targetDomains: domains }, () => {
    saveMessage.textContent = '✓ Domains saved successfully!';
    saveMessage.className = 'save-message success';
    updateDomainDisplay();

    setTimeout(() => {
      saveMessage.textContent = '';
      saveMessage.className = 'save-message';
    }, 2000);
  });
});
