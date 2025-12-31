/**
 * PIPER Goal AI Service
 * Generates IEP goals using OpenAI API based on evaluation data and logic rules
 */

import OpenAI from 'openai';
import { config } from '../../../config';
import {
  EvaluationDataForGeneration,
  GeneratedIEPGoal,
  GenerateGoalsResponse,
  GoalGenerationRules,
  IEP_GOAL_TYPE_LABELS,
} from '../../../types/piper';
import goalGenerator from '../goals/goal-generator.service';
import { logger } from '../../../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * System prompt for IEP goal generation
 */
const GOAL_GENERATION_SYSTEM_PROMPT = `You are an expert Speech-Language Pathologist (SLP) assistant specialized in writing IEP (Individualized Education Program) goals for children.

Your task is to generate SMART IEP goals based on the child's evaluation data and the pre-calculated parameters provided. The number of goals to generate will be specified in the request based on SLP best practices.

SMART goals are:
- Specific: Clearly defines what the student will do
- Measurable: Can be quantified with accuracy percentages
- Achievable: Realistic based on current baseline
- Relevant: Addresses the student's specific needs
- Time-bound: Has a clear deadline aligned with school year milestones

For LANGUAGE therapy goals, use these goal types and formats:
${Object.entries(IEP_GOAL_TYPE_LABELS).map(([type, label]) => `- ${type}: ${label}`).join('\n')}

For ARTICULATION therapy goals, focus on:
- Specific sounds at word, phrase, and sentence levels
- Target sounds in initial, medial, and final positions
- Clear articulation of specific phonemes
- Progressive complexity (CVC words → phrases → sentences)

IMPORTANT SLP GUIDELINES:
1. Use child-appropriate, age-relevant language
2. Goals should be achievable within the calculated timeframe (consider school year milestones)
3. Use the exact target accuracy provided (calculated based on baseline)
4. Specify the context (e.g., "in 4 out of 5 trials", "across 3 consecutive sessions")
5. Match the prompt level to the student's current functioning
6. Address weaknesses systematically - don't try to fix everything at once
7. For lower baselines (<40%), focus on foundational skills before complex tasks
8. For higher baselines (>70%), focus on generalization and independence

PROMPT LEVEL TERMINOLOGY:
- MAX (Maximum): "given full visual and verbal models", "with hand-over-hand assistance"
- MOD (Moderate): "given moderate verbal and visual cues", "with partial prompting"
- MIN (Minimal): "given minimal verbal cues", "with occasional reminders"
- Independent: "independently", "without cueing"

You must respond with a valid JSON array containing the exact number of goals specified.`;

/**
 * Build the user prompt with evaluation data and rules
 */
