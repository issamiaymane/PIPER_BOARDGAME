/**
 * PIPER Goal Generator Service
 * Logic rules for determining IEP goal parameters based on evaluation data
 */

import {
  EvaluationDataForGeneration,
  GoalGenerationRules,
  ProblemType,
  PromptLevel,
  PROMPT_LEVELS,
  IEP_GOAL_CATEGORY_MAPPINGS,
  IEPGoalType,
} from '../../../types/piper';
import { logger } from '../../../utils/logger';

/**
 * Language goal areas based on evaluation weaknesses
 */
const LANGUAGE_GOAL_AREAS: Record<string, IEPGoalType[]> = {
  vocabulary: ['vocabulary', 'category_naming'],
  comprehension: ['wh_questions', 'following_directions', 'inferencing'],
  grammar: ['grammar_syntax'],
  pragmatics: ['problem_solving', 'inferencing'],
  expressive: ['object_description', 'compare_contrast', 'similarities_differences'],
  receptive: ['wh_questions', 'following_directions'],
};

/**
 * Articulation categories based on target sounds
 */
const ARTICULATION_SOUND_CATEGORIES: Record<string, string[]> = {
  s: ['S Initial 1 CVC Word', 'S Initial 1 Simple Word, Phrase, Sentence', 'S Medial 1 Simple Word, Phrase, Sentence', 'S Final 1 CVC Word'],
  r: ['R Initial 1 CVC Word', 'R Initial 1 Simple Word, Phrase, Sentence', 'R Medial 1 Simple Word, Phrase, Sentence', 'R Final 1 CVC Word'],
  l: ['L Initial 1 CVC Word', 'L Initial 1 Simple Word, Phrase, Sentence', 'L Medial 1 Simple Word, Phrase, Sentence', 'L Final 1 CVC Word'],
  th: ['Th Voiceless Initial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Medial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Final 1 Simple Word, Phrase, Sentence'],
  sh: ['Sh Initial 1 CVC Word', 'Sh Initial 1 Simple Word, Phrase, Sentence', 'Sh Medial 1 Simple Word, Phrase, Sentence', 'Sh Final 1 CVC Word'],
  ch: ['Ch Initial 1 CVC Word', 'Ch Initial 1 Simple Word, Phrase, Sentence', 'Ch Medial 1 Simple Word, Phrase, Sentence', 'Ch Final 1 CVC Word'],
  k: ['K Initial 1 CVC Word', 'K Initial 1 Simple Word, Phrase, Sentence', 'K Medial 1 Simple Word, Phrase, Sentence', 'K Final 1 CVC Word'],
  g: ['G Initial 1 CVC Word', 'G Initial 1 Simple Word, Phrase, Sentence', 'G Medial 1 Simple Word, Phrase, Sentence', 'G Final 1 CVC Word'],
  f: ['F Initial 1 CVC Word', 'F Initial 1 Simple Word, Phrase, Sentence', 'F Medial 1 Simple Word, Phrase, Sentence', 'F Final 1 CVC Word'],
  v: ['V Initial 1 CVC Word', 'V Initial 1 Simple Word, Phrase, Sentence', 'V Medial 1 Simple Word, Phrase, Sentence', 'V Final 1 CVC Word'],
  z: ['Z Initial 1 CVC Word', 'Z Initial 5 More Complex Words', 'Z Medial 5 More Complex Words', 'Z Final 1 CVC Word'],
  j: ['J Initial 1 CVC Word', 'J Initial 1 Simple Word, Phrase, Sentence', 'J Medial 1 Simple Word, Phrase, Sentence', 'J Final 1 CVC Word'],
};

/**
 * Calculate target accuracy based on baseline
 * Rules:
 * - If baseline < 40%: target = 75%
 * - If baseline 40-60%: target = 80%
 * - If baseline 60-75%: target = 85%
 * - If baseline > 75%: target = 90%
 */
export function calculateTargetAccuracy(baselineAccuracy: number): number {
  if (baselineAccuracy < 40) {
    return 75;
  } else if (baselineAccuracy < 60) {
    return 80;
  } else if (baselineAccuracy < 75) {
    return 85;
  } else {
    return 90;
  }
}

/**
 * Calculate recommended prompt level based on baseline
 * Rules:
 * - If baseline < 40%: MAX prompting (level 1)
 * - If baseline 40-70%: MOD prompting (level 2)
 * - If baseline > 70%: MIN prompting (level 3)
 */
