/**
 * Goal Extraction Service
 *
 * Uses OpenAI to extract IEP goal information from PDF documents.
 * Converts PDF to images and sends to AI for structured extraction.
 *
 * NOTE: Service type is NOT determined here - it comes from the Evaluation Data.
 */

import OpenAI from 'openai';
import { config } from '../../../config';
import {
  GoalExtractionResult,
  ExtractedGoal,
  ExtractedField,
  IEPGoalType,
} from '../../../types/piper';
import { buildGoalExtractionPrompt } from '../ai/prompts/goal-extraction.prompt';
import { logger } from '../../../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Maximum pages to process (to limit API costs and time)
const MAX_PAGES = 10;

// Valid language goal types
const LANGUAGE_GOAL_TYPES = [
  'compare_contrast',
  'object_description',
  'wh_questions',
  'category_naming',
  'grammar_syntax',
  'similarities_differences',
  'inferencing',
  'problem_solving',
  'following_directions',
  'vocabulary',
] as const;

// Valid articulation goal types
const ARTICULATION_GOAL_TYPES = [
  'artic_r',
  'artic_s',
  'artic_l',
  'artic_th',
  'artic_k_g',
  'artic_f_v',
  'artic_sh_ch',
  'artic_z',
  'artic_j',
  'artic_blends',
  'artic_other',
] as const;

// Combined valid goal types
const ALL_VALID_GOAL_TYPES = [...LANGUAGE_GOAL_TYPES, ...ARTICULATION_GOAL_TYPES];

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
 * @param pdfBuffer - The PDF file as a buffer
 * @param password - Optional password for protected PDFs
 */
