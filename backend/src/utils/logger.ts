export const logger = {
  debug: (...args: unknown[]) => {}, // Silent by default, enable for verbose logging
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

// ============================================
// PIPELINE FLOW LOGGER
// Shows complete flow: Event → State → Signals → Level → Interventions → Config → LLM → UIPackage
// ============================================

export interface PipelineFlowData {
  // 1. INPUT
  event: {
    type: string;
    correct?: boolean;
    response?: string;
    signal?: string;
  };
  taskContext?: {
    category: string;
    question: string;
    targetAnswer: string;
  };

  // 2. STATE
  state: {
    engagementLevel: number;
    dysregulationLevel: number;
    fatigueLevel: number;
    consecutiveErrors: number;
    errorFrequency: number;
    timeInSession: number;
    timeSinceBreak: number;
  };

  // 3. SIGNALS
  signals: string[];

  // 4. LEVEL
  safetyLevel: number;

  // 5. INTERVENTIONS
  interventions: string[];

  // 6. SESSION CONFIG
  sessionConfig: {
    prompt_intensity: number;
    avatar_tone: string;
    max_retries: number;
    max_task_time: number;
    inactivity_timeout: number;
    show_visual_cues: boolean;
    enable_audio_support: boolean;
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
    avatarAnimation: string;
    choiceMessage: string;
  };
}

export const pipelineLogger = {
  /**
   * Log the complete pipeline flow in order
   * Shows all steps: Event → State → Signals → Level → Interventions → Config → LLM → UIPackage
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
    if (data.event.signal) {
      console.log(`   ${C.red}🎤 Audio Signal: ${data.event.signal}${C.reset}`);
    }

    if (data.taskContext) {
      console.log(`   ${C.dim}───────────────────${C.reset}`);
      console.log(`   Category: ${C.cyan}${data.taskContext.category}${C.reset}`);
      console.log(`   Question: ${C.white}${data.taskContext.question}${C.reset}`);
      console.log(`   Target:   ${C.green}${data.taskContext.targetAnswer}${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. STATE
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}2. STATE (Updated)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    const engColor = data.state.engagementLevel >= 7 ? C.green : data.state.engagementLevel >= 4 ? C.yellow : C.red;
    const dysColor = data.state.dysregulationLevel >= 6 ? C.red : data.state.dysregulationLevel >= 3 ? C.yellow : C.green;
    const fatColor = data.state.fatigueLevel >= 7 ? C.red : data.state.fatigueLevel >= 4 ? C.yellow : C.green;
    console.log(`   Engagement:        ${engColor}${data.state.engagementLevel.toFixed(1)}${C.reset}/10`);
    console.log(`   Dysregulation:     ${dysColor}${data.state.dysregulationLevel.toFixed(1)}${C.reset}/10`);
    console.log(`   Fatigue:           ${fatColor}${data.state.fatigueLevel.toFixed(1)}${C.reset}/10`);
    console.log(`   ConsecutiveErrors: ${data.state.consecutiveErrors >= 3 ? C.red : C.white}${data.state.consecutiveErrors}${C.reset}`);
    console.log(`   ErrorFrequency:    ${data.state.errorFrequency.toFixed(2)}/min`);
    console.log(`   TimeInSession:     ${formatTimeShort(data.state.timeInSession)}`);
    console.log(`   TimeSinceBreak:    ${formatTimeShort(data.state.timeSinceBreak)}`);

    // ─────────────────────────────────────────────────────────────
    // 3. SIGNALS
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}3. SIGNALS (Detected)${C.reset}`);
    console.log(`${C.gray}${sectionDivider}${C.reset}`);
    if (data.signals.length > 0) {
      data.signals.forEach(signal => {
        console.log(`   ${C.magenta}⚡ ${signal}${C.reset}`);
      });
    } else {
      console.log(`   ${C.dim}(no signals detected)${C.reset}`);
    }

    // ─────────────────────────────────────────────────────────────
    // 4. LEVEL
    // ─────────────────────────────────────────────────────────────
    console.log(`\n${C.bold}${C.white}4. LEVEL (Assessed)${C.reset}`);
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
    console.log(`   max_retries:         ${cfg.max_retries}`);
    console.log(`   max_task_time:       ${cfg.max_task_time}s`);
    console.log(`   inactivity_timeout:  ${cfg.inactivity_timeout}s`);
    console.log(`   show_visual_cues:    ${cfg.show_visual_cues}`);
    console.log(`   enable_audio_support:${cfg.enable_audio_support}`);

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
    console.log(`   avatar_animation: ${data.uiPackage.avatarAnimation}`);
    console.log(`   choice_message:   "${data.uiPackage.choiceMessage}"`);

    console.log(`\n${C.cyan}${divider}${C.reset}\n`);
  }
};

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