export function calculatePromptLevel(baselineAccuracy: number): PromptLevel {
  if (baselineAccuracy < 40) {
    return PROMPT_LEVELS.MAX; // 1
  } else if (baselineAccuracy < 70) {
    return PROMPT_LEVELS.MOD; // 2
  } else {
    return PROMPT_LEVELS.MIN; // 3
  }
}

/**
 * Calculate sessions to confirm based on baseline
 * Lower baseline = more sessions needed
 */
export function calculateSessionsToConfirm(baselineAccuracy: number): number {
  if (baselineAccuracy < 40) {
    return 4;
  } else if (baselineAccuracy < 60) {
    return 3;
  } else {
    return 2;
  }
}

/**
 * Identify priority areas for language therapy based on weaknesses
 */
export function identifyLanguagePriorityAreas(evalData: EvaluationDataForGeneration): IEPGoalType[] {
  const weaknesses = evalData.eval_data.weaknesses?.toLowerCase() || '';
  const diagnoses = evalData.eval_data.speech_diagnoses?.toLowerCase() || '';
  const priorityAreas: IEPGoalType[] = [];

  // Check for vocabulary issues
  if (weaknesses.includes('vocabulary') || weaknesses.includes('word finding') || weaknesses.includes('naming')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.vocabulary);
  }

  // Check for comprehension issues
  if (weaknesses.includes('comprehension') || weaknesses.includes('understanding') || weaknesses.includes('receptive')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.comprehension);
  }

  // Check for grammar issues
  if (weaknesses.includes('grammar') || weaknesses.includes('syntax') || weaknesses.includes('morphology') || weaknesses.includes('sentence')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.grammar);
  }

  // Check for pragmatic issues
  if (weaknesses.includes('pragmatic') || weaknesses.includes('social') || weaknesses.includes('conversation')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.pragmatics);
  }

  // Check for expressive language issues
  if (weaknesses.includes('expressive') || diagnoses.includes('expressive')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.expressive);
  }

  // Check for receptive language issues
  if (weaknesses.includes('receptive') || diagnoses.includes('receptive')) {
    priorityAreas.push(...LANGUAGE_GOAL_AREAS.receptive);
  }

  // If no specific areas found, default to common language goals
  if (priorityAreas.length === 0) {
    priorityAreas.push('wh_questions', 'vocabulary', 'following_directions');
  }

  // Remove duplicates
  return [...new Set(priorityAreas)];
}

/**
 * Identify priority categories for articulation therapy based on target sounds
 */
export function identifyArticulationPriorityCategories(evalData: EvaluationDataForGeneration): string[] {
  const targetSounds = evalData.eval_data.target_sounds || [];
  const categories: string[] = [];

  for (const sound of targetSounds) {
    const normalizedSound = sound.toLowerCase().trim();
    if (ARTICULATION_SOUND_CATEGORIES[normalizedSound]) {
      categories.push(...ARTICULATION_SOUND_CATEGORIES[normalizedSound]);
    }
  }

  // If no target sounds specified, check diagnosis for clues
  if (categories.length === 0) {
    const diagnosis = evalData.diagnosis?.toLowerCase() || '';
    const speechDiagnosis = evalData.eval_data.speech_diagnoses?.toLowerCase() || '';

    // Default sounds for common diagnoses
    if (diagnosis.includes('phonological') || speechDiagnosis.includes('phonological')) {
      categories.push(...(ARTICULATION_SOUND_CATEGORIES['k'] || []));
      categories.push(...(ARTICULATION_SOUND_CATEGORIES['g'] || []));
    } else {
      // Default to common target sounds
      categories.push(...(ARTICULATION_SOUND_CATEGORIES['s'] || []));
      categories.push(...(ARTICULATION_SOUND_CATEGORIES['r'] || []));
    }
  }

  return [...new Set(categories)];
}

/**
 * Generate goal generation rules based on evaluation data
 */
