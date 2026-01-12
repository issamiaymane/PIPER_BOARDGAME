/**
 * Calibration Overlay Component
 * Full-screen overlay for the pre-session voice calibration flow
 * Simplified: Shows AI speaking vs Child's turn with voice activity indicator
 */

import './calibration-overlay.css';
import type { CalibrationPhase, CalibrationResult } from '../../../features/boardgame/services/calibration-types.js';
import { CALIBRATION_PHASES, getPhaseConfig } from '../../../features/boardgame/services/calibration-types.js';

export interface CalibrationOverlayOptions {
  container?: HTMLElement;
  onSkip?: () => void;
}

let overlayElement: HTMLElement | null = null;
let turnIndicator: HTMLElement | null = null;
let voiceActivityBars: HTMLElement[] = [];
let phaseIcon: HTMLElement | null = null;
let phaseTitle: HTMLElement | null = null;
let phaseInstruction: HTMLElement | null = null;
let phaseDots: HTMLElement[] = [];
let isChildTurn = false;

/**
 * Create and show the calibration overlay
 */
export function showCalibrationOverlay(options: CalibrationOverlayOptions = {}): HTMLElement {
  const { container = document.body, onSkip } = options;

  // Remove existing overlay if any
  hideCalibrationOverlay();

  overlayElement = document.createElement('div');
  overlayElement.id = 'calibrationOverlay';
  overlayElement.className = 'calibration-overlay';

  overlayElement.innerHTML = `
    <div class="calibration-container">
      <h1 class="calibration-title">Voice Setup</h1>

      <div class="calibration-progress">
        ${CALIBRATION_PHASES.map((_, i) => `<div class="calibration-phase-dot" data-phase-index="${i}"></div>`).join('')}
      </div>

      <div class="calibration-phase">
        <div class="calibration-phase-icon" id="calibrationPhaseIcon"></div>
        <h2 class="calibration-phase-title" id="calibrationPhaseTitle">Getting ready...</h2>
        <p class="calibration-phase-instruction" id="calibrationPhaseInstruction">Please wait</p>
      </div>

      <div class="calibration-turn-indicator ai-turn" id="calibrationTurnIndicator">
        <span class="turn-icon">🔊</span>
        <span class="turn-text">Listen...</span>
      </div>

      <div class="calibration-voice-activity hidden" id="calibrationVoiceActivity">
        <div class="voice-bar" data-bar="0"></div>
        <div class="voice-bar" data-bar="1"></div>
        <div class="voice-bar" data-bar="2"></div>
        <div class="voice-bar" data-bar="3"></div>
        <div class="voice-bar" data-bar="4"></div>
        <div class="voice-bar" data-bar="5"></div>
        <div class="voice-bar" data-bar="6"></div>
      </div>

      <button class="calibration-skip-button" id="calibrationSkipButton">Skip Setup</button>
    </div>
  `;

  container.appendChild(overlayElement);

  // Cache DOM references
  turnIndicator = overlayElement.querySelector('#calibrationTurnIndicator');
  voiceActivityBars = Array.from(overlayElement.querySelectorAll('.voice-bar'));
  phaseIcon = overlayElement.querySelector('#calibrationPhaseIcon');
  phaseTitle = overlayElement.querySelector('#calibrationPhaseTitle');
  phaseInstruction = overlayElement.querySelector('#calibrationPhaseInstruction');
  phaseDots = Array.from(overlayElement.querySelectorAll('.calibration-phase-dot'));

  // Set up skip button
  const skipButton = overlayElement.querySelector('#calibrationSkipButton');
  if (skipButton && onSkip) {
    skipButton.addEventListener('click', onSkip);
  }

  return overlayElement;
}

/**
 * Update the overlay to show a specific phase
 */
export function updateCalibrationPhase(phase: CalibrationPhase): void {
  if (!overlayElement) return;

  const config = getPhaseConfig(phase);
  const phaseIndex = CALIBRATION_PHASES.findIndex(p => p.phase === phase);

  // Update phase dots
  phaseDots.forEach((dot, i) => {
    dot.classList.remove('completed', 'active');
    if (i < phaseIndex) {
      dot.classList.add('completed');
    } else if (i === phaseIndex) {
      dot.classList.add('active');
    }
  });

  // Update phase display
  if (config && phaseIcon && phaseTitle && phaseInstruction) {
    phaseIcon.textContent = config.icon;
    phaseTitle.textContent = config.title;
    phaseInstruction.textContent = config.instruction;
  }

  // Reset to AI speaking mode
  setAiSpeaking();
}

/**
 * Set UI to show AI is speaking
 */
