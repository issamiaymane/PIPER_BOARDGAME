import { ChildState, ChildEvent, SafetyGateLevel, InterventionType, SessionConfig, BackendResponse, Choice } from './types.js';
import { StateEngine } from './StateEngine.js';
import { PIPERSafetyGate } from './PIPERSafetyGate.js';
import { SessionPlanner } from './SessionPlanner.js';
import { PromptBuilder } from './PromptBuilder.js';
import { LLMClient, LLMResponse } from './LLMClient.js';
import { ResponseValidator, ResponseValidationResult } from './ResponseValidator.js';

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
  choices: Choice[];
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
    safety_level: SafetyGateLevel;
    interventions_active: number;
    time_in_session: string;
    state_snapshot: ChildState;
  };
}

interface Logger {
  logStateUpdate(state: ChildState, event: ChildEvent): void;
  logSignals(signals: string[]): void;
  logSafetyAssessment(level: SafetyGateLevel, state: ChildState, signals: string[]): void;
  logInterventions(interventions: InterventionType[]): void;
  logConfigAdaptation(config: SessionConfig): void;
  logBackendResponse(response: BackendResponse): void;
  logLLMResponse(response: LLMResponse): void;
  logValidationFailure(validation: ResponseValidationResult): void;
  logValidationSuccess(validation: ResponseValidationResult): void;
  logForSOAP(data: any): Promise<void>;
}

