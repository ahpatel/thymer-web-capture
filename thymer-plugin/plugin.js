// Thymer Web Capture Plugin
// Receives web captures from the Chrome extension and adds them to Thymer

class Plugin extends AppPlugin {
  onLoad() {
    console.log('[Web Capture] Plugin loading...');
    this.setupMessageListener();
    this.setupStatusBar();
    this.setupCommandPalette();
    
    console.log('[Web Capture] Plugin loaded and ready');
  }

  onUnload() {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
    if (this.statusBarItem) {
      this.statusBarItem.remove();
    }
  }

  setupMessageListener() {
    this.messageHandler = async (event) => {
      // Only accept messages from our extension bridge
      if (event.source !== window) return;
      if (!event.data || event.data.source !== 'thymer-extension') return;

      const { type, messageId, payload, query } = event.data;
      console.log('[Web Capture] Received message:', type, messageId);
      
      let response = { error: 'Unknown message type' };

      try {
        switch (type) {
          case 'THYMER_PING':
            console.log('[Web Capture] Handling PING');
            response = { connected: true };
            break;

          case 'THYMER_CAPTURE':
            console.log('[Web Capture] Handling CAPTURE');
            response = await this.handleCapture(payload);
            break;

          case 'THYMER_SEARCH':
            console.log('[Web Capture] Handling SEARCH:', query);
            response = await this.handleSearch(query);
            break;

          case 'THYMER_GET_TAGS':
            console.log('[Web Capture] Handling GET_TAGS:', query);
            response = await this.handleGetTags(query);
            break;

          default:
            console.warn('[Web Capture] Unknown message type:', type);
        }
      } catch (error) {
        console.error('[Web Capture] Error handling message:', error);
        response = { error: error.message };
      }

      console.log('[Web Capture] Sending response:', response);
      
      // Send response back to the bridge
      window.postMessage({
        type: 'THYMER_RESPONSE',
        messageId,
        response,
        source: 'thymer-plugin'
      }, '*');
    };

    window.addEventListener('message', this.messageHandler);
    console.log('[Web Capture] Message listener registered');
  }

  setupStatusBar() {
    this.statusBarItem = this.ui.addStatusBarItem({
      icon: 'paperclip',
      tooltip: 'Web Capture - Ready',
      onClick: () => {
        this.ui.addToaster({
          title: 'Web Capture',
          message: 'Extension bridge is active. Use the Chrome extension to capture content.',
          dismissible: true,
          autoDestroyTime: 3000
        });
      }
    });
  }

  setupCommandPalette() {
    this.ui.addCommandPaletteCommand({
      label: 'Web Capture: Show Status',
      icon: 'paperclip',
      onSelected: () => {
        this.ui.addToaster({
          title: 'Web Capture Status',
          message: 'Extension bridge is active and ready to receive captures.',
          dismissible: true,
          autoDestroyTime: 3000
        });
      }
    });
  }

