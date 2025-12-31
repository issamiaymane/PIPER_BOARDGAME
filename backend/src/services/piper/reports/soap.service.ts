/**
 * PIPER SOAP Note Service
 * Generates SOAP notes for sessions and cumulative progress reports
 * Includes AI-powered SOAP generation using OpenAI
 */

import OpenAI from 'openai';
import { config } from '../../../config';
import {
  Trial,
  SessionSOAPNote,
  CumulativeSOAPNote,
  PROMPT_LEVEL_LABELS,
  IEP_GOAL_TYPE_LABELS,
  PromptLevel,
  IEPGoalType,
  AIGeneratedSOAP,
} from '../../../types/piper';
import { logger } from '../../../utils/logger';
import { getSessionById, getTrialsBySession, getAccuracyHistory } from '../sessions/session.service';
import { getGoalById } from '../goals/goal.service';
import { getStudentById } from '../students/student.service';
import { calculateGoalProgress, getThresholdStatus } from '../goals/threshold.service';
import { isGoalMastered } from '../auth/child.service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * System prompt for AI SOAP note generation
 * Updated to be child-friendly and reflect card-based game therapy
 */
const SOAP_GENERATION_SYSTEM_PROMPT = `You are a Speech Language Pathologist (SLP) writing professional SOAP notes for children's speech therapy sessions using an interactive card-based game.

Your task is to convert session data into a professional SOAP note with 4 sections.

Output format: JSON object with exactly these keys:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "..."
}

Guidelines for each section:
- S (Subjective): Student's engagement with the card game activities. Use phrases like "Student presented as cooperative and engaged during today's therapy session using interactive card activities." or "Student appeared motivated to participate in card-based speech activities."

- O (Objective): Write as the goal targeted using IEP-style wording. Include accuracy percentage and prompt level. Examples:
  * "STUDENT identified and categorized objects and pictures from card activities into appropriate categories with XX% accuracy, given [min/mod/max] prompting and cueing."
  * "STUDENT produced grammatically correct sentences given picture card stimuli and verbal prompts in XX% of opportunities, given [min/mod/max] prompting and cueing."
  * "STUDENT responded to wh-questions (who, what, where, when, why) based on card stimuli with XX% accuracy, given [min/mod/max] prompting and cueing."

- A (Assessment): Be KIND and POSITIVE - these are children with special needs. Focus on growth and progress. Examples:
  * "Student increased their expressive language skills by describing objects using multiple qualities during card activities."
  * "Student increased their syntactic abilities by producing ability-appropriate grammatically correct sentences during the game."
  * "Student demonstrated growth in receptive language by correctly responding to questions about card content."
  * "Student showed improvement in categorization skills through successful identification of category members."

- P (Plan): Use one of these positive blurbs:
  * "Student demonstrated positive progress to therapy as indicated by active participation in today's therapy session and working towards meeting goals. Continue current plan of care."
  * "Student demonstrated an increase towards meeting speech therapy goals as indicated by active participation in therapy activities and increased accuracy. Continue current plan of care."
  * "Therapy session had a positive impact towards student's progress towards meeting speech therapy goals. Student eagerly participated in activities. Continue current plan of care."
  * "Student demonstrated positive progress towards meeting therapy goals and adequate participation in today's therapy session. Continue current plan of care."

Important:
- Keep each section concise (2-3 sentences max)
- Use professional clinical language but be KIND and encouraging
- This is a card-based game therapy - reference card activities and interactive game elements
- Base analysis on the provided accuracy and prompt level data
- You MUST respond with valid JSON only, no additional text`;

/**
 * Get human-readable label for a goal type
 * Falls back to the goal_type itself for custom category names
 */
function getGoalTypeLabel(goalType: string): string {
  // Check if it's a predefined goal type
  const predefinedLabel = IEP_GOAL_TYPE_LABELS[goalType as IEPGoalType];
  if (predefinedLabel) {
    return predefinedLabel;
  }
  // For custom category names, the goal_type IS the human-readable name
  return goalType;
}

