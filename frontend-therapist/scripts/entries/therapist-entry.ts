/**
 * Therapist Dashboard Entry Point
 */

// Initialize global namespace
window.SpeechGame = window.SpeechGame || {};

// Game data (contains getBoardGameCategories used by therapist)
import '../data/boardgame-data';

// Therapist-specific modules
import '../therapist/therapist-api';
import '../therapist/therapist-app';

console.log('[Vite] Therapist modules loaded');