  async handleCapture(payload) {
    const { mode, url, title, content, images, tags, destination } = payload;
    console.log('[Web Capture] Processing capture:', { mode, url, title, destination });
    console.log('[Web Capture] Content length:', content?.length || 0, 'Images:', images?.length || 0);

    try {
      let targetRecord;

      if (destination.type === 'journal') {
        console.log('[Web Capture] Getting journal for today');
        targetRecord = await this.getJournalToday();
      } else if (destination.type === 'page' && destination.pageGuid) {
        console.log('[Web Capture] Getting page:', destination.pageGuid);
        targetRecord = this.data.getRecord(destination.pageGuid);
      }

      if (!targetRecord) {
        console.error('[Web Capture] Could not find destination page');
        return { error: 'Could not find destination page. Try selecting a specific page instead of Journal.' };
      }

      console.log('[Web Capture] Target record:', targetRecord.getName());

      // Get existing line items to find where to append at the END
      const lineItems = await targetRecord.getLineItems();
      
      // Find the last DIRECT CHILD of the record (parent = record guid)
      const recordGuid = targetRecord.guid;
      let lastDirectChild = null;
      for (const item of lineItems) {
        if (item.parent_guid === recordGuid) {
          lastDirectChild = item;
        }
      }

      // Create new line item(s) - use string literals for types
      if (mode === 'link') {
        // Title line + indented URL line
        console.log('[Web Capture] Creating link line items');
        
        // First line: Bold title with timestamp (non-journal only) and tags
        const titleLine = await targetRecord.createLineItem(null, lastDirectChild, 'text');
        if (titleLine) {
          const titleSegments = [{ type: 'bold', text: title || 'Untitled' }];
          if (destination.type !== 'journal') {
            titleSegments.push({ type: 'text', text: ' — ' });
            titleSegments.push({ type: 'text', text: this.formatTimestamp() });
          }
          if (tags && tags.length > 0) {
            titleSegments.push({ type: 'text', text: ' ' });
            for (const tag of tags) {
              titleSegments.push({ type: 'hashtag', text: tag });
              titleSegments.push({ type: 'text', text: ' ' });
            }
          }
          titleLine.setSegments(titleSegments);
          
          // Second line: Indented URL (child of title line)
          if (url) {
            const urlLine = await targetRecord.createLineItem(titleLine, null, 'text');
            if (urlLine) {
              urlLine.setSegments([
                { type: 'text', text: 'URL: ' },
                { type: 'link', text: url }
              ]);
            }
          }
          console.log('[Web Capture] Link lines created successfully');
        } else {
          console.error('[Web Capture] Failed to create line item');
          return { error: 'Failed to create line item' };
        }
      } else {
        // Selection or full page: Title + URL + quoted content
        console.log('[Web Capture] Creating content line items');
        
        // First line: Bold title with tags
        const titleLine = await targetRecord.createLineItem(null, lastDirectChild, 'text');
        if (!titleLine) {
          console.error('[Web Capture] Failed to create title line');
          return { error: 'Failed to create line item' };
        }
        
        const titleSegments = [{ type: 'bold', text: title || 'Untitled' }];
        if (destination.type !== 'journal') {
          titleSegments.push({ type: 'text', text: ' — ' });
          titleSegments.push({ type: 'text', text: this.formatTimestamp() });
        }
        if (tags && tags.length > 0) {
          titleSegments.push({ type: 'text', text: ' ' });
          for (const tag of tags) {
            titleSegments.push({ type: 'hashtag', text: tag });
            titleSegments.push({ type: 'text', text: ' ' });
          }
        }
        titleLine.setSegments(titleSegments);
        
        // Second line: Indented URL (child of title line)
        let lastChild = null;
        if (url) {
          const urlLine = await targetRecord.createLineItem(titleLine, null, 'text');
          if (urlLine) {
            urlLine.setSegments([
              { type: 'text', text: 'URL: ' },
              { type: 'link', text: url }
            ]);
            lastChild = urlLine;
          }
        }

        // Add content as indented quote lines (children of title line)
        if (content) {
          const contentLines = content.split('\n').filter(line => line.trim());
          
          for (const line of contentLines.slice(0, 20)) { // Limit to 20 lines
            const textLine = await targetRecord.createLineItem(titleLine, lastChild, 'quote');
            if (textLine) {
              textLine.setSegments([{ type: 'text', text: line.trim() }]);
              lastChild = textLine;
            }
          }
        }

        // Add images as indented links (children of title line)
        if (images && images.length > 0) {
          console.log('[Web Capture] Adding', images.length, 'images');
          for (const imgSrc of images.slice(0, 5)) { // Limit to 5 images
            if (imgSrc.startsWith('data:')) {
              continue; // Skip base64 for now
            }
            const imgLine = await targetRecord.createLineItem(titleLine, lastChild, 'text');
            if (imgLine) {
              imgLine.setSegments([{ type: 'link', text: imgSrc }]);
              lastChild = imgLine;
            }
          }
        }
      }

      // Show success notification
      this.showCaptureSuccess(title, destination.type);

      return { success: true };
    } catch (error) {
      console.error('[Web Capture] Capture failed:', error);
      return { error: error.message };
    }
  }

