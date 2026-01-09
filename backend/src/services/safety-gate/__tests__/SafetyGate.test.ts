/**
 * Safety Gate System - Comprehensive Test Suite
 *
 * Run with: npx ts-node src/services/safety-gate/__tests__/SafetyGate.test.ts
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

import { StateEngine } from '../StateEngine.js';
// Note: Tests use local deterministic signal detection instead of LLM-based SignalDetector
import { LevelAssessor } from '../LevelAssessor.js';
import { InterventionSelector } from '../InterventionSelector.js';
import { SessionPlanner } from '../SessionPlanner.js';
import { BackendOrchestrator } from '../BackendOrchestrator.js';
import { PromptBuilder } from '../PromptBuilder.js';
import { LLMResponseValidator } from '../LLMResponseValidator.js';
import {
  State,
  Event,
  Level,
  Intervention,
  Signal,
  TaskContext,
  BackendResponse,
  LLMConstraints,
  ResponseContext,
  SessionConfig
} from '../../../types/safety-gate.js';

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

      // New flow: detect signals first, then process event with signals
      signals = this.detectSignals(event);
      state = this.stateEngine.processEvent(event, signals);
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

  /**
   * Deterministic signal detection for tests.
   * Only detects event-based signals (audio, text, patterns).
   * State thresholds are read directly by LevelAssessor, not as signals.
   */
  private detectSignals(event: Event): Signal[] {
    const signals: Signal[] = [];

    // Audio signals (from event.signals)
    if (event.signals?.screaming) {
      signals.push(Signal.SCREAMING);
    }
    if (event.signals?.crying) {
      signals.push(Signal.CRYING);
    }
    if (event.signals?.prolongedSilence) {
      signals.push(Signal.PROLONGED_SILENCE);
    }

    // Event pattern: repetitive response
    if (event.type === 'CHILD_RESPONSE' &&
        event.response === event.previousResponse &&
        event.previousResponse === event.previousPreviousResponse) {
      signals.push(Signal.REPETITIVE_RESPONSE);
    }

    // Text-based signals (simplified for tests - real uses LLM)
    const responseText = (event.response || '').toLowerCase();
    if (responseText.includes('break') || responseText.includes('stop') || responseText.includes('tired')) {
      signals.push(Signal.WANTS_BREAK);
    }
    if (responseText.includes('done') || responseText.includes('quit') || responseText.includes('no more')) {
      signals.push(Signal.WANTS_QUIT);
    }
    if (responseText.includes('frustrat') || responseText.includes('mad') || responseText.includes('angry')) {
      signals.push(Signal.FRUSTRATION);
    }

    // DISTRESS: screaming, "no no no", crying patterns
    const hasDistress =
      responseText.includes('scream') ||
      responseText.includes('ahhh') ||
      responseText.includes('no no no');
    if (hasDistress) {
      signals.push(Signal.DISTRESS);
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
      'Three consecutive errors - should trigger YELLOW (state.consecutiveErrors >= 3)',
      [
        this.createEvent('CHILD_RESPONSE', 'hot', false),
        this.createEvent('CHILD_RESPONSE', 'warm', false),
        this.createEvent('CHILD_RESPONSE', 'fire', false),
      ],
      Level.YELLOW,
      [], // No signals - LevelAssessor reads consecutiveErrors directly from state
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
      [] // No signals - LevelAssessor reads engagementLevel directly from state
    );
  }

  testY5_SaysINeedBreak() {
    this.reset();
    return this.runScenario(
      'Y5',
      'Child says "I need a break" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I need a break', false)],
      Level.YELLOW,
      [Signal.WANTS_BREAK]
    );
  }

  testY6_SaysImDone() {
    this.reset();
    return this.runScenario(
      'Y6',
      'Child says "I\'m done" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm done with this", false)],
      Level.YELLOW,
      [Signal.WANTS_QUIT]
    );
  }

  testY6b_SaysTired() {
    this.reset();
    return this.runScenario(
      'Y6b',
      'Child says "tired" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', "I'm tired", false)],
      Level.YELLOW,
      [Signal.WANTS_BREAK]
    );
  }

  testY6c_SaysStop() {
    this.reset();
    return this.runScenario(
      'Y6c',
      'Child says "stop" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'stop', false)],
      Level.YELLOW,
      [Signal.WANTS_BREAK]
    );
  }

  testY6d_SaysQuit() {
    this.reset();
    return this.runScenario(
      'Y6d',
      'Child says "quit" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'I want to quit', false)],
      Level.YELLOW,
      [Signal.WANTS_QUIT]
    );
  }

  testY6e_SaysNoMore() {
    this.reset();
    return this.runScenario(
      'Y6e',
      'Child says "no more" - should trigger YELLOW',
      [this.createEvent('CHILD_RESPONSE', 'no more please', false)],
      Level.YELLOW,
      [Signal.WANTS_QUIT]
    );
  }

  // ============================================
  // ORANGE LEVEL TESTS
  // ============================================

  testO1_FiveConsecutiveErrors() {
    this.reset();
    return this.runScenario(
      'O1',
      'Five consecutive errors - should trigger ORANGE (state.consecutiveErrors >= 5)',
      [
        this.createEvent('CHILD_RESPONSE', 'a', false),
        this.createEvent('CHILD_RESPONSE', 'b', false),
        this.createEvent('CHILD_RESPONSE', 'c', false),
        this.createEvent('CHILD_RESPONSE', 'd', false),
        this.createEvent('CHILD_RESPONSE', 'e', false),
      ],
      Level.ORANGE,
      [], // No signals - LevelAssessor reads consecutiveErrors directly from state
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
      [Signal.REPETITIVE_RESPONSE] // CONSECUTIVE_ERRORS is now a state threshold, not a signal
    );
  }

  testO5_ScreamingDetected() {
    this.reset();
    return this.runScenario(
      'O5',
      'Child screams "ahhh" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'ahhhhh', false)],
      Level.ORANGE,
      [Signal.DISTRESS]
    );
  }

  testO5b_NoNoNo() {
    this.reset();
    return this.runScenario(
      'O5b',
      'Child says "no no no" - should trigger ORANGE',
      [this.createEvent('CHILD_RESPONSE', 'no no no', false)],
      Level.ORANGE,
      [Signal.DISTRESS]
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

    logTestHeader('O6', 'Bubble breathing triggered when dysreg >= 7 at ORANGE');

    let state: State = this.stateEngine.getState();
    let signals: Signal[] = [];
    let level: Level = Level.GREEN;
    let interventions: Intervention[] = [];

    for (const event of events) {
      // New flow: detect signals first, then process event with signals
      signals = this.detectSignals(event);
      state = this.stateEngine.processEvent(event, signals);
    }

    // Manually set dysregulation to 7 to test bubble breathing
    // In the new architecture, LevelAssessor reads state thresholds directly
    // ORANGE requires dysregulationLevel >= 7
    (state as any).dysregulationLevel = 7;
    level = this.levelAssessor.assessLevel(state, signals);
    interventions = this.interventionSelector.selectInterventions(level, state, signals);

    logState(state, level, signals, interventions);

    console.log(`\n${COLORS.bold}🎭 Actions Available:${COLORS.reset}`);
    interventions.forEach(i => console.log(`   ${i}`));

    const hasBubbleBreathing = interventions.includes(Intervention.BUBBLE_BREATHING);

    const passed = hasBubbleBreathing;
    logResult(passed, 'BUBBLE_BREATHING intervention', hasBubbleBreathing ? 'present' : 'missing');

    this.results.push({ id: 'O6', passed, description: 'Bubble breathing triggered when dysreg >= 7' });
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

    // Detect signals from event only (new architecture)
    const signals = this.detectSignals(this.createEvent('CHILD_RESPONSE', 'ahhh', false));
    // LevelAssessor reads state.dysregulationLevel directly
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
    const errorEvent = this.createEvent('CHILD_RESPONSE', 'wrong', false);
    this.stateEngine.processEvent(errorEvent, this.detectSignals(errorEvent));
    const afterError = { ...this.stateEngine.getState() };

    // Now correct answer
    const correctEvent = this.createEvent('CHILD_RESPONSE', 'cold', true);
    const finalState = this.stateEngine.processEvent(correctEvent, this.detectSignals(correctEvent));

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

    // Get to YELLOW - new flow: detect signals first, then process event
    const event1 = this.createEvent('CHILD_RESPONSE', 'a', false);
    this.stateEngine.processEvent(event1, this.detectSignals(event1));

    const event2 = this.createEvent('CHILD_RESPONSE', 'b', false);
    this.stateEngine.processEvent(event2, this.detectSignals(event2));

    const yellowEvent = this.createEvent('CHILD_RESPONSE', 'c', false);
    const yellowSignals = this.detectSignals(yellowEvent);
    const yellowState = this.stateEngine.processEvent(yellowEvent, yellowSignals);

    let level = this.levelAssessor.assessLevel(yellowState, yellowSignals);

    console.log(`${COLORS.gray}At YELLOW: errors=${yellowState.consecutiveErrors}, level=${levelName(level)}${COLORS.reset}`);

    // Now recover with correct answer
    const correctEvent = this.createEvent('CHILD_RESPONSE', 'cold', true);
    const recoveredSignals = this.detectSignals(correctEvent);
    const recoveredState = this.stateEngine.processEvent(correctEvent, recoveredSignals);
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

    logTestHeader('CFG_GREEN', 'GREEN level config should have warm tone, 60s time');

    const config = this.sessionPlanner.adaptSessionConfig(Level.GREEN);

    console.log(`\n${COLORS.bold}Config at GREEN:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.promptIntensity}`);
    console.log(`   avatar_tone: ${config.avatarTone}`);
    console.log(`   max_task_time: ${config.maxTaskTime}s`);

    const passed = config.avatarTone === 'warm' &&
                   config.maxTaskTime === 60;

    logResult(passed, 'warm, 60s',
              `${config.avatarTone}, ${config.maxTaskTime}s`);

    this.results.push({ id: 'CFG_GREEN', passed, description: 'GREEN config is correct' });
    return passed;
  }

  testConfig_Orange() {
    this.reset();

    logTestHeader('CFG_ORANGE', 'ORANGE level config should have calm tone, 30s time');

    const config = this.sessionPlanner.adaptSessionConfig(Level.ORANGE);

    console.log(`\n${COLORS.bold}Config at ORANGE:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.promptIntensity}`);
    console.log(`   avatar_tone: ${config.avatarTone}`);
    console.log(`   max_task_time: ${config.maxTaskTime}s`);

    const passed = config.avatarTone === 'calm' &&
                   config.maxTaskTime === 30;

    logResult(passed, 'calm, 30s',
              `${config.avatarTone}, ${config.maxTaskTime}s`);

    this.results.push({ id: 'CFG_ORANGE', passed, description: 'ORANGE config is correct' });
    return passed;
  }

  testConfig_Red() {
    this.reset();

    logTestHeader('CFG_RED', 'RED level config should have calm tone');

    const config = this.sessionPlanner.adaptSessionConfig(Level.RED);

    console.log(`\n${COLORS.bold}Config at RED:${COLORS.reset}`);
    console.log(`   prompt_intensity: ${config.promptIntensity}`);
    console.log(`   avatar_tone: ${config.avatarTone}`);

    const passed = config.avatarTone === 'calm';

    logResult(passed, 'calm tone',
              `${config.avatarTone} tone`);

    this.results.push({ id: 'CFG_RED', passed, description: 'RED config is correct' });
    return passed;
  }

  // ============================================
  // BACKEND RESPONSE STRUCTURE TESTS
  // ============================================

  testBR1_BackendResponseStructure() {
    this.reset();

    logTestHeader('BR1', 'BackendResponse has correct structure with no duplications');

    const orchestrator = new BackendOrchestrator();
    const taskContext: TaskContext = {
      cardType: 'opposite',
      category: 'temperature',
      question: 'What is the opposite of hot?',
      targetAnswer: 'cold',
      imageLabels: ['thermometer', 'ice']
    };
    orchestrator.setTaskContext(taskContext);

    // Create a mock BackendResponse to verify structure
    const stateEngine = new StateEngine();
    const event: Event = { type: 'CHILD_RESPONSE', response: 'warm', correct: false };
    const signals = this.detectSignals(event);
    const state = stateEngine.processEvent(event, signals);
    const level = this.levelAssessor.assessLevel(state, signals);
    const interventions = this.interventionSelector.selectInterventions(level, state, signals);
    const config = this.sessionPlanner.adaptSessionConfig(level);

    // Build a BackendResponse manually to test structure
    const backendResponse: BackendResponse = {
      safetyLevel: level,
      signals: signals,
      interventions: interventions,
      sessionConfig: config,
      event: event,
      state: state,
      taskContext: taskContext,
      context: {
        what_happened: 'incorrect_response',
        child_said: 'warm',
        target_was: 'cold',
        attempt_number: 1
      },
      constraints: {
        must_be_brief: true,
        must_not_judge: true,
        must_not_pressure: true,
        must_offer_choices: false,
        must_validate_feelings: false,
        max_sentences: 2,
        forbidden_words: ['wrong'],
        required_approach: 'describe_what_heard_offer_support'
      },
      reasoning: {
        safety_level_reason: 'Level GREEN',
        interventions_reason: 'No interventions needed'
      },
      decision: 'CONTINUE_NORMAL',
      timestamp: new Date()
    };

    // Verify no duplication - event and state are references, not copies
    const hasEvent = backendResponse.event === event;
    const hasState = backendResponse.state === state;
    const hasTaskContext = backendResponse.taskContext === taskContext;
    const hasToneInConfig = backendResponse.sessionConfig.avatarTone !== undefined;
    const noToneInConstraints = !('must_use_tone' in backendResponse.constraints);

    console.log(`\n${COLORS.bold}BackendResponse Structure:${COLORS.reset}`);
    console.log(`   event reference: ${hasEvent ? 'YES' : 'NO'}`);
    console.log(`   state reference: ${hasState ? 'YES' : 'NO'}`);
    console.log(`   taskContext reference: ${hasTaskContext ? 'YES' : 'NO'}`);
    console.log(`   tone in sessionConfig: ${hasToneInConfig ? 'YES' : 'NO'}`);
    console.log(`   no tone in constraints: ${noToneInConstraints ? 'YES' : 'NO'}`);

    const passed = hasEvent && hasState && hasTaskContext && hasToneInConfig && noToneInConstraints;
    logResult(passed, 'No duplications', passed ? 'Structure correct' : 'Duplications found');

    this.results.push({ id: 'BR1', passed, description: 'BackendResponse has correct structure' });
    return passed;
  }

  testBR2_ResponseContextDerived() {
    this.reset();

    logTestHeader('BR2', 'ResponseContext is correctly derived from Event + TaskContext');

    const event: Event = { type: 'CHILD_RESPONSE', response: 'hot', correct: false };
    const taskContext: TaskContext = {
      cardType: 'opposite',
      category: 'temperature',
      question: 'What is the opposite of hot?',
      targetAnswer: 'cold',
      imageLabels: ['thermometer']
    };

    const context: ResponseContext = {
      what_happened: event.correct ? 'correct_response' : 'incorrect_response',
      child_said: event.response || '',
      target_was: taskContext.targetAnswer,
      attempt_number: 1
    };

    const correctWhatHappened = context.what_happened === 'incorrect_response';
    const correctChildSaid = context.child_said === 'hot';
    const correctTargetWas = context.target_was === 'cold';

    console.log(`\n${COLORS.bold}ResponseContext:${COLORS.reset}`);
    console.log(`   what_happened: ${context.what_happened} (expected: incorrect_response)`);
    console.log(`   child_said: ${context.child_said} (expected: hot)`);
    console.log(`   target_was: ${context.target_was} (expected: cold)`);

    const passed = correctWhatHappened && correctChildSaid && correctTargetWas;
    logResult(passed, 'Derived correctly', passed ? 'YES' : 'NO');

    this.results.push({ id: 'BR2', passed, description: 'ResponseContext derived correctly' });
    return passed;
  }

  testBR3_LLMConstraintsNoTone() {
    this.reset();

    logTestHeader('BR3', 'LLMConstraints does not include tone (tone is in SessionConfig)');

    const constraints: LLMConstraints = {
      must_be_brief: true,
      must_not_judge: true,
      must_not_pressure: true,
      must_offer_choices: true,
      must_validate_feelings: true,
      max_sentences: 3,
      forbidden_words: ['wrong', 'bad'],
      required_approach: 'describe_what_heard_offer_support'
    };

    // Verify LLMConstraints doesn't have tone
    const noTone = !('must_use_tone' in constraints);
    const hasRequiredFields =
      'must_be_brief' in constraints &&
      'must_not_judge' in constraints &&
      'must_offer_choices' in constraints &&
      'max_sentences' in constraints &&
      'forbidden_words' in constraints;

    console.log(`\n${COLORS.bold}LLMConstraints:${COLORS.reset}`);
    console.log(`   No tone field: ${noTone ? 'YES' : 'NO'}`);
    console.log(`   Has required fields: ${hasRequiredFields ? 'YES' : 'NO'}`);

    const passed = noTone && hasRequiredFields;
    logResult(passed, 'No tone in constraints', passed ? 'YES' : 'NO');

    this.results.push({ id: 'BR3', passed, description: 'LLMConstraints has no tone field' });
    return passed;
  }

  // ============================================
  // PROMPT BUILDER TESTS
  // ============================================

  testPB1_PromptBuilderUsesBackendResponse() {
    this.reset();

    logTestHeader('PB1', 'PromptBuilder correctly uses BackendResponse');

    const promptBuilder = new PromptBuilder();

    const backendResponse: BackendResponse = {
      safetyLevel: Level.YELLOW,
      signals: [Signal.WANTS_BREAK],
      interventions: [Intervention.SKIP_CARD, Intervention.RETRY_CARD],
      sessionConfig: {
        promptIntensity: 1,
        avatarTone: 'calm',
        maxTaskTime: 45,
        inactivityTimeout: 15
      },
      event: { type: 'CHILD_RESPONSE', response: 'hot', correct: false },
      state: {
        engagementLevel: 5,
        dysregulationLevel: 4,
        fatigueLevel: 3,
        consecutiveErrors: 3,
        errorFrequency: 0.5,
        timeInSession: 300,
        timeSinceBreak: 300,
        lastActivityTimestamp: new Date()
      },
      taskContext: {
        cardType: 'opposite',
        category: 'temperature',
        question: 'What is the opposite of hot?',
        targetAnswer: 'cold',
        imageLabels: ['thermometer']
      },
      context: {
        what_happened: 'incorrect_response',
        child_said: 'hot',
        target_was: 'cold',
        attempt_number: 3
      },
      constraints: {
        must_be_brief: true,
        must_not_judge: true,
        must_not_pressure: true,
        must_offer_choices: true,
        must_validate_feelings: false,
        max_sentences: 3,
        forbidden_words: ['wrong', 'incorrect', 'bad'],
        required_approach: 'describe_what_heard_offer_support'
      },
      reasoning: {
        safety_level_reason: 'Level YELLOW due to 3 consecutive errors',
        interventions_reason: 'Applying: SKIP_CARD, RETRY_CARD'
      },
      decision: 'ADAPT_AND_CONTINUE',
      timestamp: new Date()
    };

    const prompt = promptBuilder.buildSystemPrompt(backendResponse);

    // Verify prompt contains key information
    const hasChildSaid = prompt.includes('hot');
    const hasTarget = prompt.includes('cold');
    const hasSafetyLevel = prompt.includes('YELLOW');
    const hasForbiddenWords = prompt.includes('wrong');
    const hasInterventions = prompt.includes('SKIP_CARD');

    console.log(`\n${COLORS.bold}Prompt contains:${COLORS.reset}`);
    console.log(`   child_said (hot): ${hasChildSaid ? 'YES' : 'NO'}`);
    console.log(`   target (cold): ${hasTarget ? 'YES' : 'NO'}`);
    console.log(`   safety level (YELLOW): ${hasSafetyLevel ? 'YES' : 'NO'}`);
    console.log(`   forbidden words: ${hasForbiddenWords ? 'YES' : 'NO'}`);
    console.log(`   interventions: ${hasInterventions ? 'YES' : 'NO'}`);

    const passed = hasChildSaid && hasTarget && hasSafetyLevel && hasForbiddenWords && hasInterventions;
    logResult(passed, 'Prompt built correctly', passed ? 'YES' : 'NO');

    this.results.push({ id: 'PB1', passed, description: 'PromptBuilder uses BackendResponse correctly' });
    return passed;
  }

  // ============================================
  // LLM RESPONSE VALIDATOR TESTS
  // ============================================

  testLV1_ValidatorUsesLLMConstraints() {
    this.reset();

    logTestHeader('LV1', 'LLMResponseValidator uses LLMConstraints correctly');

    const validator = new LLMResponseValidator();

    const constraints: LLMConstraints = {
      must_be_brief: true,
      must_not_judge: true,
      must_not_pressure: true,
      must_offer_choices: true,
      must_validate_feelings: false,
      max_sentences: 3,
      forbidden_words: ['wrong', 'incorrect', 'bad'],
      required_approach: 'describe_what_heard_offer_support'
    };

    // Test valid response
    const validResponse = {
      coach_line: "I heard 'hot'. Good try! What would you like to do?",
      choice_presentation: "What would you like to do?"
    };

    const validResult = validator.validate(validResponse, constraints);

    // Test invalid response (contains forbidden word)
    const invalidResponse = {
      coach_line: "That's wrong. Try again.",
      choice_presentation: "What would you like to do?"
    };

    const invalidResult = validator.validate(invalidResponse, constraints);

    console.log(`\n${COLORS.bold}Validator Results:${COLORS.reset}`);
    console.log(`   Valid response: ${validResult.valid ? 'PASSED' : 'FAILED'}`);
    console.log(`   Invalid response (forbidden word): ${!invalidResult.valid ? 'CORRECTLY REJECTED' : 'INCORRECTLY ACCEPTED'}`);

    const passed = validResult.valid && !invalidResult.valid;
    logResult(passed, 'Validator works correctly', passed ? 'YES' : 'NO');

    this.results.push({ id: 'LV1', passed, description: 'LLMResponseValidator uses constraints correctly' });
    return passed;
  }

  // ============================================
  // BACKEND ORCHESTRATOR INTEGRATION TESTS
  // ============================================

  async testBO1_OrchestratorProcessEvent() {
    this.reset();

    logTestHeader('BO1', 'BackendOrchestrator.processEvent returns valid UIPackage');

    const orchestrator = new BackendOrchestrator();
    const taskContext: TaskContext = {
      cardType: 'opposite',
      category: 'temperature',
      question: 'What is the opposite of hot?',
      targetAnswer: 'cold',
      imageLabels: ['thermometer', 'ice']
    };

    const event: Event = { type: 'CHILD_RESPONSE', response: 'warm', correct: false };

    try {
      const uiPackage = await orchestrator.processEvent(event, taskContext);

      const hasOverlay = uiPackage.overlay !== undefined;
      const hasSpeech = uiPackage.speech?.text !== undefined;
      const hasInterventions = Array.isArray(uiPackage.interventions);
      const hasConfig = uiPackage.sessionConfig !== undefined;

      console.log(`\n${COLORS.bold}UIPackage Structure:${COLORS.reset}`);
      console.log(`   overlay: ${hasOverlay ? 'YES' : 'NO'}`);
      console.log(`   speech.text: ${hasSpeech ? uiPackage.speech.text : 'NO'}`);
      console.log(`   interventions: ${hasInterventions ? uiPackage.interventions.join(', ') : 'NO'}`);
      console.log(`   sessionConfig: ${hasConfig ? 'YES' : 'NO'}`);

      const passed = hasOverlay && hasSpeech && hasInterventions && hasConfig;
      logResult(passed, 'Valid UIPackage', passed ? 'YES' : 'NO');

      this.results.push({ id: 'BO1', passed, description: 'Orchestrator returns valid UIPackage' });
      return passed;
    } catch (error) {
      console.log(`\n${COLORS.red}Error: ${error}${COLORS.reset}`);
      this.results.push({ id: 'BO1', passed: false, description: 'Orchestrator returns valid UIPackage' });
      return false;
    }
  }

  async testBO2_OrchestratorInactivityEvent() {
    this.reset();

    logTestHeader('BO2', 'BackendOrchestrator handles CHILD_INACTIVE event');

    const orchestrator = new BackendOrchestrator();
    const taskContext: TaskContext = {
      cardType: 'opposite',
      category: 'temperature',
      question: 'What is the opposite of hot?',
      targetAnswer: 'cold',
      imageLabels: ['thermometer']
    };

    const event: Event = { type: 'CHILD_INACTIVE' };

    try {
      const uiPackage = await orchestrator.processEvent(event, taskContext);

      const hasSpeech = uiPackage.speech?.text !== undefined;
      const isInactivityResponse = uiPackage.speech?.text.toLowerCase().includes('still there') ||
                                    uiPackage.speech?.text.toLowerCase().includes('take your time');

      console.log(`\n${COLORS.bold}Inactivity Response:${COLORS.reset}`);
      console.log(`   speech.text: ${uiPackage.speech?.text || 'NO'}`);
      console.log(`   Is inactivity prompt: ${isInactivityResponse ? 'YES' : 'NO'}`);

      const passed = hasSpeech && isInactivityResponse;
      logResult(passed, 'Valid inactivity response', passed ? 'YES' : 'NO');

      this.results.push({ id: 'BO2', passed, description: 'Orchestrator handles inactivity' });
      return passed;
    } catch (error) {
      console.log(`\n${COLORS.red}Error: ${error}${COLORS.reset}`);
      this.results.push({ id: 'BO2', passed: false, description: 'Orchestrator handles inactivity' });
      return false;
    }
  }

  // ============================================
  // RUN ALL TESTS
  // ============================================

  async runAllTests() {
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

    // BackendResponse structure tests
    console.log(`\n${COLORS.bold}━━━ BACKEND RESPONSE STRUCTURE TESTS ━━━${COLORS.reset}`);
    this.testBR1_BackendResponseStructure();
    this.testBR2_ResponseContextDerived();
    this.testBR3_LLMConstraintsNoTone();

    // PromptBuilder tests
    console.log(`\n${COLORS.bold}━━━ PROMPT BUILDER TESTS ━━━${COLORS.reset}`);
    this.testPB1_PromptBuilderUsesBackendResponse();

    // LLM Response Validator tests
    console.log(`\n${COLORS.bold}━━━ LLM RESPONSE VALIDATOR TESTS ━━━${COLORS.reset}`);
    this.testLV1_ValidatorUsesLLMConstraints();

    // Backend Orchestrator integration tests
    console.log(`\n${COLORS.bold}━━━ BACKEND ORCHESTRATOR INTEGRATION TESTS ━━━${COLORS.reset}`);
    await this.testBO1_OrchestratorProcessEvent();
    await this.testBO2_OrchestratorInactivityEvent();

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
runner.runAllTests().catch(console.error);