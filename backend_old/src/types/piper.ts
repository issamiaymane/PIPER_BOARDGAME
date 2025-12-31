/**
 * PIPER Types - Personalized IEP Progress & Evaluation Reporter
 */

// ============================================
// Database Entity Types
// ============================================

export interface Therapist {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  credentials?: string;
  created_at: string;
}

export type ProblemType = 'language' | 'articulation' | 'both';

export interface EvalData {
  // Background Information
  languages_spoken?: string;
  family_religion?: string;
  medical_history?: string;
  other_diagnoses?: string;

  // Speech/Language History
  speech_diagnoses?: string;
  prior_therapy?: string; // 'none', 'less-1', '1-2', '2-3', '3+'
  baseline_accuracy?: number;

  // Assessment Results
  goals_benchmarks?: string;
  strengths?: string;
  weaknesses?: string;
  target_sounds?: string[]; // For articulation: ['s', 'r', 'l', etc.]

  // School Contacts
  teachers?: string;
  notes?: string;
}

export interface Student {
  id: number;
  therapist_id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  diagnosis?: string;
  avatar_emoji: string;
  created_at: string;
  // Child login fields
  username?: string;
  password_hash?: string;
  problem_type: ProblemType;
  eval_data?: string; // JSON string of EvalData
  has_seen_demo: number; // SQLite boolean
  last_login?: string;
  // Evaluation PDF upload fields
  eval_pdf_path?: string;
  eval_pdf_uploaded_at?: string;
  eval_pdf_original_name?: string;
  // Goal PDF upload fields
  goal_pdf_path?: string;
  goal_pdf_uploaded_at?: string;
  goal_pdf_original_name?: string;
}

export interface IEPGoal {
  id: number;
  student_id: number;
  goal_type: IEPGoalType;
  goal_description: string;
  target_percentage: number;
  sessions_to_confirm: number;
  current_prompt_level: PromptLevel;
  mapped_categories: string; // JSON array string
  is_active: number; // SQLite boolean
  created_at: string;
  // New fields
  deadline?: string; // e.g., "By April 2025"
  baseline?: string; // Measurable baseline
  comments?: string; // Comments on proposed goal
  // SLP review tracking (0 = not reviewed, 1 = reviewed)
  slp_reviewed?: number;
}

export interface Session {
  id: number;
  student_id: number;
  therapist_id: number;
  iep_goal_id?: number;
  start_time: string;
  end_time?: string;
  total_trials: number;
  correct_trials: number;
  accuracy_percentage: number;
  prompt_level_used: PromptLevel;
  status: SessionStatus;
  // SOAP Note fields
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  // SLP review tracking (0 = not reviewed, 1 = reviewed)
  slp_reviewed?: number;
}

export interface Trial {
  id: number;
  session_id: number;
  card_category: string;
  card_data: string; // JSON string
  user_answer?: string;
  is_correct: number; // SQLite boolean
  prompt_level: PromptLevel;
  response_time_ms?: number;
  created_at: string;
}

export interface SessionAccuracyHistory {
  id: number;
  student_id: number;
  iep_goal_id: number;
  session_id: number;
  accuracy_percentage: number;
  prompt_level: PromptLevel;
  session_number: number;
  created_at: string;
}

// ============================================
// Enums and Constants
// ============================================

// IEPGoalType - matches boardgame-data.js section headers (e.g., '---S Sound', '---Wh- Questions')
// Also accepts any string for flexibility with card category names
export type IEPGoalType = string;

export type PromptLevel = 1 | 2 | 3; // 1=MAX, 2=MOD, 3=MIN

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled';

export const PROMPT_LEVELS = {
  MAX: 1 as PromptLevel,
  MOD: 2 as PromptLevel,
  MIN: 3 as PromptLevel,
} as const;

export const PROMPT_LEVEL_LABELS: Record<PromptLevel, string> = {
  1: 'max',
  2: 'mod',
  3: 'min',
};

