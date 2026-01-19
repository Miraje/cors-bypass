// Constants
const COLORS = {
  enabled: { normal: '#f44336', hover: '#d32f2f' },
  disabled: { normal: '#4CAF50', hover: '#388E3C' }
};

// DOM elements
const toggleButton = document.getElementById('toggleButton');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');

// State
let isEnabled = true;

// Update UI based on current state
function updateUI() {
  const state = isEnabled ? 'enabled' : 'disabled';
  statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
  statusIndicator.className = `status-indicator ${state}`;
  toggleButton.textContent = `${isEnabled ? 'Disable' : 'Enable'} CORS Bypass`;
  toggleButton.style.background = COLORS[state].normal;
  toggleButton.dataset.state = state;
}

// Load initial state
chrome.storage.local.get(['corsEnabled'], (result) => {
  isEnabled = result.corsEnabled !== false;
  updateUI();
});

// Toggle on button click
toggleButton.addEventListener('click', () => {
  isEnabled = !isEnabled;
  chrome.storage.local.set({ corsEnabled: isEnabled }, () => {
    updateUI();

    // Reload active tab if it's not an internal page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url && !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('edge://')) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  });
});

// Hover effects
toggleButton.addEventListener('mouseenter', () => {
  const state = isEnabled ? 'enabled' : 'disabled';
  toggleButton.style.background = COLORS[state].hover;
});

toggleButton.addEventListener('mouseleave', () => {
  const state = isEnabled ? 'enabled' : 'disabled';
  toggleButton.style.background = COLORS[state].normal;
});
