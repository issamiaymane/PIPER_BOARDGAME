/**
 * Evaluation Extraction Service
 * Uses OpenAI to extract clinical information from evaluation PDFs
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { ExtractionResult, ExtractedField, ProblemType } from '../../types/index.js';
import { EVALUATION_EXTRACTION_PROMPT } from './prompts/evaluation-extraction.prompt.js';
import { logger } from '../../utils/logger.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Maximum pages to process
const MAX_PAGES = 10;

/**
 * Custom error for password-protected PDFs
 */
export class PasswordRequiredError extends Error {
  constructor() {
    super('PDF is password protected');
    this.name = 'PasswordRequiredError';
  }
}

/**
 * Convert PDF buffer to array of base64 PNG images
 */
async function pdfToImages(pdfBuffer: Buffer, password?: string): Promise<string[]> {
  const images: string[] = [];
  let pageCount = 0;

  // Dynamic import for ESM-only package
  const { pdf } = await import('pdf-to-img');

  const options: { scale: number; password?: string } = { scale: 2 };
  if (password) {
    options.password = password;
  }

  try {
    const document = await pdf(pdfBuffer, options);

    for await (const image of document) {
      if (pageCount >= MAX_PAGES) {
        logger.warn(`PDF has more than ${MAX_PAGES} pages, truncating`);
        break;
      }
      const base64 = image.toString('base64');
      images.push(`data:image/png;base64,${base64}`);
      pageCount++;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      throw new PasswordRequiredError();
    }
    throw error;
  }

  logger.info(`Converted ${images.length} PDF pages to images`);
  return images;
}

/**
 * Create empty extraction result (for fallback)
 */
function createEmptyExtractionResult(notes: string): ExtractionResult {
  const emptyField = <T>(value: T): ExtractedField<T> => ({
    value,
    confidence: 0,
    source_hint: 'Not found',
  });

  return {
    service_type: { value: null, confidence: 0, source_hint: 'Not found', reasoning: undefined },
    languages_spoken: emptyField(null),
    family_religion: emptyField(null),
    medical_history: emptyField(null),
    other_diagnoses: emptyField(null),
    speech_diagnoses: emptyField(null),
    prior_therapy: emptyField(null),
    baseline_accuracy: emptyField(null),
    goals_benchmarks: emptyField(null),
    strengths: emptyField(null),
    weaknesses: emptyField(null),
    target_sounds: emptyField(null),
    teachers: emptyField(null),
    notes: emptyField(null),
    extraction_notes: notes,
  };
}

/**
 * Normalize service type value
 */
function normalizeServiceType(value: unknown): ProblemType | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'articulation') return 'articulation';
    if (normalized === 'language') return 'language';
    if (normalized === 'both') return 'both';
  }
  return null;
}

/**
 * Validate and normalize AI response
 */
function normalizeExtractionResult(data: Record<string, unknown>): ExtractionResult {
  const normalizeField = <T>(
    field: unknown,
    defaultValue: T
  ): ExtractedField<T> => {
    if (!field || typeof field !== 'object') {
      return { value: defaultValue, confidence: 0, source_hint: 'Not found' };
    }

    const f = field as Record<string, unknown>;
    return {
      value: (f.value as T) ?? defaultValue,
      confidence: typeof f.confidence === 'number' ? f.confidence : 0,
      source_hint: typeof f.source_hint === 'string' ? f.source_hint : undefined,
    };
  };

  const serviceTypeField = data.service_type as Record<string, unknown> | undefined;
  const normalizedServiceType = normalizeServiceType(serviceTypeField?.value);

  return {
    service_type: {
      value: normalizedServiceType,
      confidence: typeof serviceTypeField?.confidence === 'number' ? serviceTypeField.confidence : 0,
      source_hint: typeof serviceTypeField?.source_hint === 'string' ? serviceTypeField.source_hint : undefined,
      reasoning: typeof serviceTypeField?.reasoning === 'string' ? serviceTypeField.reasoning : undefined,
    },
    languages_spoken: normalizeField<string | null>(data.languages_spoken, null),
    family_religion: normalizeField<string | null>(data.family_religion, null),
    medical_history: normalizeField<string | null>(data.medical_history, null),
    other_diagnoses: normalizeField<string | null>(data.other_diagnoses, null),
    speech_diagnoses: normalizeField<string | null>(data.speech_diagnoses, null),
    prior_therapy: normalizeField<string | null>(data.prior_therapy, null),
    baseline_accuracy: normalizeField<number | null>(data.baseline_accuracy, null),
    goals_benchmarks: normalizeField<string | null>(data.goals_benchmarks, null),
    strengths: normalizeField<string | null>(data.strengths, null),
    weaknesses: normalizeField<string | null>(data.weaknesses, null),
    target_sounds: normalizeField<string[] | null>(data.target_sounds, null),
    teachers: normalizeField<string | null>(data.teachers, null),
    notes: normalizeField<string | null>(data.notes, null),
    extraction_notes:
      typeof data.extraction_notes === 'string'
        ? data.extraction_notes
        : 'Extraction completed',
  };
}

