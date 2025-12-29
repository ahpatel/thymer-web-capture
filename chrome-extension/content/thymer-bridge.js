// Thymer Web Capture - Bridge Script (runs on thymer.com)
// This script bridges the Chrome extension with the Thymer plugin

(function() {
  // Prevent multiple injections
  if (window.__thymerBridgeInjected) return;
  window.__thymerBridgeInjected = true;

  console.log('[Thymer Bridge] Initializing...');

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Thymer Bridge] Received message from extension:', message.type);
    
    // Forward to the Thymer plugin via window.postMessage
    const messageId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    // Create a promise that resolves when we get a response
    const responsePromise = new Promise((resolve) => {
      const handler = (event) => {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'THYMER_RESPONSE') return;
        if (event.data.messageId !== messageId) return;
        
        console.log('[Thymer Bridge] Received response from plugin:', event.data);
        window.removeEventListener('message', handler);
        resolve(event.data.response);
      };
      
      window.addEventListener('message', handler);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        console.log('[Thymer Bridge] Timeout waiting for plugin response');
        resolve({ error: 'Timeout waiting for Thymer plugin response. Make sure the Web Capture plugin is installed.' });
      }, 10000);
    });

    // Send message to Thymer plugin
    const outgoingMessage = {
      ...message,
      messageId,
      source: 'thymer-extension'
    };
    console.log('[Thymer Bridge] Posting message to window:', outgoingMessage.type, messageId);
    window.postMessage(outgoingMessage, '*');

    // Wait for response and send back to extension
    responsePromise.then(response => {
      console.log('[Thymer Bridge] Sending response back to extension:', response);
      sendResponse(response);
    });

    return true; // Keep channel open for async response
  });

  // Also listen for messages from the Thymer plugin (for status updates, etc.)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'thymer-plugin') return;

    // Forward certain messages to the extension
    if (event.data.type === 'THYMER_STATUS_UPDATE') {
      console.log('[Thymer Bridge] Forwarding status update to extension');
      chrome.runtime.sendMessage(event.data);
    }
  });

  console.log('[Thymer Bridge] Ready and listening');
})();
