/**
 * Session
 * Per-session wrapper around BackendOrchestrator that manages card context and response history
 */

import { BackendOrchestrator } from './BackendOrchestrator.js';
import { Level } from '../../types/safety-gate.js';
import type { Event, CardContext, SafetyGateResult } from '../../types/safety-gate.js';
import { logger } from '../../utils/logger.js';
import { ChildAnswerCheck } from './ChildAnswerCheck.js';

// Re-export for backward compatibility
export type { CardContext, SafetyGateResult };

// ============================================
// PHONETIC VARIATIONS
// Common speech recognition substitutions for fuzzy matching
// ============================================

const phoneticVariations: Record<string, string[]> = {
  'cold': ['called', 'coal'],
  'hot': ['hat', 'hut'],
  'big': ['beg', 'bag'],
  'small': ['smell', 'mall'],
  'fast': ['fist', 'fest'],
  'slow': ['slew'],
  'happy': ['happy'],
  'sad': ['said', 'sat'],
  'tall': ['toll', 'tale'],
  'short': ['shirt', 'shot'],
  'light': ['lite', 'lit'],
  'dark': ['dock', 'dork'],
  'hard': ['heart'],
  'soft': ['sought'],
  'clean': ['clene'],
  'dirty': ['thirty'],
  'new': ['knew', 'nu'],
  'old': ['owed'],
  'wet': ['what'],
  'dry': ['dri', 'try'],
  'full': ['fool'],
  'empty': ['empti'],
  'loud': ['allowed'],
  'quiet': ['quite'],
  'heavy': ['heave'],
  'open': ['opened'],
  'closed': ['close'],
  'up': ['up'],
  'down': ['downed'],
  'good': ['could', 'wood'],
  'bad': ['bed', 'bat']
};

function getPhoneticVariations(word: string): string[] {
  const normalizedWord = word.toLowerCase().trim();
  const variations = [normalizedWord];
  if (phoneticVariations[normalizedWord]) {
    variations.push(...phoneticVariations[normalizedWord]);
  }
  return variations;
}

export class Session {
  private orchestrator: BackendOrchestrator;
  private childAnswerCheck: ChildAnswerCheck;
  private currentCard: CardContext | null = null;
  private attemptCount: number = 0;
  private responseHistory: string[] = [];
  private sessionStartTime: Date;

  // Per-card tracking (reset when card changes)
  private cardStartTime: Date | null = null;

  // Task timeout (max_task_time)
  private taskTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private onTaskTimeoutCallback: ((result: SafetyGateResult) => void) | null = null;

  // Inactivity detection (adapts based on safety level)
  // GREEN=30s, YELLOW=25s, ORANGE=20s, RED=15s
  private inactivityTimeoutMs: number = 30000; // Default 30s (GREEN level)
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private onInactivityCallback: ((result: SafetyGateResult) => void) | null = null;
  private isWaitingForResponse: boolean = false;

  /**
   * Create a new Session with optional dependency injection for testing
   * @param orchestrator Optional BackendOrchestrator instance (defaults to new instance)
   * @param childAnswerCheck Optional ChildAnswerCheck instance (defaults to new instance)
   */
  constructor(
    orchestrator: BackendOrchestrator = new BackendOrchestrator(),
    childAnswerCheck: ChildAnswerCheck = new ChildAnswerCheck()
  ) {
    this.orchestrator = orchestrator;
    this.childAnswerCheck = childAnswerCheck;
    this.sessionStartTime = new Date();
  }

  /**
   * Populate logging data in UIPackage (single source of truth)
   */
  private populateLoggingData(uiPackage: { childSaid?: string; targetAnswers?: string[]; attemptNumber?: number; responseHistory?: string[] }, childSaid: string): void {
    uiPackage.childSaid = childSaid;
    uiPackage.targetAnswers = this.currentCard?.targetAnswers;
    uiPackage.attemptNumber = this.attemptCount;
    uiPackage.responseHistory = [...this.responseHistory];
  }

