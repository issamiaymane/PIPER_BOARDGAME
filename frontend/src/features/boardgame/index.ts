/**
 * Boardgame Module
 * Main game logic for the speech therapy board game
 */

/// <reference types="vite/client" />

import { CATEGORY_HANDLER_MAP } from '@shared/categories';
import { HANDLERS, renderCard, allCardData, languageData, articulationData } from '../cards/index';
import { hideLoadingScreen } from '@common/components/LoadingScreen';
import { voiceService, VoiceState, UIPackage, CardData } from './services/voice';
import { pipelineVisualizer, PipelineLogData } from './services/pipeline-visualizer';
import { gameLogger, voiceLogger } from './services/logger';

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
let listenIndicator: HTMLElement;

// Safety-gate UI elements
let safetyOverlay: HTMLElement;
let choicesContainer: HTMLElement;
let bubbleBreathingModal: HTMLElement;
let feedbackDisplay: HTMLElement;

// Safety-gate state
let currentSafetyLevel = 0;
let isBreathingActive = false;

// Intervention display mapping
const INTERVENTION_DISPLAY: Record<string, { icon: string; label: string; priority: number }> = {
    'BUBBLE_BREATHING': { icon: '🫧', label: 'Bubble Breathing', priority: 1 },
    'SKIP_CARD': { icon: '⏭️', label: 'Skip This One', priority: 2 },
    'RETRY_CARD': { icon: '🔄', label: 'Try Again', priority: 3 },
    'START_BREAK': { icon: '☕', label: 'Take a Break', priority: 4 },
    'CALL_GROWNUP': { icon: '👨‍👩‍👧', label: 'Call a Grownup', priority: 5 }
};

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
            gameLogger.info('Selected:', state.selectedTargets);
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
    gameLogger.info('Board generated with theme:', state.selectedTheme);
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

// Spin sound effect using Web Audio API (tick-tick effect)
function playSpinSound(duration: number = 3000) {
    const audioContext = new AudioContext();
    const startTime = audioContext.currentTime;
    const endTime = startTime + duration / 1000;

    let tickCount = 0;
    const maxTicks = 30;

    function scheduleTick(time: number, volume: number) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800 + Math.random() * 200;
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(volume * 0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        oscillator.start(time);
        oscillator.stop(time + 0.05);
    }

    function scheduleAllTicks() {
        let currentTime = startTime;
        let interval = 0.05;

        while (currentTime < endTime && tickCount < maxTicks) {
            const progress = (currentTime - startTime) / (endTime - startTime);
            const volume = 1 - progress * 0.7;

            scheduleTick(currentTime, volume);

            interval = 0.05 + progress * 0.25;
            currentTime += interval;
            tickCount++;
        }
    }

    scheduleAllTicks();

    setTimeout(() => audioContext.close(), duration + 100);
}

// Spinner
function spin() {
    if (state.isSpinning || !state.isPlaying) return;
    state.isSpinning = true;
    spinBtn.classList.add('disabled');

    // Play tick-tick spin sound
    playSpinSound(3000);

    const result = Math.floor(Math.random() * 6) + 1;
    const rotation = 360 * 5 + (6 - result) * 60 + 30;

    spinnerWheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    spinnerWheel.style.transform = `rotate(${rotation}deg)`;

    gameLogger.debug('Spinning, result:', result);

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

    // Hide safety-gate UI
    hideChoices();
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
            listenIndicator.classList.add('hidden');
            break;
        case 'connecting':
            voiceToggleBtn.classList.add('connecting');
            voiceStatus.textContent = 'Connecting...';
            voiceIndicator.classList.add('hidden');
            listenIndicator.classList.add('hidden');
            break;
        case 'speaking':
            voiceToggleBtn.classList.add('speaking');
            voiceStatus.textContent = 'AI speaking';
            voiceIndicator.classList.remove('hidden');
            listenIndicator.classList.add('hidden');
            break;
        case 'listening':
            voiceToggleBtn.classList.add('listening');
            voiceStatus.textContent = 'Listening...';
            voiceIndicator.classList.add('hidden');
            listenIndicator.classList.remove('hidden');
            break;
        case 'idle':
        default:
            voiceStatus.textContent = '';
            voiceIndicator.classList.add('hidden');
            listenIndicator.classList.add('hidden');
            break;
    }
}

