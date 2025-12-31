/**
 * Hybrid Input Module - Voice-to-Text for Therapy Cards
 *
 * Provides mic buttons for text fields, allowing therapists to
 * speak answers directly into text inputs using SpeechRecognition API.
 *
 * Features:
 * - Adds mic button to any text input field
 * - Real-time speech-to-text transcription
 * - Visual feedback during recording
 * - State-Lock integration for Focus Card sync
 */

export const hybridInput = {
    // ==================== CONFIGURATION ====================
    config: {
        lang: 'en-US',
        continuous: false,
        interimResults: true,
        maxAlternatives: 1
    },

    // ==================== STATE ====================
    state: {
        isRecording: false,
        activeInput: null,
        recognition: null
    },

    // ==================== INITIALIZATION ====================
    init: function() {
        // Check for SpeechRecognition support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('[HYBRID-INPUT] SpeechRecognition not supported in this browser');
            return false;
        }

        this.state.recognition = new SpeechRecognition();
        this.state.recognition.lang = this.config.lang;
        this.state.recognition.continuous = this.config.continuous;
        this.state.recognition.interimResults = this.config.interimResults;
        this.state.recognition.maxAlternatives = this.config.maxAlternatives;

        this.setupRecognitionHandlers();
        console.log('[HYBRID-INPUT] Initialized with SpeechRecognition support');
        return true;
    },

    // ==================== RECOGNITION HANDLERS ====================
    setupRecognitionHandlers: function() {
        const self = this;
        const recognition = this.state.recognition;

        recognition.onstart = function() {
            self.state.isRecording = true;
            self.updateMicButtonState(true);
            console.log('[HYBRID-INPUT] Recording started');
        };

        recognition.onend = function() {
            self.state.isRecording = false;
            self.updateMicButtonState(false);
            console.log('[HYBRID-INPUT] Recording ended');
        };

        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Update the active input field
            if (self.state.activeInput) {
                if (finalTranscript) {
                    // Append final transcript to existing text
                    const currentValue = self.state.activeInput.value;
                    const newValue = currentValue ? currentValue + ' ' + finalTranscript.trim() : finalTranscript.trim();
                    self.state.activeInput.value = newValue;

                    // Trigger input event for any listeners
                    self.state.activeInput.dispatchEvent(new Event('input', { bubbles: true }));

                    console.log('[HYBRID-INPUT] Final transcript:', finalTranscript);
                }
            }
        };

        recognition.onerror = function(event) {
            console.error('[HYBRID-INPUT] Recognition error:', event.error);
            self.state.isRecording = false;
            self.updateMicButtonState(false);

            // Show user-friendly error message
            if (event.error === 'no-speech') {
                SpeechGame.ui.showNotification('No speech detected. Try again!', '🎤', 'info', 2000);
            } else if (event.error === 'not-allowed') {
                SpeechGame.ui.showNotification('Microphone access denied. Please enable it.', '🎤', 'warning', 3000);
            }
        };
    },

    // ==================== MIC BUTTON INJECTION ====================

    // *** EXPLICIT LIST: Input IDs that already have mic buttons ***
    // These inputs MUST NOT get hybrid mic added
    inputsWithExistingMic: [
        'answerInput',           // Main answer input - has .mic-button
        'swInput',               // Sight Words - has .sw-mic-btn
        'subconjInput',          // Subordinating Conjunctions - has .subconj-mic-btn
        'synonymUnifiedInput'    // Synonyms - has .synonym-unified-mic-btn
    ],

    /**
     * Check if an input already has mic/voice functionality
     * @param {HTMLElement} inputElement - The input to check
     * @returns {boolean} True if already has mic
     */
    hasExistingMic: function(inputElement) {
        if (!inputElement) return true;

        // *** EXPLICIT ID CHECK - Most reliable ***
        if (inputElement.id && this.inputsWithExistingMic.includes(inputElement.id)) {
            return true;
        }

        // Check for hybrid mic button already added
        if (inputElement._hybridMicBtn) return true;
        if (inputElement.parentElement?.querySelector('.hybrid-mic-btn')) return true;

        // Check parent and grandparent for ANY mic button
        const parent = inputElement.parentElement;
        const grandparent = parent?.parentElement;

        // Comprehensive list of existing mic button classes in this app
        const micSelectors = [
            '.mic-button',           // Main answer input mic
            '.mic-btn',              // Focus card mic
            '.sw-mic-btn',           // Sight words mic
            '.subconj-mic-btn',      // Subordinating conjunctions mic
            '.synonym-unified-mic-btn', // Synonym mic
            '.record-btn',
            '.recording-btn',
            '[class*="mic"]',        // Any class containing "mic"
            'button[title*="speak"]', // Button with "speak" in title
            'button[title*="Speak"]',
            'button[title*="record"]'
        ].join(', ');

        // Check in parent
        if (parent?.querySelector(micSelectors)) {
            return true;
        }

        // Check in grandparent (for wrapped inputs)
        if (grandparent?.querySelector(micSelectors)) {
            return true;
        }

        // Check if input is inside a voice-enabled container
        // Also includes containers that should NOT have hybrid mic (like binary choice)
        const voiceContainers = [
            '.answer-input-container',
            '.sw-input-wrapper',
            '.subconj-input-wrapper',
            '.synonym-unified-input-wrapper',
            '.voice-input-container',
            '.recording-container',
            '.vad-container',
            // Binary choice cards - simple selection, no voice input needed
            '#binaryChoiceUnifiedContainer',
            '.binary-choice-container',
            '.binary-choice-unified-container'
        ].join(', ');

        const voiceContainer = inputElement.closest(voiceContainers);
        if (voiceContainer) {
            return true; // Any input in these containers already has mic
        }

        // Check if placeholder indicates voice capability
        const placeholder = inputElement.placeholder?.toLowerCase() || '';
        if (placeholder.includes('speak') || placeholder.includes('voice')) {
            return true;
        }

        // Check if input is marked as voice-enabled
        if (inputElement.dataset.voiceEnabled === 'true') return true;
        if (inputElement.dataset.hasVad === 'true') return true;
        if (inputElement.dataset.noHybrid === 'true') return true;

        return false;
    },

    /**
     * Add mic button to a text input field
     * @param {HTMLElement} inputElement - The text input to enhance
     * @param {object} options - Optional configuration
     * @returns {HTMLElement} The mic button element or null if skipped
     */
    addMicButton: function(inputElement, options = {}) {
        if (!inputElement) return null;

        // *** DUPLICATE CHECK: Skip if already has mic functionality ***
        if (this.hasExistingMic(inputElement)) {
            console.log('[HYBRID-INPUT] Skipped - already has mic:', inputElement.id || inputElement.className);
            return null;
        }

        // Skip if marked to skip
        if (inputElement.dataset.noHybrid === 'true') return null;

        // Create wrapper if input isn't already wrapped
        let wrapper = inputElement.parentElement;
        if (!wrapper?.classList.contains('hybrid-input-wrapper')) {
            wrapper = document.createElement('div');
            wrapper.className = 'hybrid-input-wrapper';
            inputElement.parentNode.insertBefore(wrapper, inputElement);
            wrapper.appendChild(inputElement);
        }

        // Create mic button
        const micBtn = document.createElement('button');
        micBtn.type = 'button';
        micBtn.className = 'hybrid-mic-btn';
        micBtn.innerHTML = '🎤';
        micBtn.title = 'Click to speak your answer';
        micBtn.setAttribute('aria-label', 'Voice input');

        // Add click handler
        const self = this;
        micBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            self.toggleRecording(inputElement, micBtn);
        });

        wrapper.appendChild(micBtn);

        // Store reference
        inputElement._hybridMicBtn = micBtn;

        return micBtn;
    },

    /**
     * Inject mic buttons into all text inputs in a container
     * Skips inputs that already have mic/voice functionality
     * @param {HTMLElement|string} container - Container element or selector
     */
    injectIntoContainer: function(container) {
        const containerEl = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!containerEl) return;

        // Find all text inputs and textareas
        const inputs = containerEl.querySelectorAll('input[type="text"], textarea');
        let injectedCount = 0;

        inputs.forEach(input => {
            // Skip if marked to skip
            if (input.dataset.noHybrid === 'true') return;

            // Try to add mic (will skip if already has one)
            const added = this.addMicButton(input);
            if (added) injectedCount++;
        });

        if (injectedCount > 0) {
            console.log('[HYBRID-INPUT] Injected mic buttons into', injectedCount, 'of', inputs.length, 'inputs');
        }
    },

    // ==================== RECORDING CONTROL ====================
    /**
     * Toggle recording for a specific input
     * STATE-LOCK CHECK: Blocked while AI is speaking
     * @param {HTMLElement} inputElement - The target input field
     * @param {HTMLElement} micBtn - The mic button element
     */
    toggleRecording: function(inputElement, micBtn) {
        if (!this.state.recognition) {
            SpeechGame.ui.showNotification('Voice input not supported', '⚠️', 'warning', 2000);
            return;
        }

        // *** STATE-LOCK CHECK ***
        // Block recording if AI is speaking (respects Focus Card State-Lock)
        if (window.isSpeechPlaying || window.focusCardLocked || window.__KARAOKE_ACTIVE__) {
            console.log('[HYBRID-INPUT] BLOCKED - AI is still speaking');
            SpeechGame.ui.showNotification('Wait for AI to finish speaking', '🔊', 'info', 1500);
            return;
        }

        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording(inputElement);
        }
    },

    /**
     * Start recording for a specific input
     * @param {HTMLElement} inputElement - The target input field
     */
    startRecording: function(inputElement) {
        if (this.state.isRecording) {
            this.stopRecording();
        }

        this.state.activeInput = inputElement;

        try {
            this.state.recognition.start();

            // Play audio feedback
            if (SpeechGame.audio && SpeechGame.audio.play) {
                SpeechGame.audio.play('click');
            }
        } catch (error) {
            console.error('[HYBRID-INPUT] Failed to start recognition:', error);
        }
    },

    /**
     * Stop current recording
     */
    stopRecording: function() {
        if (this.state.recognition && this.state.isRecording) {
            this.state.recognition.stop();
        }
        this.state.isRecording = false;
    },

    /**
     * Update mic button visual state
     * @param {boolean} isActive - Whether recording is active
     */
    updateMicButtonState: function(isActive) {
        // Update all mic buttons to show inactive state
        document.querySelectorAll('.hybrid-mic-btn').forEach(btn => {
            btn.classList.remove('recording');
        });

        // Update active input's mic button
        if (this.state.activeInput && this.state.activeInput._hybridMicBtn) {
            if (isActive) {
                this.state.activeInput._hybridMicBtn.classList.add('recording');
            }
        }
    },

    // ==================== UTILITY ====================
    /**
     * Remove mic button from an input
     * @param {HTMLElement} inputElement - The input to clean up
     */
    removeMicButton: function(inputElement) {
        if (!inputElement) return;

        const wrapper = inputElement.parentElement;
        if (wrapper?.classList.contains('hybrid-input-wrapper')) {
            const micBtn = wrapper.querySelector('.hybrid-mic-btn');
            if (micBtn) micBtn.remove();

            // Unwrap if only input remains
            if (wrapper.children.length === 1) {
                wrapper.parentNode.insertBefore(inputElement, wrapper);
                wrapper.remove();
            }
        }

        delete inputElement._hybridMicBtn;
    },

    /**
     * Check if hybrid input is supported
     * @returns {boolean}
     */
    isSupported: function() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    /**
     * Set the recognition language
     * @param {string} lang - Language code (e.g., 'en-US', 'fr-FR')
     */
    setLanguage: function(lang) {
        this.config.lang = lang;
        if (this.state.recognition) {
            this.state.recognition.lang = lang;
        }
        console.log('[HYBRID-INPUT] Language set to:', lang);
    },

    /**
     * Get current language
     * @returns {string}
     */
    getLanguage: function() {
        return this.config.lang;
    },

    /**
     * Disable all mic buttons (used during State-Lock)
     */
    disableAllMicButtons: function() {
        document.querySelectorAll('.hybrid-mic-btn').forEach(btn => {
            btn.classList.add('disabled');
            btn.disabled = true;
        });
    },

    /**
     * Enable all mic buttons (used after State-Lock releases)
     */
    enableAllMicButtons: function() {
        document.querySelectorAll('.hybrid-mic-btn').forEach(btn => {
            btn.classList.remove('disabled');
            btn.disabled = false;
        });
    },

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    isCurrentlyRecording: function() {
        return this.state.isRecording;
    }
};

