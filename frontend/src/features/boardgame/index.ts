/**
 * Boardgame Module
 * Main game logic for the speech therapy board game
 */

/// <reference types="vite/client" />

import { CATEGORY_HANDLER_MAP } from '@shared/categories';
import { HANDLERS, renderCard, allCardData, languageData, articulationData } from '../cards/index';
import { hideLoadingScreen } from '@common/components/LoadingScreen';
import { voiceService, VoiceState } from './services/voice.service';

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

// Game state
const state = {
    isPlaying: false,
    currentPosition: 0,
    score: 0,
    selectedTargets: [] as string[],
    currentCard: null as CardData | null,
    currentCategory: '',
    isSpinning: false,
    selectedTheme: 'autumn',
    selectedCharacter: '🧒',
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
let nextButton: HTMLElement;
let boardPath: HTMLElement;
let leftPanel: HTMLElement;
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
let voiceToggle: HTMLElement;
let voiceToggleBtn: HTMLElement;
let voiceStatus: HTMLElement;
let voiceIndicator: HTMLElement;

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
                    <label style="display: flex; align-items: center; gap: 8px; padding: 8px; background: var(--theme-bg-light); border-radius: 4px; cursor: pointer;">
                        <input type="checkbox" class="category-checkbox" value="${escapeHtml(cat)}">
                        <span>${escapeHtml(cat)}</span>
                        <span style="margin-left: auto; color: var(--color-text-light); font-size: 11px;">${data[cat].length}</span>
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
    const themeIcons: Record<string, string> = {
        spring: '🌸',
        summer: '☀️',
        autumn: '🍂',
        winter: '❄'
    };
    const themeIcon = themeIcons[state.selectedTheme] || '🍂';

    for (let i = 1; i <= TOTAL_SPACES; i++) {
        const space = document.createElement('div');
        const pos = BOARD_POSITIONS[i - 1];
        space.className = `board-space ${i === TOTAL_SPACES ? 'finish' : i % 7 === 0 ? 'orange' : 'green'}`;
        space.textContent = String(i);
        space.style.cssText = `position: absolute; left: ${pos.x}px; top: ${pos.y}px;`;

        // Add theme decoration
        if (i % 5 === 0 && i !== TOTAL_SPACES) {
            const decoration = document.createElement('div');
            decoration.className = 'space-decoration';
            decoration.textContent = themeIcon;
            decoration.style.cssText = 'position: absolute; top: -8px; right: -8px; font-size: 16px;';
            space.appendChild(decoration);
        }

        boardPath.appendChild(space);
    }

    playerToken = document.createElement('div');
    playerToken.className = 'player-token';
    playerToken.innerHTML = `<span>${state.selectedCharacter}</span>`;
    playerToken.style.cssText = 'position: absolute; left: 10px; top: 520px; z-index: 10;';
    boardPath.appendChild(playerToken);
    console.log('[Game] Board generated with theme:', state.selectedTheme);
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
    renderCard(card, state.currentCategory, cardBody);
    cardModal.classList.remove('hidden');
    gameControls.classList.add('hidden');

    // Speak the card if voice mode is enabled
    if (voiceService.isReady()) {
        voiceService.speakCard(card, state.currentCategory);
    }
}

function closeCard() {
    cardModal.classList.add('hidden');
    gameControls.classList.remove('hidden');
    state.score += 10;
    scoreValue.textContent = String(state.score);

    // Stop listening when card is closed
    if (voiceService.isEnabled()) {
        voiceService.stopListening();
    }
}

// Voice mode functions
function updateVoiceUI(voiceState: VoiceState) {
    // Update toggle button classes
    voiceToggleBtn.classList.remove('active', 'connecting', 'speaking', 'listening');

    switch (voiceState) {
        case 'ready':
            voiceToggleBtn.classList.add('active');
            voiceStatus.textContent = 'Voice mode active';
            voiceIndicator.classList.add('hidden');
            break;
        case 'connecting':
            voiceToggleBtn.classList.add('connecting');
            voiceStatus.textContent = 'Connecting...';
            voiceIndicator.classList.add('hidden');
            break;
        case 'speaking':
            voiceToggleBtn.classList.add('speaking');
            voiceStatus.textContent = 'AI speaking';
            voiceIndicator.classList.remove('hidden');
            voiceIndicator.classList.remove('listening');
            const indicatorText = voiceIndicator.querySelector('.voice-indicator-text');
            if (indicatorText) indicatorText.textContent = 'Speaking...';
            break;
        case 'listening':
            voiceToggleBtn.classList.add('listening');
            voiceStatus.textContent = 'Listening...';
            voiceIndicator.classList.remove('hidden');
            voiceIndicator.classList.add('listening');
            break;
        case 'idle':
        default:
            voiceStatus.textContent = '';
            voiceIndicator.classList.add('hidden');
            break;
    }
}

