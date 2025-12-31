/**
 * AI Voice Display Module
 * Child-friendly karaoke-style voice-to-text component
 * Synchronizes word highlighting with speech synthesis
 */
window.SpeechGame = window.SpeechGame || {};

SpeechGame.aiVoice = {
    // Configuration
    config: {
        // Average milliseconds per word (adjusted based on speech rate)
        msPerWord: 350,
        // Pause duration for punctuation
        punctuationPause: {
            '.': 400,
            '!': 400,
            '?': 400,
            ',': 200,
            ':': 250,
            ';': 250
        },
        // Auto-hide delay after speech completes (ms)
        autoHideDelay: 2000,
        // Default AI character emoji
        defaultCharacter: '🤖',
        // Available character themes
        characters: {
            robot: '🤖',
            owl: '🦉',
            bear: '🐻',
            star: '⭐',
            penguin: '🐧',
            bunny: '🐰'
        }
    },

    // State
    state: {
        isShowing: false,
        isSpeaking: false,
        currentWordIndex: 0,
        words: [],
        wordTimings: [],
        utterance: null,
        hideTimeout: null,
        wordIntervals: []
    },

    // DOM references
    dom: {
        container: null,
        bubble: null,
        character: null,
        characterEmoji: null,
        textContainer: null
    },

    /**
     * Initialize the AI Voice Display
     */
    init: function() {
        this.dom.container = document.getElementById('aiVoiceContainer');
        this.dom.character = document.getElementById('aiCharacter');
        this.dom.characterEmoji = document.querySelector('.ai-character-emoji');
        this.dom.textContainer = document.getElementById('aiVoiceText');

        if (!this.dom.container) {
            console.warn('AI Voice Display: Container not found');
            return;
        }

        console.log('AI Voice Display initialized');
    },

    /**
     * Set the AI character emoji
     * @param {string} emoji - The emoji to display
     */
    setCharacter: function(emoji) {
        if (this.dom.characterEmoji) {
            this.dom.characterEmoji.textContent = emoji;
        }
    },

    /**
     * Show the voice display container
     */
    show: function() {
        if (!this.dom.container) return;

        this.dom.container.classList.remove('hidden');
        // Small delay to trigger CSS transition
        requestAnimationFrame(() => {
            this.dom.container.classList.add('visible');
        });
        this.state.isShowing = true;
    },

    /**
     * Hide the voice display container
     */
    hide: function() {
        if (!this.dom.container) return;

        this.dom.container.classList.remove('visible');
        // Wait for transition to complete before hiding
        setTimeout(() => {
            this.dom.container.classList.add('hidden');
        }, 400);

        this.state.isShowing = false;
        this.stopSpeaking();
    },

    /**
     * Parse text into words with punctuation handling
     * @param {string} text - The text to parse
     * @returns {Array} Array of word objects
     */
    parseText: function(text) {
        if (!text) return [];

        // Split by spaces but keep punctuation attached
        const rawWords = text.split(/\s+/).filter(w => w.length > 0);
        const words = [];

        rawWords.forEach((word, index) => {
            // Check if word ends with punctuation
            const punctMatch = word.match(/^(.+?)([.!?,;:]+)$/);

            if (punctMatch) {
                // Add the word without punctuation
                words.push({
                    text: punctMatch[1],
                    index: words.length,
                    isPunctuation: false
                });
                // Add punctuation as separate element
                words.push({
                    text: punctMatch[2],
                    index: words.length,
                    isPunctuation: true,
                    pauseMs: this.config.punctuationPause[punctMatch[2][0]] || 200
                });
            } else {
                words.push({
                    text: word,
                    index: words.length,
                    isPunctuation: false
                });
            }
        });

        return words;
    },

    /**
     * Render words to the display
     * @param {Array} words - Array of word objects
     */
    renderWords: function(words) {
        if (!this.dom.textContainer) return;

        this.dom.textContainer.innerHTML = '';
        this.dom.textContainer.classList.remove('complete');

        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'ai-word upcoming';
            if (word.isPunctuation) {
                span.classList.add('punctuation');
            }
            span.textContent = word.text;
            span.dataset.index = index;
            this.dom.textContainer.appendChild(span);
        });
    },

    /**
     * Calculate word timings based on speech rate
     * @param {Array} words - Array of word objects
     * @param {number} speechRate - Speech synthesis rate (0.1 to 2)
     * @returns {Array} Array of timing objects
     */
    calculateTimings: function(words, speechRate) {
        const baseMs = this.config.msPerWord / speechRate;
        const timings = [];
        let currentTime = 100; // Small initial delay

        words.forEach((word, index) => {
            if (word.isPunctuation) {
                // Punctuation gets a pause but no separate highlight
                currentTime += word.pauseMs / speechRate;
            } else {
                timings.push({
                    index: index,
                    startTime: currentTime,
                    duration: baseMs
                });
                currentTime += baseMs;
            }
        });

        return timings;
    },

    /**
     * Highlight a specific word
     * @param {number} index - Word index to highlight
     */
    highlightWord: function(index) {
        if (!this.dom.textContainer) return;

        const wordElements = this.dom.textContainer.querySelectorAll('.ai-word');

        wordElements.forEach((el, i) => {
            el.classList.remove('active', 'spoken', 'upcoming');

            if (i < index) {
                el.classList.add('spoken');
            } else if (i === index) {
                el.classList.add('active');
            } else {
                el.classList.add('upcoming');
            }
        });

        this.state.currentWordIndex = index;
    },

    /**
     * Mark all words as complete
     */
    markComplete: function() {
        if (!this.dom.textContainer) return;

        const wordElements = this.dom.textContainer.querySelectorAll('.ai-word');
        wordElements.forEach(el => {
            el.classList.remove('active', 'upcoming');
            el.classList.add('spoken');
        });
        this.dom.textContainer.classList.add('complete');
    },

    /**
     * Start the speaking animation on the character
     */
    startSpeakingAnimation: function() {
        if (this.dom.character) {
            this.dom.character.classList.add('speaking');
        }
        this.state.isSpeaking = true;
    },

    /**
     * Stop the speaking animation
     */
    stopSpeakingAnimation: function() {
        if (this.dom.character) {
            this.dom.character.classList.remove('speaking');
        }
        this.state.isSpeaking = false;
    },

    /**
     * Clear all word highlighting intervals
     */
    clearIntervals: function() {
        this.state.wordIntervals.forEach(interval => clearTimeout(interval));
        this.state.wordIntervals = [];
    },

    /**
     * Stop speaking and reset state
     */
    stopSpeaking: function() {
        // Cancel speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        this.clearIntervals();
        this.stopSpeakingAnimation();

        if (this.state.hideTimeout) {
            clearTimeout(this.state.hideTimeout);
            this.state.hideTimeout = null;
        }

        this.state.currentWordIndex = 0;
        this.state.words = [];
    },

    /**
     * Speak text with synchronized karaoke display
     * @param {string} text - Text to speak
     * @param {Object} options - Options (rate, pitch, character)
     * @returns {Promise} Resolves when speech completes
     */
    speak: function(text, options = {}) {
        const self = this;
        const rate = options.rate || 0.9;
        const pitch = options.pitch || 1.1;
        const character = options.character || this.config.defaultCharacter;
        const autoHide = options.autoHide !== false;

        return new Promise((resolve) => {
            // Check for speech synthesis support
            if (!('speechSynthesis' in window)) {
                console.warn('Speech synthesis not supported');
                resolve();
                return;
            }

            // Stop any current speech
            this.stopSpeaking();

            // Set character
            this.setCharacter(character);

            // Parse and render words
            this.state.words = this.parseText(text);
            this.renderWords(this.state.words);

            // Calculate timings
            const timings = this.calculateTimings(this.state.words, rate);

            // Show the display
            this.show();

            // Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = rate;
            utterance.pitch = pitch;
            this.state.utterance = utterance;

            // Start speaking animation
            this.startSpeakingAnimation();

            // Schedule word highlights
            timings.forEach((timing, i) => {
                const timeout = setTimeout(() => {
                    self.highlightWord(timing.index);
                }, timing.startTime);
                self.state.wordIntervals.push(timeout);
            });

            // Handle speech end
            utterance.onend = function() {
                self.markComplete();
                self.stopSpeakingAnimation();

                // Auto-hide after delay
                if (autoHide) {
                    self.state.hideTimeout = setTimeout(() => {
                        self.hide();
                    }, self.config.autoHideDelay);
                }

                resolve();
            };

            utterance.onerror = function(event) {
                console.error('Speech synthesis error:', event);
                self.stopSpeakingAnimation();
                self.hide();
                resolve();
            };

            // Speak!
            window.speechSynthesis.speak(utterance);
        });
    },

    /**
     * Show loading state
     */
    showLoading: function() {
        if (!this.dom.textContainer) return;

        this.show();
        this.dom.textContainer.innerHTML = `
            <div class="ai-voice-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        this.startSpeakingAnimation();
    },

    /**
     * Quick display without speech (for testing or silent mode)
     * @param {string} text - Text to display
     * @param {number} duration - How long to show (ms)
     */
    display: function(text, duration = 3000) {
        this.stopSpeaking();
        this.state.words = this.parseText(text);
        this.renderWords(this.state.words);

        // Mark all as spoken immediately
        const wordElements = this.dom.textContainer.querySelectorAll('.ai-word');
        wordElements.forEach(el => {
            el.classList.remove('upcoming');
            el.classList.add('spoken');
        });

        this.show();

        // Auto-hide
        this.state.hideTimeout = setTimeout(() => {
            this.hide();
        }, duration);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    SpeechGame.aiVoice.init();
});
