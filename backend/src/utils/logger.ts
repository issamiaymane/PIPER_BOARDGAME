export const logger = {
  debug: (...args: unknown[]) => {}, // Silent by default, enable for verbose logging
  info: (...args: unknown[]) => console.log('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};

// ============================================
// SAFETY GATE FORMATTED LOGGER
// ============================================

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Safety levels
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[31m',

  // UI elements
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[37m',

  // Backgrounds
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
};

const LEVEL_COLORS: Record<number, string> = {
  0: COLORS.green,  // GREEN
  1: COLORS.yellow, // YELLOW
  2: COLORS.orange, // ORANGE
  3: COLORS.red,    // RED
};

const LEVEL_NAMES: Record<number, string> = {
  0: 'GREEN',
  1: 'YELLOW',
  2: 'ORANGE',
  3: 'RED',
};

const LEVEL_EMOJIS: Record<number, string> = {
  0: '🟢',
  1: '🟡',
  2: '🟠',
  3: '🔴',
};

export interface SafetyGateLogData {
  childSaid: string;
  targetAnswers: string[];
  isCorrect: boolean;
  safetyLevel: number;
  signals: string[];
  interventions: string[];
  state: {
    engagement: number;
    dysregulation: number;
    fatigue: number;
    consecutiveErrors: number;
    timeInSession: number;
  };
  choices: Array<{ icon: string; label: string; action: string }>;
  feedback: string;
  attemptNumber: number;
  responseHistory: string[];
  shouldSpeak?: boolean; // Whether feedback will be spoken
}

export const safetyGateLogger = {
  /**
   * Log a complete safety gate session state
   */
  logSessionState(data: SafetyGateLogData): void {
    const levelColor = LEVEL_COLORS[data.safetyLevel] || COLORS.white;
    const levelName = LEVEL_NAMES[data.safetyLevel] || 'UNKNOWN';
    const levelEmoji = LEVEL_EMOJIS[data.safetyLevel] || '⚪';

    const divider = '='.repeat(50);
    const thinDivider = '-'.repeat(50);

    console.log(`\n${COLORS.cyan}${divider}${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.cyan}     SAFETY-GATE SESSION STATE${COLORS.reset}`);
    console.log(`${COLORS.cyan}${divider}${COLORS.reset}`);

    // Child's response
    console.log(`${COLORS.bold}📝 Child said:${COLORS.reset} "${COLORS.white}${data.childSaid}${COLORS.reset}"`);
    console.log(`${COLORS.bold}🎯 Target answers:${COLORS.reset} [${data.targetAnswers.join(', ')}]`);

    // Correct/Incorrect
    if (data.isCorrect) {
      console.log(`${COLORS.green}${COLORS.bold}✅ CORRECT${COLORS.reset}`);
    } else {
      console.log(`${COLORS.orange}${COLORS.bold}❌ INCORRECT${COLORS.reset}`);
    }

    console.log(`${COLORS.gray}${thinDivider}${COLORS.reset}`);

    // Safety Level
    console.log(`${COLORS.bold}🚦 Safety Level:${COLORS.reset} ${levelEmoji} ${levelColor}${COLORS.bold}${levelName}${COLORS.reset}`);

    // Signals (if any)
    if (data.signals.length > 0) {
      console.log(`${COLORS.bold}📡 Signals Detected:${COLORS.reset} ${COLORS.magenta}${data.signals.join(', ')}${COLORS.reset}`);
    }

    // Interventions (show count and names)
    if (data.interventions.length > 0) {
      const interventionNames = data.interventions.map(i => i.toUpperCase()).join(', ');
      console.log(`${COLORS.bold}🛠️  Interventions (${data.interventions.length}):${COLORS.reset} ${COLORS.blue}${interventionNames}${COLORS.reset}`);
    } else {
      console.log(`${COLORS.bold}🛠️  Interventions:${COLORS.reset} ${COLORS.dim}none${COLORS.reset}`);
    }

    console.log(`${COLORS.gray}${thinDivider}${COLORS.reset}`);

    // Child State
    console.log(`${COLORS.bold}📊 Child State:${COLORS.reset}`);
    console.log(`   ${COLORS.dim}Engagement:${COLORS.reset}        ${formatBar(data.state.engagement, 10)} ${data.state.engagement.toFixed(1)}/10`);
    console.log(`   ${COLORS.dim}Dysregulation:${COLORS.reset}     ${formatBar(data.state.dysregulation, 10, true)} ${data.state.dysregulation.toFixed(1)}/10`);
    console.log(`   ${COLORS.dim}Fatigue:${COLORS.reset}           ${formatBar(data.state.fatigue, 10, true)} ${data.state.fatigue.toFixed(1)}/10`);
    console.log(`   ${COLORS.dim}Consecutive Errors:${COLORS.reset} ${data.state.consecutiveErrors}`);

    console.log(`${COLORS.gray}${thinDivider}${COLORS.reset}`);

    // Attempt info
    console.log(`${COLORS.bold}🔄 Attempt:${COLORS.reset} #${data.attemptNumber}`);

    // Response history (last 5)
    const recentHistory = data.responseHistory.slice(-5);
    if (recentHistory.length > 0) {
      console.log(`${COLORS.bold}📜 Recent History:${COLORS.reset} [${recentHistory.join(' → ')}]`);
    }

    console.log(`${COLORS.bold}⏱️  Session Duration:${COLORS.reset} ${formatTime(data.state.timeInSession)}`);

    console.log(`${COLORS.gray}${thinDivider}${COLORS.reset}`);

    // UI Action - what actually happens
    if (data.isCorrect) {
      console.log(`${COLORS.bold}🎬 UI Action:${COLORS.reset} ${COLORS.green}Card closes → Spin for next card${COLORS.reset}`);
    } else {
      // Feedback (only shown for incorrect)
      const speakIcon = data.shouldSpeak ? `${COLORS.green}🔊` : `${COLORS.gray}🔇`;
      console.log(`${COLORS.bold}💬 Feedback:${COLORS.reset} "${COLORS.cyan}${data.feedback}${COLORS.reset}" ${speakIcon}${COLORS.reset}`);

      // Choices (only shown for incorrect + YELLOW+)
      if (data.safetyLevel >= 1 && data.choices.length > 0) {
        const choiceStr = data.choices.map(c => `${c.icon} ${c.label}`).join(' | ');
        console.log(`${COLORS.bold}🎭 Choices Shown:${COLORS.reset} ${choiceStr}`);
        console.log(`${COLORS.bold}🎤 Listening:${COLORS.reset} ${COLORS.red}PAUSED${COLORS.reset} (waiting for choice click)`);
      } else {
        console.log(`${COLORS.bold}🎬 UI Action:${COLORS.reset} ${COLORS.yellow}Waiting for retry${COLORS.reset}`);
        console.log(`${COLORS.bold}🎤 Listening:${COLORS.reset} ${COLORS.green}ACTIVE${COLORS.reset}`);
      }
    }

    console.log(`${COLORS.cyan}${divider}${COLORS.reset}\n`);
  },

  /**
   * Log a quick summary (for less verbose output)
   */
  logQuickSummary(data: Partial<SafetyGateLogData>): void {
    const levelColor = LEVEL_COLORS[data.safetyLevel ?? 0] || COLORS.white;
    const levelName = LEVEL_NAMES[data.safetyLevel ?? 0] || 'UNKNOWN';
    const levelEmoji = LEVEL_EMOJIS[data.safetyLevel ?? 0] || '⚪';
    const result = data.isCorrect ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.orange}✗${COLORS.reset}`;

    console.log(
      `${COLORS.gray}[SafetyGate]${COLORS.reset} ` +
      `${result} "${data.childSaid}" → ` +
      `${levelEmoji} ${levelColor}${levelName}${COLORS.reset} ` +
      `(E:${data.state?.engagement?.toFixed(1)} D:${data.state?.dysregulation?.toFixed(1)} Err:${data.state?.consecutiveErrors})`
    );
  },

  /**
   * Log safety level change
   */
  logLevelChange(from: number, to: number, reason: string): void {
    const fromColor = LEVEL_COLORS[from] || COLORS.white;
    const toColor = LEVEL_COLORS[to] || COLORS.white;
    const fromName = LEVEL_NAMES[from] || 'UNKNOWN';
    const toName = LEVEL_NAMES[to] || 'UNKNOWN';

    if (from !== to) {
      console.log(
        `${COLORS.bold}⚡ LEVEL CHANGE:${COLORS.reset} ` +
        `${fromColor}${fromName}${COLORS.reset} → ${toColor}${COLORS.bold}${toName}${COLORS.reset} ` +
        `${COLORS.dim}(${reason})${COLORS.reset}`
      );
    }
  },

  /**
   * Log intervention triggered
   */
  logIntervention(intervention: string, reason: string): void {
    console.log(
      `${COLORS.blue}🛠️  [Intervention]${COLORS.reset} ${COLORS.bold}${intervention}${COLORS.reset} - ${COLORS.dim}${reason}${COLORS.reset}`
    );
  },

  /**
   * Log bubble breathing start
   */
  logBubbleBreathingStart(): void {
    console.log(`${COLORS.cyan}🫧 [Bubble Breathing] Started regulation activity${COLORS.reset}`);
  },

  /**
   * Log grownup help requested
   */
  logGrownupHelp(): void {
    console.log(`${COLORS.red}${COLORS.bold}👋 [GROWNUP HELP] Adult assistance requested!${COLORS.reset}`);
  }
};

// Helper function to create visual bar
function formatBar(value: number, max: number, inverse: boolean = false): string {
  const filled = Math.round((value / max) * 10);
  const empty = 10 - filled;

  let color: string;
  if (inverse) {
    // For dysregulation/fatigue: high = bad (red), low = good (green)
    if (value >= 7) color = COLORS.red;
    else if (value >= 4) color = COLORS.yellow;
    else color = COLORS.green;
  } else {
    // For engagement: high = good (green), low = bad (red)
    if (value >= 7) color = COLORS.green;
    else if (value >= 4) color = COLORS.yellow;
    else color = COLORS.red;
  }

  return `${color}${'█'.repeat(filled)}${COLORS.gray}${'░'.repeat(empty)}${COLORS.reset}`;
}

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
