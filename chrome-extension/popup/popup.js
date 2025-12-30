// Thymer Web Capture - Popup Script

const DEBUG = false;
const log = (...args) => {
  if (DEBUG) console.log(...args);
};

class ThymerCapture {
  constructor() {
    this.state = {
      destination: 'journal',
      selectedPage: null,
      tags: [],
      pageData: null,
      isConnected: false,
      isSending: false
    };
    
    this.elements = {};
    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadSettings();
    await this.loadPageData();
    this.checkConnection();
  }

  cacheElements() {
    this.elements = {
      connectionStatus: document.getElementById('connection-status'),
      statusText: document.querySelector('.status-text'),
      destButtons: document.querySelectorAll('.dest-btn'),
      pageSearchContainer: document.getElementById('page-search-container'),
      pageSearch: document.getElementById('page-search'),
      pageResults: document.getElementById('page-results'),
      selectedPage: document.getElementById('selected-page'),
      selectedPageName: document.querySelector('.selected-page-name'),
      clearSelection: document.querySelector('.clear-selection'),
      tagsList: document.getElementById('tags-list'),
      tagInput: document.getElementById('tag-input'),
      tagSuggestions: document.getElementById('tag-suggestions'),
      previewTitle: document.getElementById('preview-title'),
      previewUrl: document.getElementById('preview-url'),
      previewContent: document.getElementById('preview-content'),
      sendBtn: document.getElementById('send-btn'),
      sendBtnText: document.querySelector('.send-btn-text'),
      sendBtnLoading: document.querySelector('.send-btn-loading'),
      settingsBtn: document.getElementById('settings-btn'),
      settingsPanel: document.getElementById('settings-panel'),
      settingsBack: document.getElementById('settings-back'),
      defaultDestination: document.getElementById('default-destination'),
      defaultTag: document.getElementById('default-tag'),
      autoClose: document.getElementById('auto-close'),
      showNotification: document.getElementById('show-notification')
    };
  }