  /**
   * Set the current card context for answer evaluation
   * Note: attemptCount and responseHistory persist across cards for full session tracking
   * This also starts the inactivity timer since we're now waiting for the child's response
   */
  setCurrentCard(card: CardContext): void {
    this.currentCard = card;
    // Don't reset attemptCount or responseHistory - they persist across all cards

    // Reset per-card tracking
    this.cardStartTime = new Date();

    // Start task timeout timer (default 60s, will be checked against actual config on response)
    this.startTaskTimeoutTimer(60);

    // Start inactivity timer - we're now waiting for child to respond to this card
    this.startInactivityTimer();
    logger.debug(`Session: Card set "${card.question}" - Timers STARTED`);
  }

  /**
   * Get the current card context
   */
  getCurrentCard(): CardContext | null {
    return this.currentCard;
  }

  /**
   * Check if a card context is currently active
   */
  hasActiveCard(): boolean {
    return this.currentCard !== null;
  }

  /**
   * Process a child's spoken response through the safety-gate pipeline
   * @param transcription The child's transcribed speech
   * @param options Pre-detected signals from voice layer (screaming, crying, etc.)
   */
  async processChildResponse(
    transcription: string,
    options?: { screaming?: boolean; crying?: boolean; prolongedSilence?: boolean }
  ): Promise<SafetyGateResult> {
    // Reset inactivity timer - child responded
    this.resetInactivityTimer();

    if (!this.currentCard) {
      logger.warn('Session: No card context set, using default processing');
      return this.generateDefaultResult(transcription);
    }

    this.attemptCount++;
    this.responseHistory.push(transcription);

    // Evaluate if the answer is correct
    const isCorrect = await this.evaluateAnswer(
      transcription,
      this.currentCard.targetAnswers,
      { category: this.currentCard.category, question: this.currentCard.question }
    );

    // Build the child event for the orchestrator
    // Pass pre-detected signals from voice layer
    const signals = (options?.screaming || options?.crying || options?.prolongedSilence)
      ? {
          screaming: options?.screaming,
          crying: options?.crying,
          prolongedSilence: options?.prolongedSilence
        }
      : undefined;

    const event: Event = {
      type: 'CHILD_RESPONSE',
      correct: isCorrect,
      response: transcription,
      previousResponse: this.responseHistory[this.responseHistory.length - 2],
      previousPreviousResponse: this.responseHistory[this.responseHistory.length - 3],
      signals
    };

    // Build task context for the orchestrator
    const taskContext = {
      cardType: 'single-answer',
      category: this.currentCard.category,
      question: this.currentCard.question,
      targetAnswer: this.currentCard.targetAnswers.join(', '),
      imageLabels: this.currentCard.images.map(img => img.label)
    };

    // Process through the full safety-gate pipeline with task context
    const uiPackage = await this.orchestrator.processEvent(event, taskContext);

    // Update inactivity timeout based on current safety level
    // This adapts the check-in frequency: GREEN=30s, YELLOW=25s, ORANGE=20s, RED=15s
    this.inactivityTimeoutMs = uiPackage.sessionConfig.inactivityTimeout * 1000;

    // Post-process feedback: ensure "What would you like to do?" is appended for YELLOW+ levels
    const safetyLevel = uiPackage.overlay.safetyLevel;
    const choicePrompt = 'What would you like to do?';

    // Stop timers when answer is correct - card will close
    if (isCorrect) {
      this.stopInactivityTimer();
      this.stopTaskTimeoutTimer();
      logger.debug('Session: Timers STOPPED - Correct answer');
    } else if (safetyLevel >= Level.YELLOW) {
      // Check if feedback already ends with the choice prompt
      if (!uiPackage.speech.text.toLowerCase().includes(choicePrompt.toLowerCase())) {
        // Append the choice prompt to the feedback (modify UIPackage directly)
        uiPackage.speech.text = uiPackage.speech.text.trim().replace(/[.!?]+$/, '') + '! ' + choicePrompt;
      }

      // Stop BOTH timers when showing choices - child is not expected to answer the card
      // Timers should only restart when child selects "Try again" or a new card is shown
      this.stopInactivityTimer();
      this.stopTaskTimeoutTimer();
      logger.debug('Session: Timers STOPPED - Choices shown (YELLOW+ level)');
    }

    this.populateLoggingData(uiPackage, transcription);

    return {
      uiPackage,
      shouldSpeak: true, // Always speak feedback
      isCorrect,
      taskTimeExceeded: false
    };
  }