export function generateGoalRules(evalData: EvaluationDataForGeneration): GoalGenerationRules {
  const baselineAccuracy = evalData.eval_data.baseline_accuracy ?? 50; // Default to 50% if not specified

  const rules: GoalGenerationRules = {
    diagnosis_type: evalData.problem_type,
    baseline_accuracy: baselineAccuracy,
    calculated_target: calculateTargetAccuracy(baselineAccuracy),
    recommended_prompt_level: calculatePromptLevel(baselineAccuracy),
    priority_areas: [],
  };

  // Determine priority areas based on diagnosis type
  if (evalData.problem_type === 'language') {
    rules.priority_areas = identifyLanguagePriorityAreas(evalData).map(
      (type) => IEP_GOAL_CATEGORY_MAPPINGS[type]?.[0] || type
    );
  } else {
    rules.priority_areas = identifyArticulationPriorityCategories(evalData);
  }

  logger.info(`Goal rules generated for student ${evalData.student_id}:`, {
    diagnosis_type: rules.diagnosis_type,
    baseline: rules.baseline_accuracy,
    target: rules.calculated_target,
    prompt_level: rules.recommended_prompt_level,
    priority_count: rules.priority_areas.length,
  });

  return rules;
}

/**
 * Get available goal types for a problem type
 */
export function getAvailableGoalTypes(problemType: ProblemType): string[] {
  if (problemType === 'language') {
    return Object.keys(IEP_GOAL_CATEGORY_MAPPINGS);
  } else {
    // For articulation, return sound categories
    return Object.keys(ARTICULATION_SOUND_CATEGORIES);
  }
}

/**
 * Calculate smart deadline based on baseline accuracy and other factors
 * SLP Best Practices:
 * - Lower baseline = longer timeline needed
 * - Align with school year milestones when possible
 * - Articulation goals often take longer than language goals
 * - Consider prior therapy experience
 */
export function calculateSmartDeadline(
  baselineAccuracy: number,
  problemType: ProblemType,
  priorTherapy?: string
): { months: number; deadline: string; reasoning: string } {
  let months: number;
  let reasoning: string;

  // Base timeline on baseline accuracy
  if (baselineAccuracy < 25) {
    months = 12; // Very low baseline - needs full year
    reasoning = 'Extended timeline due to significant skill gap';
  } else if (baselineAccuracy < 40) {
    months = 9; // Low baseline - 9 months
    reasoning = 'Moderate-to-long timeline for foundational skill building';
  } else if (baselineAccuracy < 60) {
    months = 6; // Moderate baseline - 6 months (standard IEP cycle)
    reasoning = 'Standard IEP cycle timeline';
  } else if (baselineAccuracy < 75) {
    months = 4; // Higher baseline - shorter timeline
    reasoning = 'Shorter timeline due to established foundation';
  } else {
    months = 3; // High baseline - maintenance/refinement
    reasoning = 'Brief timeline for skill refinement and generalization';
  }

  // Adjust for problem type
  if (problemType === 'articulation') {
    // Articulation often requires more repetition
    months = Math.ceil(months * 1.2);
    reasoning += '; adjusted for articulation practice needs';
  }

  // Adjust for prior therapy experience
  if (priorTherapy === '3+') {
    // Long therapy history - may indicate persistent difficulties
    months = Math.ceil(months * 1.1);
  } else if (priorTherapy === 'none') {
    // New to therapy - might progress quickly with intervention
    months = Math.max(3, months - 1);
  }

  // Cap between 3-12 months
  months = Math.max(3, Math.min(12, months));

  // Align to school year milestones
  const deadline = alignToSchoolMilestone(months);

  return { months, deadline, reasoning };
}

/**
 * Align deadline to school year milestones
 * Common IEP review periods: End of semester, end of school year
 * Returns ISO date format (YYYY-MM-DD) for reliable date comparisons
 */
function alignToSchoolMilestone(monthsFromNow: number): string {
  const now = new Date();
  const targetDate = new Date();
  targetDate.setMonth(now.getMonth() + monthsFromNow);

  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  // School milestone months: December (end of fall semester), May/June (end of school year)
  // Also consider January (start of spring semester) and August/September (start of year)
  const milestoneMonths = [0, 4, 5, 7, 11]; // Jan, May, June, Aug, Dec

  // Find the nearest milestone
  let closestMilestone = targetMonth;
  let minDistance = Infinity;

  for (const milestone of milestoneMonths) {
    // Calculate distance considering year wrap
    let distance = Math.abs(milestone - targetMonth);
    if (distance > 6) distance = 12 - distance;

    // Prefer milestones that are at or after target (give enough time)
    const adjustedMilestone = milestone >= targetMonth ? milestone : milestone + 12;
    const forwardDistance = adjustedMilestone - targetMonth;

    if (forwardDistance <= 2 && forwardDistance >= 0) {
      // Within 2 months forward - good fit
      if (forwardDistance < minDistance) {
        minDistance = forwardDistance;
        closestMilestone = milestone;
      }
    }
  }

  // Adjust year if milestone pushes to next year
  let finalYear = targetYear;
  if (closestMilestone < now.getMonth() && monthsFromNow > 6) {
    finalYear = targetYear + 1;
  }

  // Return ISO date format (last day of the month)
  const lastDayOfMonth = new Date(finalYear, closestMilestone + 1, 0).getDate();
  const month = String(closestMilestone + 1).padStart(2, '0');
  return `${finalYear}-${month}-${lastDayOfMonth}`;
}