// HAILEY thresholds for automatic prompt level adjustment
export const HAILEY_THRESHOLDS = {
  ADVANCE_ACCURACY: 70, // >= 70% to advance (reduce prompting)
  FALLBACK_ACCURACY: 50, // < 50% to fallback (increase prompting)
  SESSIONS_TO_CONFIRM: 2, // Consecutive sessions needed
} as const;

// IEP Goal type to card category mappings
export const IEP_GOAL_CATEGORY_MAPPINGS: Record<IEPGoalType, string[]> = {
  compare_contrast: [
    'Compare And Contrast (Same And Different)',
    'Comparatives - Superlatives',
    'Semantic Relationships',
  ],
  object_description: [
    'Describing',
    'Describing - More Advanced',
    'Function Labeling',
    'Categories - Identifying Members Of A Category',
    'Categories - Label The Category',
  ],
  wh_questions: [
    'Wh- Questions Mixed',
    'Wh- Questions Short Stories',
    'Wh- Questions (What)',
    'Wh- Questions (When)',
    'Wh- Questions (Where)',
    'Wh- Questions (Who)',
    'Wh- Questions (Why)',
    'Wh Questions With Picture Choices',
    'Who Questions - Four Quadrants',
  ],
  category_naming: [
    'Naming And Categorizing',
    'Categories - Identifying Members Of A Category',
    'Categories - Label The Category',
  ],
  grammar_syntax: [
    'Building Sentences Level 1 - Elementary',
    'Building Sentences Level 2 - Elementary',
    'Past Tense Verbs Irregular',
    'Past Tense Verbs Regular',
    'Irregular Past Tense Verbs',
    'Irregular Plurals',
    'Regular Plurals',
    'Third Person Singular',
    'Future Tense',
  ],
  similarities_differences: [
    'Compare And Contrast (Same And Different)',
    'Antonyms',
    'Antonyms Level 2',
    'Synonyms',
    'Synonyms Level 2',
  ],
  inferencing: [
    'Inferencing Based On Images',
    'Inferencing Level 1',
    'Inferencing Level 2',
  ],
  problem_solving: [
    'Problem Solving',
    'Problem Solving Based On Images',
    'Problem Solving Part 2',
  ],
  following_directions: [
    'Following 1-Step Directions',
    'Following 2-Step Directions',
    'Following Directions - Conditional',
    'Following Multistep Directions Level 2',
    'Conditional Following Directions',
  ],
  vocabulary: [
    'Vocabulary - Animals',
    'Vocabulary - Basic Vocab',
    'Vocabulary - Food',
    'Vocabulary General',
  ],
  // Articulation mappings - map to all categories for that sound
  artic_r: [
    'R Initial 1 CVC Word',
    'R Initial 1 Simple Word, Phrase, Sentence',
    'R Initial 5 More Complex Words',
    'R Initial 5 More Complex Sentences',
    'R Medial 1 Simple Word, Phrase, Sentence',
    'R Medial 5 More Complex Words',
    'R Medial 5 More Complex Sentences',
    'R Final 1 CVC Word',
    'R Final 1 Simple Word, Phrase, Sentence',
    'R Final 5 More Complex Words',
    'R Final 5 More Complex Sentences',
  ],
  artic_s: [
    'S Initial 1 CVC Word',
    'S Initial 1 Simple Word, Phrase, Sentence',
    'S Initial 5 More Complex Words',
    'S Initial 5 More Complex Sentences',
    'S Medial 1 Simple Word, Phrase, Sentence',
    'S Medial 5 More Complex Words',
    'S Medial 5 More Complex Sentences',
    'S Final 1 CVC Word',
    'S Final 1 Simple Word, Phrase, Sentence',
    'S Final 5 More Complex Words',
    'S Final 5 More Complex Sentences',
  ],
  artic_l: [
    'L Initial 1 CVC Word',
    'L Initial 1 Simple Word, Phrase, Sentence',
    'L Initial 5 More Complex Words',
    'L Initial 5 More Complex Sentences',
    'L Medial 1 Simple Word, Phrase, Sentence',
    'L Medial 5 More Complex Words',
    'L Medial 5 More Complex Sentences',
    'L Final 1 CVC Word',
    'L Final 1 Simple Word, Phrase, Sentence',
    'L Final 5 More Complex Words',
    'L Final 5 More Complex Sentences',
  ],
  artic_th: [
    'Th Voiced Initial Words',
    'Th Voiced Initial Sentences',
    'Th Voiced Medial Words',
    'Th Voiced Medial Sentences',
    'Th Voiceless Initial 1 Simple Word, Phrase, Sentence',
    'Th Voiceless Initial Words',
    'Th Voiceless Initial Sentences',
    'Th Voiceless Medial 1 Simple Word, Phrase, Sentence',
    'Th Voiceless Medial Words',
    'Th Voiceless Medial Sentences',
    'Th Voiceless Final 1 Simple Word, Phrase, Sentence',
    'Th Voiceless Final Words',
    'Th Voiceless Final Sentences',
  ],
  artic_k_g: [
    'K Initial 1 CVC Word',
    'K Initial 1 Simple Word, Phrase, Sentence',
    'K Initial 5 More Complex Words',
    'K Initial 5 More Complex Sentences',
    'K Medial 1 Simple Word, Phrase, Sentence',
    'K Medial 5 More Complex Words',
    'K Medial 5 More Complex Sentences',
    'K Final 1 CVC Word',
    'K Final 1 Simple Word, Phrase, Sentence',
    'K Final 5 More Complex Words',
    'K Final 5 More Complex Sentences',
    'G Initial 1 CVC Word',
    'G Initial 1 Simple Word, Phrase, Sentence',
    'G Initial 5 More Complex Words',
    'G Initial 5 More Complex Sentences',
    'G Medial 1 Simple Word, Phrase, Sentence',
    'G Medial 5 More Complex Words',
    'G Medial 5 More Complex Sentences',
    'G Final 1 CVC Word',
    'G Final 1 Simple Word, Phrase, Sentence',
    'G Final 5 More Complex Words',
    'G Final 5 More Complex Sentences',
  ],
  artic_f_v: [
    'F Initial 1 CVC Word',
    'F Initial 1 Simple Word, Phrase, Sentence',
    'F Initial 5 More Complex Words',
    'F Initial 5 More Complex Sentences',
    'F Medial 1 Simple Word, Phrase, Sentence',
    'F Medial 5 More Complex Words',
    'F Medial 5 More Complex Sentences',
    'F Final 1 CVC Word',
    'F Final 1 Simple Word, Phrase, Sentence',
    'F Final 5 More Complex Words',
    'F Final 5 More Complex Sentences',
    'V Initial 1 CVC Word',
    'V Initial 1 Simple Word, Phrase, Sentence',
    'V Initial 5 More Complex Words',
    'V Initial 5 More Complex Sentences',
    'V Medial 1 Simple Word, Phrase, Sentence',
    'V Medial 5 More Complex Words',
    'V Medial 5 More Complex Sentences',
    'V Final 1 CVC Word',
    'V Final 1 Simple Word, Phrase, Sentence',
    'V Final 5 More Complex Words',
    'V Final 5 More Complex Sentences',
  ],
  artic_sh_ch: [
    'Sh Initial 1 CVC Word',
    'Sh Initial 1 Simple Word, Phrase, Sentence',
    'Sh Initial 5 More Complex Words',
    'Sh Initial 5 More Complex Sentences',
    'Sh Medial 1 Simple Word, Phrase, Sentence',
    'Sh Medial 5 More Complex Words',
    'Sh Medial 5 More Complex Sentences',
    'Sh Final 1 CVC Word',
    'Sh Final 1 Simple Word, Phrase, Sentence',
    'Sh Final 5 More Complex Words',
    'Sh Final 5 More Complex Sentences',
    'Ch Initial 1 CVC Word',
    'Ch Initial 1 Simple Word, Phrase, Sentence',
    'Ch Initial 5 More Complex Words',
    'Ch Initial 5 More Complex Sentences',
    'Ch Medial 1 Simple Word, Phrase, Sentence',
    'Ch Medial 5 More Complex Words',
    'Ch Medial 5 More Complex Sentences',
    'Ch Final 1 Simple Word, Phrase, Sentence',
    'Ch Final 5 More Complex Words',
    'Ch Final 5 More Complex Sentences',
  ],
  artic_z: [
    'Z Initial 1 CVC Word',
    'Z Initial 5 More Complex Words',
    'Z Initial 5 More Complex Sentences',
    'Z Medial 5 More Complex Words',
    'Z Medial 5 More Complex Sentences',
    'Z Final 1 CVC Word',
    'Z Final 5 More Complex Words',
    'Z Final 5 More Complex Sentences',
  ],
  artic_j: [
    'J Initial 1 CVC Word',
    'J Initial 1 Simple Word, Phrase, Sentence',
    'J Initial 5 More Complex Words',
    'J Initial 5 More Complex Sentences',
    'J Medial 1 Simple Word, Phrase, Sentence',
    'J Medial 5 More Complex Words',
    'J Medial 5 More Complex Sentences',
    'J Final 1 CVC Word',
    'J Final 1 Simple Word, Phrase, Sentence',
    'J Final 5 More Complex Words',
    'J Final 5 More Complex Sentences',
  ],
  artic_blends: [
    'Consonant Clusters - Scr',
    'Consonant Clusters - Shr',
    'Consonant Clusters - Skw',
    'Consonant Clusters - Spl',
    'Consonant Clusters - Spr',
    'Consonant Clusters - Str',
    'Consonant Clusters - Thr',
  ],
  artic_other: [
    'B Initial 1 CVC Word',
    'D Initial 1 CVC Word',
    'H Initial 1 CVC Word',
    'M Initial 1 CVC Word',
    'N Initial 1 CVC Word',
    'P Initial 1 CVC Word',
    'T Initial 1 CVC Word',
    'W Initial 1 CVC Word',
    'Y Initial 1 Simple Word, Phrase, Sentence',
  ],
};

