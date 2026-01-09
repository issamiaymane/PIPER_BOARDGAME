// ═══════════════════════════════════════════════════════════════════════════
// BACKEND ORCHESTRATOR
// Main pipeline: Event → Signals → State → Level → Interventions → Config → LLM → Output
// ═══════════════════════════════════════════════════════════════════════════

import { Level, Intervention } from '../../types/safety-gate.js';
import type {
  State,
  Event,
  SessionConfig,
  BackendResponse,
  UIPackage,
  TaskContext,
  LLMGeneration,
  SessionState,
  ResponseContext,
  ResponseConstraints,
  ResponseReasoning
} from '../../types/safety-gate.js';
import { StateEngine } from './StateEngine.js';
import { SignalDetector } from './SignalDetector.js';
import { LevelAssessor } from './LevelAssessor.js';
import { InterventionSelector } from './InterventionSelector.js';
import { SessionPlanner } from './SessionPlanner.js';
import { PromptBuilder } from './PromptBuilder.js';
import { LLMResponseGenerator } from './LLMResponseGenerator.js';
import { LLMResponseValidator } from './LLMResponseValidator.js';
import { pipelineLogger } from '../../utils/logger.js';
import type { PipelineFlowData } from '../../utils/logger.js';

// Re-export for backward compatibility
export type { UIPackage, TaskContext };

export class BackendOrchestrator {
  // Pipeline components (ordered by flow)
  private signalDetector: SignalDetector;
  private stateEngine: StateEngine;
  private levelAssessor: LevelAssessor;
  private interventionSelector: InterventionSelector;
  private sessionPlanner: SessionPlanner;
  private promptBuilder: PromptBuilder;
  private llmResponseGenerator: LLMResponseGenerator;
  private llmResponseValidator: LLMResponseValidator;
  private currentTaskContext: TaskContext | null = null;

