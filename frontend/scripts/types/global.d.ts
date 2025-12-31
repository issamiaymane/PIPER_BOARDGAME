/**
 * Global type declarations for PIPER Speech Therapy Game
 */

// ==================== CARD TYPES ====================
interface CardData {
  category?: string;
  subcategory?: string;
  question?: string;
  answer?: string;
  image1?: string;
  image2?: string;
  word?: string;
  opposite?: string;
  sentence?: string;
  choices?: string[];
  [key: string]: unknown;
}

// ==================== STATE TYPES ====================
interface GameState {
  isPlaying: boolean;
  currentPosition: number;
  selectedTargets: string[];
  currentQuestion: CardData | null;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalMoves: number;
  isCardOpen: boolean;
}

interface VadState {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  isRecording: boolean;
  isProcessing: boolean;
  stream: MediaStream | null;
}

interface VadConfig {
  API_BASE: string;
  TTS_ENDPOINT: string;
  CHAT_ENDPOINT: string;
}

// ==================== DOM CACHE ====================
interface DomCache {
  init(): void;
  gameBoard: HTMLElement | null;
  cardModal: HTMLElement | null;
  cardClose: HTMLElement | null;
  spinButton: HTMLElement | null;
  nextButton: HTMLElement | null;
  resetButton: HTMLElement | null;
  helpBtn: HTMLElement | null;
  targetList: HTMLElement | null;
  audioPlayer: HTMLAudioElement | null;
  [key: string]: HTMLElement | null | ((...args: unknown[]) => void);
}

// ==================== AUDIO MANAGER ====================
interface AudioManager {
  init(): void;
  preload(): Promise<void>;
  play(soundName: string): void;
  playTTS(text: string): Promise<void>;
}

interface TTSManager {
  speak(text: string, options?: TTSOptions): Promise<void>;
  cancel(): void;
  isSpeaking(): boolean;
}

interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

// ==================== UI HELPERS ====================
interface UIHelpers {
  showNotification(message: string, icon?: string, type?: string, duration?: number): void;
  updateLoadingProgress(progress: number): void;
  hideLoadingScreen(): void;
  hideModals(): void;
  showRecordingStatus(status: string): void;
  hideRecordingStatus(): void;
  showAIFeedback(feedback: string): void;
  hideAIFeedback(): void;
}

// ==================== BOARD LOGIC ====================
interface BoardLogic {
  config: {
    totalSpaces: number;
    specialSpaces: Record<number, SpecialSpace>;
  };
  generate(): void;
  movePlayer(spaces: number): void;
  getPlayerPosition(): number;
}

interface SpecialSpace {
  type: string;
  spaces?: number;
  message?: string;
}

