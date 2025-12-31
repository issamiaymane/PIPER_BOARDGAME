/// <reference types="vite/client" />
/**
 * Board Game Card Data
 * Loads card data from JSON files and provides helper functions
 */

// Type definitions
interface CardData {
    [key: string]: unknown;
}

type CategoryData = Record<string, CardData[]>;

// Import all JSON files using Vite's glob import
// This loads all JSON files at build time, not runtime
const languageModules = import.meta.glob('./cards/language/*.json', { eager: true });
const articulationModules = import.meta.glob('./cards/articulation/*.json', { eager: true });

// Build the gameCardsData object from imported JSON files
function loadJsonModules(modules: Record<string, unknown>): CategoryData {
    const data: CategoryData = {};
    for (const path in modules) {
        const module = modules[path] as { default?: CategoryData } | CategoryData;
        const content = 'default' in module ? module.default : module;
        if (content && typeof content === 'object') {
            Object.assign(data, content);
        }
    }
    return data;
}

// Load all card data (pre-normalized in JSON files)
const languageData = loadJsonModules(languageModules);
const articulationData = loadJsonModules(articulationModules);

// Combined game cards data
export const gameCardsData: CategoryData = {
    ...languageData,
    ...articulationData
};

// Track used card indices for no-repeat functionality
let usedCardIndices: number[] = [];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get cards for a specific category
 */
export function getCardsForCategory(category: string): CardData[] {
    return gameCardsData[category] || [];
}

/**
 * Get a random card from selected categories (no repeats in same game)
 */
export function getRandomCard(selectedCategories: string[]): CardData | null {
    // Collect all cards from selected categories
    const allCards: CardData[] = [];
    selectedCategories.forEach(category => {
        const cards = gameCardsData[category];
        if (cards && cards.length > 0) {
            // Store subcategory (key name) separately, preserve card's original category if it has one
            allCards.push(...cards.map(card => ({
                subcategory: category,
                ...card,
                category: (card as { category?: string }).category || category
            })));
        }
    });

    if (allCards.length === 0) {
        return null;
    }

    // Get available indices (not yet used in this game)
    const availableIndices: number[] = [];
    for (let i = 0; i < allCards.length; i++) {
        if (!usedCardIndices.includes(i)) {
            availableIndices.push(i);
        }
    }

    // If all cards used, reset and start over
    if (availableIndices.length === 0) {
        usedCardIndices = [];
        for (let i = 0; i < allCards.length; i++) {
            availableIndices.push(i);
        }
    }

    // Pick random card from available ones
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    usedCardIndices.push(randomIndex);
    return allCards[randomIndex];
}

/**
 * Reset used cards tracking for new game
 */
export function resetCardIndex(): void {
    usedCardIndices = [];
}

/**
 * Get card for a specific board position
 */
export function getCardForPosition(position: number, selectedCategories: string[]): CardData | null {
    return getRandomCard(selectedCategories);
}

/**
 * Check if a category has cards available
 */
export function categoryHasCards(category: string): boolean {
    const cards = gameCardsData[category];
    return cards && cards.length > 0;
}

/**
 * Get all categories that have cards available
 */
export function getCategoriesWithCards(): string[] {
    return Object.keys(gameCardsData).filter(category => {
        const cards = gameCardsData[category];
        return cards && cards.length > 0;
    });
}

// ==================== CATEGORY CLASSIFICATION ====================

/**
 * Language category names (141 activities)
 * Including section headers that start with ---
 */
