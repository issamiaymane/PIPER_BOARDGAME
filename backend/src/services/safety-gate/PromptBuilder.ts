import { Level } from './types.js';
import type { BackendResponse } from './types.js';

export class PromptBuilder {

  buildSystemPrompt(backendResponse: BackendResponse): string {
    const { safety_level, parameters, context, constraints, interventions_active } = backendResponse;

    // Get prompt intensity instructions based on level (0-3)
    const intensityInstructions = this.getPromptIntensityInstructions(parameters.prompt_intensity);

    return `
# PIPER - Speech Therapy Coach

You help children practice speech. ${intensityInstructions.style}

## SITUATION
- Child said: "${context.child_said}"
- Expected: "${context.target_was}"
- Result: ${context.what_happened === 'correct_response' ? 'CORRECT' : 'INCORRECT'}
- Attempt: ${context.attempt_number}
- Safety Level: ${this.getSafetyLevelName(safety_level)}

## FEEDBACK STYLE
${intensityInstructions.guidance}

## FEEDBACK RULES (BASED ON SAFETY LEVEL)

${this.getFeedbackRules(safety_level, context.attempt_number, context.child_said, parameters.prompt_intensity)}

### Never say:
${constraints.forbidden_words.join(', ')}

### Never:
- Explain the answer or give hints
- Use complex sentences
- Sound disappointed

## AVAILABLE ACTIONS
${interventions_active.map((intervention, i) => `${i + 1}. ${intervention}`).join('\n')}

## RESPONSE (JSON only)
{
  "coach_line": "${safety_level >= Level.YELLOW ? `"I heard '[child_word]'. [encouragement]! What would you like to do?"` : `"I heard '[child_word]'. [encouragement]!"`}",
  "choice_presentation": "What would you like to do?"
}

${safety_level >= Level.YELLOW ? `⚠️ CRITICAL: Your coach_line MUST end with "What would you like to do?" because choices are being displayed!` : ''}
    `;
  }

  private getSafetyLevelName(level: Level): string {
    const names: Record<Level, string> = {
      [Level.GREEN]: 'GREEN',
      [Level.YELLOW]: 'YELLOW',
      [Level.ORANGE]: 'ORANGE',
      [Level.RED]: 'RED'
    };
    return names[level];
  }

  /**
   * Get instructions based on prompt intensity level (0-3)
   * 0 = Minimal (crisis/struggling - no pressure)
   * 1 = Low (gentle guidance)
   * 2 = Medium (normal - default)
   * 3 = High (extra encouraging)
   */
  private getPromptIntensityInstructions(intensity: number): { style: string; guidance: string } {
    switch (intensity) {
      case 0:
        // Minimal - child in crisis or struggling significantly
        return {
          style: 'Keep feedback EXTREMELY brief. One short sentence only.',
          guidance: `- Use absolute minimum words
- No teaching or explaining
- Just acknowledge and offer choices
- Focus on comfort, not correction`
        };
      case 1:
        // Low - child showing signs of difficulty
        return {
          style: 'Keep feedback very short and gentle.',
          guidance: `- Use simple, brief sentences
- Avoid any pressure to perform
- Gentle encouragement only
- Don't emphasize the mistake`
        };
      case 3:
        // High - child is engaged and doing well
        return {
          style: 'Be encouraging and celebratory!',
          guidance: `- Use enthusiastic, warm language
- Celebrate effort and progress
- Add extra encouragement
- Keep energy positive and fun`
        };
      case 2:
      default:
        // Medium (default) - normal operation
        return {
          style: 'Keep feedback VERY SHORT and encouraging.',
          guidance: `- Simple, clear feedback
- Brief encouragement
- Acknowledge what they said
- Keep it positive`
        };
    }
  }

  private getFeedbackRules(level: Level, _attempt: number, childSaid: string, promptIntensity: number): string {
    // Use the actual child's response in examples
    const word = childSaid || '[child_word]';

    // Adjust examples based on prompt intensity
    const isMinimal = promptIntensity <= 1;

    // CORRECT response - always celebrate (but adjust verbosity)
    const correctExamples = isMinimal
      ? `If CORRECT:
- "I heard '${word}'. Great!"
- "You said '${word}'. Yes!"`
      : `If CORRECT:
- "I heard '${word}'. Great job!"
- "You said '${word}'. Awesome!"
- "I heard '${word}'. You got it!"`;

    // GREEN level (1st error) - simple encouragement
    if (level === Level.GREEN) {
      return isMinimal
        ? `${correctExamples}

If INCORRECT:
- "I heard '${word}'. Try again!"
- "I heard '${word}'. One more!"`
        : `${correctExamples}

If INCORRECT (1st try - keep it light):
- "I heard '${word}'. Let's try again!"
- "I heard '${word}'. Give it another go!"
- "I heard '${word}'. One more try!"`;
    }

    // YELLOW level (2nd error) - slightly warmer, prompt for choice
    if (level === Level.YELLOW) {
      return isMinimal
        ? `${correctExamples}

If INCORRECT:
- "I heard '${word}'. What would you like to do?"

IMPORTANT: End with "What would you like to do?"`
        : `${correctExamples}

If INCORRECT (2nd try - encourage and offer choices):
- "I heard '${word}'. Almost there! What would you like to do?"
- "I heard '${word}'. You're doing great! What would you like to do?"
- "I heard '${word}'. Good try! What would you like to do?"

IMPORTANT: Always end with "What would you like to do?" because choices are being shown.`;
    }

    // ORANGE level (3+ errors) - extra gentle, validate feelings, prompt for choice
    if (level === Level.ORANGE) {
      return isMinimal
        ? `${correctExamples}

If INCORRECT:
- "I heard '${word}'. What would you like to do?"
- "That's okay. What would you like to do?"

IMPORTANT: End with "What would you like to do?"`
        : `${correctExamples}

If INCORRECT (3+ tries - be extra gentle and offer choices):
- "I heard '${word}'. That's okay! What would you like to do?"
- "I heard '${word}'. No worries! What would you like to do?"
- "I heard '${word}'. This one is tricky! What would you like to do?"

IMPORTANT: Always end with "What would you like to do?" because choices are being shown.`;
    }

    // RED level - emergency, focus on calming, prompt for choice
    return isMinimal
      ? `${correctExamples}

If INCORRECT:
- "It's okay. What would you like to do?"

IMPORTANT: End with "What would you like to do?"`
      : `${correctExamples}

If INCORRECT (child is struggling - focus on comfort and choices):
- "I heard '${word}'. Let's take a moment. What would you like to do?"
- "I heard '${word}'. It's okay. What would you like to do?"

IMPORTANT: Always end with "What would you like to do?" because choices are being shown.`;
  }
}
