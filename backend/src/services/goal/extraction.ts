/**
 * Goal Extraction Service
 * Uses OpenAI to extract IEP goals from PDFs
 */

import OpenAI from 'openai';
import { config } from '../../config/index.js';
import type { GoalExtractionResult, GoalType } from '../../types/index.js';
import { GOAL_EXTRACTION_PROMPT } from './prompts/goal-extraction.prompt.js';
import { logger } from '../../utils/logger.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const MAX_PAGES = 10;

export class PasswordRequiredError extends Error {
  constructor() {
    super('PDF is password protected');
    this.name = 'PasswordRequiredError';
  }
}

async function pdfToImages(pdfBuffer: Buffer, password?: string): Promise<string[]> {
  const images: string[] = [];
  let pageCount = 0;

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

function createEmptyExtractionResult(notes: string): GoalExtractionResult {
  return {
    goals: [],
    extraction_notes: notes,
  };
}

function normalizeGoalType(value: unknown): GoalType | null {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'articulation') return 'articulation';
    if (normalized === 'language') return 'language';
  }
  return null;
}

function normalizeExtractionResult(data: Record<string, unknown>): GoalExtractionResult {
  const goals = Array.isArray(data.goals) ? data.goals : [];

  // Extract session time fields (document-level)
  const sessionDuration = data.session_duration_minutes as Record<string, unknown> | undefined;
  const sessionFrequency = data.session_frequency as Record<string, unknown> | undefined;

  const normalizedGoals = goals.map((goal: Record<string, unknown>) => {
    const goalType = goal.goal_type as Record<string, unknown> | undefined;
    const goalDesc = goal.goal_description as Record<string, unknown> | undefined;
    const targetPct = goal.target_percentage as Record<string, unknown> | undefined;
    const targetDate = goal.target_date as Record<string, unknown> | undefined;
    const baseline = goal.baseline as Record<string, unknown> | undefined;
    const deadline = goal.deadline as Record<string, unknown> | undefined;
    const sessions = goal.sessions_to_confirm as Record<string, unknown> | undefined;
    const comments = goal.comments as Record<string, unknown> | undefined;
    const boardgameCategories = goal.boardgame_categories as Record<string, unknown> | undefined;

    return {
      goal_type: {
        value: normalizeGoalType(goalType?.value),
        confidence: typeof goalType?.confidence === 'number' ? goalType.confidence : 0,
        reasoning: typeof goalType?.reasoning === 'string' ? goalType.reasoning : undefined,
      },
      goal_description: {
        value: typeof goalDesc?.value === 'string' ? goalDesc.value : null,
        confidence: typeof goalDesc?.confidence === 'number' ? goalDesc.confidence : 0,
        source_hint: typeof goalDesc?.source_hint === 'string' ? goalDesc.source_hint : undefined,
      },
      target_percentage: {
        value: typeof targetPct?.value === 'number' ? targetPct.value : 80,
        confidence: typeof targetPct?.confidence === 'number' ? targetPct.confidence : 0,
        source_hint: typeof targetPct?.source_hint === 'string' ? targetPct.source_hint : undefined,
      },
      target_date: {
        value: typeof targetDate?.value === 'string' ? targetDate.value : null,
        confidence: typeof targetDate?.confidence === 'number' ? targetDate.confidence : 0,
        source_hint: typeof targetDate?.source_hint === 'string' ? targetDate.source_hint : undefined,
      },
      baseline: {
        value: typeof baseline?.value === 'string' ? baseline.value : null,
        confidence: typeof baseline?.confidence === 'number' ? baseline.confidence : 0,
        source_hint: typeof baseline?.source_hint === 'string' ? baseline.source_hint : undefined,
      },
      deadline: {
        value: typeof deadline?.value === 'string' ? deadline.value : null,
        confidence: typeof deadline?.confidence === 'number' ? deadline.confidence : 0,
        source_hint: typeof deadline?.source_hint === 'string' ? deadline.source_hint : undefined,
      },
      sessions_to_confirm: {
        value: typeof sessions?.value === 'number' ? sessions.value : 3,
        confidence: typeof sessions?.confidence === 'number' ? sessions.confidence : 0,
        source_hint: typeof sessions?.source_hint === 'string' ? sessions.source_hint : undefined,
      },
      comments: {
        value: typeof comments?.value === 'string' ? comments.value : null,
        confidence: typeof comments?.confidence === 'number' ? comments.confidence : 0,
        source_hint: typeof comments?.source_hint === 'string' ? comments.source_hint : undefined,
      },
      boardgame_categories: {
        value: Array.isArray(boardgameCategories?.value)
          ? boardgameCategories.value.filter((v): v is string => typeof v === 'string')
          : null,
        confidence: typeof boardgameCategories?.confidence === 'number' ? boardgameCategories.confidence : 0,
        reasoning: typeof boardgameCategories?.reasoning === 'string' ? boardgameCategories.reasoning : undefined,
      },
    };
  });

  return {
    goals: normalizedGoals,
    extraction_notes:
      typeof data.extraction_notes === 'string'
        ? data.extraction_notes
        : 'Extraction completed',
    session_duration_minutes: {
      value: typeof sessionDuration?.value === 'number' ? sessionDuration.value : null,
      confidence: typeof sessionDuration?.confidence === 'number' ? sessionDuration.confidence : 0,
      source_hint: typeof sessionDuration?.source_hint === 'string' ? sessionDuration.source_hint : undefined,
    },
    session_frequency: {
      value: typeof sessionFrequency?.value === 'string' ? sessionFrequency.value : null,
      confidence: typeof sessionFrequency?.confidence === 'number' ? sessionFrequency.confidence : 0,
      source_hint: typeof sessionFrequency?.source_hint === 'string' ? sessionFrequency.source_hint : undefined,
    },
  };
}

export async function extractGoalsData(
  pdfBuffer: Buffer,
  password?: string
): Promise<GoalExtractionResult> {
  try {
    logger.info('Starting IEP goals PDF extraction...');

    const pageImages = await pdfToImages(pdfBuffer, password);

    if (pageImages.length === 0) {
      return createEmptyExtractionResult('Could not extract any pages from PDF.');
    }

    const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: `Please extract all IEP goals from this ${pageImages.length}-page document. Return ONLY valid JSON.`,
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: GOAL_EXTRACTION_PROMPT,
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
      return createEmptyExtractionResult('AI returned empty response. Please enter goals manually.');
    }

    logger.info('Received goals extraction response from OpenAI');

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
    logger.info(`Goals extraction completed: ${result.goals.length} goals found`);
    return result;
  } catch (error) {
    if (error instanceof PasswordRequiredError) {
      throw error;
    }

    logger.error('Goals extraction failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createEmptyExtractionResult(`Extraction failed: ${errorMessage}. Please enter goals manually.`);
  }
}

export default {
  extractGoalsData,
  PasswordRequiredError,
};