/**
 * Generate a SOAP note for a single session
 */
export function generateSessionSOAP(session_id: number): SessionSOAPNote | null {
  const session = getSessionById(session_id);
  if (!session) {
    return null;
  }

  const student = getStudentById(session.student_id);
  if (!student) {
    return null;
  }

  const trials = getTrialsBySession(session_id);
  const goal = session.iep_goal_id ? getGoalById(session.iep_goal_id) : null;

  // Calculate category breakdown
  const categoryStats = calculateCategoryStats(trials);

  // Build SOAP components
  const studentName = `${student.first_name} ${student.last_name}`;
  const promptLevelLabel = PROMPT_LEVEL_LABELS[session.prompt_level_used as PromptLevel];

  // Determine the goal type label and categories practiced:
  // 1. If there's an IEP goal, use its goal_type as primary
  // 2. Always include all categories from trials for detailed reporting
  let goalTypeLabel: string;
  const categoriesPracticed = categoryStats.map((c) => c.category);

  if (goal) {
    goalTypeLabel = getGoalTypeLabel(goal.goal_type);
  } else if (categoriesPracticed.length > 0) {
    // Use all categories if multiple, or single category name
    goalTypeLabel =
      categoriesPracticed.length === 1
        ? categoriesPracticed[0]
        : categoriesPracticed.join(', ');
  } else {
    goalTypeLabel = 'General Practice';
  }

  // Subjective section - include ALL card subcategories practiced
  const subjectiveCategories =
    categoriesPracticed.length > 0
      ? categoriesPracticed.join(', ')
      : goalTypeLabel;
  const subjective = `${student.first_name} presented as cooperative and engaged during today's therapy session using ${subjectiveCategories} card activities.`;

  // Objective section - show breakdown by category if multiple
  const objective = buildObjectiveTextMultiCategory(
    studentName,
    categoryStats,
    session.correct_trials,
    session.total_trials,
    session.accuracy_percentage,
    promptLevelLabel
  );

  // Assessment section
  const assessment = buildAssessmentText(
    session.accuracy_percentage,
    goal?.target_percentage || 80,
    goal?.id,
    goalTypeLabel
  );

  // Plan section
  const plan = buildPlanText(goalTypeLabel, promptLevelLabel, goal?.id);

  return {
    student_name: studentName,
    session_date: session.start_time.split('T')[0],
    goal_type: goalTypeLabel,
    goal_description: goal?.goal_description,
    subjective,
    objective,
    assessment,
    plan,
    trials: {
      total: session.total_trials,
      correct: session.correct_trials,
      accuracy: session.accuracy_percentage,
    },
    prompt_level: promptLevelLabel,
    categories_practiced: categoryStats,
    // Include stored SOAP fields if they exist
    soap_subjective: session.soap_subjective,
    soap_objective: session.soap_objective,
    soap_assessment: session.soap_assessment,
    soap_plan: session.soap_plan,
    // SLP review tracking
    slp_reviewed: session.slp_reviewed,
  };
}

/**
 * Generate a cumulative SOAP note for a goal
 */
