/**
 * Card Browser Module
 * Loads all card data and displays it organized by handler type
 */

/// <reference types="vite/client" />

import { HANDLERS, CATEGORY_HANDLER_MAP } from '../data/handler-map';

// Type definitions
interface CardData {
    [key: string]: unknown;
}

type CategoryData = Record<string, CardData[]>;

// Source file mapping (category name -> filename)
const categorySourceFiles: Record<string, string> = {};

// Track language vs articulation files
const languageFiles: Set<string> = new Set();
const articulationFiles: Set<string> = new Set();

// Import all JSON files using Vite's glob import
const languageModules = import.meta.glob('../data/cards/language/*.json', { eager: true });
const articulationModules = import.meta.glob('../data/cards/articulation/*.json', { eager: true });

// Build the data object from imported JSON files
function loadJsonModules(modules: Record<string, unknown>, fileSet: Set<string>): CategoryData {
    const data: CategoryData = {};
    for (const path in modules) {
        const module = modules[path] as { default?: CategoryData } | CategoryData;
        const content = 'default' in module ? module.default : module;
        const filename = path.split('/').pop() || 'unknown.json';
        fileSet.add(filename);
        if (content && typeof content === 'object') {
            for (const category in content) {
                categorySourceFiles[category] = filename;
            }
            Object.assign(data, content);
        }
    }
    return data;
}

// Load all card data
const languageData = loadJsonModules(languageModules, languageFiles);
const articulationData = loadJsonModules(articulationModules, articulationFiles);

// Export combined data for use by other modules
export const allCardData = { ...languageData, ...articulationData };
export { languageData, articulationData };

// State
let currentFilter = 'all';
let currentDataType = 'all';
let currentSourceFile = 'all';
let currentSearch = '';
let previewData: { category: string; cards: CardData[]; currentIndex: number } | null = null;

// DOM Elements
let handlerSections: HTMLElement;
let handlerFilter: HTMLSelectElement;
let dataTypeFilter: HTMLSelectElement;
let sourceFileFilter: HTMLSelectElement;
let searchInput: HTMLInputElement;
let categoryCountEl: HTMLElement;
let cardCountEl: HTMLElement;
let previewModal: HTMLElement;
let previewCategoryTitle: HTMLElement;
let previewCardContent: HTMLElement;
let previewCardInfo: HTMLElement;
let cardCounter: HTMLElement;

// Escape HTML
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Organize categories by handler type
function organizeByHandler(data: CategoryData): Record<string, { category: string; cards: CardData[]; handler: string; sourceFile: string }[]> {
    const organized: Record<string, { category: string; cards: CardData[]; handler: string; sourceFile: string }[]> = {};

    for (const handler in HANDLERS) {
        organized[handler] = [];
    }

    for (const category in data) {
        const cards = data[category];
        if (!cards) continue;

        let handlerType = CATEGORY_HANDLER_MAP[category];
        if (!handlerType) {
            handlerType = 'standard';
        }

        if (!organized[handlerType]) {
            organized[handlerType] = [];
        }

        organized[handlerType].push({
            category,
            cards,
            handler: handlerType,
            sourceFile: categorySourceFiles[category] || 'unknown.json'
        });
    }

    for (const handler in organized) {
        organized[handler].sort((a, b) => a.category.localeCompare(b.category));
    }

    return organized;
}

