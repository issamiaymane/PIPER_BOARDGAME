export const logger = {
  debug: (...args: unknown[]) => {}, // Silent by default, enable for verbose logging
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

// ============================================
// PIPELINE FLOW LOGGER
// Shows complete flow: Event → Signals → State → Level → Interventions → Config → LLM → UIPackage
// ============================================

export interface PipelineFlowData {
  // 1. EVENT (Input)
  event: {
    type: string;
    correct?: boolean;
    response?: string;
    inputSignals?: {
      screaming?: boolean;
      crying?: boolean;
      prolongedSilence?: boolean;
    };
  };
  taskContext?: {
    category: string;
    question: string;
    targetAnswer: string;
  };

  // 2. SIGNALS (Detected from Event - audio, text, patterns)
  signals: string[];

  // 3. STATE (Updated with Signal Effects applied)
  state: {
    engagementLevel: number;
    dysregulationLevel: number;
    fatigueLevel: number;
    consecutiveErrors: number;
    errorFrequency: number;
    timeInSession: number;
    timeSinceBreak: number;
  };

  // 4. LEVEL
  safetyLevel: number;

  // 5. INTERVENTIONS
  interventions: string[];

  // 6. SESSION CONFIG
  sessionConfig: {
    prompt_intensity: number;
    avatar_tone: string;
    max_task_time: number;
    inactivity_timeout: number;
  };

  // 7. CONSTRAINTS
  constraints: {
    max_sentences: number;
    must_offer_choices: boolean;
    forbidden_words: string[];
  };

  // 8. LLM
  llmResponse?: {
    coach_line: string;
    choice_presentation: string;
  };
  llmSkipped?: boolean;
  llmSkipReason?: string;

  // 9. VALIDATION
  validation?: {
    valid: boolean;
    checks: Record<string, boolean>;
    reason: string | null;
  };
  usedFallback?: boolean;

  // 10. OUTPUT
  uiPackage: {
    speechText: string;
    voiceTone: string;
    speed: string;
    choiceMessage: string;
  };
}

export const pipelineLogger = {
  /**
   * Log the complete pipeline flow in order
   * Shows all steps: Event → Signals → State → Level → Interventions → Config → LLM → UIPackage
   */
  logFlow(data: PipelineFlowData): void {
    const C = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      orange: '\x1b[38;5;208m',
      red: '\x1b[31m',
      cyan: '\x1b[36m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      gray: '\x1b[90m',
      white: '\x1b[37m',
    };

    const LEVEL_INFO: Record<number, { color: string; name: string; emoji: string }> = {
      0: { color: C.green, name: 'GREEN', emoji: '🟢' },
      1: { color: C.yellow, name: 'YELLOW', emoji: '🟡' },
      2: { color: C.orange, name: 'ORANGE', emoji: '🟠' },
      3: { color: C.red, name: 'RED', emoji: '🔴' },
    };

    const level = LEVEL_INFO[data.safetyLevel] || LEVEL_INFO[0];
    const divider = '═'.repeat(60);
    const sectionDivider = '─'.repeat(60);

    console.log(`\n${C.cyan}${divider}${C.reset}`);
    console.log(`${C.bold}${C.cyan}  SAFETY-GATE PIPELINE FLOW${C.reset}`);
    console.log(`${C.cyan}${divider}${C.reset}`);

    // ─────────────────────────────────────────────────────────────
    // 1. INPUT - Event
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}1. EVENT (Input)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    console.log(`   Type:     ${C.cyan}${data.event.type}${C.reset}`);
    console.log(`   Response: ${C.white}"${data.event.response || '(none)'}${C.reset}"`);
    console.log(`   Correct:  ${data.event.correct ? `${C.green}true${C.reset}` : `${C.orange}false${C.reset}`}`);
    if (data.event.inputSignals) {
      const signals = [];
      if (data.event.inputSignals.screaming) signals.push('screaming');
      if (data.event.inputSignals.crying) signals.push('crying');
      if (data.event.inputSignals.prolongedSilence) signals.push('prolongedSilence');
      if (signals.length > 0) {
        console.log(`   ${C.red}🎤 Input Signals: { ${signals.join(', ')} }${C.reset}`);
      }
    }

    if (data.taskContext) {
      console.log(`   ${C.dim}───────────────────${C.reset}`);
      console.log(`   Category: ${C.cyan}${data.taskContext.category}${C.reset}`);
      console.log(`   Question: ${C.white}${data.taskContext.question}${C.reset}`);
      console.log(`   Target:   ${C.green}${data.taskContext.targetAnswer}${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SIGNALS (Detected from Event)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}2. SIGNALS (Detected from Event)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    if (data.signals.length > 0) {
      data.signals.forEach(signal => {
        console.log(`   ${C.magenta}⚡ ${signal}${C.reset}`);
      });
    } else {
      console.log(`   ${C.dim}(no signals detected)${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STATE (Updated with All Effects)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}3. STATE (Updated)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);

    // Calculate ALL effects (from Event + Signals)
    const effects = {
      dysregulation: [] as string[],
      engagement: [] as string[],
      fatigue: [] as string[],
      errors: [] as string[],
    };

    // Event-based effects
    if (data.event.type === 'CHILD_RESPONSE') {
      if (data.event.correct) {
        effects.engagement.push('+1 correct');
        effects.dysregulation.push('-0.5 correct');
        effects.errors.push('reset');
      } else {
        effects.engagement.push('-0.5 incorrect');
        effects.errors.push('+1 incorrect');
      }
    } else if (data.event.type === 'CHILD_INACTIVE') {
      effects.engagement.push('-2 inactive');
    }

    // Signal-based effects
    for (const signal of data.signals) {
      switch (signal) {
        case 'SCREAMING':
          effects.dysregulation.push('+4 SCREAMING');
          break;
        case 'CRYING':
          effects.dysregulation.push('+3 CRYING');
          break;
        case 'DISTRESS':
          effects.dysregulation.push('+2 DISTRESS');
          break;
        case 'FRUSTRATION':
          effects.dysregulation.push('+1 FRUSTRATION');
          break;
        case 'WANTS_QUIT':
          effects.engagement.push('-2 WANTS_QUIT');
          break;
        case 'WANTS_BREAK':
          effects.fatigue.push('+1 WANTS_BREAK');
          break;
        case 'REPETITIVE_RESPONSE':
          effects.dysregulation.push('+2 REPETITIVE');
          break;
      }
    }

    const engColor = data.state.engagementLevel >= 7 ? C.green : data.state.engagementLevel >= 4 ? C.yellow : C.red;
    const dysColor = data.state.dysregulationLevel >= 6 ? C.red : data.state.dysregulationLevel >= 3 ? C.yellow : C.green;
    const fatColor = data.state.fatigueLevel >= 7 ? C.red : data.state.fatigueLevel >= 4 ? C.yellow : C.green;

    const engEffects = effects.engagement.length > 0 ? ` ${C.cyan}← ${effects.engagement.join(', ')}${C.reset}` : '';
    const dysEffects = effects.dysregulation.length > 0 ? ` ${C.cyan}← ${effects.dysregulation.join(', ')}${C.reset}` : '';
    const fatEffects = effects.fatigue.length > 0 ? ` ${C.cyan}← ${effects.fatigue.join(', ')}${C.reset}` : '';
    const errEffects = effects.errors.length > 0 ? ` ${C.cyan}← ${effects.errors.join(', ')}${C.reset}` : '';

    console.log(`   Engagement:        ${engColor}${data.state.engagementLevel.toFixed(1)}${C.reset}/10${engEffects}`);
    console.log(`   Dysregulation:     ${dysColor}${data.state.dysregulationLevel.toFixed(1)}${C.reset}/10${dysEffects}`);
    console.log(`   Fatigue:           ${fatColor}${data.state.fatigueLevel.toFixed(1)}${C.reset}/10${fatEffects}`);
    console.log(`   ConsecutiveErrors: ${data.state.consecutiveErrors >= 3 ? C.red : C.white}${data.state.consecutiveErrors}${C.reset}${errEffects}`);
    console.log(`   ErrorFrequency:    ${data.state.errorFrequency.toFixed(2)}/min`);
    console.log(`   TimeInSession:     ${formatTimeShort(data.state.timeInSession)}`);
    console.log(`   TimeSinceBreak:    ${formatTimeShort(data.state.timeSinceBreak)}`);

    // ─────────────────────────────────────────────────────────────
    // 4. LEVEL (Assessed from State + Signals)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}4. LEVEL (Assessed from State + Signals)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    console.log(`   ${level.emoji} ${level.color}${C.bold}${level.name}${C.reset}`);

    // ─────────────────────────────────────────────────────────────
    // 5. INTERVENTIONS
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}5. INTERVENTIONS (Selected)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    if (data.interventions.length > 0) {
      data.interventions.forEach(intervention => {
        console.log(`   ${C.blue}🛠️  ${intervention}${C.reset}`);
      });
    } else {
      console.log(`   ${C.dim}(no interventions)${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. SESSION CONFIG
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}6. SESSION CONFIG (Adapted)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    const cfg = data.sessionConfig;
    const intensityLabels = ['Minimal', 'Low', 'Medium', 'High'];
    console.log(`   prompt_intensity:    ${cfg.prompt_intensity} (${intensityLabels[cfg.prompt_intensity] || 'Unknown'})`);
    console.log(`   avatar_tone:         ${cfg.avatar_tone}`);
    console.log(`   max_task_time:       ${cfg.max_task_time}s`);
    console.log(`   inactivity_timeout:  ${cfg.inactivity_timeout}s`);

    // ─────────────────────────────────────────────────────────────
    // 7. CONSTRAINTS
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}7. CONSTRAINTS (For LLM)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    console.log(`   max_sentences:       ${data.constraints.max_sentences}`);
    console.log(`   must_offer_choices:  ${data.constraints.must_offer_choices}`);
    console.log(`   forbidden_words:     [${data.constraints.forbidden_words.slice(0, 4).join(', ')}...]`);

    // ─────────────────────────────────────────────────────────────
    // 8. LLM RESPONSE
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}8. LLM RESPONSE${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    if (data.llmSkipped) {
      console.log(`   ${C.yellow}⏭️  SKIPPED: ${data.llmSkipReason || 'Unknown reason'}${C.reset}`);
    } else if (data.llmResponse) {
      console.log(`   coach_line:        "${C.cyan}${data.llmResponse.coach_line}${C.reset}"`);
      console.log(`   choice_presentation: "${data.llmResponse.choice_presentation}"`);
    } else {
      console.log(`   ${C.dim}(no LLM response)${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 9. VALIDATION
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}9. VALIDATION${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    if (data.llmSkipped) {
      console.log(`   ${C.dim}(skipped - no LLM call)${C.reset}`);
    } else if (data.validation) {
      if (data.validation.valid) {
        console.log(`   ${C.green}✓ PASSED${C.reset}`);
        Object.entries(data.validation.checks).forEach(([check, passed]) => {
          console.log(`     ${passed ? C.green + '✓' : C.red + '✗'}${C.reset} ${check}`);
        });
      } else {
        console.log(`   ${C.red}✗ FAILED${C.reset}`);
        Object.entries(data.validation.checks).forEach(([check, passed]) => {
          console.log(`     ${passed ? C.green + '✓' : C.red + '✗'}${C.reset} ${check}`);
        });
        console.log(`   ${C.red}Reason: ${data.validation.reason}${C.reset}`);
      }
    }
    if (data.usedFallback) {
      console.log(`   ${C.yellow}⚠️  USING FALLBACK RESPONSE${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 10. UI PACKAGE (Output)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}10. UI PACKAGE (Output)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    console.log(`   ${C.bold}speech.text:${C.reset}     "${C.cyan}${data.uiPackage.speechText}${C.reset}"`);
    console.log(`   voice_tone:       ${data.uiPackage.voiceTone}`);
    console.log(`   speed:            ${data.uiPackage.speed}`);
    console.log(`   choice_message:   "${data.uiPackage.choiceMessage}"`);

    console.log(`\n${C.cyan}${divider}${C.reset}\n`);
  }
};

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
