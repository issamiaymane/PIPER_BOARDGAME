/**
 * Audio Manager Module
 * Handles all sound effects, background music, and TTS
 */

export const audio = {
    // Audio context for Web Audio API
    audioCtx: null,

    // Background music reference
    ambientAudio: null,

    // Sound effects
    sounds: {},

    /**
     * Initialize audio system
     */
    init() {
        // Create sound effects using local audio files
        this.sounds = {
            start: new Audio('../assets/sounds/start.mp3'),
            correct: new Audio('../assets/sounds/correct.mp3'),
            incorrect: new Audio('../assets/sounds/wrong.mp3'),
            bonus: new Audio('../assets/sounds/bonus.mp3'),
            win: new Audio('../assets/sounds/win.mp3')
        };

        // Pre-load all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.load();
        });

        // Set start music to loop
        this.sounds.start.loop = true;
        this.sounds.start.volume = 0.3;
    },

    /**
     * Initialize Web Audio context (call on user interaction)
     */
    initAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioCtx;
    },

    /**
     * Start background music
     */
    startAmbient() {
        this.ambientAudio = this.sounds.start;
        this.ambientAudio.currentTime = 0;
        this.ambientAudio.play().catch(e => console.log('Audio autoplay blocked:', e));
    },

    /**
     * Stop background music
     */
    stopAmbient() {
        if (this.ambientAudio) {
            this.ambientAudio.pause();
            this.ambientAudio.currentTime = 0;
        }
    },

    /**
     * Pause background music (for recording)
     */
    pauseAmbient() {
        if (this.ambientAudio && !this.ambientAudio.paused) {
            this.ambientAudio.pause();
        }
    },

    /**
     * Resume background music (after recording)
     */
    resumeAmbient() {
        if (this.ambientAudio && this.ambientAudio.paused && SpeechGame.state.isPlaying) {
            this.ambientAudio.play().catch(e => console.log('Audio resume blocked:', e));
        }
    },

    /**
     * Play a simple beep using Web Audio
     * @param {number} freq - Frequency in Hz
     * @param {number} duration - Duration in seconds
     */
    playBeep(freq, duration) {
        this.initAudioContext();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);
        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    },

    /**
     * Play spinning wheel sound - tick tick tick effect
     */
    playSpinSound() {
        this.initAudioContext();
        let delay = 0;
        const ticks = 30;
        const self = this;

        for (let i = 0; i < ticks; i++) {
            const speed = 50 + (i * 8); // Slows down over time
            setTimeout(() => {
                const osc = self.audioCtx.createOscillator();
                const gain = self.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(self.audioCtx.destination);
                osc.frequency.value = 600 + Math.random() * 200;
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.15, self.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, self.audioCtx.currentTime + 0.05);
                osc.start();
                osc.stop(self.audioCtx.currentTime + 0.05);
            }, delay);
            delay += speed;
        }
    },

    /**
     * Play a sound effect
     * @param {string} type - Sound type: 'spin', 'click', 'move', 'correct', 'incorrect', 'bonus', 'win'
     */
    play(type) {
        // For spin, use fun tick-tick effect
        if (type === 'spin') {
            this.playSpinSound();
            return;
        }

        // For click and move, use simple beeps
        if (type === 'click') {
            this.playBeep(800, 0.05);
            return;
        }

        if (type === 'move') {
            this.playBeep(500, 0.1);
            return;
        }

        // For other sounds, use audio files
        const sound = this.sounds[type];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.5;
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    },

    /**
     * Preload all audio assets
     * @returns {Promise} Resolves when sounds are loaded (with timeout)
     */
    preload() {
        const soundPromises = Object.values(this.sounds).map(sound => {
            return new Promise((resolve) => {
                if (sound.readyState >= 2) {
                    resolve();
                } else {
                    sound.addEventListener('canplaythrough', resolve, { once: true });
                    sound.addEventListener('error', resolve, { once: true });
                    sound.load();
                }
            });
        });

        // Wait for sounds with a timeout
        return Promise.race([
            Promise.all(soundPromises),
            new Promise(resolve => setTimeout(resolve, 2000)) // 2 second timeout
        ]);
    },

    /**
     * Play base64 encoded audio response
     * @param {string} base64Audio - Base64 encoded audio data
     */
    playAudioResponse(base64Audio) {
        const dom = SpeechGame.dom;
        if (!base64Audio || !dom.audioPlayer) return;

        try {
            dom.audioPlayer.src = `data:audio/mp3;base64,${base64Audio}`;
            dom.audioPlayer.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
            console.error('Error playing audio response:', e);
        }
    }
};

// TTS (Text-to-Speech) Helpers
export const tts = {
    /**
     * Prepare question text for TTS
     * - Replaces "___" with "what?" for fill-in-blank questions
     * - Removes choices in parentheses for cleaner speech
     * @param {string} question - Question text
     * @returns {string} TTS-friendly text
     */
    prepareQuestion(question) {
        if (!question) return '';

        // Replace underscores with "what?"
        let ttsText = question.replace(/_{2,}/g, 'what?');

        // Remove choices in parentheses like "(meow / bark)" for cleaner TTS
        ttsText = ttsText.replace(/\s*\([^)]+\/[^)]+\)\s*/g, '');

        return ttsText.trim();
    },

    /**
     * Speak feedback text using browser TTS or API
     * @param {string} text - Text to speak
     * @returns {Promise}
     */
    speak(text) {
        // This will be implemented to use browser TTS or API
        // For now, use browser speech synthesis if available
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            window.speechSynthesis.speak(utterance);
            return Promise.resolve();
        }
        return Promise.resolve();
    }
};
