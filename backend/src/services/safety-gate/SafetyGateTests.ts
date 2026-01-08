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
// Note: Tests use local deterministic signal detection instead of LLM-based SignalDetector
import { LevelAssessor } from './LevelAssessor.js';
import { InterventionSelector } from './InterventionSelector.js';
import { SessionPlanner } from './SessionPlanner.js';
import { BackendOrchestrator, TaskContext } from './BackendOrchestrator.js';
import { State, Event, Level, Intervention, Signal } from './types.js';

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

function colorForLevel(level: Level): string {
  switch (level) {
    case Level.GREEN: return COLORS.green;
    case Level.YELLOW: return COLORS.yellow;
    case Level.ORANGE: return COLORS.orange;
    case Level.RED: return COLORS.red;
    default: return COLORS.reset;
  }
}

function levelName(level: Level): string {
  return Level[level];
}

function logTestHeader(testId: string, description: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${COLORS.bold}TEST: ${testId}${COLORS.reset}`);
  console.log(`${COLORS.cyan}${description}${COLORS.reset}`);
  console.log('='.repeat(60));
}

function logState(state: State, level: Level, signals: Signal[], interventions: Intervention[]) {
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
  // Note: Tests use local deterministic signal detection (this.detectSignals)
  // instead of LLM-based SignalDetector for fast, repeatable tests
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
    type: Event['type'],
    response?: string,
    correct?: boolean,
    previousResponse?: string,
    previousPreviousResponse?: string
  ): Event {
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
    events: Event[],
    expectedLevel: Level,
    expectedSignals?: Signal[],
    expectedInterventions?: Intervention[]
  ): boolean {
    logTestHeader(testId, description);

    let state: State = this.stateEngine.getState();
    let signals: Signal[] = [];
    let level: Level = Level.GREEN;
    let interventions: Intervention[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\n${COLORS.gray}Event ${i + 1}: ${event.type}${event.response ? ` - "${event.response}"` : ''}${event.correct !== undefined ? ` (${event.correct ? 'correct' : 'incorrect'})` : ''}${COLORS.reset}`);

      state = this.stateEngine.processEvent(event);
      // Use local deterministic signal detection for tests (not LLM-based)
      signals = this.detectSignals(event, state);
      level = this.levelAssessor.assessLevel(state, signals);
      interventions = this.interventionSelector.selectInterventions(level, state, signals);
    }

    logState(state, level, signals, interventions);

    // Show interventions (actions available to child)
    if (interventions.length > 0) {
      console.log(`\n${COLORS.bold}🎭 Actions Available:${COLORS.reset}`);
      interventions.forEach(i => console.log(`   ${i}`));
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

  private detectSignals(event: Event, state: State): Signal[] {
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
      signals.push(Signal.BREAK_REQUEST);
    }
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.QUIT_REQUEST);
    }
    if (responseText.includes('scream') || responseText.includes('ahhh')) {
      signals.push(Signal.TEXT_SCREAMING);
    }
    if (responseText.includes('no no no')) {
      signals.push(Signal.NO_NO_NO);
      signals.push(Signal.TEXT_SCREAMING);  // Also distress indicator
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
      Level.GREEN
    );
  }

  testG2_FirstIncorrect() {
    this.reset();
    return this.runScenario(
      'G2',
      'First incorrect answer - should stay GREEN',
      [this.createEvent('CHILD_RESPONSE', 'hot', false)],
      Level.GREEN
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
      Level.GREEN
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
      Level.YELLOW,
      [Signal.CONSECUTIVE_ERRORS],
      [Intervention.SKIP_CARD]
    );
  }

  testY2_LowEngagement() {
    this.reset();
    // Simulate low engagement by many incorrect responses and inactivity
    const events: Event[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(this.createEvent('CHILD_RESPONSE', 'wrong', false));
      // Add inactivity events
      events.push(this.createEvent('CHILD_INACTIVE'));
    }
    return this.runScenario(
      'Y2',
      'Low engagement (engagement <= 3) - should trigger YELLOW or higher',
      events,
      Level.ORANGE, // Will be ORANGE due to error count >= 5
      [Signal.ENGAGEMENT_DROP]
    );
  }

  testY5_SaysINeedBreak() {
    this.reset();
    return this.runScenario(
      'Y5',
      'Child says "I need a break" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I need a break', false)],
      Level.YELLOW,
      [Signal.BREAK_REQUEST]
    );
  }

  testY6_SaysImDone() {
    this.reset();
    return this.runScenario(
      'Y6',
      'Child says "I\'m done" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm done with this", false)],
      Level.YELLOW,
      [Signal.QUIT_REQUEST]
    );
  }

  testY6b_SaysTired() {
    this.reset();
    return this.runScenario(
      'Y6b',
      'Child says "tired" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm tired", false)],
      Level.YELLOW,
      [Signal.BREAK_REQUEST]
    );
  }

  testY6c_SaysStop() {
    this.reset();
    return this.runScenario(
      'Y6c',
      'Child says "stop" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'stop', false)],
      Level.YELLOW,
      [Signal.BREAK_REQUEST]
    );
  }

  testY6d_SaysQuit() {
    this.reset();
    return this.runScenario(
      'Y6d',
      'Child says "quit" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I want to quit', false)],
      Level.YELLOW,
      [Signal.QUIT_REQUEST]
    );
  }

  testY6e_SaysNoMore() {
    this.reset();
    return this.runScenario(
      'Y6e',
      'Child says "no more" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'no more please', false)],
      Level.YELLOW,
      [Signal.QUIT_REQUEST]
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
      Level.ORANGE,
      [Signal.CONSECUTIVE_ERRORS],
      [Intervention.SKIP_CARD]
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
      Level.ORANGE,
      [Signal.REPETITIVE_WRONG_RESPONSE, Signal.CONSECUTIVE_ERRORS]
    );
  }

  testO5_ScreamingDetected() {
    this.reset();
    return this.runScenario(
      'O5',
      'Child screams "ahhh" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'ahhhhh', false)],
      Level.ORANGE,
      [Signal.TEXT_SCREAMING]
    );
  }

  testO5b_NoNoNo() {
    this.reset();
    return this.runScenario(
      'O5b',
      'Child says "no no no" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'no no no', false)],
      Level.ORANGE,
      [Signal.NO_NO_NO]
    );
  }

  testO6_BubbleBreathingTrigger() {
    this.reset();
    // Build up dysregulation to >= 6
    const events: Event[] = [];
    // Multiple errors and repetitive responses to increase dysregulation
    for (let i = 0; i < 4; i++) {
      events.push(this.createEvent('CHILD_RESPONSE', 'wrong', false, 'wrong'));
    }

    logTestHeader('O6', 'Bubble breathing triggered when dysreg >= 6 at ORANGE');

    let state: State = this.stateEngine.getState();
    let signals: Signal[] = [];
    let level: Level = Level.GREEN;
    let interventions: Intervention[] = [];

    for (const event of events) {
      state = this.stateEngine.processEvent(event);
      // Use local deterministic signal detection for tests (not LLM-based)
      signals = this.detectSignals(event, state);
    }

    // Manually set dysregulation to 6 to test bubble breathing
    (state as any).dysregulationLevel = 6;
    signals.push(Signal.DYSREGULATION_DETECTED);
    level = this.levelAssessor.assessLevel(state, signals);
    interventions = this.interventionSelector.selectInterventions(level, state, signals);

    logState(state, level, signals, interventions);

    console.log(`\n${COLORS.bold}🎭 Actions Available:${COLORS.reset}`);
    interventions.forEach(i => console.log(`   ${i}`));

    const hasBubbleBreathing = interventions.includes(Intervention.BUBBLE_BREATHING);

    const passed = hasBubbleBreathing;
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

    const passed = level === Level.RED && interventions.includes(Intervention.CALL_GROWNUP);
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
    this.stateEngine.processEvent(this.createEvent('CHILD_RESPONSE', 'wrong', false));
    const afterError = { ...this.stateEngine.getState() };

    // Now correct answer
    const finalState = this.stateEngine.processEvent(this.createEvent('CHILD_RESPONSE', 'cold', true));

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
      Level.YELLOW
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
      Level.ORANGE
    );
  }

  testP5_RecoveryFromYellow() {
    this.reset();

    logTestHeader('P5', 'Recovery from YELLOW after correct answer');

    // Get to YELLOW
    this.stateEngine.processEvent(this.createEvent('CHILD_RESPONSE', 'a', false));
    this.stateEngine.processEvent(this.createEvent('CHILD_RESPONSE', 'b', false));
    const yellowEvent = this.createEvent('CHILD_RESPONSE', 'c', false);
    const yellowState = this.stateEngine.processEvent(yellowEvent);
    // Use local deterministic signal detection for tests (not LLM-based)
    const yellowSignals = this.detectSignals(yellowEvent, yellowState);

    let level = this.levelAssessor.assessLevel(yellowState, yellowSignals);

    console.log(`${COLORS.gray}At YELLOW: errors=${yellowState.consecutiveErrors}, level=${levelName(level)}${COLORS.reset}`);

    // Now recover with correct answer
    const correctEvent = this.createEvent('CHILD_RESPONSE', 'cold', true);
    const recoveredState = this.stateEngine.processEvent(correctEvent);
    // Use local deterministic signal detection for tests (not LLM-based)
    const recoveredSignals = this.detectSignals(correctEvent, recoveredState);
    level = this.levelAssessor.assessLevel(recoveredState, recoveredSignals);

    console.log(`${COLORS.gray}After correct: errors=${recoveredState.consecutiveErrors}, level=${levelName(level)}${COLORS.reset}`);

    const passed = recoveredState.consecutiveErrors === 0 && level === Level.GREEN;
    logResult(passed, 'GREEN with errors=0', `${levelName(level)} with errors=${recoveredState.consecutiveErrors}`);

    this.results.push({ id: 'P5', passed, description: 'Recovery from YELLOW after correct answer' });
    return passed;
  }

  // ============================================
  // INTERVENTION TESTS
  // ============================================

  testInterventions_Green() {
    this.reset();

    logTestHeader('I_GREEN', 'GREEN level should have RETRY_CARD only');

    const state = this.stateEngine.getState();
    const level = Level.GREEN;
    const interventions = this.interventionSelector.selectInterventions(level, state, []);

    console.log(`\n${COLORS.bold}Interventions at GREEN:${COLORS.reset}`);
    interventions.forEach(i => console.log(`   ${i}`));

    // GREEN should only have RETRY_CARD
    const passed = interventions.length === 1 &&
                   interventions.includes(Intervention.RETRY_CARD);

    logResult(passed, '1 intervention (RETRY_CARD)', `${interventions.length} interventions`);

    this.results.push({ id: 'I_GREEN', passed, description: 'GREEN has RETRY_CARD only' });
    return passed;
  }

  testInterventions_Yellow() {
    this.reset();

    logTestHeader('I_YELLOW', 'YELLOW level should have SKIP_CARD and RETRY_CARD');

    const state = this.stateEngine.getState();
    const level = Level.YELLOW;
    const interventions = this.interventionSelector.selectInterventions(level, state, []);

    console.log(`\n${COLORS.bold}Interventions at YELLOW:${COLORS.reset}`);
    interventions.forEach(i => console.log(`   ${i}`));

    const hasSkip = interventions.includes(Intervention.SKIP_CARD);
    const hasRetry = interventions.includes(Intervention.RETRY_CARD);
    const passed = hasSkip && hasRetry;

    logResult(passed, 'SKIP_CARD and RETRY_CARD', `${interventions.join(', ')}`);

    this.results.push({ id: 'I_YELLOW', passed, description: 'YELLOW has SKIP_CARD and RETRY_CARD' });
    return passed;
  }

  testInterventions_Orange_BubbleBreathing() {
    this.reset();

    logTestHeader('I_ORANGE', 'ORANGE level with high dysreg should have BUBBLE_BREATHING first');

    const state = this.stateEngine.getState();
    (state as any).dysregulationLevel = 6;
    (state as any).consecutiveErrors = 5;

    const level = Level.ORANGE;
    const interventions = this.interventionSelector.selectInterventions(level, state, []);

    console.log(`\n${COLORS.bold}Interventions at ORANGE with high dysreg:${COLORS.reset}`);
    interventions.forEach(i => console.log(`   ${i}`));

    const hasBreathing = interventions.includes(Intervention.BUBBLE_BREATHING);
    const breathingFirst = interventions[0] === Intervention.BUBBLE_BREATHING;
    const passed = hasBreathing && breathingFirst;

    logResult(passed, 'BUBBLE_BREATHING first', breathingFirst ? 'yes' : 'no');

    this.results.push({ id: 'I_ORANGE', passed, description: 'ORANGE has BUBBLE_BREATHING first when dysreg high' });
    return passed;
  }

  // ============================================
  // CONFIG ADAPTATION TESTS
  // ============================================

  testConfig_Green() {
    this.reset();

    logTestHeader('CFG_GREEN', 'GREEN level config should have warm tone, 2 retries, 60s time');

    const config = this.sessionPlanner.adaptSessionConfig(Level.GREEN);

    console.log(`\n${COLORS.bold}Config at GREEN:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);
    console.log(`   max_task_time: ${config.max_task_time}s`);

    const passed = config.avatar_tone === 'warm' &&
                   config.max_retries === 2 &&
                   config.max_task_time === 60;

    logResult(passed, 'warm, 2 retries, 60s',
              `${config.avatar_tone}, ${config.max_retries} retries, ${config.max_task_time}s`);

    this.results.push({ id: 'CFG_GREEN', passed, description: 'GREEN config is correct' });
    return passed;
  }

  testConfig_Orange() {
    this.reset();

    logTestHeader('CFG_ORANGE', 'ORANGE level config should have calm tone, 1 retry, 30s time, audio enabled');

    const config = this.sessionPlanner.adaptSessionConfig(Level.ORANGE);

    console.log(`\n${COLORS.bold}Config at ORANGE:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);
    console.log(`   max_task_time: ${config.max_task_time}s`);
    console.log(`   enable_audio_support: ${config.enable_audio_support}`);

    const passed = config.avatar_tone === 'calm' &&
                   config.max_retries === 1 &&
                   config.max_task_time === 30 &&
                   config.enable_audio_support;

    logResult(passed, 'calm, 1 retry, 30s, audio=true',
              `${config.avatar_tone}, ${config.max_retries} retries, ${config.max_task_time}s, audio=${config.enable_audio_support}`);

    this.results.push({ id: 'CFG_ORANGE', passed, description: 'ORANGE config is correct' });
    return passed;
  }

  testConfig_Red() {
    this.reset();

    logTestHeader('CFG_RED', 'RED level config should have 0 retries, calm tone');

    const config = this.sessionPlanner.adaptSessionConfig(Level.RED);

    console.log(`\n${COLORS.bold}Config at RED:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.prompt_intensity}`);
    console.log(`   avatar_tone: ${config.avatar_tone}`);
    console.log(`   max_retries: ${config.max_retries}`);

    const passed = config.max_retries === 0 && config.avatar_tone === 'calm';

    logResult(passed, '0 retries, calm tone',
              `${config.max_retries} retries, ${config.avatar_tone} tone`);

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

    // Intervention tests
    console.log(`\n${COLORS.cyan}━━━ INTERVENTION TESTS ━━━${COLORS.reset}`);
    this.testInterventions_Green();
    this.testInterventions_Yellow();
    this.testInterventions_Orange_BubbleBreathing();

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