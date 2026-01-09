# PIPER Safety-Gate Architecture

Complete flow from voice input to UI response.

```
Architecture Flow:
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌──────────────┐
│ 1.INPUT │ → │ 2.SIGNAL│ → │ 3.STATE │ → │ 4.LEVEL │ → │5.INTERVENTION│
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └──────────────┘
     ↓
┌─────────┐   ┌──────────────────┐   ┌─────────┐   ┌─────────┐
│ 6.CONFIG│ → │ 7.BACKEND_RESPONSE│ → │ 8.LLM   │ → │ 9.OUTPUT│
└─────────┘   └──────────────────┘   └─────────┘   └─────────┘
```

---

## 0. VOICE LAYER (session.ts)

Detects audio-based signals BEFORE transcription via amplitude tracking.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      VOICE SESSION MANAGER                          │
│                                                                      │
│  AMPLITUDE TRACKING:                                                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ trackAmplitude(amplitude, peak)                                │ │
│  │                                                                 │ │
│  │ • Stores last 2 seconds of { amplitude, peak, timestamp }      │ │
│  │ • Checks thresholds:                                           │ │
│  │   - SCREAMING_AMPLITUDE_THRESHOLD = 0.35 (RMS)                 │ │
│  │   - SCREAMING_PEAK_THRESHOLD = 0.90                            │ │
│  │   - SCREAMING_CONFIRMATION_CHUNKS = 3 consecutive              │ │
│  │                                                                 │ │
│  │ Normal speech: ~0.05-0.15 RMS                                  │ │
│  │ Loud speech:   ~0.15-0.30 RMS                                  │ │
│  │ Screaming:     >0.35 RMS                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  SCREAMING DETECTION:                                                │
│  • 3+ chunks above threshold → screamingDetected = true             │
│  • Audio chunks BLOCKED from OpenAI when screaming detected         │
│  • Timeout fires after SCREAMING_POST_SPEECH_WAIT_MS (1500ms)       │
│  • Cooldown prevents duplicates: SCREAMING_RESPONSE_COOLDOWN_MS     │
│                                                                      │
│  OUTPUT: { screaming: true, crying: true, prolongedSilence: true }  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. INPUT - Events and Context

```typescript
// Event triggered by child action or inactivity
interface Event {
  type: 'CHILD_RESPONSE' | 'CHILD_INACTIVE';
  correct?: boolean;
  response?: string;
  previousResponse?: string;
  previousPreviousResponse?: string;
  signals?: {
    screaming?: boolean;
    crying?: boolean;
    prolongedSilence?: boolean;
  };
}

// Card data from deck (frontend format)
interface CardContext {
  category: string;
  question: string;
  targetAnswers: string[];
  images: Array<{ image: string; label: string }>;
}

// Task context for current card (backend format)
interface TaskContext {
  cardType: string;
  category: string;
  question: string;
  targetAnswer: string;
  imageLabels: string[];
}
```

**Event Sources:**
| Event Type | Trigger |
|------------|---------|
| `CHILD_RESPONSE` | Child speaks (transcription completed) |
| `CHILD_INACTIVE` | Inactivity timer fires (GREEN=30s, YELLOW=25s, ORANGE=20s, RED=15s) |

---

## 2. SIGNALS - Detected from Event

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SIGNAL DETECTOR                                 │
│                                                                      │
│  detectSignals(event) → Signal[]                                    │
│                                                                      │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│  │  1. AUDIO-BASED  │ │  2. TEXT-BASED   │ │  3. PATTERN-BASED    │ │
│  │  (Event.signals) │ │  (LLM on text)   │ │  (Event fields)      │ │
│  ├──────────────────┤ ├──────────────────┤ ├──────────────────────┤ │
│  │                  │ │                  │ │                      │ │
│  │ screaming: true  │ │ GPT-4o-mini      │ │ response ===         │ │
│  │   → SCREAMING    │ │ classifies:      │ │ previousResponse     │ │
│  │                  │ │                  │ │   → REPETITIVE_      │ │
│  │ crying: true     │ │ break_request    │ │     RESPONSE         │ │
│  │   → CRYING       │ │   → WANTS_BREAK  │ │                      │ │
│  │                  │ │                  │ │                      │ │
│  │ prolongedSilence │ │ quit_request     │ │                      │ │
│  │   → PROLONGED_   │ │   → WANTS_QUIT   │ │                      │ │
│  │     SILENCE      │ │                  │ │                      │ │
│  │                  │ │ frustration      │ │                      │ │
│  │                  │ │   → FRUSTRATION  │ │                      │ │
│  │                  │ │                  │ │                      │ │
│  │                  │ │ distress         │ │                      │ │
│  │                  │ │   → DISTRESS     │ │                      │ │
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
enum Signal {
  // Audio-based (from Event.signals)
  SCREAMING = 'SCREAMING',
  CRYING = 'CRYING',
  PROLONGED_SILENCE = 'PROLONGED_SILENCE',

