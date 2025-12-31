/**
 * Generic AI Check Controller
 * Handles all check-* endpoints with a unified approach
 */

import { Request, Response } from 'express';
import OpenAI from 'openai';

// Type definitions
export interface CheckConfig {
  name: string;
  systemPrompt: string;
  buildUserPrompt: (body: Record<string, unknown>) => string;
  requiredFields: string[];
  responseFields?: string[];
  localCheck?: (body: Record<string, unknown>) => { match: boolean; response?: Record<string, unknown> };
}

export interface CheckResult {
  isCorrect: boolean;
  [key: string]: unknown;
}

/**
 * Creates a generic check handler for AI-powered answer validation
 */
export function createCheckHandler(openAI: OpenAI, config: CheckConfig) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body;

      // Validate required fields
      const missingFields = config.requiredFields.filter(field => !body[field]);
      if (missingFields.length > 0) {
        res.status(400).json({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          isCorrect: false
        });
        return;
      }

      // Try local check first if provided
      if (config.localCheck) {
        const localResult = config.localCheck(body);
        if (localResult.match) {
          res.json(localResult.response || { isCorrect: true });
          return;
        }
      }

      // Call OpenAI
      const response = await openAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: config.systemPrompt },
          { role: 'user', content: config.buildUserPrompt(body) }
        ],
        temperature: 0.1,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content || '{"isCorrect": false}';

      // Parse JSON response
      let result: CheckResult;
      try {
        result = JSON.parse(content);
      } catch {
        // Fallback parsing
        result = {
          isCorrect: content.toLowerCase().includes('"iscorrect": true') ||
                     content.toLowerCase().includes('"iscorrect":true')
        };
      }

      res.json({
        ...result,
        isCorrect: result.isCorrect || false,
      });

    } catch (error) {
      console.error(`${config.name} check error:`, error);
      res.status(500).json({
        error: error instanceof Error ? error.message : `${config.name} check failed`,
        isCorrect: false,
      });
    }
  };
}

/**
 * Check configurations for all answer types
 */
