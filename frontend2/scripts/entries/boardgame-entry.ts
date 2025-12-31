/**
 * Boardgame Entry Point - Consolidated
 */
/// <reference types="vite/client" />

import { HANDLERS, CATEGORY_HANDLER_MAP } from '../data/handler-map';

// Types
interface CardData {
    question?: string;
    images?: Array<string | { image?: string; label?: string }>;
    choices?: string[];
    words?: string[];
    title?: string;
    story?: string;
    paragraph?: string;
    [key: string]: unknown;
}
type CategoryData = Record<string, CardData[]>;

// Load card data
const languageModules = import.meta.glob('../data/cards/language/*.json', { eager: true });
const articulationModules = import.meta.glob('../data/cards/articulation/*.json', { eager: true });

function loadJsonModules(modules: Record<string, unknown>): CategoryData {
    const data: CategoryData = {};
    for (const path in modules) {
        const module = modules[path] as { default?: CategoryData } | CategoryData;
        const content = 'default' in module ? module.default : module;
        if (content && typeof content === 'object') {
            Object.assign(data, content);
        }
    }
    return data;
}

const languageData = loadJsonModules(languageModules);
const articulationData = loadJsonModules(articulationModules);
const allCardData = { ...languageData, ...articulationData };

// Game state
const state = {
    isPlaying: false,
    currentPosition: 0,
    score: 0,
    selectedTargets: [] as string[],
    currentCard: null as CardData | null,
    currentCategory: '',
    isSpinning: false,
    selectedTheme: 'snowflake',
    cardIndices: {} as Record<string, number>,
    reset() {
        this.isPlaying = false;
        this.currentPosition = 0;
        this.score = 0;
        this.selectedTargets = [];
        this.currentCard = null;
        this.currentCategory = '';
        this.isSpinning = false;
        this.cardIndices = {};
    }
};

// DOM elements
let playOverlay: HTMLElement;
let playButton: HTMLElement;
let targetModal: HTMLElement;
let categoryTabs: HTMLElement;
let categoryGrid: HTMLElement;
let themeOptions: HTMLElement;
let nextButton: HTMLElement;
let boardPath: HTMLElement;
let playerToken: HTMLElement;
let spinnerWheel: HTMLElement;
let spinBtn: HTMLElement;
let resetBtn: HTMLElement;
let gameControls: HTMLElement;
let scoreDisplay: HTMLElement;
let scoreValue: HTMLElement;
let positionValue: HTMLElement;
let cardModal: HTMLElement;
let cardBody: HTMLElement;
let cardClose: HTMLElement;
let doneButton: HTMLElement;
let winScreen: HTMLElement;
let finalScore: HTMLElement;
let playAgainBtn: HTMLElement;

// Board positions
const TOTAL_SPACES = 35;
const BOARD_POSITIONS = [
    { x: 70, y: 520 }, { x: 140, y: 520 }, { x: 210, y: 500 }, { x: 280, y: 480 },
    { x: 350, y: 460 }, { x: 420, y: 440 }, { x: 490, y: 420 }, { x: 560, y: 400 },
    { x: 630, y: 380 }, { x: 700, y: 400 }, { x: 760, y: 440 }, { x: 810, y: 400 },
    { x: 840, y: 350 }, { x: 850, y: 290 }, { x: 840, y: 230 }, { x: 810, y: 180 },
    { x: 770, y: 140 }, { x: 720, y: 110 }, { x: 660, y: 90 }, { x: 600, y: 75 },
    { x: 540, y: 70 }, { x: 480, y: 75 }, { x: 420, y: 85 }, { x: 360, y: 100 },
    { x: 300, y: 120 }, { x: 250, y: 150 }, { x: 210, y: 190 }, { x: 200, y: 240 },
    { x: 220, y: 290 }, { x: 270, y: 320 }, { x: 330, y: 300 }, { x: 390, y: 270 },
    { x: 450, y: 240 }, { x: 510, y: 210 }, { x: 570, y: 190 }
];

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getRandomCard(category: string): CardData | null {
    const cards = allCardData[category];
    if (!cards || cards.length === 0) return null;
    if (!state.cardIndices[category]) state.cardIndices[category] = 0;
    const card = cards[state.cardIndices[category]];
    state.cardIndices[category] = (state.cardIndices[category] + 1) % cards.length;
    return card;
}

