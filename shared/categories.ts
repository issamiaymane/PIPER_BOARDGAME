/**
 * SINGLE SOURCE OF TRUTH FOR CATEGORIES AND HANDLER MAPPINGS
 *
 * This file is shared between frontend and backend.
 * When adding/removing categories, update ONLY this file.
 */

// =============================================================================
// HANDLER TYPES
// =============================================================================
export type HandlerType =
    | 'single-answer'
    | 'multiple-answers'
    | 'multiple-choice'
    | 'image-selection'
    | 'sequencing'
    | 'building'
    | 'conditional'
    | 'standard';

// =============================================================================
// ARTICULATION CATEGORIES (alphabetically sorted)
// =============================================================================
export const ARTICULATION_CATEGORIES: string[] = [
    'B Sound', 'CH Sound', 'Consonant Clusters', 'D Sound', 'F Sound',
    'G Sound', 'H Sound', 'J Sound', 'K Sound', 'L Blends Sound', 'L Sound',
    'M Sound', 'N Sound', 'Ng Sound', 'P Sound', 'Phonology', 'R Blends Sound',
    'R Sound', 'S Blends Sound', 'S Sound', 'Sh Sound', 'Syllable Shapes',
    'T Sound', 'Th Voiced Sound', 'Th Voiceless Sound', 'V Sound', 'Vowels',
    'W Sound', 'Y Sound', 'Z Sound'
];

// =============================================================================
// CATEGORY TO HANDLER MAPPING
// =============================================================================
/**
 * Maps each language category to its handler type
 *
 * Handler Types:
 * 1. single-answer: question + images[{image,label}] + answers[]
 * 2. multiple-answers: images[{image,label}] + questions[{question, answer/answers}]
 * 3. multiple-choice: question + images[{image,label}] + choices[] + answerIndex
 * 4. image-selection: question + images[{image,label}] + answerIndex
 * 5. sequencing: question + images[{image,label}] + answerSequence[]
 * 6. building: question + words[] + answerSequence[]
 * 7. conditional: question + images[{image,label}] (action-based, no answer validation)
 */