export const LANGUAGE_CATEGORIES = [
    '---Adjectives & Adverbs', 'Adjectives - Opposites', 'Adverbs', 'Descriptive Words - Opposites',
    '---Analogies', 'Analogies Elementary', 'Analogies High', 'Analogies Middle',
    '---Antonyms & Synonyms', 'Antonym Name One - Middle', 'Antonyms', 'Antonyms Level 2', 'Synonym-Name One - Middle', 'Synonym Name One - Elementary', 'Synonyms', 'Synonyms Level 2',
    '---Categories', 'Categories - Identifying Members Of A Category', 'Categories - Label The Category', 'Naming And Categorizing', 'Which One Does Not Belong',
    '---Concepts', 'Basic Spatial Concepts Fill In Word Or Phrase', 'Basic Temporal Concepts - Before And After', 'Basic Temporal Concepts Pick First - Second-Third', 'Before - After', 'Understanding Quantitative Concepts',
    '---Context Clues', 'Context Clues - Define Word In Paragraph', 'Context Clues Define Word In Sentence', 'Context Clues In Paragraphs - Fill In The Blank', 'Context Clues In Short Paragraphs',
    '---Describing', 'Common Items Around The House', 'Describe The Scene Create One Sentence', 'Describing', 'Describing - More Advanced', 'Function Labeling', 'Identify What Is Missing', 'Identifying Parts Of A Whole', 'Personal Hygiene Items',
    '---Figurative Language', 'Figurative Language - Identify The Meaning', 'Idioms', 'Metaphors - Identify The Meaning', 'Metaphors - Identify The Meaning - Multiple Choice', 'Metaphors Elementary', 'Metaphors Middle', 'Similes', 'Similes - Identify The Meaning', 'Similes - Identify The Meaning - Multiple Choice',
    '---Following Directions', 'Conditional Following Directions', 'Following 1-Step Directions', 'Following 2-Step Directions', 'Following Directions - Conditional', 'Following Multistep Directions Level 2',
    '---Grammar', 'Building Sentences Level 1 - Elementary', 'Building Sentences Level 2 - Elementary', 'Coordinating Conjuctions', 'Do Vs Does', 'Expanding Sentences - Images With Who What Where', 'Has Vs Have', 'Is Vs Are', 'Subordinating Conjunctions', 'Was Vs Were',
    '---Inferencing', 'Inferencing Based On Images', 'Inferencing Level 1', 'Inferencing Level 2',
    '---Multiple Meanings', 'Homophones', 'Identify The Meaning', 'Multiple Meaning Words',
    '---Negation', 'Negation', 'Negation Animals', 'Negation Clothing', 'Negation Colors', 'Negation Food', 'Negation Vehicles',
    '---Nouns & Pronouns', 'Noun Naming', 'Nouns Set Of Three', 'Possessives Common Nouns', 'Pronouns - His Hers Him Her Their', 'Pronouns (He She They)', 'Pronouns Mixed', 'Reflexive Pronouns',
    '---Plurals', 'Irregular Plurals', 'Regular Plurals',
    '---Prepositions', 'Prepositions', 'Prepositions Simple Images',
    '---Problem Solving', 'Problem Solving', 'Problem Solving Based On Images', 'Problem Solving Part 2',
    '---Questions', 'Questions For You', 'Yes No Questions',
    '---Rhyming', 'Rhyming', 'Rhyming - Match The Words That Rhyme',
    '---Safety', 'Safety Signs',
    '---Semantic Relationships', 'Comparatives - Superlatives', 'Compare And Contrast (Same And Different)', 'Semantic Relationships',
    '---Sequencing', 'First Next Then Last', 'How To', 'Sequencing Images - Set Of 3 Or 4', 'Short Stories Sequencing',
    '---Short Stories', 'Short Stories - High', 'Short Stories Level 1', 'Short Stories Level 2',
    '---Sight Words', 'Sight Words',
    '---Verbs & Tenses', 'Future Tense', 'Irregular Past Tense Verbs', 'Past Tense Verbs Irregular', 'Past Tense Verbs Regular', 'Third Person Singular', 'Verbs - Basic Actions', 'Verbs - Select From Three',
    '---Vocabulary', 'Naming Community Helpers', 'Vocabulary - Animals', 'Vocabulary - Basic Vocab', 'Vocabulary - Beach', 'Vocabulary - Clothing', 'Vocabulary - Color', 'Vocabulary - Core Vocab', 'Vocabulary - Food', 'Vocabulary - Food Real Images', 'Vocabulary - Halloween', 'Vocabulary - House', 'Vocabulary - Musical Instruments', 'Vocabulary - Parts Of The Body', 'Vocabulary - Parts Of The Body Preschool', 'Vocabulary - Places In A Town Or City', 'Vocabulary - School', 'Vocabulary - Seasonal Fall', 'Vocabulary - Seasonal Spring', 'Vocabulary - Seasonal Winter', 'Vocabulary - Shapes', 'Vocabulary - Sports', 'Vocabulary - Vehicles', 'Vocabulary - Vehicles Preschool', 'Vocabulary General',
    '---Wh- Questions', 'Wh- Questions Mixed', 'Wh- Questions Short Stories', 'Wh- Questions (What)', 'Wh- Questions (When)', 'Wh- Questions (Where)', 'Wh- Questions (Who)', 'Wh- Questions (Why)', 'Wh Questions With Picture Choices', 'Who Questions - Four Quadrants',
    '---Predictions', 'What Will Happen', 'What Will Happen - Predictions'
];

