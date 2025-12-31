/**
 * PIPER AI Feedback Service
 * Generates AI-powered therapeutic feedback using language/articulation prompts
 */

import OpenAI from 'openai';
import { config } from '../../../config';
import { LANGUAGE_THERAPY_PROMPT } from './prompts/language.prompt';
import { ARTICULATION_THERAPY_PROMPT } from './prompts/articulation.prompt';
import { ProblemType } from '../../../types/piper';
import { logger } from '../../../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

export interface FeedbackRequest {
  problem_type: ProblemType;
  category: string;
  question: string;
  expected_answer: string;
  user_answer: string;
  is_correct: boolean;
  child_name?: string;
  prompt_level?: 1 | 2 | 3; // 1=MAX (full support), 2=MOD (moderate), 3=MIN (minimal)
}

export interface FeedbackResponse {
  feedback: string;
  suggestions?: string[];
}

/**
 * Generate AI feedback for a trial
 */
export async function generateFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  const {
    problem_type,
    category,
    question,
    expected_answer,
    user_answer,
    is_correct,
    child_name,
  } = request;

  // Select appropriate prompt based on problem type
  const systemPrompt = problem_type === 'articulation'
    ? ARTICULATION_THERAPY_PROMPT
    : LANGUAGE_THERAPY_PROMPT;

  // Build user message with trial context and prompt level
  const promptLevel = request.prompt_level || 2; // Default to MOD
  const userMessage = buildUserMessage({
    category,
    question,
    expected_answer,
    user_answer,
    is_correct,
    child_name,
    prompt_level: promptLevel,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for feedback
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 150, // Keep responses concise
    });

    const feedback = response.choices[0].message.content || getDefaultFeedback(is_correct, expected_answer);

    logger.info(`AI feedback generated for ${problem_type}/${category}: ${is_correct ? 'correct' : 'incorrect'}`);

    return { feedback };
  } catch (error) {
    logger.error('AI feedback generation failed:', error);
    // Return default feedback on error
    return {
      feedback: getDefaultFeedback(is_correct, expected_answer),
    };
  }
}

/**
 * Get prompt level instructions for AI feedback
 */
function getPromptLevelInstructions(promptLevel: 1 | 2 | 3, isCorrect: boolean): string {
  if (isCorrect) {
    // For correct answers, prompt level affects how much reinforcement/expansion
    switch (promptLevel) {
      case 1: // MAX - Full support
        return `PROMPT LEVEL: MAX (Full Support)
- Provide enthusiastic praise with specific reinforcement
- Expand on WHY the answer is correct
- Model an extended example or related concept`;
      case 2: // MOD - Moderate support
        return `PROMPT LEVEL: MOD (Moderate Support)
- Provide warm encouragement
- Briefly acknowledge what made it correct
- Keep it concise (1-2 sentences)`;
      case 3: // MIN - Minimal support
        return `PROMPT LEVEL: MIN (Minimal Support)
- Brief, simple praise only
- No expansion or teaching - child is near mastery
- One short sentence is enough`;
    }
  } else {
    // For incorrect answers, prompt level affects how much help/cueing
    switch (promptLevel) {
      case 1: // MAX - Full support
        return `PROMPT LEVEL: MAX (Full Support)
- Give direct, explicit cues toward the answer
- Provide phonemic cue (first sound) or semantic cue (category hint)
- Model part of the answer if needed
- Be very supportive - child needs scaffolding`;
      case 2: // MOD - Moderate support
        return `PROMPT LEVEL: MOD (Moderate Support)
- Give an indirect hint (e.g., "Think about..." or "Remember when...")
- Provide a semantic or contextual cue
- Don't give the answer directly
- Encourage another attempt`;
      case 3: // MIN - Minimal support
        return `PROMPT LEVEL: MIN (Minimal Support)
- Minimal cueing - just acknowledge the attempt
- Brief redirection: "Not quite, the answer is [X]"
- Child is expected to self-correct at this level
- Keep it short and move on`;
    }
  }
}

/**
 * Build user message for the AI
 */
function buildUserMessage(params: {
  category: string;
  question: string;
  expected_answer: string;
  user_answer: string;
  is_correct: boolean;
  child_name?: string;
  prompt_level: 1 | 2 | 3;
}): string {
  const { category, question, expected_answer, user_answer, is_correct, child_name, prompt_level } = params;

  const name = child_name || 'the child';
  const promptInstructions = getPromptLevelInstructions(prompt_level, is_correct);

  if (is_correct) {
    return `CORRECT RESPONSE:
Category: ${category}
Question/Prompt: ${question}
Expected Answer: ${expected_answer}
${name}'s Answer: ${user_answer}

${promptInstructions}

Generate feedback following the prompt level guidelines above.`;
  } else {
    return `INCORRECT RESPONSE:
Category: ${category}
Question/Prompt: ${question}
Expected Answer: ${expected_answer}
${name}'s Answer: ${user_answer || '(no response)'}

${promptInstructions}

Generate feedback following the prompt level guidelines above. Be supportive, never harsh.`;
  }
}

/**
 * Get default feedback when AI fails
 */
function getDefaultFeedback(isCorrect: boolean, expectedAnswer: string): string {
  if (isCorrect) {
    return "Great job! That's correct!";
  } else {
    return `Good try! The answer is: ${expectedAnswer}. Let's try another one!`;
  }
}

/**
 * Generate quick feedback without AI (for fallback or low-latency needs)
 */
export function generateQuickFeedback(
  isCorrect: boolean,
  expectedAnswer: string,
  userAnswer?: string
): string {
  if (isCorrect) {
    const praises = [
      "That's right! Great job!",
      "Excellent! You got it!",
      "Perfect! Nice work!",
      "Correct! Well done!",
      "Yes! That's exactly right!",
    ];
    return praises[Math.floor(Math.random() * praises.length)];
  } else {
    if (userAnswer) {
      return `Good try! You said "${userAnswer}". The answer is "${expectedAnswer}". Keep practicing!`;
    }
    return `The answer is "${expectedAnswer}". Let's try another one!`;
  }
}

export default {
  generateFeedback,
  generateQuickFeedback,
};