  async getJournalToday() {
    console.log('[Web Capture] ========== JOURNAL LOOKUP START ==========');
    
    // Get today's date in multiple formats
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayYYYYMMDD = `${year}${month}${day}`; // "20251229"
    
    const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); // "December 29"
    const fullDateWithWeekday = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); // "Monday, December 29, 2025"
    
    console.log('[Web Capture] Looking for date YYYYMMDD:', todayYYYYMMDD, 'or', monthDay);
    
    try {
      // STRATEGY 1: Get Journal collection and match by GUID date suffix
      console.log('[Web Capture] Trying Journal collection approach...');
      const collections = await this.data.getAllCollections();
      console.log('[Web Capture] Found', collections.length, 'collections');
      
      for (const collection of collections) {
        const collName = collection.getName();
        console.log('[Web Capture] Collection:', collName);
        
        // Look for Journal collection
        if (collName && collName.toLowerCase() === 'journal') {
          console.log('[Web Capture] Found Journal collection, getting records...');
          const journalRecords = await collection.getAllRecords();
          console.log('[Web Capture] Journal has', journalRecords.length, 'records');
          
          for (const record of journalRecords) {
            const guid = record.guid;
            const name = record.getName();
            console.log('[Web Capture] Journal record - name:', name, 'guid:', guid);
            
            // Match by GUID - Journal GUIDs end with YYYYMMDD
            if (guid && guid.endsWith(todayYYYYMMDD)) {
              console.log('[Web Capture] FOUND by GUID date match:', guid);
              return record;
            }
            
            // Also try matching by name if it has the date
            if (name && (name.includes(monthDay) || name.includes(todayYYYYMMDD))) {
              console.log('[Web Capture] FOUND by name match:', name);
              return record;
            }
          }
          
          // If we found the Journal collection but no entry for today, create one
          console.log('[Web Capture] No entry for today, creating new journal entry...');
          const newGuid = collection.createRecord(fullDateWithWeekday);
          if (newGuid) {
            console.log('[Web Capture] Created new journal entry:', newGuid);
            const newRecord = this.data.getRecord(newGuid);
            if (newRecord) {
              return newRecord;
            }
          }
          
          // If creation failed, use the most recent journal entry (last in list)
          if (journalRecords.length > 0) {
            // Find the entry with the highest date in GUID
            let latestRecord = journalRecords[0];
            let latestDate = '';
            
            for (const record of journalRecords) {
              const guid = record.guid;
              // Extract date from GUID (last 8 characters)
              const dateMatch = guid.match(/(\d{8})$/);
              if (dateMatch && dateMatch[1] > latestDate) {
                latestDate = dateMatch[1];
                latestRecord = record;
              }
            }
            
            console.log('[Web Capture] Using most recent journal entry:', latestRecord.guid);
            return latestRecord;
          }
        }
      }
      
      // STRATEGY 2: Try to use the currently active/open record in Thymer
      const activePanel = this.ui.getActivePanel();
      if (activePanel) {
        const activeRecord = activePanel.getActiveRecord();
        if (activeRecord) {
          const activeName = activeRecord.getName();
          const activeGuid = activeRecord.guid;
          console.log('[Web Capture] Active panel record:', activeName, 'guid:', activeGuid);
          
          // Check if active record is today's journal by GUID
          if (activeGuid && activeGuid.endsWith(todayYYYYMMDD)) {
            console.log('[Web Capture] Active record IS today\'s journal!');
            return activeRecord;
          }
          
          // Use active record as fallback
          console.log('[Web Capture] Using active record as fallback');
          return activeRecord;
        }
      }
      
      // STRATEGY 3: Scan all records for GUID match
      console.log('[Web Capture] Last resort: scanning all records by GUID...');
      const allRecords = this.data.getAllRecords();
      for (const record of allRecords) {
        if (record.guid && record.guid.endsWith(todayYYYYMMDD)) {
          console.log('[Web Capture] Found by GUID in all records:', record.guid);
          return record;
        }
      }
      
    } catch (error) {
      console.error('[Web Capture] Error finding journal:', error);
    }
    
    console.log('[Web Capture] ========== JOURNAL LOOKUP FAILED ==========');
    return null;
  }

  async handleSearch(query) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      console.log('[Web Capture] Searching for:', query);
      
      // Use the synchronous getAllRecords() from DataAPI
      const allRecords = this.data.getAllRecords();
      console.log('[Web Capture] Total records in workspace:', allRecords.length);
      
      const matchingResults = [];
      
      for (const record of allRecords) {
        const name = record.getName();
        const guid = record.guid;
        
        console.log('[Web Capture] Checking record:', name, guid);
        
        // Check if name matches query (case-insensitive)
        if (name && name.toLowerCase().includes(query.toLowerCase())) {
          matchingResults.push({
            guid: guid,
            name: name
          });
        }
      }
      
      console.log('[Web Capture] Found', matchingResults.length, 'matching records');
      
      if (matchingResults.length > 0) {
        return matchingResults.slice(0, 20);
      }
      
      // Fallback to searchByQuery for content search
      const results = await this.data.searchByQuery(query, 20);
      const mapped = results.records.map(record => ({
        guid: record.guid,
        name: record.getName()
      }));
      
      console.log('[Web Capture] searchByQuery found', mapped.length, 'results');
      return mapped;
    } catch (error) {
      console.error('[Web Capture] Search failed:', error);
      return [];
    }
  }

  async handleGetTags(query) {
    if (!query) return [];

    try {
      // Search for hashtags - try multiple approaches
      const searchQuery = query.startsWith('#') ? query : '#' + query;
      console.log('[Web Capture] Searching for tags:', searchQuery);
      
      const tags = new Set();
      
      // Approach 1: Search for the hashtag directly
      const results = await this.data.searchByQuery(searchQuery, 50);
      console.log('[Web Capture] Tag search returned', results.lines?.length || 0, 'lines');
      
      if (results.lines && results.lines.length > 0) {
        for (const line of results.lines) {
          if (line.segments) {
            for (const segment of line.segments) {
              console.log('[Web Capture] Segment:', segment.type, segment.text);
              if (segment.type === 'hashtag') {
                // Ensure tag starts with #
                const tagText = segment.text.startsWith('#') ? segment.text : '#' + segment.text;
                tags.add(tagText);
              }
            }
          }
        }
      }
      
      // Approach 2: Also search without the # to find partial matches
      if (tags.size === 0) {
        const plainQuery = query.replace(/^#/, '');
        console.log('[Web Capture] Trying plain search:', plainQuery);
        const plainResults = await this.data.searchByQuery(plainQuery, 50);
        
        if (plainResults.lines) {
          for (const line of plainResults.lines) {
            if (line.segments) {
              for (const segment of line.segments) {
                if (segment.type === 'hashtag') {
                  const tagText = segment.text.startsWith('#') ? segment.text : '#' + segment.text;
                  if (tagText.toLowerCase().includes(plainQuery.toLowerCase())) {
                    tags.add(tagText);
                  }
                }
              }
            }
          }
        }
      }

      const tagArray = Array.from(tags).slice(0, 10);
      console.log('[Web Capture] Found tags:', tagArray);
      return tagArray;
    } catch (error) {
      console.error('[Web Capture] Get tags failed:', error);
      return [];
    }
  }

  formatTimestamp() {
    const now = new Date();
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return now.toLocaleString('en-US', options);
  }

  buildLinkSegments(url, title, tags) {
    const segments = [];
    
    const displayTitle = title || url;
    
    // Use linkobj with just title - URL will be set via setMetaProperty on line item
    segments.push({ type: 'linkobj', text: displayTitle });
    
    // Add tags
    if (tags && tags.length > 0) {
      segments.push({ type: 'text', text: ' ' });
      for (const tag of tags) {
        segments.push({ type: 'hashtag', text: tag });
        segments.push({ type: 'text', text: ' ' });
      }
    }

    return segments;
  }

  buildTagSegments(tags) {
    const segments = [];
    for (let i = 0; i < tags.length; i++) {
      segments.push({ type: 'hashtag', text: tags[i] });
      if (i < tags.length - 1) {
        segments.push({ type: 'text', text: ' ' });
      }
    }
    return segments;
  }

  showCaptureSuccess(title, destinationType) {
    const truncatedTitle = title.length > 40 ? title.substring(0, 40) + '...' : title;
    const destName = destinationType === 'journal' ? 'Journal' : 'selected page';
    
    this.ui.addToaster({
      title: 'Captured!',
      message: '"' + truncatedTitle + '" added to ' + destName,
      dismissible: true,
      autoDestroyTime: 2500
    });

    if (this.statusBarItem) {
      const element = this.statusBarItem.getElement();
      if (element) {
        this.ui.bounce(element);
      }
    }
  }
}