export const CATEGORY_HANDLER_MAP: Record<string, HandlerType> = {
    // adjectives-adverbs.json
    'Adjectives - Opposites': 'single-answer',
    'Adverbs': 'multiple-choice',
    'Descriptive Words - Opposites': 'single-answer',

    // analogies.json
    'Analogies Elementary': 'multiple-choice',
    'Analogies High': 'multiple-choice',
    'Analogies Middle': 'multiple-choice',

    // antonyms-synonyms.json
    'Antonym Name One - Middle': 'single-answer',
    'Antonyms': 'single-answer',
    'Antonyms Level 2': 'multiple-choice',
    'Synonym Name One - Elementary': 'single-answer',
    'Synonym-Name One - Middle': 'single-answer',
    'Synonyms': 'multiple-choice',
    'Synonyms Level 2': 'multiple-choice',

    // categories.json
    'Categories - Identifying Members Of A Category': 'single-answer',
    'Categories - Label The Category': 'single-answer',
    'Naming And Categorizing': 'multiple-answers',
    'Which One Does Not Belong': 'image-selection',

    // comparatives.json
    'Compare And Contrast (Same And Different)': 'multiple-answers',
    'Comparatives - Superlatives': 'single-answer',
    'Semantic Relationships': 'multiple-choice',

    // concepts.json
    'Basic Spatial Concepts Fill In Word Or Phrase': 'single-answer',
    'Basic Temporal Concepts - Before And After': 'single-answer',
    'Basic Temporal Concepts Pick First - Second-Third': 'sequencing',
    'Before - After': 'single-answer',
    'Understanding Quantitative Concepts': 'multiple-choice',

    // conjunctions.json
    'Coordinating Conjuctions': 'single-answer',
    'Subordinating Conjunctions': 'single-answer',

    // context-clues.json
    'Context Clues - Define Word In Paragraph': 'multiple-choice',
    'Context Clues Define Word In Sentence': 'multiple-choice',
    'Context Clues In Paragraphs - Fill In The Blank': 'multiple-choice',
    'Context Clues In Short Paragraphs': 'multiple-choice',

    // describing.json
    'Describe The Scene Create One Sentence': 'single-answer',
    'Describing': 'multiple-answers',
    'Describing - More Advanced': 'multiple-answers',

    // directions.json
    'Conditional Following Directions': 'conditional',
    'Following 1-Step Directions': 'conditional',
    'Following 2-Step Directions': 'conditional',
    'Following Directions - Conditional': 'conditional',
    'Following Multistep Directions Level 2': 'single-answer',

    // figurative.json
    'Figurative Language - Identify The Meaning': 'multiple-choice',
    'Identify The Meaning': 'multiple-choice',
    'Idioms': 'single-answer',
    'Metaphors - Identify The Meaning': 'single-answer',
    'Metaphors - Identify The Meaning - Multiple Choice': 'multiple-choice',
    'Metaphors Elementary': 'single-answer',
    'Metaphors Middle': 'single-answer',
    'Similes': 'multiple-answers',
    'Similes - Identify The Meaning': 'single-answer',
    'Similes - Identify The Meaning - Multiple Choice': 'multiple-choice',

    // grammar-verbs.json
    'Do Vs Does': 'multiple-choice',
    'Has Vs Have': 'multiple-choice',
    'Is Vs Are': 'multiple-choice',
    'Third Person Singular': 'multiple-choice',
    'Was Vs Were': 'multiple-choice',

    // inferencing.json
    'Inferencing Based On Images': 'multiple-answers',
    'Inferencing Level 1': 'single-answer',
    'Inferencing Level 2': 'multiple-answers',

    // negation.json
    'Negation': 'image-selection',
    'Negation Animals': 'image-selection',
    'Negation Clothing': 'image-selection',
    'Negation Colors': 'image-selection',
    'Negation Food': 'image-selection',
    'Negation Vehicles': 'image-selection',

    // nouns-pronouns.json
    'Noun Naming': 'single-answer',
    'Nouns Set Of Three': 'image-selection',
    'Possessives Common Nouns': 'multiple-choice',
    'Pronouns (He She They)': 'single-answer',
    'Pronouns - His Hers Him Her Their': 'single-answer',
    'Pronouns Mixed': 'single-answer',
    'Reflexive Pronouns': 'single-answer',

    // plurals.json
    'Irregular Plurals': 'single-answer',
    'Regular Plurals': 'single-answer',

    // predictions.json
    'What Will Happen': 'single-answer',
    'What Will Happen - Predictions': 'single-answer',

    // prepositions.json
    'Prepositions': 'single-answer',
    'Prepositions Simple Images': 'single-answer',

    // problem-solving.json
    'Problem Solving': 'single-answer',
    'Problem Solving Based On Images': 'single-answer',
    'Problem Solving Part 2': 'single-answer',

    // questions.json
    'Questions For You': 'single-answer',
    'Yes No Questions': 'multiple-choice',

    // rhyming.json
    'Rhyming': 'single-answer',
    'Rhyming - Match The Words That Rhyme': 'multiple-choice',

    // safety.json
    'Safety Signs': 'single-answer',

    // sentences.json
    'Building Sentences Level 1 - Elementary': 'building',
    'Building Sentences Level 2 - Elementary': 'building',
    'Expanding Sentences - Images With Who What Where': 'multiple-answers',

    // sequencing.json
    'First Next Then Last': 'sequencing',
    'How To': 'single-answer',
    'Sequencing Images - Set Of 3 Or 4': 'sequencing',
    'Short Stories Sequencing': 'sequencing',

    // short-stories.json
    'Short Stories - High': 'multiple-answers',
    'Short Stories Level 1': 'multiple-answers',
    'Short Stories Level 2': 'multiple-answers',

    // sight-words.json
    'Sight Words': 'single-answer',

    // tenses.json
    'Future Tense': 'single-answer',
    'Irregular Past Tense Verbs': 'multiple-choice',
    'Past Tense Verbs Irregular': 'multiple-choice',
    'Past Tense Verbs Regular': 'multiple-choice',

    // verbs.json
    'Function Labeling': 'single-answer',
    'Verbs - Basic Actions': 'single-answer',
    'Verbs - Select From Three': 'image-selection',

    // vocabulary.json
    'Common Items Around The House': 'single-answer',
    'Homophones': 'multiple-answers',
    'Identify What Is Missing': 'single-answer',
    'Identifying Parts Of A Whole': 'multiple-answers',
    'Multiple Meaning Words': 'multiple-choice',
    'Naming Community Helpers': 'single-answer',
    'Personal Hygiene Items': 'single-answer',
    'Vocabulary - Animals': 'single-answer',
    'Vocabulary - Basic Vocab': 'single-answer',
    'Vocabulary - Beach': 'single-answer',
    'Vocabulary - Clothing': 'single-answer',
    'Vocabulary - Color': 'single-answer',
    'Vocabulary - Core Vocab': 'single-answer',
    'Vocabulary - Food': 'single-answer',
    'Vocabulary - Food Real Images': 'single-answer',
    'Vocabulary - Halloween': 'single-answer',
    'Vocabulary - House': 'single-answer',
    'Vocabulary - Musical Instruments': 'single-answer',
    'Vocabulary - Parts Of The Body': 'single-answer',
    'Vocabulary - Parts Of The Body Preschool': 'single-answer',
    'Vocabulary - Places In A Town Or City': 'single-answer',
    'Vocabulary - School': 'single-answer',
    'Vocabulary - Seasonal Fall': 'single-answer',
    'Vocabulary - Seasonal Spring': 'single-answer',
    'Vocabulary - Seasonal Winter': 'single-answer',
    'Vocabulary - Shapes': 'single-answer',
    'Vocabulary - Sports': 'single-answer',
    'Vocabulary - Vehicles': 'single-answer',
    'Vocabulary - Vehicles Preschool': 'single-answer',
    'Vocabulary General': 'single-answer',

    // wh-questions.json
    'Wh Questions With Picture Choices': 'image-selection',
    'Wh- Questions (What)': 'single-answer',
    'Wh- Questions (When)': 'single-answer',
    'Wh- Questions (Where)': 'single-answer',
    'Wh- Questions (Who)': 'single-answer',
    'Wh- Questions (Why)': 'single-answer',
    'Wh- Questions Mixed': 'single-answer',
    'Wh- Questions Short Stories': 'multiple-answers',
    'Who Questions - Four Quadrants': 'image-selection',
};