export const IEP_GOAL_TYPE_LABELS: Record<IEPGoalType, string> = {
  // Language types
  compare_contrast: 'Compare & Contrast',
  object_description: 'Object Description',
  wh_questions: 'Wh- Questions',
  category_naming: 'Category Naming',
  grammar_syntax: 'Grammar & Syntax',
  similarities_differences: 'Similarities & Differences',
  inferencing: 'Inferencing',
  problem_solving: 'Problem Solving',
  following_directions: 'Following Directions',
  vocabulary: 'Vocabulary',
  // Articulation types
  artic_r: '/r/ Sound',
  artic_s: '/s/ Sound',
  artic_l: '/l/ Sound',
  artic_th: '/th/ Sound',
  artic_k_g: '/k/ and /g/ Sounds',
  artic_f_v: '/f/ and /v/ Sounds',
  artic_sh_ch: '/sh/ and /ch/ Sounds',
  artic_z: '/z/ Sound',
  artic_j: '/j/ Sound',
  artic_blends: 'Consonant Blends',
  artic_other: 'Other Articulation',
};

// ============================================
// API Request/Response Types
// ============================================

// Auth
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  credentials?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  therapist: Omit<Therapist, 'password_hash'>;
}

// Student
export interface CreateStudentRequest {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  diagnosis?: string;
  avatar_emoji?: string;
  // New fields for child account
  username: string;
  password: string;
  problem_type?: ProblemType; // Optional - will be set from AI when uploading evaluation PDF
  eval_data?: EvalData;
}

