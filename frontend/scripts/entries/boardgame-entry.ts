/**
 * Boardgame Entry Point
 * Imports all scripts and assembles the global SpeechGame namespace
 */

console.log('[Entry] Starting module imports...');

// ============ CORE MODULES (ES Module exports) ============
import { dom } from '../core/dom-cache';
import { state, vadState, vadConfig } from '../core/game-state';
import { audio, tts } from '../core/audio-manager';
import { ui } from '../core/ui-helpers';
import { board } from '../core/board-logic';
import { api } from '../core/api-helpers';
import { voiceManager } from '../core/voice-manager';
import { hybridInput } from '../core/hybrid-input';
import { styleNormalizer } from '../core/style-normalizer';
import { focusCard } from '../core/focus-card';

// ============ ASSEMBLE NAMESPACE ============
// All core modules now use ES Module exports
console.log('[Entry] Assembling SpeechGame namespace...');
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.dom = dom;
window.SpeechGame.state = state;
window.SpeechGame.vadState = vadState;
window.SpeechGame.vadConfig = vadConfig;
window.SpeechGame.audio = audio;
window.SpeechGame.tts = tts;
window.SpeechGame.ui = ui;
window.SpeechGame.board = board;
window.SpeechGame.api = api;
window.SpeechGame.voiceManager = voiceManager;
window.SpeechGame.hybridInput = hybridInput;
window.SpeechGame.styleNormalizer = styleNormalizer;
window.SpeechGame.focusCard = focusCard;

// ============ CARD TYPE HANDLERS ============
// Uses unified 7-handler system via card-renderer.ts
import { cardHandlers } from '../handlers/base-handler';
window.SpeechGame.cardHandlers = cardHandlers;

// ============ PIPER CHILD MODE ============
import { childState } from '../child/child-state';
import { childApi } from '../child/child-api';
import { childUI } from '../child/child-ui';
window.SpeechGame.childState = childState;
window.SpeechGame.childApi = childApi;
window.SpeechGame.childUI = childUI;

// ============ GAME DATA AND MAIN LOGIC ============
import { gameCardsData, getCardsForCategory, getRandomCard, categoryHasCards, getBoardGameCategories } from '../data/boardgame-data';
import { init, targetsData, populateTargets } from '../pages/boardgame';

console.log('[Vite] Boardgame modules loaded (ES Modules)');

// ============ INITIALIZE GAME ============
// Call init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
} else {
    init();
}