  constructor() {
    this.signalDetector = new SignalDetector();
    this.stateEngine = new StateEngine();
    this.levelAssessor = new LevelAssessor();
    this.interventionSelector = new InterventionSelector();
    this.sessionPlanner = new SessionPlanner();
    this.promptBuilder = new PromptBuilder();
    this.llmResponseGenerator = new LLMResponseGenerator();
    this.llmResponseValidator = new LLMResponseValidator();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. INPUT - Task Context
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set the current task context for card-specific processing
   */
  setTaskContext(context: TaskContext): void {
    this.currentTaskContext = context;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN PIPELINE
  // Event → Signals → State → Level → Interventions → Config → LLM → Output
  // ─────────────────────────────────────────────────────────────────────────────

  async processEvent(event: Event, taskContext?: TaskContext): Promise<UIPackage> {
    // Use provided task context or fall back to stored context
    if (taskContext) {
      this.currentTaskContext = taskContext;
    }

    // Initialize flow data for logging
    const flowData: Partial<PipelineFlowData> = {
      event: {
        type: event.type,
        correct: event.correct,
        response: event.response,
        inputSignals: event.signals
      },
      taskContext: this.currentTaskContext ? {
        category: this.currentTaskContext.category,
        question: this.currentTaskContext.question,
        targetAnswer: this.currentTaskContext.targetAnswer
      } : undefined
    };

    // 1. Detect signals from event (audio, text, patterns)
    const signals = await this.signalDetector.detectSignals(event);
    flowData.signals = signals.map(s => String(s));

    // 2. Update state from event AND apply signal effects
    const state = this.stateEngine.processEvent(event, signals);
    flowData.state = {
      engagementLevel: state.engagementLevel,
      dysregulationLevel: state.dysregulationLevel,
      fatigueLevel: state.fatigueLevel,
      consecutiveErrors: state.consecutiveErrors,
      errorFrequency: state.errorFrequency,
      timeInSession: state.timeInSession,
      timeSinceBreak: state.timeSinceBreak
    };

    // 3. Assess safety level
    const safetyLevel = this.levelAssessor.assessLevel(state, signals);
    flowData.safetyLevel = safetyLevel;

    // 4. Determine interventions
    const interventions = this.interventionSelector.selectInterventions(
      safetyLevel,
      state,
      signals
    );
    flowData.interventions = interventions;

    // 5. Adapt session config
    const config = this.sessionPlanner.adaptSessionConfig(safetyLevel);
    flowData.sessionConfig = {
      promptIntensity: config.promptIntensity,
      avatarTone: config.avatarTone,
      maxTaskTime: config.maxTaskTime,
      inactivityTimeout: config.inactivityTimeout
    };

    // 6. Create backend response
    const backendResponse: BackendResponse = {
      // Flow order
      safetyLevel: safetyLevel,
      signals: signals,
      interventions: interventions,
      sessionConfig: config,
      // Decision & context
      decision: this.determineDecision(safetyLevel, interventions),
      sessionState: this.getSessionState(event, state),
      context: this.buildContext(event, state),
      constraints: this.buildConstraints(config, safetyLevel),
      reasoning: this.buildReasoning(safetyLevel, interventions, signals),
      timestamp: new Date()
    };

    flowData.constraints = {
      max_sentences: backendResponse.constraints.max_sentences,
      must_offer_choices: backendResponse.constraints.must_offer_choices,
      forbidden_words: backendResponse.constraints.forbidden_words
    };

    // 7. For inactivity events, skip LLM and use fallback directly
    if (event.type === 'CHILD_INACTIVE') {
      flowData.llmSkipped = true;
      flowData.llmSkipReason = 'CHILD_INACTIVE event';
      flowData.usedFallback = true;

      const uiPackage = this.generateFallbackResponse(backendResponse, state);
      flowData.uiPackage = {
        speechText: uiPackage.speech.text,
        choiceMessage: uiPackage.choiceMessage
      };

      // Log complete flow
      pipelineLogger.logFlow(flowData as PipelineFlowData);
      return uiPackage;
    }

    // 8. Build system prompt and get LLM response
    const llmResponse = await this.llmResponseGenerator.generateResponse(
      this.promptBuilder.buildSystemPrompt(backendResponse),
      backendResponse.context
    );
    flowData.llmResponse = {
      coach_line: llmResponse.coach_line,
      choice_presentation: llmResponse.choice_presentation
    };

    // 9. Validate LLM response
    const validation = this.llmResponseValidator.validate(
      llmResponse,
      backendResponse.constraints
    );
    flowData.validation = {
      valid: validation.valid,
      checks: validation.checks,
      reason: validation.reason
    };

    if (!validation.valid) {
      flowData.usedFallback = true;
      const uiPackage = this.generateFallbackResponse(backendResponse, state);
      flowData.uiPackage = {
        speechText: uiPackage.speech.text,
        choiceMessage: uiPackage.choiceMessage
      };

      // Log complete flow
      pipelineLogger.logFlow(flowData as PipelineFlowData);
      return uiPackage;
    }

    // 10. Build UI package
    const uiPackage = this.buildUIPackage(backendResponse, llmResponse, state);
    flowData.uiPackage = {
      speechText: uiPackage.speech.text,
      choiceMessage: uiPackage.choiceMessage
    };

    // Log complete flow
    pipelineLogger.logFlow(flowData as PipelineFlowData);

    return uiPackage;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. BACKEND RESPONSE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private determineDecision(
    level: Level,
    interventions: Intervention[]
  ): string {
    if (level === Level.RED) {
      return 'CALL_GROWNUP_IMMEDIATELY';
    }
    if (interventions.includes(Intervention.BUBBLE_BREATHING)) {
      return 'TRIGGER_REGULATION_WITH_CHOICES';
    }
    if (interventions.includes(Intervention.START_BREAK)) {
      return 'START_BREAK_NOW';
    }
    if (level >= Level.YELLOW) {
      return 'ADAPT_AND_CONTINUE';
    }
    return 'CONTINUE_NORMAL';
  }

  private getSessionState(event: Event, state: State): SessionState {
    return {
      current_event: event.type,
      engagement: state.engagementLevel,
      dysregulation: state.dysregulationLevel,
      fatigue: state.fatigueLevel,
      consecutive_errors: state.consecutiveErrors,
      time_in_session: state.timeInSession
    };
  }

  private buildContext(event: Event, state: State): ResponseContext {
    const what_happened: ResponseContext['what_happened'] = event.type === 'CHILD_RESPONSE'
      ? (event.correct ? 'correct_response' : 'incorrect_response')
      : 'child_inactive';

    const baseContext: ResponseContext = {
      what_happened,
      child_said: event.response || '',
      target_was: this.currentTaskContext?.targetAnswer || '',
      attempt_number: state.consecutiveErrors + 1
    };

    // Add card-specific context if available
    if (this.currentTaskContext) {
      baseContext.card_context = {
        category: this.currentTaskContext.category,
        card_type: this.currentTaskContext.cardType,
        question: this.currentTaskContext.question,
        expected_answer: this.currentTaskContext.targetAnswer,
        visual_supports: this.currentTaskContext.imageLabels
      };
    }

    return baseContext;
  }

  private buildConstraints(config: SessionConfig, level: Level): ResponseConstraints {
    return {
      must_use_tone: config.avatarTone,
      must_be_brief: true,
      must_not_judge: true,
      must_not_pressure: true,
      must_offer_choices: level >= Level.YELLOW,
      must_validate_feelings: level >= Level.ORANGE,
      // GREEN: 2 sentences ("I heard X. Let's try again!")
      // YELLOW+: 3 sentences ("I heard X. Almost there! What would you like to do?")
      max_sentences: level >= Level.YELLOW ? 3 : 2,
      forbidden_words: ['wrong', 'incorrect', 'bad', 'no', 'try harder', 'focus'],
      required_approach: 'describe_what_heard_offer_support'
    };
  }

  private buildReasoning(
    level: Level,
    interventions: Intervention[],
    signals: string[]
  ): ResponseReasoning {
    return {
      safety_level_reason: `Level ${Level[level]} due to signals: ${signals.join(', ') || 'none'}`,
      interventions_reason: interventions.length > 0
        ? `Applying: ${interventions.join(', ')}`
        : 'No interventions needed'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7-9. LLM FALLBACK
  // ─────────────────────────────────────────────────────────────────────────────

  private generateFallbackResponse(backendResponse: BackendResponse, state: State): UIPackage {
    // Generate level-appropriate fallback text
    const level = backendResponse.safetyLevel;
    let fallbackText: string;

    // Check if this is an inactivity event
    const isInactivity = backendResponse.context?.what_happened === 'child_inactive';
    const isCorrect = backendResponse.context?.what_happened === 'correct_response';

    if (isCorrect) {
      // Correct answer - celebrate!
      fallbackText = "Great job! You got it!";
    } else if (isInactivity) {
      // Special handling for inactivity - gentle prompt
      if (level >= Level.YELLOW) {
        fallbackText = "Are you still there? Take your time! What would you like to do?";
      } else {
        fallbackText = "Are you still there? Take your time!";
      }
    } else if (level >= Level.YELLOW) {
      // YELLOW+ levels: include choice prompt
      fallbackText = "I heard you! Good try! What would you like to do?";
    } else {
      // GREEN level: simple encouragement without choice prompt
      fallbackText = "I heard you! Let's try again!";
    }

    return {
      // Flow order: Signals → State → Level → Interventions → Config → LLM Output
      overlay: {
        signals: backendResponse.signals,
        state: state,
        safetyLevel: backendResponse.safetyLevel
      },
      interventions: backendResponse.interventions,
      sessionConfig: backendResponse.sessionConfig,
      speech: {
        text: fallbackText
      },
      choiceMessage: "What would you like to do?"
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. OUTPUT - Build UI Package
  // ─────────────────────────────────────────────────────────────────────────────

  private buildUIPackage(
    backendResponse: BackendResponse,
    llmResponse: LLMGeneration,
    state: State
  ): UIPackage {
    return {
      // Flow order: Signals → State → Level → Interventions → Config → LLM Output
      overlay: {
        signals: backendResponse.signals,
        state: state,
        safetyLevel: backendResponse.safetyLevel
      },
      interventions: backendResponse.interventions,
      sessionConfig: backendResponse.sessionConfig,
      speech: {
        text: llmResponse.coach_line
      },
      choiceMessage: llmResponse.choice_presentation
    };
  }
}
