/**
 * Base Card Handler Module
 * Uses the unified 7-handler card renderer system
 */

import type { Card } from '../types';
import { showCard as showCardWithRenderer, closeCard } from '../ui/boardgame-card-display';

// Declare stopVoiceRecording as a global function (defined elsewhere)
declare function stopVoiceRecording(): void;

export const cardHandlers = {
    /**
     * Show a question card using the unified renderer
     */
    show: function(card: Card): void {
        showCardWithRenderer(card);
    },

    /**
     * Close the card modal
     */
    close: function(): void {
        closeCard();
    },

    /**
     * Handle correct answer
     */
    handleCorrect: async function(message?: string, userAnswer?: string): Promise<void> {
        const state = SpeechGame.state;
        const question = state.currentQuestion;

        // PIPER Child Mode: Get AI feedback if child is logged in
        if (SpeechGame.childState && SpeechGame.childState.isLoggedIn() && SpeechGame.childApi) {
            // Record trial
            SpeechGame.childUI?.recordTrial(question, userAnswer || '', true);

            // Get AI-powered therapeutic feedback
            try {
                const expectedAnswer = (question?.answer || '') as string;
                const aiFeedback = await SpeechGame.childApi.getFeedback(
                    (question?.category || question?.subcategory || 'General') as string,
                    (question?.question || '') as string,
                    expectedAnswer,
                    userAnswer || '',
                    true
                );
                message = aiFeedback;
            } catch (error) {
                console.warn('AI feedback unavailable, using default:', error);
                message = message || 'Correct! Great job!';
            }
        } else {
            message = message || 'Correct! Great job!';
        }

        SpeechGame.audio.play('correct');
        SpeechGame.ui.showFeedback(message as string, true);
        SpeechGame.tts.speak(message as string);

        state.questionAnswered = true;
        state.score += 10;
        SpeechGame.ui.updateScoreDisplay();
        SpeechGame.ui.showNotification('Correct! +10 points', '🎉', 'success');

        // Close card after delay (5 seconds to read feedback)
        const self = this;
        setTimeout(function() {
            self.close();
            if (state.currentPosition < SpeechGame.board.config.totalSpaces) {
                setTimeout(function() {
                    SpeechGame.ui.showNotification('Spin the wheel to move!', '🎡', 'bonus', 2500);
                }, 500);
            }
        }, 5000);
    },

    /**
     * Handle incorrect answer
     */
    handleIncorrect: async function(correctAnswer: string, message?: string, userAnswer?: string): Promise<void> {
        const state = SpeechGame.state;
        const question = state.currentQuestion;

        // PIPER Child Mode: Get AI feedback if child is logged in
        if (SpeechGame.childState && SpeechGame.childState.isLoggedIn() && SpeechGame.childApi) {
            // Record trial
            SpeechGame.childUI?.recordTrial(question, userAnswer || '', false);

            // Get AI-powered therapeutic feedback
            try {
                const expectedAnswer = correctAnswer || (question?.answer as string) || '';
                const aiFeedback = await SpeechGame.childApi.getFeedback(
                    (question?.category || question?.subcategory || 'General') as string,
                    (question?.question || '') as string,
                    expectedAnswer,
                    userAnswer || '',
                    false
                );
                message = aiFeedback;
            } catch (error) {
                console.warn('AI feedback unavailable, using default:', error);
                message = message || 'Not quite. The answer is: ' + correctAnswer;
            }
        } else {
            message = message || 'Not quite. The answer is: ' + correctAnswer;
        }

        SpeechGame.audio.play('incorrect');
        SpeechGame.ui.showFeedback(message as string, false);
        SpeechGame.tts.speak(message as string);

        state.questionAnswered = true;

        // Close card after longer delay (6 seconds to read correct answer)
        const self = this;
        setTimeout(function() {
            self.close();
            if (state.currentPosition < SpeechGame.board.config.totalSpaces) {
                setTimeout(function() {
                    SpeechGame.ui.showNotification('Spin the wheel to move!', '🎡', 'bonus', 2500);
                }, 500);
            }
        }, 6000);
    }
};

// Attach to namespace
(window as { SpeechGame?: Partial<typeof SpeechGame> }).SpeechGame = window.SpeechGame || {};
window.SpeechGame.cardHandlers = cardHandlers;
