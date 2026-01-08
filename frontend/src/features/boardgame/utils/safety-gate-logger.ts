/**
 * Safety Gate Logger for Chrome Console
 * Mirrors the backend terminal logs with CSS styling for browser
 */

// CSS Styles for Chrome console
const STYLES = {
  // Headers
  header: 'background: #0891b2; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;',
  divider: 'color: #0891b2;',

  // Safety levels
  green: 'color: #22c55e; font-weight: bold;',
  yellow: 'color: #eab308; font-weight: bold;',
  orange: 'color: #f97316; font-weight: bold;',
  red: 'color: #ef4444; font-weight: bold;',

  // UI elements
  bold: 'font-weight: bold;',
  dim: 'color: #9ca3af;',
  cyan: 'color: #06b6d4;',
  blue: 'color: #3b82f6;',
  magenta: 'color: #d946ef;',
  white: 'color: #f3f4f6;',

  // Results
  correct: 'color: #22c55e; font-weight: bold;',
  incorrect: 'color: #f97316; font-weight: bold;',

  // Bars
  barGreen: 'color: #22c55e;',
  barYellow: 'color: #eab308;',
  barRed: 'color: #ef4444;',
  barEmpty: 'color: #6b7280;',
};

const LEVEL_STYLES: Record<number, string> = {
  0: STYLES.green,
  1: STYLES.yellow,
  2: STYLES.orange,
  3: STYLES.red,
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
  feedback: string;
  attemptNumber: number;
  responseHistory: string[];
  shouldSpeak?: boolean;
}

