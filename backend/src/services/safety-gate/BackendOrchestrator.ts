// ═══════════════════════════════════════════════════════════════════════════
// BACKEND ORCHESTRATOR
// Main pipeline: Event → Signals → State → Level → Interventions → Config → LLM → Output
// ═══════════════════════════════════════════════════════════════════════════

import { Level, Intervention } from './types.js';
import type {
  State,
  Event,
  SessionConfig,
  BackendResponse,
  UIPackage,
  TaskContext,
  LLMResponse
} from './types.js';
import { StateEngine } from './StateEngine.js';
import { SignalDetector } from './SignalDetector.js';
import { LevelAssessor } from './LevelAssessor.js';
import { InterventionSelector } from './InterventionSelector.js';
import { SessionPlanner } from './SessionPlanner.js';
import { PromptBuilder } from './PromptBuilder.js';
import { LLMClient } from './LLMClient.js';
import { ResponseValidator } from './ResponseValidator.js';
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
  private llmClient: LLMClient;
  private validator: ResponseValidator;
  private currentTaskContext: TaskContext | null = null;

  constructor() {
    this.signalDetector = new SignalDetector();
    this.stateEngine = new StateEngine();
    this.levelAssessor = new LevelAssessor();
    this.interventionSelector = new InterventionSelector();
    this.sessionPlanner = new SessionPlanner();
    this.promptBuilder = new PromptBuilder();
    this.llmClient = new LLMClient();
    this.validator = new ResponseValidator();
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
      prompt_intensity: config.prompt_intensity,
      avatar_tone: config.avatar_tone,
      max_task_time: config.max_task_time,
      inactivity_timeout: config.inactivity_timeout,
      show_visual_cues: config.show_visual_cues,
      enable_audio_support: config.enable_audio_support
    };

    // 6. Create backend response
    const backendResponse: BackendResponse = {
      decision: this.determineDecision(safetyLevel, interventions),
      safety_level: safetyLevel,
      session_state: this.getSessionState(event, state),
      parameters: config,
      context: this.buildContext(event, state),
      constraints: this.buildConstraints(config, safetyLevel),
      signals_detected: signals,
      interventions_active: interventions,
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
        voiceTone: uiPackage.speech.voice_tone,
        speed: uiPackage.speech.speed,
        choiceMessage: uiPackage.choice_message
      };

      // Log complete flow
      pipelineLogger.logFlow(flowData as PipelineFlowData);
      return uiPackage;
    }

    // 8. Build system prompt and get LLM response
    const llmResponse = await this.llmClient.generateResponse(
      this.promptBuilder.buildSystemPrompt(backendResponse),
      backendResponse.context
    );
    flowData.llmResponse = {
      coach_line: llmResponse.coach_line,
      choice_presentation: llmResponse.choice_presentation
    };

    // 9. Validate LLM response
    const validation = this.validator.validate(
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
        voiceTone: uiPackage.speech.voice_tone,
        speed: uiPackage.speech.speed,
        choiceMessage: uiPackage.choice_message
      };

      // Log complete flow
      pipelineLogger.logFlow(flowData as PipelineFlowData);
      return uiPackage;
    }

    // 10. Build UI package
    const uiPackage = this.buildUIPackage(backendResponse, llmResponse, state);
    flowData.uiPackage = {
      speechText: uiPackage.speech.text,
      voiceTone: uiPackage.speech.voice_tone,
      speed: uiPackage.speech.speed,
      choiceMessage: uiPackage.choice_message
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

  private getSessionState(event: Event, state: State): any {
    return {
      current_event: event.type,
      engagement: state.engagementLevel,
      dysregulation: state.dysregulationLevel,
      fatigue: state.fatigueLevel,
      consecutive_errors: state.consecutiveErrors,
      time_in_session: state.timeInSession
    };
  }

  private buildContext(event: Event, state: State): any {
    const baseContext = {
      what_happened: event.type === 'CHILD_RESPONSE'
        ? (event.correct ? 'correct_response' : 'incorrect_response')
        : event.type.toLowerCase(),
      child_said: event.response || '',
      target_was: this.currentTaskContext?.targetAnswer || '',
      attempt_number: state.consecutiveErrors + 1
    };

    // Add card-specific context if available
    if (this.currentTaskContext) {
      return {
        ...baseContext,
        card_context: {
          category: this.currentTaskContext.category,
          card_type: this.currentTaskContext.cardType,
          question: this.currentTaskContext.question,
          expected_answer: this.currentTaskContext.targetAnswer,
          visual_supports: this.currentTaskContext.imageLabels
        }
      };
    }

    return baseContext;
  }

  private buildConstraints(config: SessionConfig, level: Level): any {
    return {
      must_use_tone: config.avatar_tone,
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
  ): any {
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
    const level = backendResponse.safety_level;
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
      avatar: {
        animation: 'idle',
        expression: 'neutral',
        position: 'centered'
      },
      speech: {
        text: fallbackText,
        voice_tone: backendResponse.parameters.avatar_tone,
        speed: level >= Level.ORANGE ? 'slow' : 'normal'
      },
      choice_message: "What would you like to do?",
      interventions: backendResponse.interventions_active,
      visual_cues: {
        enabled: true
      },
      audio_support: {
        available: backendResponse.parameters.enable_audio_support
      },
      grownup_help: {
        available: backendResponse.interventions_active.includes(Intervention.CALL_GROWNUP)
      },
      admin_overlay: {
        safety_level: backendResponse.safety_level,
        interventions_active: backendResponse.interventions_active.length,
        interventions_list: backendResponse.interventions_active,
        signals_detected: backendResponse.signals_detected,
        time_in_session: this.formatTime(state.timeInSession),
        state_snapshot: state
      },
      session_config: backendResponse.parameters
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. OUTPUT - Build UI Package
  // ─────────────────────────────────────────────────────────────────────────────

  private buildUIPackage(
    backendResponse: BackendResponse,
    llmResponse: LLMResponse,
    state: State
  ): UIPackage {
    return {
      avatar: {
        animation: 'idle',
        expression: 'neutral',
        position: 'centered'
      },
      speech: {
        text: llmResponse.coach_line,
        voice_tone: backendResponse.parameters.avatar_tone,
        speed: backendResponse.safety_level >= Level.ORANGE ? 'slow' : 'normal'
      },
      choice_message: llmResponse.choice_presentation,
      interventions: backendResponse.interventions_active,
      visual_cues: {
        enabled: backendResponse.parameters.show_visual_cues
      },
      audio_support: {
        available: backendResponse.parameters.enable_audio_support
      },
      grownup_help: {
        available: backendResponse.interventions_active.includes(Intervention.CALL_GROWNUP)
      },
      admin_overlay: {
        safety_level: backendResponse.safety_level,
        interventions_active: backendResponse.interventions_active.length,
        interventions_list: backendResponse.interventions_active,
        signals_detected: backendResponse.signals_detected,
        time_in_session: this.formatTime(state.timeInSession),
        state_snapshot: state
      },
      session_config: backendResponse.parameters
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
