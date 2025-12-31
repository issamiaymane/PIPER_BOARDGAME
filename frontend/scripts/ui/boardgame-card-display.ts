/**
 * Boardgame Card Display Module
 * Adapter that integrates the shared card renderer with the SpeechGame namespace
 * Handles card display, answer validation, and game flow integration
 */

import { renderCard, setupCardEventListeners, getCardAnswer, type CardData } from './card-renderer';
import { getHandlerType, getHandlerConfig } from '../data/handler-map';
import type { Card } from '../types';

// Declare stopVoiceRecording as a global function (defined elsewhere)
declare function stopVoiceRecording(): void;

/**
 * Convert Card type to CardData type for renderer
 */
function cardToCardData(card: Card): CardData {
    // The card already has the right shape, just cast it
    return card as unknown as CardData;
}

/**
 * Validate the user's answer against expected answer
 */
function validateAnswer(card: Card, userAnswer: unknown, handlerType: string): boolean {
    switch (handlerType) {
        case 'single-answer': {
            // Compare string answer
            if (typeof userAnswer === 'string' && card.answers && card.answers.length > 0) {
                const normalizedUser = userAnswer.toLowerCase().trim();
                return card.answers.some(a => a.toLowerCase().trim() === normalizedUser);
            }
            if (typeof userAnswer === 'string' && card.answer) {
                return userAnswer.toLowerCase().trim() === card.answer.toLowerCase().trim();
            }
            return false;
        }
        case 'multiple-answers': {
            // Multiple answers - check if all are correct
            if (Array.isArray(userAnswer) && card.questions) {
                return card.questions.every((q, i) => {
                    const expected = q.answers || (q.answer ? [q.answer].flat() : []);
                    const userAns = userAnswer[i];
                    if (typeof userAns !== 'string') return false;
                    const normalizedUser = userAns.toLowerCase().trim();
                    return expected.some((a: string | string[]) => {
                        const answers = Array.isArray(a) ? a : [a];
                        return answers.some(ans => ans.toLowerCase().trim() === normalizedUser);
                    });
                });
            }
            return false;
        }
        case 'multiple-choice':
        case 'image-selection': {
            // Compare index
            if (typeof userAnswer === 'number') {
                return userAnswer === card.answerIndex;
            }
            return false;
        }
        case 'sequencing':
        case 'building': {
            // Compare sequence arrays
            if (Array.isArray(userAnswer) && card.answerSequence) {
                if (userAnswer.length !== card.answerSequence.length) return false;
                return userAnswer.every((val, idx) => val === card.answerSequence![idx]);
            }
            return false;
        }
        case 'conditional': {
            // Conditional has no validation - always "correct" based on action
            return true;
        }
        default:
            return false;
    }
}

/**
 * Get the expected answer as a string for feedback
 */
function getExpectedAnswer(card: Card, handlerType: string): string {
    switch (handlerType) {
        case 'single-answer':
            return card.answers?.[0] || card.answer || '';
        case 'multiple-answers':
            if (card.questions) {
                return card.questions.map((q, i) => {
                    const ans = q.answers?.[0] || q.answer || '';
                    return `Q${i + 1}: ${ans}`;
                }).join(', ');
            }
            return '';
        case 'multiple-choice':
        case 'image-selection':
            if (card.choices && card.answerIndex !== undefined) {
                return card.choices[card.answerIndex];
            }
            return `Option ${(card.answerIndex ?? 0) + 1}`;
        case 'sequencing':
        case 'building':
            if (card.answerSequence) {
                return card.answerSequence.map(i => i + 1).join(' → ');
            }
            return '';
        case 'conditional':
            return 'Action completed';
        default:
            return card.answer || '';
    }
}

/**
 * Show a card in the boardgame modal
 * Main entry point for displaying cards
 */
export function showCard(card: Card): void {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;

    // Store current question
    state.currentQuestion = card;
    state.questionAnswered = false;
    state.lastQuestionPosition = state.currentPosition;

    // Get handler type from category mapping
    const category = card.subcategory || card.category || '';
    const handlerType = getHandlerType(category);
    const handlerConfig = getHandlerConfig(category);

    // Set card category header
    const cardCategory = document.querySelector('.card-category');
    if (cardCategory) {
        cardCategory.textContent = category;
    }

    // Get the card body container (where rendered cards go)
    const cardBody = dom.cardModal?.querySelector('.card-body') || dom.cardModal?.querySelector('#cardBody');
    if (!cardBody) {
        console.error('[BoardgameCardDisplay] Card body container not found');
        return;
    }

    // Render the card using shared renderer
    const cardData = cardToCardData(card);
    const cardHtml = renderCard(cardData, handlerType);

    // Clear existing rendered card
    cardBody.innerHTML = '';

    // Insert the rendered card
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cardHtml;
    const renderedCard = tempDiv.firstElementChild;
    if (renderedCard) {
        cardBody.appendChild(renderedCard);

        // Setup event listeners with answer callback
        setupCardEventListeners(cardBody as HTMLElement, (answer, type) => {
            handleAnswer(card, answer, type);
        });
    }

    // Hybrid input injection for voice support
    if (SpeechGame.hybridInput && SpeechGame.hybridInput.isSupported()) {
        setTimeout(() => {
            if (dom.cardModal) {
                SpeechGame.hybridInput.injectIntoContainer(dom.cardModal);
            }
        }, 100);
    }

    // Style normalizer for consistent appearance
    if (SpeechGame.styleNormalizer) {
        setTimeout(() => {
            if (dom.cardModal) {
                SpeechGame.styleNormalizer.normalizeCard(dom.cardModal, handlerType);
                SpeechGame.styleNormalizer.applyCategorySpecificStyles(dom.cardModal, handlerType);
            }
        }, 150);
    }

    // Reset voice recording state
    if (typeof stopVoiceRecording === 'function') {
        stopVoiceRecording();
    }
    SpeechGame.ui.hideRecordingStatus();
    SpeechGame.ui.hideAIFeedback();
    SpeechGame.vadState.isProcessing = false;

    // Clear feedback
    SpeechGame.ui.clearFeedback();

    // Show card modal with animation
    if (dom.cardModal) {
        dom.cardModal.classList.remove('hidden');
        dom.cardModal.classList.add('card-appear');
        setTimeout(() => {
            dom.cardModal?.classList.remove('card-appear');
        }, 300);
    }

    // Speak the question
    const questionText = SpeechGame.tts.prepareQuestion(card.question || '');
    if (questionText) {
        SpeechGame.tts.speak(questionText);
    }

    // Setup done button for handlers that need it
    setupDoneButton(card, handlerType, cardBody as HTMLElement);
}

