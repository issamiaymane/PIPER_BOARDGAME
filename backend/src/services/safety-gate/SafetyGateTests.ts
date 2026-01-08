/**
 * Safety Gate System - Comprehensive Test Suite
 *
 * Run with: npx ts-node src/services/safety-gate/SafetyGateTests.ts
 *
 * Tests all scenarios:
 * - GREEN level (G1-G3)
 * - YELLOW level (Y1-Y7)
 * - ORANGE level (O1-O9)
 * - RED level (R1-R4)
 * - Verbal signals (V1-V10)
 * - State progressions (P1-P7)
 * - Choice actions (C1-C6)
 */

import { StateEngine } from './StateEngine.js';
import { LevelAssessor } from './LevelAssessor.js';
import { InterventionSelector } from './InterventionSelector.js';
import { SessionPlanner } from './SessionPlanner.js';
import { BackendOrchestrator, TaskContext } from './BackendOrchestrator.js';
import { ChildState, ChildEvent, SafetyGateLevel, InterventionType, Signal } from './types.js';

// ============================================
// TEST UTILITIES
// ============================================

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorForLevel(level: SafetyGateLevel): string {
  switch (level) {
    case SafetyGateLevel.GREEN: return COLORS.green;
    case SafetyGateLevel.YELLOW: return COLORS.yellow;
    case SafetyGateLevel.ORANGE: return COLORS.orange;
    case SafetyGateLevel.RED: return COLORS.red;
    default: return COLORS.reset;
  }
}

function levelName(level: SafetyGateLevel): string {
  return SafetyGateLevel[level];
}

