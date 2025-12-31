/**
 * Voice Manager - High-Precision Karaoke Speech System
 *
 * Features:
 * - FORCES English locale (en-US) to fix French accent
 * - SLOW speech rate (0.7) for karaoke sync
 * - Garbage collection prevention (persistent reference)
 * - Cancel-first rule to clear voice buffer
 * - onboundary support for charIndex mapping
 */

// ==================== PERSISTENT STORAGE (Anti-GC) ====================
// Store utterance persistently to prevent garbage collection
// which breaks onboundary heartbeats
window.therapistUtterance = null;
window.__SPEECH_LOCK__ = null;
window.__KARAOKE_ACTIVE__ = false;

export const voiceManager = {
    // ==================== CONFIGURATION ====================
    config: {
        // FORCE English locale - removes French accent
        lang: 'en-US',
        // SLOW rate for karaoke synchronization
        rate: 0.7,
        pitch: 1.0,
        volume: 1.0
    },

    // State
    state: {
        isSpeechActive: false,
        selectedVoice: null
    },

    // ==================== INITIALIZATION ====================
    init: function() {
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported');
            return;
        }

        // Load voices
        this.loadVoices();

        // Chrome loads voices async
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }

        console.log('[VOICE] Manager initialized with English locale forcing');
    },

    /**
     * Load and select English voice
     */
    loadVoices: function() {
        const voices = speechSynthesis.getVoices();
        if (voices.length === 0) return;

        // Try to find an English voice (prefer Zira on Windows)
        const englishVoice = voices.find(v =>
            v.lang.startsWith('en') && /zira/i.test(v.name)
        ) || voices.find(v =>
            v.lang.startsWith('en')
        );

        if (englishVoice) {
            this.state.selectedVoice = englishVoice;
            console.log('[VOICE] Selected:', englishVoice.name, '(' + englishVoice.lang + ')');
        }
    },

    // ==================== SPEECH CREATION ====================
    /**
     * Create utterance with FORCED English locale
     * Prevents French accent by explicitly setting lang and voice
     */
    createUtterance: function(text, options = {}) {
        const utterance = new SpeechSynthesisUtterance(text);

        // *** FORCE ENGLISH LOCALE (The French Fix) ***
        utterance.lang = this.config.lang;

        // Assign selected English voice if available
        if (this.state.selectedVoice) {
            utterance.voice = this.state.selectedVoice;
        }

        // Apply speech parameters
        utterance.rate = options.rate !== undefined ? options.rate : this.config.rate;
        utterance.pitch = options.pitch !== undefined ? options.pitch : this.config.pitch;
        utterance.volume = options.volume !== undefined ? options.volume : this.config.volume;

        // *** PERSISTENT REFERENCE (Anti-GC for onboundary) ***
        window.therapistUtterance = utterance;
        window.__SPEECH_LOCK__ = utterance;
        this._currentUtterance = utterance;

        console.log('[VOICE] Utterance created:', {
            text: text.substring(0, 30) + '...',
            lang: utterance.lang,
            voice: utterance.voice?.name || 'default',
            rate: utterance.rate
        });

        return utterance;
    },

    /**
     * Speak text with English locale forcing
     */
    speak: function(text, options = {}) {
        const self = this;

        return new Promise((resolve, reject) => {
            // *** CANCEL-FIRST RULE: Clear French voice buffer ***
            speechSynthesis.cancel();

            setTimeout(function() {
                const utterance = self.createUtterance(text, options);

                // Track speech state
                utterance.onstart = function() {
                    self.state.isSpeechActive = true;
                    window.__KARAOKE_ACTIVE__ = true;
                    console.log('[VOICE] Speech started');
                    // Disable hybrid input mic buttons during AI speech
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.disableAllMicButtons();
                    }
                };

                utterance.onend = function() {
                    self.state.isSpeechActive = false;
                    window.__KARAOKE_ACTIVE__ = false;
                    console.log('[VOICE] Speech completed');
                    // Re-enable hybrid input mic buttons after AI speech
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.enableAllMicButtons();
                    }
                    resolve();
                };

                utterance.onerror = function(event) {
                    self.state.isSpeechActive = false;
                    window.__KARAOKE_ACTIVE__ = false;
                    console.error('[VOICE] Speech error:', event);
                    // Re-enable hybrid input mic buttons on error
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.enableAllMicButtons();
                    }
                    reject(event);
                };

                speechSynthesis.speak(utterance);
            }, 50);
        });
    },

    /**
     * Speak with karaoke callbacks (onboundary for charIndex mapping)
     */
    speakWithKaraoke: function(text, callbacks = {}, options = {}) {
        const self = this;

        // *** CANCEL-FIRST RULE: Clear French voice buffer ***
        speechSynthesis.cancel();

        return new Promise((resolve) => {
            setTimeout(function() {
                const utterance = self.createUtterance(text, options);

                // *** onboundary - The Karaoke Heartbeat ***
                // Fires for each word with charIndex
                if (callbacks.onBoundary) {
                    utterance.onboundary = callbacks.onBoundary;
                }

                // Track speech state
                utterance.onstart = function() {
                    self.state.isSpeechActive = true;
                    window.__KARAOKE_ACTIVE__ = true;
                    console.log('[VOICE] Karaoke started');
                    // Disable hybrid input mic buttons during AI karaoke
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.disableAllMicButtons();
                    }
                    if (callbacks.onStart) {
                        callbacks.onStart();
                    }
                };

                utterance.onend = function(event) {
                    self.state.isSpeechActive = false;
                    window.__KARAOKE_ACTIVE__ = false;
                    console.log('[VOICE] Karaoke completed');
                    // Re-enable hybrid input mic buttons after AI karaoke
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.enableAllMicButtons();
                    }
                    if (callbacks.onEnd) {
                        callbacks.onEnd(event);
                    }
                };

                utterance.onerror = function(event) {
                    self.state.isSpeechActive = false;
                    window.__KARAOKE_ACTIVE__ = false;
                    console.error('[VOICE] Karaoke error:', event);
                    // Re-enable hybrid input mic buttons on error
                    if (SpeechGame.hybridInput) {
                        SpeechGame.hybridInput.enableAllMicButtons();
                    }
                    if (callbacks.onError) {
                        callbacks.onError(event);
                    }
                };

                speechSynthesis.speak(utterance);
                resolve(utterance);
            }, 50);
        });
    },

    // ==================== UTILITY ====================
    /**
     * Cancel speech and clear voice buffer
     */
    cancel: function() {
        // Clear the French voice buffer
        speechSynthesis.cancel();
        this.state.isSpeechActive = false;
        window.__KARAOKE_ACTIVE__ = false;
        window.therapistUtterance = null;
        window.__SPEECH_LOCK__ = null;
        this._currentUtterance = null;
    },

    isSpeaking: function() {
        return this.state.isSpeechActive || speechSynthesis.speaking;
    },

    pause: function() {
        speechSynthesis.pause();
    },

    resume: function() {
        speechSynthesis.resume();
    },

    getVoiceInfo: function() {
        return {
            name: this.state.selectedVoice?.name || 'System Default',
            lang: this.config.lang,
            rate: this.config.rate,
            pitch: this.config.pitch
        };
    },

    /**
     * Test the voice
     */
    testVoice: function() {
        const testPhrase = "Hello! I am your speech therapy assistant. Let's practice together!";
        console.log('[TEST] Speaking with:', this.getVoiceInfo());
        this.speak(testPhrase);
    },

    /**
     * Change speech rate (0.5 = very slow, 1.0 = normal)
     */
    setRate: function(rate) {
        this.config.rate = rate;
        console.log('[VOICE] Rate changed to:', rate);
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.voiceManager = voiceManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    voiceManager.init();
});