  bindEvents() {
    // Destination buttons
    this.elements.destButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.destButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setDestination(btn.dataset.dest);
      });
    });

    // Page search
    this.elements.pageSearch.addEventListener('input', 
      this.debounce(() => this.searchPages(), 300)
    );
    this.elements.pageSearch.addEventListener('focus', () => {
      if (this.elements.pageSearch.value.trim().length < 2) {
        this.showRecentPages();
      } else if (this.elements.pageResults.children.length > 0) {
        this.elements.pageResults.classList.add('show');
      }
    });

    // Clear page selection
    this.elements.clearSelection.addEventListener('click', () => this.clearPageSelection());

    // Tag input
    this.elements.tagInput.addEventListener('input', () => this.handleTagInput());
    this.elements.tagInput.addEventListener('keydown', (e) => this.handleTagKeydown(e));
    this.elements.tagInput.addEventListener('focus', () => {
      if (this.elements.tagInput.value.trim().length === 0) {
        this.showRecentTags();
      }
    });
    this.elements.tagInput.addEventListener('blur', () => {
      setTimeout(() => this.elements.tagSuggestions.classList.add('hidden'), 200);
    });

    // Send button
    this.elements.sendBtn.addEventListener('click', () => this.sendToThymer());

    // Settings
    this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
    this.elements.settingsBack.addEventListener('click', () => this.hideSettings());

    // Settings changes
    this.elements.defaultDestination.addEventListener('change', () => this.saveSettings());
    this.elements.defaultTag.addEventListener('change', () => this.saveSettings());
    this.elements.autoClose.addEventListener('change', () => this.saveSettings());
    this.elements.showNotification.addEventListener('change', () => this.saveSettings());

    // Close page results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.pageSearchContainer.contains(e.target)) {
        this.elements.pageResults.classList.remove('show');
      }
    });
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get({
      defaultDestination: 'journal',
      defaultTag: '#web-capture',
      autoClose: true,
      showNotification: true,
      lastSelectedPage: null
    });

    this.elements.defaultDestination.value = settings.defaultDestination;
    this.elements.defaultTag.value = settings.defaultTag || '';
    this.elements.autoClose.checked = settings.autoClose;
    this.elements.showNotification.checked = settings.showNotification;

    // Apply defaults
    if (settings.defaultDestination !== 'ask') {
      this.setDestination(settings.defaultDestination);
      this.elements.destButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.dest === settings.defaultDestination);
      });
    }

    // Apply default tag
    if (settings.defaultTag) {
      this.addTag(settings.defaultTag);
    }

    // Restore last selected page if destination is 'page'
    if (settings.lastSelectedPage && settings.defaultDestination === 'page') {
      this.state.selectedPage = settings.lastSelectedPage;
      this.showSelectedPage(settings.lastSelectedPage);
    }
  }

  async saveSettings() {
    await chrome.storage.sync.set({
      defaultDestination: this.elements.defaultDestination.value,
      defaultTag: this.elements.defaultTag.value.replace(/^#/, ''),
      autoClose: this.elements.autoClose.checked,
      showNotification: this.elements.showNotification.checked
    });
  }

  async loadPageData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get page info
      this.state.pageData = {
        url: tab.url,
        title: tab.title,
        content: '',
        images: []
      };

      this.updatePreview();

      // Request content from content script based on mode
      await this.refreshContent();
      
      this.elements.sendBtn.disabled = false;
    } catch (error) {
      console.error('Failed to load page data:', error);
      this.elements.previewTitle.textContent = 'Error loading page data';
    }
  }

  async refreshContent() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Ensure content script is injected
      await this.ensureContentScript(tab.id);
      
      // Always try to get selection content
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_CONTENT',
        mode: 'selection'
      });
      
      if (response) {
        this.state.pageData.content = response.content || '';
        this.state.pageData.images = response.images || [];
      }
    } catch (error) {
      console.error('Failed to get content:', error);
    }
    this.updatePreview();
  }

  async ensureContentScript(tabId) {
    try {
      // Try to ping the content script
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch (error) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/content.js']
      });
    }
  }

  setDestination(destination) {
    this.state.destination = destination;
    if (destination === 'page') {
      this.elements.pageSearchContainer.classList.remove('hidden');
    } else {
      this.elements.pageSearchContainer.classList.add('hidden');
    }
  }

  async searchPages() {
    const query = this.elements.pageSearch.value.trim();
    if (query.length < 2) {
      this.elements.pageResults.classList.remove('show');
      return;
    }

    // Send search request to Thymer
    const results = await this.sendToThymerTab({
      type: 'THYMER_SEARCH',
      query: query
    });

    if (results && results.length > 0) {
      this.renderPageResults(results);
    } else {
      this.elements.pageResults.innerHTML = '<div class="page-result-item">No pages found</div>';
      this.elements.pageResults.classList.add('show');
    }
  }

  renderPageResults(results) {
    this.elements.pageResults.innerHTML = results.map(page => `
      <div class="page-result-item" data-guid="${page.guid}">
        <div class="page-result-name">${this.escapeHtml(page.name)}</div>
        ${page.collection ? `<div class="page-result-collection">${this.escapeHtml(page.collection)}</div>` : ''}
      </div>
    `).join('');

    this.elements.pageResults.querySelectorAll('.page-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const guid = item.dataset.guid;
        const name = item.querySelector('.page-result-name').textContent;
        this.selectPage({ guid, name });
      });
    });

    this.elements.pageResults.classList.add('show');
  }

  selectPage(page) {
    this.state.selectedPage = page;
    this.showSelectedPage(page);
    this.elements.pageResults.classList.remove('show');
    this.elements.pageSearch.value = '';
    
    // Save to recent pages
    this.saveRecentPage(page);
  }

  showSelectedPage(page) {
    this.elements.selectedPageName.textContent = page.name;
    this.elements.selectedPage.classList.remove('hidden');
  }

  clearPageSelection() {
    this.state.selectedPage = null;
    this.elements.selectedPage.classList.add('hidden');
  }

  async saveRecentPage(page) {
    const data = await chrome.storage.sync.get({ recentPages: [] });
    let recentPages = data.recentPages.filter(p => p.guid !== page.guid);
    recentPages.unshift(page);
    recentPages = recentPages.slice(0, 3);
    await chrome.storage.sync.set({ recentPages });
  }

  async showRecentPages() {
    const data = await chrome.storage.sync.get({ recentPages: [] });
    if (data.recentPages.length === 0) return;

    this.elements.pageResults.innerHTML = 
      '<div class="recent-label">Recent</div>' +
      data.recentPages.map(page => `
        <div class="page-result-item" data-guid="${page.guid}">
          <div class="page-result-name">${this.escapeHtml(page.name)}</div>
          ${page.collection ? `<div class="page-result-collection">${this.escapeHtml(page.collection)}</div>` : ''}
        </div>
      `).join('');

    this.elements.pageResults.querySelectorAll('.page-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const guid = item.dataset.guid;
        const name = item.querySelector('.page-result-name').textContent;
        const collection = item.querySelector('.page-result-collection')?.textContent;
        this.selectPage({ guid, name, collection });
      });
    });

    this.elements.pageResults.classList.add('show');
  }

  async saveRecentTag(tag) {
    const data = await chrome.storage.sync.get({ recentTags: [] });
    let recentTags = data.recentTags.filter(t => t !== tag);
    recentTags.unshift(tag);
    recentTags = recentTags.slice(0, 3);
    await chrome.storage.sync.set({ recentTags });
  }

  async showRecentTags() {
    const data = await chrome.storage.sync.get({ recentTags: [] });
    const recentTags = data.recentTags.filter(t => !this.state.tags.includes(t));
    if (recentTags.length === 0) return;

    this.elements.tagSuggestions.innerHTML = 
      '<div class="recent-label">Recent</div>' +
      recentTags.map(tag => `
        <div class="tag-suggestion" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</div>
      `).join('');

    this.elements.tagSuggestions.querySelectorAll('.tag-suggestion').forEach(item => {
      item.addEventListener('click', () => {
        this.addTag(item.dataset.tag);
      });
    });

    this.elements.tagSuggestions.classList.remove('hidden');
  }

  handleTagInput() {
    const value = this.elements.tagInput.value.trim();
    if (value.length === 0) {
      this.elements.tagSuggestions.classList.add('hidden');
      return;
    }

    // Request tag suggestions from Thymer
    this.getTagSuggestions(value);
  }

  async getTagSuggestions(query) {
    log('[Popup] Requesting tag suggestions for:', query);
    const results = await this.sendToThymerTab({
      type: 'THYMER_GET_TAGS',
      query: query
    });
    log('[Popup] Tag suggestions received:', results);

    const suggestions = Array.isArray(results) ? results : [];
    const normalizedQuery = query.startsWith('#') ? query : `#${query}`;
    
    // Check if exact match exists
    const exactMatch = suggestions.find(t => t.toLowerCase() === normalizedQuery.toLowerCase());
    
    let html = suggestions.map(tag => `
      <div class="tag-suggestion" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</div>
    `).join('');

    // Add "create new" option if no exact match
    if (!exactMatch && query.length > 0) {
      html += `<div class="tag-suggestion create-new" data-tag="${this.escapeHtml(normalizedQuery)}">Create "${this.escapeHtml(normalizedQuery)}"</div>`;
    }

    if (html) {
      this.elements.tagSuggestions.innerHTML = html;
      this.elements.tagSuggestions.classList.remove('hidden');

      this.elements.tagSuggestions.querySelectorAll('.tag-suggestion').forEach(item => {
        item.addEventListener('click', () => {
          this.addTag(item.dataset.tag);
        });
      });
    } else {
      this.elements.tagSuggestions.classList.add('hidden');
    }
  }

  handleTagKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = this.elements.tagInput.value.trim();
      if (value) {
        const tag = value.startsWith('#') ? value : `#${value}`;
        this.addTag(tag);
      }
    }
  }

  addTag(tag) {
    if (!this.state.tags.includes(tag)) {
      this.state.tags.push(tag);
      this.renderTags();
      this.saveRecentTag(tag);
    }
    this.elements.tagInput.value = '';
    this.elements.tagSuggestions.classList.add('hidden');
  }

  removeTag(tag) {
    this.state.tags = this.state.tags.filter(t => t !== tag);
    this.renderTags();
  }

  renderTags() {
    this.elements.tagsList.innerHTML = this.state.tags.map(tag => `
      <span class="tag">
        ${this.escapeHtml(tag)}
        <button class="tag-remove" data-tag="${this.escapeHtml(tag)}">&times;</button>
      </span>
    `).join('');

    this.elements.tagsList.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => this.removeTag(btn.dataset.tag));
    });
  }

  updatePreview() {
    if (!this.state.pageData) return;

    this.elements.previewTitle.textContent = this.state.pageData.title || 'Untitled';
    this.elements.previewUrl.textContent = this.state.pageData.url || '';
    
    const content = this.state.pageData.content || '';
    if (content) {
      const truncated = content.length > 200 ? content.substring(0, 200) + '...' : content;
      this.elements.previewContent.textContent = truncated;
      
      if (this.state.pageData.images && this.state.pageData.images.length > 0) {
        this.elements.previewContent.textContent += `\n[${this.state.pageData.images.length} image(s)]`;
      }
    } else {
      this.elements.previewContent.textContent = '';
    }
  }

  async checkConnection() {
    log('[Popup] Checking connection to Thymer...');
    try {
      const response = await this.sendToThymerTab({ type: 'THYMER_PING' });
      log('[Popup] Connection check response:', response);
      this.setConnectionStatus(response && response.connected);
    } catch (error) {
      console.error('[Popup] Connection check failed:', error);
      this.setConnectionStatus(false);
    }
  }

  setConnectionStatus(connected) {
    this.state.isConnected = connected;
    this.elements.connectionStatus.classList.toggle('connected', connected);
    this.elements.connectionStatus.classList.toggle('disconnected', !connected);
    this.elements.statusText.textContent = connected 
      ? 'Connected to Thymer' 
      : 'Not connected - Open Thymer in a tab';
  }

  async sendToThymer() {
    if (this.state.isSending) return;

    // Validate
    if (this.state.destination === 'page' && !this.state.selectedPage) {
      alert('Please select a page to send to');
      return;
    }

    this.state.isSending = true;
    this.elements.sendBtnText.classList.add('hidden');
    this.elements.sendBtnLoading.classList.remove('hidden');
    this.elements.sendBtn.disabled = true;

    try {
      const payload = {
        type: 'THYMER_CAPTURE',
        payload: {
          mode: this.state.pageData.content ? 'selection' : 'link',
          url: this.state.pageData.url,
          title: this.state.pageData.title,
          content: this.state.pageData.content,
          images: this.state.pageData.images,
          tags: this.state.tags,
          destination: {
            type: this.state.destination,
            pageGuid: this.state.selectedPage?.guid
          }
        }
      };

      log('[Popup] Sending capture payload:', payload);
      const response = await this.sendToThymerTab(payload);
      log('[Popup] Capture response:', response);

      if (response && response.success) {
        const settings = await chrome.storage.sync.get({ autoClose: true, showNotification: true });
        
        if (settings.showNotification) {
          // Show success notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon48.png',
            title: 'Sent to Thymer',
            message: `Added to ${this.state.destination === 'journal' ? 'Journal' : this.state.selectedPage.name}`
          });
        }

        if (settings.autoClose) {
          window.close();
        }
      } else {
        const errorMsg = response?.error || 'No response from Thymer plugin';
        console.error('[Popup] Capture failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('[Popup] Send failed:', error);
      alert(`Failed to send to Thymer: ${error.message}\n\nMake sure:\n1. Thymer is open in a tab\n2. The Web Capture plugin is installed in Thymer\n3. Try refreshing the Thymer tab`);
    } finally {
      this.state.isSending = false;
      this.elements.sendBtnText.classList.remove('hidden');
      this.elements.sendBtnLoading.classList.add('hidden');
      this.elements.sendBtn.disabled = false;
    }
  }

  async sendToThymerTab(message) {
    // Find Thymer tab and send message
    const tabs = await chrome.tabs.query({ url: 'https://*.thymer.com/*' });
    log('[Popup] Found Thymer tabs:', tabs.length);
    
    if (tabs.length === 0) {
      log('[Popup] No Thymer tabs found');
      return null;
    }

    return new Promise((resolve) => {
      log('[Popup] Sending message to tab:', tabs[0].id, message.type);
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Message send error:', chrome.runtime.lastError.message);
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          log('[Popup] Received response:', response);
          resolve(response);
        }
      });
    });
  }

  showSettings() {
    this.elements.settingsPanel.classList.remove('hidden');
  }

  hideSettings() {
    this.elements.settingsPanel.classList.add('hidden');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new ThymerCapture();
});
