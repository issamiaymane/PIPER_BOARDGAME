/**
 * Session
 * Per-session wrapper around BackendOrchestrator that manages card context and response history
 */

import { BackendOrchestrator } from './BackendOrchestrator.js';
import { Level } from './types.js';
import type { Event, CardContext, SafetyGateResult } from './types.js';
import { logger } from '../../utils/logger.js';
import { ChildAnswerCheck } from './ChildAnswerCheck.js';

// Re-export for backward compatibility
export type { CardContext, SafetyGateResult };

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

  constructor() {
    this.orchestrator = new BackendOrchestrator();
    this.childAnswerCheck = new ChildAnswerCheck();
    this.sessionStartTime = new Date();
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
    console.log(`[Session] 📋 Card set: "${card.question}" - Timers STARTED (retry: 0, task timeout: 60s)`);
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
    let feedbackText = uiPackage.speech.text;
    const safetyLevel = uiPackage.overlay.safetyLevel;
    const choicePrompt = 'What would you like to do?';

    // Stop timers when answer is correct - card will close
    if (isCorrect) {
      this.stopInactivityTimer();
      this.stopTaskTimeoutTimer();
      console.log(`[Session] ⏱️ Timers STOPPED - Correct answer, card closing`);
    } else if (safetyLevel >= Level.YELLOW) {
      // Check if feedback already ends with the choice prompt
      if (!feedbackText.toLowerCase().includes(choicePrompt.toLowerCase())) {
        // Append the choice prompt to the feedback
        feedbackText = feedbackText.trim();
        // Remove trailing punctuation and add the choice prompt
        feedbackText = feedbackText.replace(/[.!?]+$/, '') + '! ' + choicePrompt;
      }

      // Stop BOTH timers when showing choices - child is not expected to answer the card
      // Timers should only restart when child selects "Try again" or a new card is shown
      this.stopInactivityTimer();
      this.stopTaskTimeoutTimer();
      console.log(`[Session] ⏱️ BOTH TIMERS STOPPED - Choices are being shown (YELLOW+ level)`);
    }

    return {
      uiPackage,
      feedbackText,
      choiceMessage: uiPackage.choiceMessage,
      shouldSpeak: true, // Always speak feedback
      interventionRequired: uiPackage.interventions.length > 0,
      isCorrect,
      taskTimeExceeded: false,
      // Additional data for frontend console logging
      childSaid: transcription,
      targetAnswers: this.currentCard.targetAnswers,
      attemptNumber: this.attemptCount,
      responseHistory: [...this.responseHistory]
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
      console.log(`[Session] Sync match failed for "${transcription}", trying AI similarity...`);
      try {
        const aiResult = await this.childAnswerCheck.checkSimilarity(
          transcription,
          targetAnswers[0],
          context
        );
        if (aiResult) {
          console.log(`[Session] AI accepted "${transcription}" as equivalent to "${targetAnswers[0]}"`);
          return true;
        }
      } catch (error) {
        console.log(`[Session] AI similarity check failed, using sync result`);
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

      // Handle common speech recognition variations
      const variations = this.getPhoneticVariations(normalizedTarget);
      if (variations.some(v => normalized.includes(v))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get phonetic variations of a word for fuzzy matching
   */
  private getPhoneticVariations(word: string): string[] {
    const variations: string[] = [word];

    // Common speech recognition substitutions
    const substitutions: Record<string, string[]> = {
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

    if (substitutions[word]) {
      variations.push(...substitutions[word]);
    }

    return variations;
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

    return {
      uiPackage,
      feedbackText: uiPackage.speech.text,
      choiceMessage: uiPackage.choiceMessage,
      shouldSpeak: true,
      interventionRequired: false,
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
    console.log(`\n[Session] ⏱️ ========================================`);
    console.log(`[Session] ⏱️ INACTIVITY TIMER STARTED`);
    console.log(`[Session] ⏱️ Timeout: ${timeoutSeconds} seconds`);
    console.log(`[Session] ⏱️ Will fire at: ${new Date(Date.now() + this.inactivityTimeoutMs).toLocaleTimeString()}`);
    console.log(`[Session] ⏱️ ========================================\n`);

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
      console.log(`[Session] ⏱️ TIMER STOPPED (was waiting: ${this.isWaitingForResponse})`);
    }
    this.isWaitingForResponse = false;
  }

  /**
   * Reset the inactivity timer - call this when child responds
   * This is called automatically by processChildResponse
   */
  resetInactivityTimer(): void {
    if (this.isWaitingForResponse) {
      console.log(`[Session] ⏱️ TIMER RESET - Child responded, restarting countdown`);
      this.startInactivityTimer();
    }
  }

  /**
   * Resume waiting for card response - call this when child selects "Try again"
   * This restarts the inactivity timer after choices were dismissed
   */
  resumeWaitingForResponse(): void {
    console.log(`[Session] ⏱️ RESUME - Child selected retry, waiting for card response again`);
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
    console.log(`[Session] 🎯 Choice selected: ${action}`);

    switch (action) {
      case 'RETRY_CARD':
        // Child wants to try again - restart timer to wait for their answer
        console.log(`[Session] ⏱️ RETRY_CARD - Restarting timer for card response`);
        this.startInactivityTimer();
        break;

      case 'START_BREAK':
        // Child is taking a break - timer stays stopped
        console.log(`[Session] ⏱️ START_BREAK - Timer remains stopped (break time)`);
        this.stopInactivityTimer();
        break;

      case 'SKIP_CARD':
        // Child wants to skip to next card - timer will restart when setCurrentCard() is called
        console.log(`[Session] ⏱️ SKIP_CARD - Timer will restart when new card is shown`);
        this.stopInactivityTimer();
        break;

      case 'BUBBLE_BREATHING':
        // Child is doing bubble breathing - timer stays stopped
        console.log(`[Session] ⏱️ BUBBLE_BREATHING - Timer remains stopped (regulation activity)`);
        this.stopInactivityTimer();
        break;

      case 'CALL_GROWNUP':
        // Adult help requested - session paused, timer stops
        console.log(`[Session] ⏱️ CALL_GROWNUP - Timer stopped (adult intervention)`);
        this.stopInactivityTimer();
        break;

      default:
        // Unknown action - stop timer to be safe
        console.log(`[Session] ⏱️ Unknown action "${action}" - Timer stopped`);
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
    console.log(`[Session] ▶️ Session resumed`);
    if (this.currentCard) {
      console.log(`[Session] ⏱️ Active card exists - restarting timer`);
      this.startInactivityTimer();
    } else {
      console.log(`[Session] ⏱️ No active card - timer not started`);
    }
  }

  /**
   * Handle inactivity - fires CHILD_INACTIVE event through the pipeline
   */
  private async handleInactivity(): Promise<void> {
    if (!this.isWaitingForResponse) {
      console.log(`[Session] ⏱️ Timer fired but not waiting for response - ignoring`);
      return; // Not waiting for response, ignore
    }

    console.log(`\n[Session] ⚠️ ========================================`);
    console.log(`[Session] ⚠️ 🚨 INACTIVITY DETECTED!`);
    console.log(`[Session] ⚠️ Child has not responded for ${this.inactivityTimeoutMs / 1000} seconds`);
    console.log(`[Session] ⚠️ Firing CHILD_INACTIVE event...`);
    console.log(`[Session] ⚠️ ========================================\n`);

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

    // Build result
    const result: SafetyGateResult = {
      uiPackage,
      feedbackText: uiPackage.speech.text,
      choiceMessage: uiPackage.choiceMessage,
      shouldSpeak: true,
      interventionRequired: uiPackage.interventions.length > 0,
      isCorrect: false,
      taskTimeExceeded: false,
      childSaid: '[INACTIVE]',
      targetAnswers: this.currentCard?.targetAnswers,
      attemptNumber: this.attemptCount,
      responseHistory: [...this.responseHistory]
    };

    // Call the callback if registered
    if (this.onInactivityCallback) {
      console.log(`[Session] ⚠️ Calling inactivity callback...`);
      this.onInactivityCallback(result);
    } else {
      console.log(`[Session] ⚠️ No inactivity callback registered`);
    }

    // Only restart timer if NOT showing choices (GREEN level)
    // If YELLOW+ level, choices are shown and child should interact with them, not answer the card
    const safetyLevel = result.uiPackage.overlay.safetyLevel;
    if (safetyLevel >= Level.YELLOW) {
      console.log(`[Session] ⚠️ Timer STOPPED - Choices are being shown (YELLOW+ level)`);
      this.stopInactivityTimer();
    } else {
      console.log(`[Session] ⚠️ Restarting timer for next inactivity check (GREEN level)...`);
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
    console.log(`[Session] ⏱️ TASK TIMEOUT TIMER STARTED: ${seconds}s`);

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
      console.log(`[Session] ⏱️ TASK TIMEOUT TIMER STOPPED`);
    }
  }

  /**
   * Handle task timeout - fires when max_task_time is exceeded
   */
  private async handleTaskTimeout(): Promise<void> {
    console.log(`\n[Session] ⚠️ ========================================`);
    console.log(`[Session] ⚠️ 🚨 TASK TIMEOUT!`);
    console.log(`[Session] ⚠️ Child has exceeded max_task_time for this card`);
    console.log(`[Session] ⚠️ ========================================\n`);

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

    // Build result with taskTimeExceeded flag
    const result: SafetyGateResult = {
      uiPackage,
      feedbackText: "Let's try a different one!",
      choiceMessage: uiPackage.choiceMessage,
      shouldSpeak: true,
      interventionRequired: true,
      isCorrect: false,
      taskTimeExceeded: true,
      childSaid: '[TASK_TIMEOUT]',
      targetAnswers: this.currentCard?.targetAnswers,
      attemptNumber: this.attemptCount,
      responseHistory: [...this.responseHistory]
    };

    console.log(`[Session] ⚠️ TASK TIMEOUT - Card should be skipped`);

    // Call the callback if registered
    if (this.onTaskTimeoutCallback) {
      console.log(`[Session] ⚠️ Calling task timeout callback...`);
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
