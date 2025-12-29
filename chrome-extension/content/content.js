// Thymer Web Capture - Content Script

(function() {
  // Prevent multiple injections
  if (window.__thymerContentScriptInjected) return;
  window.__thymerCaptureInjected = true;

  // Listen for messages from popup or background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_CONTENT':
        getContent(message.mode).then(sendResponse);
        return true;

      case 'GET_SELECTION_IMAGES':
        getSelectionImages().then(sendResponse);
        return true;

      case 'PING':
        sendResponse({ alive: true });
        return false;
    }
  });

  // Get content based on mode
  async function getContent(mode) {
    if (mode === 'selection') {
      return getSelectionContent();
    } else if (mode === 'fullpage') {
      return getFullPageContent();
    }
    return { content: '', images: [] };
  }

  // Get selected text and images
  async function getSelectionContent() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { content: '', images: [] };
    }

    const range = selection.getRangeAt(0);
    const content = selection.toString().trim();
    const images = await extractImagesFromRange(range);

    return { content, images };
  }

  // Get images from selection range
  async function extractImagesFromRange(range) {
    const images = [];
    const fragment = range.cloneContents();
    const imgElements = fragment.querySelectorAll('img');

    for (const img of imgElements) {
      const imageData = await getImageData(img.src);
      if (imageData) {
        images.push(imageData);
      }
    }

    return images;
  }

  // Get selection images only
  async function getSelectionImages() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { images: [] };
    }

    const range = selection.getRangeAt(0);
    const images = await extractImagesFromRange(range);
    return { images };
  }

  // Get full page content
  async function getFullPageContent() {
    const content = extractTextContent(document.body);
    const images = await extractPageImages();
    
    return { content, images };
  }

  // Extract readable text from element
  function extractTextContent(element) {
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return '';
    }

    // Skip script, style, and other non-content elements
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS'];
    if (skipTags.includes(element.tagName)) {
      return '';
    }

    let text = '';

    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const trimmed = node.textContent.trim();
        if (trimmed) {
          text += trimmed + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Add line breaks for block elements
        const blockTags = ['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR', 'BLOCKQUOTE'];
        if (blockTags.includes(node.tagName)) {
          text += '\n';
        }
        
        text += extractTextContent(node);
        
        if (blockTags.includes(node.tagName)) {
          text += '\n';
        }
      }
    }

    return text;
  }

  // Extract images from page (limit to reasonable number)
  async function extractPageImages() {
    const images = [];
    const imgElements = document.querySelectorAll('img');
    const maxImages = 10; // Limit to prevent huge payloads

    for (const img of imgElements) {
      if (images.length >= maxImages) break;

      // Skip tiny images (likely icons/tracking pixels)
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
      
      // Skip hidden images
      const rect = img.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const imageData = await getImageData(img.src);
      if (imageData) {
        images.push(imageData);
      }
    }

    return images;
  }

  // Convert image URL to base64 data URL
  async function getImageData(src) {
    if (!src) return null;

    // If already a data URL, return as-is
    if (src.startsWith('data:')) {
      return src;
    }

    try {
      // Try to fetch and convert to base64
      const response = await fetch(src, { mode: 'cors' });
      if (!response.ok) return src; // Return URL if can't fetch

      const blob = await response.blob();
      
      // Limit image size (skip if > 2MB)
      if (blob.size > 2 * 1024 * 1024) {
        return src; // Return URL instead
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(src);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      // If CORS fails, just return the URL
      return src;
    }
  }
})();
