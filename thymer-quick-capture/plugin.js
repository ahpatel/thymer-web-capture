// Thymer Quick Capture Plugin
// Quickly capture notes and add them to today's Journal or any page

class Plugin extends AppPlugin {
  onLoad() {
    this.injectStyles();
    this.setupCommandPalette();
    this.setupStatusBar();
  }

  onUnload() {
    if (this.statusBarItem) {
      this.statusBarItem.remove();
    }
    if (this.commandPaletteItem) {
      this.commandPaletteItem.remove();
    }
    this.closeModal();
  }

  injectStyles() {
    this.ui.injectCSS(`
      .qc-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 10vh;
        z-index: 10000;
        backdrop-filter: blur(10px);
      }
      
      .qc-modal {
        background: var(--color-bg-primary, var(--bg-primary));
        color: var(--color-text-primary, var(--text-primary));
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90vw;
        overflow: hidden;
        animation: qc-slide-in 0.15s ease-out;
      }
      
      @keyframes qc-slide-in {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .qc-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .qc-title {
        font-size: 16px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .qc-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: inherit;
        opacity: 0.6;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .qc-close:hover {
        opacity: 1;
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.1)));
      }
      
      .qc-body {
        padding: 16px 20px;
      }
      
      .qc-textarea {
        width: 100%;
        min-height: 120px;
        max-height: 300px;
        padding: 12px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        color: inherit;
        box-sizing: border-box;
      }
      
      .qc-textarea:focus {
        outline: none;
        border-color: var(--color-accent, var(--accent-color, #0066cc));
        box-shadow: 0 0 0 3px var(--color-accent-transparent, rgba(0, 102, 204, 0.15));
      }
      
      .qc-textarea::placeholder {
        color: inherit;
        opacity: 0.5;
      }
      
      .qc-row {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      
      .qc-field {
        flex: 1;
      }
      
      .qc-label {
        display: block;
        font-size: 12px;
        font-weight: 500;
        opacity: 0.7;
        margin-bottom: 6px;
      }
      
      .qc-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 6px;
        font-family: inherit;
        font-size: 13px;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        color: inherit;
        box-sizing: border-box;
      }
      
      .qc-input:focus {
        outline: none;
        border-color: var(--color-accent, var(--accent-color, #0066cc));
      }
      
      .qc-input::placeholder {
        color: inherit;
        opacity: 0.5;
      }
      
      .qc-destination-btn {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 6px;
        font-family: inherit;
        font-size: 13px;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        color: inherit;
        cursor: pointer;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .qc-destination-btn:hover {
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.1)));
      }
      
      .qc-destination-btn .icon {
        opacity: 0.6;
      }
      
      .qc-footer {
        padding: 12px 20px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .qc-hint {
        font-size: 12px;
        opacity: 0.5;
      }
      
      .qc-hint kbd {
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.1)));
        padding: 2px 6px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 11px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
      }
      
      .qc-actions {
        display: flex;
        gap: 8px;
      }
      
      .qc-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.1s ease;
      }
      
      .qc-btn-secondary {
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.1)));
        color: inherit;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
      }
      
      .qc-btn-secondary:hover {
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.15)));
      }
      
      .qc-btn-primary {
        background: var(--color-accent, var(--accent-color, #0066cc));
        color: white;
      }
      
      .qc-btn-primary:hover {
        opacity: 0.9;
      }
      
      .qc-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .qc-dropdown {
        position: absolute;
        background: var(--color-bg-primary, var(--bg-primary));
        color: var(--color-text-primary, var(--text-primary));
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        max-height: 200px;
        overflow-y: auto;
        z-index: 10001;
        min-width: 200px;
      }
      
      .qc-dropdown-item {
        padding: 8px 12px;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .qc-dropdown-item:hover,
      .qc-dropdown-item.selected {
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.1)));
      }
      
      .qc-dropdown-empty {
        padding: 12px;
        text-align: center;
        opacity: 0.5;
        font-size: 13px;
      }
      
      .qc-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 6px;
      }
      
      .qc-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        background: var(--color-accent, var(--accent-color, #0066cc));
        color: white;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .qc-tag-remove {
        cursor: pointer;
        opacity: 0.7;
      }
      
      .qc-tag-remove:hover {
        opacity: 1;
      }
      
      .qc-dest-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .qc-dest-current {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 6px;
        font-size: 13px;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      
      .qc-dest-current .dest-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .qc-dest-current .icon {
        opacity: 0.6;
        flex-shrink: 0;
      }
      
      .qc-change-btn {
        padding: 8px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 6px;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        color: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .qc-change-btn:hover {
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.1)));
      }
      
      .qc-search-header {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .qc-search-header .qc-input {
        flex: 1;
      }
      
      .qc-journal-btn {
        padding: 8px 12px;
        border: 1px solid var(--color-border, var(--border-color, rgba(128, 128, 128, 0.2)));
        border-radius: 6px;
        background: var(--color-bg-secondary, var(--bg-secondary, rgba(128, 128, 128, 0.05)));
        color: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        white-space: nowrap;
      }
      
      .qc-journal-btn:hover {
        background: var(--color-bg-hover, var(--bg-hover, rgba(128, 128, 128, 0.1)));
      }
    `);
  }