function buildUserPrompt(
  evalData: EvaluationDataForGeneration,
  rules: GoalGenerationRules,
  goalCountInfo: { count: number; reasoning: string },
  deadlineInfo: { months: number; deadline: string; reasoning: string }
): string {
  const priorTherapyLabels: Record<string, string> = {
    'none': 'No prior therapy',
    'less-1': 'Less than 1 year',
    '1-2': '1-2 years',
    '2-3': '2-3 years',
    '3+': '3+ years',
  };

  const promptLevelLabels: Record<number, string> = {
    1: 'Maximum (MAX) - Full support needed',
    2: 'Moderate (MOD) - Some support needed',
    3: 'Minimal (MIN) - Little support needed',
  };

  return `Generate exactly ${goalCountInfo.count} IEP goals for the following student:

STUDENT INFORMATION:
- Name: ${evalData.first_name} ${evalData.last_name}
- Grade Level: ${evalData.grade_level || 'Not specified'}
- Diagnosis: ${evalData.diagnosis || 'Not specified'}
- Service Type: ${evalData.problem_type === 'language' ? 'Language Therapy' : 'Articulation Therapy'}

EVALUATION DATA:
- Speech/Language Diagnoses: ${evalData.eval_data.speech_diagnoses || 'Not specified'}
- Prior Therapy: ${priorTherapyLabels[evalData.eval_data.prior_therapy || ''] || 'Not specified'}
- Baseline Accuracy: ${evalData.eval_data.baseline_accuracy ?? 'Not measured'}%
- Strengths: ${evalData.eval_data.strengths || 'Not specified'}
- Weaknesses: ${evalData.eval_data.weaknesses || 'Not specified'}
- Current Goals/Benchmarks: ${evalData.eval_data.goals_benchmarks || 'None provided'}
${evalData.problem_type === 'articulation' && evalData.eval_data.target_sounds?.length
  ? `- Target Sounds: ${evalData.eval_data.target_sounds.join(', ')}`
  : ''}

CALCULATED PARAMETERS (based on SLP best practices):
- Recommended Target Accuracy: ${rules.calculated_target}%
- Recommended Prompt Level: ${promptLevelLabels[rules.recommended_prompt_level]}
- Sessions to Confirm Mastery: ${goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy)}
- Recommended Deadline: ${deadlineInfo.deadline} (${deadlineInfo.reasoning})
- Timeline: ${deadlineInfo.months} months
- Baseline Description: ${goalGenerator.formatBaselineDescription(rules.baseline_accuracy)}
- Number of Goals: ${goalCountInfo.count} (${goalCountInfo.reasoning})

PRIORITY AREAS TO ADDRESS:
${rules.priority_areas.map((area, i) => `${i + 1}. ${area}`).join('\n')}

Please generate exactly ${goalCountInfo.count} SMART goals that:
1. Address the identified weaknesses
2. Are appropriate for the student's ${evalData.problem_type} needs
3. Use the calculated target accuracy (${rules.calculated_target}%)
4. Consider the recommended prompt level
5. Include specific, measurable criteria
6. Use the recommended deadline: ${deadlineInfo.deadline}

Respond with a JSON array in this exact format:
[
  {
    "goal_type": "category_name",
    "goal_description": "Full SMART goal description",
    "target_percentage": ${rules.calculated_target},
    "sessions_to_confirm": ${goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy)},
    "recommended_prompt_level": ${rules.recommended_prompt_level},
    "deadline": "${deadlineInfo.deadline}",
    "baseline": "${goalGenerator.formatBaselineDescription(rules.baseline_accuracy)}",
    "rationale": "Brief explanation of why this goal was chosen"
  }
]`;
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(
  content: string,
  rules: GoalGenerationRules,
  deadlineInfo: { deadline: string },
  goalCount: number
): GeneratedIEPGoal[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON array directly
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonStr = arrayMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate and sanitize each goal
    return parsed.map((goal: Record<string, unknown>) => ({
      goal_type: String(goal.goal_type || 'vocabulary'),
      goal_description: String(goal.goal_description || ''),
      target_percentage: Number(goal.target_percentage) || rules.calculated_target,
      sessions_to_confirm: Number(goal.sessions_to_confirm) || goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy),
      recommended_prompt_level: ([1, 2, 3].includes(Number(goal.recommended_prompt_level))
        ? Number(goal.recommended_prompt_level)
        : rules.recommended_prompt_level) as 1 | 2 | 3,
      deadline: String(goal.deadline || deadlineInfo.deadline),
      baseline: String(goal.baseline || goalGenerator.formatBaselineDescription(rules.baseline_accuracy)),
      rationale: String(goal.rationale || 'Goal selected based on evaluation data'),
    })).slice(0, goalCount); // Limit to recommended goal count
  } catch (error) {
    logger.error('Failed to parse AI response:', error);
    throw new Error('Failed to parse AI-generated goals');
  }
}

/**
 * Generate fallback goals when AI fails
 */
