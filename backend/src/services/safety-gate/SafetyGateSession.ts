/**
 * SafetyGateSession
 * Per-session wrapper around BackendOrchestrator that manages card context and response history
 */

import { BackendOrchestrator, UIPackage } from './BackendOrchestrator.js';
import { Event, Level } from './types.js';
import { logger, safetyGateLogger, SafetyGateLogData } from '../../utils/logger.js';
import { AdjectiveSimilarityService } from './AdjectiveSimilarityService.js';

export interface CardContext {
  category: string;
  question: string;
  targetAnswers: string[];
  images: Array<{ image: string; label: string }>;
}

export interface SafetyGateResult {
  uiPackage: UIPackage;
  feedbackText: string;
  choiceMessage: string;
  shouldSpeak: boolean;
  interventionRequired: boolean;
  isCorrect: boolean;
  // Additional data for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

export class SafetyGateSession {
  private orchestrator: BackendOrchestrator;
  private similarityService: AdjectiveSimilarityService;
  private currentCard: CardContext | null = null;
  private attemptCount: number = 0;
  private responseHistory: string[] = [];
  private sessionStartTime: Date;

  // Inactivity detection
  private inactivityTimeoutMs: number = 30000; // 30 seconds
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private onInactivityCallback: ((result: SafetyGateResult) => void) | null = null;
  private isWaitingForResponse: boolean = false;