// ==================== CSS INJECTION ====================
// Inject styles for hybrid input components (Kindly Cute Design System)
(function() {
    const style = document.createElement('style');
    style.id = 'hybrid-input-styles';
    style.textContent = `
        /* Hybrid Input Wrapper */
        .hybrid-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
        }

        .hybrid-input-wrapper input[type="text"],
        .hybrid-input-wrapper textarea {
            flex: 1;
            padding-right: 50px;
        }

        /* Mic Button - Kindly Cute Magical Glow */
        .hybrid-mic-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 40px;
            border: none;
            border-radius: 50%;
            /* Teal to Lavender gradient (Kindly Cute palette) */
            background: linear-gradient(135deg, #7EC8C8 0%, #D4B8E0 100%);
            color: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            /* Magical glow effect */
            box-shadow: 0 0 20px rgba(126, 200, 200, 0.6), 0 0 40px rgba(126, 200, 200, 0.3);
            animation: hybrid-mic-glow 2s ease-in-out infinite;
            z-index: 10;
        }

        @keyframes hybrid-mic-glow {
            0%, 100% {
                box-shadow: 0 0 20px rgba(126, 200, 200, 0.6), 0 0 40px rgba(126, 200, 200, 0.3);
            }
            50% {
                box-shadow: 0 0 30px rgba(126, 200, 200, 0.8), 0 0 60px rgba(212, 184, 224, 0.5);
            }
        }

        .hybrid-mic-btn:hover {
            transform: translateY(-50%) scale(1.15);
            box-shadow: 0 0 30px rgba(126, 200, 200, 0.8), 0 0 60px rgba(212, 184, 224, 0.5);
        }

        .hybrid-mic-btn:active {
            transform: translateY(-50%) scale(0.95);
        }

        /* Recording State - Red Pulsing */
        .hybrid-mic-btn.recording {
            background: linear-gradient(135deg, #F44336 0%, #E91E63 100%);
            animation: hybrid-mic-pulse 1s ease-in-out infinite;
        }

        @keyframes hybrid-mic-pulse {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
            }
            50% {
                box-shadow: 0 0 0 15px rgba(244, 67, 54, 0);
            }
        }

        /* Disabled State (State-Lock active) */
        .hybrid-mic-btn.disabled,
        .hybrid-mic-btn:disabled {
            background: linear-gradient(135deg, #9E9E9E 0%, #757575 100%);
            cursor: not-allowed;
            opacity: 0.6;
            box-shadow: none;
            animation: none;
        }

        .hybrid-mic-btn.disabled:hover,
        .hybrid-mic-btn:disabled:hover {
            transform: translateY(-50%);
            box-shadow: none;
        }

        /* Textarea specific styling */
        .hybrid-input-wrapper textarea + .hybrid-mic-btn {
            top: 12px;
            transform: translateY(0);
        }

        .hybrid-input-wrapper textarea + .hybrid-mic-btn:hover {
            transform: translateY(0) scale(1.15);
        }

        /* Focus Card specific styling */
        .focus-card .hybrid-input-wrapper {
            margin-bottom: 10px;
        }

        /* Card Modal specific styling */
        .card-modal .hybrid-input-wrapper input,
        .card-modal .hybrid-input-wrapper textarea {
            padding-right: 55px;
        }

        /* Standalone mic button (for existing inputs) */
        .answer-input-container {
            position: relative;
        }

        .answer-input-container .hybrid-mic-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
        }
    `;
    document.head.appendChild(style);
})();

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.hybridInput = hybridInput;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    hybridInput.init();
});