function formatBar(value: number, max: number, inverse: boolean = false): { text: string; style: string } {
  const filled = Math.round((value / max) * 10);
  const empty = 10 - filled;

  let style: string;
  if (inverse) {
    if (value >= 7) style = STYLES.barRed;
    else if (value >= 4) style = STYLES.barYellow;
    else style = STYLES.barGreen;
  } else {
    if (value >= 7) style = STYLES.barGreen;
    else if (value >= 4) style = STYLES.barYellow;
    else style = STYLES.barRed;
  }

  return {
    text: '█'.repeat(filled) + '░'.repeat(empty),
    style
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const safetyGateLogger = {
  /**
   * Log a complete safety gate session state (Chrome console version)
   */
  logSessionState(data: SafetyGateLogData): void {
    const levelStyle = LEVEL_STYLES[data.safetyLevel] || STYLES.white;
    const levelName = LEVEL_NAMES[data.safetyLevel] || 'UNKNOWN';
    const levelEmoji = LEVEL_EMOJIS[data.safetyLevel] || '⚪';

    const divider = '═'.repeat(50);
    const thinDivider = '─'.repeat(50);

    // Start collapsed group
    const groupTitle = `%c🛡️ SAFETY-GATE %c${levelEmoji} ${levelName}%c │ ${data.isCorrect ? '✅' : '❌'} "${data.childSaid}"`;
    console.groupCollapsed(groupTitle, STYLES.header, levelStyle, STYLES.dim);

    // Header
    console.log(`%c${divider}`, STYLES.divider);
    console.log('%c     SAFETY-GATE SESSION STATE', STYLES.header);
    console.log(`%c${divider}`, STYLES.divider);

    // Child's response
    console.log(`%c📝 Child said:%c "${data.childSaid}"`, STYLES.bold, STYLES.white);
    console.log(`%c🎯 Target answers:%c [${data.targetAnswers.join(', ')}]`, STYLES.bold, STYLES.dim);

    // Correct/Incorrect
    if (data.isCorrect) {
      console.log('%c✅ CORRECT', STYLES.correct);
    } else {
      console.log('%c❌ INCORRECT', STYLES.incorrect);
    }

    console.log(`%c${thinDivider}`, STYLES.dim);

    // Safety Level
    console.log(`%c🚦 Safety Level:%c ${levelEmoji} %c${levelName}`, STYLES.bold, '', levelStyle);

    // Signals
    if (data.signals.length > 0) {
      console.log(`%c📡 Signals Detected:%c ${data.signals.join(', ')}`, STYLES.bold, STYLES.magenta);
    }

    // Interventions
    if (data.interventions.length > 0) {
      const interventionNames = data.interventions.map(i => i.toUpperCase()).join(', ');
      console.log(`%c🛠️  Interventions (${data.interventions.length}):%c ${interventionNames}`, STYLES.bold, STYLES.blue);
    } else {
      console.log(`%c🛠️  Interventions:%c none`, STYLES.bold, STYLES.dim);
    }

    console.log(`%c${thinDivider}`, STYLES.dim);

    // Child State with visual bars
    console.log('%c📊 Child State:', STYLES.bold);

    const engBar = formatBar(data.state.engagement, 10, false);
    const dysBar = formatBar(data.state.dysregulation, 10, true);
    const fatBar = formatBar(data.state.fatigue, 10, true);

    console.log(`   %cEngagement:%c        %c${engBar.text}%c ${data.state.engagement.toFixed(1)}/10`,
      STYLES.dim, '', engBar.style, STYLES.dim);
    console.log(`   %cDysregulation:%c     %c${dysBar.text}%c ${data.state.dysregulation.toFixed(1)}/10`,
      STYLES.dim, '', dysBar.style, STYLES.dim);
    console.log(`   %cFatigue:%c           %c${fatBar.text}%c ${data.state.fatigue.toFixed(1)}/10`,
      STYLES.dim, '', fatBar.style, STYLES.dim);
    console.log(`   %cConsecutive Errors:%c ${data.state.consecutiveErrors}`, STYLES.dim, STYLES.bold);

    console.log(`%c${thinDivider}`, STYLES.dim);

    // Attempt info
    console.log(`%c🔄 Attempt:%c #${data.attemptNumber}`, STYLES.bold, '');

    // Response history
    const recentHistory = data.responseHistory.slice(-5);
    if (recentHistory.length > 0) {
      console.log(`%c📜 Recent History:%c [${recentHistory.join(' → ')}]`, STYLES.bold, STYLES.dim);
    }

    console.log(`%c⏱️  Session Duration:%c ${formatTime(data.state.timeInSession)}`, STYLES.bold, '');

    console.log(`%c${thinDivider}`, STYLES.dim);

    // UI Action
    if (data.isCorrect) {
      console.log(`%c🎬 UI Action:%c Card closes → Spin for next card`, STYLES.bold, STYLES.correct);
    } else {
      const speakIcon = data.shouldSpeak ? '🔊' : '🔇';
      console.log(`%c💬 Feedback:%c "${data.feedback}" ${speakIcon}`, STYLES.bold, STYLES.cyan);

      if (data.safetyLevel >= 1 && data.interventions.length > 0) {
        console.log(`%c🎤 Listening:%c PAUSED%c (waiting for intervention selection)`, STYLES.bold, STYLES.red, STYLES.dim);
      } else {
        console.log(`%c🎬 UI Action:%c Waiting for retry`, STYLES.bold, STYLES.yellow);
        console.log(`%c🎤 Listening:%c ACTIVE`, STYLES.bold, STYLES.correct);
      }
    }

    console.log(`%c${divider}`, STYLES.divider);
    console.groupEnd();
  },

  /**
   * Log a quick summary (one line)
   */
  logQuickSummary(data: Partial<SafetyGateLogData>): void {
    const levelStyle = LEVEL_STYLES[data.safetyLevel ?? 0] || STYLES.white;
    const levelName = LEVEL_NAMES[data.safetyLevel ?? 0] || 'UNKNOWN';
    const levelEmoji = LEVEL_EMOJIS[data.safetyLevel ?? 0] || '⚪';
    const result = data.isCorrect ? '✓' : '✗';
    const resultStyle = data.isCorrect ? STYLES.correct : STYLES.incorrect;

    console.log(
      `%c[SafetyGate]%c ${result} %c"${data.childSaid}" → %c${levelEmoji} ${levelName}%c (E:${data.state?.engagement?.toFixed(1)} D:${data.state?.dysregulation?.toFixed(1)} Err:${data.state?.consecutiveErrors})`,
      STYLES.dim,
      resultStyle,
      '',
      levelStyle,
      STYLES.dim
    );
  },

  /**
   * Log safety level change
   */
  logLevelChange(from: number, to: number, reason: string): void {
    if (from !== to) {
      const fromStyle = LEVEL_STYLES[from] || STYLES.white;
      const toStyle = LEVEL_STYLES[to] || STYLES.white;
      const fromName = LEVEL_NAMES[from] || 'UNKNOWN';
      const toName = LEVEL_NAMES[to] || 'UNKNOWN';

      console.log(
        `%c⚡ LEVEL CHANGE:%c ${fromName} %c→ %c${toName}%c (${reason})`,
        STYLES.bold,
        fromStyle,
        STYLES.dim,
        toStyle,
        STYLES.dim
      );
    }
  },

  /**
   * Log intervention selection
   */
  logInterventionSelected(action: string): void {
    console.log(
      `%c🎯 [Intervention Selected]%c ${action}`,
      STYLES.blue,
      STYLES.bold
    );
  },

  /**
   * Log bubble breathing start
   */
  logBubbleBreathingStart(): void {
    console.log('%c🫧 [Bubble Breathing] Started regulation activity', STYLES.cyan);
  },

  /**
   * Log grownup help requested
   */
  logGrownupHelp(): void {
    console.log('%c👋 [GROWNUP HELP] Adult assistance requested!', STYLES.red);
  }
};
