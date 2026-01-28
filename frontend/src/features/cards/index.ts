/**
 * Card Browser Module
 * Loads all card data and displays it organized by handler type
 */

/// <reference types="vite/client" />

import { CATEGORY_HANDLER_MAP, LANGUAGE_FILES, ARTICULATION_FILES, type HandlerType } from '@shared/categories';
import { hideLoadingScreen } from '@common/components/LoadingScreen/LoadingScreen';

// Supabase storage URL for cards and images
const SUPABASE_STORAGE_URL = 'https://ofpdgocgupxzazzuzkub.supabase.co/storage/v1/object/public/piper-cards/';

/**
 * Resolve image path - converts local /shared/images/ paths to Supabase URLs
 */
function resolveImagePath(path: string): string {
    if (!path) return path;
    if (path.startsWith('/shared/images/')) {
        // Convert /shared/images/... to Supabase URL
        return SUPABASE_STORAGE_URL + path.replace('/shared/images/', 'images/');
    }
    return path;
}

// Type definitions
interface CardData {
    [key: string]: unknown;
}

type CategoryData = Record<string, CardData[]>;

// Handler configuration with display info (UI-specific)
export interface HandlerConfig {
    name: string;
    icon: string;
    color: string;
}

// Handler configuration with colors and icons
export const HANDLERS: Record<HandlerType, HandlerConfig> = {
    'single-answer': { name: 'Single Answer', icon: '💬', color: '#2196F3' },
    'multiple-answers': { name: 'Multiple Answers', icon: '📖', color: '#673AB7' },
    'multiple-choice': { name: 'Multiple Choice', icon: '🔘', color: '#9C27B0' },
    'image-selection': { name: 'Image Selection', icon: '🖼️', color: '#00BCD4' },
    'sequencing': { name: 'Sequencing', icon: '📊', color: '#795548' },
    'building': { name: 'Building', icon: '🧩', color: '#8BC34A' },
    'conditional': { name: 'Conditional', icon: '❓', color: '#00897B' },
    'standard': { name: 'Standard', icon: '📋', color: '#9E9E9E' }
};

// Source file mapping (category name -> filename)
const categorySourceFiles: Record<string, string> = {};

// Track language vs articulation files
const languageFilesSet: Set<string> = new Set();
const articulationFilesSet: Set<string> = new Set();

// Card data storage (populated by async fetch)
let languageData: CategoryData = {};
let articulationData: CategoryData = {};
let allCardData: CategoryData = {};
let dataLoaded = false;

/**
 * Fetch a JSON file from Supabase storage
 */
async function fetchCardJson(folder: string, filename: string): Promise<CategoryData> {
    const url = `${SUPABASE_STORAGE_URL}cards/${folder}/${filename}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch ${filename}: ${response.status}`);
            return {};
        }
        return await response.json();
    } catch (error) {
        console.warn(`Error fetching ${filename}:`, error);
        return {};
    }
}

/**
 * Load all card data from Supabase
 */
async function loadAllCardData(): Promise<void> {
    if (dataLoaded) return;

    console.log('Loading card data from Supabase...');

    // Fetch language files
    const languagePromises = LANGUAGE_FILES.map(async (filename) => {
        const content = await fetchCardJson('language', filename);
        languageFilesSet.add(filename);
        for (const category in content) {
            categorySourceFiles[category] = filename;
        }
        return content;
    });

    // Fetch articulation files
    const articulationPromises = ARTICULATION_FILES.map(async (filename) => {
        const content = await fetchCardJson('articulation', filename);
        articulationFilesSet.add(filename);
        for (const category in content) {
            categorySourceFiles[category] = filename;
        }
        return content;
    });

    // Wait for all fetches
    const languageResults = await Promise.all(languagePromises);
    const articulationResults = await Promise.all(articulationPromises);

    // Merge results
    languageData = languageResults.reduce((acc, data) => ({ ...acc, ...data }), {});
    articulationData = articulationResults.reduce((acc, data) => ({ ...acc, ...data }), {});
    allCardData = { ...languageData, ...articulationData };

    dataLoaded = true;
    console.log(`Loaded ${Object.keys(languageData).length} language categories and ${Object.keys(articulationData).length} articulation categories`);
}

// Export for use by other modules
export { allCardData, languageData, articulationData, loadAllCardData };

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
        : question;
    return `<div class="preview-question">${questionHtml}</div>`;
}