// Category selection
function renderCategorySelection(dataType: 'language' | 'articulation') {
    const data = dataType === 'language' ? languageData : articulationData;
    const categories = Object.keys(data).filter(cat => data[cat]?.length > 0);

    const organized: Record<string, string[]> = {};
    for (const handler in HANDLERS) organized[handler] = [];

    categories.forEach(category => {
        const handlerType = CATEGORY_HANDLER_MAP[category] || 'single-answer';
        if (!organized[handlerType]) organized[handlerType] = [];
        organized[handlerType].push(category);
    });

    let html = '';
    for (const [handlerType, cats] of Object.entries(organized)) {
        if (cats.length === 0) continue;
        const config = HANDLERS[handlerType as keyof typeof HANDLERS];
        if (!config) continue;
        cats.sort();

        html += `<div style="margin-bottom: 16px;">
            <div style="background: ${config.color}; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-weight: bold;">
                ${config.icon} ${config.name} (${cats.length})
            </div>
            <div style="display: grid; gap: 4px;">
                ${cats.map(cat => `
                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; cursor: pointer;">
                        <input type="checkbox" class="category-checkbox" value="${escapeHtml(cat)}">
                        <span>${escapeHtml(cat)}</span>
                        <span style="margin-left: auto; color: #888; font-size: 11px;">${data[cat].length}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
    }

    categoryGrid.innerHTML = html;
    categoryGrid.querySelectorAll('.category-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = categoryGrid.querySelectorAll('.category-checkbox:checked') as NodeListOf<HTMLInputElement>;
            state.selectedTargets = Array.from(checked).map(c => c.value);
            console.log('[Game] Selected:', state.selectedTargets);
        });
    });
}

// Board generation
function generateBoard() {
    boardPath.innerHTML = '';
    for (let i = 1; i <= TOTAL_SPACES; i++) {
        const space = document.createElement('div');
        const pos = BOARD_POSITIONS[i - 1];
        space.className = `board-space ${i === TOTAL_SPACES ? 'finish' : i % 7 === 0 ? 'orange' : 'green'}`;
        space.textContent = String(i);
        space.style.cssText = `position: absolute; left: ${pos.x}px; top: ${pos.y}px;`;
        boardPath.appendChild(space);
    }

    playerToken = document.createElement('div');
    playerToken.className = 'player-token';
    playerToken.innerHTML = '<span>🧒</span>';
    playerToken.style.cssText = 'position: absolute; left: 10px; top: 520px; z-index: 10;';
    boardPath.appendChild(playerToken);
    console.log('[Game] Board generated');
}

function updatePlayerPosition() {
    if (!playerToken) return;
    if (state.currentPosition === 0) {
        playerToken.style.left = '10px';
        playerToken.style.top = '520px';
    } else {
        const pos = BOARD_POSITIONS[state.currentPosition - 1];
        if (pos) {
            playerToken.style.left = `${pos.x + 5}px`;
            playerToken.style.top = `${pos.y - 15}px`;
        }
    }
    positionValue.textContent = state.currentPosition === 0 ? 'Start' :
                                state.currentPosition >= TOTAL_SPACES ? 'Winner!' :
                                `${state.currentPosition}/${TOTAL_SPACES}`;
}

// Spinner
function spin() {
    if (state.isSpinning || !state.isPlaying) return;
    state.isSpinning = true;
    spinBtn.classList.add('disabled');

    const result = Math.floor(Math.random() * 6) + 1;
    const rotation = 360 * 5 + (6 - result) * 60 + 30;

    spinnerWheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    spinnerWheel.style.transform = `rotate(${rotation}deg)`;

    console.log('[Game] Spinning, result:', result);

    setTimeout(() => {
        state.isSpinning = false;
        spinBtn.classList.remove('disabled');
        spinnerWheel.style.transition = 'none';
        spinnerWheel.style.transform = `rotate(${rotation % 360}deg)`;
        movePlayer(result);
    }, 3000);
}

function movePlayer(spaces: number) {
    let remaining = spaces;
    function step() {
        if (remaining <= 0) {
            if (state.currentPosition >= TOTAL_SPACES) {
                showWinScreen();
            } else {
                showRandomCard();
            }
            return;
        }
        state.currentPosition = Math.min(state.currentPosition + 1, TOTAL_SPACES);
        remaining--;
        updatePlayerPosition();
        setTimeout(step, 300);
    }
    step();
}

// Card display
function showRandomCard() {
    if (state.selectedTargets.length === 0) return;
    const idx = Math.floor(Math.random() * state.selectedTargets.length);
    state.currentCategory = state.selectedTargets[idx];
    const card = getRandomCard(state.currentCategory);
    if (!card) return;
    state.currentCard = card;
    renderCard(card);
    cardModal.classList.remove('hidden');
}

