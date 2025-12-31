/**
 * Game State Module
 * Manages all game state including VAD (Voice Activity Detection) state
 */

// ==================== TYPE DEFINITIONS ====================
interface CardData {
  category?: string;
  subcategory?: string;
  question?: string;
  answer?: string;
  [key: string]: unknown;
}

interface GameStateType {
  // Core game state
  isPlaying: boolean;
  currentPosition: number;
  score: number;
  selectedTargets: string[];
  currentQuestion: CardData | null;
  isSpinning: boolean;
  spinResult: number;
  questionAnswered: boolean;
  lastQuestionPosition: number;
  sequenceShuffledOrder: number[] | null;
  selectedChoice: string | null;
  builtSentence: string[];
  shuffledWords: string[];
  selectedCharacter: string;
  selectedTheme: 'snowflake' | 'bunny';

  // Card-specific state
  selectedContextChoice: string | null;
  idiomCorrectAnswer: string | null;
  idiomSelectedChoice: string | null;
  fntlCorrectAnswers: string[] | null;

  // Methods
  reset(): void;
  updateScore(delta: number): number;
  movePosition(spaces: number, maxSpaces: number): number;
}

interface VadStateType {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  mediaStream: MediaStream | null;
  scriptProcessor: ScriptProcessorNode | null;
  audioBuffer: Float32Array[];
  speechStartSampleIndex: number;
  isSpeechDetected: boolean;
  silenceTimer: ReturnType<typeof setTimeout> | null;
  checkInterval: ReturnType<typeof setInterval> | null;
  sampleRate: number;
  maxBufferSamples: number;
  isProcessing: boolean;
  isRecording: boolean;

  // Methods
  reset(): void;
  cleanup(): void;
}

interface VadConfigType {
  readonly API_BASE: string;
  readonly WAVEFORM_BARS: number;
  readonly THRESHOLD: number;
  readonly SILENCE_DURATION: number;
  readonly PRE_BUFFER_MS: number;
  readonly CHECK_INTERVAL: number;
}

// ==================== STATE OBJECTS ====================
export const state: GameStateType = {
  // Core game state
  isPlaying: false,
  currentPosition: 0,
  score: 0,
  selectedTargets: [],
  currentQuestion: null,
  isSpinning: false,
  spinResult: 0,
  questionAnswered: true,
  lastQuestionPosition: 0,
  sequenceShuffledOrder: null,
  selectedChoice: null,
  builtSentence: [],
  shuffledWords: [],
  selectedCharacter: '🧒',
  selectedTheme: 'snowflake',

  // Card-specific state
  selectedContextChoice: null,
  idiomCorrectAnswer: null,
  idiomSelectedChoice: null,
  fntlCorrectAnswers: null,

  /**
   * Reset game state to initial values
   */
  reset(): void {
    this.isPlaying = false;
    this.currentPosition = 0;
    this.score = 0;
    this.selectedTargets = [];
    this.currentQuestion = null;
    this.isSpinning = false;
    this.spinResult = 0;
    this.questionAnswered = true;
    this.lastQuestionPosition = 0;
    this.sequenceShuffledOrder = null;
    this.selectedChoice = null;
    this.builtSentence = [];
    this.shuffledWords = [];
    this.selectedTheme = 'snowflake';
    this.selectedContextChoice = null;
    this.idiomCorrectAnswer = null;
    this.idiomSelectedChoice = null;
    this.fntlCorrectAnswers = null;
  },

  /**
   * Update score and return new value
   */
  updateScore(delta: number): number {
    this.score += delta;
    return this.score;
  },

  /**
   * Move player position
   */
  movePosition(spaces: number, maxSpaces: number): number {
    this.currentPosition = Math.min(this.currentPosition + spaces, maxSpaces);
    return this.currentPosition;
  }
};

// VAD (Voice Activity Detection) State - kept separate for clarity
export const vadState: VadStateType = {
  audioContext: null,
  analyser: null,
  microphone: null,
  mediaStream: null,
  scriptProcessor: null,
  audioBuffer: [],
  speechStartSampleIndex: -1,
  isSpeechDetected: false,
  silenceTimer: null,
  checkInterval: null,
  sampleRate: 44100,
  maxBufferSamples: 220500, // ~5 seconds for short word answers
  isProcessing: false,
  isRecording: false,

  /**
   * Reset VAD state
   */
  reset(): void {
    this.audioBuffer = [];
    this.speechStartSampleIndex = -1;
    this.isSpeechDetected = false;
    this.isProcessing = false;
    this.isRecording = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  },

  /**
   * Clean up audio resources
   */
  cleanup(): void {
    this.reset();

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
};

// VAD Configuration Constants
export const vadConfig: VadConfigType = {
  API_BASE: '/api',
  WAVEFORM_BARS: 25,
  THRESHOLD: 0.015,
  SILENCE_DURATION: 1200, // 1.2 seconds silence to end recording
  PRE_BUFFER_MS: 300, // 0.3 second pre-buffer
  CHECK_INTERVAL: 100
} as const;

// Attach to namespace for backward compatibility
declare global {
  interface Window {
    SpeechGame: {
      state: GameStateType;
      vadState: VadStateType;
      vadConfig: VadConfigType;
      [key: string]: unknown;
    };
  }
}

window.SpeechGame = window.SpeechGame || {} as Window['SpeechGame'];
window.SpeechGame.state = state;
window.SpeechGame.vadState = vadState;
window.SpeechGame.vadConfig = vadConfig;
