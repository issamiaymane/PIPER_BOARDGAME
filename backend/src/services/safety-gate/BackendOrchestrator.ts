import { State, Event, Level, Intervention, SessionConfig, BackendResponse, Signal } from './types.js';
import { StateEngine } from './StateEngine.js';
import { SignalDetector } from './SignalDetector.js';
import { LevelAssessor } from './LevelAssessor.js';
import { InterventionSelector } from './InterventionSelector.js';
import { SessionPlanner } from './SessionPlanner.js';
import { PromptBuilder } from './PromptBuilder.js';
import { LLMClient, LLMResponse } from './LLMClient.js';
import { ResponseValidator, ResponseValidationResult } from './ResponseValidator.js';

export interface TaskContext {
  cardType: string;
  category: string;
  question: string;
  targetAnswer: string;
  imageLabels: string[];
}

export interface UIPackage {
  avatar: {
    animation: string;
    expression: string;
    position: string;
  };
  speech: {
    text: string;
    voice_tone: string;
    speed: string;
  };
  choice_message: string;
  interventions: Intervention[];
  visual_cues: {
    enabled: boolean;
  };
  audio_support: {
    available: boolean;
  };
  grownup_help: {
    available: boolean;
  };
  admin_overlay: {
    safety_level: Level;
    interventions_active: number;
    interventions_list: Intervention[];
    signals_detected: Signal[];
    time_in_session: string;
    state_snapshot: State;
  };
  // Optional fields for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

interface Logger {
  logStateUpdate(state: State, event: Event): void;
  logSignals(signals: Signal[]): void;
  logSafetyAssessment(level: Level, state: State, signals: Signal[]): void;
  logInterventions(interventions: Intervention[]): void;
  logConfigAdaptation(config: SessionConfig): void;
  logBackendResponse(response: BackendResponse): void;
  logLLMResponse(response: LLMResponse): void;
  logValidationFailure(validation: ResponseValidationResult): void;
  logValidationSuccess(validation: ResponseValidationResult): void;
  logForSOAP(data: any): Promise<void>;
}

// Silent logger - formatted output is handled by SafetyGateSession
class SilentLogger implements Logger {
  logStateUpdate(_state: State, _event: Event): void {}
  logSignals(_signals: Signal[]): void {}
  logSafetyAssessment(_level: Level, _state: State, _signals: Signal[]): void {}
  logInterventions(_interventions: Intervention[]): void {}
  logConfigAdaptation(_config: SessionConfig): void {}
  logBackendResponse(_response: BackendResponse): void {}
  logLLMResponse(_response: LLMResponse): void {}
  logValidationFailure(_validation: ResponseValidationResult): void {}
  logValidationSuccess(_validation: ResponseValidationResult): void {}
  async logForSOAP(_data: any): Promise<void> {}
}

// Verbose logger - for debugging (enable by using VerboseLogger in constructor)
class VerboseLogger implements Logger {
  logStateUpdate(state: State, event: Event): void {
    console.log('[State Update]', { state, event });
  }
  logSignals(signals: Signal[]): void {
    console.log('[Signals]', signals);
  }
  logSafetyAssessment(level: Level, state: State, signals: Signal[]): void {
    console.log('[Safety Assessment]', { level, state, signals });
  }
  logInterventions(interventions: Intervention[]): void {
    console.log('[Interventions]', interventions);
  }
  logConfigAdaptation(config: SessionConfig): void {
    console.log('[Config Adaptation]', config);
  }
  logBackendResponse(response: BackendResponse): void {
    console.log('[Backend Response]', response);
  }
  logLLMResponse(response: LLMResponse): void {
    console.log('[LLM Response]', response);
  }
  logValidationFailure(validation: ResponseValidationResult): void {
    console.log('[Validation Failure]', validation);
  }
  logValidationSuccess(validation: ResponseValidationResult): void {
    console.log('[Validation Success]', validation);
  }
  async logForSOAP(data: any): Promise<void> {
    console.log('[SOAP Log]', data);
  }
}

export class BackendOrchestrator {
  private stateEngine: StateEngine;
  private signalDetector: SignalDetector;
  private levelAssessor: LevelAssessor;
  private interventionSelector: InterventionSelector;
  private sessionPlanner: SessionPlanner;
  private promptBuilder: PromptBuilder;
  private llmClient: LLMClient;
  private validator: ResponseValidator;
  private logger: Logger;
  private currentTaskContext: TaskContext | null = null;

