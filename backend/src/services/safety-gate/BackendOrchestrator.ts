import { ChildState, ChildEvent, SafetyGateLevel, InterventionType, SessionConfig, BackendResponse, Choice } from './types.js';
import { StateEngine } from './StateEngine.js';
import { PIPERSafetyGate } from './PIPERSafetyGate.js';
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
    interventions_list: InterventionType[];
    signals_detected: string[];
    time_in_session: string;
    state_snapshot: ChildState;
  };
  // Optional fields for frontend console logging
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
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

// Silent logger - formatted output is handled by SafetyGateSession
class SilentLogger implements Logger {
  logStateUpdate(_state: ChildState, _event: ChildEvent): void {}
  logSignals(_signals: string[]): void {}
  logSafetyAssessment(_level: SafetyGateLevel, _state: ChildState, _signals: string[]): void {}
  logInterventions(_interventions: InterventionType[]): void {}
  logConfigAdaptation(_config: SessionConfig): void {}
  logBackendResponse(_response: BackendResponse): void {}
  logLLMResponse(_response: LLMResponse): void {}
  logValidationFailure(_validation: ResponseValidationResult): void {}
  logValidationSuccess(_validation: ResponseValidationResult): void {}
  async logForSOAP(_data: any): Promise<void> {}
}

// Verbose logger - for debugging (enable by using VerboseLogger in constructor)
class VerboseLogger implements Logger {
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
  private currentTaskContext: TaskContext | null = null;

  constructor() {
    this.stateEngine = new StateEngine();
    this.safetyGate = new PIPERSafetyGate();
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

  async processChildEvent(event: ChildEvent, taskContext?: TaskContext): Promise<UIPackage> {
    // Use provided task context or fall back to stored context
    if (taskContext) {
      this.currentTaskContext = taskContext;
    }
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

    // 7.5. For inactivity events, skip LLM and use fallback directly
    if (event.type === 'CHILD_INACTIVE') {
      console.log('[BackendOrchestrator] Inactivity event - using fallback response (skipping LLM)');
      return this.generateFallbackResponse(backendResponse, state);
    }

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
      return this.generateFallbackResponse(backendResponse, state);
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

    // Check for verbal signals in the response content (not just VERBAL_SIGNAL events)
    const responseText = (event.response || event.signal || '').toLowerCase();
    // Normalize text: remove punctuation for pattern matching
    const normalizedText = responseText.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    if (responseText.includes('break') || responseText.includes('stop') || responseText.includes('tired')) {
      signals.push('I_NEED_BREAK');
    }
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push('IM_DONE');
    }
    // Check for screaming signals from multiple sources:
    // 1. Audio amplitude detection (signal field from session)
    // 2. Text patterns in transcription
    const hasAudioScreaming = event.signal?.includes('screaming_detected_audio');

    // Text-based screaming detection (normalize to handle "no, no, no" -> "no no no")
    const hasTextScreaming =
      responseText.includes('scream') ||
      responseText.includes('yell') ||
      responseText.includes('shout') ||
      /a{2,}h{1,}/i.test(responseText) ||  // "aah", "aaah", "aahh", "aahhh" etc.
      /ah{2,}/i.test(responseText) ||       // "ahh", "ahhh", "ahhhh" etc.
      responseText.includes('argh') ||
      responseText.includes('ugh') ||
      responseText.includes('[screaming]') ||
      responseText.includes('[yelling]') ||
      responseText.includes('[shouting]') ||
      responseText.includes('[crying]') ||
      normalizedText.includes('no no no');

    if (hasAudioScreaming || hasTextScreaming) {
      signals.push('SCREAMING');
      // Debug: Log which source detected screaming
      console.log(`[BackendOrchestrator] 🚨 SCREAMING signal added - Audio: ${hasAudioScreaming}, Text: ${hasTextScreaming}`);
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

  private buildConstraints(config: SessionConfig, level: SafetyGateLevel): any {
    return {
      must_use_tone: config.avatar_tone,
      must_be_brief: true,
      must_not_judge: true,
      must_not_pressure: true,
      must_offer_choices: level >= SafetyGateLevel.YELLOW,
      must_validate_feelings: level >= SafetyGateLevel.ORANGE,
      // GREEN: 2 sentences ("I heard X. Let's try again!")
      // YELLOW+: 3 sentences ("I heard X. Almost there! What would you like to do?")
      max_sentences: level >= SafetyGateLevel.YELLOW ? 3 : 2,
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

  private generateFallbackResponse(backendResponse: BackendResponse, state: ChildState): UIPackage {
    // Generate level-appropriate fallback text
    const level = backendResponse.safety_level;
    let fallbackText: string;

    // Check if this is an inactivity event
    const isInactivity = backendResponse.context?.what_happened === 'child_inactive';

    if (isInactivity) {
      // Special handling for inactivity - gentle prompt
      if (level >= SafetyGateLevel.YELLOW) {
        fallbackText = "Are you still there? Take your time! What would you like to do?";
      } else {
        fallbackText = "Are you still there? Take your time!";
      }
    } else if (level >= SafetyGateLevel.YELLOW) {
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
        speed: level >= SafetyGateLevel.ORANGE ? 'slow' : 'normal'
      },
      choice_message: "What would you like to do?",
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
        interventions_list: backendResponse.interventions_active,
        signals_detected: backendResponse.signals_detected,
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
