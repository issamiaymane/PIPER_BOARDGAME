/**
 * UI Helpers Module
 * Handles notifications, modals, and common UI operations
 */

export const ui = {
    /**
     * Show a game notification
     */
    showNotification(message, icon, type, duration) {
        icon = icon || '';
        type = type || '';
        duration = duration !== undefined ? duration : 2000;

        const dom = SpeechGame.dom;
        if (!dom.gameNotification) return Promise.resolve();

        dom.notificationIcon.textContent = icon;
        dom.notificationText.textContent = message;

        dom.gameNotification.className = 'game-notification';
        if (type) {
            dom.gameNotification.classList.add(type);
        }

        void dom.gameNotification.offsetWidth;
        dom.gameNotification.classList.add('show');

        if (duration > 0) {
            setTimeout(() => {
                dom.gameNotification.classList.remove('show');
                setTimeout(() => {
                    dom.gameNotification.classList.add('hidden');
                }, 400);
            }, duration);
        }

        return new Promise(resolve => setTimeout(resolve, duration + 400));
    },

    hideModals() {
        const dom = SpeechGame.dom;
        if (dom.targetModal) dom.targetModal.classList.add('hidden');
        if (dom.cardModal) dom.cardModal.classList.add('hidden');
        if (dom.characterModal) dom.characterModal.classList.add('hidden');
    },

    showFeedback(text, isCorrect) {
        const dom = SpeechGame.dom;
        if (!dom.feedbackMessage) return;
        dom.feedbackMessage.textContent = text;
        dom.feedbackMessage.className = 'feedback-message ' + (isCorrect ? 'correct' : 'incorrect');
    },

    clearFeedback() {
        const dom = SpeechGame.dom;
        if (!dom.feedbackMessage) return;
        dom.feedbackMessage.textContent = '';
        dom.feedbackMessage.className = 'feedback-message';
    },

    updateScoreDisplay() {
        const dom = SpeechGame.dom;
        const state = SpeechGame.state;
        if (dom.scoreValue) {
            dom.scoreValue.textContent = state.score;
        }
        if (dom.positionValue) {
            dom.positionValue.textContent = state.currentPosition + '/' + SpeechGame.board.config.totalSpaces;
        }
    },

    updateLoadingProgress(percent) {
        const dom = SpeechGame.dom;
        if (dom.loadingBar) {
            dom.loadingBar.style.width = percent + '%';
        }
    },

    hideLoadingScreen() {
        const dom = SpeechGame.dom;
        if (dom.loadingScreen) {
            dom.loadingScreen.classList.add('hidden');
        }
    },

    showWinScreen() {
        const dom = SpeechGame.dom;
        const state = SpeechGame.state;
        SpeechGame.audio.play('win');
        if (dom.finalScore) {
            dom.finalScore.textContent = state.score;
        }
        if (dom.winScreen) {
            dom.winScreen.classList.remove('hidden');
        }
    },

    hideWinScreen() {
        const dom = SpeechGame.dom;
        if (dom.winScreen) {
            dom.winScreen.classList.add('hidden');
        }
    },

    showRecordingStatus(state, message) {
        const dom = SpeechGame.dom;
        if (dom.recordingStatus) {
            dom.recordingStatus.classList.remove('hidden');
            dom.recordingStatus.className = 'recording-status ' + state;
        }
        if (dom.recordingText) {
            dom.recordingText.textContent = message;
        }
    },

    hideRecordingStatus() {
        const dom = SpeechGame.dom;
        if (dom.recordingStatus) {
            dom.recordingStatus.classList.add('hidden');
        }
    },

    showAIFeedback(transcription, isCorrect, correctAnswer) {
        const dom = SpeechGame.dom;
        if (!dom.aiFeedback || !dom.aiFeedbackContent) return;

        let html = '<div class="ai-transcription">I heard: "' + transcription + '"</div>';
        if (isCorrect) {
            html += '<div class="ai-result correct">Correct!</div>';
        } else {
            html += '<div class="ai-result incorrect">Not quite.</div>';
            if (correctAnswer) {
                html += '<div class="ai-correct-answer">The answer is: ' + correctAnswer + '</div>';
            }
        }
        dom.aiFeedbackContent.innerHTML = html;
        dom.aiFeedback.classList.remove('hidden');
    },

    hideAIFeedback() {
        const dom = SpeechGame.dom;
        if (dom.aiFeedback) {
            dom.aiFeedback.classList.add('hidden');
        }
    },

    openCharacterModal() {
        SpeechGame.audio.play('click');
        const dom = SpeechGame.dom;
        if (dom.characterModal) {
            dom.characterModal.classList.remove('hidden');
        }
    },

    closeCharacterModal() {
        SpeechGame.audio.play('click');
        const dom = SpeechGame.dom;
        const state = SpeechGame.state;

        if (dom.characterModal) {
            dom.characterModal.classList.add('hidden');
        }
        if (dom.playerAvatarEmoji) {
            dom.playerAvatarEmoji.textContent = state.selectedCharacter;
        }
        if (dom.playerToken) {
            const span = dom.playerToken.querySelector('span');
            if (span) span.textContent = state.selectedCharacter;
        }
        SpeechGame.tts.speak('Great choice! You look awesome!');
    },

    initializeWaveform() {
        const dom = SpeechGame.dom;
        if (!dom.voiceWaveform) return;

        dom.voiceWaveform.innerHTML = '';
        for (let i = 0; i < SpeechGame.vadConfig.WAVEFORM_BARS; i++) {
            const bar = document.createElement('div');
            bar.className = 'waveform-bar';
            dom.voiceWaveform.appendChild(bar);
        }
    },

    updateWaveform(energy) {
        const dom = SpeechGame.dom;
        if (!dom.voiceWaveform) return;

        const bars = dom.voiceWaveform.querySelectorAll('.waveform-bar');
        bars.forEach((bar, i) => {
            const variation = Math.random() * 0.5 + 0.5;
            const height = Math.max(4, energy * 40 * variation);
            bar.style.height = height + 'px';
        });
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.ui = ui;