  // Text-based (from LLM analysis)
  WANTS_BREAK = 'WANTS_BREAK',
  WANTS_QUIT = 'WANTS_QUIT',
  FRUSTRATION = 'FRUSTRATION',
  DISTRESS = 'DISTRESS',

  // Pattern-based (from Event fields)
  REPETITIVE_RESPONSE = 'REPETITIVE_RESPONSE'
}
```

---

## 3. STATE - Session State

```
┌─────────────────────────────────────────────────────────────────────┐
│                        STATE ENGINE                                  │
│                                                                      │
│  processEvent(event, signals) → State                               │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  INITIAL STATE:                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
│    engagementLevel:     8   // Start optimistic (0-10)              │
│    dysregulationLevel:  1   // Start calm (0-10)                    │
│    fatigueLevel:        1   // Start fresh (0-10)                   │
│    consecutiveErrors:   0   // No streak                            │
│    errorFrequency:      0   // Errors per minute                    │
│    timeInSession:       0   // Seconds                              │
│    timeSinceBreak:      0   // Seconds                              │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  EVENT-BASED MODIFICATIONS:                                          │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
│  CHILD_RESPONSE (correct = true):                                    │
│    consecutiveErrors = 0, engagement += 1, dysregulation -= 0.5     │
│                                                                      │
│  CHILD_RESPONSE (correct = false):                                   │
│    consecutiveErrors++, engagement -= 0.5                           │
│    IF triple repetition: dysregulation += 2                         │
│                                                                      │
│  CHILD_INACTIVE:                                                     │
│    engagement -= 2                                                   │
│                                                                      │
│  ═══════════════════════════════════════════════════════════════    │
│  SIGNAL-BASED MODIFICATIONS:                                         │
│  ═══════════════════════════════════════════════════════════════    │
│                                                                      │
│  │ Signal              │ State Modification                        │
│  ├─────────────────────┼───────────────────────────────────────────┤
│  │ SCREAMING           │ dysregulationLevel += 4                   │
│  │ CRYING              │ dysregulationLevel += 3                   │
│  │ DISTRESS            │ dysregulationLevel += 2                   │
│  │ FRUSTRATION         │ dysregulationLevel += 1                   │
│  │ WANTS_QUIT          │ engagementLevel -= 2                      │
│  │ WANTS_BREAK         │ fatigueLevel += 1                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
interface State {
  engagementLevel: number;      // 0-10
  dysregulationLevel: number;   // 0-10
  fatigueLevel: number;         // 0-10
  consecutiveErrors: number;
  errorFrequency: number;       // errors per minute
  timeInSession: number;        // seconds
  timeSinceBreak: number;       // seconds
  lastActivityTimestamp: Date;
}
```

---

## 4. LEVEL - Safety Level Assessment

```
┌─────────────────────────────────────────────────────────────────────┐
│                       LEVEL ASSESSOR                                 │
│                                                                      │
│  assessLevel(state, signals) → Level                                │
│                                                                      │
│  Checks from MOST SEVERE → LEAST SEVERE:                            │
│                                                                      │
│  🔴 RED (Severe Crisis):                                             │
│     dysregulationLevel >= 9                                         │
│     OR (hasDistressSignals AND dysregulationLevel >= 7)             │
│                                                                      │
│  🟠 ORANGE (Significant Distress):                                   │
│     hasDistressSignals (DISTRESS/SCREAMING/CRYING)                  │
│     OR REPETITIVE_RESPONSE                                          │
│     OR dysregulationLevel >= 7                                      │
│     OR consecutiveErrors >= 5                                       │
│     OR fatigueLevel >= 8                                            │
│                                                                      │
│  🟡 YELLOW (Minor Distress):                                         │
│     hasMildDistress (WANTS_BREAK/WANTS_QUIT/FRUSTRATION/SILENCE)    │
│     OR engagementLevel <= 3                                         │
│     OR dysregulationLevel >= 5                                      │
│     OR consecutiveErrors >= 3                                       │
│     OR fatigueLevel >= 6                                            │
│                                                                      │
│  🟢 GREEN (Normal):                                                  │
│     Default if none of the above                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
enum Level {
  GREEN = 0,   // Normal operation
  YELLOW = 1,  // Minor adaptation
  ORANGE = 2,  // Significant adaptation
  RED = 3      // Emergency intervention
}
```

---

## 5. INTERVENTIONS - Action Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERVENTION SELECTOR                             │
│                                                                      │
│  selectInterventions(level, state, signals) → Intervention[]        │
│                                                                      │
│  🟢 GREEN:  [RETRY_CARD]                                             │
│                                                                      │
│  🟡 YELLOW: [SKIP_CARD, RETRY_CARD]                                  │
│                                                                      │
│  🟠 ORANGE: [conditional + RETRY_CARD + START_BREAK]                 │
│     IF dysregulationLevel >= 4: + BUBBLE_BREATHING                  │
│     IF consecutiveErrors >= 3:  + SKIP_CARD                         │
│                                                                      │
│  🔴 RED:    [BUBBLE_BREATHING, SKIP_CARD, RETRY_CARD,                │
│              START_BREAK, CALL_GROWNUP]                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
enum Intervention {
  RETRY_CARD = 'RETRY_CARD',
  SKIP_CARD = 'SKIP_CARD',
  BUBBLE_BREATHING = 'BUBBLE_BREATHING',
  START_BREAK = 'START_BREAK',
  CALL_GROWNUP = 'CALL_GROWNUP'
}
```

