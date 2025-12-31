// Therapist Auth types
export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Therapist {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface TherapistAuthResult {
  therapist: Therapist;
  token: string;
}

// Evaluation data stored per child
export interface EvalData {
  languages_spoken?: string;
  family_religion?: string;
  medical_history?: string;
  other_diagnoses?: string;
  speech_diagnoses?: string;
  prior_therapy?: string;
  baseline_accuracy?: number;
  goals_benchmarks?: string;
  strengths?: string;
  weaknesses?: string;
  target_sounds?: string[];
  teachers?: string;
  notes?: string;
}

// Child types (for child dashboard)
export interface Child {
  id: number;
  therapist_id: number;
  username: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
  eval_data?: string; // JSON string of EvalData
  eval_pdf_path?: string;
  eval_pdf_uploaded_at?: string;
  eval_pdf_original_name?: string;
  created_at: string;
}

export interface ChildLoginRequest {
  username: string;
  password: string;
}

export interface ChildAuthResult {
  child: Child;
  token: string;
}

export interface CreateChildRequest {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
}

// Evaluation extraction types
export interface ExtractedField<T = string | string[] | number | null> {
  value: T;
  confidence: number;
  source_hint?: string;
}

export type ProblemType = 'language' | 'articulation' | 'both';

export interface ExtractionResult {
  service_type: ExtractedField<ProblemType | null> & { reasoning?: string };
  languages_spoken: ExtractedField<string | null>;
  family_religion: ExtractedField<string | null>;
  medical_history: ExtractedField<string | null>;
  other_diagnoses: ExtractedField<string | null>;
  speech_diagnoses: ExtractedField<string | null>;
  prior_therapy: ExtractedField<string | null>;
  baseline_accuracy: ExtractedField<number | null>;
  goals_benchmarks: ExtractedField<string | null>;
  strengths: ExtractedField<string | null>;
  weaknesses: ExtractedField<string | null>;
  target_sounds: ExtractedField<string[] | null>;
  teachers: ExtractedField<string | null>;
  notes: ExtractedField<string | null>;
  extraction_notes: string;
}

export interface UpdateChildRequest {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: ProblemType;
  eval_data?: EvalData;
}

// Express extensions
declare global {
  namespace Express {
    interface Request {
      therapist?: { therapist_id: number };
      child?: { child_id: number };
    }
  }
}