// Render handler sections
function renderSections() {
    const data = currentDataType === 'language' ? languageData :
                 currentDataType === 'articulation' ? articulationData :
                 { ...languageData, ...articulationData };

    const organized = organizeByHandler(data);

    let totalCategories = 0;
    let totalCards = 0;

    let html = '';

    for (const [handlerType, config] of Object.entries(HANDLERS)) {
        const categories = organized[handlerType] || [];

        const filteredCategories = categories.filter(cat =>
            (currentSearch === '' || cat.category.toLowerCase().includes(currentSearch.toLowerCase())) &&
            (currentSourceFile === 'all' || cat.sourceFile === currentSourceFile)
        );

        if (currentFilter !== 'all' && currentFilter !== handlerType) continue;
        if (filteredCategories.length === 0) continue;

        const categoryCount = filteredCategories.length;
        const cardCount = filteredCategories.reduce((sum, cat) => sum + cat.cards.length, 0);

        totalCategories += categoryCount;
        totalCards += cardCount;

        html += `
            <section class="handler-section" data-handler="${handlerType}">
                <div class="handler-header" style="--handler-color: ${config.color}">
                    <span class="handler-icon">${config.icon}</span>
                    <h2 class="handler-name">${config.name}</h2>
                    <span class="handler-stats">${categoryCount} categories, ${cardCount} cards</span>
                    <button class="toggle-btn">▼</button>
                </div>
                <div class="handler-content">
                    <div class="category-grid">
                        ${filteredCategories.map(cat => `
                            <div class="category-card ${cat.cards.length === 0 ? 'empty-category' : ''}" data-category="${escapeHtml(cat.category)}" data-handler="${handlerType}">
                                <div class="category-icon">${config.icon}</div>
                                <div class="category-info">
                                    <h3 class="category-name">${escapeHtml(cat.category)}</h3>
                                    <span class="category-count">${cat.cards.length === 0 ? '(empty)' : cat.cards.length + ' cards'}</span>
                                    <span class="category-source">📁 ${escapeHtml(cat.sourceFile)}</span>
                                </div>
                                ${cat.cards.length > 0 ? '<button class="preview-btn" title="Preview cards">👁️</button>' : '<span class="empty-badge">Empty</span>'}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </section>
        `;
    }

    if (html === '') {
        html = '<div class="no-results"><p>No categories found matching your filters.</p></div>';
    }

    handlerSections.innerHTML = html;

    categoryCountEl.textContent = `${totalCategories} categories`;
    cardCountEl.textContent = `${totalCards} cards`;

    document.querySelectorAll('.handler-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.closest('.handler-section');
            section?.classList.toggle('collapsed');
        });
    });

    document.querySelectorAll('.category-card:not(.empty-category)').forEach(card => {
        card.addEventListener('click', () => {
            const categoryName = card.getAttribute('data-category');
            if (categoryName) {
                openPreview(categoryName, data);
            }
        });
    });
}

// Open card preview modal
function openPreview(category: string, data: CategoryData) {
    const cards = data[category];
    if (!cards || cards.length === 0) return;

    previewData = { category, cards, currentIndex: 0 };
    previewCategoryTitle.textContent = category;

    renderPreviewCard();
    previewModal.classList.remove('hidden');
}

// ============================================================
// CARD RENDERING - Helper Functions
// ============================================================

function renderTitle(title: string): string {
    return `<div class="preview-title">${escapeHtml(title)}</div>`;
}

function renderQuestion(question: string): string {
    const hasBlank = question.includes('___');
    const questionHtml = hasBlank
        ? question.replace(/_+/g, '<span class="quiz-blank">______</span>')
        : escapeHtml(question);
    return `<div class="preview-question">${questionHtml}</div>`;
}

function renderContextText(card: CardData): string {
    let html = '';
    if (card.story) {
        html += `<div class="preview-story">${escapeHtml(card.story as string)}</div>`;
    }
    if (card.paragraph) {
        html += `<div class="preview-paragraph">${escapeHtml(card.paragraph as string)}</div>`;
    }
    if (card.sentence) {
        const sentence = (card.sentence as string).replace(/_+/g, '<span class="quiz-blank">______</span>');
        html += `<div class="preview-sentence">${sentence}</div>`;
    }
    return html;
}

type ImageItem = { image: string; label: string };

function normalizeImages(images: Array<string | { image?: string; label?: string }>): ImageItem[] {
    return images.map((img) => {
        if (typeof img === 'string') {
            return { image: img, label: '' };
        }
        return { image: img.image || '', label: img.label || '' };
    });
}

function renderSingleImage(img: ImageItem): string {
    return `<div class="preview-image">
        <img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'; this.onerror=null;">
        ${img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
    </div>`;
}

function renderImagesGrid(images: ImageItem[], showLabels = true): string {
    let html = `<div class="preview-images-grid">`;
    images.forEach((img, index) => {
        html += `<div class="preview-image" data-index="${index}">
            ${img.image ? `<img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'; this.onerror=null;">` : ''}
            ${showLabels && img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
        </div>`;
    });
    html += `</div>`;
    return html;
}

function renderAnswerInput(placeholder = 'Type your answer...'): string {
    return `<div class="preview-answer-input">
        <input type="text" class="category-answer-input" placeholder="${placeholder}">
        <button class="preview-mic-btn" title="Click to speak">🎤</button>
    </div>`;
}

// ============================================================
// CARD RENDERING - Handler-Specific Renderers
// ============================================================

function renderSingleAnswer(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    html += renderContextText(card);
    html += renderAnswerInput();

    return html;
}

function renderMultipleAnswers(card: CardData): string {
    let html = '';

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    html += renderContextText(card);

    if (card.questions && Array.isArray(card.questions)) {
        html += `<div class="preview-questions">`;
        (card.questions as Array<{ question: string; answer?: string | string[]; answers?: string[] }>).forEach((q, i) => {
            const questionText = q.question.replace(/_+/g, '<span class="quiz-blank">______</span>');
            html += `<div class="preview-question-item">
                <strong>Q${i + 1}:</strong> ${questionText}
            </div>`;
            html += renderAnswerInput();
        });
        html += `</div>`;
    }

    return html;
}

function renderMultipleChoice(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    html += renderContextText(card);

    if (card.choices && Array.isArray(card.choices)) {
        html += `<div class="preview-choices" data-clickable="true">`;
        const labels = ['A', 'B', 'C', 'D'];
        (card.choices as string[]).forEach((choice, i) => {
            html += `<div class="preview-choice clickable-choice" data-choice="${i}">
                <span class="choice-label">${labels[i]}</span>${escapeHtml(choice)}
            </div>`;
        });
        html += `</div>`;
    }

    return html;
}

function renderImageSelection(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    html += renderContextText(card);

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);
        const hasTextLabels = images.some(img => img.label && !/^\d+$/.test(img.label));

        html += `<div class="preview-image-selection-grid">`;
        images.forEach((img, index) => {
            html += `<div class="preview-image-selection-item selectable-image" data-index="${index}">
                <div class="image-selection-number">${index + 1}</div>
                ${img.image ? `<img src="${escapeHtml(img.image)}" alt="${escapeHtml(img.label)}" onerror="this.src='../assets/images/default.png'">` : ''}
                ${hasTextLabels ? `<div class="image-selection-label">${escapeHtml(img.label)}</div>` : ''}
            </div>`;
        });
        html += `</div>`;
    }

    return html;
}

function renderSequencing(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    html += renderContextText(card);

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);

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

function renderBuilding(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    html += renderContextText(card);

    if (card.words && Array.isArray(card.words)) {
        const wordsArray = card.words as string[];
        html += `<div class="word-ordering-container">
            <div class="sentence-build-area" data-placeholder="Click words to build the sentence..."></div>
            <div class="word-buttons">
                ${wordsArray.map((word, idx) => `<button class="word-btn" data-word="${escapeHtml(word)}" data-index="${idx}">${escapeHtml(word)}</button>`).join('')}
            </div>
            <button class="clear-sentence-btn">Clear</button>
        </div>`;
    }

    return html;
}

function renderConditional(card: CardData): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    if (card.images && Array.isArray(card.images)) {
        const images = normalizeImages(card.images as Array<string | { image?: string; label?: string }>);
        if (images.length === 1) {
            html += renderSingleImage(images[0]);
        } else {
            html += renderImagesGrid(images);
        }
    }

    html += renderContextText(card);

    html += `<div class="preview-conditional-buttons">
        <button class="conditional-btn did-it">I did it!</button>
        <button class="conditional-btn didnt-do-it">I didn't do it</button>
    </div>`;

    return html;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupPreviewEventListeners(): void {
    previewCardContent.querySelectorAll('.selectable-image').forEach(img => {
        img.addEventListener('click', () => {
            const parent = img.closest('.preview-image-selection-grid');
            if (parent) {
                parent.querySelectorAll('.selectable-image').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            img.classList.add('selected');
        });
    });

    previewCardContent.querySelectorAll('.preview-choice.clickable-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            const parent = choice.closest('.preview-choices');
            if (parent) {
                parent.querySelectorAll('.preview-choice').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            choice.classList.add('selected');
        });
    });

    const wordContainer = previewCardContent.querySelector('.word-ordering-container');
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

    previewCardContent.querySelectorAll('.conditional-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.preview-conditional-buttons');
            if (parent) {
                parent.querySelectorAll('.conditional-btn').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            btn.classList.add('selected');
        });
    });

    const seqContainer = previewCardContent.querySelector('.image-ordering-container');
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
}

// ============================================================
// MAIN RENDER FUNCTION
// ============================================================

function renderPreviewCard(): void {
    if (!previewData) return;

    const { category, cards, currentIndex } = previewData;
    const card = cards[currentIndex];
    const handlerType = CATEGORY_HANDLER_MAP[category] || 'single-answer';
    const config = HANDLERS[handlerType as keyof typeof HANDLERS] || HANDLERS['single-answer'];

    cardCounter.textContent = `${currentIndex + 1} / ${cards.length}`;

    let bodyHtml = '';

    if (card.title) {
        bodyHtml += renderTitle(card.title as string);
    }

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

    const cardHtml = `
        <div class="preview-card" style="--handler-color: ${config.color}">
            <div class="preview-card-header">
                <span class="preview-handler-badge">${config.icon} ${config.name}</span>
            </div>
            <div class="preview-card-body">
                ${bodyHtml}
            </div>
        </div>
    `;

    previewCardContent.innerHTML = cardHtml;
    setupPreviewEventListeners();

    previewCardInfo.innerHTML = `
        <details>
            <summary>View Raw JSON</summary>
            <pre>${JSON.stringify(card, null, 2)}</pre>
        </details>
    `;
}

// Navigation
function prevCard() {
    if (!previewData) return;
    previewData.currentIndex = (previewData.currentIndex - 1 + previewData.cards.length) % previewData.cards.length;
    renderPreviewCard();
}

function nextCard() {
    if (!previewData) return;
    previewData.currentIndex = (previewData.currentIndex + 1) % previewData.cards.length;
    renderPreviewCard();
}

function closePreview() {
    previewModal.classList.add('hidden');
    previewData = null;
}

// ============================================================
// EXPORTED FUNCTIONS - For use by other modules
// ============================================================

/**
 * Setup event listeners for interactive card elements
 */
export function setupCardEventListeners(container: HTMLElement): void {
    container.querySelectorAll('.selectable-image').forEach(img => {
        img.addEventListener('click', () => {
            const parent = img.closest('.preview-image-selection-grid');
            if (parent) {
                parent.querySelectorAll('.selectable-image').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            img.classList.add('selected');
        });
    });

    container.querySelectorAll('.preview-choice.clickable-choice').forEach(choice => {
        choice.addEventListener('click', () => {
            const parent = choice.closest('.preview-choices');
            if (parent) {
                parent.querySelectorAll('.preview-choice').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            choice.classList.add('selected');
        });
    });

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

    container.querySelectorAll('.conditional-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.preview-conditional-buttons');
            if (parent) {
                parent.querySelectorAll('.conditional-btn').forEach(sibling => {
                    sibling.classList.remove('selected');
                });
            }
            btn.classList.add('selected');
        });
    });

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
                if (imgEl) builtImage.appendChild(imgEl.cloneNode(true));
                if (labelEl) {
                    const labelClone = document.createElement('span');
                    labelClone.className = 'built-image-label';
                    labelClone.textContent = labelEl.textContent;
                    builtImage.appendChild(labelClone);
                }
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
}

/**
 * Render a card to a container element
 */
export function renderCard(card: CardData, category: string, container: HTMLElement): void {
    const handlerType = CATEGORY_HANDLER_MAP[category] || 'single-answer';
    const config = HANDLERS[handlerType as keyof typeof HANDLERS] || HANDLERS['single-answer'];

    let bodyHtml = '';

    if (card.title) {
        bodyHtml += renderTitle(card.title as string);
    }

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

    const cardHtml = `
        <div class="preview-card" style="--handler-color: ${config.color}">
            <div class="preview-card-header">
                <span class="preview-handler-badge">${config.icon} ${config.name}</span>
                <span style="font-size: 0.75rem; color: #666; margin-left: 8px;">${escapeHtml(category)}</span>
            </div>
            <div class="preview-card-body">
                ${bodyHtml}
            </div>
        </div>
    `;

    container.innerHTML = cardHtml;
    setupCardEventListeners(container);
}

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
    handlerSections = document.getElementById('handlerSections')!;
    handlerFilter = document.getElementById('handlerFilter') as HTMLSelectElement;
    dataTypeFilter = document.getElementById('dataTypeFilter') as HTMLSelectElement;
    sourceFileFilter = document.getElementById('sourceFileFilter') as HTMLSelectElement;
    searchInput = document.getElementById('searchInput') as HTMLInputElement;
    categoryCountEl = document.getElementById('categoryCount')!;
    cardCountEl = document.getElementById('cardCount')!;
    previewModal = document.getElementById('cardPreviewModal')!;
    previewCategoryTitle = document.getElementById('previewCategoryTitle')!;
    previewCardContent = document.getElementById('previewCardContent')!;
    previewCardInfo = document.getElementById('previewCardInfo')!;
    cardCounter = document.getElementById('cardCounter')!;

    const langGroup = document.createElement('optgroup');
    langGroup.label = '📚 Language Files';
    [...languageFiles].sort().forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        langGroup.appendChild(option);
    });
    sourceFileFilter.appendChild(langGroup);

    const articGroup = document.createElement('optgroup');
    articGroup.label = '🗣️ Articulation Files';
    [...articulationFiles].sort().forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        articGroup.appendChild(option);
    });
    sourceFileFilter.appendChild(articGroup);

    handlerFilter.addEventListener('change', () => {
        currentFilter = handlerFilter.value;
        renderSections();
    });

    dataTypeFilter.addEventListener('change', () => {
        currentDataType = dataTypeFilter.value;
        renderSections();
    });

    sourceFileFilter.addEventListener('change', () => {
        currentSourceFile = sourceFileFilter.value;
        renderSections();
    });

    searchInput.addEventListener('input', () => {
        currentSearch = searchInput.value;
        renderSections();
    });

    document.getElementById('previewCloseBtn')!.addEventListener('click', closePreview);
    document.getElementById('prevCardBtn')!.addEventListener('click', prevCard);
    document.getElementById('nextCardBtn')!.addEventListener('click', nextCard);

    document.querySelector('.preview-backdrop')!.addEventListener('click', closePreview);

    document.addEventListener('keydown', (e) => {
        if (previewModal.classList.contains('hidden')) return;

        if (e.key === 'Escape') closePreview();
        if (e.key === 'ArrowLeft') prevCard();
        if (e.key === 'ArrowRight') nextCard();
    });

    renderSections();
}

// Initialize only on card-browser page
const isCardBrowserPage = document.getElementById('handlerSections') !== null;
if (isCardBrowserPage) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
