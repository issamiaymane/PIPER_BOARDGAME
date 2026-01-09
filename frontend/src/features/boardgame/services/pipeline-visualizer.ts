/**
 * Pipeline Visualizer
 * Styled console output for safety-gate pipeline debugging
 * Mirrors the backend pipelineLogger format with CSS styling for browser
 */

// CSS Styles matching backend ANSI colors
const C = {
  reset: '',
  bold: 'font-weight: bold;',
  dim: 'color: #6b7280;',
  green: 'color: #22c55e; font-weight: bold;',
  yellow: 'color: #eab308; font-weight: bold;',
  orange: 'color: #f97316; font-weight: bold;',
  red: 'color: #ef4444; font-weight: bold;',
  cyan: 'color: #06b6d4;',
  blue: 'color: #3b82f6;',
  magenta: 'color: #d946ef;',
  white: 'color: #f3f4f6;',
  gray: 'color: #9ca3af;',
};

const LEVEL_INFO: Record<number, { style: string; name: string; emoji: string }> = {
  0: { style: C.green, name: 'GREEN', emoji: '🟢' },
  1: { style: C.yellow, name: 'YELLOW', emoji: '🟡' },
  2: { style: C.orange, name: 'ORANGE', emoji: '🟠' },
  3: { style: C.red, name: 'RED', emoji: '🔴' },
};