export function setAiSpeaking(): void {
  isChildTurn = false;

  if (!turnIndicator) return;
  const icon = turnIndicator.querySelector('.turn-icon');
  const text = turnIndicator.querySelector('.turn-text');

  turnIndicator.classList.remove('child-turn');
  turnIndicator.classList.add('ai-turn');
  if (icon) icon.textContent = '🔊';
  if (text) text.textContent = 'Listen...';

  // Hide voice activity bars
  const voiceActivity = overlayElement?.querySelector('#calibrationVoiceActivity');
  if (voiceActivity) voiceActivity.classList.add('hidden');
}

/**
 * Set UI to show it's the child's turn to speak
 */
export function setChildTurn(): void {
  isChildTurn = true;

  if (!turnIndicator) return;
  const icon = turnIndicator.querySelector('.turn-icon');
  const text = turnIndicator.querySelector('.turn-text');

  turnIndicator.classList.remove('ai-turn');
  turnIndicator.classList.add('child-turn');
  if (icon) icon.textContent = '🎤';
  if (text) text.textContent = 'Your Turn!';

  // Show voice activity bars
  const voiceActivity = overlayElement?.querySelector('#calibrationVoiceActivity');
  if (voiceActivity) voiceActivity.classList.remove('hidden');
}

/**
 * Update voice activity visualization (0-1 amplitude)
 */
export function updateVoiceActivity(amplitude: number): void {
  if (!isChildTurn || voiceActivityBars.length === 0) return;

  // Map amplitude (0-1) to bar heights
  const numBars = voiceActivityBars.length;
  const centerIndex = Math.floor(numBars / 2);

  voiceActivityBars.forEach((bar, i) => {
    // Create wave-like pattern centered in middle
    const distFromCenter = Math.abs(i - centerIndex);
    const heightFactor = 1 - (distFromCenter / centerIndex) * 0.5;
    const randomFactor = 0.7 + Math.random() * 0.3;
    const height = Math.max(10, amplitude * 100 * heightFactor * randomFactor);
    bar.style.height = `${Math.min(height, 60)}px`;
  });
}

/**
 * Check if it's currently the child's turn
 */
export function isChildsTurn(): boolean {
  return isChildTurn;
}

/**
 * Legacy function - kept for compatibility but simplified
 */
export function updateCalibrationProgress(progress: number): void {
  // No-op - we no longer use progress bars
  // Turn changes are now event-driven via setAiSpeaking/setChildTurn
}

/**
 * Legacy function - kept for compatibility
 */
export function updateCalibrationTimer(remainingMs: number): void {
  // No-op - we no longer show timer
}

/**
 * Show calibration complete state
 */
export function showCalibrationComplete(result: CalibrationResult): void {
  if (!overlayElement) return;

  const container = overlayElement.querySelector('.calibration-container');
  if (container) {
    container.innerHTML = `
      <div class="calibration-complete">
        <div class="calibration-complete-icon">${result.isValid ? '✅' : '⚠️'}</div>
        <h2 class="calibration-complete-title ${result.isValid ? '' : 'calibration-failed-title'}">
          ${result.isValid ? 'All Set!' : 'Setup Complete'}
        </h2>
        <p class="calibration-complete-message">
          ${result.isValid
            ? `Voice calibration successful! Confidence: ${result.confidence}`
            : 'Using default settings. Voice detection may vary.'}
        </p>
      </div>
    `;
  }

  // Auto-hide after delay
  setTimeout(() => {
    hideCalibrationOverlay();
  }, 2500);
}

/**
 * Show calibration failed state
 */
export function showCalibrationFailed(error: string): void {
  if (!overlayElement) return;

  const container = overlayElement.querySelector('.calibration-container');
  if (container) {
    container.innerHTML = `
      <div class="calibration-complete">
        <div class="calibration-complete-icon calibration-failed-icon">⚠️</div>
        <h2 class="calibration-complete-title calibration-failed-title">Setup Skipped</h2>
        <p class="calibration-complete-message">${error || 'Using default settings.'}</p>
      </div>
    `;
  }

  // Auto-hide after delay
  setTimeout(() => {
    hideCalibrationOverlay();
  }, 2000);
}

/**
 * Hide and remove the calibration overlay
 */
export function hideCalibrationOverlay(): void {
  if (overlayElement) {
    overlayElement.classList.add('hidden');
    setTimeout(() => {
      overlayElement?.remove();
      overlayElement = null;
      turnIndicator = null;
      voiceActivityBars = [];
      phaseIcon = null;
      phaseTitle = null;
      phaseInstruction = null;
      phaseDots = [];
      isChildTurn = false;
    }, 300);
  }
}

/**
 * Check if overlay is currently showing
 */
export function isCalibrationOverlayVisible(): boolean {
  return overlayElement !== null && !overlayElement.classList.contains('hidden');
}