class ConsoleLogger implements Logger {
  logStateUpdate(state: ChildState, event: ChildEvent): void {
    console.log('[State Update]', { state, event });
  }
  logSignals(signals: string[]): void {
    console.log('[Signals]', signals);
  }
  logSafetyAssessment(level: SafetyGateLevel, state: ChildState, signals: string[]): void {
    console.log('[Safety Assessment]', { level, state, signals });
  }
  logInterventions(interventions: InterventionType[]): void {
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
  private safetyGate: PIPERSafetyGate;
  private sessionPlanner: SessionPlanner;
  private promptBuilder: PromptBuilder;
  private llmClient: LLMClient;
  private validator: ResponseValidator;
  private logger: Logger;

  constructor() {
    this.stateEngine = new StateEngine();
    this.safetyGate = new PIPERSafetyGate();
    this.sessionPlanner = new SessionPlanner();
    this.promptBuilder = new PromptBuilder();
    this.llmClient = new LLMClient();
    this.validator = new ResponseValidator();
    this.logger = new ConsoleLogger();
  }

  async processChildEvent(event: ChildEvent): Promise<UIPackage> {
    // 1. Update state
    const state = this.stateEngine.updateFromEvent(event);
    this.logger.logStateUpdate(state, event);

    // 2. Detect signals
    const signals = this.detectSignals(event, state);
    this.logger.logSignals(signals);

    // 3. Assess safety
    const safetyLevel = this.safetyGate.assessSafetyLevel(state, signals);
    this.logger.logSafetyAssessment(safetyLevel, state, signals);

    // 4. Determine interventions
    const interventions = this.safetyGate.determineInterventions(
      safetyLevel,
      state,
      signals
    );
    this.logger.logInterventions(interventions);

    // 5. Adapt session config
    const config = this.sessionPlanner.adaptSessionConfig(
      safetyLevel,
      interventions,
      state
    );
    this.logger.logConfigAdaptation(config);

    // 6. Build choices
    const choices = this.sessionPlanner.buildChoices(interventions, config);

    // 7. Create backend response
    const backendResponse: BackendResponse = {
      decision: this.determineDecision(safetyLevel, interventions),
      safety_level: safetyLevel,
      session_state: this.getSessionState(event, state),
      parameters: config,
      choices,
      context: this.buildContext(event, state),
      constraints: this.buildConstraints(config, safetyLevel),
      signals_detected: signals,
      interventions_active: interventions,
      reasoning: this.buildReasoning(safetyLevel, interventions, signals),
      timestamp: new Date()
    };
    this.logger.logBackendResponse(backendResponse);

    // 8. Build system prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt(backendResponse);

    // 9. Get LLM response
    const llmResponse = await this.llmClient.generateResponse(
      systemPrompt,
      backendResponse.context
    );
    this.logger.logLLMResponse(llmResponse);

    // 10. Validate LLM response
    const validation = this.validator.validate(
      llmResponse,
      backendResponse.constraints
    );

    if (!validation.valid) {
      this.logger.logValidationFailure(validation);
      // Retry or use fallback
      return this.generateFallbackResponse(backendResponse);
    }
    this.logger.logValidationSuccess(validation);

    // 11. Build UI package
    const uiPackage = this.buildUIPackage(
      backendResponse,
      llmResponse,
      state
    );

    // 12. Log for SOAP note
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

  private detectSignals(event: ChildEvent, state: ChildState): string[] {
    const signals: string[] = [];

    // Check for consecutive errors
    if (state.consecutiveErrors >= 3) {
      signals.push('CONSECUTIVE_ERRORS');
    }

    // Check for repetitive wrong response
    if (event.type === 'CHILD_RESPONSE' && event.response === event.previousResponse) {
      signals.push('REPETITIVE_WRONG_RESPONSE');
    }

    // Check for engagement drop
    if (state.engagementLevel <= 3) {
      signals.push('ENGAGEMENT_DROP');
    }

    // Check for verbal signals
    if (event.type === 'VERBAL_SIGNAL' && event.signal) {
      if (event.signal.toLowerCase().includes('break')) {
        signals.push('I_NEED_BREAK');
      }
      if (event.signal.toLowerCase().includes('done')) {
        signals.push('IM_DONE');
      }
      if (event.signal.toLowerCase().includes('scream')) {
        signals.push('SCREAMING');
      }
    }

    // Check fatigue
    if (state.fatigueLevel >= 7) {
      signals.push('FATIGUE_HIGH');
    }

    // Check dysregulation
    if (state.dysregulationLevel >= 6) {
      signals.push('DYSREGULATION_DETECTED');
    }

    return signals;
  }

  private determineDecision(
    level: SafetyGateLevel,
    interventions: InterventionType[]
  ): string {
    if (level === SafetyGateLevel.RED) {
      return 'CALL_GROWNUP_IMMEDIATELY';
    }
    if (interventions.includes(InterventionType.BUBBLE_BREATHING)) {
      return 'TRIGGER_REGULATION_WITH_CHOICES';
    }
    if (interventions.includes(InterventionType.TRIGGER_BREAK)) {
      return 'START_BREAK_NOW';
    }
    if (level >= SafetyGateLevel.YELLOW) {
      return 'ADAPT_AND_CONTINUE';
    }
    return 'CONTINUE_NORMAL';
  }

  private getSessionState(event: ChildEvent, state: ChildState): any {
    return {
      current_event: event.type,
      engagement: state.engagementLevel,
      dysregulation: state.dysregulationLevel,
      fatigue: state.fatigueLevel,
      consecutive_errors: state.consecutiveErrors,
      time_in_session: state.timeInSession
    };
  }

  private buildContext(event: ChildEvent, state: ChildState): any {
    return {
      what_happened: event.type === 'CHILD_RESPONSE'
        ? (event.correct ? 'correct_response' : 'incorrect_response')
        : event.type.toLowerCase(),
      child_said: event.response || '',
      target_was: '', // Would come from task context
      attempt_number: state.consecutiveErrors + 1
    };
  }

  private buildConstraints(config: SessionConfig, level: SafetyGateLevel): any {
    return {
      must_use_tone: config.avatar_tone,
      must_be_brief: true,
      must_not_judge: true,
      must_not_pressure: true,
      must_offer_choices: level >= SafetyGateLevel.YELLOW,
      must_validate_feelings: level >= SafetyGateLevel.ORANGE,
      max_sentences: level >= SafetyGateLevel.ORANGE ? 2 : 1,
      forbidden_words: ['wrong', 'incorrect', 'bad', 'no', 'try harder', 'focus'],
      required_approach: 'describe_what_heard_offer_support'
    };
  }

  private buildReasoning(
    level: SafetyGateLevel,
    interventions: InterventionType[],
    signals: string[]
  ): any {
    return {
      safety_level_reason: `Level ${SafetyGateLevel[level]} due to signals: ${signals.join(', ') || 'none'}`,
      interventions_reason: interventions.length > 0
        ? `Applying: ${interventions.join(', ')}`
        : 'No interventions needed'
    };
  }

  private generateFallbackResponse(backendResponse: BackendResponse): UIPackage {
    return {
      avatar: {
        animation: 'gentle_nod',
        expression: 'supportive',
        position: 'centered'
      },
      speech: {
        text: "Let's take a moment. What would you like to do?",
        voice_tone: 'calm',
        speed: 'slow'
      },
      choice_message: "You can choose:",
      choices: backendResponse.choices,
      visual_cues: {
        enabled: true
      },
      audio_support: {
        available: backendResponse.parameters.enable_audio_support
      },
      grownup_help: {
        available: backendResponse.parameters.grownup_help_available
      },
      admin_overlay: {
        safety_level: backendResponse.safety_level,
        interventions_active: backendResponse.interventions_active.length,
        time_in_session: '0:00',
        state_snapshot: {} as ChildState
      }
    };
  }

  private buildUIPackage(
    backendResponse: BackendResponse,
    llmResponse: LLMResponse,
    state: ChildState
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
        speed: backendResponse.safety_level >= SafetyGateLevel.ORANGE ? 'slow' : 'normal'
      },
      choice_message: llmResponse.choice_presentation,
      choices: backendResponse.choices,
      visual_cues: {
        enabled: backendResponse.parameters.show_visual_cues
      },
      audio_support: {
        available: backendResponse.parameters.enable_audio_support
      },
      grownup_help: {
        available: backendResponse.parameters.grownup_help_available
      },
      admin_overlay: {
        safety_level: backendResponse.safety_level,
        interventions_active: backendResponse.interventions_active.length,
        time_in_session: this.formatTime(state.timeInSession),
        state_snapshot: state
      }
    };
  }

  private getAvatarAnimation(level: SafetyGateLevel): string {
    switch (level) {
      case SafetyGateLevel.RED:
        return 'calm_breathing';
      case SafetyGateLevel.ORANGE:
        return 'gentle_nod';
      case SafetyGateLevel.YELLOW:
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