---

## 6. CONFIG - Session Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION PLANNER                                 │
│                                                                      │
│  adaptSessionConfig(safetyLevel) → SessionConfig                    │
│                                                                      │
│  ┌──────────┬───────────┬────────┬──────────┬───────────┐           │
│  │ Level    │ Intensity │ Tone   │ Task Time│ Inactivity│           │
│  ├──────────┼───────────┼────────┼──────────┼───────────┤           │
│  │ 🟢 GREEN │ 2         │ warm   │ 60s      │ 30s       │           │
│  │ 🟡 YELLOW│ 1         │ calm   │ 45s      │ 25s       │           │
│  │ 🟠 ORANGE│ 0         │ calm   │ 30s      │ 20s       │           │
│  │ 🔴 RED   │ 0         │ calm   │ 60s      │ 15s       │           │
│  └──────────┴───────────┴────────┴──────────┴───────────┘           │
│                                                                      │
│  promptIntensity:                                                    │
│    0 = Minimal (crisis) - No prompting, just acknowledge            │
│    1 = Low (struggling) - Gentle, brief guidance                    │
│    2 = Medium (normal)  - Standard encouragement                    │
│    3 = High (engaged)   - Extra enthusiastic                        │
│                                                                      │
│  avatarTone:                                                         │
│    'warm' - Friendly, encouraging (GREEN)                           │
│    'calm' - Soothing, gentle (YELLOW, ORANGE, RED)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
interface SessionConfig {
  promptIntensity: number;      // 0-3 (minimal to high)
  avatarTone: 'calm' | 'warm';
  maxTaskTime: number;          // seconds
  inactivityTimeout: number;    // seconds
}
```

---

## 7. BACKEND RESPONSE - Data Package for LLM

The BackendResponse packages all pipeline data for the LLM prompt builder.
**No duplication**: references source data directly.

```
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND RESPONSE                                │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ PIPELINE OUTPUTS:                                              │  │
│  │   safetyLevel: Level                                          │  │
│  │   signals: Signal[]                                           │  │
│  │   interventions: Intervention[]                               │  │
│  │   sessionConfig: SessionConfig                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ SOURCE DATA REFERENCES (no duplication):                       │  │
│  │   event: Event           ← direct reference                   │  │
│  │   state: State           ← direct reference                   │  │
│  │   taskContext: TaskContext | null                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ DERIVED DATA:                                                  │  │
│  │   context: ResponseContext     (from event + taskContext)     │  │
│  │   constraints: LLMConstraints  (from level)                   │  │
│  │   reasoning: DecisionReasoning                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ METADATA:                                                      │  │
│  │   decision: string                                            │  │
│  │   timestamp: Date                                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// Derived context from Event + TaskContext
interface ResponseContext {
  what_happened: 'correct_response' | 'incorrect_response' | 'child_inactive';
  child_said: string;
  target_was: string;
  attempt_number: number;
}