export function generateCumulativeSOAP(goal_id: number): CumulativeSOAPNote | null {
  const goal = getGoalById(goal_id);
  if (!goal) {
    return null;
  }

  const student = getStudentById(goal.student_id);
  if (!student) {
    return null;
  }

  const history = getAccuracyHistory(goal_id);
  const progress = calculateGoalProgress(goal_id);
  const status = getThresholdStatus(goal_id);

  const studentName = `${student.first_name} ${student.last_name}`;
  const goalTypeLabel = getGoalTypeLabel(goal.goal_type);

  // Build session history
  const sessionHistory = history.map((h) => ({
    date: h.created_at.split('T')[0],
    trials: 0, // Would need to join with sessions table
    accuracy: h.accuracy_percentage,
    prompt_level: PROMPT_LEVEL_LABELS[h.prompt_level as PromptLevel],
  }));

  // Determine reporting period
  const startDate = history.length > 0 ? history[0].created_at.split('T')[0] : goal.created_at.split('T')[0];
  const endDate = history.length > 0 ? history[history.length - 1].created_at.split('T')[0] : new Date().toISOString().split('T')[0];

  // Generate recommendation
  const recommendation = generateRecommendation(
    progress.current_accuracy,
    goal.target_percentage,
    goal.current_prompt_level as PromptLevel,
    status
  );

  return {
    student_name: studentName,
    goal_description: goal.goal_description,
    goal_type: goalTypeLabel,
    target_percentage: goal.target_percentage,
    reporting_period: {
      start: startDate,
      end: endDate,
    },
    session_history: sessionHistory,
    current_status: {
      average_accuracy: progress.current_accuracy,
      current_prompt_level: PROMPT_LEVEL_LABELS[goal.current_prompt_level as PromptLevel],
      sessions_completed: progress.sessions_completed,
      progress_toward_goal: progress.progress_percentage,
    },
    recommendation,
  };
}

/**
 * Format session SOAP as text for export
 */
export function formatSessionSOAPAsText(soap: SessionSOAPNote): string {
  const categoryBreakdown = soap.categories_practiced
    .map((c) => `  - ${c.category}: ${c.correct}/${c.total} (${c.accuracy.toFixed(0)}%)`)
    .join('\n');

  return `
SOAP NOTE
=========
Student: ${soap.student_name}
Date: ${soap.session_date}
Goal: ${soap.goal_type}${soap.goal_description ? ` - ${soap.goal_description}` : ''}

OBJECTIVE:
${soap.objective}

Categories Practiced:
${categoryBreakdown || '  No category breakdown available'}

ASSESSMENT:
${soap.assessment}

PLAN:
${soap.plan}
`.trim();
}

/**
 * Format cumulative SOAP as text for export
 */
export function formatCumulativeSOAPAsText(soap: CumulativeSOAPNote): string {
  const sessionRows = soap.session_history
    .map((s) => `| ${s.date} | ${s.accuracy.toFixed(0)}% | ${s.prompt_level} |`)
    .join('\n');

  return `
PROGRESS REPORT
===============
Student: ${soap.student_name}
Goal: ${soap.goal_type}
Description: ${soap.goal_description}
Target: ${soap.target_percentage}% accuracy
Reporting Period: ${soap.reporting_period.start} to ${soap.reporting_period.end}

SESSION HISTORY:
| Date | Accuracy | Prompt Level |
|------|----------|--------------|
${sessionRows || '| No sessions recorded |'}

CURRENT STATUS:
  Average Accuracy: ${soap.current_status.average_accuracy.toFixed(1)}%
  Current Prompt Level: ${soap.current_status.current_prompt_level}
  Sessions Completed: ${soap.current_status.sessions_completed}
  Progress Toward Goal: ${soap.current_status.progress_toward_goal.toFixed(0)}%

RECOMMENDATION:
${soap.recommendation}
`.trim();
}

// ============================================
// Helper Functions
// ============================================

function calculateCategoryStats(
  trials: Trial[]
): Array<{ category: string; correct: number; total: number; accuracy: number }> {
  const stats: Record<string, { correct: number; total: number }> = {};

  for (const trial of trials) {
    if (!stats[trial.card_category]) {
      stats[trial.card_category] = { correct: 0, total: 0 };
    }
    stats[trial.card_category].total++;
    if (trial.is_correct) {
      stats[trial.card_category].correct++;
    }
  }

  return Object.entries(stats).map(([category, data]) => ({
    category,
    correct: data.correct,
    total: data.total,
    accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
  }));
}

/**
 * Build objective text showing ALL categories practiced with individual breakdowns
 */