  /**
   * Evaluate if the child's response matches the target answer
   * Uses fuzzy matching first, then AI similarity for adjective categories
   */
  private async evaluateAnswer(
    transcription: string,
    targetAnswers: string[],
    context?: { category: string; question: string }
  ): Promise<boolean> {
    // Step 1: Try sync checks first (fast path)
    if (this.evaluateAnswerSync(transcription, targetAnswers)) {
      return true;
    }

    // Step 2: For adjective/opposite categories only, try AI similarity
    const aiCategories = [
      'Adjectives - Opposites',
      'Descriptive Words - Opposites',
      'Antonyms',
      'Antonym Name One - Middle',
      'Synonym Name One - Elementary',
      'Synonym-Name One - Middle',
      'Synonyms Level 1'
    ];

    if (context?.category && aiCategories.includes(context.category)) {
      logger.debug(`Session: Sync match failed for "${transcription}", trying AI similarity`);
      try {
        const aiResult = await this.childAnswerCheck.checkSimilarity(
          transcription,
          targetAnswers[0],
          context
        );
        if (aiResult) {
          logger.debug(`Session: AI accepted "${transcription}" as equivalent to "${targetAnswers[0]}"`);
          return true;
        }
      } catch (error) {
        logger.debug('Session: AI similarity check failed, using sync result');
      }
    }

    return false;
  }

  /**
   * Synchronous answer evaluation using exact/fuzzy matching
   * Uses fuzzy matching to account for speech recognition variations
   */
  private evaluateAnswerSync(transcription: string, targetAnswers: string[]): boolean {
    const normalized = transcription.toLowerCase().trim();

    // Check for exact or partial match
    for (const target of targetAnswers) {
      const normalizedTarget = target.toLowerCase().trim();

      // Exact match
      if (normalized === normalizedTarget) {
        return true;
      }

      // Contains match (child says "cold" or "it's cold" or "cold!")
      if (normalized.includes(normalizedTarget)) {
        return true;
      }

      // Target contains response (handles "the cold" matching "cold")
      if (normalizedTarget.includes(normalized) && normalized.length >= 3) {
        return true;
      }

      // Handle common speech recognition variations (from external config)
      const variations = getPhoneticVariations(normalizedTarget);
      if (variations.some(v => normalized.includes(v))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate a default result when no card context is set
   */
  private async generateDefaultResult(transcription: string): Promise<SafetyGateResult> {
    const event: Event = {
      type: 'CHILD_RESPONSE',
      correct: true, // Default to positive
      response: transcription
    };

    const uiPackage = await this.orchestrator.processEvent(event);

    // Populate logging data in UIPackage
    uiPackage.childSaid = transcription;

    return {
      uiPackage,
      shouldSpeak: true,
      isCorrect: true,
      taskTimeExceeded: false
    };
  }

  /**
   * Reset the session for a new card
   */
  resetForNewCard(): void {
    this.currentCard = null;
    this.attemptCount = 0;
    this.responseHistory = [];
  }

  /**
   * Get the current attempt count
   */
  getAttemptCount(): number {
    return this.attemptCount;
  }

  /**
   * Get the response history for the current card
   */
  getResponseHistory(): string[] {
    return [...this.responseHistory];
  }

  /**
   * Get the session duration in seconds
   */
  getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
  }

  // ============================================
  // INACTIVITY DETECTION
  // ============================================

  /**
   * Set the callback to be called when inactivity is detected
   * @param callback Function to call with the SafetyGateResult when child is inactive
   */
  setInactivityCallback(callback: (result: SafetyGateResult) => void): void {
    this.onInactivityCallback = callback;
  }

  /**
   * Set custom inactivity timeout (default is 30 seconds)
   * @param ms Timeout in milliseconds
   */
  setInactivityTimeout(ms: number): void {
    this.inactivityTimeoutMs = ms;
  }

  /**
   * Start the inactivity timer - call this when waiting for child response
   * (e.g., after showing a card or after giving feedback)
   */
  startInactivityTimer(): void {
    this.stopInactivityTimer(); // Clear any existing timer
    this.isWaitingForResponse = true;

    const timeoutSeconds = this.inactivityTimeoutMs / 1000;
    logger.debug(`Session: Inactivity timer STARTED (${timeoutSeconds}s)`);

    this.inactivityTimer = setTimeout(() => {
      this.handleInactivity();
    }, this.inactivityTimeoutMs);
  }

  /**
   * Stop the inactivity timer - call this when session ends or pauses
   */
  stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
      logger.debug(`Session: Inactivity timer STOPPED`);
    }
    this.isWaitingForResponse = false;
  }