// Constraints for LLM response generation
// Note: tone comes from SessionConfig.avatarTone (no duplication)
interface LLMConstraints {
  must_be_brief: boolean;
  must_not_judge: boolean;
  must_not_pressure: boolean;
  must_offer_choices: boolean;
  must_validate_feelings: boolean;
  max_sentences: number;
  forbidden_words: string[];
  required_approach: string;
}

// Reasoning for safety decisions
interface DecisionReasoning {
  safety_level_reason: string;
  interventions_reason: string;
}

// Complete data package passed to LLM prompt builder
interface BackendResponse {
  // Pipeline outputs
  safetyLevel: Level;
  signals: Signal[];
  interventions: Intervention[];
  sessionConfig: SessionConfig;

  // Source data references (no duplication)
  event: Event;
  state: State;
  taskContext: TaskContext | null;

  // Derived data
  context: ResponseContext;
  constraints: LLMConstraints;
  reasoning: DecisionReasoning;

  // Metadata
  decision: string;
  timestamp: Date;
}
```

---

## 8. LLM - Response Generation and Validation

### Prompt Builder

```
┌─────────────────────────────────────────────────────────────────────┐
│                       PROMPT BUILDER                                 │
│                                                                      │
│  buildSystemPrompt(backendResponse) → string                        │
│                                                                      │
│  Uses from BackendResponse:                                          │
│  • context.child_said, context.target_was                           │
│  • safetyLevel                                                       │
│  • sessionConfig.promptIntensity                                     │
│  • constraints.forbidden_words                                       │
│  • interventions                                                     │
│                                                                      │
│  PROMPT INTENSITY:                                                   │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 0 (Minimal): "Keep feedback EXTREMELY brief"                   │ │
│  │ 1 (Low):     "Keep feedback very short and gentle"             │ │
│  │ 2 (Medium):  "Keep feedback VERY SHORT and encouraging"        │ │
│  │ 3 (High):    "Be encouraging and celebratory!"                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  OUTPUT FORMAT:                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ GREEN:  "I heard '[word]'. [encouragement]!"                   │ │
│  │ YELLOW+: "I heard '[word]'. [encouragement]!                   │ │
│  │          What would you like to do?"                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Response Validator

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RESPONSE VALIDATOR                               │
│                                                                      │
│  validate(response, constraints: LLMConstraints) → LLMValidation    │
│                                                                      │
│  CHECKS:                                                             │
│  • length_appropriate:     coach_line <= 30 words                   │
│  • no_forbidden_words:     no "wrong", "incorrect", "bad", etc.     │
│  • choices_included:       choice_presentation exists               │
│  • non_judgmental:         no "you should", "that's wrong"          │
│  • sentences_within_limit: <= max_sentences                         │
│                                                                      │
│  IF VALIDATION FAILS: use fallback response                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

```typescript
// LLM generated response
interface LLMGeneration {
  coach_line: string;
  choice_presentation: string;
}

// LLM response validation result
interface LLMValidation {
  valid: boolean;
  checks: Record<string, boolean>;
  reason: string | null;
}
```