function buildObjectiveTextMultiCategory(
  studentName: string,
  categoryStats: Array<{ category: string; correct: number; total: number; accuracy: number }>,
  totalCorrect: number,
  totalTrials: number,
  overallAccuracy: number,
  promptLevel: string
): string {
  if (totalTrials === 0) {
    return `${studentName} participated in therapy card activities during today's session. No trials were completed this session.`;
  }

  // If only one category, use simple format
  if (categoryStats.length === 1) {
    const cat = categoryStats[0];
    return `${studentName} completed ${cat.category} card activities, given picture card stimuli and verbal prompts, in ${cat.accuracy.toFixed(0)}% of opportunities (${cat.correct}/${cat.total}), given ${promptLevel} prompting and cueing.`;
  }

  // Multiple categories - show breakdown
  const categoryBreakdowns = categoryStats
    .map(
      (cat) =>
        `${cat.category}: ${cat.accuracy.toFixed(0)}% (${cat.correct}/${cat.total})`
    )
    .join('; ');

  return `${studentName} completed multiple card activities with the following results: ${categoryBreakdowns}. Overall accuracy: ${overallAccuracy.toFixed(0)}% (${totalCorrect}/${totalTrials}), given ${promptLevel} prompting and cueing.`;
}

function buildAssessmentText(
  _accuracy: number,
  _targetAccuracy: number,
  goalId?: number,
  goalType?: string
): string {
  // Check if goal is mastered first
  if (goalId) {
    const goal = getGoalById(goalId);
    if (goal && isGoalMastered(goal)) {
      return `GOAL MASTERED! Student has successfully achieved this goal and demonstrated excellent progress. Student is ready for maintenance or new goals.`;
    }
  }

  // Kind, positive assessment templates based on goal type
  const assessmentTemplates: Record<string, string[]> = {
    'Compare & Contrast': [
      'Student increased their critical thinking skills by identifying similarities and differences between items during card activities.',
      'Student demonstrated growth in analytical skills through comparison tasks.',
    ],
    'Object Description': [
      'Student increased their expressive language skills by describing objects using multiple qualities during card activities.',
      'Student showed improvement in descriptive language abilities.',
    ],
    'Wh- Questions': [
      'Student demonstrated growth in receptive language by correctly responding to questions about card content.',
      'Student increased their comprehension skills through wh-question activities.',
    ],
    'Yes No Questions': [
      'Student demonstrated growth in receptive language by correctly answering yes/no questions during card activities.',
      'Student increased their comprehension skills through yes/no question activities.',
    ],
    'Category Naming': [
      'Student showed improvement in categorization skills through successful identification of category members.',
      'Student increased their semantic organization abilities during categorization activities.',
    ],
    'Grammar & Syntax': [
      'Student increased their syntactic abilities by producing ability-appropriate grammatically correct sentences during the game.',
      'Student demonstrated growth in sentence construction skills.',
    ],
    'Similarities & Differences': [
      'Student increased their analytical language skills by identifying relationships between items.',
      'Student showed improvement in comparison and contrast abilities.',
    ],
    'Inferencing': [
      'Student demonstrated growth in higher-level thinking by making appropriate inferences from card content.',
      'Student increased their reasoning abilities through inferencing activities.',
    ],
    'Problem Solving': [
      'Student showed improvement in problem-solving skills by generating appropriate solutions to scenarios.',
      'Student demonstrated growth in critical thinking abilities.',
    ],
    'Following Directions': [
      'Student increased their receptive language skills by successfully following multi-step directions.',
      'Student demonstrated improvement in auditory comprehension.',
    ],
    'Vocabulary': [
      'Student increased their expressive vocabulary by correctly identifying and labeling items.',
      'Student showed growth in word knowledge through vocabulary activities.',
    ],
  };

  // Get appropriate template or use default
  const templates = goalType && assessmentTemplates[goalType]
    ? assessmentTemplates[goalType]
    : ['Student demonstrated positive engagement and growth during today\'s therapy activities.'];

  const assessment = templates[0];

  // Add progress note
  if (goalId) {
    const status = getThresholdStatus(goalId);
    if (status.can_advance) {
      return `${assessment} Student has shown consistent progress and is ready for increased independence.`;
    }
  }

  return assessment;
}