export interface UpdateStudentRequest extends Partial<Omit<CreateStudentRequest, 'password'>> {
  password?: string; // Optional password update
}

// Child Authentication
export interface ChildLoginRequest {
  username: string;
  password: string;
}

export interface ChildAuthResponse {
  token: string;
  child: Omit<Student, 'password_hash'>;
  goals: IEPGoal[];
  show_demo: boolean;
}

export interface ChildJWTPayload {
  child_id: number;
  username: string;
  iat?: number;
  exp?: number;
}

// IEP Goal
export interface CreateIEPGoalRequest {
  goal_type: IEPGoalType | string; // Can be predefined type or direct category name
  goal_types?: string[]; // Multiple goal types/categories (takes precedence over goal_type for mapped_categories)
  goal_description: string;
  target_percentage: number;
  sessions_to_confirm: number;
  expected_prompt_level?: PromptLevel;
  deadline?: string;
  baseline?: string;
  comments?: string;
}

export interface UpdateIEPGoalRequest extends Partial<CreateIEPGoalRequest> {
  is_active?: boolean;
}

export interface GoalProgressResponse {
  goal: IEPGoal;
  sessions_completed: number;
  current_accuracy: number;
  current_prompt_level: PromptLevel;
  sessions_at_current_level: number;
  threshold_status: ThresholdStatus;
  progress_toward_target: number; // percentage
}

