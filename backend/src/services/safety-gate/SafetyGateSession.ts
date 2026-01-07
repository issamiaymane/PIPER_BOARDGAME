/**
 * SafetyGateSession
 * Per-session wrapper around BackendOrchestrator that manages card context and response history
 */

import { BackendOrchestrator, UIPackage } from './BackendOrchestrator.js';
import { ChildEvent, ChildState, SafetyGateLevel } from './types.js';
import { logger, safetyGateLogger, SafetyGateLogData } from '../../utils/logger.js';

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
}

export class SafetyGateSession {
  private orchestrator: BackendOrchestrator;
  private currentCard: CardContext | null = null;
  private attemptCount: number = 0;
  private responseHistory: string[] = [];
  private sessionStartTime: Date;

  constructor() {
    this.orchestrator = new BackendOrchestrator();
    this.sessionStartTime = new Date();
  }

  /**
   * Set the current card context for answer evaluation
   * Note: attemptCount and responseHistory persist across cards for full session tracking
   */
  setCurrentCard(card: CardContext): void {
    this.currentCard = card;
    // Don't reset attemptCount or responseHistory - they persist across all cards
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
   */
  async processChildResponse(transcription: string): Promise<SafetyGateResult> {
    if (!this.currentCard) {
      logger.warn('SafetyGateSession: No card context set, using default processing');
      return this.generateDefaultResult(transcription);
    }

    this.attemptCount++;
    this.responseHistory.push(transcription);

    // Evaluate if the answer is correct
    const isCorrect = this.evaluateAnswer(transcription, this.currentCard.targetAnswers);

    // Build the child event for the orchestrator
    const event: ChildEvent = {
      type: 'CHILD_RESPONSE',
      correct: isCorrect,
      response: transcription,
      previousResponse: this.responseHistory[this.responseHistory.length - 2],
      previousPreviousResponse: this.responseHistory[this.responseHistory.length - 3]
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
    const uiPackage = await this.orchestrator.processChildEvent(event, taskContext);

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
      choices: uiPackage.choices.map(c => ({ icon: c.icon, label: c.label, action: c.action })),
      feedback: feedbackText,
      attemptNumber: this.attemptCount,
      responseHistory: this.responseHistory,
      shouldSpeak: true // Always speak feedback
    };

    safetyGateLogger.logSessionState(logData);

    if (safetyLevel >= SafetyGateLevel.YELLOW && !isCorrect) {
      // Check if feedback already ends with the choice prompt
      if (!feedbackText.toLowerCase().includes(choicePrompt.toLowerCase())) {
        // Append the choice prompt to the feedback
        feedbackText = feedbackText.trim();
        // Remove trailing punctuation and add the choice prompt
        feedbackText = feedbackText.replace(/[.!?]+$/, '') + '! ' + choicePrompt;
      }
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
   * Uses fuzzy matching to account for speech recognition variations
   */
  private evaluateAnswer(transcription: string, targetAnswers: string[]): boolean {
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
    const event: ChildEvent = {
      type: 'CHILD_RESPONSE',
      correct: true, // Default to positive
      response: transcription
    };

    const uiPackage = await this.orchestrator.processChildEvent(event);

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
}
