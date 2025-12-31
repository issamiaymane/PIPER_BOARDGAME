/**
 * Focus Card Module - Advanced AI Response System
 * Two-Way Karaoke Synchronization for Speech Therapy Board Game
 *
 * STATE-LOCKED IMPLEMENTATION:
 * - Prevents garbage collection of SpeechSynthesisUtterance
 * - UI Lock prevents premature card closure
 * - Event Bridge uses onend to unlock the card
 * - Safe Close function checks lock before allowing close
 *
 * Features:
 * - Real-time child speech transcription display
 * - AI response with ACCURATE word-by-word karaoke highlighting
 * - Uses Web Speech API onboundary event for precise sync
 * - Robust state locking prevents premature card dismissal
 */

// ==================== GLOBAL STATE-LOCK (Anti-GC + State Lock) ====================
// CRITICAL: These global variables serve TWO purposes:
// 1. Prevent garbage collection of SpeechSynthesisUtterance (Chrome bug)
// 2. Provide a GLOBAL state lock that BLOCKS card closure during speech
//
// The card CANNOT close while isSpeechPlaying is true.
// The ONLY way to set isSpeechPlaying = false is via utterance.onend
window.currentUtterance = null;
window.focusCardLocked = false;
window.isSpeechPlaying = false;  // THE MASTER LOCK - checked by ALL close attempts

