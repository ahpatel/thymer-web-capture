/**
 * Thymer Indent Rainbow Plugin
 * 
 * Adds rainbow-colored vertical indent guides to Thymer's editor.
 * Each indentation level gets a unique color, similar to how IDEs color
 * matching brackets or indent guides at different nesting levels.
 * 
 * Features:
 * - Rainbow-colored vertical indent lines
 * - Enhanced visibility on hover
 * - Smooth color transitions
 * - Command palette toggle for different color schemes
 */

class Plugin extends AppPlugin {
    onLoad() {
        // Storage keys for persisting settings
        const STORAGE_KEY = 'indent-rainbow-scheme';
        const WIDTH_KEY = 'indent-rainbow-width';
        const OPACITY_KEY = 'indent-rainbow-opacity';
        const ENABLED_KEY = 'indent-rainbow-enabled';

        // Color schemes for different tastes
        const colorSchemes = {
            rainbow: {
                name: 'Rainbow',
                colors: [
                    '#ff5f5f',  // Red
                    '#ffbd2e',  // Orange
                    '#feca57',  // Yellow
                    '#28c940',  // Green
                    '#00d0ff',  // Blue
                    '#5856d6',  // Indigo
                    '#ff2d55',  // Pink
                    '#af52de',  // Purple
                ]
            },
            ocean: {
                name: 'Ocean',
                colors: [
                    '#0077b6',  // Deep blue
                    '#00b4d8',  // Bright cyan
                    '#48cae4',  // Light cyan
                    '#90e0ef',  // Pale cyan
                    '#ade8f4',  // Ice blue
                    '#caf0f8',  // Lightest cyan
                    '#023e8a',  // Navy
                    '#0096c7',  // Medium blue
                ]
            },
            sunset: {
                name: 'Sunset',
                colors: [
                    '#ff6b6b',  // Coral red
                    '#ff8e53',  // Warm orange
                    '#feca57',  // Golden yellow
                    '#ff9ff3',  // Pink
                    '#f368e0',  // Magenta
                    '#ff6b81',  // Rose
                    '#ee5a24',  // Burnt orange
                    '#ff4757',  // Bright red
                ]
            },
            forest: {
                name: 'Forest',
                colors: [
                    '#2d6a4f',  // Deep forest
                    '#40916c',  // Forest green
                    '#52b788',  // Fresh green
                    '#74c69d',  // Light green
                    '#95d5b2',  // Pale green
                    '#b7e4c7',  // Mint
                    '#1b4332',  // Dark forest
                    '#d8f3dc',  // Lightest green
                ]
            },
            neon: {
                name: 'Neon',
                colors: [
                    '#ff00ff',  // Magenta
                    '#00ffff',  // Cyan
                    '#ff00aa',  // Hot pink
                    '#00ff88',  // Neon green
                    '#ffff00',  // Yellow
                    '#ff6600',  // Orange
                    '#aa00ff',  // Purple
                    '#00aaff',  // Electric blue
                ]
            },
            monochrome: {
                name: 'Monochrome',
                colors: [
                    '#6b7280',  // Gray 500
                    '#9ca3af',  // Gray 400
                    '#d1d5db',  // Gray 300
                    '#4b5563',  // Gray 600
                    '#374151',  // Gray 700
                    '#e5e7eb',  // Gray 200
                    '#1f2937',  // Gray 800
                    '#f3f4f6',  // Gray 100
                ]
            }
        };

        // Get saved scheme or default to rainbow
        let currentScheme = localStorage.getItem(STORAGE_KEY) || 'rainbow';
        if (!colorSchemes[currentScheme]) {
            currentScheme = 'rainbow';
        }

        // Reference to injected style element
        let styleElement = null;

        // Get saved settings or defaults
        let currentWidth = parseInt(localStorage.getItem(WIDTH_KEY)) || 2;
        let currentOpacity = parseFloat(localStorage.getItem(OPACITY_KEY)) || 0.3;
        let isEnabled = localStorage.getItem(ENABLED_KEY) !== 'false'; // default true

        // Opacity presets
        const opacityPresets = {
            subtle: { name: 'Subtle', value: 0.2 },
            normal: { name: 'Normal', value: 0.3 },
            bold: { name: 'Bold', value: 0.45 }
        };

        // Generate CSS for a given color scheme
        const generateCSS = (schemeName) => {
            const scheme = colorSchemes[schemeName];
            const colors = scheme.colors;

            // Base styles with dynamic width and opacity
            let css = `
/* Thymer Indent Rainbow - ${scheme.name} Theme */

/* CSS Variables for theming */
:root {
    --bt-line-width: ${currentWidth}px;
    --bt-line-opacity: ${currentOpacity};
    --bt-line-opacity-hover: ${Math.min(currentOpacity + 0.5, 0.9)};
    --bt-transition-duration: 0.15s;
}

/* CRITICAL: Provide fallback values for Thymer's inline calc() expressions.
   Without these, height calculations like "calc(127px - var(--line-height))" resolve to 0.
   These are scoped to indent lines only to avoid affecting other Thymer elements. */
.listitem-indentline {
    --line-height: 26px;
    --checkbox-size: 23.5px;
    --bullet-size: 8px;
}

/* Base styling for indent lines - lighter by default */
.listitem-indentline {
    transition: opacity var(--bt-transition-duration) ease,
                filter var(--bt-transition-duration) ease,
                background-color var(--bt-transition-duration) ease,
                border-color var(--bt-transition-duration) ease !important;
    opacity: var(--bt-line-opacity) !important;
    min-width: var(--bt-line-width) !important;
    width: var(--bt-line-width) !important;
}

/* Ensure task and bullet indent lines have minimum height as safety net */
.listitem-task .listitem-indentline,
.listitem-ulist .listitem-indentline {
    min-height: 20px !important;
}

/* Ensure indent lines are visible for all item types */
.listitem-text .listitem-indentline,
.listitem-task .listitem-indentline,
.listitem-ulist .listitem-indentline {
    display: block !important;
    visibility: visible !important;
}

/* Highlight on hover - make the line darker/brighter */
.listitem:hover > .line-div > .listitem-indentline,
.listitem:hover > .line-check-div ~ .line-div > .listitem-indentline {
    opacity: var(--bt-line-opacity-hover) !important;
    filter: brightness(1.2) !important;
}

/* Highlight on focus (cursor position) - strongest emphasis */
.bt-focused > .line-div > .listitem-indentline,
.bt-focused > .line-check-div ~ .line-div > .listitem-indentline {
    opacity: 1 !important;
    filter: brightness(1.3) drop-shadow(0 0 2px currentColor) !important;
}

/* Color levels based on margin-left (30px increments) */
`;

            // Generate color rules for each indentation level
            // Level 0 is at margin-left: 0px, Level 1 at 30px, etc.
            for (let level = 0; level < 12; level++) {
                const marginLeft = level * 30;
                const colorIndex = level % colors.length;
                const color = colors[colorIndex];

                css += `
/* Level ${level + 1} (margin-left: ${marginLeft}px) */

/* Plain text and bullet items - margin on line-div */
.line-div[style*="margin-left: ${marginLeft}px"] > .listitem-indentline,
.line-div[style*="margin-left:${marginLeft}px"] > .listitem-indentline {
    background-color: ${color} !important;
    border-color: ${color} !important;
}

/* Task items - margin is on line-check-div, color the sibling line-div's indent line */
.line-check-div[style*="margin-left: ${marginLeft}px"] ~ .line-div > .listitem-indentline,
.line-check-div[style*="margin-left:${marginLeft}px"] ~ .line-div > .listitem-indentline {
    background-color: ${color} !important;
    border-color: ${color} !important;
}

/* Fallback for .listitem with margin-left */
.listitem[style*="margin-left: ${marginLeft}px"] .listitem-indentline,
.listitem[style*="margin-left:${marginLeft}px"] .listitem-indentline {
    background-color: ${color} !important;
    border-color: ${color} !important;
}
`;
            }

            // Additional hover effects for enhanced threading visibility
            css += `
/* Enhanced hover states - brighten the threading path */
.listitem:hover .line-div .listitem-indentline {
    filter: brightness(1.1);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
    :root {
        --bt-line-opacity: 0.35;
    }
    
    .listitem-indentline {
        filter: brightness(1.1);
    }
}

/* Support for Thymer's dark theme via class */
.dark .listitem-indentline,
[data-theme="dark"] .listitem-indentline {
    filter: brightness(1.1);
    --bt-line-opacity: 0.35;
}

/* Smooth animation when expanding/collapsing */
.listitem-indentline {
    transform-origin: top;
}
`;

            return css;
        };

        // Inject, update, or remove CSS
        const applySettings = () => {
            if (!isEnabled) {
                // Remove styles when disabled
                if (styleElement) {
                    styleElement.textContent = '';
                }
                return;
            }

            localStorage.setItem(STORAGE_KEY, currentScheme);
            localStorage.setItem(WIDTH_KEY, currentWidth);
            localStorage.setItem(OPACITY_KEY, currentOpacity);
            localStorage.setItem(ENABLED_KEY, isEnabled);

            const css = generateCSS(currentScheme);

            if (styleElement) {
                styleElement.textContent = css;
            } else {
                styleElement = this.ui.injectCSS(css);
            }
        };

        // Legacy wrapper for theme switching
        const applyColorScheme = (schemeName) => {
            currentScheme = schemeName;
            applySettings();
        };

        // Initial CSS injection
        applySettings();

        // =====================================================
        // Focus Tracking (Virtual Input Position Tracking)
        // =====================================================
        // Thymer uses a virtual input system where the browser's Selection API
        // always points to #editor-meta, not the actual list items.
        // We track focus by watching the virtualinput-wrapper's transform
        // position and using elementFromPoint to find the focused line.

        let currentFocusedItem = null;
        let rafPending = false;
        let virtualInputWrapper = null;
        let lastTransform = '';  // Cache to skip redundant updates

        // O(1) lookup for navigation keys
        const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace', 'Tab']);

        const updateFocusedItem = () => {
            rafPending = false;

            // Find the virtual input wrapper if not cached
            if (!virtualInputWrapper) {
                virtualInputWrapper = document.getElementById('virtualinput-wrapper');
            }

            if (!virtualInputWrapper) {
                return;
            }

            // Parse the transform to get cursor position
            const style = virtualInputWrapper.style.transform;

            // Skip if transform hasn't changed (cursor didn't move)
            if (style === lastTransform) {
                return;
            }
            lastTransform = style;

            const match = style.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);

            if (!match) {
                return;
            }

            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);