// Session
export interface StartSessionRequest {
  student_id: number;
  iep_goal_id?: number;
}

export interface StartSessionResponse {
  session_id: number;
  prompt_level: PromptLevel;
  categories: string[];
}

export interface RecordTrialRequest {
  card_category: string;
  card_data: string;
  user_answer?: string;
  is_correct: boolean;
  response_time_ms?: number;
}

export interface EndSessionResponse {
  session: Session;
  accuracy_percentage: number;
  threshold_result?: ThresholdResult;
  generated_soap?: AIGeneratedSOAP;
}

/**
 * AI-generated SOAP note data
 */
export interface AIGeneratedSOAP {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/**
 * Request to save SOAP note to a session
 */
export interface SaveSessionSOAPRequest {
  soap_subjective: string;
  soap_objective: string;
  soap_assessment: string;
  soap_plan: string;
}

// Threshold
export interface ThresholdStatus {
  can_advance: boolean;
  at_risk_fallback: boolean;
  sessions_above_advance: number;
  sessions_below_fallback: number;
}

export interface ThresholdResult {
  adjusted: boolean;
  direction: 'advance' | 'fallback' | 'maintain';
  old_level: PromptLevel;
  new_level: PromptLevel;
  reasoning: string;
}

// SOAP Notes
export interface SessionSOAPNote {
  student_name: string;
  session_date: string;
  goal_type?: string;
  goal_description?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  trials: {
    total: number;
    correct: number;
    accuracy: number;
  };
  prompt_level: string;
  categories_practiced: Array<{
    category: string;
    correct: number;
    total: number;
    accuracy: number;
  }>;
  // Stored SOAP fields (may be undefined if not saved yet)
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  // SLP review tracking (0 = not reviewed, 1 = reviewed)
  slp_reviewed?: number;
}

export interface CumulativeSOAPNote {
  student_name: string;
  goal_description: string;
  goal_type: string;
  target_percentage: number;
  reporting_period: {
    start: string;
    end: string;
  };
  session_history: Array<{
    date: string;
    trials: number;
    accuracy: number;
    prompt_level: string;
  }>;
  current_status: {
    average_accuracy: number;
    current_prompt_level: string;
    sessions_completed: number;
    progress_toward_goal: number;
  };
  recommendation: string;
}

// ============================================
// JWT Payload
// ============================================

export interface JWTPayload {
  therapist_id: number;
  email: string;
  iat?: number;
  exp?: number;
}

// ============================================
// Auto-Generate IEP Goals Types
// ============================================

/**
 * Evaluation data used for AI goal generation
 * Combines student info with eval data
 */
export interface EvaluationDataForGeneration {
  student_id: number;
  first_name: string;
  last_name: string;
  grade_level?: string;
  diagnosis?: string;
  problem_type: ProblemType;
  eval_data: EvalData;
}

/**
 * Generated IEP goal from AI (before saving to DB)
 */
export interface GeneratedIEPGoal {
  goal_type: string;
  goal_description: string;
  target_percentage: number;
  sessions_to_confirm: number;
  recommended_prompt_level: PromptLevel;
  deadline?: string;
  baseline?: string;
  rationale: string; // Why this goal was recommended
}

/**
 * Request body for generating IEP goals
 */
export interface GenerateGoalsRequest {
  student_id: number;
}

/**
 * Response from goal generation endpoint
 */
export interface GenerateGoalsResponse {
  goals: GeneratedIEPGoal[];
  evaluation_summary: string;
  generated_at: string;
}

/**
 * Logic rules applied during goal generation
 */
export interface GoalGenerationRules {
  diagnosis_type: ProblemType;
  baseline_accuracy: number;
  calculated_target: number;
  recommended_prompt_level: PromptLevel;
  priority_areas: string[];
}

// ============================================
// Evaluation Upload & Extraction Types
// ============================================

/**
 * Single extracted field with confidence score
 */
export interface ExtractedField<T = string | string[] | number | null> {
  value: T;
  confidence: number; // 0-1
  source_hint?: string; // e.g., "Found on page 2, under 'Diagnosis'"
}

/**
 * Result of AI extraction from evaluation PDF
 */
export interface ExtractionResult {
  // Service Type Detection
  service_type: ExtractedField<ProblemType | null> & { reasoning?: string };

