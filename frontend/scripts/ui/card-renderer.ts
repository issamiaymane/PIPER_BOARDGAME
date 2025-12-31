/**
 * Shared Card Renderer Module
 * Provides unified card rendering for both card-browser and boardgame
 * Supports 7 handler types: single-answer, multiple-answers, multiple-choice,
 * image-selection, sequencing, building, conditional
 */

import { HANDLERS, getHandlerType, type HandlerType } from '../data/handler-map';

// Type definitions
export interface CardData {
    [key: string]: unknown;
    title?: string;
    question?: string;
    story?: string;
    paragraph?: string;
    sentence?: string;
    images?: Array<string | ImageItem>;
    answers?: string[];
    choices?: string[];
    answerIndex?: number;
    answerSequence?: number[];
    words?: string[];
    questions?: Array<{ question: string; answer?: string | string[]; answers?: string[] }>;
}

export interface ImageItem {
    image: string;
    label: string;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Render title element
 */
export function renderTitle(title: string): string {
    return `<div class="card-title">${escapeHtml(title)}</div>`;
}

/**
 * Render question element with blank handling
 */
export function renderQuestion(question: string): string {
    const hasBlank = question.includes('___');
    const questionHtml = hasBlank
        ? question.replace(/_+/g, '<span class="quiz-blank">______</span>')
        : escapeHtml(question);
    return `<div class="card-question-text">${questionHtml}</div>`;
}

/**
 * Render context text (story, paragraph, sentence)
 */
export function renderContextText(card: CardData): string {
    let html = '';
    if (card.story) {
        html += `<div class="card-story">${escapeHtml(card.story)}</div>`;
    }
    if (card.paragraph) {
        html += `<div class="card-paragraph">${escapeHtml(card.paragraph)}</div>`;
    }
    if (card.sentence) {
        const sentence = card.sentence.replace(/_+/g, '<span class="quiz-blank">______</span>');
        html += `<div class="card-sentence">${sentence}</div>`;
    }
    return html;
}

/**
 * Normalize images array to consistent format
 */
export function normalizeImages(images: Array<string | { image?: string; label?: string }>): ImageItem[] {
    return images.map((img) => {
        if (typeof img === 'string') {
            return { image: img, label: '' };
        }
        return { image: img.image || '', label: img.label || '' };
    });
}

/**
 * Render single image
 */
export function renderSingleImage(img: ImageItem): string {
    return `<div class="card-image">
        <img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'; this.onerror=null;">
        ${img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
    </div>`;
}

/**
 * Render images grid
 */
export function renderImagesGrid(images: ImageItem[], showLabels = true): string {
    let html = `<div class="card-images-grid">`;
    images.forEach((img, index) => {
        html += `<div class="card-image" data-index="${index}">
            ${img.image ? `<img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'; this.onerror=null;">` : ''}
            ${showLabels && img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
        </div>`;
    });
    html += `</div>`;
    return html;
}

/**
 * Render answer input field
 */
export function renderAnswerInput(placeholder = 'Type your answer...'): string {
    return `<div class="card-answer-input">
        <input type="text" class="answer-input-field" placeholder="${placeholder}">
        <button class="mic-btn" title="Click to speak">🎤</button>
    </div>`;
}

// ============================================================
// HANDLER-SPECIFIC RENDERERS
// ============================================================

/**
 * Single Answer Handler
 * Structure: question + images[{image,label}] + answers[]
 */
export function renderSingleAnswer(card: CardData): string {
    let html = '';

    // Question
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Images
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    // Context text (story/paragraph/sentence)
    html += renderContextText(card);

    // Answer input
    html += renderAnswerInput();

    return html;
}

/**
 * Multiple Answers Handler
 * Structure: images + questions[{question, answer/answers}]
 */
export function renderMultipleAnswers(card: CardData): string {
    let html = '';

    // Images first (typically scene images)
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    // Context text
    html += renderContextText(card);

    // Questions array with individual inputs
    if (card.questions && Array.isArray(card.questions)) {
        html += `<div class="card-questions-list">`;
        card.questions.forEach((q, i) => {
            const questionText = q.question.replace(/_+/g, '<span class="quiz-blank">______</span>');
            html += `<div class="card-question-item">
                <strong>Q${i + 1}:</strong> ${questionText}
            </div>`;
            html += renderAnswerInput();
        });
        html += `</div>`;
    }

    return html;
}

/**
 * Multiple Choice Handler
 * Structure: question + images + choices[] + answerIndex
 */
export function renderMultipleChoice(card: CardData): string {
    let html = '';

    // Question
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Images
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    // Context text
    html += renderContextText(card);

    // Choices
    if (card.choices && Array.isArray(card.choices)) {
        html += `<div class="card-choices" data-clickable="true">`;
        const labels = ['A', 'B', 'C', 'D'];
        card.choices.forEach((choice, i) => {
            html += `<div class="card-choice clickable-choice" data-choice="${i}">
                <span class="choice-label">${labels[i]}</span>${escapeHtml(choice)}
            </div>`;
        });
        html += `</div>`;
    }

    return html;
}

/**
 * Image Selection Handler
 * Structure: question + images + answerIndex
 */
export function renderImageSelection(card: CardData): string {
    let html = '';

    // Question
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Context text
    html += renderContextText(card);

    // Images as selectable grid
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);
        const hasTextLabels = images.some(img => img.label && !/^\d+$/.test(img.label));

        html += `<div class="card-image-selection-grid">`;
        images.forEach((img, index) => {
            html += `<div class="card-image-selection-item selectable-image" data-index="${index}">
                <div class="image-selection-number">${index + 1}</div>
                ${img.image ? `<img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'">` : ''}
                ${hasTextLabels ? `<div class="image-selection-label">${escapeHtml(img.label)}</div>` : ''}
            </div>`;
        });
        html += `</div>`;
    }

    return html;
}

/**
 * Sequencing Handler
 * Structure: question + images + answerSequence[]
 */
export function renderSequencing(card: CardData): string {
    let html = '';

    // Question
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Context text
    html += renderContextText(card);

    // Images with click-to-order interface
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);

        html += `<div class="image-ordering-container">
            <div class="sequence-build-area" data-placeholder="Click images in order..."></div>
            <div class="sequence-image-buttons">
                ${images.map((img, idx) => `
                    <button class="sequence-image-btn" data-index="${idx}">
                        <span class="seq-img-number">${idx + 1}</span>
                        ${img.image ? `<img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'">` : ''}
                        ${img.label ? `<span class="seq-img-label">${escapeHtml(img.label)}</span>` : ''}
                    </button>
                `).join('')}
            </div>
            <button class="clear-sequence-btn">Clear</button>
        </div>`;
    }

    return html;
}

/**
 * Building Handler
 * Structure: question + words[] + answerSequence[]
 */
export function renderBuilding(card: CardData): string {
    let html = '';

    // Question
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Context text
    html += renderContextText(card);

    // Word ordering interface
    if (card.words && Array.isArray(card.words)) {
        html += `<div class="word-ordering-container">
            <div class="sentence-build-area" data-placeholder="Click words to build the sentence..."></div>
            <div class="word-buttons">
                ${card.words.map((word, idx) => `<button class="word-btn" data-word="${escapeHtml(word)}" data-index="${idx}">${escapeHtml(word)}</button>`).join('')}
            </div>
            <button class="clear-sentence-btn">Clear</button>
        </div>`;
    }

    return html;
}

/**
 * Conditional Handler
 * Structure: question + images (action-based, no answer validation)
 */
export function renderConditional(card: CardData): string {
    let html = '';

    // Question/instruction
    if (card.question) {
        html += renderQuestion(card.question);
    }

    // Images
    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    // Context text
    html += renderContextText(card);

    // Action buttons
    html += `<div class="card-conditional-buttons">
        <button class="conditional-btn did-it">I did it!</button>
        <button class="conditional-btn didnt-do-it">I didn't do it</button>
    </div>`;

    return html;
}

// ============================================================
// MAIN RENDER FUNCTION
// ============================================================

/**
 * Render a card based on its handler type
 * @param card - Card data
 * @param handlerType - Handler type (from CATEGORY_HANDLER_MAP)
 * @returns Full card HTML string
 */
export function renderCard(card: CardData, handlerType: HandlerType): string {
    const config = HANDLERS[handlerType] || HANDLERS['single-answer'];

    // Build card body HTML
    let bodyHtml = '';

    // Title (optional, appears at top)
    if (card.title) {
        bodyHtml += renderTitle(card.title);
    }

    // Render handler-specific content
    switch (handlerType) {
        case 'single-answer':
            bodyHtml += renderSingleAnswer(card);
            break;
        case 'multiple-answers':
            bodyHtml += renderMultipleAnswers(card);
            break;
        case 'multiple-choice':
            bodyHtml += renderMultipleChoice(card);
            break;
        case 'image-selection':
            bodyHtml += renderImageSelection(card);
            break;
        case 'sequencing':
            bodyHtml += renderSequencing(card);
            break;
        case 'building':
            bodyHtml += renderBuilding(card);
            break;
        case 'conditional':
            bodyHtml += renderConditional(card);
            break;
        default:
            bodyHtml += renderSingleAnswer(card);
    }

    // Assemble full card HTML
    return `
        <div class="rendered-card" style="--handler-color: ${config.color}" data-handler="${handlerType}">
            <div class="rendered-card-header">
                <span class="handler-badge">${config.icon} ${config.name}</span>
            </div>
            <div class="rendered-card-body">
                ${bodyHtml}
            </div>
        </div>
    `;
}

// ============================================================
// EVENT LISTENERS SETUP
// ============================================================

/**
 * Setup event listeners for interactive card elements
 * @param container - Container element with the rendered card
 * @param onAnswerCallback - Optional callback when user provides an answer
 */
export function setupCardEventListeners(
    container: HTMLElement,
    onAnswerCallback?: (answer: unknown, handlerType: string) => void
): void {
    const handlerType = container.querySelector('.rendered-card')?.getAttribute('data-handler') || 'single-answer';

    // Image selection click handlers
    container.querySelectorAll('.selectable-image').forEach(img => {
        img.addEventListener('click', () => {
            const parent = img.closest('.card-image-selection-grid');
            if (parent) {
                parent.querySelectorAll('.selectable-image').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            img.classList.add('selected');
            const index = parseInt(img.getAttribute('data-index') || '0', 10);
            if (onAnswerCallback) {
                onAnswerCallback(index, handlerType);
            }
        });
    });

    // Multiple choice click handlers
    container.querySelectorAll('.card-choice.clickable-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            const parent = choice.closest('.card-choices');
            if (parent) {
                parent.querySelectorAll('.card-choice').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            choice.classList.add('selected');
            const index = parseInt(choice.getAttribute('data-choice') || '0', 10);
            if (onAnswerCallback) {
                onAnswerCallback(index, handlerType);
            }
        });
    });

    // Word ordering (building) handlers
    const wordContainer = container.querySelector('.word-ordering-container');
    if (wordContainer) {
        const buildArea = wordContainer.querySelector('.sentence-build-area') as HTMLElement;
        const wordBtns = wordContainer.querySelectorAll('.word-btn');
        const clearBtn = wordContainer.querySelector('.clear-sentence-btn');

        wordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('used')) return;

                const word = btn.getAttribute('data-word') || '';
                const index = btn.getAttribute('data-index') || '';

                const builtWord = document.createElement('span');
                builtWord.className = 'built-word';
                builtWord.textContent = word;
                builtWord.setAttribute('data-index', index);

                builtWord.addEventListener('click', () => {
                    builtWord.remove();
                    btn.classList.remove('used');
                });

                buildArea.appendChild(builtWord);
                btn.classList.add('used');
            });
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                buildArea.innerHTML = '';
                wordBtns.forEach(btn => btn.classList.remove('used'));
            });
        }
    }

    // Conditional button handlers
    container.querySelectorAll('.conditional-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.card-conditional-buttons');
            if (parent) {
                parent.querySelectorAll('.conditional-btn').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            btn.classList.add('selected');
            const isDone = btn.classList.contains('did-it');
            if (onAnswerCallback) {
                onAnswerCallback(isDone, handlerType);
            }
        });
    });

    // Image sequencing (ordering) handlers
    const seqContainer = container.querySelector('.image-ordering-container');
    if (seqContainer) {
        const seqBuildArea = seqContainer.querySelector('.sequence-build-area') as HTMLElement;
        const seqImageBtns = seqContainer.querySelectorAll('.sequence-image-btn');
        const clearSeqBtn = seqContainer.querySelector('.clear-sequence-btn');

        seqImageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('used')) return;

                const index = btn.getAttribute('data-index') || '';
                const imgEl = btn.querySelector('img');
                const labelEl = btn.querySelector('.seq-img-label');

                const builtImage = document.createElement('div');
                builtImage.className = 'built-image';
                builtImage.setAttribute('data-index', index);

                if (imgEl) {
                    const imgClone = imgEl.cloneNode(true) as HTMLImageElement;
                    builtImage.appendChild(imgClone);
                }
                if (labelEl) {
                    const labelClone = document.createElement('span');
                    labelClone.className = 'built-image-label';
                    labelClone.textContent = labelEl.textContent;
                    builtImage.appendChild(labelClone);
                }

                // Click to remove from build area
                builtImage.addEventListener('click', () => {
                    builtImage.remove();
                    btn.classList.remove('used');
                });

                seqBuildArea.appendChild(builtImage);
                btn.classList.add('used');
            });
        });

        if (clearSeqBtn) {
            clearSeqBtn.addEventListener('click', () => {
                seqBuildArea.innerHTML = '';
                seqImageBtns.forEach(btn => btn.classList.remove('used'));
            });
        }
    }

    // Answer input handlers (for single-answer and multiple-answers)
    container.querySelectorAll('.answer-input-field').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') {
                const value = (input as HTMLInputElement).value.trim();
                if (value && onAnswerCallback) {
                    onAnswerCallback(value, handlerType);
                }
            }
        });
    });
}

