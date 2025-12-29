// Thymer Quick Capture - Background Service Worker

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for selected text
  chrome.contextMenus.create({
    id: 'thymer-capture-selection',
    title: 'Send selection to Thymer',
    contexts: ['selection']
  });

  // Context menu for links
  chrome.contextMenus.create({
    id: 'thymer-capture-link',
    title: 'Send link to Thymer',
    contexts: ['link']
  });

  // Context menu for images
  chrome.contextMenus.create({
    id: 'thymer-capture-image',
    title: 'Send image to Thymer',
    contexts: ['image']
  });

  // Context menu for page
  chrome.contextMenus.create({
    id: 'thymer-capture-page',
    title: 'Send page to Thymer',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let captureData = {
    url: tab.url,
    title: tab.title,
    mode: 'link',
    content: '',
    images: []
  };

  switch (info.menuItemId) {
    case 'thymer-capture-selection':
      captureData.mode = 'selection';
      captureData.content = info.selectionText || '';
      // Get images in selection via content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_SELECTION_IMAGES'
        });
        if (response && response.images) {
          captureData.images = response.images;
        }
      } catch (e) {
        console.error('Failed to get selection images:', e);
      }
      break;

    case 'thymer-capture-link':
      captureData.url = info.linkUrl;
      captureData.content = info.selectionText || '';
      break;

    case 'thymer-capture-image':
      captureData.mode = 'selection';
      captureData.images = [info.srcUrl];
      break;

    case 'thymer-capture-page':
      captureData.mode = 'fullpage';
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_CONTENT',
          mode: 'fullpage'
        });
        if (response) {
          captureData.content = response.content || '';
          captureData.images = response.images || [];
        }
      } catch (e) {
        console.error('Failed to get page content:', e);
      }
      break;
  }

  // Send to Thymer via quick capture (uses default settings)
  await quickCapture(captureData);
});

// Handle keyboard shortcut for quick capture
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick_capture') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Get selection if any
    let captureData = {
      url: tab.url,
      title: tab.title,
      mode: 'selection',
      content: '',
      images: []
    };

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_CONTENT',
        mode: 'selection'
      });
      if (response) {
        captureData.content = response.content || '';
        captureData.images = response.images || [];
      }
      
      // If no selection, fall back to link mode
      if (!captureData.content && captureData.images.length === 0) {
        captureData.mode = 'link';
      }
    } catch (e) {
      console.error('Failed to get selection:', e);
      captureData.mode = 'link';
    }

    await quickCapture(captureData);
  }
});

// Quick capture with default settings
async function quickCapture(captureData) {
  const settings = await chrome.storage.sync.get({
    defaultDestination: 'journal'
  });

  const payload = {
    type: 'THYMER_CAPTURE',
    payload: {
      mode: captureData.mode,
      url: captureData.url,
      title: captureData.title,
      content: captureData.content,
      images: captureData.images,
      tags: [],
      destination: {
        type: settings.defaultDestination,
        pageGuid: null
      }
    }
  };

  // Find Thymer tab and send
  const thymerTabs = await chrome.tabs.query({ url: 'https://*.thymer.com/*' });
  
  if (thymerTabs.length === 0) {
    // Show notification that Thymer needs to be open
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Thymer Quick Capture',
      message: 'Please open Thymer in a tab first'
    });
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(thymerTabs[0].id, payload);
    
    if (response && response.success) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon48.png',
        title: 'Sent to Thymer',
        message: `Captured "${captureData.title.substring(0, 50)}${captureData.title.length > 50 ? '...' : ''}"`
      });
    } else {
      throw new Error(response?.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Quick capture failed:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: 'Capture Failed',
      message: 'Could not send to Thymer. Make sure the Thymer plugin is installed.'
    });
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUICK_CAPTURE') {
    quickCapture(message.data).then(() => sendResponse({ success: true }));
    return true;
  }
});
