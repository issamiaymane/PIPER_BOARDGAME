/**
 * Student/Child Types
 * Types for child data and CRUD operations
 */

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
  goals_pdf_path?: string;
  goals_pdf_uploaded_at?: string;
  goals_pdf_original_name?: string;
  session_duration_minutes?: number; // IEP service time: duration per session
  session_frequency?: string; // IEP service time: e.g., "2x weekly"
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

export interface UpdateChildRequest {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  grade_level?: string;
  problem_type?: 'language' | 'articulation' | 'both';
  eval_data?: EvalData;
  session_duration_minutes?: number;
  session_frequency?: string;
}