  constructor() {
    this.stateEngine = new StateEngine();
    this.signalDetector = new SignalDetector();
    this.levelAssessor = new LevelAssessor();
    this.interventionSelector = new InterventionSelector();
    this.sessionPlanner = new SessionPlanner();
    this.promptBuilder = new PromptBuilder();
    this.llmClient = new LLMClient();
    this.validator = new ResponseValidator();
    this.logger = new SilentLogger(); // Use VerboseLogger for debugging
  }

  /**
   * Set the current task context for card-specific processing
   */
  setTaskContext(context: TaskContext): void {
    this.currentTaskContext = context;
  }

  /**
   * Clear the current task context
   */
  clearTaskContext(): void {
    this.currentTaskContext = null;
  }

  async processEvent(event: Event, taskContext?: TaskContext): Promise<UIPackage> {
    // Use provided task context or fall back to stored context
    if (taskContext) {
      this.currentTaskContext = taskContext;
    }

    // 1. Update state from event
    const state = this.stateEngine.processEvent(event);
    this.logger.logStateUpdate(state, event);

    // 2. Detect signals from state and event
    const signals = this.signalDetector.detectSignals(state, event);
    this.logger.logSignals(signals);

    // 3. Assess safety level
    const safetyLevel = this.levelAssessor.assessLevel(state, signals);
    this.logger.logSafetyAssessment(safetyLevel, state, signals);

    // 4. Determine interventions
    const interventions = this.interventionSelector.selectInterventions(
      safetyLevel,
      state,
      signals
    );
    this.logger.logInterventions(interventions);

    // 5. Adapt session config
    const config = this.sessionPlanner.adaptSessionConfig(safetyLevel);
    this.logger.logConfigAdaptation(config);

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
    this.logger.logBackendResponse(backendResponse);

    // 7. For inactivity events, skip LLM and use fallback directly
    if (event.type === 'CHILD_INACTIVE') {
      console.log('[BackendOrchestrator] Inactivity event - using fallback response (skipping LLM)');
      return this.generateFallbackResponse(backendResponse, state);
    }

    // 8. Build system prompt and get LLM response
    const systemPrompt = this.promptBuilder.buildSystemPrompt(backendResponse);
    const llmResponse = await this.llmClient.generateResponse(
      systemPrompt,
      backendResponse.context
    );
    this.logger.logLLMResponse(llmResponse);

    // 9. Validate LLM response
    const validation = this.validator.validate(
      llmResponse,
      backendResponse.constraints
    );

    if (!validation.valid) {
      this.logger.logValidationFailure(validation);
      return this.generateFallbackResponse(backendResponse, state);
    }
    this.logger.logValidationSuccess(validation);

    // 10. Build UI package and log
    const uiPackage = this.buildUIPackage(backendResponse, llmResponse, state);

    await this.logger.logForSOAP({
      event,
      state,
      signals,
      safetyLevel,
      interventions,
      backendResponse,
      llmResponse,
      validation
    });

    return uiPackage;
  }

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

  private generateFallbackResponse(backendResponse: BackendResponse, state: State): UIPackage {
    // Generate level-appropriate fallback text
    const level = backendResponse.safety_level;
    let fallbackText: string;

    // Check if this is an inactivity event
    const isInactivity = backendResponse.context?.what_happened === 'child_inactive';

    if (isInactivity) {
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
        animation: 'gentle_nod',
        expression: 'supportive',
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
      }
    };
  }

  private buildUIPackage(
    backendResponse: BackendResponse,
    llmResponse: LLMResponse,
    state: State
  ): UIPackage {
    return {
      avatar: {
        animation: this.getAvatarAnimation(backendResponse.safety_level),
        expression: this.getAvatarExpression(backendResponse.parameters.avatar_tone),
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
      }
    };
  }

  private getAvatarAnimation(level: Level): string {
    switch (level) {
      case Level.RED:
        return 'calm_breathing';
      case Level.ORANGE:
        return 'gentle_nod';
      case Level.YELLOW:
        return 'encouraging';
      default:
        return 'neutral';
    }
  }

  private getAvatarExpression(tone: string): string {
    switch (tone) {
      case 'calm':
        return 'serene';
      case 'warm':
        return 'friendly';
      default:
        return 'neutral';
    }
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
