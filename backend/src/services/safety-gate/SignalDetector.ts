import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { State, Event, Signal } from './types.js';

interface LLMSignalClassification {
  break_request: boolean;
  quit_request: boolean;
  frustration: boolean;
  distress: boolean;  // covers screaming, crying, no_no_no
  confidence: number;
}

export class SignalDetector {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // ============================================
  // MAIN DETECTION FUNCTION (ASYNC for LLM)
  // ============================================

  async detectSignals(state: State, event: Event): Promise<Signal[]> {
    const signals: Signal[] = [];

    // 1. State-based signals (instant)
    this.detectStateBasedSignals(state, signals);

    // 2. Event-based signals (instant)
    this.detectEventBasedSignals(event, signals);

    // 3. Text-based signals (LLM-powered)
    await this.detectTextSignalsIntelligent(event, signals);

    // 4. Audio-based signals (instant)
    this.detectAudioSignals(event, signals);

    return signals;
  }

  // ============================================
  // 1. STATE-BASED SIGNALS
  // ============================================

  private detectStateBasedSignals(state: State, signals: Signal[]): void {
    if (state.consecutiveErrors >= 3) {
      signals.push(Signal.CONSECUTIVE_ERRORS);
    }

    if (state.engagementLevel <= 3) {
      signals.push(Signal.ENGAGEMENT_DROP);
    }

    if (state.fatigueLevel >= 7) {
      signals.push(Signal.FATIGUE_HIGH);
    }

    if (state.dysregulationLevel >= 6) {
      signals.push(Signal.DYSREGULATION_DETECTED);
    }
  }

  // ============================================
  // 2. EVENT-BASED SIGNALS
  // ============================================

  private detectEventBasedSignals(event: Event, signals: Signal[]): void {
    // Check for repetitive wrong response
    if (event.type === 'CHILD_RESPONSE' && event.response === event.previousResponse) {
      signals.push(Signal.REPETITIVE_RESPONSE);
    }
  }

  // ============================================
  // 3. TEXT-BASED SIGNALS (LLM-POWERED)
  // ============================================

  private async detectTextSignalsIntelligent(event: Event, signals: Signal[]): Promise<void> {
    const responseText = (event.response || '').trim();

    // Skip if no text to analyze
    if (!responseText) {
      return;
    }

    try {
      const classification = await this.classifyTextWithLLM(responseText);

      // DEBUG: Log LLM classification result
      console.log(`[SignalDetector] LLM classification for "${responseText}":`, classification);

      // Map classification to signals
      if (classification.break_request) {
        console.log(`[SignalDetector] 🟡 LLM detected WANTS_BREAK in: "${responseText}"`);
        signals.push(Signal.WANTS_BREAK);
      }
      if (classification.quit_request) {
        console.log(`[SignalDetector] 🟡 LLM detected WANTS_QUIT in: "${responseText}"`);
        signals.push(Signal.WANTS_QUIT);
      }
      if (classification.frustration) {
        console.log(`[SignalDetector] 🟠 LLM detected FRUSTRATION in: "${responseText}"`);
        signals.push(Signal.FRUSTRATION);
      }
      if (classification.distress) {
        console.log(`[SignalDetector] 🔴 LLM detected DISTRESS in: "${responseText}"`);
        signals.push(Signal.DISTRESS);
      }
    } catch (error) {
      // Fallback to keyword matching if LLM fails
      console.warn('[SignalDetector] LLM classification failed, using keyword fallback:', error);
      this.detectTextSignalsKeywordFallback(responseText, signals);
    }
  }

  private async classifyTextWithLLM(text: string): Promise<LLMSignalClassification> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Fast & cheap for classification
      max_tokens: 100,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a child speech analysis system for a speech therapy card game.

CRITICAL CONTEXT: The child is ANSWERING QUESTIONS in a game. Their speech is likely an ANSWER to a question, NOT an expression of their emotional state.

Examples of NORMAL ANSWERS (do NOT flag these):
- "Sad" → probably answering "What's the opposite of happy?"
- "Angry" → probably answering a question about emotions
- "Slow" → probably answering "What's the opposite of fast?"
- "Very small" → probably answering a size question
- "Snowy" → probably describing weather or a picture

Only flag emotional signals when the child is CLEARLY expressing their OWN feelings, NOT answering a question.

Return JSON with these boolean fields:
- break_request: Child DIRECTLY asks to stop/rest (e.g., "I want a break", "can we stop playing")
- quit_request: Child DIRECTLY wants to quit (e.g., "I don't want to play anymore", "I'm done with this game")
- frustration: Child expresses frustration at the game (e.g., "ugh this is too hard", "I can't do this", sighing with "argh")
- distress: Child is in CLEAR distress - crying sounds, screaming "AHHH", repeated "no no no I don't want to"
- confidence: 0-1 how confident you are

BE CONSERVATIVE: Default to all false unless you're very confident.
A single word answer like "Sad" or "Slow" is almost certainly just an answer, not distress.`
        },
        {
          role: 'user',
          content: `Child said: "${text}"`
        }
      ]
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      break_request: parsed.break_request === true,
      quit_request: parsed.quit_request === true,
      frustration: parsed.frustration === true,
      distress: parsed.distress === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
    };
  }

  // Keyword fallback if LLM fails
  private detectTextSignalsKeywordFallback(responseText: string, signals: Signal[]): void {
    const text = responseText.toLowerCase();
    const normalizedText = text.replace(/[,!?.]/g, ' ').replace(/\s+/g, ' ');

    // WANTS_BREAK
    if (text.includes('break') || text.includes('stop') || text.includes('tired')) {
      signals.push(Signal.WANTS_BREAK);
    }

    // WANTS_QUIT
    if (text.includes('done') || text.includes('quit') || text.includes('no more')) {
      signals.push(Signal.WANTS_QUIT);
    }

    // DISTRESS: "no no no", screaming, crying patterns
    const hasDistress =
      normalizedText.includes('no no no') ||
      text.includes('scream') ||
      text.includes('yell') ||
      /a{2,}h{1,}/i.test(text) ||
      text.includes('[crying]');

    if (hasDistress) {
      signals.push(Signal.DISTRESS);
    }

    // FRUSTRATION (only if not distress)
    if ((text.includes('ugh') || text.includes('argh')) && !hasDistress) {
      signals.push(Signal.FRUSTRATION);
    }
  }

  // ============================================
  // 4. AUDIO-BASED SIGNALS
  // ============================================

  private detectAudioSignals(event: Event, signals: Signal[]): void {
    // DISTRESS from audio: high amplitude detection from frontend
    // Frontend sends 'screaming_detected_audio' or 'AUDIO_SCREAMING'
    const hasAudioDistress =
      event.signal?.includes('screaming_detected_audio') ||
      event.signal?.includes('AUDIO_SCREAMING') ||
      false;
    if (hasAudioDistress) {
      console.log(`[SignalDetector] 🔴 AUDIO detected DISTRESS (signal: "${event.signal}")`);
      signals.push(Signal.DISTRESS);
    }
  }
}