  // Background Information
  languages_spoken: ExtractedField<string | null>;
  family_religion: ExtractedField<string | null>;
  medical_history: ExtractedField<string | null>;
  other_diagnoses: ExtractedField<string | null>;

  // Speech/Language History
  speech_diagnoses: ExtractedField<string | null>;
  prior_therapy: ExtractedField<string | null>; // 'none', 'less-1', '1-2', '2-3', '3+'
  baseline_accuracy: ExtractedField<number | null>;

  // Assessment Results
  goals_benchmarks: ExtractedField<string | null>;
  strengths: ExtractedField<string | null>;
  weaknesses: ExtractedField<string | null>;
  target_sounds: ExtractedField<string[] | null>; // For articulation

  // School Contacts
  teachers: ExtractedField<string | null>;
  notes: ExtractedField<string | null>;

  // Extraction metadata
  extraction_notes: string;
}

/**
 * Response from evaluation upload endpoint
 */
export interface EvaluationUploadResponse {
  success: boolean;
  pdf_url: string;
  extracted_data: ExtractionResult;
  extraction_notes: string;
}

/**
 * Request to confirm/save extracted evaluation data
 */
export interface ConfirmEvaluationRequest {
  eval_data: EvalData;
}

// ============================================
// Goal Upload & Extraction Types
// ============================================

/**
 * Single extracted goal from IEP document
 */
export interface ExtractedGoal {
  baseline: ExtractedField<string | null>; // Measurable baseline for this goal
  deadline: ExtractedField<string | null>;
  description: ExtractedField<string | null>;
  goal_type: ExtractedField<string | null> & { reasoning?: string }; // Accepts any goal type (legacy, section header, or card name)
  target_accuracy: ExtractedField<number | null>;
  sessions_to_confirm: ExtractedField<number | null>;
  comments: ExtractedField<string | null>;
}

/**
 * Result of AI extraction from goal PDF
 * Note: Service type is NOT extracted here - it comes from the Evaluation Data
 */
export interface GoalExtractionResult {
  goals: ExtractedGoal[];
  extraction_notes: string;
}

/**
 * Response from goal upload endpoint
 */
export interface GoalUploadResponse {
  success: boolean;
  pdf_url: string;
  extracted_data: GoalExtractionResult;
  extraction_notes: string;
  service_type: ProblemType | null; // From student's stored evaluation data
}

/**
 * Request to confirm/save extracted goals
 */
export interface ConfirmGoalsRequest {
  baseline?: string; // Deprecated - baseline is now per goal
  goals: Array<{
    baseline?: string; // Measurable baseline for this goal
    deadline?: string;
    description: string;
    goal_type: string;
    target_accuracy: number;
    sessions_to_confirm: number;
    comments?: string;
  }>;
}

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      therapist?: JWTPayload;
      child?: ChildJWTPayload;
    }
  }
}