function renderContextText(card: CardData): string {
    if (card.paragraph) {
        return `<div class="preview-paragraph">${card.paragraph as string}</div>`;
    }
    return '';
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

const DEFAULT_IMAGE = '/images/default.png';

function renderSingleImage(img: ImageItem): string {
    const imageSrc = resolveImagePath(img.image) || DEFAULT_IMAGE;
    return `<div class="preview-image">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(img.label)}" onerror="this.src='${DEFAULT_IMAGE}'; this.onerror=null;">
        ${img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
    </div>`;
}

function renderImagesGrid(images: ImageItem[], showLabels = true): string {
    let html = `<div class="preview-images-grid">`;
    images.forEach((img, index) => {
        const imageSrc = resolveImagePath(img.image) || DEFAULT_IMAGE;
        html += `<div class="preview-image" data-index="${index}">
            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(img.label)}" onerror="this.src='${DEFAULT_IMAGE}'; this.onerror=null;">
            ${showLabels && img.label ? `<span class="image-label">${escapeHtml(img.label)}</span>` : ''}
        </div>`;
    });
    html += `</div>`;
    return html;
}

function renderAnswerInput(_placeholder = 'Type your answer...'): string {
    return '';
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
        const questions = card.questions as Array<{ question: string; answer?: string | string[]; answers?: string[] }>;
        const total = questions.length;

        html += `<div class="preview-questions-carousel" data-total="${total}">`;
        html += `<div class="question-nav-header">
            <button class="question-nav-btn prev-question" disabled>&lt;</button>
            <span class="question-counter">Q<span class="current-q">1</span> of ${total}</span>
            <button class="question-nav-btn next-question">&gt;</button>
        </div>`;

        questions.forEach((q, i) => {
            const questionText = q.question.replace(/_+/g, '<span class="quiz-blank">______</span>');
            html += `<div class="preview-question-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                <div class="preview-question-item">
                    <strong>Q${i + 1}:</strong> ${questionText}
                </div>
            </div>`;
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
        html += `<div class="preview-choices">`;
        const labels = ['A', 'B', 'C', 'D'];
        (card.choices as string[]).forEach((choice, i) => {
            html += `<div class="preview-choice">
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
            const imageSrc = img.image || DEFAULT_IMAGE;
            html += `<div class="preview-image-selection-item" data-index="${index}">
                <div class="image-selection-number">${index + 1}</div>
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(img.label)}" onerror="this.src='${DEFAULT_IMAGE}'; this.onerror=null;">
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
                ${images.map((img, idx) => {
                    const imageSrc = img.image || DEFAULT_IMAGE;
                    return `
                    <button class="sequence-image-btn" data-index="${idx}">
                        <span class="seq-img-number">${idx + 1}</span>
                        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(img.label)}" onerror="this.src='${DEFAULT_IMAGE}'; this.onerror=null;">
                        ${img.label ? `<span class="seq-img-label">${escapeHtml(img.label)}</span>` : ''}
                    </button>
                `}).join('')}
            </div>
            <button class="clear-sequence-btn">Clear</button>
        </div>`;
    }

    return html;
}

function renderBuilding(card: CardData, category?: string): string {
    let html = '';

    if (card.question) {
        html += renderQuestion(card.question as string);
    }

    html += renderContextText(card);

    if (card.words && Array.isArray(card.words)) {
        const wordsArray = card.words as string[];

        // Special display for Building Sentences Level 1 - Elementary
        // Show blank rectangles and non-clickable words
        if (category === 'Building Sentences Level 1 - Elementary') {
            html += `<div class="word-ordering-container">
                <div class="sentence-blanks">
                    ${wordsArray.map(() => `<span class="sentence-blank"></span>`).join('')}
                </div>
                <div class="word-display">
                    ${wordsArray.map((word) => `<span class="word-label">${escapeHtml(word)}</span>`).join('')}
                </div>
            </div>`;
        } else {
            html += `<div class="word-ordering-container">
                <div class="sentence-build-area" data-placeholder="Click words to build the sentence..."></div>
                <div class="word-buttons">
                    ${wordsArray.map((word, idx) => `<button class="word-btn" data-word="${escapeHtml(word)}" data-index="${idx}">${escapeHtml(word)}</button>`).join('')}
                </div>
                <button class="clear-sentence-btn">Clear</button>
            </div>`;
        }
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

    // Question carousel navigation
    const questionCarousel = previewCardContent.querySelector('.preview-questions-carousel');
    if (questionCarousel) {
        const slides = questionCarousel.querySelectorAll('.preview-question-slide');
        const prevBtn = questionCarousel.querySelector('.prev-question') as HTMLButtonElement;
        const nextBtn = questionCarousel.querySelector('.next-question') as HTMLButtonElement;
        const currentQSpan = questionCarousel.querySelector('.current-q');
        let currentQ = 0;

        const updateSlide = () => {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === currentQ);
            });
            if (currentQSpan) currentQSpan.textContent = String(currentQ + 1);
            if (prevBtn) prevBtn.disabled = currentQ === 0;
            if (nextBtn) nextBtn.disabled = currentQ === slides.length - 1;
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentQ > 0) { currentQ--; updateSlide(); }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentQ < slides.length - 1) { currentQ++; updateSlide(); }
            });
        }
    }

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
            bodyHtml += renderBuilding(card, category);
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

    // Question carousel navigation
    const questionCarousel = container.querySelector('.preview-questions-carousel');
    if (questionCarousel) {
        const slides = questionCarousel.querySelectorAll('.preview-question-slide');
        const prevBtn = questionCarousel.querySelector('.prev-question') as HTMLButtonElement;
        const nextBtn = questionCarousel.querySelector('.next-question') as HTMLButtonElement;
        const currentQSpan = questionCarousel.querySelector('.current-q');
        let currentQ = 0;

        const updateSlide = () => {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === currentQ);
            });
            if (currentQSpan) currentQSpan.textContent = String(currentQ + 1);
            if (prevBtn) prevBtn.disabled = currentQ === 0;
            if (nextBtn) nextBtn.disabled = currentQ === slides.length - 1;
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentQ > 0) { currentQ--; updateSlide(); }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentQ < slides.length - 1) { currentQ++; updateSlide(); }
            });
        }
    }

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
            bodyHtml += renderBuilding(card, category);
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
                <span style="font-size: 0.75rem; color: var(--color-text-medium); margin-left: 8px;">${escapeHtml(category)}</span>
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

async function init() {
    // Load card data from Supabase first
    await loadAllCardData();

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
    [...languageFilesSet].sort().forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        langGroup.appendChild(option);
    });
    sourceFileFilter.appendChild(langGroup);

    const articGroup = document.createElement('optgroup');
    articGroup.label = '🗣️ Articulation Files';
    [...articulationFilesSet].sort().forEach(file => {
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

    initThemeSelector();
    renderSections();
    hideLoadingScreen();
}

// Theme switching
function initThemeSelector(): void {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeSelectorPanel = document.getElementById('themeSelectorPanel');
    const themeButtons = document.querySelectorAll('.theme-btn');

    // Load saved theme from localStorage
    let currentTheme = localStorage.getItem('piper-theme') || 'autumn';
    document.body.classList.add(`theme-${currentTheme}`);

    // Pre-select the saved theme button
    themeButtons.forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === currentTheme);
    });

    // Update theme decorations
    function updateThemeDecorations(theme: string) {
        const decorations: Record<string, string[]> = {
            spring: ['🌸', '🌷'],
            summer: ['☀️', '🌻'],
            autumn: ['🍂', '🍁'],
            winter: ['❄', '🌨️']
        };

        const decorationIcon = decorations[theme] || ['🍂', '🍁'];
        const snowflakes = document.querySelectorAll('.snowflake');
        snowflakes.forEach((flake, index) => {
            flake.textContent = decorationIcon[index % 2];
        });
    }

    // Initialize decorations
    updateThemeDecorations(currentTheme);

    // Toggle theme panel
    themeToggleBtn?.addEventListener('click', () => {
        themeSelectorPanel?.classList.toggle('hidden');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.theme-selector-floating')) {
            themeSelectorPanel?.classList.add('hidden');
        }
    });

    // Theme button click handlers
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = (btn as HTMLElement).dataset.theme || 'autumn';

            // Remove previous theme class
            if (currentTheme) {
                document.body.classList.remove(`theme-${currentTheme}`);
                document.documentElement.classList.remove(`theme-${currentTheme}`);
            }
            currentTheme = theme;
            document.body.classList.add(`theme-${theme}`);
            document.documentElement.classList.add(`theme-${theme}`);
            localStorage.setItem('piper-theme', theme);

            // Update active state
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update decorations
            updateThemeDecorations(theme);
        });
    });
}

// Initialize only on cards page
const isCardBrowserPage = document.getElementById('handlerSections') !== null;
if (isCardBrowserPage) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}