  /**
   * Reset the inactivity timer - call this when child responds
   * This is called automatically by processChildResponse
   */
  resetInactivityTimer(): void {
    if (this.isWaitingForResponse) {
      logger.debug('Session: Timer RESET - Child responded');
      this.startInactivityTimer();
    }
  }

  /**
   * Resume waiting for card response - call this when child selects "Try again"
   * This restarts the inactivity timer after choices were dismissed
   */
  resumeWaitingForResponse(): void {
    logger.debug('Session: Timer RESUMED - Child selected retry');
    this.startInactivityTimer();
  }

  /**
   * Handle when a choice is selected from the choices modal
   * This manages the inactivity timer appropriately for each choice type:
   *
   * - retry: Restart timer (child will answer the card)
   * - trigger_break: Stop timer (session paused for break)
   * - allow_skip: Timer starts when new card is set via setCurrentCard()
   * - bubble_breathing: Stop timer (doing bubble breathing)
   * - call_grownup: Stop timer (session paused for adult intervention)
   *
   * @param action The choice action string
   */
  handleChoiceSelection(action: string): void {
    logger.debug(`Session: Choice selected - ${action}`);

    switch (action) {
      case 'RETRY_CARD':
        // Child wants to try again - restart timer to wait for their answer
        this.startInactivityTimer();
        break;

      case 'START_BREAK':
        // Child is taking a break - timer stays stopped
        this.stopInactivityTimer();
        break;

      case 'SKIP_CARD':
        // Child wants to skip to next card - timer will restart when setCurrentCard() is called
        this.stopInactivityTimer();
        break;

      case 'BUBBLE_BREATHING':
        // Child is doing bubble breathing - timer stays stopped
        this.stopInactivityTimer();
        break;

      case 'CALL_GROWNUP':
        // Adult help requested - session paused, timer stops
        this.stopInactivityTimer();
        break;

      default:
        // Unknown action - stop timer to be safe
        logger.warn(`Session: Unknown action "${action}" - Timer stopped`);
        this.stopInactivityTimer();
        break;
    }
  }

  /**
   * Resume session after a break or regulation activity
   * Call this when returning to normal card flow after:
   * - Break ends
   * - Bubble breathing ends
   * - Adult intervention resolved
   *
   * This will restart the inactivity timer if there's an active card
   */
  resumeSession(): void {
    logger.debug('Session: Session resumed');
    if (this.currentCard) {
      this.startInactivityTimer();
    }
  }

  /**
   * Handle inactivity - fires CHILD_INACTIVE event through the pipeline
   */
  private async handleInactivity(): Promise<void> {
    if (!this.isWaitingForResponse) {
      return; // Not waiting for response, ignore
    }

    logger.info(`Session: INACTIVITY DETECTED after ${this.inactivityTimeoutMs / 1000}s - firing CHILD_INACTIVE event`);

    // Build CHILD_INACTIVE event
    const event: Event = {
      type: 'CHILD_INACTIVE',
      correct: false,
      response: undefined,
      previousResponse: this.responseHistory[this.responseHistory.length - 1],
      previousPreviousResponse: this.responseHistory[this.responseHistory.length - 2]
    };

    // Build task context if we have a current card
    const taskContext = this.currentCard ? {
      cardType: 'single-answer',
      category: this.currentCard.category,
      question: this.currentCard.question,
      targetAnswer: this.currentCard.targetAnswers.join(', '),
      imageLabels: this.currentCard.images.map(img => img.label)
    } : undefined;

    // Process through safety-gate pipeline
    const uiPackage = await this.orchestrator.processEvent(event, taskContext);

    // Update inactivity timeout based on current safety level
    this.inactivityTimeoutMs = uiPackage.sessionConfig.inactivityTimeout * 1000;

    this.populateLoggingData(uiPackage, '[INACTIVE]');

    // Build result
    const result: SafetyGateResult = {
      uiPackage,
      shouldSpeak: true,
      isCorrect: false,
      taskTimeExceeded: false
    };

    // Call the callback if registered
    if (this.onInactivityCallback) {
      this.onInactivityCallback(result);
    } else {
      logger.warn('Session: No inactivity callback registered');
    }

    // Only restart timer if NOT showing choices (GREEN level)
    // If YELLOW+ level, choices are shown and child should interact with them, not answer the card
    const safetyLevel = result.uiPackage.overlay.safetyLevel;
    if (safetyLevel >= Level.YELLOW) {
      this.stopInactivityTimer();
    } else {
      this.startInactivityTimer();
    }
  }

