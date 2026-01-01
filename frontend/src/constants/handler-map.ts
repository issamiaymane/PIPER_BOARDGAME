/**
 * Handler Configuration and Category Mapping
 * Maps categories to their handler types for the card browser
 */

// Handler types supported by the card browser (7 consolidated handlers)
export type HandlerType =
    | 'single-answer'
    | 'multiple-answers'
    | 'multiple-choice'
    | 'image-selection'
    | 'sequencing'
    | 'building'
    | 'conditional'
    | 'standard';

// Handler configuration with display info
export interface HandlerConfig {
    name: string;
    icon: string;
    color: string;
}

// Handler configuration with colors and icons
export const HANDLERS: Record<HandlerType, HandlerConfig> = {
    'single-answer': { name: 'Single Answer', icon: '💬', color: '#2196F3' },
    'multiple-answers': { name: 'Multiple Answers', icon: '📖', color: '#673AB7' },
    'multiple-choice': { name: 'Multiple Choice', icon: '🔘', color: '#9C27B0' },
    'image-selection': { name: 'Image Selection', icon: '🖼️', color: '#00BCD4' },
    'sequencing': { name: 'Sequencing', icon: '📊', color: '#795548' },
    'building': { name: 'Building', icon: '🧩', color: '#8BC34A' },
    'conditional': { name: 'Conditional', icon: '❓', color: '#00897B' },
    'standard': { name: 'Standard', icon: '📋', color: '#9E9E9E' }
};

/**
 * Explicit category-to-handler mapping for all language categories
 *
 * Handler Types:
 * - single-answer: question + images[{image,label}] + answers[]
 * - multiple-answers: images + questions[{question, answer/answers}] (multiple Q&A per card)
 * - multiple-choice: question + images + choices[] + answerIndex
 * - image-selection: question + images + answerIndex (select correct image)
 * - sequencing: question + images + answerSequence[] (order images)
 * - building: question + words[] + answerSequence[] (order words)
 * - conditional: question + images (action-based, no answer validation)
 */