/**
 * Articulation category names (266 activities)
 * Including section headers that start with ---
 */
export const ARTICULATION_CATEGORIES = [
    '---Syllable Shapes', 'VC Mixed', 'CV Mixed', 'CVC Mixed', 'CVCV Mixed', 'CVCC Mixed', 'CCVC Mixed', 'Multisyllabic Words Mixed',
    '---Phonology', 'Stopping', 'Pre-Vocalic Voicing', 'Gliding', 'Fronting', 'Final Consonant Deletion', 'Cluster Reduction',
    '---B Sound', 'B Initial 1 CVC Word', 'B Initial 1 Simple Word, Phrase, Sentence', 'B Initial 5 More Complex Words', 'B Initial 5 More Complex Sentences', 'B Medial 1 Simple Word, Phrase, Sentence', 'B Medial 5 More Complex Words', 'B Medial 5 More Complex Sentences', 'B Final 1 CVC Word', 'B Final 1 Simple Word, Phrase, Sentence', 'B Final 5 More Complex Words', 'B Final 5 More Complex Sentences',
    '---CH Sound', 'Ch Initial 1 CVC Word', 'Ch Initial 1 Simple Word, Phrase, Sentence', 'Ch Initial 5 More Complex Words', 'Ch Initial 5 More Complex Sentences', 'Ch Medial 1 Simple Word, Phrase, Sentence', 'Ch Medial 5 More Complex Words', 'Ch Medial 5 More Complex Sentences', 'Ch Final 1 Simple Word, Phrase, Sentence', 'Ch Final 5 More Complex Words', 'Ch Final 5 More Complex Sentences',
    '---D Sound', 'D Initial 1 CVC Word', 'D Initial 1 Simple Word, Phrase, Sentence', 'D Initial 5 More Complex Words', 'D Initial 5 More Complex Sentences', 'D Medial 1 Simple Word, Phrase, Sentence', 'D Medial 5 More Complex Words', 'D Medial 5 More Complex Sentences', 'D Final 1 CVC Word', 'D Final 1 Simple Word, Phrase, Sentence', 'D Final 5 More Complex Words', 'D Final 5 More Complex Sentences',
    '---F Sound', 'F Initial 1 CVC Word', 'F Initial 1 Simple Word, Phrase, Sentence', 'F Initial 5 More Complex Words', 'F Initial 5 More Complex Sentences', 'F Medial 1 Simple Word, Phrase, Sentence', 'F Medial 5 More Complex Words', 'F Medial 5 More Complex Sentences', 'F Final 1 CVC Word', 'F Final 1 Simple Word, Phrase, Sentence', 'F Final 5 More Complex Words', 'F Final 5 More Complex Sentences',
    '---G Sound', 'G Initial 1 CVC Word', 'G Initial 1 Simple Word, Phrase, Sentence', 'G Initial 5 More Complex Words', 'G Initial 5 More Complex Sentences', 'G Medial 1 Simple Word, Phrase, Sentence', 'G Medial 5 More Complex Words', 'G Medial 5 More Complex Sentences', 'G Final 1 CVC Word', 'G Final 1 Simple Word, Phrase, Sentence', 'G Final 5 More Complex Words', 'G Final 5 More Complex Sentences',
    '---H Sound', 'H Initial 1 CVC Word', 'H Initial 1 Simple Word, Phrase, Sentence', 'H Initial 5 More Complex Words', 'H Initial 5 More Complex Sentences', 'H Medial 1 Simple Word, Phrase, Sentence', 'H Medial 5 More Complex Words', 'H Medial 5 More Complex Sentences',
    '---J Sound', 'J Initial 1 CVC Word', 'J Initial 1 Simple Word, Phrase, Sentence', 'J Initial 5 More Complex Words', 'J Initial 5 More Complex Sentences', 'J Medial 1 Simple Word, Phrase, Sentence', 'J Medial 5 More Complex Words', 'J Medial 5 More Complex Sentences', 'J Final 1 CVC Word', 'J Final 1 Simple Word, Phrase, Sentence', 'J Final 5 More Complex Words', 'J Final 5 More Complex Sentences',
    '---K Sound', 'K Initial 1 CVC Word', 'K Initial 1 Simple Word, Phrase, Sentence', 'K Initial 5 More Complex Words', 'K Initial 5 More Complex Sentences', 'K Medial 1 Simple Word, Phrase, Sentence', 'K Medial 5 More Complex Words', 'K Medial 5 More Complex Sentences', 'K Final 1 CVC Word', 'K Final 1 Simple Word, Phrase, Sentence', 'K Final 5 More Complex Words', 'K Final 5 More Complex Sentences',
    '---L Sound', 'L Initial 1 CVC Word', 'L Initial 1 Simple Word, Phrase, Sentence', 'L Initial 5 More Complex Words', 'L Initial 5 More Complex Sentences', 'L Medial 1 Simple Word, Phrase, Sentence', 'L Medial 5 More Complex Words', 'L Medial 5 More Complex Sentences', 'L Final 1 CVC Word', 'L Final 1 Simple Word, Phrase, Sentence', 'L Final 5 More Complex Words', 'L Final 5 More Complex Sentences', 'L In Paragraphs All Word Positions', 'L Blends 5 More Complex Words', 'L Blends In Paragraphs',
    '---M Sound', 'M Initial 1 CVC Word', 'M Initial 1 Simple Word, Phrase, Sentence', 'M Initial 5 More Complex Words', 'M Initial 5 More Complex Sentences', 'M Medial 1 Simple Word, Phrase, Sentence', 'M Medial 5 More Complex Words', 'M Medial 5 More Complex Sentences', 'M Final 1 CVC Word', 'M Final 1 Simple Word, Phrase, Sentence', 'M Final 5 More Complex Words', 'M Final 5 More Complex Sentences',
    '---N Sound', 'N Initial 1 CVC Word', 'N Initial 1 Simple Word, Phrase, Sentence', 'N Initial 5 More Complex Words', 'N Initial 5 More Complex Sentences', 'N Medial 1 Simple Word, Phrase, Sentence', 'N Medial 5 More Complex Words', 'N Medial 5 More Complex Sentences', 'N Final 1 CVC Word', 'N Final 1 Simple Word, Phrase, Sentence', 'N Final 5 More Complex Words', 'N Final 5 More Complex Sentences',
    '---NG Sound', 'Ng Medial 1 Simple Word, Phrase, Sentence', 'Ng Final 1 Simple Word, Phrase, Sentence',
    '---P Sound', 'P Initial 1 CVC Word', 'P Initial 1 Simple Word, Phrase, Sentence', 'P Initial 5 More Complex Words', 'P Initial 5 More Complex Sentences', 'P Medial 1 Simple Word, Phrase, Sentence', 'P Medial 5 More Complex Words', 'P Medial 5 More Complex Sentences', 'P Final 1 CVC Word', 'P Final 1 Simple Word, Phrase, Sentence', 'P Final 5 More Complex Words', 'P Final 5 More Complex Sentences',
    '---R Sound', 'R Initial 1 CVC Word', 'R Initial 1 Simple Word, Phrase, Sentence', 'R Initial 5 More Complex Words', 'R Initial 5 More Complex Sentences', 'R Medial 1 Simple Word, Phrase, Sentence', 'R Medial 5 More Complex Words', 'R Medial 5 More Complex Sentences', 'R Final 1 CVC Word', 'R Final 1 Simple Word, Phrase, Sentence', 'R Final 5 More Complex Words', 'R Final 5 More Complex Sentences', 'R In Paragraphs All Word Positions', 'Vocalic R Air Words', 'Vocalic R Ar Words', 'Vocalic R Ear Words', 'Vocalic R Er Words', 'Vocalic R Ire Words', 'Vocalic R Or Words', 'R Blends 5 More Complex Words', 'R Blends In Paragraphs',
    '---S Sound', 'S Initial 1 CVC Word', 'S Initial 1 Simple Word, Phrase, Sentence', 'S Initial 5 More Complex Words', 'S Initial 5 More Complex Sentences', 'S Medial 1 Simple Word, Phrase, Sentence', 'S Medial 5 More Complex Words', 'S Medial 5 More Complex Sentences', 'S Final 1 CVC Word', 'S Final 1 Simple Word, Phrase, Sentence', 'S Final 5 More Complex Words', 'S Final 5 More Complex Sentences', 'S In Paragraphs All Word Positions', 'S Blends 5 More Complex Words', 'S Blends 1 Simple Word, Phrase, Sentence', 'S Blends In Paragraphs',
    '---SH Sound', 'Sh Initial 1 CVC Word', 'Sh Initial 1 Simple Word, Phrase, Sentence', 'Sh Initial 5 More Complex Words', 'Sh Initial 5 More Complex Sentences', 'Sh Medial 1 Simple Word, Phrase, Sentence', 'Sh Medial 5 More Complex Words', 'Sh Medial 5 More Complex Sentences', 'Sh Final 1 CVC Word', 'Sh Final 1 Simple Word, Phrase, Sentence', 'Sh Final 5 More Complex Words', 'Sh Final 5 More Complex Sentences',
    '---T Sound', 'T Initial 1 CVC Word', 'T Initial 1 Simple Word, Phrase, Sentence', 'T Initial 5 More Complex Words', 'T Initial 5 More Complex Sentences', 'T Medial 1 Simple Word, Phrase, Sentence', 'T Medial 5 More Complex Words', 'T Medial 5 More Complex Sentences', 'T Final 1 CVC Word', 'T Final 1 Simple Word, Phrase, Sentence', 'T Final 5 More Complex Words', 'T Final 5 More Complex Sentences',
    '---TH Voiced', 'Th Voiced Initial Words', 'Th Voiced Initial Sentences', 'Th Voiced Medial Words', 'Th Voiced Medial Sentences', 'Th Voiced In Paragraphs All Word Positions',
    '---TH Voiceless', 'Th Voiceless Initial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Initial Words', 'Th Voiceless Initial Sentences', 'Th Voiceless Medial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Medial Words', 'Th Voiceless Medial Sentences', 'Th Voiceless Final 1 Simple Word, Phrase, Sentence', 'Th Voiceless Final Words', 'Th Voiceless Final Sentences', 'Th Voiceless In Paragraphs All Word Positions',
    '---V Sound', 'V Initial 1 CVC Word', 'V Initial 1 Simple Word, Phrase, Sentence', 'V Initial 5 More Complex Words', 'V Initial 5 More Complex Sentences', 'V Medial 1 Simple Word, Phrase, Sentence', 'V Medial 5 More Complex Words', 'V Medial 5 More Complex Sentences', 'V Final 1 CVC Word', 'V Final 1 Simple Word, Phrase, Sentence', 'V Final 5 More Complex Words', 'V Final 5 More Complex Sentences',
    '---W Sound', 'W Initial 1 CVC Word', 'W Initial 1 Simple Word, Phrase, Sentence', 'W Initial 5 More Complex Words', 'W Initial 5 More Complex Sentences', 'W Medial 1 Simple Word, Phrase, Sentence', 'W Medial 5 More Complex Words', 'W Medial 5 More Complex Sentences',
    '---Y Sound', 'Y Initial 1 Simple Word, Phrase, Sentence', 'Y Initial 5 More Complex Words', 'Y Initial 5 More Complex Sentences', 'Y Medial 1 Simple Word, Phrase, Sentence', 'Y Medial 5 More Complex Words', 'Y Medial 5 More Complex Sentences',
    '---Z Sound', 'Z Initial 1 CVC Word', 'Z Initial 5 More Complex Words', 'Z Initial 5 More Complex Sentences', 'Z Medial 5 More Complex Words', 'Z Medial 5 More Complex Sentences', 'Z Final 1 CVC Word', 'Z Final 5 More Complex Words', 'Z Final 5 More Complex Sentences',
    '---Consonant Clusters', 'Consonant Clusters - Scr', 'Consonant Clusters - Shr', 'Consonant Clusters - Skw', 'Consonant Clusters - Spl', 'Consonant Clusters - Spr', 'Consonant Clusters - Str', 'Consonant Clusters - Thr',
    '---Vowels', 'Vowels - Long Vowel A Type In Answer', 'Vowels - Long Vowel E Type In Answer', 'Vowels - Long Vowel I Type In Answer', 'Vowels - Long Vowel O Type In Answer', 'Vowels - Long Vowel U Type In Answer', 'Vowels - Short A Type In Answer', 'Vowels - Short E Type In Answer', 'Vowels - Short I Type In Answer', 'Vowels - Short O Type In Answer', 'Vowels - Short U Type In Answer'
];

/**
 * Get all board game categories organized by type
 */
export function getBoardGameCategories(): { language: string[]; articulation: string[] } {
    return {
        language: LANGUAGE_CATEGORIES,
        articulation: ARTICULATION_CATEGORIES
    };
}

// ==================== GLOBAL EXPORTS ====================
// Expose functions globally for compatibility with existing code
window.gameCardsData = gameCardsData;
window.getCardsForCategory = getCardsForCategory;
window.getRandomCard = getRandomCard;
window.resetCardIndex = resetCardIndex;
window.getCardForPosition = getCardForPosition;
window.categoryHasCards = categoryHasCards;
window.getBoardGameCategories = getBoardGameCategories;