export interface PipelineLogData {
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
  feedback: string;
  attemptNumber: number;
  responseHistory: string[];
  shouldSpeak?: boolean;
  sessionConfig?: {
    promptIntensity: number;
    avatarTone: string;
    maxTaskTime: number;
    inactivityTimeout: number;
  };
}

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const pipelineVisualizer = {
  /**
   * Log complete pipeline flow (matches backend pipelineLogger.logFlow)
   */
  logSessionState(data: PipelineLogData): void {
    const level = LEVEL_INFO[data.safetyLevel] || LEVEL_INFO[0];
    const divider = '═'.repeat(60);
    const sectionDivider = '─'.repeat(60);

    console.log(`\n%c${divider}`, C.cyan);
    console.log('%c  SAFETY-GATE PIPELINE (Frontend)', `${C.bold} ${C.cyan}`);
    console.log(`%c${divider}`, C.cyan);

    // ─────────────────────────────────────────────────────────────
    // 1. EVENT (Input)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c1. EVENT (Input)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    console.log(`   Type:     %cCHILD_RESPONSE`, C.cyan);
    console.log(`   Response: %c"${data.childSaid}"`, C.white);
    console.log(`   Correct:  %c${data.isCorrect}`, data.isCorrect ? C.green : C.orange);
    console.log(`   Target:   %c[${data.targetAnswers.join(', ')}]`, C.green);

    // ─────────────────────────────────────────────────────────────
    // 2. SIGNALS (Detected from Event)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c2. SIGNALS (Detected from Event)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    if (data.signals.length > 0) {
      data.signals.forEach(signal => {
        console.log(`   %c⚡ ${signal}`, C.magenta);
      });
    } else {
      console.log(`   %c(no signals detected)`, C.dim);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. STATE (Updated)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c3. STATE (Updated)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);

    const engColor = data.state.engagement >= 7 ? C.green : data.state.engagement >= 4 ? C.yellow : C.red;
    const dysColor = data.state.dysregulation >= 6 ? C.red : data.state.dysregulation >= 3 ? C.yellow : C.green;
    const fatColor = data.state.fatigue >= 7 ? C.red : data.state.fatigue >= 4 ? C.yellow : C.green;

    console.log(`   Engagement:        %c${data.state.engagement.toFixed(1)}%c/10`, engColor, C.dim);
    console.log(`   Dysregulation:     %c${data.state.dysregulation.toFixed(1)}%c/10`, dysColor, C.dim);
    console.log(`   Fatigue:           %c${data.state.fatigue.toFixed(1)}%c/10`, fatColor, C.dim);
    console.log(`   ConsecutiveErrors: %c${data.state.consecutiveErrors}`, data.state.consecutiveErrors >= 3 ? C.red : C.white);
    console.log(`   TimeInSession:     ${formatTimeShort(data.state.timeInSession)}`);

    // ─────────────────────────────────────────────────────────────
    // 4. LEVEL (Assessed)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c4. LEVEL (Assessed from State + Signals)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    console.log(`   %c${level.emoji} ${level.name}`, level.style);

    // ─────────────────────────────────────────────────────────────
    // 5. INTERVENTIONS (Selected)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c5. INTERVENTIONS (Selected)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    if (data.interventions.length > 0) {
      data.interventions.forEach(intervention => {
        console.log(`   %c🛠️  ${intervention}`, C.blue);
      });
    } else {
      console.log(`   %c(no interventions)`, C.dim);
    }

    // ─────────────────────────────────────────────────────────────
    // 6. SESSION CONFIG (Adapted)
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c6. SESSION CONFIG (Adapted)`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    if (data.sessionConfig) {
      const intensityLabels = ['Minimal', 'Low', 'Medium', 'High'];
      console.log(`   promptIntensity:   ${data.sessionConfig.promptIntensity} (${intensityLabels[data.sessionConfig.promptIntensity] || 'Unknown'})`);
      console.log(`   avatarTone:        ${data.sessionConfig.avatarTone}`);
      console.log(`   maxTaskTime:       ${data.sessionConfig.maxTaskTime}s`);
      console.log(`   inactivityTimeout: ${data.sessionConfig.inactivityTimeout}s`);
    } else {
      console.log(`   %c(not available)`, C.dim);
    }

    // ─────────────────────────────────────────────────────────────
    // 7. ATTEMPT INFO
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c7. ATTEMPT INFO`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    console.log(`   Attempt #:   ${data.attemptNumber}`);
    const recentHistory = data.responseHistory.slice(-5);
    if (recentHistory.length > 0) {
      console.log(`   History:     [${recentHistory.join(' → ')}]`);
    }

    // ─────────────────────────────────────────────────────────────
    // 8. UI OUTPUT
    // ─────────────────────────────────────────────────────────────
    console.log(`\n%c8. UI OUTPUT`, C.bold);
    console.log(`%c${sectionDivider}`, C.gray);
    console.log(`   %cspeech.text:%c     "${data.feedback}"`, C.bold, C.cyan);

    if (data.isCorrect) {
      console.log(`   %caction:%c          Card closes → Next card`, C.bold, C.green);
    } else if (data.safetyLevel >= 1 && data.interventions.length > 0) {
      console.log(`   %caction:%c          Show interventions`, C.bold, C.yellow);
      console.log(`   %clistening:%c       PAUSED`, C.bold, C.red);
    } else {
      console.log(`   %caction:%c          Waiting for retry`, C.bold, C.yellow);
      console.log(`   %clistening:%c       ACTIVE`, C.bold, C.green);
    }

    console.log(`\n%c${divider}`, C.cyan);
  },

  /**
   * Log a quick summary (one line)
   */
  logQuickSummary(data: Partial<PipelineLogData>): void {
    const level = LEVEL_INFO[data.safetyLevel ?? 0] || LEVEL_INFO[0];
    const result = data.isCorrect ? '✓' : '✗';
    const resultStyle = data.isCorrect ? C.green : C.orange;

    console.log(
      `%c[SafetyGate]%c ${result} %c"${data.childSaid}" → %c${level.emoji} ${level.name}%c (E:${data.state?.engagement?.toFixed(1)} D:${data.state?.dysregulation?.toFixed(1)} Err:${data.state?.consecutiveErrors})`,
      C.dim,
      resultStyle,
      '',
      level.style,
      C.dim
    );
  },

  /**
   * Log safety level change
   */
  logLevelChange(from: number, to: number, reason: string): void {
    if (from !== to) {
      const fromLevel = LEVEL_INFO[from] || LEVEL_INFO[0];
      const toLevel = LEVEL_INFO[to] || LEVEL_INFO[0];

      console.log(
        `%c⚡ LEVEL CHANGE:%c ${fromLevel.name} %c→ %c${toLevel.name}%c (${reason})`,
        C.bold,
        fromLevel.style,
        C.dim,
        toLevel.style,
        C.dim
      );
    }
  },

  /**
   * Log intervention selection
   */
  logInterventionSelected(action: string): void {
    console.log(`%c🎯 [Intervention Selected]%c ${action}`, C.blue, C.bold);
  },

  /**
   * Log bubble breathing start
   */
  logBubbleBreathingStart(): void {
    console.log('%c🫧 [Bubble Breathing] Started regulation activity', C.cyan);
  },

  /**
   * Log grownup help requested
   */
  logGrownupHelp(): void {
    console.log('%c👋 [GROWNUP HELP] Adult assistance requested!', C.red);
  }
};
