/**
 * Card Data Loader
 * Dynamically loads card data from JSON files
 */

// Type for card data
interface CardData {
    [key: string]: unknown;
}

// Type for category data (category name -> array of cards)
type CategoryData = Record<string, CardData[]>;

// Cache for loaded data
const dataCache: Record<string, CategoryData> = {};

// Language group files
const languageFiles = [
    'adjectives-adverbs',
    'analogies',
    'antonyms-synonyms',
    'categories',
    'comparatives',
    'concepts',
    'conjunctions',
    'context-clues',
    'describing',
    'directions',
    'figurative',
    'grammar-verbs',
    'inferencing',
    'negation',
    'nouns-pronouns',
    'plurals',
    'prepositions',
    'problem-solving',
    'questions',
    'rhyming',
    'safety',
    'sentences',
    'sequencing',
    'short-stories',
    'sight-words',
    'tenses',
    'verbs',
    'vocabulary',
    'wh-questions',
    'predictions'
];

// Articulation group files
const articulationFiles = [
    'syllable-shapes',
    'phonology',
    'b-sound',
    'ch-sound',
    'd-sound',
    'f-sound',
    'g-sound',
    'h-sound',
    'j-sound',
    'k-sound',
    'l-sound',
    'l-blends-sound',
    'm-sound',
    'n-sound',
    'ng-sound',
    'p-sound',
    'r-sound',
    'r-blends-sound',
    's-sound',
    's-blends-sound',
    'sh-sound',
    't-sound',
    'th-voiced-sound',
    'th-voiceless-sound',
    'v-sound',
    'vowels',
    'w-sound',
    'y-sound',
    'z-sound',
    'consonant-clusters'
];

/**
 * Load a single JSON file
 */
async function loadJsonFile(path: string): Promise<CategoryData> {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            console.warn(`Failed to load ${path}: ${response.status}`);
            return {};
        }
        return await response.json();
    } catch (error) {
        console.warn(`Error loading ${path}:`, error);
        return {};
    }
}

/**
 * Load all language card data
 */
export async function loadLanguageCards(): Promise<CategoryData> {
    if (dataCache['language']) {
        return dataCache['language'];
    }

    const allData: CategoryData = {};
    const basePath = '/scripts/data/cards/language/';

    const promises = languageFiles.map(file =>
        loadJsonFile(`${basePath}${file}.json`)
    );

    const results = await Promise.all(promises);

    results.forEach(data => {
        Object.assign(allData, data);
    });

    dataCache['language'] = allData;
    return allData;
}

/**
 * Load all articulation card data
 */
export async function loadArticulationCards(): Promise<CategoryData> {
    if (dataCache['articulation']) {
        return dataCache['articulation'];
    }

    const allData: CategoryData = {};
    const basePath = '/scripts/data/cards/articulation/';

    const promises = articulationFiles.map(file =>
        loadJsonFile(`${basePath}${file}.json`)
    );

    const results = await Promise.all(promises);

    results.forEach(data => {
        Object.assign(allData, data);
    });

    dataCache['articulation'] = allData;
    return allData;
}

/**
 * Load all card data (language + articulation)
 */
export async function loadAllCards(): Promise<CategoryData> {
    if (dataCache['all']) {
        return dataCache['all'];
    }

    const [language, articulation] = await Promise.all([
        loadLanguageCards(),
        loadArticulationCards()
    ]);

    const allData = { ...language, ...articulation };
    dataCache['all'] = allData;
    return allData;
}

/**
 * Get cards for a specific category (must be loaded first)
 */
export function getCardsForCategory(category: string): CardData[] {
    // Check all caches
    for (const cached of Object.values(dataCache)) {
        if (cached[category]) {
            return cached[category];
        }
    }
    return [];
}

/**
 * Check if a category exists and has cards
 */
export function categoryHasCards(category: string): boolean {
    for (const cached of Object.values(dataCache)) {
        if (cached[category] && cached[category].length > 0) {
            return true;
        }
    }
    return false;
}

/**
 * Get list of all loaded categories
 */
export function getLoadedCategories(): string[] {
    const categories = new Set<string>();
    for (const cached of Object.values(dataCache)) {
        Object.keys(cached).forEach(cat => categories.add(cat));
    }
    return Array.from(categories);
}

/**
 * Get board game categories grouped by type
 */
export function getBoardGameCategories(): { language: string[]; articulation: string[] } {
    const languageCategories: string[] = [];
    const articulationCategories: string[] = [];

    if (dataCache['language']) {
        languageCategories.push(...Object.keys(dataCache['language']));
    }
    if (dataCache['articulation']) {
        articulationCategories.push(...Object.keys(dataCache['articulation']));
    }

    return { language: languageCategories, articulation: articulationCategories };
}

/**
 * Get a random card from selected categories
 */
export function getRandomCard(selectedCategories: string[]): CardData | null {
    const allCards: CardData[] = [];

    selectedCategories.forEach(category => {
        const cards = getCardsForCategory(category);
        if (cards && cards.length > 0) {
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

    return allCards[Math.floor(Math.random() * allCards.length)];
}

/**
 * Clear the data cache (useful for hot reload)
 */
export function clearCache(): void {
    Object.keys(dataCache).forEach(key => delete dataCache[key]);
}