  constructor() {
    this.orchestrator = new BackendOrchestrator();
    this.similarityService = new AdjectiveSimilarityService();
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

    // Start inactivity timer - we're now waiting for child to respond to this card
    this.startInactivityTimer();
    console.log(`[SafetyGateSession] 📋 Card set: "${card.question}" - Timer STARTED`);
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
   * @param options Additional options like audio-based screaming detection
   */
  async processChildResponse(
    transcription: string,
    options?: { screamingDetected?: boolean }
  ): Promise<SafetyGateResult> {
    // Reset inactivity timer - child responded
    this.resetInactivityTimer();

    if (!this.currentCard) {
      logger.warn('SafetyGateSession: No card context set, using default processing');
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
    // If screaming was detected via audio amplitude, include it in the signal field
    const screamingSignal = options?.screamingDetected ? 'screaming_detected_audio' : undefined;

    // Debug: Log when audio-based screaming is detected
    if (screamingSignal) {
      console.log(`[SafetyGateSession] 🎤 Audio-based SCREAMING signal added to event`);
    }

    const event: Event = {
      type: 'CHILD_RESPONSE',
      correct: isCorrect,
      response: transcription,
      previousResponse: this.responseHistory[this.responseHistory.length - 2],
      previousPreviousResponse: this.responseHistory[this.responseHistory.length - 3],
      signal: screamingSignal
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

    // Post-process feedback: ensure "What would you like to do?" is appended for YELLOW+ levels
    let feedbackText = uiPackage.speech.text;
    const safetyLevel = uiPackage.admin_overlay.safety_level;
    const choicePrompt = 'What would you like to do?';

    // Log formatted safety-gate state
    const logData: SafetyGateLogData = {
      childSaid: transcription,
      targetAnswers: this.currentCard.targetAnswers,
      isCorrect,
      safetyLevel: safetyLevel,
      signals: uiPackage.admin_overlay.signals_detected,
      interventions: uiPackage.admin_overlay.interventions_list,
      state: {
        engagement: uiPackage.admin_overlay.state_snapshot.engagementLevel,
        dysregulation: uiPackage.admin_overlay.state_snapshot.dysregulationLevel,
        fatigue: uiPackage.admin_overlay.state_snapshot.fatigueLevel,
        consecutiveErrors: uiPackage.admin_overlay.state_snapshot.consecutiveErrors,
        timeInSession: uiPackage.admin_overlay.state_snapshot.timeInSession
      },
      feedback: feedbackText,
      attemptNumber: this.attemptCount,
      responseHistory: this.responseHistory,
      shouldSpeak: true // Always speak feedback
    };

    safetyGateLogger.logSessionState(logData);

    // Stop timer when answer is correct - card will close and move to next step
    if (isCorrect) {
      this.stopInactivityTimer();
      console.log(`[SafetyGateSession] ⏱️ Timer STOPPED - Correct answer, card closing`);
    } else if (safetyLevel >= Level.YELLOW) {
      // Check if feedback already ends with the choice prompt
      if (!feedbackText.toLowerCase().includes(choicePrompt.toLowerCase())) {
        // Append the choice prompt to the feedback
        feedbackText = feedbackText.trim();
        // Remove trailing punctuation and add the choice prompt
        feedbackText = feedbackText.replace(/[.!?]+$/, '') + '! ' + choicePrompt;
      }

      // Stop inactivity timer when showing choices - child is not expected to answer the card
      // Timer should only restart when child selects "Try again" or a new card is shown
      this.stopInactivityTimer();
      console.log(`[SafetyGateSession] ⏱️ Timer STOPPED - Choices are being shown (YELLOW+ level)`);
    }

    return {
      uiPackage,
      feedbackText,
      choiceMessage: uiPackage.choice_message,
      shouldSpeak: true, // Always speak feedback
      interventionRequired: uiPackage.admin_overlay.interventions_active > 0,
      isCorrect,
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
      console.log(`[SafetyGateSession] Sync match failed for "${transcription}", trying AI similarity...`);
      try {
        const aiResult = await this.similarityService.checkSimilarity(
          transcription,
          targetAnswers[0],
          context
        );
        if (aiResult) {
          console.log(`[SafetyGateSession] AI accepted "${transcription}" as equivalent to "${targetAnswers[0]}"`);
          return true;
        }
      } catch (error) {
        console.log(`[SafetyGateSession] AI similarity check failed, using sync result`);
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
      choiceMessage: uiPackage.choice_message,
      shouldSpeak: true,
      interventionRequired: false,
      isCorrect: true
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
    console.log(`\n[SafetyGateSession] ⏱️ ========================================`);
    console.log(`[SafetyGateSession] ⏱️ INACTIVITY TIMER STARTED`);
    console.log(`[SafetyGateSession] ⏱️ Timeout: ${timeoutSeconds} seconds`);
    console.log(`[SafetyGateSession] ⏱️ Will fire at: ${new Date(Date.now() + this.inactivityTimeoutMs).toLocaleTimeString()}`);
    console.log(`[SafetyGateSession] ⏱️ ========================================\n`);

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
      console.log(`[SafetyGateSession] ⏱️ TIMER STOPPED (was waiting: ${this.isWaitingForResponse})`);
    }
    this.isWaitingForResponse = false;
  }

  /**
   * Reset the inactivity timer - call this when child responds
   * This is called automatically by processChildResponse
   */
  resetInactivityTimer(): void {
    if (this.isWaitingForResponse) {
      console.log(`[SafetyGateSession] ⏱️ TIMER RESET - Child responded, restarting countdown`);
      this.startInactivityTimer();
    }
  }

  /**
   * Resume waiting for card response - call this when child selects "Try again"
   * This restarts the inactivity timer after choices were dismissed
   */
  resumeWaitingForResponse(): void {
    console.log(`[SafetyGateSession] ⏱️ RESUME - Child selected retry, waiting for card response again`);
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
    console.log(`[SafetyGateSession] 🎯 Choice selected: ${action}`);

    switch (action) {
      case 'RETRY_CARD':
        // Child wants to try again - restart timer to wait for their answer
        console.log(`[SafetyGateSession] ⏱️ RETRY_CARD - Restarting timer for card response`);
        this.startInactivityTimer();
        break;

      case 'START_BREAK':
        // Child is taking a break - timer stays stopped
        console.log(`[SafetyGateSession] ⏱️ START_BREAK - Timer remains stopped (break time)`);
        this.stopInactivityTimer();
        break;

      case 'SKIP_CARD':
        // Child wants to skip to next card - timer will restart when setCurrentCard() is called
        console.log(`[SafetyGateSession] ⏱️ SKIP_CARD - Timer will restart when new card is shown`);
        this.stopInactivityTimer();
        break;

      case 'BUBBLE_BREATHING':
        // Child is doing bubble breathing - timer stays stopped
        console.log(`[SafetyGateSession] ⏱️ BUBBLE_BREATHING - Timer remains stopped (regulation activity)`);
        this.stopInactivityTimer();
        break;

      case 'CALL_GROWNUP':
        // Adult help requested - session paused, timer stops
        console.log(`[SafetyGateSession] ⏱️ CALL_GROWNUP - Timer stopped (adult intervention)`);
        this.stopInactivityTimer();
        break;

      default:
        // Unknown action - stop timer to be safe
        console.log(`[SafetyGateSession] ⏱️ Unknown action "${action}" - Timer stopped`);
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
    console.log(`[SafetyGateSession] ▶️ Session resumed`);
    if (this.currentCard) {
      console.log(`[SafetyGateSession] ⏱️ Active card exists - restarting timer`);
      this.startInactivityTimer();
    } else {
      console.log(`[SafetyGateSession] ⏱️ No active card - timer not started`);
    }
  }

  /**
   * Handle inactivity - fires CHILD_INACTIVE event through the pipeline
   */
  private async handleInactivity(): Promise<void> {
    if (!this.isWaitingForResponse) {
      console.log(`[SafetyGateSession] ⏱️ Timer fired but not waiting for response - ignoring`);
      return; // Not waiting for response, ignore
    }

    console.log(`\n[SafetyGateSession] ⚠️ ========================================`);
    console.log(`[SafetyGateSession] ⚠️ 🚨 INACTIVITY DETECTED!`);
    console.log(`[SafetyGateSession] ⚠️ Child has not responded for ${this.inactivityTimeoutMs / 1000} seconds`);
    console.log(`[SafetyGateSession] ⚠️ Firing CHILD_INACTIVE event...`);
    console.log(`[SafetyGateSession] ⚠️ ========================================\n`);

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

    // Log the inactivity event
    const logData: SafetyGateLogData = {
      childSaid: '[NO RESPONSE - INACTIVE]',
      targetAnswers: this.currentCard?.targetAnswers || [],
      isCorrect: false,
      safetyLevel: uiPackage.admin_overlay.safety_level,
      signals: uiPackage.admin_overlay.signals_detected,
      interventions: uiPackage.admin_overlay.interventions_list,
      state: {
        engagement: uiPackage.admin_overlay.state_snapshot.engagementLevel,
        dysregulation: uiPackage.admin_overlay.state_snapshot.dysregulationLevel,
        fatigue: uiPackage.admin_overlay.state_snapshot.fatigueLevel,
        consecutiveErrors: uiPackage.admin_overlay.state_snapshot.consecutiveErrors,
        timeInSession: uiPackage.admin_overlay.state_snapshot.timeInSession
      },
      feedback: uiPackage.speech.text,
      attemptNumber: this.attemptCount,
      responseHistory: this.responseHistory,
      shouldSpeak: true
    };

    safetyGateLogger.logSessionState(logData);

    // Build result
    const result: SafetyGateResult = {
      uiPackage,
      feedbackText: uiPackage.speech.text,
      choiceMessage: uiPackage.choice_message,
      shouldSpeak: true,
      interventionRequired: uiPackage.admin_overlay.interventions_active > 0,
      isCorrect: false,
      childSaid: '[INACTIVE]',
      targetAnswers: this.currentCard?.targetAnswers,
      attemptNumber: this.attemptCount,
      responseHistory: [...this.responseHistory]
    };

    // Log the state changes from inactivity
    console.log(`[SafetyGateSession] ⚠️ INACTIVITY RESULT:`);
    console.log(`[SafetyGateSession] ⚠️   Engagement: ${result.uiPackage.admin_overlay.state_snapshot.engagementLevel.toFixed(1)}`);
    console.log(`[SafetyGateSession] ⚠️   Safety Level: ${['GREEN', 'YELLOW', 'ORANGE', 'RED'][result.uiPackage.admin_overlay.safety_level]}`);
    console.log(`[SafetyGateSession] ⚠️   Signals: ${result.uiPackage.admin_overlay.signals_detected.join(', ') || 'none'}`);
    console.log(`[SafetyGateSession] ⚠️   Feedback: "${result.feedbackText}"`);

    // Call the callback if registered
    if (this.onInactivityCallback) {
      console.log(`[SafetyGateSession] ⚠️ Calling inactivity callback...`);
      this.onInactivityCallback(result);
    } else {
      console.log(`[SafetyGateSession] ⚠️ No inactivity callback registered`);
    }

    // Only restart timer if NOT showing choices (GREEN level)
    // If YELLOW+ level, choices are shown and child should interact with them, not answer the card
    const safetyLevel = result.uiPackage.admin_overlay.safety_level;
    if (safetyLevel >= Level.YELLOW) {
      console.log(`[SafetyGateSession] ⚠️ Timer STOPPED - Choices are being shown (YELLOW+ level)`);
      this.stopInactivityTimer();
    } else {
      console.log(`[SafetyGateSession] ⚠️ Restarting timer for next inactivity check (GREEN level)...`);
      this.startInactivityTimer();
    }
  }

  /**
   * Check if currently waiting for a response
   */
  isWaitingForChildResponse(): boolean {
    return this.isWaitingForResponse;
  }
}