async function toggleVoiceMode() {
    if (voiceService.isEnabled()) {
        voiceService.disable();
        voiceLogger.info('Disabled');
    } else {
        const success = await voiceService.enable();
        if (success) {
            voiceLogger.info('Enabled');
        } else {
            voiceLogger.error('Failed to enable');
        }
    }
}

// Safety-gate UI functions
function initSafetyGateUI() {
    // Create safety overlay
    safetyOverlay = document.createElement('div');
    safetyOverlay.id = 'safetyOverlay';
    safetyOverlay.className = 'safety-overlay hidden';
    document.body.appendChild(safetyOverlay);

    // Create choices container
    choicesContainer = document.createElement('div');
    choicesContainer.id = 'choicesContainer';
    choicesContainer.className = 'choices-container hidden';
    safetyOverlay.appendChild(choicesContainer);

    // Create feedback display
    feedbackDisplay = document.createElement('div');
    feedbackDisplay.id = 'feedbackDisplay';
    feedbackDisplay.className = 'feedback-display hidden';
    document.body.appendChild(feedbackDisplay);

    // Create bubble breathing modal
    bubbleBreathingModal = document.createElement('div');
    bubbleBreathingModal.id = 'bubbleBreathingModal';
    bubbleBreathingModal.className = 'bubble-breathing-modal hidden';
    bubbleBreathingModal.innerHTML = `
        <div class="breathing-content">
            <div class="breathing-bubble"></div>
            <div class="breathing-instructions">
                <span class="breathing-phase">Breathe in slowly...</span>
            </div>
            <button class="done-breathing-btn">I feel better</button>
        </div>
    `;
    document.body.appendChild(bubbleBreathingModal);

    // Set up breathing modal done button
    const doneBreathingBtn = bubbleBreathingModal.querySelector('.done-breathing-btn');
    if (doneBreathingBtn) {
        doneBreathingBtn.addEventListener('click', closeBubbleBreathing);
    }
}

function handleSafetyGateResponse(uiPackage: UIPackage, isCorrect: boolean, shouldSkipCard: boolean = false) {
    currentSafetyLevel = uiPackage.overlay.safetyLevel;

    // Log to Chrome console with same format as backend terminal
    const logData: PipelineLogData = {
        childSaid: uiPackage.childSaid || '[unknown]',
        targetAnswers: uiPackage.targetAnswers || [],
        isCorrect,
        safetyLevel: uiPackage.overlay.safetyLevel,
        signals: uiPackage.overlay.signals || [],
        interventions: uiPackage.interventions || [],
        state: {
            engagement: uiPackage.overlay.state?.engagementLevel || 0,
            dysregulation: uiPackage.overlay.state?.dysregulationLevel || 0,
            fatigue: uiPackage.overlay.state?.fatigueLevel || 0,
            consecutiveErrors: uiPackage.overlay.state?.consecutiveErrors || 0,
            timeInSession: uiPackage.overlay.state?.timeInSession || 0,
        },
        feedback: uiPackage.speech.text,
        attemptNumber: uiPackage.attemptNumber || 1,
        responseHistory: uiPackage.responseHistory || [],
        shouldSpeak: true
    };
    pipelineVisualizer.logSessionState(logData);

    // Show feedback display
    if (uiPackage.speech.text) {
        showFeedback(uiPackage.speech.text, isCorrect);
    }

    // If answer is correct, auto-progress after feedback is spoken
    if (isCorrect) {
        // Stop listening - we got the right answer!
        if (voiceService.isEnabled()) {
            voiceService.stopListening();
        }

        // Show celebration
        showCelebration();

        // Wait for feedback to be spoken (approximately 3 seconds), then close card
        setTimeout(() => {
            closeCard();
        }, 3500);
        return; // Don't show choices for correct answers
    }

    // If shouldSkipCard (taskTimeExceeded), skip to next card
    if (shouldSkipCard) {
        gameLogger.info('Skipping card (taskTimeExceeded)');
        // Stop listening
        if (voiceService.isEnabled()) {
            voiceService.stopListening();
        }

        // Wait for feedback to be spoken, then close card
        setTimeout(() => {
            closeCard();
        }, 3000);
        return; // Don't show choices when skipping
    }

    // Show choices if there are any interventions and safety level indicates need (for incorrect answers)
    if (uiPackage.interventions.length > 0 && currentSafetyLevel >= 1) {
        // Pause listening when showing choices - let feedback continue speaking, just don't listen
        if (voiceService.isEnabled()) {
            voiceService.pauseListening();
        }
        renderInterventions(uiPackage.interventions, uiPackage.choiceMessage);
    }
}