  setupCommandPalette() {
    this.commandPaletteItem = this.ui.addCommandPaletteCommand({
      label: 'Quick Capture: New Note',
      icon: 'notes',
      onSelected: () => this.showCaptureModal()
    });
  }

  setupStatusBar() {
    this.statusBarItem = this.ui.addStatusBarItem({
      icon: 'notes',
      tooltip: 'Quick Capture - Click to add a note',
      onClick: () => this.showCaptureModal()
    });
  }

  showCaptureModal() {
    if (this.modalOverlay) {
      this.closeModal();
      return;
    }

    this.selectedTags = [];
    this.destination = { type: 'journal', name: "Today's Journal" };
    this.tagSuggestions = [];

    const overlay = this.ui.$html(`
      <div class="qc-overlay">
        <div class="qc-modal">
          <div class="qc-header">
            <div class="qc-title">
              <span class="ti ti-notes"></span>
              Quick Capture
            </div>
            <button class="qc-close" title="Close (Escape)">
              <span class="ti ti-x"></span>
            </button>
          </div>
          <div class="qc-body">
            <textarea class="qc-textarea" placeholder="What's on your mind?" autofocus></textarea>
            <div class="qc-row">
              <div class="qc-field">
                <label class="qc-label">Destination</label>
                <div class="qc-dest-row">
                  <div class="qc-dest-current">
                    <span class="ti ti-notebook icon"></span>
                    <span class="dest-name">Today's Journal</span>
                  </div>
                  <button class="qc-change-btn" title="Change destination">
                    <span class="ti ti-search"></span>
                  </button>
                </div>
              </div>
              <div class="qc-field">
                <label class="qc-label">Tags</label>
                <input class="qc-input qc-tag-input" placeholder="Add tags..." />
                <div class="qc-tags"></div>
              </div>
            </div>
          </div>
          <div class="qc-footer">
            <div class="qc-hint">
              <kbd>Shift</kbd> + <kbd>Enter</kbd> to save
            </div>
            <div class="qc-actions">
              <button class="qc-btn qc-btn-secondary qc-cancel-btn">Cancel</button>
              <button class="qc-btn qc-btn-primary qc-save-btn">Save</button>
            </div>
          </div>
        </div>
      </div>
    `);

    this.modalOverlay = overlay;
    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('.qc-textarea');
    const saveBtn = overlay.querySelector('.qc-save-btn');
    const cancelBtn = overlay.querySelector('.qc-cancel-btn');
    const closeBtn = overlay.querySelector('.qc-close');
    const changeDestBtn = overlay.querySelector('.qc-change-btn');
    const tagInput = overlay.querySelector('.qc-tag-input');
    const tagsContainer = overlay.querySelector('.qc-tags');

    // Focus textarea
    setTimeout(() => textarea.focus(), 50);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // Close button
    closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn.addEventListener('click', () => this.closeModal());

    // Save button
    saveBtn.addEventListener('click', () => this.saveNote(textarea.value));

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        this.saveNote(textarea.value);
      } else if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Global escape key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') this.closeModal();
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Destination change button - go directly to search
    changeDestBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showPageSearchModal();
    });

    // Tag input
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this.saveNote(textarea.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.addTag(tagInput.value.trim(), tagInput, tagsContainer);
      } else if (e.key === 'Escape') {
        this.closeTagDropdown();
      } else if (e.key === 'Tab' && this.pendingAutoComplete) {
        e.preventDefault();
        this.addTag(this.pendingAutoComplete, tagInput, tagsContainer);
        this.pendingAutoComplete = null;
      }
    });

    tagInput.addEventListener('input', () => {
      this.handleTagInput(tagInput, tagsContainer);
    });

    tagInput.addEventListener('blur', () => {
      setTimeout(() => this.closeTagDropdown(), 200);
    });
  }

  closeModal() {
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    this.closeTagDropdown();
    this.pendingAutoComplete = null;
  }

  updateDestinationDisplay() {
    if (!this.modalOverlay) return;
    const destCurrent = this.modalOverlay.querySelector('.qc-dest-current');
    if (!destCurrent) return;
    
    const iconClass = this.destination.type === 'journal' ? 'ti-notebook' : 'ti-file-text';
    destCurrent.querySelector('.icon').className = `ti ${iconClass} icon`;
    destCurrent.querySelector('.dest-name').textContent = this.destination.name;
  }

  async showPageSearchModal() {
    const searchOverlay = this.ui.$html(`
      <div class="qc-overlay" style="z-index: 10002;">
        <div class="qc-modal" style="width: 400px;">
          <div class="qc-header">
            <div class="qc-title">Select Destination</div>
            <button class="qc-close"><span class="ti ti-x"></span></button>
          </div>
          <div class="qc-body">
            <div class="qc-search-header">
              <input class="qc-input" placeholder="Search pages..." autofocus />
              <button class="qc-journal-btn">
                <span class="ti ti-notebook"></span>
                Journal
              </button>
            </div>
            <div class="qc-search-results" style="max-height: 250px; overflow-y: auto;"></div>
          </div>
        </div>
      </div>
    `);

    document.body.appendChild(searchOverlay);

    const searchInput = searchOverlay.querySelector('.qc-input');
    const resultsContainer = searchOverlay.querySelector('.qc-search-results');
    const closeBtn = searchOverlay.querySelector('.qc-close');
    const journalBtn = searchOverlay.querySelector('.qc-journal-btn');

    setTimeout(() => searchInput.focus(), 50);

    closeBtn.addEventListener('click', () => searchOverlay.remove());
    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) searchOverlay.remove();
    });

    // Quick select Journal
    journalBtn.addEventListener('click', () => {
      this.destination = { type: 'journal', name: "Today's Journal" };
      this.updateDestinationDisplay();
      searchOverlay.remove();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        searchOverlay.remove();
        const textarea = this.modalOverlay?.querySelector('.qc-textarea');
        if (textarea) this.saveNote(textarea.value);
      } else if (e.key === 'Escape') {
        searchOverlay.remove();
      }
    });

    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
          resultsContainer.innerHTML = '<div class="qc-dropdown-empty">Type to search...</div>';
          return;
        }

        const results = await this.searchPages(query);
        if (results.length === 0) {
          resultsContainer.innerHTML = '<div class="qc-dropdown-empty">No pages found</div>';
          return;
        }

        resultsContainer.innerHTML = results.map(r => `
          <div class="qc-dropdown-item" data-guid="${r.guid}">
            <span class="ti ti-file-text"></span>
            ${this.ui.htmlEscape(r.name)}
          </div>
        `).join('');

        resultsContainer.querySelectorAll('.qc-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            const guid = item.dataset.guid;
            const name = item.textContent.trim();
            this.destination = { type: 'page', guid, name };
            this.updateDestinationDisplay();
            searchOverlay.remove();
          });
        });
      }, 200);
    });
  }

  async searchPages(query) {
    try {
      const allRecords = this.data.getAllRecords();
      const results = [];
      
      for (const record of allRecords) {
        const name = record.getName();
        if (name && name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ guid: record.guid, name });
        }
        if (results.length >= 20) break;
      }
      
      return results;
    } catch (error) {
      console.error('[Quick Capture] Search failed:', error);
      return [];
    }
  }

  async handleTagInput(input, tagsContainer) {
    this.closeTagDropdown();
    this.pendingAutoComplete = null;
    
    const query = input.value.trim();
    if (query.length < 2) return;

    try {
      const tags = await this.searchTags(query);
      if (tags.length === 0) return;

      // Auto-complete: if there's exactly one match that starts with the query, auto-fill it
      const queryLower = query.toLowerCase().replace(/^#/, '');
      const exactPrefixMatches = tags.filter(tag => {
        const tagLower = tag.toLowerCase().replace(/^#/, '');
        return tagLower.startsWith(queryLower);
      });

      if (exactPrefixMatches.length === 1) {
        // Auto-complete the tag
        this.pendingAutoComplete = exactPrefixMatches[0];
        
        // Show the autocomplete suggestion in the input
        const suggestion = exactPrefixMatches[0];
        const currentValue = input.value;
        
        // Create ghost text effect by showing dropdown with single highlighted item
        const rect = input.getBoundingClientRect();
        const dropdown = this.ui.$html(`
          <div class="qc-dropdown" style="top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width}px;">
            <div class="qc-dropdown-item selected" data-tag="${this.ui.htmlEscape(suggestion)}">
              <span class="ti ti-hash"></span>
              ${this.ui.htmlEscape(suggestion)}
              <span style="opacity: 0.5; margin-left: auto; font-size: 11px;">Tab to add</span>
            </div>
          </div>
        `);

        document.body.appendChild(dropdown);
        this.tagDropdown = dropdown;

        dropdown.querySelector('.qc-dropdown-item').addEventListener('click', () => {
          this.addTag(suggestion, input, tagsContainer);
          this.closeTagDropdown();
        });
      } else if (tags.length > 0) {
        // Show dropdown with multiple suggestions
        const rect = input.getBoundingClientRect();
        const dropdown = this.ui.$html(`
          <div class="qc-dropdown" style="top: ${rect.bottom + 4}px; left: ${rect.left}px; width: ${rect.width}px;">
            ${tags.map(tag => `
              <div class="qc-dropdown-item" data-tag="${this.ui.htmlEscape(tag)}">
                <span class="ti ti-hash"></span>
                ${this.ui.htmlEscape(tag)}
              </div>
            `).join('')}
          </div>
        `);

        document.body.appendChild(dropdown);
        this.tagDropdown = dropdown;

        dropdown.querySelectorAll('.qc-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            const tag = item.dataset.tag;
            this.addTag(tag, input, tagsContainer);
            this.closeTagDropdown();
          });
        });
      }
    } catch (error) {
      console.error('[Quick Capture] Tag search failed:', error);
    }
  }

  closeTagDropdown() {
    if (this.tagDropdown) {
      this.tagDropdown.remove();
      this.tagDropdown = null;
    }
  }

  async searchTags(query) {
    try {
      const searchQuery = query.startsWith('#') ? query : '#' + query;
      const results = await this.data.searchByQuery(searchQuery, 50);
      const tags = new Set();

      if (results.lines) {
        for (const line of results.lines) {
          if (line.segments) {
            for (const segment of line.segments) {
              if (segment.type === 'hashtag') {
                const tagText = segment.text.startsWith('#') ? segment.text : '#' + segment.text;
                if (tagText.toLowerCase().includes(query.toLowerCase().replace(/^#/, ''))) {
                  tags.add(tagText);
                }
              }
            }
          }
        }
      }

      return Array.from(tags).slice(0, 10);
    } catch (error) {
      console.error('[Quick Capture] Tag search failed:', error);
      return [];
    }
  }

  addTag(tagText, input, container) {
    if (!tagText) return;
    
    // Normalize tag
    let tag = tagText.startsWith('#') ? tagText : '#' + tagText;
    tag = tag.replace(/\s+/g, '-');
    
    // Don't add duplicates
    if (this.selectedTags.includes(tag)) {
      input.value = '';
      this.pendingAutoComplete = null;
      return;
    }

    this.selectedTags.push(tag);
    input.value = '';
    this.pendingAutoComplete = null;
    this.closeTagDropdown();
    this.renderTags(container);
  }

  renderTags(container) {
    container.innerHTML = this.selectedTags.map(tag => `
      <span class="qc-tag">
        ${this.ui.htmlEscape(tag)}
        <span class="qc-tag-remove" data-tag="${this.ui.htmlEscape(tag)}">&times;</span>
      </span>
    `).join('');

    container.querySelectorAll('.qc-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        this.selectedTags = this.selectedTags.filter(t => t !== tag);
        this.renderTags(container);
      });
    });
  }

  async saveNote(content) {
    content = content.trim();
    if (!content) {
      this.ui.addToaster({
        title: 'Empty Note',
        message: 'Please enter some text to capture.',
        dismissible: true,
        autoDestroyTime: 2000
      });
      return;
    }

    try {
      let targetRecord;

      if (this.destination.type === 'journal') {
        targetRecord = await this.getJournalToday();
      } else if (this.destination.type === 'page' && this.destination.guid) {
        targetRecord = this.data.getRecord(this.destination.guid);
      }

      if (!targetRecord) {
        this.ui.addToaster({
          title: 'Error',
          message: 'Could not find destination page.',
          dismissible: true,
          autoDestroyTime: 3000
        });
        return;
      }

      await this.addNoteToRecord(targetRecord, content);

      this.ui.addToaster({
        title: 'Note Captured!',
        message: `Added to ${this.destination.name}`,
        dismissible: true,
        autoDestroyTime: 2500
      });

      // Bounce the status bar icon
      if (this.statusBarItem) {
        const element = this.statusBarItem.getElement();
        if (element) this.ui.bounce(element);
      }

      this.closeModal();
    } catch (error) {
      console.error('[Quick Capture] Save failed:', error);
      this.ui.addToaster({
        title: 'Error',
        message: 'Failed to save note: ' + error.message,
        dismissible: true,
        autoDestroyTime: 3000
      });
    }
  }

  async addNoteToRecord(record, content) {
    const lineItems = await record.getLineItems();
    const recordGuid = record.guid;
    
    // Find the last direct child of the record
    let lastDirectChild = null;
    for (const item of lineItems) {
      if (item.parent_guid === recordGuid) {
        lastDirectChild = item;
      }
    }

    // Create timestamp
    const timestamp = this.formatTimestamp();
    const contentLines = content.split('\n');

    // Create main note line with timestamp
    const mainLine = await record.createLineItem(null, lastDirectChild, 'text');
    if (!mainLine) {
      throw new Error('Failed to create line item');
    }

    // Build segments for the first line
    const firstLineSegments = [];
    
    // Add first line of content
    firstLineSegments.push({ type: 'text', text: contentLines[0] });
    
    // Add tags
    if (this.selectedTags.length > 0) {
      firstLineSegments.push({ type: 'text', text: ' ' });
      for (const tag of this.selectedTags) {
        firstLineSegments.push({ type: 'hashtag', text: tag });
        firstLineSegments.push({ type: 'text', text: ' ' });
      }
    }
    
    // Add timestamp at the end
    firstLineSegments.push({ type: 'text', text: ' — ' + timestamp });
    
    mainLine.setSegments(firstLineSegments);

    // Add remaining lines as children (indented)
    let lastChild = null;
    for (let i = 1; i < contentLines.length; i++) {
      const line = contentLines[i];
      if (line.trim() === '') continue; // Skip empty lines
      
      const childLine = await record.createLineItem(mainLine, lastChild, 'text');
      if (childLine) {
        childLine.setSegments([{ type: 'text', text: line }]);
        lastChild = childLine;
      }
    }
  }

  formatTimestamp() {
    const now = new Date();
    return now.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  async getJournalToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayYYYYMMDD = `${year}${month}${day}`;
    
    const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const fullDateWithWeekday = today.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    try {
      // Find Journal collection
      const collections = await this.data.getAllCollections();
      
      for (const collection of collections) {
        const collName = collection.getName();
        
        if (collName && collName.toLowerCase() === 'journal') {
          const journalRecords = await collection.getAllRecords();
          
          // Try to find today's entry by GUID suffix
          for (const record of journalRecords) {
            const guid = record.guid;
            const name = record.getName();
            
            if (guid && guid.endsWith(todayYYYYMMDD)) {
              return record;
            }
            
            if (name && (name.includes(monthDay) || name.includes(todayYYYYMMDD))) {
              return record;
            }
          }
          
          // Create new journal entry for today
          const newGuid = collection.createRecord(fullDateWithWeekday);
          if (newGuid) {
            const newRecord = this.data.getRecord(newGuid);
            if (newRecord) return newRecord;
          }
          
          // Fallback to most recent entry
          if (journalRecords.length > 0) {
            let latestRecord = journalRecords[0];
            let latestDate = '';
            
            for (const record of journalRecords) {
              const guid = record.guid;
              const dateMatch = guid.match(/(\d{8})$/);
              if (dateMatch && dateMatch[1] > latestDate) {
                latestDate = dateMatch[1];
                latestRecord = record;
              }
            }
            
            return latestRecord;
          }
        }
      }
      
      // Fallback: try active record
      const activePanel = this.ui.getActivePanel();
      if (activePanel) {
        const activeRecord = activePanel.getActiveRecord();
        if (activeRecord) return activeRecord;
      }
      
      // Last resort: search all records for today's journal
      const allRecords = this.data.getAllRecords();
      for (const record of allRecords) {
        if (record.guid && record.guid.endsWith(todayYYYYMMDD)) {
          return record;
        }
      }
      
    } catch (error) {
      console.error('[Quick Capture] Error finding journal:', error);
    }
    
    return null;
  }
}