/**
 * Extract evaluation data from PDF using OpenAI
 */
export async function extractEvaluationData(
  pdfBuffer: Buffer,
  password?: string
): Promise<ExtractionResult> {
  try {
    logger.info('Starting evaluation PDF extraction...');

    // Convert PDF to images
    const pageImages = await pdfToImages(pdfBuffer, password);

    if (pageImages.length === 0) {
      return createEmptyExtractionResult('Could not extract any pages from PDF.');
    }

    // Build content array with all page images
    const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Please extract the clinical information from this ${pageImages.length}-page evaluation report. Return ONLY valid JSON.`,
      },
    ];

    for (const imageUrl of pageImages) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high',
        },
      });
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: EVALUATION_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: contentParts,
        },
      ],
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      logger.warn('Empty response from OpenAI extraction');
      return createEmptyExtractionResult('AI returned empty response. Please enter data manually.');
    }

    logger.info('Received extraction response from OpenAI');

    // Parse JSON
    let extractedData: Record<string, unknown>;

    try {
      extractedData = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          extractedData = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not find JSON in response');
        }
      }
    }

    const result = normalizeExtractionResult(extractedData);
    logger.info('Evaluation extraction completed successfully');
    return result;
  } catch (error) {
    if (error instanceof PasswordRequiredError) {
      throw error;
    }

    logger.error('Evaluation extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createEmptyExtractionResult(`Extraction failed: ${errorMessage}. Please enter data manually.`);
  }
}

/**
 * Convert extraction result to EvalData format for saving
 */
export function extractionResultToEvalData(result: ExtractionResult): Record<string, unknown> {
  const evalData: Record<string, unknown> = {};

  if (result.languages_spoken.value) evalData.languages_spoken = result.languages_spoken.value;
  if (result.family_religion.value) evalData.family_religion = result.family_religion.value;
  if (result.medical_history.value) evalData.medical_history = result.medical_history.value;
  if (result.other_diagnoses.value) evalData.other_diagnoses = result.other_diagnoses.value;
  if (result.speech_diagnoses.value) evalData.speech_diagnoses = result.speech_diagnoses.value;
  if (result.prior_therapy.value) evalData.prior_therapy = result.prior_therapy.value;
  if (result.baseline_accuracy.value !== null) evalData.baseline_accuracy = result.baseline_accuracy.value;
  if (result.goals_benchmarks.value) evalData.goals_benchmarks = result.goals_benchmarks.value;
  if (result.strengths.value) evalData.strengths = result.strengths.value;
  if (result.weaknesses.value) evalData.weaknesses = result.weaknesses.value;
  if (result.target_sounds.value?.length) evalData.target_sounds = result.target_sounds.value;
  if (result.teachers.value) evalData.teachers = result.teachers.value;
  if (result.notes.value) evalData.notes = result.notes.value;

  return evalData;
}

export default {
  extractEvaluationData,
  extractionResultToEvalData,
  createEmptyExtractionResult,
  PasswordRequiredError,
};