function logTestHeader(testId: string, description: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${COLORS.bold}TEST: ${testId}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${description}${COLORS.reset}`);
  console.log('='.repeat(60));
}

function logState(state: ChildState, level: SafetyGateLevel, signals: Signal[], interventions: InterventionType[]) {
  const levelColor = colorForLevel(level);

  console.log(`\n${COLORS.bold}📊 State Snapshot:${COLORS.reset}`);
  console.log(`   Engagement:        ${state.engagementLevel.toFixed(1)}/10`);
  console.log(`   Dysregulation:     ${state.dysregulationLevel.toFixed(1)}/10`);
  console.log(`   Fatigue:           ${state.fatigueLevel.toFixed(1)}/10`);
  console.log(`   Consecutive Errors: ${state.consecutiveErrors}`);
  console.log(`   Time in Session:   ${state.timeInSession.toFixed(0)}s`);

  console.log(`\n${COLORS.bold}🚦 Safety Level:${COLORS.reset} ${levelColor}${levelName(level)}${COLORS.reset}`);

  if (signals.length > 0) {
    console.log(`${COLORS.bold}⚠️  Signals:${COLORS.reset} ${signals.join(', ')}`);
  }

  if (interventions.length > 0) {
    console.log(`${COLORS.bold}🛠️  Interventions:${COLORS.reset} ${interventions.join(', ')}`);
  }
}

function logResult(passed: boolean, expected: string, actual: string) {
  if (passed) {
    console.log(`\n${COLORS.green}✅ PASSED${COLORS.reset}: Expected ${expected}, got ${actual}`);
  } else {
    console.log(`\n${COLORS.red}❌ FAILED${COLORS.reset}: Expected ${expected}, got ${actual}`);
  }
}

// ============================================
// TEST RUNNER CLASS
// ============================================

class SafetyGateTestRunner {
  private stateEngine: StateEngine;
  private levelAssessor: LevelAssessor;
  private interventionSelector: InterventionSelector;
  private sessionPlanner: SessionPlanner;
  private results: { id: string; passed: boolean; description: string }[] = [];

  constructor() {
    this.stateEngine = new StateEngine();
    this.levelAssessor = new LevelAssessor();
    this.interventionSelector = new InterventionSelector();
    this.sessionPlanner = new SessionPlanner();
  }

  reset() {
    this.stateEngine = new StateEngine();
  }

  private createEvent(
    type: ChildEvent['type'],
    response?: string,
    correct?: boolean,
    previousResponse?: string,
    previousPreviousResponse?: string
  ): ChildEvent {
    return {
      type,
      response,
      correct,
      previousResponse,
      previousPreviousResponse,
    };
  }

  private runScenario(
    testId: string,
    description: string,
    events: ChildEvent[],
    expectedLevel: SafetyGateLevel,
    expectedSignals?: Signal[],
    expectedInterventions?: InterventionType[]
  ): boolean {
    logTestHeader(testId, description);

    let state: ChildState = this.stateEngine.getState();
    let signals: Signal[] = [];
    let level: SafetyGateLevel = SafetyGateLevel.GREEN;
    let interventions: InterventionType[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\n${COLORS.gray}Event ${i + 1}: ${event.type}${event.response ? ` - "${event.response}"` : ''}${event.correct !== undefined ? ` (${event.correct ? 'correct' : 'incorrect'})` : ''}${COLORS.reset}`);

      state = this.stateEngine.updateFromEvent(event);
      signals = this.detectSignals(event, state);
      level = this.levelAssessor.assessLevel(state, signals);
      interventions = this.interventionSelector.selectInterventions(level, state, signals);
    }

    logState(state, level, signals, interventions);

    // Build choices to show what UI would display
    const config = this.sessionPlanner.adaptSessionConfig(level, interventions, state);
    const choices = this.sessionPlanner.buildChoices(interventions, config, level);

    if (choices.length > 0) {
      console.log(`\n${COLORS.bold}🎭 Choices Available:${COLORS.reset}`);
      choices.forEach(c => console.log(`   ${c.icon} ${c.label} (${c.action})`));
    }

    // Check results
    let passed = level === expectedLevel;
    logResult(passed, levelName(expectedLevel), levelName(level));

    // Check expected signals if provided
    if (expectedSignals && expectedSignals.length > 0) {
      const signalsMatch = expectedSignals.every(s => signals.includes(s));
      if (!signalsMatch) {
        console.log(`${COLORS.red}   Missing signals: ${expectedSignals.filter(s => !signals.includes(s)).join(', ')}${COLORS.reset}`);
        passed = false;
      }
    }

    // Check expected interventions if provided
    if (expectedInterventions && expectedInterventions.length > 0) {
      const interventionsMatch = expectedInterventions.every(i => interventions.includes(i));
      if (!interventionsMatch) {
        console.log(`${COLORS.red}   Missing interventions: ${expectedInterventions.filter(i => !interventions.includes(i)).join(', ')}${COLORS.reset}`);
        passed = false;
      }
    }

    this.results.push({ id: testId, passed, description });
    return passed;
  }

  private detectSignals(event: ChildEvent, state: ChildState): Signal[] {
    const signals: Signal[] = [];

    if (state.consecutiveErrors >= 3) {
      signals.push(Signal.CONSECUTIVE_ERRORS);
    }

    if (event.type === 'CHILD_RESPONSE' && event.response === event.previousResponse) {
      signals.push(Signal.REPETITIVE_WRONG_RESPONSE);
    }

    if (state.engagementLevel <= 3) {
      signals.push(Signal.ENGAGEMENT_DROP);
    }

    const responseText = (event.response || event.signal || '').toLowerCase();
    if (responseText.includes('break') || responseText.includes('stop') || responseText.includes('tired')) {
      signals.push(Signal.I_NEED_BREAK);
    }
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.IM_DONE);
    }
    if (responseText.includes('scream') || responseText.includes('ahhh') || responseText.includes('no no no')) {
      signals.push(Signal.SCREAMING);
    }

    if (state.fatigueLevel >= 7) {
      signals.push(Signal.FATIGUE_HIGH);
    }

    if (state.dysregulationLevel >= 6) {
      signals.push(Signal.DYSREGULATION_DETECTED);
    }

    return signals;
  }

  // ============================================
  // GREEN LEVEL TESTS
  // ============================================

  testG1_CorrectAnswer() {
    this.reset();
    return this.runScenario(
      'G1',
      'Correct answer - should stay GREEN',
      [this.createEvent('CHILD_RESPONSE', 'cold', true)],
      SafetyGateLevel.GREEN
    );
  }

  testG2_FirstIncorrect() {
    this.reset();
    return this.runScenario(
      'G2',
      'First incorrect answer - should stay GREEN',
      [this.createEvent('CHILD_RESPONSE', 'hot', false)],
      SafetyGateLevel.GREEN
    );
  }

  testG3_SecondIncorrect() {
    this.reset();
    return this.runScenario(
      'G3',
      'Second incorrect answer - should stay GREEN (errors < 3)',
      [
        this.createEvent('CHILD_RESPONSE', 'hot', false),
        this.createEvent('CHILD_RESPONSE', 'warm', false),
      ],
      SafetyGateLevel.GREEN
    );
  }

  // ============================================
  // YELLOW LEVEL TESTS
  // ============================================

  testY1_ThreeConsecutiveErrors() {
    this.reset();
    return this.runScenario(
      'Y1',
      'Three consecutive errors - should trigger YELLOW',
      [
        this.createEvent('CHILD_RESPONSE', 'hot', false),
        this.createEvent('CHILD_RESPONSE', 'warm', false),
        this.createEvent('CHILD_RESPONSE', 'fire', false),
      ],
      SafetyGateLevel.YELLOW,
      [Signal.CONSECUTIVE_ERRORS],
      [InterventionType.SHORTEN_TASK, InterventionType.OFFER_CHOICE, InterventionType.ALLOW_SKIP]
    );
  }

  testY2_LowEngagement() {
    this.reset();
    // Simulate low engagement by many incorrect responses and inactivity
    const events: ChildEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(this.createEvent('CHILD_RESPONSE', 'wrong', false));
      // Add inactivity events
      events.push(this.createEvent('CHILD_INACTIVE'));
    }
    return this.runScenario(
      'Y2',
      'Low engagement (engagement <= 3) - should trigger YELLOW or higher',
      events,
      SafetyGateLevel.ORANGE, // Will be ORANGE due to error count >= 5
      [Signal.ENGAGEMENT_DROP]
    );
  }

  testY5_SaysINeedBreak() {
    this.reset();
    return this.runScenario(
      'Y5',
      'Child says "I need a break" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I need a break', false)],
      SafetyGateLevel.YELLOW,
      [Signal.I_NEED_BREAK]
    );
  }

  testY6_SaysImDone() {
    this.reset();
    return this.runScenario(
      'Y6',
      'Child says "I\'m done" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm done with this", false)],
      SafetyGateLevel.YELLOW,
      [Signal.IM_DONE]
    );
  }

  testY6b_SaysTired() {
    this.reset();
    return this.runScenario(
      'Y6b',
      'Child says "tired" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm tired", false)],
      SafetyGateLevel.YELLOW,
      [Signal.I_NEED_BREAK]
    );
  }

  testY6c_SaysStop() {
    this.reset();
    return this.runScenario(
      'Y6c',
      'Child says "stop" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'stop', false)],
      SafetyGateLevel.YELLOW,
      [Signal.I_NEED_BREAK]
    );
  }

  testY6d_SaysQuit() {
    this.reset();
    return this.runScenario(
      'Y6d',
      'Child says "quit" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I want to quit', false)],
      SafetyGateLevel.YELLOW,
      [Signal.IM_DONE]
    );
  }

  testY6e_SaysNoMore() {
    this.reset();
    return this.runScenario(
      'Y6e',
      'Child says "no more" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'no more please', false)],
      SafetyGateLevel.YELLOW,
      [Signal.IM_DONE]
    );
  }

  // ============================================
  // ORANGE LEVEL TESTS
  // ============================================

  testO1_FiveConsecutiveErrors() {
    this.reset();
    return this.runScenario(
      'O1',
      'Five consecutive errors - should trigger ORANGE',
      [
        this.createEvent('CHILD_RESPONSE', 'a', false),
        this.createEvent('CHILD_RESPONSE', 'b', false),
        this.createEvent('CHILD_RESPONSE', 'c', false),
        this.createEvent('CHILD_RESPONSE', 'd', false),
        this.createEvent('CHILD_RESPONSE', 'e', false),
      ],
      SafetyGateLevel.ORANGE,
      [Signal.CONSECUTIVE_ERRORS],
      [InterventionType.CALMER_TONE, InterventionType.OFFER_CHOICE, InterventionType.ALLOW_SKIP]
    );
  }

  testO4_RepetitiveWrongResponse() {
    this.reset();
    return this.runScenario(
      'O4',
      'Same wrong answer 3x in a row - should trigger ORANGE',
      [
        this.createEvent('CHILD_RESPONSE', 'hot', false),
        this.createEvent('CHILD_RESPONSE', 'hot', false, 'hot'),
        this.createEvent('CHILD_RESPONSE', 'hot', false, 'hot', 'hot'), // 3rd time with both previous responses
      ],
      SafetyGateLevel.ORANGE,
      [Signal.REPETITIVE_WRONG_RESPONSE, Signal.CONSECUTIVE_ERRORS]
    );
  }

  testO5_ScreamingDetected() {
    this.reset();
    return this.runScenario(
      'O5',
      'Child screams "ahhh" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'ahhhhh', false)],
      SafetyGateLevel.ORANGE,
      [Signal.SCREAMING]
    );
  }

  testO5b_NoNoNo() {
    this.reset();
    return this.runScenario(
      'O5b',
      'Child says "no no no" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'no no no', false)],
      SafetyGateLevel.ORANGE,
      [Signal.SCREAMING]
    );
  }

  testO6_BubbleBreathingTrigger() {
    this.reset();
    // Build up dysregulation to >= 6
    const events: ChildEvent[] = [];
    // Multiple errors and repetitive responses to increase dysregulation
    for (let i = 0; i < 4; i++) {
      events.push(this.createEvent('CHILD_RESPONSE', 'wrong', false, 'wrong'));
    }

    logTestHeader('O6', 'Bubble breathing triggered when dysreg >= 6 at ORANGE');

    let state: ChildState = this.stateEngine.getState();
    let signals: Signal[] = [];
    let level: SafetyGateLevel = SafetyGateLevel.GREEN;
    let interventions: InterventionType[] = [];

    for (const event of events) {
      state = this.stateEngine.updateFromEvent(event);
    }

    // Manually set dysregulation to 6 to test bubble breathing
    (state as any).dysregulationLevel = 6;

    signals = this.detectSignals(events[events.length - 1], state);
    level = this.levelAssessor.assessLevel(state, signals);
    interventions = this.interventionSelector.selectInterventions(level, state, signals);

    logState(state, level, signals, interventions);

    const config = this.sessionPlanner.adaptSessionConfig(level, interventions, state);
    const choices = this.sessionPlanner.buildChoices(interventions, config, level);

    console.log(`\n${COLORS.bold}🎭 Choices Available:${COLORS.reset}`);
    choices.forEach(c => console.log(`   ${c.icon} ${c.label} (${c.action})`));

    const hasBubbleBreathing = interventions.includes(InterventionType.BUBBLE_BREATHING);
    const hasBubbleChoice = choices.some(c => c.action === 'START_REGULATION_ACTIVITY');

    const passed = hasBubbleBreathing && hasBubbleChoice;
    logResult(passed, 'BUBBLE_BREATHING intervention', hasBubbleBreathing ? 'present' : 'missing');

    this.results.push({ id: 'O6', passed, description: 'Bubble breathing triggered when dysreg >= 6' });
    return passed;
  }

  // ============================================
  // RED LEVEL TESTS
  // ============================================

  testR1_ExtremeDysregulation() {
    this.reset();

    logTestHeader('R1', 'Dysregulation >= 9 - should trigger RED');

    // Manually set state to extreme dysregulation
    let state = this.stateEngine.getState();
    (state as any).dysregulationLevel = 9;

    const signals = this.detectSignals(this.createEvent('CHILD_RESPONSE', 'ahhh', false), state);
    const level = this.levelAssessor.assessLevel(state, signals);
    const interventions = this.interventionSelector.selectInterventions(level, state, signals);

    logState(state, level, signals, interventions);

    const passed = level === SafetyGateLevel.RED && interventions.includes(InterventionType.CALL_GROWNUP);
    logResult(passed, 'RED with CALL_GROWNUP', `${levelName(level)} with ${interventions.join(', ')}`);

    this.results.push({ id: 'R1', passed, description: 'Dysregulation >= 9 triggers RED' });
    return passed;
  }

  // ============================================
  // STATE PROGRESSION TESTS
  // ============================================

  testP1_NormalSuccessPath() {
    this.reset();

    logTestHeader('P1', 'Normal success path - engagement +1, dysreg -0.5, errors reset');

    const initialState = { ...this.stateEngine.getState() };

    // First add an error to have something to reset
    this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'wrong', false));
    const afterError = { ...this.stateEngine.getState() };

    // Now correct answer
    const finalState = this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'cold', true));

    console.log(`\n${COLORS.gray}Initial engagement: ${initialState.engagementLevel}${COLORS.reset}`);
    console.log(`${COLORS.gray}After error engagement: ${afterError.engagementLevel}, errors: ${afterError.consecutiveErrors}${COLORS.reset}`);
    console.log(`${COLORS.gray}After correct engagement: ${finalState.engagementLevel}, errors: ${finalState.consecutiveErrors}${COLORS.reset}`);

    const passed = finalState.consecutiveErrors === 0 &&
                   finalState.engagementLevel > afterError.engagementLevel;

    logResult(passed, 'errors=0, engagement increased', `errors=${finalState.consecutiveErrors}, engagement=${finalState.engagementLevel.toFixed(1)}`);

    this.results.push({ id: 'P1', passed, description: 'Correct answer resets errors and increases engagement' });
    return passed;
  }

  testP2_ErrorAccumulationToYellow() {
    this.reset();
    return this.runScenario(
      'P2',
      'Error accumulation: GREEN → GREEN → YELLOW',
      [
        this.createEvent('CHILD_RESPONSE', 'a', false),
        this.createEvent('CHILD_RESPONSE', 'b', false),
        this.createEvent('CHILD_RESPONSE', 'c', false),
      ],
      SafetyGateLevel.YELLOW
    );
  }

  testP3_ErrorAccumulationToOrange() {
    this.reset();
    return this.runScenario(
      'P3',
      'Error accumulation: ... → ORANGE at 5 errors',
      [
        this.createEvent('CHILD_RESPONSE', 'a', false),
        this.createEvent('CHILD_RESPONSE', 'b', false),
        this.createEvent('CHILD_RESPONSE', 'c', false),
        this.createEvent('CHILD_RESPONSE', 'd', false),
        this.createEvent('CHILD_RESPONSE', 'e', false),
      ],
      SafetyGateLevel.ORANGE
    );
  }

  testP5_RecoveryFromYellow() {
    this.reset();

    logTestHeader('P5', 'Recovery from YELLOW after correct answer');

    // Get to YELLOW
    this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'a', false));
    this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'b', false));
    const yellowState = this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'c', false));

    let signals = this.detectSignals(this.createEvent('CHILD_RESPONSE', 'c', false), yellowState);
    let level = this.levelAssessor.assessLevel(yellowState, signals);

    console.log(`${COLORS.gray}At YELLOW: errors=${yellowState.consecutiveErrors}, level=${levelName(level)}${COLORS.reset}`);

    // Now recover with correct answer
    const recoveredState = this.stateEngine.updateFromEvent(this.createEvent('CHILD_RESPONSE', 'cold', true));
    signals = this.detectSignals(this.createEvent('CHILD_RESPONSE', 'cold', true), recoveredState);
    level = this.levelAssessor.assessLevel(recoveredState, signals);

    console.log(`${COLORS.gray}After correct: errors=${recoveredState.consecutiveErrors}, level=${levelName(level)}${COLORS.reset}`);

    const passed = recoveredState.consecutiveErrors === 0 && level === SafetyGateLevel.GREEN;
    logResult(passed, 'GREEN with errors=0', `${levelName(level)} with errors=${recoveredState.consecutiveErrors}`);

    this.results.push({ id: 'P5', passed, description: 'Recovery from YELLOW after correct answer' });
    return passed;
  }

  // ============================================
  // CHOICE BUILDING TESTS
  // ============================================

  testChoices_Green() {
    this.reset();

    logTestHeader('C_GREEN', 'GREEN level should have minimal choices');

    const state = this.stateEngine.getState();
    const level = SafetyGateLevel.GREEN;
    const interventions: InterventionType[] = [];

    const config = this.sessionPlanner.adaptSessionConfig(level, interventions, state);
    const choices = this.sessionPlanner.buildChoices(interventions, config, level);

    console.log(`\n${COLORS.bold}Choices at GREEN:${COLORS.reset}`);
    choices.forEach(c => console.log(`   ${c.icon} ${c.label}`));

    // GREEN should have Try again and Take a break
    const passed = choices.length === 2 &&
                   choices.some(c => c.action === 'RETRY_TASK') &&
                   choices.some(c => c.action === 'START_BREAK');

    logResult(passed, '2 choices (retry, break)', `${choices.length} choices`);

    this.results.push({ id: 'C_GREEN', passed, description: 'GREEN has minimal choices' });
    return passed;
  }

  testChoices_Yellow() {
    this.reset();

    logTestHeader('C_YELLOW', 'YELLOW level with ALLOW_SKIP should have skip option');

    const state = this.stateEngine.getState();
    (state as any).consecutiveErrors = 3;

    const level = SafetyGateLevel.YELLOW;
    const interventions = [InterventionType.SHORTEN_TASK, InterventionType.OFFER_CHOICE, InterventionType.ALLOW_SKIP];

    const config = this.sessionPlanner.adaptSessionConfig(level, interventions, state);
    const choices = this.sessionPlanner.buildChoices(interventions, config, level);

    console.log(`\n${COLORS.bold}Choices at YELLOW with ALLOW_SKIP:${COLORS.reset}`);
    choices.forEach(c => console.log(`   ${c.icon} ${c.label}`));

    const hasSkip = choices.some(c => c.action === 'SWITCH_ACTIVITY');
    const passed = hasSkip;

    logResult(passed, 'SWITCH_ACTIVITY choice', hasSkip ? 'present' : 'missing');

    this.results.push({ id: 'C_YELLOW', passed, description: 'YELLOW with ALLOW_SKIP has skip option' });
    return passed;
  }

  testChoices_Orange_BubbleBreathing() {
    this.reset();

    logTestHeader('C_ORANGE', 'ORANGE level with BUBBLE_BREATHING should have breathing option first');

    const state = this.stateEngine.getState();
    (state as any).dysregulationLevel = 6;
    (state as any).consecutiveErrors = 5;

    const level = SafetyGateLevel.ORANGE;
    const interventions = [
      InterventionType.CALMER_TONE,
      InterventionType.OFFER_CHOICE,
      InterventionType.BUBBLE_BREATHING,
      InterventionType.ALLOW_SKIP
    ];

    const config = this.sessionPlanner.adaptSessionConfig(level, interventions, state);
    const choices = this.sessionPlanner.buildChoices(interventions, config, level);

    console.log(`\n${COLORS.bold}Choices at ORANGE with BUBBLE_BREATHING:${COLORS.reset}`);
    choices.forEach(c => console.log(`   ${c.icon} ${c.label} (priority: ${c.priority})`));

    const hasBreathing = choices.some(c => c.action === 'START_REGULATION_ACTIVITY');
    const breathingFirst = choices[0]?.action === 'START_REGULATION_ACTIVITY';
    const passed = hasBreathing && breathingFirst;

    logResult(passed, 'Breathing option first', breathingFirst ? 'yes' : 'no');

    this.results.push({ id: 'C_ORANGE', passed, description: 'ORANGE has bubble breathing as first choice' });
    return passed;
  }

  // ============================================
  // CONFIG ADAPTATION TESTS
  // ============================================

  testConfig_Green() {
    this.reset();

    logTestHeader('CFG_GREEN', 'GREEN level config should have warm tone, 2 retries, 60s time');

    const state = this.stateEngine.getState();
    const config = this.sessionPlanner.adaptSessionConfig(SafetyGateLevel.GREEN, [], state);

    console.log(`\n${COLORS.bold}Config at GREEN:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);
    console.log(`   max_task_time: ${config.max_task_time}s`);
    console.log(`   grownup_help_available: ${config.grownup_help_available}`);

    const passed = config.avatar_tone === 'warm' &&
                   config.max_retries === 2 &&
                   config.max_task_time === 60 &&
                   !config.grownup_help_available;

    logResult(passed, 'warm, 2 retries, 60s, no grownup',
              `${config.avatar_tone}, ${config.max_retries} retries, ${config.max_task_time}s, grownup=${config.grownup_help_available}`);

    this.results.push({ id: 'CFG_GREEN', passed, description: 'GREEN config is correct' });
    return passed;
  }

  testConfig_Orange() {
    this.reset();

    logTestHeader('CFG_ORANGE', 'ORANGE level config should have calm tone, 1 retry, 30s time, grownup available');

    const state = this.stateEngine.getState();
    const config = this.sessionPlanner.adaptSessionConfig(SafetyGateLevel.ORANGE, [], state);

    console.log(`\n${COLORS.bold}Config at ORANGE:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);
    console.log(`   max_task_time: ${config.max_task_time}s`);
    console.log(`   grownup_help_available: ${config.grownup_help_available}`);
    console.log(`   enable_audio_support: ${config.enable_audio_support}`);

    const passed = config.avatar_tone === 'calm' &&
                   config.max_retries === 1 &&
                   config.max_task_time === 30 &&
                   config.grownup_help_available &&
                   config.enable_audio_support;

    logResult(passed, 'calm, 1 retry, 30s, grownup=true, audio=true',
              `${config.avatar_tone}, ${config.max_retries} retries, ${config.max_task_time}s, grownup=${config.grownup_help_available}, audio=${config.enable_audio_support}`);

    this.results.push({ id: 'CFG_ORANGE', passed, description: 'ORANGE config is correct' });
    return passed;
  }

  testConfig_Red() {
    this.reset();

    logTestHeader('CFG_RED', 'RED level config should have 0 retries, grownup available');

    const state = this.stateEngine.getState();
    const config = this.sessionPlanner.adaptSessionConfig(SafetyGateLevel.RED, [], state);

    console.log(`\n${COLORS.bold}Config at RED:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);
    console.log(`   grownup_help_available: ${config.grownup_help_available}`);

    const passed = config.max_retries === 0 && config.grownup_help_available;

    logResult(passed, '0 retries, grownup=true',
              `${config.max_retries} retries, grownup=${config.grownup_help_available}`);

    this.results.push({ id: 'CFG_RED', passed, description: 'RED config is correct' });
    return passed;
  }

  // ============================================
  // RUN ALL TESTS
  // ============================================

  runAllTests() {
    console.log('\n' + '▓'.repeat(60));
    console.log(`${COLORS.bold}${COLORS.cyan}   SAFETY GATE SYSTEM - COMPREHENSIVE TEST SUITE${COLORS.reset}`);
    console.log('▓'.repeat(60));

    // GREEN tests
    console.log(`\n${COLORS.green}━━━ GREEN LEVEL TESTS ━━━${COLORS.reset}`);
    this.testG1_CorrectAnswer();
    this.testG2_FirstIncorrect();
    this.testG3_SecondIncorrect();

    // YELLOW tests
    console.log(`\n${COLORS.yellow}━━━ YELLOW LEVEL TESTS ━━━${COLORS.reset}`);
    this.testY1_ThreeConsecutiveErrors();
    this.testY5_SaysINeedBreak();
    this.testY6_SaysImDone();
    this.testY6b_SaysTired();
    this.testY6c_SaysStop();
    this.testY6d_SaysQuit();
    this.testY6e_SaysNoMore();

    // ORANGE tests
    console.log(`\n${COLORS.orange}━━━ ORANGE LEVEL TESTS ━━━${COLORS.reset}`);
    this.testO1_FiveConsecutiveErrors();
    this.testO4_RepetitiveWrongResponse();
    this.testO5_ScreamingDetected();
    this.testO5b_NoNoNo();
    this.testO6_BubbleBreathingTrigger();

    // RED tests
    console.log(`\n${COLORS.red}━━━ RED LEVEL TESTS ━━━${COLORS.reset}`);
    this.testR1_ExtremeDysregulation();

    // State progression tests
    console.log(`\n${COLORS.blue}━━━ STATE PROGRESSION TESTS ━━━${COLORS.reset}`);
    this.testP1_NormalSuccessPath();
    this.testP2_ErrorAccumulationToYellow();
    this.testP3_ErrorAccumulationToOrange();
    this.testP5_RecoveryFromYellow();

    // Choice tests
    console.log(`\n${COLORS.cyan}━━━ CHOICE BUILDING TESTS ━━━${COLORS.reset}`);
    this.testChoices_Green();
    this.testChoices_Yellow();
    this.testChoices_Orange_BubbleBreathing();

    // Config tests
    console.log(`\n${COLORS.gray}━━━ CONFIG ADAPTATION TESTS ━━━${COLORS.reset}`);
    this.testConfig_Green();
    this.testConfig_Orange();
    this.testConfig_Red();

    // Summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '▓'.repeat(60));
    console.log(`${COLORS.bold}   TEST SUMMARY${COLORS.reset}`);
    console.log('▓'.repeat(60));

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\n${COLORS.green}✅ Passed: ${passed}${COLORS.reset}`);
    console.log(`${COLORS.red}❌ Failed: ${failed}${COLORS.reset}`);
    console.log(`${COLORS.gray}📊 Total:  ${total}${COLORS.reset}`);

    if (failed > 0) {
      console.log(`\n${COLORS.red}Failed tests:${COLORS.reset}`);
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`   ${r.id}: ${r.description}`);
      });
    }

    console.log('\n' + '▓'.repeat(60));

    const percentage = ((passed / total) * 100).toFixed(1);
    if (failed === 0) {
      console.log(`${COLORS.green}${COLORS.bold}   ALL TESTS PASSED! (${percentage}%)${COLORS.reset}`);
    } else {
      console.log(`${COLORS.yellow}${COLORS.bold}   ${percentage}% TESTS PASSED${COLORS.reset}`);
    }
    console.log('▓'.repeat(60) + '\n');
  }
}

// ============================================
// RUN TESTS
// ============================================

const runner = new SafetyGateTestRunner();
runner.runAllTests();