/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    STYLE NORMALIZER MODULE                                ║
 * ║              Kindly Cute Design System Implementation                     ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Normalizes the style of any category card before rendering.              ║
 * ║  Ensures consistent "Kindly Cute" appearance across all 141 categories.   ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

export const styleNormalizer = {
    // ==================== CONFIGURATION ====================
    config: {
        // Design tokens that match kindly-cute-theme.css
        tokens: {
            radius: {
                sm: '16px',
                md: '24px',
                lg: '32px',
                xl: '40px',
                pill: '100px',
                circle: '50%'
            },
            fontSize: {
                xs: '14px',
                sm: '18px',
                md: '24px',
                lg: '28px',
                xl: '32px'
            },
            spacing: {
                xs: '8px',
                sm: '12px',
                md: '20px',
                lg: '28px',
                xl: '40px'
            },
            colors: {
                teal: '#7EC8C8',
                tealLight: '#A8E0E0',
                tealDark: '#5BA3A3',
                yellow: '#FFF4CC',
                yellowLight: '#FFFAE6',
                yellowDark: '#FFE699',
                lavender: '#D4B8E0',
                lavenderLight: '#E8D4F0',
                coral: '#FFAB91',
                coralDark: '#FF8A65',
                mint: '#A5D6A7',
                sky: '#90CAF9',
                textPrimary: '#4A3728',
                textMuted: '#8D7A6A',
                karaokeHighlight: '#FF6B00'
            },
            fonts: {
                display: "'Fredoka One', cursive",
                body: "'OpenDyslexic', 'Nunito', sans-serif"
            }
        },

        // Element type mappings for normalization
        elementStyles: {
            // Card containers
            '.card-content': {
                borderRadius: '32px',
                border: '5px solid #FFAB91',
                padding: '28px',
                background: 'linear-gradient(180deg, #FFF9E6 0%, #FFE4B5 100%)'
            },
            '.card-category': {
                fontFamily: "'Fredoka One', cursive",
                fontSize: '28px',
                borderRadius: '24px',
                padding: '8px 28px'
            },
            '.card-question': {
                fontFamily: "'OpenDyslexic', 'Nunito', sans-serif",
                fontSize: '24px',
                borderRadius: '24px',
                padding: '16px 24px',
                border: '4px dashed #FFE699'
            },
            // Inputs
            'input[type="text"]': {
                fontFamily: "'OpenDyslexic', 'Nunito', sans-serif",
                fontSize: '18px',
                borderRadius: '24px',
                padding: '12px 20px',
                border: '4px solid #E0D4C8'
            },
            'textarea': {
                fontFamily: "'OpenDyslexic', 'Nunito', sans-serif",
                fontSize: '18px',
                borderRadius: '24px',
                padding: '12px 20px',
                border: '4px solid #E0D4C8'
            },
            // Buttons
            '.choice-btn': {
                borderRadius: '24px',
                fontSize: '18px',
                padding: '14px 20px',
                border: '4px solid #FFE699',
                background: '#FFFAE6'
            },
            '.word-box': {
                borderRadius: '24px',
                fontSize: '18px',
                padding: '12px 20px',
                border: '4px solid #4A3728'
            },
            '.submit-btn, .card-submit': {
                borderRadius: '100px',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '18px',
                padding: '12px 28px'
            },
            '.skip-btn, .card-skip': {
                borderRadius: '100px',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '16px',
                padding: '10px 24px'
            },
            // Image containers
            '.image-box': {
                borderRadius: '24px',
                border: '5px solid #FFAB91'
            },
            // Labels
            '.word-label': {
                borderRadius: '100px',
                fontSize: '16px',
                padding: '6px 20px',
                fontWeight: 'bold'
            }
        }
    },

    // ==================== STATE ====================
    state: {
        isInitialized: false,
        normalizedCount: 0
    },

    // ==================== INITIALIZATION ====================
    init: function() {
        if (this.state.isInitialized) return;

        console.log('[STYLE-NORMALIZER] Initializing Kindly Cute design system');
        this.state.isInitialized = true;

        // Listen for card modal visibility changes
        this.observeCardModal();
    },

    /**
     * Observe the card modal for visibility changes to normalize styles
     */
    observeCardModal: function() {
        const self = this;
        const cardModal = document.getElementById('cardModal');

        if (!cardModal) {
            // Retry after DOM is ready
            setTimeout(function() { self.observeCardModal(); }, 500);
            return;
        }

        // Use MutationObserver to detect when card modal becomes visible
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!cardModal.classList.contains('hidden')) {
                        // Card modal is now visible, normalize styles
                        setTimeout(function() {
                            self.normalizeCard(cardModal);
                        }, 50);
                    }
                }
            });
        });

        observer.observe(cardModal, { attributes: true });
        console.log('[STYLE-NORMALIZER] Card modal observer attached');
    },

    // ==================== NORMALIZATION FUNCTIONS ====================

    /**
     * Main normalization function - called before card is displayed
     * @param {HTMLElement} container - The card container to normalize
     * @param {string} categoryType - Optional category type for specific handling
     */
    normalizeCard: function(container, categoryType) {
        if (!container) return;

        const self = this;
        const config = this.config.elementStyles;

        // Apply styles to each element type
        Object.keys(config).forEach(function(selector) {
            const elements = container.querySelectorAll(selector);
            elements.forEach(function(el) {
                self.applyStyles(el, config[selector]);
            });
        });

        // Normalize specific components
        this.normalizeInputs(container);
        this.normalizeButtons(container);
        this.normalizeImages(container);
        this.normalizeKaraokeText(container);

        this.state.normalizedCount++;
        console.log('[STYLE-NORMALIZER] Card normalized (#' + this.state.normalizedCount + ')');
    },

    /**
     * Apply style object to an element
     * @param {HTMLElement} element - Target element
     * @param {object} styles - Style properties to apply
     */
    applyStyles: function(element, styles) {
        if (!element || !styles) return;

        Object.keys(styles).forEach(function(prop) {
            element.style[prop] = styles[prop];
        });
    },

    /**
     * Normalize all text inputs in a container
     * @param {HTMLElement} container
     */
    normalizeInputs: function(container) {
        const inputs = container.querySelectorAll('input[type="text"], textarea');
        const tokens = this.config.tokens;

        inputs.forEach(function(input) {
            // Apply Kindly Cute input styles
            input.style.fontFamily = tokens.fonts.body;
            input.style.fontSize = tokens.fontSize.sm;
            input.style.borderRadius = tokens.radius.md;
            input.style.padding = tokens.spacing.sm + ' ' + tokens.spacing.md;
            input.style.border = '4px solid #E0D4C8';
            input.style.outline = 'none';
            input.style.transition = 'all 0.2s ease';
            input.style.color = tokens.colors.textPrimary;

            // Add focus state handler
            input.addEventListener('focus', function() {
                this.style.borderColor = tokens.colors.teal;
                this.style.boxShadow = '0 0 0 4px rgba(126, 200, 200, 0.3)';
            });

            input.addEventListener('blur', function() {
                this.style.borderColor = '#E0D4C8';
                this.style.boxShadow = 'none';
            });
        });
    },

    /**
     * Normalize all buttons in a container
     * @param {HTMLElement} container
     */
    normalizeButtons: function(container) {
        const tokens = this.config.tokens;

        // Choice buttons
        const choiceBtns = container.querySelectorAll('.choice-btn');
        choiceBtns.forEach(function(btn) {
            btn.style.borderRadius = tokens.radius.md;
            btn.style.fontSize = tokens.fontSize.sm;
            btn.style.fontFamily = tokens.fonts.body;
            btn.style.padding = '14px 20px';
            btn.style.border = '4px solid ' + tokens.colors.yellowDark;
            btn.style.background = tokens.colors.yellowLight;
            btn.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });

        // Word boxes
        const wordBoxes = container.querySelectorAll('.word-box');
        wordBoxes.forEach(function(box) {
            box.style.borderRadius = tokens.radius.md;
            box.style.fontSize = tokens.fontSize.sm;
            box.style.fontFamily = tokens.fonts.body;
            box.style.fontWeight = 'bold';
            box.style.padding = '12px 20px';
            box.style.border = '4px solid ' + tokens.colors.textPrimary;
            box.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });

        // Submit buttons
        const submitBtns = container.querySelectorAll('.submit-btn, .card-submit, [class*="submit"]');
        submitBtns.forEach(function(btn) {
            btn.style.borderRadius = tokens.radius.pill;
            btn.style.fontFamily = tokens.fonts.display;
            btn.style.fontSize = tokens.fontSize.sm;
            btn.style.padding = '12px 28px';
            btn.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });

        // Skip buttons
        const skipBtns = container.querySelectorAll('.skip-btn, .card-skip, [class*="skip"]');
        skipBtns.forEach(function(btn) {
            btn.style.borderRadius = tokens.radius.pill;
            btn.style.fontFamily = tokens.fonts.display;
            btn.style.fontSize = '16px';
            btn.style.padding = '10px 24px';
        });
    },

    /**
     * Normalize image containers
     * @param {HTMLElement} container
     */
    normalizeImages: function(container) {
        const tokens = this.config.tokens;

        const imageBoxes = container.querySelectorAll('.image-box');
        imageBoxes.forEach(function(box) {
            box.style.borderRadius = tokens.radius.md;
            box.style.border = '5px solid ' + tokens.colors.coral;
            box.style.overflow = 'hidden';
            box.style.boxShadow = '0 6px 0 ' + tokens.colors.coralDark + ', 0 10px 20px rgba(0, 0, 0, 0.15)';
        });

        // Word labels
        const wordLabels = container.querySelectorAll('.word-label');
        wordLabels.forEach(function(label) {
            label.style.borderRadius = tokens.radius.pill;
            label.style.fontSize = '16px';
            label.style.fontFamily = tokens.fonts.body;
            label.style.fontWeight = 'bold';
            label.style.padding = '6px 20px';
        });
    },

    /**
     * Normalize karaoke text for consistent highlighting
     * @param {HTMLElement} container
     */
    normalizeKaraokeText: function(container) {
        const tokens = this.config.tokens;

        // Find karaoke spans
        const karaokeSpans = container.querySelectorAll('.karaoke-word, [data-word-index]');
        karaokeSpans.forEach(function(span) {
            span.style.display = 'inline';
            span.style.transition = 'all 0.15s ease';
        });

        // Set up highlight class if not already defined
        this.ensureKaraokeHighlightStyle();
    },

    /**
     * Ensure karaoke highlight style is injected
     */
    ensureKaraokeHighlightStyle: function() {
        if (document.getElementById('kc-karaoke-highlight-style')) return;

        const style = document.createElement('style');
        style.id = 'kc-karaoke-highlight-style';
        style.textContent = `
            .karaoke-word.active,
            [data-word-index].active,
            .kc-karaoke-word.active {
                color: #FF6B00 !important;
                background: rgba(255, 107, 0, 0.15) !important;
                border-radius: 8px !important;
                padding: 2px 6px !important;
                font-weight: bold !important;
                text-shadow: 0 0 10px rgba(255, 107, 0, 0.5) !important;
            }
        `;
        document.head.appendChild(style);
    },

    // ==================== CATEGORY-SPECIFIC HANDLERS ====================

    /**
     * Apply category-specific styling adjustments
     * @param {HTMLElement} container
     * @param {string} categoryType - The category type (e.g., 'adverbs', 'synonyms')
     */
    applyCategorySpecificStyles: function(container, categoryType) {
        if (!categoryType) return;

        const type = categoryType.toLowerCase().replace(/[^a-z]/g, '');

        // Category-specific adjustments
        switch (type) {
            case 'comparativessuperlatives':
            case 'comparatives':
                this.styleComparatives(container);
                break;
            case 'sequencing':
            case 'sequencingpictures':
                this.styleSequencing(container);
                break;
            case 'sentencebuilding':
            case 'sentencebuildingwithimages':
                this.styleSentenceBuilding(container);
                break;
            case 'multiplechoice':
                this.styleMultipleChoice(container);
                break;
            case 'isvsare':
            case 'wasvswere':
            case 'yesnoquestions':
            case 'binarychoice':
                this.styleBinaryChoice(container);
                break;
            case 'inferencing':
            case 'inferencinglevel1':
            case 'inferencinglevel2':
                this.styleInferencing(container);
                break;
            case 'similes':
                this.styleSimiles(container);
                break;
            case 'rhyming':
            case 'rhymingwords':
                this.styleRhyming(container);
                break;
            default:
                // Default styling already applied
                break;
        }
    },

    /**
     * Style comparatives category
     */
    styleComparatives: function(container) {
        const tokens = this.config.tokens;

        const inputGroups = container.querySelectorAll('.comparatives-input-group');
        inputGroups.forEach(function(group) {
            group.style.display = 'flex';
            group.style.flexDirection = 'column';
            group.style.alignItems = 'center';
            group.style.gap = tokens.spacing.xs;
        });

        const fields = container.querySelectorAll('.comparatives-field');
        fields.forEach(function(field) {
            field.style.borderRadius = tokens.radius.md;
            field.style.border = '4px solid ' + tokens.colors.sky;
            field.style.textAlign = 'center';
        });
    },

    /**
     * Style sequencing category
     */
    styleSequencing: function(container) {
        const imageBoxes = container.querySelectorAll('.sequencing-layout .image-box');
        imageBoxes.forEach(function(box) {
            box.style.width = '160px';
            box.style.height = '130px';
        });
    },

    /**
     * Style sentence building category
     */
    styleSentenceBuilding: function(container) {
        const tokens = this.config.tokens;

        const display = container.querySelector('.sentence-display');
        if (display) {
            display.style.borderRadius = tokens.radius.md;
            display.style.border = '4px dashed ' + tokens.colors.yellowDark;
            display.style.background = tokens.colors.yellowLight;
            display.style.minHeight = '60px';
            display.style.padding = tokens.spacing.md;
        }

        const sentenceWords = container.querySelectorAll('.sentence-word');
        sentenceWords.forEach(function(word) {
            word.style.background = tokens.colors.teal;
            word.style.borderRadius = tokens.radius.sm;
            word.style.padding = '8px 14px';
        });
    },

    /**
     * Style multiple choice category
     */
    styleMultipleChoice: function(container) {
        const tokens = this.config.tokens;

        const choiceContainer = container.querySelector('.multiple-choice-container');
        if (choiceContainer) {
            choiceContainer.style.display = 'flex';
            choiceContainer.style.flexDirection = 'column';
            choiceContainer.style.gap = tokens.spacing.sm;
        }
    },

    /**
     * Style binary choice cards (Is/Are, Was/Were, Yes/No)
     */
    styleBinaryChoice: function(container) {
        const tokens = this.config.tokens;

        // Style buttons
        const buttons = container.querySelectorAll('.binary-choice-btn');
        buttons.forEach(function(btn) {
            btn.style.fontFamily = tokens.fonts.display;
            btn.style.fontSize = tokens.fontSize.md;
            btn.style.borderRadius = tokens.radius.lg;
            btn.style.padding = tokens.spacing.sm + ' ' + tokens.spacing.lg;
            btn.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        });

        // Style text container
        const textEl = container.querySelector('.binary-choice-text');
        if (textEl) {
            textEl.style.fontFamily = tokens.fonts.body;
            textEl.style.fontSize = tokens.fontSize.md;
            textEl.style.borderRadius = tokens.radius.md;
        }

        // Style blank placeholder
        const blank = container.querySelector('.binary-choice-blank');
        if (blank) {
            blank.style.borderRadius = tokens.radius.sm;
            blank.style.fontWeight = 'bold';
        }
    },

    /**
     * Style inferencing cards
     */
    styleInferencing: function(container) {
        const tokens = this.config.tokens;

        const imageSection = container.querySelector('.inf-unified-image-section');
        if (imageSection) {
            imageSection.style.borderRadius = tokens.radius.md;
            imageSection.style.border = '4px solid ' + tokens.colors.sky;
        }

        const paragraph = container.querySelector('.inf-unified-paragraph');
        if (paragraph) {
            paragraph.style.fontFamily = tokens.fonts.body;
            paragraph.style.fontSize = tokens.fontSize.sm;
            paragraph.style.borderRadius = tokens.radius.md;
            paragraph.style.lineHeight = '1.6';
        }
    },

    /**
     * Style similes cards
     */
    styleSimiles: function(container) {
        const tokens = this.config.tokens;

        const prompt = container.querySelector('.similes-unified-prompt');
        if (prompt) {
            prompt.style.fontFamily = tokens.fonts.body;
            prompt.style.fontSize = tokens.fontSize.md;
            prompt.style.borderRadius = tokens.radius.md;
        }

        const blank = container.querySelector('.similes-unified-blank');
        if (blank) {
            blank.style.borderRadius = tokens.radius.sm;
        }
    },

    /**
     * Style rhyming cards
     */
    styleRhyming: function(container) {
        const tokens = this.config.tokens;

        const word = container.querySelector('.rhyming-unified-word');
        if (word) {
            word.style.fontFamily = tokens.fonts.display;
            word.style.fontSize = tokens.fontSize.xl;
            word.style.borderRadius = tokens.radius.lg;
        }

        const choices = container.querySelectorAll('.rhyming-unified-choice');
        choices.forEach(function(choice) {
            choice.style.fontFamily = tokens.fonts.body;
            choice.style.fontSize = tokens.fontSize.sm;
            choice.style.borderRadius = tokens.radius.md;
            choice.style.fontWeight = 'bold';
        });
    },

    // ==================== UTILITY FUNCTIONS ====================

    /**
     * Add bounce animation to an element
     * @param {HTMLElement} element
     */
    addBounceAnimation: function(element) {
        if (!element) return;

        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = 'kc-bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
    },

    /**
     * Add wiggle animation (for incorrect answers)
     * @param {HTMLElement} element
     */
    addWiggleAnimation: function(element) {
        if (!element) return;

        element.style.animation = 'kc-wiggle 0.2s ease';
        setTimeout(function() {
            element.style.animation = '';
        }, 200);
    },

    /**
     * Mark input as correct
     * @param {HTMLElement} input
     */
    markCorrect: function(input) {
        if (!input) return;

        input.style.borderColor = '#4CAF50';
        input.style.background = '#E8F5E9';
        this.addBounceAnimation(input);
    },

    /**
     * Mark input as incorrect
     * @param {HTMLElement} input
     */
    markIncorrect: function(input) {
        if (!input) return;

        input.style.borderColor = '#F44336';
        input.style.background = '#FFEBEE';
        this.addWiggleAnimation(input);
    },

    /**
     * Reset input to default state
     * @param {HTMLElement} input
     */
    resetInput: function(input) {
        if (!input) return;

        input.style.borderColor = '#E0D4C8';
        input.style.background = '#FFFFFF';
        input.style.animation = '';
    },

    /**
     * Get CSS variable value
     * @param {string} varName - CSS variable name (without --)
     * @returns {string}
     */
    getCSSVar: function(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue('--kc-' + varName).trim();
    },

    /**
     * Normalize a single element by selector
     * @param {string} selector
     * @param {HTMLElement} container - Optional container to search within
     */
    normalizeElement: function(selector, container) {
        const ctx = container || document;
        const elements = ctx.querySelectorAll(selector);
        const config = this.config.elementStyles[selector];

        if (config) {
            const self = this;
            elements.forEach(function(el) {
                self.applyStyles(el, config);
            });
        }
    },

    /**
     * Force normalize entire page (for debugging)
     */
    forceNormalizeAll: function() {
        console.log('[STYLE-NORMALIZER] Force normalizing all cards...');
        const cardModal = document.getElementById('cardModal');
        if (cardModal) {
            this.normalizeCard(cardModal);
        }
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.styleNormalizer = styleNormalizer;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    styleNormalizer.init();
});

// Also expose as global for debugging
window.StyleNormalizer = styleNormalizer;