function renderCard(card: CardData) {
    const handler = CATEGORY_HANDLER_MAP[state.currentCategory] || 'single-answer';
    const config = HANDLERS[handler as keyof typeof HANDLERS] || HANDLERS['single-answer'];

    let html = `<div style="margin-bottom: 12px;">
        <span style="background: ${config.color}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px;">
            ${config.icon} ${config.name}
        </span>
        <div style="margin-top: 4px; color: #666; font-size: 11px;">${escapeHtml(state.currentCategory)}</div>
    </div>`;

    if (card.title) html += `<div style="font-weight: bold; margin-bottom: 8px;">${escapeHtml(card.title)}</div>`;
    if (card.question) html += `<div style="margin-bottom: 12px;">${card.question.replace(/_+/g, '______')}</div>`;
    if (card.story) html += `<div style="background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 12px; font-style: italic;">${escapeHtml(card.story)}</div>`;

    if (card.images && Array.isArray(card.images)) {
        html += '<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">';
        card.images.forEach(img => {
            const src = typeof img === 'string' ? img : img.image || '';
            const label = typeof img === 'string' ? '' : img.label || '';
            html += `<div style="text-align: center;">
                <img src="${escapeHtml(src)}" style="max-width: 120px; max-height: 120px; border-radius: 8px;" onerror="this.src='../assets/images/default.png'">
                ${label ? `<div style="font-size: 11px;">${escapeHtml(label)}</div>` : ''}
            </div>`;
        });
        html += '</div>';
    }

    if (card.choices) {
        html += '<div style="display: grid; gap: 6px;">';
        ['A', 'B', 'C', 'D'].forEach((label, i) => {
            if (card.choices![i]) {
                html += `<button class="choice-btn" style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #f5f5f5; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; text-align: left;">
                    <span style="background: ${config.color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${label}</span>
                    ${escapeHtml(card.choices![i])}
                </button>`;
            }
        });
        html += '</div>';
    } else {
        html += `<input type="text" placeholder="Type your answer..." style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px;">`;
    }

    cardBody.innerHTML = html;

    cardBody.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cardBody.querySelectorAll('.choice-btn').forEach(b => (b as HTMLElement).style.borderColor = '#ddd');
            (btn as HTMLElement).style.borderColor = '#4CAF50';
        });
    });
}

function closeCard() {
    cardModal.classList.add('hidden');
    state.score += 10;
    scoreValue.textContent = String(state.score);
}

function showWinScreen() {
    finalScore.textContent = String(state.score);
    winScreen.classList.remove('hidden');
    gameControls.classList.add('hidden');
}

function resetGame() {
    state.reset();
    winScreen.classList.add('hidden');
    gameControls.classList.add('hidden');
    scoreDisplay.classList.add('hidden');
    playOverlay.classList.remove('hidden');
    scoreValue.textContent = '0';
}

function startGame() {
    console.log('[Game] Starting, targets:', state.selectedTargets);
    if (state.selectedTargets.length === 0) {
        alert('Please select at least one category!');
        return;
    }

    state.isPlaying = true;
    state.currentPosition = 0;
    state.score = 0;

    targetModal.classList.add('hidden');
    playOverlay.classList.add('hidden');
    gameControls.classList.remove('hidden');
    scoreDisplay.classList.remove('hidden');

    generateBoard();
    updatePlayerPosition();
    scoreValue.textContent = '0';
    positionValue.textContent = 'Start';
    console.log('[Game] Started!');
}

function init() {
    console.log('[Boardgame] Init...');

    playOverlay = document.getElementById('playOverlay')!;
    playButton = document.getElementById('playButton')!;
    targetModal = document.getElementById('targetModal')!;
    categoryTabs = document.querySelector('.category-tabs')!;
    categoryGrid = document.getElementById('targetList')!;
    themeOptions = document.querySelector('.theme-options')!;
    nextButton = document.getElementById('nextButton')!;
    boardPath = document.getElementById('boardPath')!;
    spinnerWheel = document.getElementById('spinnerWheel')!;
    spinBtn = document.getElementById('spinBtn')!;
    resetBtn = document.getElementById('resetBtn')!;
    gameControls = document.getElementById('gameControls')!;
    scoreDisplay = document.getElementById('scoreDisplay')!;
    scoreValue = document.getElementById('scoreValue')!;
    positionValue = document.getElementById('positionValue')!;
    cardModal = document.getElementById('cardModal')!;
    cardBody = document.getElementById('cardBody')!;
    cardClose = document.getElementById('cardClose')!;
    doneButton = document.getElementById('doneButton')!;
    winScreen = document.getElementById('winScreen')!;
    finalScore = document.getElementById('finalScore')!;
    playAgainBtn = document.getElementById('playAgainBtn')!;

    playButton.addEventListener('click', () => {
        console.log('[Game] PLAY clicked');
        playOverlay.classList.add('hidden');
        targetModal.classList.remove('hidden');
        renderCategorySelection('language');
    });

    categoryTabs?.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            categoryTabs.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            (e.target as HTMLElement).classList.add('active');
            renderCategorySelection((e.target as HTMLElement).dataset.category as 'language' | 'articulation');
        });
    });

    nextButton.addEventListener('click', startGame);
    spinBtn.addEventListener('click', spin);
    spinnerWheel.addEventListener('click', spin);
    cardClose.addEventListener('click', closeCard);
    doneButton.addEventListener('click', closeCard);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        setTimeout(() => loadingScreen.classList.add('hidden'), 500);
    }

    console.log('[Boardgame] Ready with', Object.keys(allCardData).length, 'categories');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