export const checkConfigs: Record<string, Omit<CheckConfig, 'name'> & { name?: string }> = {
  antonym: {
    requiredFields: ['word', 'userAnswer'],
    systemPrompt: 'You are a helpful assistant that checks if words are antonyms for a children\'s speech therapy game. Respond with JSON only: {"isCorrect": true/false, "explanation": "brief reason"}. Be VERY lenient - accept ANY word that is a valid opposite or antonym of the given word, even if it\'s not the exact expected answer. For example: "dirty" is a valid antonym of "tidy" (not just "untidy"), "smooth" is a valid antonym of "rough", "big" and "large" are both valid antonyms of "small".',
    buildUserPrompt: (body) => `Is "${body.userAnswer}" a valid antonym (opposite) of "${body.word}"? Accept ANY reasonable opposite - the child's answer doesn't need to match a specific expected word, it just needs to be a genuine antonym.`
  },

  synonym: {
    requiredFields: ['word', 'userAnswer'],
    systemPrompt: 'You are a helpful assistant that checks if words are synonyms for a children\'s speech therapy game. Respond with JSON only: {"isCorrect": true/false, "feedback": "brief explanation"}. Be VERY lenient - accept ANY word that has a similar meaning to the given word, even if it\'s not an exact synonym. Accept words that are close in meaning, related words, or words a child might reasonably use as a synonym.',
    buildUserPrompt: (body) => `Is "${body.userAnswer}" a valid synonym or similar word for "${body.word}"? Known valid synonyms: ${(body.validSynonyms as string[])?.join(', ') || 'none'}. Accept ANY word with similar meaning - be generous with children's answers.`,
    localCheck: (body) => {
      const answer = (body.userAnswer as string)?.trim().toLowerCase();
      const synonyms = body.validSynonyms as string[];
      if (synonyms?.some(s => s.toLowerCase() === answer)) {
        return { match: true, response: { isCorrect: true, feedback: `"${body.userAnswer}" is correct!` } };
      }
      return { match: false };
    }
  },

  'wh-answer': {
    requiredFields: ['question', 'userAnswer'],
    systemPrompt: 'You are evaluating answers to Wh-questions for a children\'s speech therapy game. Respond with JSON: {"correct": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY answer that reasonably addresses the question, even if phrased differently or uses different words than expected. Children may express ideas in their own way.',
    buildUserPrompt: (body) => `Question type: ${body.questionWord || 'Wh'}\nQuestion: ${body.question}\nExpected answer type: ${body.expectedAnswerType || 'appropriate'}\nSample answers: ${(body.sampleAnswers as string[])?.join(', ') || 'none'}\nUser answer: ${body.userAnswer}\n\nIs this answer acceptable? Accept ANY reasonable response that addresses the question.`
  },

  prediction: {
    requiredFields: ['scenario', 'userAnswer'],
    systemPrompt: 'You evaluate prediction answers for a children\'s speech therapy game. Respond with JSON: {"correct": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY prediction that could logically follow from the scenario. Children\'s creative predictions should be encouraged.',
    buildUserPrompt: (body) => `Scenario: ${body.scenario}\nSample predictions: ${(body.sampleAnswers as string[])?.join(', ') || 'none'}\nChild\'s prediction: ${body.userAnswer}\n\nIs this a reasonable prediction? Accept ANY logical possibility.`
  },

  'temporal-concept': {
    requiredFields: ['question', 'expectedAnswer', 'userAnswer'],
    systemPrompt: 'You check temporal concept answers (before/after, first/last, etc) for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept synonyms, equivalent phrases, and child-friendly variations of the answer.',
    buildUserPrompt: (body) => `Question: ${body.question}\nExpected: ${body.expectedAnswer}\nAnswer: ${body.userAnswer}\n\nIs this correct or a valid equivalent? Accept synonyms and similar meanings.`
  },

  category: {
    requiredFields: ['category', 'userAnswer'],
    systemPrompt: 'You check if items belong to categories for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "explanation": "brief"}. Be VERY lenient - accept ANY item that could reasonably belong to the category, even if not in the expected list.',
    buildUserPrompt: (body) => `Category: ${body.category}\nValid items: ${(body.validItems as string[])?.join(', ') || 'any'}\nAnswer: ${body.userAnswer}\n\nDoes this belong to the category? Accept ANY reasonable item for this category.`
  },

  'category-label': {
    requiredFields: ['items', 'userAnswer'],
    systemPrompt: 'You identify what category items belong to for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept synonyms, related category names, and child-friendly terms.',
    buildUserPrompt: (body) => `Items: ${(body.items as string[])?.join(', ')}\nValid categories: ${(body.validAnswers as string[])?.join(', ') || 'any'}\nAnswer: ${body.userAnswer}\n\nIs this a valid category name? Accept synonyms and related terms.`
  },

  comparatives: {
    requiredFields: ['word', 'userComparative', 'userSuperlative'],
    systemPrompt: 'You check comparative and superlative forms for a children\'s speech therapy game. Respond with JSON: {"comparativeCorrect": true/false, "superlativeCorrect": true/false, "isCorrect": true/false}. Be lenient with minor spelling errors and accept alternative valid forms.',
    buildUserPrompt: (body) => `Word: ${body.word}\nExpected comparative: ${body.comparative}\nExpected superlative: ${body.superlative}\nUser comparative: ${body.userComparative}\nUser superlative: ${body.userSuperlative}\n\nAre these correct? Accept minor spelling variations.`
  },

  'compare-contrast': {
    requiredFields: ['item1', 'item2'],
    systemPrompt: 'You evaluate compare/contrast answers for a children\'s speech therapy game. Respond with JSON: {"sameCorrect": true/false, "differentCorrect": true/false, "isCorrect": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY valid similarity or difference, not just expected answers.',
    buildUserPrompt: (body) => `Compare: ${body.item1} and ${body.item2}\nSimilarity answer: ${body.sameAnswer || 'not provided'}\nDifference answer: ${body.differentAnswer || 'not provided'}\n\nAre these valid comparisons? Accept ANY reasonable similarity or difference.`
  },

  'describe-scene': {
    requiredFields: ['description'],
    systemPrompt: 'You evaluate scene descriptions for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY description that shows the child engaged with the image, even if brief or partial.',
    buildUserPrompt: (body) => `Image context: ${body.imagePath || 'scene'}\nDescription: ${body.description}\n\nIs this a valid description? Accept ANY reasonable observation about the scene.`
  },

  describing: {
    requiredFields: ['item'],
    systemPrompt: 'You evaluate describing answers (what is it, group, use, parts, location) for a children\'s speech therapy game. Respond with JSON: {"nameCorrect": true/false, "groupCorrect": true/false, "useCorrect": true/false, "partsCorrect": true/false, "locationCorrect": true/false, "isCorrect": true/false}. Be VERY lenient - accept synonyms, related terms, and child-friendly explanations.',
    buildUserPrompt: (body) => `Item: ${body.item}\nExpected: name=${body.expectedName}, group=${body.expectedGroup}, use=${body.expectedUse}, parts=${body.expectedParts}, location=${body.expectedLocation}\nAnswers: name=${body.userName}, group=${body.userGroup}, use=${body.userUse}, parts=${body.userParts}, location=${body.userLocation}\n\nEvaluate each answer generously - accept reasonable alternatives.`
  },

  'describing-advanced': {
    requiredFields: ['item'],
    systemPrompt: 'You evaluate advanced describing answers for a children\'s speech therapy game. Respond with JSON with correctness for each field and overall isCorrect. Be VERY lenient - accept synonyms, related terms, and creative child-friendly explanations.',
    buildUserPrompt: (body) => `Item: ${body.item}\nEvaluate these descriptions generously: ${JSON.stringify(body)}`
  },

  'descriptive-opposite': {
    requiredFields: ['word1', 'word2', 'userAnswer'],
    systemPrompt: 'You check descriptive opposites for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY valid opposite of the word, not just the specific expected answer. For example: if the word is "rough", accept "smooth", "soft", "silky", etc. If the word is "tidy", accept "messy", "dirty", "untidy", etc.',
    buildUserPrompt: (body) => `Word: ${body.word1}\nExpected opposite: ${body.word2}\nAnswer: ${body.userAnswer}\n\nIs the user's answer a valid opposite of "${body.word1}"? Accept ANY reasonable opposite, not just the exact expected answer.`
  },

  'expanding-sentences': {
    requiredFields: ['whoAnswer', 'whatAnswer', 'whereAnswer'],
    systemPrompt: 'You evaluate Who/What/Where answers for a children\'s speech therapy game. Respond with JSON: {"whoCorrect": true/false, "whatCorrect": true/false, "whereCorrect": true/false, "isCorrect": true/false}. Be VERY lenient - accept ANY reasonable answer for each question, even if different from expected.',
    buildUserPrompt: (body) => `Image: ${body.image || 'scene'}\nWho: ${body.whoAnswer}\nWhat: ${body.whatAnswer}\nWhere: ${body.whereAnswer}\n\nAre these reasonable answers? Accept ANY valid response for each.`
  },

  'common-item': {
    requiredFields: ['question', 'userAnswer'],
    systemPrompt: 'You check common item location answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY reasonable location where the item could be found.',
    buildUserPrompt: (body) => `Question: ${body.question}\nValid answers: ${(body.validAnswers as string[])?.join(', ') || 'any reasonable'}\nAnswer: ${body.userAnswer}\n\nIs this a reasonable place to find this item? Accept ANY valid location.`
  },

  'spatial-concept': {
    requiredFields: ['sentence', 'userAnswer'],
    systemPrompt: 'You check spatial preposition answers (on, under, beside, etc) for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept equivalent prepositions and synonyms (e.g., "below" = "under", "next to" = "beside").',
    buildUserPrompt: (body) => `Sentence: ${body.sentence}\nExpected: ${body.expectedAnswer}\nAnswer: ${body.userAnswer}\n\nIs this correct or an equivalent preposition? Accept synonyms.`
  },

  'function-label': {
    requiredFields: ['item', 'userAnswer'],
    systemPrompt: 'You check function/use descriptions for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY valid use or function of the item, even if not in the expected list.',
    buildUserPrompt: (body) => `Item: ${body.item}\nValid functions: ${(body.validFunctions as string[])?.join(', ') || 'any'}\nAnswer: ${body.userAnswer}\n\nIs this a valid function or use? Accept ANY reasonable answer.`
  },

  'future-tense': {
    requiredFields: ['verb', 'userAnswer'],
    systemPrompt: 'You check future tense forms for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be lenient - accept "will + verb", "going to + verb", and minor spelling errors.',
    buildUserPrompt: (body) => `Verb: ${body.verb}\nExpected: ${body.expectedAnswer}\nAnswer: ${body.userAnswer}\n\nIs this correct future tense? Accept variations and minor spelling errors.`
  },

  homophones: {
    requiredFields: ['sentence', 'userAnswer'],
    systemPrompt: 'You check homophone usage in sentences for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be lenient with minor spelling variations.',
    buildUserPrompt: (body) => `Sentence: ${body.sentence}\nExpected: ${body.expectedAnswer}\nOptions: ${(body.allWords as string[])?.join(', ') || ''}\nAnswer: ${body.userAnswer}\n\nIs this the correct homophone? Accept minor spelling variations.`
  },

  'how-to': {
    requiredFields: ['question', 'userAnswer'],
    systemPrompt: 'You evaluate procedural explanations for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY logical explanation that shows understanding of the process, even if steps are in different order or phrased differently.',
    buildUserPrompt: (body) => `Question: ${body.question}\nExpected steps: ${(body.expectedSteps as string[])?.join(', ') || 'logical steps'}\nKeywords: ${(body.keywords as string[])?.join(', ') || ''}\nAnswer: ${body.userAnswer}\n\nIs this a valid explanation? Accept ANY reasonable process description.`
  },

  missing: {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You check "what is missing" answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept synonyms, related terms, and child-friendly descriptions of the missing item.',
    buildUserPrompt: (body) => `Valid answers: ${(body.validAnswers as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct or a valid synonym/description of the missing item?`
  },

  parts: {
    requiredFields: ['item', 'userParts'],
    systemPrompt: 'You check "parts of a whole" answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "correctCount": number}. Be VERY lenient - accept ANY part that belongs to the item, even if not in the expected list.',
    buildUserPrompt: (body) => `Item: ${body.item}\nValid parts: ${(body.validParts as string[])?.join(', ')}\nAnswers: ${(body.userParts as string[])?.join(', ')}\n\nHow many are valid parts? Accept ANY real part of this item.`
  },

  idiom: {
    requiredFields: ['idiom', 'userAnswer'],
    systemPrompt: 'You check idiom meaning explanations for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY explanation that shows understanding of the figurative meaning, even if worded differently.',
    buildUserPrompt: (body) => `Idiom: ${body.idiom}\nValid meanings: ${(body.validMeanings as string[])?.join(', ') || 'the figurative meaning'}\nAnswer: ${body.userAnswer}\n\nDoes this show understanding of the meaning? Accept child-friendly explanations.`
  },

  inference: {
    requiredFields: ['question', 'userAnswer'],
    systemPrompt: 'You evaluate inferencing answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY logical inference that could be drawn from the context.',
    buildUserPrompt: (body) => `Context: ${body.imageContext || body.paragraph || body.passage || 'given context'}\nQuestion: ${body.question}\nValid answers: ${(body.validAnswers as string[])?.join(', ') || 'logical inference'}\nAnswer: ${body.userAnswer}\n\nIs this a valid inference? Accept ANY reasonable conclusion.`
  },

  plural: {
    requiredFields: ['singular', 'userAnswer'],
    systemPrompt: 'You check irregular plural forms for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be lenient with minor spelling errors.',
    buildUserPrompt: (body) => `Singular: ${body.singular}\nValid plurals: ${(body.validPlurals as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct? Accept minor spelling variations.`
  },

  metaphor: {
    requiredFields: ['metaphor', 'userAnswer'],
    systemPrompt: 'You check metaphor meaning explanations for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY explanation that shows understanding of the figurative meaning.',
    buildUserPrompt: (body) => `Metaphor: ${body.metaphor}\nContext: ${body.context || ''}\nValid meanings: ${(body.validMeanings as string[])?.join(', ') || 'figurative meaning'}\nAnswer: ${body.userAnswer}\n\nDoes this capture the meaning? Accept child-friendly explanations.`
  },

  'multiple-meaning': {
    requiredFields: ['word', 'userMeaning1', 'userMeaning2'],
    systemPrompt: 'You check multiple meaning word answers for a children\'s speech therapy game. Respond with JSON: {"meaning1Correct": true/false, "meaning2Correct": true/false, "isCorrect": true/false}. Be VERY lenient - accept ANY two different valid meanings of the word.',
    buildUserPrompt: (body) => `Word: ${body.word}\nValid meanings: ${JSON.stringify(body.meanings)}\nMeaning 1: ${body.userMeaning1}\nMeaning 2: ${body.userMeaning2}\n\nAre these two different valid meanings? Accept ANY real meanings of this word.`
  },

  'naming-category': {
    requiredFields: ['userCategory'],
    systemPrompt: 'You check naming/categorizing answers for a children\'s speech therapy game. Respond with JSON: {"itemsCorrect": [true/false array], "categoryCorrect": true/false, "isCorrect": true/false}. Be VERY lenient - accept synonyms and related category names.',
    buildUserPrompt: (body) => `Expected items: ${JSON.stringify(body.items)}\nExpected category: ${JSON.stringify(body.category)}\nUser items: ${(body.userItems as string[])?.join(', ')}\nUser category: ${body.userCategory}\n\nEvaluate generously - accept synonyms and related terms.`
  },

  'community-helper': {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You check community helper identification for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept synonyms, related job titles, and child-friendly terms (e.g., "doctor" = "physician", "cop" = "police officer").',
    buildUserPrompt: (body) => `Valid answers: ${(body.validAnswers as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct or a valid synonym? Accept related job titles.`
  },

  noun: {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You check noun naming answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept synonyms, related words, child-friendly terms, and minor spelling mistakes.',
    buildUserPrompt: (body) => `Valid answers: ${(body.validAnswers as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct, a valid synonym, or a close spelling? Be generous.`
  },

  preposition: {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You check preposition answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept equivalent prepositions (e.g., "below" = "under", "next to" = "beside", "on top of" = "on").',
    buildUserPrompt: (body) => `Valid prepositions: ${(body.validPrepositions as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct or an equivalent preposition?`
  },

  'problem-solving': {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You evaluate problem-solving answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY reasonable solution that could help solve the problem, even if creative or different from expected.',
    buildUserPrompt: (body) => `Scenario: ${body.scenario || body.imageContext || 'given problem'}\nSample solutions: ${(body.validSolutions as string[])?.join(', ') || 'reasonable solutions'}\nKeywords: ${(body.keywords as string[])?.join(', ') || ''}\nAnswer: ${body.userAnswer}\n\nIs this a reasonable solution? Accept ANY helpful response.`
  },

  pronoun: {
    requiredFields: ['userAnswer'],
    systemPrompt: 'You check pronoun usage answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be lenient - accept grammatically correct pronoun usage even if different from expected.',
    buildUserPrompt: (body) => `Valid pronouns: ${(body.validAnswers as string[])?.join(', ')}\nAnswer: ${body.userAnswer}\n\nIs this correct or a grammatically valid alternative?`
  },

  rhyme: {
    requiredFields: ['word1', 'userAnswer'],
    systemPrompt: 'You check rhyming word answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY word that rhymes with the given word, including made-up words that follow rhyming patterns, slang, and near-rhymes.',
    buildUserPrompt: (body) => `Word to rhyme with: ${body.word1}\nKnown rhymes: ${(body.validRhymes as string[])?.join(', ') || 'any rhyming word'}\nAnswer: ${body.userAnswer}\n\nDoes this rhyme? Accept ANY rhyming word.`
  },

  'sign-meaning': {
    requiredFields: ['signType', 'userAnswer'],
    systemPrompt: 'You check safety sign meaning answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY explanation that shows understanding of what the sign means or what to do when seeing it.',
    buildUserPrompt: (body) => `Sign type: ${body.signType}\nValid meanings: ${(body.validMeanings as string[])?.join(', ') || ''}\nKeywords: ${(body.keywords as string[])?.join(', ') || ''}\nAnswer: ${body.userAnswer}\n\nDoes this show understanding of the sign? Accept child-friendly explanations.`
  },

  'story-comprehension': {
    requiredFields: ['story', 'userAnswer'],
    systemPrompt: 'You evaluate story comprehension answers for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false, "feedback": "brief"}. Be VERY lenient - accept ANY answer that shows the child understood and engaged with the story.',
    buildUserPrompt: (body) => `Story: ${body.story}\nQuestion type: ${body.questionType || 'comprehension'}\nKeywords: ${(body.keywords as string[])?.join(', ') || ''}\nValid answers: ${(body.validAnswers as string[])?.join(', ') || 'story-based answer'}\nAnswer: ${body.userAnswer}\n\nIs this a reasonable answer based on the story? Be generous.`
  },

  'sight-word': {
    requiredFields: ['word', 'userAnswer'],
    systemPrompt: 'You check sight word recognition for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be lenient with minor spelling variations and phonetic spellings.',
    buildUserPrompt: (body) => `Target word: ${body.word}\nValid answers: ${(body.validAnswers as string[])?.join(', ') || body.word}\nAnswer: ${body.userAnswer}\n\nIs this correct? Accept minor spelling variations.`
  },

  simile: {
    requiredFields: ['simile', 'userAnswer'],
    systemPrompt: 'You evaluate simile understanding for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY answer that shows understanding of the comparison being made.',
    buildUserPrompt: (body) => `Simile: ${body.simile}\nQuestion type: ${body.questionType || 'meaning'}\nMeaning: ${body.meaning || ''}\nCompared items: ${(body.comparedItems as string[])?.join(' and ') || ''}\nValid answers: ${(body.validAnswers as string[])?.join(', ') || 'correct understanding'}\nAnswer: ${body.userAnswer}\n\nDoes this show understanding? Accept child-friendly explanations.`
  },

  'simile-meaning': {
    requiredFields: ['simile', 'userAnswer'],
    systemPrompt: 'You check simile meaning explanations for a children\'s speech therapy game. Respond with JSON: {"isCorrect": true/false}. Be VERY lenient - accept ANY explanation that captures the essence of the comparison.',
    buildUserPrompt: (body) => `Simile: ${body.simile}\nValid meanings: ${(body.validMeanings as string[])?.join(', ') || 'correct meaning'}\nAnswer: ${body.userAnswer}\n\nDoes this capture the meaning? Accept child-friendly explanations.`
  },
};