            // Use elementFromPoint to find what's at the cursor position
            // Add a small offset to ensure we hit the line content area
            const element = document.elementFromPoint(x + 50, y + 10);

            if (!element) {
                if (currentFocusedItem) {
                    currentFocusedItem.classList.remove('bt-focused');
                    currentFocusedItem = null;
                }
                return;
            }

            // Walk up to find parent .listitem
            let node = element;
            while (node && !node.classList?.contains('listitem')) {
                node = node.parentElement;
            }

            // Update focus class if the focused item changed
            if (node !== currentFocusedItem) {
                if (currentFocusedItem) {
                    currentFocusedItem.classList.remove('bt-focused');
                }
                if (node) {
                    node.classList.add('bt-focused');
                }
                currentFocusedItem = node;
            }
        };

        const scheduleUpdate = () => {
            // Debounce with RAF to batch with browser paint cycle
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(updateFocusedItem);
            }
        };

        // Watch for changes to the virtual input wrapper's style (transform)
        const setupObserver = () => {
            virtualInputWrapper = document.getElementById('virtualinput-wrapper');

            if (!virtualInputWrapper) {
                // Retry until the wrapper exists
                setTimeout(setupObserver, 100);
                return;
            }

            // Observe style attribute changes on the virtual input wrapper
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.attributeName === 'style') {
                        scheduleUpdate();
                    }
                }
            });

            observer.observe(virtualInputWrapper, {
                attributes: true,
                attributeFilter: ['style']
            });

            // Initial update
            scheduleUpdate();
        };

        // Start observing
        setupObserver();

        // Also listen for keyboard events as backup (O(1) Set lookup)
        document.addEventListener('keyup', (e) => {
            if (NAV_KEYS.has(e.key)) {
                scheduleUpdate();
            }
        });

        // Listen for clicks in editor area only (avoid processing unrelated clicks)
        const editorContainer = document.querySelector('.editor-wrapper, .page-content, #editor');
        if (editorContainer) {
            editorContainer.addEventListener('click', scheduleUpdate);
        } else {
            // Fallback to document if editor container not found
            document.addEventListener('click', scheduleUpdate);
        }

        // Add command palette commands for each color scheme
        Object.keys(colorSchemes).forEach(schemeKey => {
            const scheme = colorSchemes[schemeKey];
            this.ui.addCommandPaletteCommand({
                label: `Indent Rainbow: ${scheme.name} Theme`,
                icon: 'ti-palette',
                onSelected: () => {
                    applyColorScheme(schemeKey);
                    this.ui.showToaster({
                        message: `Indent rainbow set to ${scheme.name} theme`,
                        type: 'success',
                        duration: 2000
                    });
                }
            });
        });

        // Toggle command
        this.ui.addCommandPaletteCommand({
            label: 'Indent Rainbow: Toggle On/Off',
            icon: 'ti-toggle-left',
            onSelected: () => {
                isEnabled = !isEnabled;
                localStorage.setItem(ENABLED_KEY, isEnabled);
                applySettings();
                this.ui.showToaster({
                    message: `Indent Rainbow ${isEnabled ? 'enabled' : 'disabled'}`,
                    type: 'success',
                    duration: 1500
                });
            }
        });

        // Width commands
        [1, 2, 3].forEach(w => {
            this.ui.addCommandPaletteCommand({
                label: `Indent Rainbow: Set Width - ${w}px`,
                icon: 'ti-arrows-horizontal',
                onSelected: () => {
                    currentWidth = w;
                    applySettings();
                    this.ui.showToaster({
                        message: `Line width set to ${w}px`,
                        type: 'success',
                        duration: 1500
                    });
                }
            });
        });

        // Opacity commands
        Object.keys(opacityPresets).forEach(key => {
            const preset = opacityPresets[key];
            this.ui.addCommandPaletteCommand({
                label: `Indent Rainbow: Opacity - ${preset.name}`,
                icon: 'ti-brightness-half',
                onSelected: () => {
                    currentOpacity = preset.value;
                    applySettings();
                    this.ui.showToaster({
                        message: `Opacity set to ${preset.name}`,
                        type: 'success',
                        duration: 1500
                    });
                }
            });
        });

        // Add status bar indicator with current theme
        const statusBarItem = this.ui.addStatusBarItem({
            icon: 'ti-paint',
            label: colorSchemes[currentScheme].name,
            tooltip: `Thymer Indent Rainbow: ${colorSchemes[currentScheme].name} theme - Click to cycle`,
            onClick: () => {
                // Cycle through themes
                const schemeKeys = Object.keys(colorSchemes);
                const currentIndex = schemeKeys.indexOf(currentScheme);
                const nextIndex = (currentIndex + 1) % schemeKeys.length;
                const nextScheme = schemeKeys[nextIndex];

                applyColorScheme(nextScheme);
                statusBarItem.setLabel(colorSchemes[nextScheme].name);
                statusBarItem.setTooltip(`Thymer Indent Rainbow: ${colorSchemes[nextScheme].name} theme - Click to cycle`);

                this.ui.showToaster({
                    message: `Indent Rainbow: ${colorSchemes[nextScheme].name}`,
                    type: 'success',
                    duration: 1500
                });
            }
        });
    }
}