async function pdfToImages(pdfBuffer: Buffer, password?: string): Promise<string[]> {
  const images: string[] = [];
  let pageCount = 0;

  // Dynamic import for ESM-only package
  const { pdf } = await import('pdf-to-img');

  // pdf-to-img options - include password if provided
  const options: { scale: number; password?: string } = { scale: 2 };
  if (password) {
    options.password = password;
  }

  try {
    // pdf-to-img returns an async iterator of page images
    const document = await pdf(pdfBuffer, options);

    for await (const image of document) {
      if (pageCount >= MAX_PAGES) {
        logger.warn(`PDF has more than ${MAX_PAGES} pages, truncating`);
        break;
      }
      // Convert Buffer to base64 data URL
      const base64 = image.toString('base64');
      images.push(`data:image/png;base64,${base64}`);
      pageCount++;
    }
  } catch (error) {
    // Check if this is a password-related error
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
 * Create an empty extraction result (for fallback)
 */
function createEmptyGoalExtractionResult(notes: string): GoalExtractionResult {
  return {
    goals: [],
    extraction_notes: notes,
  };
}

/**
 * Validate and normalize a goal type string
 * NEW: Preserves boardgame-data.js section headers (e.g., '---R Sound', '---Wh- Questions')
 * Falls back to legacy format mapping for backwards compatibility
 */
function normalizeGoalType(goalType: string | null, serviceType: 'language' | 'articulation' | null): string | null {
  if (!goalType) return null;

  // NEW: If it's a boardgame section header (starts with ---), return as-is
  // These are the new format from the AI extraction prompt
  if (goalType.startsWith('---')) {
    return goalType;
  }

  // LEGACY FALLBACK: Normalize for backwards compatibility with old goal types
  const normalized = goalType.toLowerCase().replace(/[- ]/g, '_');

  // Check if it's already a valid legacy goal type
  if (ALL_VALID_GOAL_TYPES.includes(normalized as typeof ALL_VALID_GOAL_TYPES[number])) {
    return normalized;
  }

  // Try to map common variations for LANGUAGE goals
  if (serviceType === 'language' || serviceType === null) {
    const languageMappings: Record<string, string> = {
      compare: 'compare_contrast',
      contrast: 'compare_contrast',
      description: 'object_description',
      describing: 'object_description',
      questions: 'wh_questions',
      wh: 'wh_questions',
      category: 'category_naming',
      categories: 'category_naming',
      grammar: 'grammar_syntax',
      syntax: 'grammar_syntax',
      similarities: 'similarities_differences',
      differences: 'similarities_differences',
      inference: 'inferencing',
      problem: 'problem_solving',
      directions: 'following_directions',
      vocab: 'vocabulary',
    };

    for (const [key, value] of Object.entries(languageMappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }
  }

  // Try to map common variations for ARTICULATION goals
  if (serviceType === 'articulation' || serviceType === null) {
    const articMappings: Record<string, string> = {
      'r_sound': 'artic_r',
      'vocalic_r': 'artic_r',
      'r_colored': 'artic_r',
      's_sound': 'artic_s',
      's_blend': 'artic_s',
      'l_sound': 'artic_l',
      'l_blend': 'artic_l',
      'th_sound': 'artic_th',
      'th_voiced': 'artic_th',
      'th_voiceless': 'artic_th',
      'k_sound': 'artic_k_g',
      'g_sound': 'artic_k_g',
      'velar': 'artic_k_g',
      'f_sound': 'artic_f_v',
      'v_sound': 'artic_f_v',
      'sh_sound': 'artic_sh_ch',
      'ch_sound': 'artic_sh_ch',
      'z_sound': 'artic_z',
      'j_sound': 'artic_j',
      'blend': 'artic_blends',
      'cluster': 'artic_blends',
    };

    for (const [key, value] of Object.entries(articMappings)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    // Check for specific sound patterns
    if (normalized.includes('artic') || normalized.includes('phoneme')) {
      if (normalized.includes('r') || normalized.includes('/r/')) return 'artic_r';
      if (normalized.includes('s') && !normalized.includes('sh')) return 'artic_s';
      if (normalized.includes('l')) return 'artic_l';
      if (normalized.includes('th')) return 'artic_th';
      if (normalized.includes('k') || normalized.includes('g')) return 'artic_k_g';
      if (normalized.includes('f') || normalized.includes('v')) return 'artic_f_v';
      if (normalized.includes('sh') || normalized.includes('ch')) return 'artic_sh_ch';
      if (normalized.includes('z')) return 'artic_z';
      if (normalized.includes('j')) return 'artic_j';
    }
  }

  // Return null if no matching goal type found - let user select manually
  return null;
}

/**
 * Normalize a single extracted field
 */
function normalizeField<T>(
  field: unknown,
  defaultValue: T
): ExtractedField<T> {
  if (!field || typeof field !== 'object') {
    return { value: defaultValue, confidence: 0, source_hint: 'Not found' };
  }

  const f = field as Record<string, unknown>;
  return {
    value: (f.value as T) ?? defaultValue,
    confidence: typeof f.confidence === 'number' ? f.confidence : 0,
    source_hint: typeof f.source_hint === 'string' ? f.source_hint : undefined,
  };
}

/**
 * Normalize a single extracted goal
 */
function normalizeExtractedGoal(
  goalData: Record<string, unknown>,
  serviceType: 'language' | 'articulation' | null
): ExtractedGoal {
  const goalTypeField = goalData.goal_type as Record<string, unknown> | undefined;
  const normalizedGoalType = normalizeGoalType(
    (goalTypeField?.value as string) || null,
    serviceType
  );

  return {
    baseline: normalizeField<string | null>(goalData.baseline, null),
    deadline: normalizeField<string | null>(goalData.deadline, null),
    description: normalizeField<string | null>(goalData.description, null),
    goal_type: {
      ...normalizeField<IEPGoalType | null>({ ...goalTypeField, value: normalizedGoalType as IEPGoalType | null }, null),
      reasoning: typeof goalTypeField?.reasoning === 'string' ? goalTypeField.reasoning : undefined,
    },
    target_accuracy: normalizeField<number | null>(goalData.target_accuracy, null),
    sessions_to_confirm: normalizeField<number | null>(goalData.sessions_to_confirm, null),
    comments: normalizeField<string | null>(goalData.comments, null),
  };
}

/**
 * Validate and normalize the AI response
 * @param data - Raw AI response data
 * @param serviceType - The service type from evaluation data (passed from caller)
 */
function normalizeGoalExtractionResult(
  data: Record<string, unknown>,
  serviceType: 'language' | 'articulation' | null
): GoalExtractionResult {
  const goals: ExtractedGoal[] = [];

  // Normalize goals array, using the provided service type for proper goal type classification
  if (Array.isArray(data.goals)) {
    for (const goalData of data.goals) {
      if (goalData && typeof goalData === 'object') {
        goals.push(normalizeExtractedGoal(goalData as Record<string, unknown>, serviceType));
      }
    }
  }

  return {
    goals,
    extraction_notes:
      typeof data.extraction_notes === 'string'
        ? data.extraction_notes
        : 'Extraction completed',
  };
}

/**
 * Extract goal data from a PDF using OpenAI
 *
 * Uses GPT-4o with vision capabilities to analyze PDF content.
 * Converts PDF pages to images first since OpenAI doesn't support PDF directly.
 *
 * @param pdfBuffer - The PDF file buffer
 * @param serviceType - The student's service type from evaluation data (used for goal type classification)
 * @param password - Optional password for protected PDFs
 */
export async function extractGoalData(
  pdfBuffer: Buffer,
  serviceType: 'language' | 'articulation' | null = null,
  password?: string
): Promise<GoalExtractionResult> {
  try {
    logger.info(`Starting goal PDF extraction with service type: ${serviceType || 'not set'}`);

    // Convert PDF to images (OpenAI Vision only supports images, not PDFs)
    const pageImages = await pdfToImages(pdfBuffer, password);

    if (pageImages.length === 0) {
      return createEmptyGoalExtractionResult(
        'Could not extract any pages from PDF.'
      );
    }

    // Build the prompt with the service type context
    const prompt = buildGoalExtractionPrompt(serviceType);

    // Build content array with all page images
    const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Please extract the IEP goal information from this ${pageImages.length}-page document. Return ONLY valid JSON.`,
      },
    ];

    // Add each page image
    for (const imageUrl of pageImages) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high',
        },
      });
    }

    // Call OpenAI with all page images
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: contentParts,
        },
      ],
      max_tokens: 4000,
      temperature: 0.2, // Low temperature for consistent extraction
      response_format: { type: 'json_object' }, // Enforce JSON output
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      logger.warn('Empty response from OpenAI goal extraction');
      return createEmptyGoalExtractionResult(
        'AI returned empty response. Please enter goals manually.'
      );
    }

    logger.info('Received goal extraction response from OpenAI');

    // Parse JSON from response
    let extractedData: Record<string, unknown>;

    try {
      // Try to parse directly
      extractedData = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        // Try to find JSON object in response
        const objectMatch = content.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          extractedData = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not find JSON in response');
        }
      }
    }

    // Normalize and return the result, passing the service type for goal classification
    const result = normalizeGoalExtractionResult(extractedData, serviceType);

    logger.info(
      `Goal extraction completed successfully. Found ${result.goals.length} goals.`
    );
    return result;
  } catch (error) {
    // Re-throw PasswordRequiredError so route can handle it
    if (error instanceof PasswordRequiredError) {
      throw error;
    }

    logger.error('Goal extraction failed:', error);

    // Return empty result with error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return createEmptyGoalExtractionResult(
      `Extraction failed: ${errorMessage}. Please enter goals manually.`
    );
  }
}

export default {
  extractGoalData,
  createEmptyGoalExtractionResult,
};
