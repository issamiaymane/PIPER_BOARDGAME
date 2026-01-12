/**
 * Calibration Overlay Component
 * Full-screen overlay for the pre-session voice calibration flow
 */

import './calibration-overlay.css';
import type { CalibrationPhase, CalibrationResult } from '../../../features/boardgame/services/calibration-types.js';
import { CALIBRATION_PHASES, getPhaseConfig } from '../../../features/boardgame/services/calibration-types.js';

export interface CalibrationOverlayOptions {
  container?: HTMLElement;
  onSkip?: () => void;
}

let overlayElement: HTMLElement | null = null;
let progressBar: HTMLElement | null = null;
let phaseIcon: HTMLElement | null = null;
let phaseTitle: HTMLElement | null = null;
let phaseInstruction: HTMLElement | null = null;
let timerDisplay: HTMLElement | null = null;
let phaseDots: HTMLElement[] = [];

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

      <div class="calibration-progress-bar-container">
        <div class="calibration-progress-bar" id="calibrationProgressBar" style="width: 0%"></div>
      </div>

      <div class="calibration-timer" id="calibrationTimer"></div>

      <div class="calibration-mic-indicator">
        <span class="calibration-mic-icon">🎤</span>
        <span>Listening...</span>
      </div>

      <button class="calibration-skip-button" id="calibrationSkipButton">Skip Setup</button>
    </div>
  `;

  container.appendChild(overlayElement);

  // Cache DOM references
  progressBar = overlayElement.querySelector('#calibrationProgressBar');
  phaseIcon = overlayElement.querySelector('#calibrationPhaseIcon');
  phaseTitle = overlayElement.querySelector('#calibrationPhaseTitle');
  phaseInstruction = overlayElement.querySelector('#calibrationPhaseInstruction');
  timerDisplay = overlayElement.querySelector('#calibrationTimer');
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

  // Reset progress bar
  if (progressBar) {
    progressBar.style.width = '0%';
  }
}

/**
 * Update the progress bar (0-1)
 */
export function updateCalibrationProgress(progress: number): void {
  if (progressBar) {
    progressBar.style.width = `${Math.round(progress * 100)}%`;
  }
}

/**
 * Update the timer display
 */
export function updateCalibrationTimer(remainingMs: number): void {
  if (timerDisplay) {
    const seconds = Math.ceil(remainingMs / 1000);
    timerDisplay.textContent = `${seconds}s remaining`;
  }
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
      progressBar = null;
      phaseIcon = null;
      phaseTitle = null;
      phaseInstruction = null;
      timerDisplay = null;
      phaseDots = [];
    }, 300);
  }
}

/**
 * Check if overlay is currently showing
 */
export function isCalibrationOverlayVisible(): boolean {
  return overlayElement !== null && !overlayElement.classList.contains('hidden');
}