// ==================== API HELPERS ====================
interface APIHelpers {
  chat(messages: ChatMessage[]): Promise<string>;
  transcribe(audioBlob: Blob): Promise<string>;
  textToSpeech(text: string): Promise<string>;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ==================== CARD HANDLERS ====================
interface CardHandler {
  setup(card: CardData): void;
  checkAnswer?(answer: string): boolean;
}

interface CardHandlers {
  handlers: Record<string, CardHandler>;
  register(type: string, handler: CardHandler): void;
  show(card: CardData): void;
  close(): void;
  handleCorrect(): void;
  handleIncorrect(correctAnswer?: string): void;
  detectType(card: CardData): string;
}

// ==================== VOICE MANAGER ====================
interface VoiceManager {
  config: {
    lang: string;
    rate: number;
    pitch: number;
    volume: number;
  };
  init(): void;
  speak(text: string, options?: TTSOptions): Promise<void>;
  speakWithKaraoke(text: string, callbacks?: KaraokeCallbacks, options?: TTSOptions): Promise<SpeechSynthesisUtterance>;
  cancel(): void;
  isSpeaking(): boolean;
}

interface KaraokeCallbacks {
  onStart?: () => void;
  onEnd?: (event: SpeechSynthesisEvent) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

// ==================== HYBRID INPUT ====================
interface HybridInput {
  init(): void;
  enableMic(input: HTMLInputElement): void;
  disableMic(input: HTMLInputElement): void;
  enableAllMicButtons(): void;
  disableAllMicButtons(): void;
}

// ==================== STYLE NORMALIZER ====================
interface StyleNormalizer {
  init(): void;
  normalizeCard(element: HTMLElement): void;
}

// ==================== FOCUS CARD ====================
interface FocusCard {
  init(): void;
  show(card: CardData): void;
  close(): void;
  isLocked(): boolean;
}

// ==================== CHILD STATE ====================
interface ChildState {
  token: string | null;
  child: ChildInfo | null;
  goals: IEPGoal[];
  currentSession: Session | null;
  showDemo: boolean;
  isLoggedIn(): boolean;
  setToken(token: string | null): void;
  setChild(child: ChildInfo | null): void;
  setGoals(goals: IEPGoal[]): void;
  setSession(session: Session | null): void;
  getActiveGoal(): IEPGoal | null;
  getPromptLevel(): number;
  getAllowedCategories(): Set<string> | null;
  hasGoals(): boolean;
  logout(): void;
}

interface ChildInfo {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  problem_type: 'language' | 'articulation' | 'both';
}

interface IEPGoal {
  id: number;
  goal_type: string;
  description: string;
  current_prompt_level: number;
  is_mastered: boolean;
  deadline?: string;
  mapped_categories?: string | string[];
}

interface Session {
  session_id: number;
  correct_trials: number;
  total_trials: number;
  accuracy_percentage: number;
}

// ==================== CHILD API ====================
interface ChildAPI {
  baseUrl: string;
  login(username: string, password: string): Promise<LoginResponse>;
  getMe(): Promise<MeResponse>;
  startSession(goalId?: number): Promise<Session>;
  recordTrial(trialData: TrialData): Promise<TrialResponse>;
  endSession(): Promise<SessionSummary>;
  getFeedback(category: string, question: string, expectedAnswer: string, userAnswer: string, isCorrect: boolean, promptLevel?: number): Promise<string>;
  logout(): void;
}

interface LoginResponse {
  token: string;
  child: ChildInfo;
  goals: IEPGoal[];
  show_demo: boolean;
}

interface MeResponse {
  child: ChildInfo;
  goals: IEPGoal[];
  activeSession?: Session;
}

interface TrialData {
  card_category: string;
  card_data: string;
  user_answer: string;
  is_correct: boolean;
  response_time_ms?: number;
}

interface TrialResponse {
  running_accuracy: {
    correct: number;
    total: number;
  };
}

interface SessionSummary {
  session: Session;
}

// ==================== CHILD UI ====================
interface ChildUI {
  init(): void;
  startTrialTimer(): void;
  recordTrial(cardData: CardData, userAnswer: string, isCorrect: boolean): Promise<void>;
}

// ==================== SPEECHGAME NAMESPACE ====================
// Using flexible types to allow gradual TypeScript migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SpeechGameNamespace {
  dom: any;
  state: any;
  vadState: any;
  vadConfig: any;
  audio: any;
  tts: any;
  ui: any;
  board: any;
  api: any;
  cardHandlers: any;
  voiceManager: any;
  hybridInput: any;
  styleNormalizer: any;
  focusCard: any;
  childState: any;
  childApi: any;
  childUI: any;
  [key: string]: any;
}

// ==================== GLOBAL DECLARATIONS ====================
declare global {
  interface Window {
    SpeechGame: SpeechGameNamespace;
    showQuestionCard: () => void;
    populateTargets: (category: string) => void;
    targetsData: Record<string, string[]>;
    categoryHasCards: (category: string) => boolean;
    getRandomCard: (selectedCategories: string[]) => CardData | null;
    getCardsForCategory: (category: string) => CardData[];
    resetCardIndex: () => void;
    getCardForPosition: (position: number, selectedCategories: string[]) => CardData | null;
    gameCardsData: Record<string, CardData[]>;
    getBoardGameCategories: () => { language: string[]; articulation: string[] };
    TherapistApp: unknown;
    closeModal: (modalId: string) => void;
    currentUtterance: SpeechSynthesisUtterance | null;
    focusCardLocked: boolean;
    isSpeechPlaying: boolean;
    therapistUtterance: SpeechSynthesisUtterance | null;
    __SPEECH_LOCK__: SpeechSynthesisUtterance | null;
    __KARAOKE_ACTIVE__: boolean;
  }

  // Make SpeechGame available globally
  const SpeechGame: SpeechGameNamespace;
}

export {};