function buildPlanText(
  _goalType: string,
  _promptLevel: string,
  goalId?: number
): string {
  // Check if goal is mastered first
  if (goalId) {
    const goal = getGoalById(goalId);
    if (goal && isGoalMastered(goal)) {
      return `Goal mastered! Student has achieved this goal and demonstrated excellent progress. Transition to maintenance phase or introduce new IEP goals. Continue current plan of care.`;
    }
  }

  // Positive plan blurbs as requested
  const planBlurbs = [
    'Student demonstrated positive progress to therapy as indicated by active participation in today\'s therapy session and working towards meeting goals. Continue current plan of care.',
    'Student demonstrated an increase towards meeting speech therapy goals as indicated by active participation in therapy activities and increased accuracy. Continue current plan of care.',
    'Therapy session had a positive impact towards student\'s progress towards meeting speech therapy goals. Student eagerly participated in activities. Continue current plan of care.',
    'Student demonstrated positive progress towards meeting therapy goals and adequate participation in today\'s therapy session. Continue current plan of care.',
  ];

  // Select a blurb based on session context
  if (goalId) {
    const status = getThresholdStatus(goalId);
    if (status.can_advance) {
      return planBlurbs[1]; // "increased accuracy" version
    }
  }

  // Default to first blurb
  return planBlurbs[0];
}

function generateRecommendation(
  currentAccuracy: number,
  targetAccuracy: number,
  promptLevel: PromptLevel,
  status: ReturnType<typeof getThresholdStatus>
): string {
  // Goal mastery check
  if (currentAccuracy >= targetAccuracy && promptLevel === 3) {
    return 'Student has met goal criteria with minimal prompting. Consider goal mastery and transition to maintenance or new goals.';
  }

  // Ready to advance
  if (status.can_advance) {
    return 'Student has demonstrated consistent accuracy above threshold. Recommend reducing prompt level and continuing to monitor.';
  }

  // Needs more support
  if (status.at_risk_fallback) {
    return 'Student is struggling at current prompt level. Recommend increasing support and possibly modifying goal targets or approach.';
  }

  // Making progress
  if (currentAccuracy >= targetAccuracy * 0.8) {
    return 'Student is approaching goal target. Continue current intervention and monitor for advancement eligibility.';
  }

  // Below expectations
  return 'Student is below expected performance. Continue targeted intervention with current supports. Consider data review if pattern persists.';
}

// ============================================
// AI-Powered SOAP Generation
// ============================================

/**
 * Generate AI-powered SOAP note for a session
 * Uses OpenAI to create professional clinical documentation
 */