export const focusCard = {
    // ==================== CONFIGURATION ====================
    config: {
        // Buffer time after speech ends before allowing close (ms)
        closeBufferDelay: 500,

        // Auto-close delay after speech ends (ms) - set to 0 to disable
        autoCloseDelay: 0,

        // Delay before AI starts responding (ms)
        aiStartDelay: 500,

        // Feedback banner duration (ms)
        feedbackShowDuration: 2500,

        // Word appearance delay for child speech (ms)
        wordAppearDelay: 80,

        // Highlight colors
        highlightColors: {
            active: '#FF6B00',             // Bright orange for active word
            correct: '#4CAF50',            // Green for correct
            incorrect: '#F44336',          // Red for incorrect
            spoken: '#1565c0',             // Blue for spoken words
            upcoming: '#b0bec5'            // Gray for upcoming words
        },

        // Speech synthesis settings
        speechSettings: {
            rate: 0.9,
            pitch: 1.1
        },

        // Speech recognition settings
        speechRecognition: {
            continuous: false,
            interimResults: true,
            maxAlternatives: 1,
            lang: 'en-US'
        }
    },

    // ==================== STATE MANAGEMENT ====================
    state: {
        // Card state
        isOpen: false,
        currentCard: null,
        isClosing: false,

        // *** STATE-LOCK (The Security Guard) ***
        // isSpeechPlaying is the MASTER LOCK
        // - Set to TRUE in utterance.onstart
        // - Set to FALSE ONLY in utterance.onend
        // - Card close is BLOCKED while this is true
        isSpeechPlaying: false,
        isCardLocked: false,

        // Child speech state
        isRecording: false,
        childWords: [],
        childTranscript: '',
        interimTranscript: '',

        // AI response state
        isSpeakingAI: false,
        aiWords: [],
        aiCurrentWordIndex: -1,
        aiText: '',
        charToWordMap: [],

        // Timers
        closeTimeout: null,
        unlockTimeout: null,

        // Speech recognition
        recognition: null,

        // Expected answer for comparison
        expectedAnswer: '',
        promptText: '',

        // Feedback type for logging
        lastFeedbackType: ''
    },

    // ==================== DOM REFERENCES ====================
    dom: {
        overlay: null,
        backdrop: null,
        card: null,
        closeBtn: null,
        category: null,
        imageContainer: null,
        image: null,
        imageFallback: null,
        promptText: null,
        childSection: null,
        childWords: null,
        childRecordingIndicator: null,
        aiSection: null,
        aiWords: null,
        aiSpeakingIndicator: null,
        aiAvatar: null,
        micBtn: null,
        replayBtn: null,
        skipBtn: null,
        feedback: null,
        feedbackIcon: null,
        feedbackMessage: null
    },

    // ==================== INITIALIZATION ====================
    init: function() {
        this.cacheDOMElements();
        this.setupEventListeners();
        this.initSpeechRecognition();
        console.log('Focus Card initialized with STATE-LOCKED protection');
    },

    cacheDOMElements: function() {
        this.dom.overlay = document.getElementById('focusCardOverlay');
        this.dom.backdrop = document.getElementById('focusCardBackdrop');
        this.dom.card = document.getElementById('focusCard');
        this.dom.closeBtn = document.getElementById('focusCardClose');
        this.dom.category = document.getElementById('focusCardCategory');
        this.dom.imageContainer = document.getElementById('focusCardImageContainer');
        this.dom.image = document.getElementById('focusCardImage');
        this.dom.imageFallback = document.getElementById('focusCardImageFallback');
        this.dom.promptText = document.getElementById('focusPromptText');
        this.dom.childSection = document.getElementById('childSpeechSection');
        this.dom.childWords = document.getElementById('childKaraokeWords');
        this.dom.childRecordingIndicator = document.getElementById('childRecordingIndicator');
        this.dom.aiSection = document.getElementById('aiResponseSection');
        this.dom.aiWords = document.getElementById('aiKaraokeWords');
        this.dom.aiSpeakingIndicator = document.getElementById('aiSpeakingIndicator');
        this.dom.aiAvatar = document.getElementById('aiSpeakerAvatar');
        this.dom.micBtn = document.getElementById('focusMicBtn');
        this.dom.replayBtn = document.getElementById('focusReplayBtn');
        this.dom.skipBtn = document.getElementById('focusSkipBtn');
        this.dom.feedback = document.getElementById('focusCardFeedback');
        this.dom.feedbackIcon = document.getElementById('feedbackIcon');
        this.dom.feedbackMessage = document.getElementById('feedbackMessage');
    },

    setupEventListeners: function() {
        const self = this;

        // Close button - uses safe close function
        if (this.dom.closeBtn) {
            this.dom.closeBtn.addEventListener('click', () => self.attemptCloseCard());
        }

        // Backdrop click - uses safe close function
        if (this.dom.backdrop) {
            this.dom.backdrop.addEventListener('click', () => self.attemptCloseCard());
        }

        // Microphone button
        if (this.dom.micBtn) {
            this.dom.micBtn.addEventListener('click', () => self.toggleRecording());
        }

        // Replay button
        if (this.dom.replayBtn) {
            this.dom.replayBtn.addEventListener('click', () => self.replayPrompt());
        }

        // Skip button - uses force close (user explicitly wants to skip)
        if (this.dom.skipBtn) {
            this.dom.skipBtn.addEventListener('click', () => self.forceCloseCard());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!self.state.isOpen) return;

            if (e.key === 'Escape') {
                self.attemptCloseCard();
            } else if (e.key === ' ' && !self.state.isRecording && !self.state.isCardLocked) {
                e.preventDefault();
                self.toggleRecording();
            }
        });
    },

    initSpeechRecognition: function() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            return;
        }

        const self = this;
        this.state.recognition = new SpeechRecognition();

        this.state.recognition.continuous = this.config.speechRecognition.continuous;
        this.state.recognition.interimResults = this.config.speechRecognition.interimResults;
        this.state.recognition.maxAlternatives = this.config.speechRecognition.maxAlternatives;
        this.state.recognition.lang = this.config.speechRecognition.lang;

        this.state.recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                self.state.childTranscript = finalTranscript;
                self.displayChildWords(finalTranscript, false);
            } else if (interimTranscript) {
                self.state.interimTranscript = interimTranscript;
                self.displayChildWords(interimTranscript, true);
            }
        };

        this.state.recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            self.stopRecording();
            if (event.error === 'no-speech') {
                self.showFeedback('I didn\'t hear anything. Try again!', '🎤', 'info');
            }
        };

        this.state.recognition.onend = function() {
            if (self.state.isRecording) {
                self.stopRecording();
                self.processChildSpeech();
            }
        };
    },

    // ==================== STATE-LOCK MANAGEMENT ====================
    /**
     * ========================================================================
     * LOCK THE CARD - The Security Guard Activation
     * ========================================================================
     * Called ONLY from utterance.onstart
     *
     * This function:
     * 1. Sets isSpeechPlaying = true (THE MASTER LOCK)
     * 2. Disables the Close button (visual + functional)
     * 3. Disables backdrop clicks
     * 4. Disables the Spin button (prevents next turn during speech)
     */
    lockCard: function() {
        // *** SET THE MASTER LOCK ***
        this.state.isSpeechPlaying = true;
        this.state.isCardLocked = true;
        this.state.isSpeakingAI = true;
        window.isSpeechPlaying = true;  // Global backup
        window.focusCardLocked = true;

        console.log('🔒 STATE-LOCK ENGAGED - Card is now LOCKED');

        // Visually disable close button
        if (this.dom.closeBtn) {
            this.dom.closeBtn.style.opacity = '0.3';
            this.dom.closeBtn.style.pointerEvents = 'none';
            this.dom.closeBtn.style.cursor = 'not-allowed';
        }

        // Disable backdrop clicks
        if (this.dom.backdrop) {
            this.dom.backdrop.style.pointerEvents = 'none';
        }

        // Add locked class to card for CSS styling
        if (this.dom.card) {
            this.dom.card.classList.add('locked');
        }

        // *** DISABLE SPIN BUTTON (Critical for therapy flow) ***
        this.disableSpinButton();
    },

    /**
     * ========================================================================
     * UNLOCK THE CARD - The Security Guard Deactivation
     * ========================================================================
     * Called ONLY from utterance.onend (after buffer delay)
     *
     * This is THE ONLY legitimate way to unlock the card.
     * The Event Bridge ensures this is called after speech completes.
     */
    unlockCard: function() {
        // *** RELEASE THE MASTER LOCK ***
        this.state.isSpeechPlaying = false;
        this.state.isCardLocked = false;
        this.state.isSpeakingAI = false;
        window.isSpeechPlaying = false;  // Global backup
        window.focusCardLocked = false;

        console.log('🔓 STATE-LOCK RELEASED - Card is now UNLOCKED');

        // Re-enable close button
        if (this.dom.closeBtn) {
            this.dom.closeBtn.style.opacity = '1';
            this.dom.closeBtn.style.pointerEvents = 'auto';
            this.dom.closeBtn.style.cursor = 'pointer';
        }

        // Re-enable backdrop clicks
        if (this.dom.backdrop) {
            this.dom.backdrop.style.pointerEvents = 'auto';
        }

        // Remove locked class
        if (this.dom.card) {
            this.dom.card.classList.remove('locked');
        }

        // Note: Spin button stays disabled while card is open
        // It will be enabled when card actually closes
    },

    /**
     * ========================================================================
     * IS LOCKED CHECK - The Security Guard Query
     * ========================================================================
     * This is the SINGLE function that determines if the card can close.
     * It checks MULTIPLE sources to ensure robustness.
     *
     * Returns TRUE if ANY of these are true:
     * - this.state.isSpeechPlaying (local state)
     * - window.isSpeechPlaying (global backup)
     * - this.state.isCardLocked (UI lock)
     * - window.focusCardLocked (global UI lock)
     * - this.state.isSpeakingAI (legacy compatibility)
     * - window.__KARAOKE_ACTIVE__ (voice manager state)
     */
    isLocked: function() {
        const locked = this.state.isSpeechPlaying ||
                      window.isSpeechPlaying ||
                      this.state.isCardLocked ||
                      window.focusCardLocked ||
                      this.state.isSpeakingAI ||
                      window.__KARAOKE_ACTIVE__;

        if (locked) {
            console.log('[STATE-LOCK] Card is LOCKED:', {
                'state.isSpeechPlaying': this.state.isSpeechPlaying,
                'window.isSpeechPlaying': window.isSpeechPlaying,
                'state.isCardLocked': this.state.isCardLocked,
                'window.__KARAOKE_ACTIVE__': window.__KARAOKE_ACTIVE__
            });
        }

        return locked;
    },

    // ==================== SPIN BUTTON MANAGEMENT ====================
    disableSpinButton: function() {
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.disabled = true;
            spinBtn.classList.add('disabled');
        }
    },

    enableSpinButton: function() {
        const spinBtn = document.getElementById('spinBtn');
        if (spinBtn) {
            spinBtn.disabled = false;
            spinBtn.classList.remove('disabled');
        }
    },

    // ==================== CARD DISPLAY ====================
    open: function(cardData) {
        if (!this.dom.overlay) return;

        this.state.isOpen = true;
        this.state.isClosing = false;
        this.state.currentCard = cardData;
        this.resetState();

        // Disable spin button
        this.disableSpinButton();

        // Set content
        this.setCardContent(cardData);

        // Show card
        this.dom.overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            this.dom.overlay.classList.add('visible');
            this.dom.card.classList.add('card-enter');
        });

        // Speak the prompt
        setTimeout(() => {
            this.speakPrompt(cardData.prompt || cardData.question);
        }, 600);

        if (SpeechGame.audio && SpeechGame.audio.play) {
            SpeechGame.audio.play('click');
        }
    },

    /**
     * ========================================================================
     * SAFE CLOSE FUNCTION - The Event Bridge Entry Point
     * ========================================================================
     * This is the ONLY public function for closing the card.
     * ALL close attempts (backdrop click, close button, Escape key) go through here.
     *
     * The card will REFUSE to close if isSpeechPlaying is true.
     * This is the "Conditional Close Logic" from the spec.
     */
    attemptCloseCard: function() {
        console.log('[EVENT-BRIDGE] Close attempt received');

        // *** THE SECURITY CHECK ***
        // Check if speech is playing - if so, BLOCK the close
        if (this.isLocked()) {
            console.log('⚠️ CLOSE BLOCKED - Speech is still playing!');
            console.log('   The card will close automatically when speech ends.');

            // Visual feedback that close was blocked (shake animation)
            if (this.dom.card) {
                this.dom.card.classList.add('shake');
                setTimeout(() => {
                    this.dom.card.classList.remove('shake');
                }, 300);
            }

            // Return false to indicate close was blocked
            return false;
        }

        // *** SAFE TO CLOSE ***
        console.log('[EVENT-BRIDGE] Close ALLOWED - Speech is complete');
        this.close();
        return true;
    },

    /**
     * ========================================================================
     * FORCE CLOSE - Emergency Override (Skip Button Only)
     * ========================================================================
     * This is the ONLY way to bypass the state lock.
     * Used when user explicitly clicks "Skip" button.
     *
     * This function:
     * 1. Cancels all speech immediately
     * 2. Clears ALL state locks
     * 3. Clears ALL garbage collection shields
     * 4. Forces the card to close
     */
    forceCloseCard: function() {
        console.log('[FORCE-CLOSE] Emergency override activated');

        // *** CANCEL ALL SPEECH ***
        this.cancelSpeech();

        // *** FORCE RELEASE ALL LOCKS ***
        this.state.isSpeechPlaying = false;
        this.state.isCardLocked = false;
        this.state.isSpeakingAI = false;
        window.isSpeechPlaying = false;
        window.focusCardLocked = false;
        window.__KARAOKE_ACTIVE__ = false;

        // *** CLEAR ALL GC SHIELDS ***
        window.currentUtterance = null;
        window.therapistUtterance = null;
        window.__SPEECH_LOCK__ = null;
        this._currentUtterance = null;

        console.log('[FORCE-CLOSE] All locks cleared');

        // Close the card
        this.close();
    },

    /**
     * ========================================================================
     * INTERNAL CLOSE - Private Close Implementation
     * ========================================================================
     * This function should NEVER be called directly from outside.
     * Always use attemptCloseCard() or forceCloseCard().
     *
     * Has a defensive check to block close if speech is still playing.
     */
    close: function() {
        if (!this.state.isOpen || this.state.isClosing) return;

        // *** DEFENSIVE DOUBLE-CHECK ***
        // If somehow we got here with speech still playing, BLOCK
        if (this.state.isSpeechPlaying || window.isSpeechPlaying) {
            console.warn('[CLOSE] BLOCKED - Defensive check caught active speech!');
            return;
        }

        console.log('[CLOSE] Executing card close');

        this.state.isClosing = true;
        this.state.isOpen = false;
        this.stopRecording();

        // Clear timeouts
        if (this.state.closeTimeout) {
            clearTimeout(this.state.closeTimeout);
            this.state.closeTimeout = null;
        }
        if (this.state.unlockTimeout) {
            clearTimeout(this.state.unlockTimeout);
            this.state.unlockTimeout = null;
        }

        // Cancel any remaining speech (cleanup)
        this.cancelSpeech();

        // Hide with animation
        this.dom.overlay.classList.remove('visible');
        this.dom.card.classList.remove('card-enter');

        const self = this;
        setTimeout(() => {
            self.dom.overlay.classList.add('hidden');
            self.state.isClosing = false;

            // *** ENABLE SPIN BUTTON ONLY AFTER CARD IS FULLY CLOSED ***
            self.enableSpinButton();

            if (typeof window.onFocusCardClosed === 'function') {
                window.onFocusCardClosed();
            }
        }, 400);

        if (SpeechGame.audio && SpeechGame.audio.play) {
            SpeechGame.audio.play('click');
        }
    },

    /**
     * ========================================================================
     * CANCEL SPEECH - Emergency Speech Termination
     * ========================================================================
     * Immediately stops all speech and clears all GC shields.
     * NOTE: This does NOT unlock the card - use unlockCard() for that.
     */
    cancelSpeech: function() {
        console.log('[CANCEL-SPEECH] Terminating all speech');

        // Cancel browser speech synthesis
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        // Cancel via voice manager
        if (SpeechGame.voiceManager) {
            SpeechGame.voiceManager.cancel();
        }

        // Clear ALL garbage collection shields
        window.currentUtterance = null;
        window.therapistUtterance = null;
        window.__SPEECH_LOCK__ = null;
        this._currentUtterance = null;

        // Clear speech-related state (but NOT the lock state)
        this.state.isSpeakingAI = false;

        // Hide speaking indicators
        if (this.dom.aiSpeakingIndicator) {
            this.dom.aiSpeakingIndicator.classList.add('hidden');
        }
        if (this.dom.aiSection) {
            this.dom.aiSection.classList.remove('speaking');
        }
    },

    setCardContent: function(cardData) {
        if (this.dom.category) {
            const categoryText = this.dom.category.querySelector('.category-text');
            const categoryIcon = this.dom.category.querySelector('.category-icon');
            if (categoryText) categoryText.textContent = cardData.category || 'Speech Practice';
            if (categoryIcon) categoryIcon.textContent = cardData.categoryIcon || '🎯';
        }

        if (cardData.image) {
            this.dom.image.src = cardData.image;
            this.dom.image.style.display = 'block';
            this.dom.imageFallback.style.display = 'none';
        } else {
            this.dom.image.style.display = 'none';
            this.dom.imageFallback.style.display = 'flex';
        }

        if (this.dom.promptText) {
            this.dom.promptText.textContent = cardData.prompt || cardData.question || 'Say the word!';
            this.state.promptText = cardData.prompt || cardData.question || '';
        }

        this.state.expectedAnswer = cardData.expectedAnswer || cardData.answer || '';
        this.resetChildDisplay();
        this.resetAIDisplay();
    },

    resetState: function() {
        // Reset all state to initial values
        this.state.isRecording = false;
        this.state.isSpeechPlaying = false;  // Reset master lock
        this.state.isCardLocked = false;
        this.state.childWords = [];
        this.state.childTranscript = '';
        this.state.interimTranscript = '';
        this.state.isSpeakingAI = false;
        this.state.aiWords = [];
        this.state.aiCurrentWordIndex = -1;
        this.state.aiText = '';
        this.state.charToWordMap = [];
        this.state.lastFeedbackType = '';

        // Clear ALL garbage collection shields AND global locks
        window.currentUtterance = null;
        window.therapistUtterance = null;
        window.__SPEECH_LOCK__ = null;
        window.focusCardLocked = false;
        window.isSpeechPlaying = false;  // Reset global master lock
        window.__KARAOKE_ACTIVE__ = false;
        this._currentUtterance = null;

        if (this.state.closeTimeout) {
            clearTimeout(this.state.closeTimeout);
            this.state.closeTimeout = null;
        }
        if (this.state.unlockTimeout) {
            clearTimeout(this.state.unlockTimeout);
            this.state.unlockTimeout = null;
        }

        if (this.dom.feedback) {
            this.dom.feedback.classList.add('hidden');
        }

        // Reset close button to enabled state
        if (this.dom.closeBtn) {
            this.dom.closeBtn.style.opacity = '1';
            this.dom.closeBtn.style.pointerEvents = 'auto';
            this.dom.closeBtn.style.cursor = 'pointer';
        }
    },

    // ==================== CHILD SPEECH HANDLING ====================
    toggleRecording: function() {
        if (this.state.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    },

    startRecording: function() {
        if (!this.state.recognition || this.state.isCardLocked) {
            return;
        }

        // Cancel AI speech if playing
        this.cancelSpeech();
        this.unlockCard();

        if (SpeechGame.audio && SpeechGame.audio.pauseAmbient) {
            SpeechGame.audio.pauseAmbient();
        }

        this.state.isRecording = true;
        this.state.childTranscript = '';
        this.state.interimTranscript = '';

        this.resetChildDisplay();

        this.dom.micBtn.classList.add('recording');
        this.dom.childRecordingIndicator.classList.remove('hidden');
        this.dom.childSection.classList.add('active');

        try {
            this.state.recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
        }
    },

    stopRecording: function() {
        this.state.isRecording = false;

        if (this.dom.micBtn) this.dom.micBtn.classList.remove('recording');
        if (this.dom.childRecordingIndicator) this.dom.childRecordingIndicator.classList.add('hidden');
        if (this.dom.childSection) this.dom.childSection.classList.remove('active');

        if (this.state.recognition) {
            try {
                this.state.recognition.stop();
            } catch (e) {}
        }
    },

    displayChildWords: function(transcript, isInterim) {
        if (!this.dom.childWords) return;

        const words = this.parseTextSimple(transcript);
        this.dom.childWords.innerHTML = '';

        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'karaoke-word child-word';
            if (isInterim) {
                wordSpan.classList.add('interim');
            } else {
                wordSpan.classList.add('final');
                wordSpan.style.animationDelay = `${index * this.config.wordAppearDelay}ms`;
            }
            wordSpan.textContent = word;
            this.dom.childWords.appendChild(wordSpan);
        });

        this.dom.childWords.scrollTop = this.dom.childWords.scrollHeight;
    },

    resetChildDisplay: function() {
        if (this.dom.childWords) {
            this.dom.childWords.innerHTML = '<span class="karaoke-placeholder">Tap the microphone and speak...</span>';
        }
    },

    processChildSpeech: function() {
        const transcript = this.state.childTranscript.trim();

        if (!transcript) {
            this.showFeedback('I didn\'t catch that. Try again!', '🎤', 'info');
            return;
        }

        const isCorrect = this.checkAnswer(transcript);

        setTimeout(() => {
            this.generateAIResponse(transcript, isCorrect);
        }, this.config.aiStartDelay);
    },

    /**
     * Check if the child's answer matches the expected answer
     * Uses word-level matching, NOT substring matching
     * @param {string} transcript - What the child said
     * @returns {boolean} - Whether the answer is correct
     */
    checkAnswer: function(transcript) {
        // If no expected answer set, we cannot validate - return false
        if (!this.state.expectedAnswer || this.state.expectedAnswer.trim() === '') {
            console.log('[FOCUS-CARD] No expected answer set - cannot validate');
            return false;
        }

        const expected = this.state.expectedAnswer.toLowerCase().trim();
        const given = transcript.toLowerCase().trim();

        // Empty transcript is always wrong
        if (!given) {
            return false;
        }

        // Exact match
        if (given === expected) {
            console.log('[FOCUS-CARD] Exact match!');
            return true;
        }

        // Word-level matching: split into words
        const expectedWords = expected.split(/\s+/).filter(w => w.length > 0);
        const givenWords = given.split(/\s+/).filter(w => w.length > 0);

        // Check if all expected words appear in given (as complete words)
        const allExpectedWordsPresent = expectedWords.every(expWord =>
            givenWords.some(givenWord => givenWord === expWord)
        );

        if (allExpectedWordsPresent) {
            console.log('[FOCUS-CARD] All expected words present in answer');
            return true;
        }

        // Check if any given word matches expected exactly (single word answer)
        if (expectedWords.length === 1) {
            const expectedWord = expectedWords[0];
            if (givenWords.includes(expectedWord)) {
                console.log('[FOCUS-CARD] Expected word found in answer');
                return true;
            }
        }

        console.log('[FOCUS-CARD] Answer does not match. Expected:', expected, 'Got:', given);
        return false;
    },

    // ==================== AI RESPONSE WITH STATE-LOCKED KARAOKE ====================
    generateAIResponse: function(childTranscript, isCorrect) {
        let response;
        let feedbackType;

        if (isCorrect) {
            response = this.getPositiveFeedback(childTranscript);
            feedbackType = 'correct';
        } else {
            response = this.getNegativeFeedback(childTranscript, this.state.expectedAnswer);
            feedbackType = 'incorrect';
        }

        this.state.lastFeedbackType = feedbackType;

        this.showFeedback(
            isCorrect ? 'Great job!' : 'Try again!',
            isCorrect ? '⭐' : '💪',
            feedbackType
        );

        this.speakAIResponseWithKaraoke(response, feedbackType);
    },

    getPositiveFeedback: function(childTranscript) {
        const responses = [
            `Great job! You said "${childTranscript}" perfectly!`,
            `Wonderful! "${childTranscript}" is exactly right!`,
            `Amazing work! You got it!`,
            `Perfect! Your pronunciation was excellent!`,
            `Fantastic! You're doing great!`
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    },

    getNegativeFeedback: function(childTranscript, expected) {
        if (childTranscript) {
            return `You said "${childTranscript}". The answer is "${expected}". Let's try again!`;
        }
        return `The correct answer is "${expected}". Can you try saying it?`;
    },

    /**
     * ========================================================================
     * HIGH-PRECISION KARAOKE ENGINE WITH STATE-LOCK
     * ========================================================================
     *
     * THE EVENT BRIDGE IMPLEMENTATION:
     * - utterance.onstart -> lockCard() -> isSpeechPlaying = true
     * - utterance.onend   -> unlockCard() -> isSpeechPlaying = false
     *
     * The card CANNOT close between onstart and onend.
     * This is the core of the State-Lock mechanism.
     *
     * Chrome GC Fix:
     * - Utterance stored in window.currentUtterance (persistent reference)
     * - This prevents garbage collection that would break onend
     */
    speakAIResponseWithKaraoke: function(text, feedbackType) {
        const self = this;

        if (!('speechSynthesis' in window)) {
            this.displayAIWordsOnly(text, feedbackType);
            return;
        }

        console.log('[STATE-LOCK] Starting karaoke with state-lock protection');

        // *** CANCEL-FIRST RULE: Clear French voice buffer ***
        window.speechSynthesis.cancel();
        if (SpeechGame.voiceManager) {
            SpeechGame.voiceManager.cancel();
        }

        // Store state (but don't lock yet - wait for onstart)
        this.state.aiText = text;
        this.state.aiCurrentWordIndex = -1;

        // Build word map for onboundary
        const wordData = this.buildWordMap(text);
        this.state.aiWords = wordData.words;
        this.state.charToWordMap = wordData.charToWordMap;

        // Display all words as upcoming
        this.displayAIWordsForKaraoke(wordData.words, feedbackType);

        // Show speaking indicator
        this.dom.aiSpeakingIndicator.classList.remove('hidden');
        this.dom.aiSection.classList.add('speaking');

        // Wait for browser to clear speech queue (French buffer)
        setTimeout(function() {
            // Create utterance with FORCED English locale
            let utterance;

            if (SpeechGame.voiceManager) {
                utterance = SpeechGame.voiceManager.createUtterance(text);
                console.log('[STATE-LOCK] Using voice:', SpeechGame.voiceManager.getVoiceInfo().name);
            } else {
                // Fallback with English forcing
                utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';  // Force English
                utterance.rate = 0.7;
                utterance.pitch = 1.0;
            }

            // *** CHROME GC FIX: PERSISTENT REFERENCE ***
            // Store utterance globally to prevent garbage collection
            // Without this, Chrome may GC the utterance and onend never fires
            window.currentUtterance = utterance;
            window.therapistUtterance = utterance;
            window.__SPEECH_LOCK__ = utterance;
            self._currentUtterance = utterance;

            // ========================================================
            // EVENT BRIDGE: onstart -> LOCK THE CARD
            // ========================================================
            // This is where isSpeechPlaying becomes TRUE
            // After this, the card CANNOT close
            utterance.onstart = function() {
                console.log('🎤 [EVENT-BRIDGE] onstart fired - LOCKING CARD');

                // *** THE LOCK ***
                self.lockCard();

                // Also set speaking state
                self.state.isSpeakingAI = true;
                window.__KARAOKE_ACTIVE__ = true;
            };

            // *** onboundary - THE KARAOKE HEARTBEAT ***
            // Uses charIndex to map to word spans
            utterance.onboundary = function(event) {
                // Only process if speech is active and card is open
                if (!self.state.isOpen || !self.state.isSpeakingAI) return;

                if (event.name === 'word') {
                    const charIndex = event.charIndex;

                    // Map charIndex to word index
                    const wordIndex = self.getWordIndexFromCharIndex(charIndex);

                    // Apply .active-word class to the matching span
                    if (wordIndex !== -1 && wordIndex !== self.state.aiCurrentWordIndex) {
                        self.highlightAIWord(wordIndex);
                    }
                }
            };

            // ========================================================
            // EVENT BRIDGE: onend -> UNLOCK THE CARD
            // ========================================================
            // This is THE ONLY place where isSpeechPlaying becomes FALSE
            // After this, the card CAN close
            utterance.onend = function() {
                console.log('🎤 [EVENT-BRIDGE] onend fired - UNLOCKING CARD');

                // Mark all words as spoken (visual completion)
                self.markAllAIWordsSpoken();

                // Update UI
                self.dom.aiSpeakingIndicator.classList.add('hidden');
                self.dom.aiSection.classList.remove('speaking');

                // Set speaking state to false
                self.state.isSpeakingAI = false;
                window.__KARAOKE_ACTIVE__ = false;

                // Resume ambient audio
                if (SpeechGame.audio && SpeechGame.audio.resumeAmbient) {
                    SpeechGame.audio.resumeAmbient();
                }

                // *** THE UNLOCK (with buffer delay) ***
                // 500ms buffer so child can read the last word
                self.state.unlockTimeout = setTimeout(function() {
                    // Clear persistent references (GC can now clean up)
                    window.currentUtterance = null;
                    window.therapistUtterance = null;
                    window.__SPEECH_LOCK__ = null;
                    self._currentUtterance = null;

                    // *** UNLOCK THE CARD ***
                    self.unlockCard();

                    console.log('🔓 [EVENT-BRIDGE] Card unlocked - close is now allowed');

                    // Optional auto-close
                    if (self.config.autoCloseDelay > 0) {
                        self.state.closeTimeout = setTimeout(function() {
                            if (self.state.isOpen && !self.isLocked()) {
                                self.attemptCloseCard();
                            }
                        }, self.config.autoCloseDelay);
                    }
                }, self.config.closeBufferDelay);
            };

            // *** onerror - Emergency cleanup ***
            utterance.onerror = function(event) {
                console.error('[EVENT-BRIDGE] Speech error:', event.error || event);

                // Clear all state
                self.state.isSpeakingAI = false;
                window.__KARAOKE_ACTIVE__ = false;

                // Clear GC shields
                window.currentUtterance = null;
                window.therapistUtterance = null;
                window.__SPEECH_LOCK__ = null;
                self._currentUtterance = null;

                // Update UI
                self.dom.aiSpeakingIndicator.classList.add('hidden');
                self.dom.aiSection.classList.remove('speaking');

                // Unlock on error (allow close)
                self.unlockCard();
            };

            // *** SPEAK - This triggers onstart ***
            console.log('[STATE-LOCK] Calling speechSynthesis.speak()');
            window.speechSynthesis.speak(utterance);

        }, 50); // 50ms delay to clear French buffer
    },

    buildWordMap: function(text) {
        const words = [];
        const charToWordMap = new Array(text.length).fill(-1);
        const wordRegex = /\S+/g;
        let match;
        let wordIndex = 0;

        while ((match = wordRegex.exec(text)) !== null) {
            const word = match[0];
            const startPos = match.index;
            const endPos = startPos + word.length;

            const punctMatch = word.match(/^(.+?)([.!?,;:]+)$/);

            if (punctMatch) {
                words.push({
                    text: punctMatch[1],
                    startChar: startPos,
                    endChar: startPos + punctMatch[1].length,
                    index: wordIndex,
                    isPunctuation: false
                });

                for (let i = startPos; i < startPos + punctMatch[1].length; i++) {
                    charToWordMap[i] = wordIndex;
                }
                wordIndex++;

                words.push({
                    text: punctMatch[2],
                    startChar: startPos + punctMatch[1].length,
                    endChar: endPos,
                    index: wordIndex,
                    isPunctuation: true
                });
                wordIndex++;
            } else {
                words.push({
                    text: word,
                    startChar: startPos,
                    endChar: endPos,
                    index: wordIndex,
                    isPunctuation: false
                });

                for (let i = startPos; i < endPos; i++) {
                    charToWordMap[i] = wordIndex;
                }
                wordIndex++;
            }
        }

        return { words, charToWordMap };
    },

    getWordIndexFromCharIndex: function(charIndex) {
        if (charIndex < 0 || charIndex >= this.state.charToWordMap.length) {
            return -1;
        }
        return this.state.charToWordMap[charIndex];
    },

    displayAIWordsForKaraoke: function(words, feedbackType) {
        if (!this.dom.aiWords) return;

        this.dom.aiWords.innerHTML = '';

        words.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = `karaoke-word ai-word ${feedbackType || ''}`;
            wordSpan.classList.add('upcoming');
            if (word.isPunctuation) {
                wordSpan.classList.add('punctuation');
            }
            wordSpan.textContent = word.text;
            wordSpan.dataset.index = index;

            if (!word.isPunctuation) {
                wordSpan.addEventListener('click', () => this.speakWord(word.text));
            }

            this.dom.aiWords.appendChild(wordSpan);
        });
    },

    displayAIWordsOnly: function(text, feedbackType) {
        if (!this.dom.aiWords) return;

        const words = this.parseTextSimple(text);
        this.dom.aiWords.innerHTML = '';

        words.forEach((word) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = `karaoke-word ai-word ${feedbackType || ''} spoken`;
            wordSpan.textContent = word;
            this.dom.aiWords.appendChild(wordSpan);
        });
    },

    resetAIDisplay: function() {
        if (this.dom.aiWords) {
            this.dom.aiWords.innerHTML = '<span class="karaoke-placeholder">Waiting for your response...</span>';
        }
    },

    highlightAIWord: function(index) {
        if (!this.dom.aiWords) return;

        const wordElements = this.dom.aiWords.querySelectorAll('.karaoke-word');

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

        this.state.aiCurrentWordIndex = index;
    },

    markAllAIWordsSpoken: function() {
        if (!this.dom.aiWords) return;

        const wordElements = this.dom.aiWords.querySelectorAll('.karaoke-word');
        wordElements.forEach(el => {
            el.classList.remove('active', 'upcoming');
            el.classList.add('spoken');
        });
    },

    // ==================== UTILITY FUNCTIONS ====================
    parseTextSimple: function(text) {
        if (!text) return [];
        return text.split(/\s+/).filter(w => w.length > 0);
    },

    /**
     * Speak a single word with therapist voice
     * Used when user clicks on a word to hear it repeated
     */
    speakWord: function(word) {
        if (!('speechSynthesis' in window)) return;

        if (SpeechGame.voiceManager) {
            // Use voice manager - slightly slower for single words
            SpeechGame.voiceManager.speak(word, { rate: 0.75 });
        } else {
            // Fallback
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = 'en-US';
            utterance.rate = 0.75;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
        }

        if (SpeechGame.audio && SpeechGame.audio.play) {
            SpeechGame.audio.play('click');
        }
    },

    /**
     * Speak the prompt text with therapist voice
     * Called when card opens to read the question
     */
    speakPrompt: function(promptText) {
        if (!promptText || !('speechSynthesis' in window)) return;

        if (SpeechGame.voiceManager) {
            // Use voice manager with therapeutic settings
            SpeechGame.voiceManager.speak(promptText);
        } else {
            // Fallback
            const utterance = new SpeechSynthesisUtterance(promptText);
            utterance.lang = 'en-US';
            utterance.rate = 0.85;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    },

    replayPrompt: function() {
        this.speakPrompt(this.state.promptText);
        if (SpeechGame.audio && SpeechGame.audio.play) {
            SpeechGame.audio.play('click');
        }
    },

    showFeedback: function(message, icon, type) {
        if (!this.dom.feedback) return;

        this.dom.feedbackIcon.textContent = icon;
        this.dom.feedbackMessage.textContent = message;

        this.dom.feedback.className = 'focus-card-feedback';
        this.dom.feedback.classList.add(type);
        this.dom.feedback.classList.remove('hidden');

        setTimeout(() => {
            this.dom.feedback.classList.add('hidden');
        }, this.config.feedbackShowDuration);
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.focusCard = focusCard;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    focusCard.init();
});