/**
 * Setup the done button for answer submission
 */
function setupDoneButton(card: Card, handlerType: string, cardBody: HTMLElement): void {
    const dom = SpeechGame.dom;

    // Show done button for handlers that need manual submission
    const needsDoneButton = ['single-answer', 'multiple-answers', 'sequencing', 'building'];

    if (dom.doneButton) {
        if (needsDoneButton.includes(handlerType)) {
            dom.doneButton.style.display = '';
            dom.doneButton.onclick = () => {
                const answer = getCardAnswer(cardBody);
                handleAnswer(card, answer, handlerType);
            };
        } else {
            dom.doneButton.style.display = 'none';
        }
    }
}

/**
 * Handle user answer submission
 */
function handleAnswer(card: Card, answer: unknown, handlerType: string): void {
    const state = SpeechGame.state;

    // Prevent double submission
    if (state.questionAnswered) return;

    const isCorrect = validateAnswer(card, answer, handlerType);
    const expectedAnswer = getExpectedAnswer(card, handlerType);

    // Provide visual feedback
    provideVisualFeedback(isCorrect, answer, card, handlerType);

    // Use the existing correct/incorrect handlers
    if (isCorrect) {
        SpeechGame.cardHandlers.handleCorrect(
            `Great job! "${expectedAnswer}" is correct!`,
            String(answer)
        );
    } else {
        SpeechGame.cardHandlers.handleIncorrect(
            expectedAnswer,
            `The correct answer is: ${expectedAnswer}`,
            String(answer)
        );
    }
}

/**
 * Provide visual feedback on the card
 */
function provideVisualFeedback(isCorrect: boolean, userAnswer: unknown, card: Card, handlerType: string): void {
    const cardContent = document.querySelector('.rendered-card');
    if (!cardContent) return;

    switch (handlerType) {
        case 'multiple-choice': {
            const selected = cardContent.querySelector('.card-choice.selected');
            if (selected) {
                selected.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
            // Show correct answer if wrong
            if (!isCorrect && card.answerIndex !== undefined) {
                const correct = cardContent.querySelector(`.card-choice[data-choice="${card.answerIndex}"]`);
                if (correct) correct.classList.add('correct');
            }
            break;
        }
        case 'image-selection': {
            const selected = cardContent.querySelector('.selectable-image.selected');
            if (selected) {
                selected.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
            // Show correct answer if wrong
            if (!isCorrect && card.answerIndex !== undefined) {
                const correct = cardContent.querySelector(`.selectable-image[data-index="${card.answerIndex}"]`);
                if (correct) correct.classList.add('correct');
            }
            break;
        }
        case 'single-answer':
        case 'multiple-answers': {
            const inputs = cardContent.querySelectorAll('.answer-input-field');
            inputs.forEach(input => {
                (input as HTMLInputElement).classList.add(isCorrect ? 'correct' : 'incorrect');
            });
            break;
        }
        case 'sequencing':
        case 'building': {
            const buildArea = cardContent.querySelector('.sequence-build-area, .sentence-build-area');
            if (buildArea) {
                buildArea.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
            break;
        }
    }

    // Disable further interaction
    cardContent.querySelectorAll('button, input').forEach(el => {
        (el as HTMLButtonElement | HTMLInputElement).disabled = true;
    });
}

/**
 * Close the card modal
 */
export function closeCard(): void {
    const dom = SpeechGame.dom;

    if (dom.cardModal) {
        dom.cardModal.classList.add('hidden');
    }

    // Stop any ongoing voice recording
    if (typeof stopVoiceRecording === 'function') {
        stopVoiceRecording();
    }
    SpeechGame.ui.hideRecordingStatus();
    SpeechGame.ui.hideAIFeedback();
}

// Export for use in base-handler.ts
export { validateAnswer, getExpectedAnswer };