  /**
   * Check if currently waiting for a response
   */
  isWaitingForChildResponse(): boolean {
    return this.isWaitingForResponse;
  }

  // ============================================
  // TASK TIMEOUT (max_task_time)
  // ============================================

  /**
   * Set the callback to be called when task timeout is reached
   * @param callback Function to call with the SafetyGateResult when task times out
   */
  setTaskTimeoutCallback(callback: (result: SafetyGateResult) => void): void {
    this.onTaskTimeoutCallback = callback;
  }

  /**
   * Start the task timeout timer for the current card
   * @param seconds Timeout in seconds (from SessionConfig.max_task_time)
   */
  private startTaskTimeoutTimer(seconds: number): void {
    this.stopTaskTimeoutTimer(); // Clear any existing timer

    const timeoutMs = seconds * 1000;
    logger.debug(`Session: Task timeout timer STARTED (${seconds}s)`);

    this.taskTimeoutTimer = setTimeout(() => {
      this.handleTaskTimeout();
    }, timeoutMs);
  }

  /**
   * Stop the task timeout timer
   */
  private stopTaskTimeoutTimer(): void {
    if (this.taskTimeoutTimer) {
      clearTimeout(this.taskTimeoutTimer);
      this.taskTimeoutTimer = null;
      logger.debug('Session: Task timeout timer STOPPED');
    }
  }

  /**
   * Handle task timeout - fires when max_task_time is exceeded
   */
  private async handleTaskTimeout(): Promise<void> {
    logger.info('Session: TASK TIMEOUT - max_task_time exceeded');

    // Stop inactivity timer as well
    this.stopInactivityTimer();

    // Build task context if we have a current card
    const taskContext = this.currentCard ? {
      cardType: 'single-answer',
      category: this.currentCard.category,
      question: this.currentCard.question,
      targetAnswer: this.currentCard.targetAnswers.join(', '),
      imageLabels: this.currentCard.images.map(img => img.label)
    } : undefined;

    // Process through safety-gate pipeline as an error event
    const event: Event = {
      type: 'CHILD_RESPONSE',
      correct: false,
      response: '[TASK_TIMEOUT]',
      previousResponse: this.responseHistory[this.responseHistory.length - 1],
      previousPreviousResponse: this.responseHistory[this.responseHistory.length - 2]
    };

    const uiPackage = await this.orchestrator.processEvent(event, taskContext);

    // Override speech text for task timeout (custom message)
    uiPackage.speech.text = "Let's try a different one!";

    this.populateLoggingData(uiPackage, '[TASK_TIMEOUT]');

    // Build result with taskTimeExceeded flag
    const result: SafetyGateResult = {
      uiPackage,
      shouldSpeak: true,
      isCorrect: false,
      taskTimeExceeded: true
    };

    // Call the callback if registered
    if (this.onTaskTimeoutCallback) {
      this.onTaskTimeoutCallback(result);
    }
  }

  /**
   * Get elapsed time on current card in seconds
   */
  getCardElapsedTime(): number {
    if (!this.cardStartTime) return 0;
    return Math.floor((Date.now() - this.cardStartTime.getTime()) / 1000);
  }
}