async function toggleVoiceMode() {
    if (voiceService.isEnabled()) {
        voiceService.disable();
        console.log('[Voice] Disabled');
    } else {
        const success = await voiceService.enable();
        if (success) {
            console.log('[Voice] Enabled');
        } else {
            console.error('[Voice] Failed to enable');
        }
    }
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
    leftPanel.classList.add('hidden');
    playOverlay.classList.add('hidden');
    targetModal.classList.remove('hidden');
    voiceToggle.classList.add('hidden');
    scoreValue.textContent = '0';

    // Disable voice mode when game resets
    if (voiceService.isEnabled()) {
        voiceService.disable();
    }
}

function updateThemeDecorations() {
    const snowflakesContainer = document.querySelector('.snowflakes');
    if (!snowflakesContainer) return;

    const decorations: Record<string, string[]> = {
        spring: ['🌸', '🌷'],
        summer: ['☀️', '🌻'],
        autumn: ['🍂', '🍁'],
        winter: ['❄', '🌨️']
    };

    const decorationIcon = decorations[state.selectedTheme] || decorations.autumn;
    const snowflakes = snowflakesContainer.querySelectorAll('.snowflake');
    snowflakes.forEach((flake, index) => {
        flake.textContent = decorationIcon[index % 2];
    });
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

    // Apply theme to body and update decorations
    document.body.className = `theme-${state.selectedTheme}`;
    updateThemeDecorations();

    targetModal.classList.add('hidden');
    playOverlay.classList.add('hidden');
    leftPanel.classList.remove('hidden');
    gameControls.classList.remove('hidden');
    scoreDisplay.classList.remove('hidden');
    voiceToggle.classList.remove('hidden');

    generateBoard();
    updatePlayerPosition();
    scoreValue.textContent = '0';
    positionValue.textContent = 'Start';
    console.log('[Game] Started!');
}

function init() {
    console.log('[Boardgame] Init...');

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('piper-theme');
    if (savedTheme) {
        state.selectedTheme = savedTheme;
    }

    // Apply theme to body (html already has it from inline script)
    document.body.className = `theme-${state.selectedTheme}`;

    // Pre-select the saved theme button
    document.querySelectorAll('.theme-option').forEach(o => {
        o.classList.toggle('selected', (o as HTMLElement).dataset.theme === state.selectedTheme);
    });

    playOverlay = document.getElementById('playOverlay')!
    playButton = document.getElementById('playButton')!;
    targetModal = document.getElementById('targetModal')!;
    categoryTabs = document.querySelector('.category-tabs')!;
    categoryGrid = document.getElementById('targetList')!;
    nextButton = document.getElementById('nextButton')!;
    boardPath = document.getElementById('boardPath')!;
    leftPanel = document.getElementById('leftPanel')!;
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
    voiceToggle = document.getElementById('voiceToggle')!;
    voiceToggleBtn = document.getElementById('voiceToggleBtn')!;
    voiceStatus = document.getElementById('voiceStatus')!;
    voiceIndicator = document.getElementById('voiceIndicator')!;

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

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = (e.currentTarget as HTMLElement);
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
            target.classList.add('selected');
            state.selectedTheme = target.dataset.theme || 'autumn';
            document.body.className = `theme-${state.selectedTheme}`;
            document.documentElement.className = `theme-${state.selectedTheme}`;
            localStorage.setItem('piper-theme', state.selectedTheme);
            updateThemeDecorations();
            console.log('[Game] Selected theme:', state.selectedTheme);
        });
    });

    // Character selection
    document.querySelectorAll('.character-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = (e.currentTarget as HTMLElement);
            document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
            target.classList.add('selected');
            state.selectedCharacter = target.dataset.character || '🧒';
            console.log('[Game] Selected character:', state.selectedCharacter);
        });
    });

    nextButton.addEventListener('click', startGame);
    spinBtn.addEventListener('click', spin);
    spinnerWheel.addEventListener('click', spin);
    cardClose.addEventListener('click', closeCard);
    doneButton.addEventListener('click', closeCard);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Voice mode setup
    voiceToggleBtn.addEventListener('click', toggleVoiceMode);

    // Set up voice service callbacks
    voiceService.onStateChange = updateVoiceUI;
    voiceService.onError = (message) => {
        console.error('[Voice] Error:', message);
        voiceStatus.textContent = message;
        setTimeout(() => {
            if (voiceStatus.textContent === message) {
                voiceStatus.textContent = '';
            }
        }, 3000);
    };
    voiceService.onTranscript = (text, role) => {
        console.log(`[Voice] ${role}: ${text}`);
    };

    // Hide loading screen using shared component
    hideLoadingScreen(500);

    console.log('[Boardgame] Ready with', Object.keys(allCardData).length, 'categories');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
