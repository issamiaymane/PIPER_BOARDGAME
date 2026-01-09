/**
 * Evaluation Types
 * Types for PDF evaluation extraction
 */

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