/**
 * Get the user's current answer from the card
 * @param container - Container element with the rendered card
 * @returns The user's answer based on handler type
 */
export function getCardAnswer(container: HTMLElement): unknown {
    const handlerType = container.querySelector('.rendered-card')?.getAttribute('data-handler') || 'single-answer';

    switch (handlerType) {
        case 'single-answer':
        case 'multiple-answers': {
            const inputs = container.querySelectorAll('.answer-input-field');
            if (inputs.length === 1) {
                return (inputs[0] as HTMLInputElement).value.trim();
            }
            return Array.from(inputs).map(input => (input as HTMLInputElement).value.trim());
        }
        case 'multiple-choice': {
            const selected = container.querySelector('.card-choice.selected');
            return selected ? parseInt(selected.getAttribute('data-choice') || '0', 10) : null;
        }
        case 'image-selection': {
            const selected = container.querySelector('.selectable-image.selected');
            return selected ? parseInt(selected.getAttribute('data-index') || '0', 10) : null;
        }
        case 'sequencing': {
            const builtImages = container.querySelectorAll('.sequence-build-area .built-image');
            return Array.from(builtImages).map(img => parseInt(img.getAttribute('data-index') || '0', 10));
        }
        case 'building': {
            const builtWords = container.querySelectorAll('.sentence-build-area .built-word');
            return Array.from(builtWords).map(word => parseInt(word.getAttribute('data-index') || '0', 10));
        }
        case 'conditional': {
            const selected = container.querySelector('.conditional-btn.selected');
            return selected ? selected.classList.contains('did-it') : null;
        }
        default:
            return null;
    }
}