---

## 9. OUTPUT - Final Results to Frontend

```typescript
// UI package sent to frontend
interface UIPackage {
  // Pipeline data for overlay
  overlay: {
    signals: Signal[];
    state: State;
    safetyLevel: Level;
  };

  // Actions available to child
  interventions: Intervention[];

  // Session settings
  sessionConfig: SessionConfig;

  // LLM output
  speech: {
    text: string;
  };
  choiceMessage: string;

  // Logging data (optional)
  childSaid?: string;
  targetAnswers?: string[];
  attemptNumber?: number;
  responseHistory?: string[];
}

// Complete safety gate result
interface SafetyGateResult {
  uiPackage: UIPackage;

  // Response metadata
  isCorrect: boolean;
  shouldSpeak: boolean;
  interventionRequired: boolean;
  taskTimeExceeded: boolean;

  // Convenience extracts
  feedbackText: string;
  choiceMessage: string;
}
```

---

## 10. COMPLETE PIPELINE FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND ORCHESTRATOR                              │
│                                                                      │
│  processEvent(event, taskContext) → UIPackage                       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 1. DETECT SIGNALS                                            │    │
│  │    SignalDetector.detectSignals(event) → Signal[]            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 2. UPDATE STATE                                              │    │
│  │    StateEngine.processEvent(event, signals) → State          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 3. ASSESS LEVEL                                              │    │
│  │    LevelAssessor.assessLevel(state, signals) → Level         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 4. SELECT INTERVENTIONS                                      │    │
│  │    InterventionSelector.selectInterventions(...) → [...]     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 5. ADAPT CONFIG                                              │    │
│  │    SessionPlanner.adaptSessionConfig(level) → SessionConfig  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 6. BUILD BACKEND RESPONSE                                    │    │
│  │    { level, signals, interventions, config,                  │    │
│  │      event, state, taskContext,                              │    │
│  │      context, constraints, reasoning }                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 7. CHECK FOR LLM SKIP                                        │    │
│  │    IF CHILD_INACTIVE → use fallback response                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 8. GENERATE LLM RESPONSE                                     │    │
│  │    PromptBuilder.buildSystemPrompt(backendResponse)          │    │
│  │    LLMResponseGenerator.generateResponse(...) → LLMGeneration│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 9. VALIDATE RESPONSE                                         │    │
│  │    LLMResponseValidator.validate(response, constraints)      │    │
│  │    IF invalid → use fallback response                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ↓                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ 10. BUILD UI PACKAGE                                         │    │
│  │     → UIPackage { overlay, interventions, config, speech }   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE

### State Modification Summary

| Event/Signal | State Change |
|--------------|--------------|
| Correct answer | `consecutiveErrors=0`, `engagement+1`, `dysregulation-0.5` |
| Incorrect answer | `consecutiveErrors++`, `engagement-0.5` |
| Triple repetition | `dysregulation+2` |
| CHILD_INACTIVE | `engagement-2` |
| SCREAMING | `dysregulation+4` |
| CRYING | `dysregulation+3` |
| DISTRESS | `dysregulation+2` |
| FRUSTRATION | `dysregulation+1` |
| WANTS_QUIT | `engagement-2` |
| WANTS_BREAK | `fatigue+1` |
| Break taken | `dysregulation-2`, `fatigue-2`, `timeSinceBreak=0` |

### Level Thresholds

| Metric | YELLOW | ORANGE | RED |
|--------|--------|--------|-----|
| dysregulationLevel | >= 5 | >= 7 | >= 9 |
| consecutiveErrors | >= 3 | >= 5 | - |
| fatigueLevel | >= 6 | >= 8 | - |
| engagementLevel | <= 3 | - | - |
| + Distress signals | - | triggers | + dysreg>=7 |

### LLMConstraints by Level

| Constraint | GREEN | YELLOW | ORANGE | RED |
|------------|-------|--------|--------|-----|
| must_offer_choices | false | true | true | true |
| must_validate_feelings | false | false | true | true |
| max_sentences | 2 | 3 | 3 | 3 |