/**
 * Generate deadline in ISO format (YYYY-MM-DD)
 */
export function generateDeadline(monthsFromNow: number = 6): string {
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + monthsFromNow);

  // Set to last day of the month
  const year = deadline.getFullYear();
  const month = deadline.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const monthStr = String(month + 1).padStart(2, '0');
  return `${year}-${monthStr}-${lastDay}`;
}

/**
 * Calculate recommended number of goals based on SLP best practices
 * Factors:
 * - Baseline accuracy (lower = fewer, more focused goals)
 * - Problem type (articulation may need more sound-specific goals)
 * - Prior therapy experience
 * - Severity indicators from weaknesses
 */
export function calculateRecommendedGoalCount(
  evalData: EvaluationDataForGeneration
): { count: number; reasoning: string } {
  const baselineAccuracy = evalData.eval_data.baseline_accuracy ?? 50;
  const priorTherapy = evalData.eval_data.prior_therapy;
  const weaknesses = evalData.eval_data.weaknesses?.toLowerCase() || '';

  let count: number;
  let reasoning: string;

  // Start with baseline-based count
  if (baselineAccuracy < 30) {
    count = 2;
    reasoning = 'Focused approach with 2 goals due to significant skill gaps';
  } else if (baselineAccuracy < 50) {
    count = 2;
    reasoning = '2 targeted goals to build foundational skills';
  } else if (baselineAccuracy < 70) {
    count = 3;
    reasoning = '3 goals to address multiple skill areas';
  } else {
    count = 2;
    reasoning = '2 goals for refinement and generalization';
  }

  // Adjust for problem type
  if (evalData.problem_type === 'articulation') {
    const targetSounds = evalData.eval_data.target_sounds || [];
    if (targetSounds.length >= 3) {
      count = Math.min(3, Math.max(2, targetSounds.length > 4 ? 3 : 2));
      reasoning = `${count} goals to address multiple target sounds systematically`;
    } else if (targetSounds.length === 0) {
      count = 2;
      reasoning = '2 articulation goals covering common error patterns';
    }
  }

  // Adjust for multiple areas of weakness (language)
  if (evalData.problem_type === 'language') {
    const weaknessAreas = [
      'vocabulary', 'comprehension', 'grammar', 'pragmatic',
      'expressive', 'receptive', 'syntax', 'morphology'
    ];
    const identifiedAreas = weaknessAreas.filter(area => weaknesses.includes(area));

    if (identifiedAreas.length >= 4) {
      count = 3;
      reasoning = '3 goals to address multiple language domains';
    } else if (identifiedAreas.length === 1) {
      count = 2;
      reasoning = '2 focused goals for targeted intervention';
    }
  }

  // Adjust for therapy experience
  if (priorTherapy === 'none') {
    count = Math.min(count, 2);
    reasoning = '2 goals recommended for new therapy students';
  } else if (priorTherapy === '3+') {
    // Long therapy history - may need comprehensive approach
    count = Math.max(count, 2);
  }

  // Ensure within bounds (2-3 goals as requested)
  count = Math.max(2, Math.min(3, count));

  return { count, reasoning };
}

/**
 * Format baseline description
 */
export function formatBaselineDescription(baselineAccuracy: number): string {
  const trialsCorrect = Math.round(baselineAccuracy / 10);
  return `Currently at ${baselineAccuracy}% accuracy (approximately ${trialsCorrect}/10 trials correct)`;
}

export default {
  calculateTargetAccuracy,
  calculatePromptLevel,
  calculateSessionsToConfirm,
  identifyLanguagePriorityAreas,
  identifyArticulationPriorityCategories,
  generateGoalRules,
  getAvailableGoalTypes,
  generateDeadline,
  formatBaselineDescription,
  calculateSmartDeadline,
  calculateRecommendedGoalCount,
};