// =============================================================================
// DERIVED ARRAYS
// =============================================================================

/** All language category names - derived from CATEGORY_HANDLER_MAP keys */
export const LANGUAGE_CATEGORIES: string[] = Object.keys(CATEGORY_HANDLER_MAP);

// =============================================================================
// CARD JSON FILES (for Supabase fetch)
// =============================================================================

/** Language card JSON filenames */
export const LANGUAGE_FILES: string[] = [
    'adjectives-adverbs.json', 'analogies.json', 'antonyms-synonyms.json', 'categories.json',
    'comparatives.json', 'concepts.json', 'conjunctions.json', 'context-clues.json',
    'describing.json', 'directions.json', 'figurative.json', 'grammar-verbs.json',
    'inferencing.json', 'negation.json', 'nouns-pronouns.json', 'plurals.json',
    'predictions.json', 'prepositions.json', 'problem-solving.json', 'questions.json',
    'rhyming.json', 'safety.json', 'sentences.json', 'sequencing.json',
    'short-stories.json', 'sight-words.json', 'tenses.json', 'verbs.json',
    'vocabulary.json', 'wh-questions.json'
];

/** Articulation card JSON filenames */
export const ARTICULATION_FILES: string[] = [
    'b-sound.json', 'ch-sound.json', 'consonant-clusters.json', 'd-sound.json',
    'f-sound.json', 'g-sound.json', 'h-sound.json', 'j-sound.json', 'k-sound.json',
    'l-blends-sound.json', 'l-sound.json', 'm-sound.json', 'n-sound.json', 'ng-sound.json',
    'p-sound.json', 'phonology.json', 'r-blends-sound.json', 'r-sound.json',
    's-blends-sound.json', 's-sound.json', 'sh-sound.json', 'syllable-shapes.json',
    't-sound.json', 'th-voiced-sound.json', 'th-voiceless-sound.json', 'v-sound.json',
    'vowels.json', 'w-sound.json', 'y-sound.json', 'z-sound.json'
];