function showFeedback(text: string, isCorrect: boolean) {
    feedbackDisplay.textContent = text;
    feedbackDisplay.className = `feedback-display ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDisplay.classList.remove('hidden');

    // Auto-hide after 5 seconds if correct
    if (isCorrect) {
        setTimeout(() => {
            feedbackDisplay.classList.add('hidden');
        }, 5000);
    }
}

function showCelebration() {
    // Create celebration overlay
    const celebration = document.createElement('div');
    celebration.className = 'celebration-overlay';
    celebration.innerHTML = `
        <div class="celebration-content">
            <div class="celebration-emoji">🎉</div>
            <div class="celebration-text">Great job!</div>
            <div class="celebration-stars">
                <span class="star star-1">⭐</span>
                <span class="star star-2">⭐</span>
                <span class="star star-3">⭐</span>
            </div>
        </div>
    `;
    document.body.appendChild(celebration);

    // Add confetti particles
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.backgroundColor = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)];
        celebration.appendChild(confetti);
    }

    // Auto-remove after animation
    setTimeout(() => {
        celebration.classList.add('fade-out');
        setTimeout(() => celebration.remove(), 500);
    }, 3000);
}

function renderInterventions(interventions: string[], message: string) {
    // Map intervention strings to display objects and sort by priority
    const displayChoices = interventions
        .map(intervention => {
            const display = INTERVENTION_DISPLAY[intervention] || {
                icon: '❓',
                label: intervention,
                priority: 99
            };
            return { ...display, action: intervention };
        })
        .sort((a, b) => a.priority - b.priority);

    choicesContainer.innerHTML = `
        <div class="choices-message">${escapeHtml(message)}</div>
        <div class="choices-buttons">
            ${displayChoices.map(choice => `
                <button class="choice-btn" data-action="${choice.action}">
                    <span class="choice-icon">${choice.icon}</span>
                    <span class="choice-label">${escapeHtml(choice.label)}</span>
                </button>
            `).join('')}
        </div>
    `;

    // Add click handlers
    choicesContainer.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', handleInterventionClick);
    });

    // Show overlay and choices
    safetyOverlay.classList.remove('hidden');
    choicesContainer.classList.remove('hidden');
}

function handleInterventionClick(e: Event) {
    const target = e.currentTarget as HTMLElement;
    const action = target.dataset.action || '';

    // Log intervention selection with styled console output
    pipelineVisualizer.logInterventionSelected(action);

    // Interrupt any ongoing speech so we can transition to ready state
    if (voiceService.isEnabled()) {
        voiceService.interruptSpeech();
        voiceService.notifyChoiceSelected(action);
    }

    // Hide interventions
    hideChoices();

    switch (action) {
        case 'BUBBLE_BREATHING':
            pipelineVisualizer.logBubbleBreathingStart();
            showBubbleBreathing();
            break;

        case 'SKIP_CARD':
            closeCard();
            setTimeout(() => showRandomCard(), 500);
            break;

        case 'RETRY_CARD':
            // Start listening again
            if (voiceService.isReady()) {
                voiceService.startListening();
            }
            break;

        case 'START_BREAK':
            startBreak();
            break;

        case 'CALL_GROWNUP':
            handleGrownupHelp();
            break;

        default:
            gameLogger.warn('Unknown SafetyGate action:', action);
    }
}

function hideChoices() {
    safetyOverlay.classList.add('hidden');
    choicesContainer.classList.add('hidden');
    feedbackDisplay.classList.add('hidden');
}

function showBubbleBreathing() {
    isBreathingActive = true;
    bubbleBreathingModal.classList.remove('hidden');
    startBreathingAnimation();
}

function closeBubbleBreathing() {
    isBreathingActive = false;
    bubbleBreathingModal.classList.add('hidden');

    // Notify backend that bubble breathing ended - resume session timer
    if (voiceService.isEnabled()) {
        voiceService.notifyActivityEnded('BUBBLE_BREATHING');
    }

    // Resume listening if voice is enabled
    if (voiceService.isReady()) {
        voiceService.startListening();
    }
}

function startBreathingAnimation() {
    const bubble = bubbleBreathingModal.querySelector('.breathing-bubble') as HTMLElement;
    const phaseText = bubbleBreathingModal.querySelector('.breathing-phase') as HTMLElement;

    if (!bubble || !phaseText) return;

    let phase = 0;
    const phases = [
        { text: 'Breathe in slowly...', scale: 1.5, duration: 4000 },
        { text: 'Hold...', scale: 1.5, duration: 2000 },
        { text: 'Breathe out slowly...', scale: 1, duration: 4000 },
        { text: 'Hold...', scale: 1, duration: 2000 }
    ];

    function animate() {
        if (!isBreathingActive) return;

        const currentPhase = phases[phase % phases.length];
        phaseText.textContent = currentPhase.text;
        bubble.style.transform = `scale(${currentPhase.scale})`;

        phase++;
        setTimeout(animate, currentPhase.duration);
    }

    animate();
}

function startBreak() {
    // Close the card and show a break screen
    closeCard();

    // Stop any ongoing AI speech during break
    if (voiceService.isEnabled()) {
        voiceService.interruptSpeech();
    }

    const BREAK_DURATION = 45; // seconds
    let remainingTime = BREAK_DURATION;

    // Show a simple break message
    const breakMessage = document.createElement('div');
    breakMessage.className = 'break-message';
    breakMessage.innerHTML = `
        <div class="break-content">
            <div class="break-icon">🎵</div>
            <h2>Break Time!</h2>
            <p>Take a moment to relax.</p>
            <div class="break-timer">${remainingTime}s</div>
            <button class="end-break-btn">I'm ready to continue</button>
        </div>
    `;
    document.body.appendChild(breakMessage);

    const timerDisplay = breakMessage.querySelector('.break-timer') as HTMLElement;
    const endBreakBtn = breakMessage.querySelector('.end-break-btn');

    // Countdown timer
    const timerInterval = setInterval(() => {
        remainingTime--;
        if (timerDisplay) {
            timerDisplay.textContent = `${remainingTime}s`;
        }
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            endBreak();
        }
    }, 1000);

    function endBreak() {
        clearInterval(timerInterval);
        breakMessage.remove();

        // Notify backend that break ended - resume session timer
        if (voiceService.isEnabled()) {
            voiceService.notifyActivityEnded('BREAK');
        }

        // Return to spinner (gameControls already visible from closeCard())
    }

    if (endBreakBtn) {
        endBreakBtn.addEventListener('click', endBreak);
    }
}

function handleGrownupHelp() {
    // Log with styled console output
    pipelineVisualizer.logGrownupHelp();

    // Hide choices modal if open
    hideChoices();

    // Close the card and show full-screen grownup help
    closeCard();

    // Stop any ongoing AI speech during grownup help
    if (voiceService.isEnabled()) {
        voiceService.interruptSpeech();
    }

    // Show full-screen grownup help modal
    const helpModal = document.createElement('div');
    helpModal.className = 'grownup-help-modal';
    helpModal.innerHTML = `
        <div class="help-content">
            <h2>Help is on the way!</h2>
            <p>A grownup has been notified.</p>
            <p class="help-subtext">Take a moment to relax while you wait.</p>
            <button class="close-help-btn">I'm ready to continue</button>
        </div>
    `;
    document.body.appendChild(helpModal);

    const closeBtn = helpModal.querySelector('.close-help-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            helpModal.remove();

            // Notify backend that grownup help ended - resume session timer
            if (voiceService.isEnabled()) {
                voiceService.notifyActivityEnded('GROWNUP_HELP');
            }

            // Return to spinner (gameControls already visible from closeCard())
        });
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

    // Disable voice mode when game resets (will auto-start again on next game)
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

async function startGame() {
    gameLogger.info('Starting, targets:', state.selectedTargets);
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
    // Voice toggle is hidden - voice starts automatically
    voiceToggle.classList.add('hidden');

    generateBoard();
    updatePlayerPosition();
    scoreValue.textContent = '0';
    positionValue.textContent = 'Start';

    // Auto-start voice mode
    voiceLogger.info('Auto-starting voice mode...');
    const voiceEnabled = await voiceService.enable();
    if (voiceEnabled) {
        voiceLogger.info('Voice mode started successfully');
    } else {
        voiceLogger.error('Failed to auto-start voice mode');
    }

    gameLogger.info('Started!');
}

function init() {
    gameLogger.info('Init...');

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
    listenIndicator = document.getElementById('listenIndicator')!;

    playButton.addEventListener('click', () => {
        gameLogger.debug('PLAY clicked');
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
            gameLogger.info('Selected theme:', state.selectedTheme);
        });
    });

    // Character selection
    document.querySelectorAll('.character-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = (e.currentTarget as HTMLElement);
            document.querySelectorAll('.character-option').forEach(o => o.classList.remove('selected'));
            target.classList.add('selected');
            state.selectedCharacter = target.dataset.character || '🧒';
            gameLogger.info('Selected character:', state.selectedCharacter);
        });
    });

    nextButton.addEventListener('click', startGame);
    spinBtn.addEventListener('click', spin);
    spinnerWheel.addEventListener('click', spin);
    // Card close/done buttons removed - safety-gate handles progression
    // cardClose.addEventListener('click', closeCard);
    // doneButton.addEventListener('click', closeCard);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', resetGame);

    // Hide the done button - safety-gate controls the flow
    if (doneButton) doneButton.style.display = 'none';
    if (cardClose) cardClose.style.display = 'none';

    // Voice mode setup
    voiceToggleBtn.addEventListener('click', toggleVoiceMode);

    // Set up voice service callbacks
    voiceService.onStateChange = updateVoiceUI;
    voiceService.onError = (message) => {
        voiceLogger.error('Error:', message);
        voiceStatus.textContent = message;
        setTimeout(() => {
            if (voiceStatus.textContent === message) {
                voiceStatus.textContent = '';
            }
        }, 3000);
    };
    voiceService.onTranscript = (text, role) => {
        voiceLogger.debug(`${role}: ${text}`);
    };

    // Set up safety-gate callback
    voiceService.onSafetyGateResponse = handleSafetyGateResponse;

    // Initialize safety-gate UI
    initSafetyGateUI();

    // Hide loading screen using shared component
    hideLoadingScreen(500);

    gameLogger.info('Ready with', Object.keys(allCardData).length, 'categories');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