export async function generateAISOAP(session_id: number): Promise<AIGeneratedSOAP | null> {
  const session = getSessionById(session_id);
  if (!session) {
    return null;
  }

  const student = getStudentById(session.student_id);
  if (!student) {
    return null;
  }

  const goal = session.iep_goal_id ? getGoalById(session.iep_goal_id) : null;
  const promptLevelLabel = PROMPT_LEVEL_LABELS[session.prompt_level_used as PromptLevel];
  const goalTypeLabel = goal ? getGoalTypeLabel(goal.goal_type) : 'General Practice';

  // Build user prompt with session data
  const userPrompt = `Generate a SOAP note for this therapy session:

Student Name: ${student.first_name} ${student.last_name}
Goal: ${goalTypeLabel}${goal?.goal_description ? ` - ${goal.goal_description}` : ''}
Target Accuracy: ${goal?.target_percentage || 80}%

Session Data:
- Accuracy: ${session.accuracy_percentage.toFixed(1)}%
- Correct Trials: ${session.correct_trials}/${session.total_trials}
- Prompt Level: ${promptLevelLabel.toUpperCase()} (${promptLevelLabel === 'max' ? 'maximum support' : promptLevelLabel === 'mod' ? 'moderate support' : 'minimal support'})

Generate a professional SOAP note as JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SOAP_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse JSON response
    const soap = parseAISOAPResponse(content);

    logger.info(`AI SOAP note generated for session ${session_id}`);
    return soap;
  } catch (error) {
    logger.error('AI SOAP generation failed, using fallback:', error);

    // Generate fallback SOAP using rule-based approach
    return generateFallbackSOAP(session, student, goal);
  }
}

/**
 * Parse AI response and extract SOAP data
 */
function parseAISOAPResponse(content: string): AIGeneratedSOAP {
  try {
    // Try to extract JSON from response
    let jsonStr = content;

    // Handle markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    return {
      subjective: String(parsed.subjective || 'Student participated in therapy session.'),
      objective: String(parsed.objective || 'Session data recorded.'),
      assessment: String(parsed.assessment || 'Performance documented.'),
      plan: String(parsed.plan || 'Continue current intervention.'),
    };
  } catch (error) {
    logger.error('Failed to parse AI SOAP response:', error);
    throw new Error('Failed to parse AI-generated SOAP note');
  }
}

/**
 * Generate fallback SOAP when AI fails
 * Updated to be child-friendly and reflect card-based game therapy
 */
function generateFallbackSOAP(
  session: ReturnType<typeof getSessionById>,
  student: ReturnType<typeof getStudentById>,
  goal: ReturnType<typeof getGoalById>
): AIGeneratedSOAP {
  if (!session || !student) {
    return {
      subjective: 'Student presented as cooperative and engaged during today\'s therapy session using interactive card activities.',
      objective: 'Session completed using card-based therapy activities.',
      assessment: 'Student demonstrated positive engagement and growth during today\'s therapy activities.',
      plan: 'Student demonstrated positive progress to therapy as indicated by active participation in today\'s therapy session and working towards meeting goals. Continue current plan of care.',
    };
  }

  const promptLevelLabel = PROMPT_LEVEL_LABELS[session.prompt_level_used as PromptLevel];

  // Get actual trials and categories played
  const trials = getTrialsBySession(session.id);
  const categoryStats = calculateCategoryStats(trials);
  const categoriesPracticed = categoryStats.map((c) => c.category);

  // Determine goal type from goal OR from actual trials played
  let goalTypeLabel: string;
  if (goal) {
    goalTypeLabel = getGoalTypeLabel(goal.goal_type);
  } else if (categoriesPracticed.length > 0) {
    goalTypeLabel =
      categoriesPracticed.length === 1
        ? categoriesPracticed[0]
        : categoriesPracticed.join(', ');
  } else {
    goalTypeLabel = 'General Practice';
  }

  // Subjective - list all categories practiced
  const subjectiveCategories =
    categoriesPracticed.length > 0
      ? categoriesPracticed.join(', ')
      : goalTypeLabel;

  // Objective - use multi-category function
  const objective = buildObjectiveTextMultiCategory(
    student.first_name,
    categoryStats,
    session.correct_trials,
    session.total_trials,
    session.accuracy_percentage,
    promptLevelLabel
  );

  return {
    subjective: `${student.first_name} presented as cooperative and engaged during today's therapy session using ${subjectiveCategories} card activities.`,
    objective: objective,
    assessment: 'Student demonstrated positive engagement and growth during today\'s therapy activities.',
    plan: 'Student demonstrated positive progress to therapy as indicated by active participation in today\'s therapy session and working towards meeting goals. Continue current plan of care.',
  };
}

export default {
  generateSessionSOAP,
  generateCumulativeSOAP,
  formatSessionSOAPAsText,
  formatCumulativeSOAPAsText,
  generateAISOAP,
};