function generateFallbackGoals(
  evalData: EvaluationDataForGeneration,
  rules: GoalGenerationRules,
  deadlineInfo: { deadline: string },
  goalCount: number
): GeneratedIEPGoal[] {
  const goals: GeneratedIEPGoal[] = [];
  const deadline = deadlineInfo.deadline;
  const baseline = goalGenerator.formatBaselineDescription(rules.baseline_accuracy);

  if (evalData.problem_type === 'language') {
    // Generate language fallback goals
    const priorityTypes = goalGenerator.identifyLanguagePriorityAreas(evalData);

    for (let i = 0; i < Math.min(goalCount, priorityTypes.length); i++) {
      const goalType = priorityTypes[i];
      const label = IEP_GOAL_TYPE_LABELS[goalType] || goalType;

      goals.push({
        goal_type: goalType,
        goal_description: `${evalData.first_name} will demonstrate improved ${label.toLowerCase()} skills with ${rules.calculated_target}% accuracy across 3 consecutive therapy sessions, given ${rules.recommended_prompt_level === 1 ? 'maximum' : rules.recommended_prompt_level === 2 ? 'moderate' : 'minimal'} verbal and visual cues.`,
        target_percentage: rules.calculated_target,
        sessions_to_confirm: goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy),
        recommended_prompt_level: rules.recommended_prompt_level,
        deadline,
        baseline,
        rationale: `This goal addresses identified weaknesses in ${label.toLowerCase()} based on the evaluation data.`,
      });
    }
  } else {
    // Generate articulation fallback goals
    const targetSounds = evalData.eval_data.target_sounds || ['s', 'r'];

    for (let i = 0; i < Math.min(goalCount, targetSounds.length); i++) {
      const sound = targetSounds[i];
      const soundUpper = sound.toUpperCase();

      goals.push({
        goal_type: `${soundUpper} Sound`,
        goal_description: `${evalData.first_name} will produce the /${sound}/ sound correctly in the initial position of words with ${rules.calculated_target}% accuracy across 3 consecutive therapy sessions, given ${rules.recommended_prompt_level === 1 ? 'maximum' : rules.recommended_prompt_level === 2 ? 'moderate' : 'minimal'} cueing.`,
        target_percentage: rules.calculated_target,
        sessions_to_confirm: goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy),
        recommended_prompt_level: rules.recommended_prompt_level,
        deadline,
        baseline,
        rationale: `This goal targets the /${sound}/ sound which was identified as a target sound in the evaluation.`,
      });
    }
  }

  // Ensure we have the recommended number of goals
  while (goals.length < goalCount) {
    goals.push({
      goal_type: evalData.problem_type === 'language' ? 'vocabulary' : 'General Articulation',
      goal_description: `${evalData.first_name} will demonstrate improved communication skills with ${rules.calculated_target}% accuracy across 3 consecutive therapy sessions.`,
      target_percentage: rules.calculated_target,
      sessions_to_confirm: goalGenerator.calculateSessionsToConfirm(rules.baseline_accuracy),
      recommended_prompt_level: rules.recommended_prompt_level,
      deadline,
      baseline,
      rationale: 'General communication goal to support overall progress.',
    });
  }

  return goals.slice(0, goalCount);
}

/**
 * Generate IEP goals using OpenAI
 */
export async function generateIEPGoals(
  evalData: EvaluationDataForGeneration
): Promise<GenerateGoalsResponse> {
  // Generate rules based on evaluation data
  const rules = goalGenerator.generateGoalRules(evalData);

  // Calculate smart deadline based on SLP best practices
  const deadlineInfo = goalGenerator.calculateSmartDeadline(
    rules.baseline_accuracy,
    evalData.problem_type,
    evalData.eval_data.prior_therapy
  );

  // Calculate recommended number of goals
  const goalCountInfo = goalGenerator.calculateRecommendedGoalCount(evalData);

  logger.info(`Generating IEP goals for student ${evalData.student_id}`, {
    problem_type: evalData.problem_type,
    baseline: rules.baseline_accuracy,
    target: rules.calculated_target,
    recommended_goals: goalCountInfo.count,
    deadline: deadlineInfo.deadline,
    timeline_months: deadlineInfo.months,
  });

  let goals: GeneratedIEPGoal[];
  let evaluationSummary: string;

  try {
    const userPrompt = buildUserPrompt(evalData, rules, goalCountInfo, deadlineInfo);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: GOAL_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    goals = parseAIResponse(content, rules, deadlineInfo, goalCountInfo.count);
    evaluationSummary = `Generated ${goals.length} goals based on ${evalData.problem_type} evaluation. Baseline: ${rules.baseline_accuracy}%, Target: ${rules.calculated_target}%. Timeline: ${deadlineInfo.months} months (${deadlineInfo.reasoning}).`;

    logger.info(`Successfully generated ${goals.length} IEP goals via AI for student ${evalData.student_id}`);
  } catch (error) {
    logger.error('AI goal generation failed, using fallback:', error);

    // Use fallback goals with smart parameters
    goals = generateFallbackGoals(evalData, rules, deadlineInfo, goalCountInfo.count);
    evaluationSummary = `Generated ${goals.length} default goals based on evaluation data. AI generation was unavailable. Timeline: ${deadlineInfo.months} months.`;
  }

  return {
    goals,
    evaluation_summary: evaluationSummary,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Validate that evaluation data has minimum required information
 */
export function validateEvaluationData(evalData: EvaluationDataForGeneration): string | null {
  if (!evalData.problem_type) {
    return 'Problem type (language or articulation) is required';
  }

  if (!evalData.eval_data) {
    return 'Evaluation data is required';
  }

  // For articulation, target sounds are helpful but not required
  // For language, weaknesses are helpful but not required

  return null; // Valid
}

export default {
  generateIEPGoals,
  validateEvaluationData,
};