export const CATEGORY_HANDLER_MAP: Record<string, HandlerType> = {
    // ===== SINGLE ANSWER (~57 categories) =====
    // question + images[{image,label}] + answers

    // adjectives-adverbs.json
    'Adjectives - Opposites': 'single-answer',
    'Descriptive Words - Opposites': 'single-answer',

    // antonyms-synonyms.json
    'Antonym Name One - Middle': 'single-answer',
    'Antonyms': 'single-answer',
    'Synonym-Name One - Middle': 'single-answer',
    'Synonym Name One - Elementary': 'single-answer',

    // categories.json
    'Categories - Label The Category': 'single-answer',

    // concepts.json
    'Basic Spatial Concepts Fill In Word Or Phrase': 'single-answer',
    'Basic Temporal Concepts - Before And After': 'single-answer',
    'Before - After': 'single-answer',

    // conjunctions.json
    'Coordinating Conjuctions': 'single-answer',
    'Subordinating Conjunctions': 'single-answer',

    // describing.json
    'Describe The Scene Create One Sentence': 'single-answer',
    'Describing': 'multiple-answers',
    'Describing - More Advanced': 'multiple-answers',

    // directions.json
    'Following Multistep Directions Level 2': 'single-answer',

    // figurative.json
    'Idioms': 'single-answer',
    'Metaphors - Identify The Meaning': 'single-answer',
    'Metaphors Elementary': 'single-answer',
    'Metaphors Middle': 'single-answer',
    'Similes': 'multiple-answers',
    'Similes - Identify The Meaning': 'single-answer',

    // inferencing.json
    'Inferencing Based On Images': 'multiple-answers',
    'Inferencing Level 1': 'single-answer',
    'Inferencing Level 2': 'multiple-answers',

    // nouns-pronouns.json
    'Noun Naming': 'single-answer',
    'Pronouns - His Hers Him Her Their': 'single-answer',
    'Pronouns (He She They)': 'single-answer',
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

    // rhyming.json
    'Rhyming': 'single-answer',

    // safety.json
    'Safety Signs': 'single-answer',

    // sequencing.json
    'How To': 'single-answer',

    // sight-words.json
    'Sight Words': 'single-answer',

    // tenses.json
    'Future Tense': 'single-answer',

    // verbs.json
    'Verbs - Basic Actions': 'single-answer',
    'Function Labeling': 'single-answer',

    // vocabulary.json
    'Common Items Around The House': 'single-answer',
    'Homophones': 'multiple-answers',
    'Identify What Is Missing': 'single-answer',
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
    'Wh- Questions Mixed': 'single-answer',
    'Wh- Questions (What)': 'single-answer',
    'Wh- Questions (When)': 'single-answer',
    'Wh- Questions (Where)': 'single-answer',
    'Wh- Questions (Who)': 'single-answer',
    'Wh- Questions (Why)': 'single-answer',

    // ===== MULTIPLE ANSWERS (~8 categories) =====
    // images[{image,label}] + questions[{question, answer/answers}] - multiple Q&A per card

    // short-stories.json
    'Short Stories - High': 'multiple-answers',
    'Short Stories Level 1': 'multiple-answers',
    'Short Stories Level 2': 'multiple-answers',

    // wh-questions.json
    'Wh- Questions Short Stories': 'multiple-answers',

    // ===== MULTIPLE CHOICE (~29 categories) =====
    // question + images[{image,label}] + choices + answerIndex

    // adjectives-adverbs.json
    'Adverbs': 'multiple-choice',

    // analogies.json
    'Analogies Elementary': 'multiple-choice',
    'Analogies High': 'multiple-choice',
    'Analogies Middle': 'multiple-choice',

    // antonyms-synonyms.json
    'Antonyms Level 2': 'multiple-choice',
    'Synonyms': 'multiple-choice',
    'Synonyms Level 2': 'multiple-choice',

    // comparatives.json
    'Semantic Relationships': 'multiple-choice',

    // concepts.json
    'Understanding Quantitative Concepts': 'multiple-choice',

    // context-clues.json
    'Context Clues - Define Word In Paragraph': 'multiple-choice',
    'Context Clues Define Word In Sentence': 'multiple-choice',
    'Context Clues In Paragraphs - Fill In The Blank': 'multiple-choice',
    'Context Clues In Short Paragraphs': 'multiple-choice',

    // figurative.json
    'Figurative Language - Identify The Meaning': 'multiple-choice',
    'Identify The Meaning': 'multiple-choice',
    'Metaphors - Identify The Meaning - Multiple Choice': 'multiple-choice',
    'Similes - Identify The Meaning - Multiple Choice': 'multiple-choice',

    // grammar-verbs.json
    'Do Vs Does': 'multiple-choice',
    'Has Vs Have': 'multiple-choice',
    'Is Vs Are': 'multiple-choice',
    'Was Vs Were': 'multiple-choice',
    'Third Person Singular': 'multiple-choice',

    // nouns-pronouns.json
    'Possessives Common Nouns': 'multiple-choice',

    // questions.json
    'Yes No Questions': 'multiple-choice',

    // rhyming.json
    'Rhyming - Match The Words That Rhyme': 'multiple-choice',

    // tenses.json
    'Irregular Past Tense Verbs': 'multiple-choice',
    'Past Tense Verbs Irregular': 'multiple-choice',
    'Past Tense Verbs Regular': 'multiple-choice',

    // vocabulary.json
    'Multiple Meaning Words': 'multiple-choice',

    // ===== IMAGE SELECTION (~11 categories) =====
    // question + images[{image,label}] + answerIndex (no choices)

    // categories.json
    'Which One Does Not Belong': 'image-selection',

    // negation.json
    'Negation': 'image-selection',
    'Negation Animals': 'image-selection',
    'Negation Clothing': 'image-selection',
    'Negation Colors': 'image-selection',
    'Negation Food': 'image-selection',
    'Negation Vehicles': 'image-selection',

    // nouns-pronouns.json
    'Nouns Set Of Three': 'image-selection',

    // verbs.json
    'Verbs - Select From Three': 'image-selection',

    // wh-questions.json
    'Wh Questions With Picture Choices': 'image-selection',
    'Who Questions - Four Quadrants': 'image-selection',

    // ===== SEQUENCING (4 categories) =====
    // question + images[{image,label}] + answerSequence

    // concepts.json
    'Basic Temporal Concepts Pick First - Second-Third': 'sequencing',

    // sequencing.json
    'First Next Then Last': 'sequencing',
    'Sequencing Images - Set Of 3 Or 4': 'sequencing',
    'Short Stories Sequencing': 'sequencing',

    // ===== BUILDING (2 categories) =====
    // question + words + answerSequence

    // sentences.json
    'Building Sentences Level 1 - Elementary': 'building',
    'Building Sentences Level 2 - Elementary': 'building',

    // ===== CONDITIONAL (~10 categories) =====
    // question + images[{image,label}] (action-based, no answer validation)

    // categories.json
    'Categories - Identifying Members Of A Category': 'single-answer',
    'Naming And Categorizing': 'multiple-answers',

    // comparatives.json
    'Comparatives - Superlatives': 'single-answer',
    'Compare And Contrast (Same And Different)': 'multiple-answers',

    // directions.json
    'Conditional Following Directions': 'conditional',
    'Following 1-Step Directions': 'conditional',
    'Following 2-Step Directions': 'conditional',
    'Following Directions - Conditional': 'conditional',

    // sentences.json
    'Expanding Sentences - Images With Who What Where': 'multiple-answers',

    // vocabulary.json
    'Identifying Parts Of A Whole': 'multiple-answers',
};

/**
 * Get handler type for a category
 * @param category - Category name
 * @returns Handler type or 'standard' if not found
 */
export function getHandlerType(category: string): HandlerType {
    return CATEGORY_HANDLER_MAP[category] || 'standard';
}

/**
 * Get handler config for a category
 * @param category - Category name
 * @returns Handler configuration
 */
export function getHandlerConfig(category: string): HandlerConfig {
    const handlerType = getHandlerType(category);
    return HANDLERS[handlerType];
}
