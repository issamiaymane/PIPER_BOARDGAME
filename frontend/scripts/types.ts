/**
 * Shared TypeScript types for the Piper Speech Game
 */

// Card type - represents a question/activity card
export interface Card {
    // Core fields
    question?: string;
    answer?: string;
    answers?: string[];
    word?: string;
    image1?: string;
    image2?: string;
    category?: string;
    subcategory?: string;
    sentence?: string;
    subject?: string;
    isPlural?: boolean;
    correction?: string;
    answerIndex?: number;

    // Binary choice types
    yesNoQuestions?: boolean;

    // Vocabulary types
    vocabularyBasic?: boolean;
    vocabularyAnimals?: boolean;
    vocabularyBeach?: boolean;
    vocabularyClothing?: boolean;
    vocabularyColor?: boolean;
    vocabularyCoreVocab?: boolean;
    vocabularyFood?: boolean;
    vocabularyFoodReal?: boolean;
    vocabularyHouse?: boolean;
    vocabularyInstruments?: boolean;
    vocabularyBody?: boolean;
    vocabularyBodyPreschool?: boolean;
    vocabularyPlaces?: boolean;
    vocabularySchool?: boolean;
    vocabularyFall?: boolean;
    vocabularySpring?: boolean;
    vocabularyWinter?: boolean;
    vocabularyShapes?: boolean;
    vocabularySports?: boolean;
    vocabularyVehicles?: boolean;
    vocabularyVehiclesPreschool?: boolean;
    vocabularyGeneral?: boolean;
    vocabularyHalloween?: boolean;
    sightWords?: boolean;
    safetySigns?: boolean;
    homophones?: boolean;
    nounNaming?: boolean;
    communityHelpers?: boolean;
    personalHygiene?: boolean;
    functionLabeling?: boolean;
    commonItem?: boolean;
    verbsBasicActions?: boolean;

    // Fill-blank types
    prepositions?: boolean;
    prepositionsSimple?: boolean;
    pronounsHisHer?: boolean;
    pronounsSubject?: boolean;
    pronounsMixed?: boolean;
    reflexivePronouns?: boolean;
    subordinatingConjunctions?: boolean;
    futureTense?: boolean;
    irregularPlurals?: boolean;
    regularPlurals?: boolean;
    temporalConcept?: boolean;

    // Multiple choice types
    choices?: string[];
    metaphorsMultipleChoice?: boolean;
    pastTenseIrregular?: boolean;
    pastTenseRegular?: boolean;
    possessivesCommon?: boolean;
    figurativeLanguage?: boolean;
    synonymsMultipleChoice?: boolean;
    synonymsLevel2?: boolean;
    irregularPastTense?: boolean;
    semanticRelationships?: boolean;
    thirdPersonSingular?: boolean;
    quantitativeConcepts?: boolean;
    identifyMeaning?: boolean;
    paragraph?: string;
    highlightedWord?: string;

    // Image selection types
    negation?: boolean;
    negationAnimals?: boolean;
    negationClothing?: boolean;
    negationColors?: boolean;
    negationFood?: boolean;
    negationVehicles?: boolean;
    nounsSetOfThree?: boolean;
    verbsSelectFromThree?: boolean;
    whQuestionsPictureChoices?: boolean;
    whichOneDoesNotBelong?: boolean;
    whoQuestionsFourQuadrants?: boolean;

    // Open response types
    problemSolving?: boolean;
    problemSolvingImages?: boolean;
    problemSolvingPart2?: boolean;
    describing?: boolean;
    describingAdvanced?: boolean;
    describeScene?: boolean;
    expandingSentences?: boolean;
    followingDirections?: boolean;
    howTo?: boolean;
    identifyMissing?: boolean;
    idioms?: boolean;
    inferencingLevel1?: boolean;
    inferencingLevel2?: boolean;
    questionsForYou?: boolean;
    whQuestionsMixed?: boolean;
    whQuestionsWhat?: boolean;
    whQuestionsWho?: boolean;
    whQuestionsWhen?: boolean;
    whQuestionsWhere?: boolean;
    whQuestionsWhy?: boolean;
    whatWillHappen?: boolean;
    whatWillHappenPredictions?: boolean;
    condition?: string;
    isTrue?: boolean;

    // Word relationship types
    metaphors?: boolean;
    metaphorsElementary?: boolean;
    metaphorsMiddle?: boolean;
    similes?: boolean;
    similesIdentify?: boolean;
    similesMultipleChoice?: boolean;
    synonymMiddle?: boolean;
    synonymElementary?: boolean;
    rhymingFillIn?: boolean;
    rhymingMatch?: boolean;

    // Comparatives types
    multipleMeaning?: boolean;
    namingCategorizing?: boolean;
    descriptiveOpposites?: boolean;
    identifyingParts?: boolean;
    superlative?: string;
    item1?: string;
    item2?: string;
    question1?: string;
    question2?: string;
    items?: string[];

    // Sequencing types
    words?: string[];
    before?: string;
    after?: string;
    step1?: string;
    step2?: string;
    step3?: string;
    firstNextThenLast?: boolean;
    sequencingImages?: boolean;
    shortStoriesSequencing?: boolean;

    // Reading comprehension types
    shortStoriesHigh?: boolean;
    shortStoriesLevel1?: boolean;
    shortStoriesLevel2?: boolean;
    whQuestionsShortStories?: boolean;

    // Allow additional properties for extensibility
    [key: string]: unknown;
}

// Handler interface for card type handlers
export interface CardHandler {
    setup: (card: Card) => void;
    checkAnswer?: (userAnswer: string) => void;
}

// Handler registry type
export type HandlerRegistry = Record<string, CardHandler>;

// DOM elements interface
export interface DomCache {
    cardModal?: HTMLElement | null;
    cardQuestion?: HTMLElement | null;
    cardCategory?: HTMLElement | null;
    answerInput?: HTMLInputElement | null;
    checkAnswerBtn?: HTMLButtonElement | null;
    doneButton?: HTMLButtonElement | null;
    wordLabel?: HTMLElement | null;
    multipleChoiceContainer?: HTMLElement | null;
    image1?: HTMLElement | null;
    image2?: HTMLElement | null;
    [key: string]: HTMLElement | null | undefined;
}

// SpeechGame namespace interface
export interface SpeechGameNamespace {
    dom: DomCache;
    state: {
        currentQuestion: Card | null;
        questionAnswered: boolean;
        lastQuestionPosition: number;
        currentPosition: number;
        score: number;
        [key: string]: unknown;
    };
    vadState: {
        isProcessing: boolean;
        [key: string]: unknown;
    };
    vadConfig: Record<string, unknown>;
    audio: {
        play: (sound: string) => void;
    };
    tts: {
        speak: (text: string) => void;
        prepareQuestion: (text: string) => string;
    };
    ui: {
        showFeedback: (message: string, isCorrect: boolean) => void;
        clearFeedback: () => void;
        showNotification: (message: string, icon: string, type: string, duration?: number) => void;
        updateScoreDisplay: () => void;
        hideRecordingStatus: () => void;
        hideAIFeedback: () => void;
    };
    board: {
        config: {
            totalSpaces: number;
        };
    };
    api: Record<string, unknown>;
    voiceManager: Record<string, unknown>;
    hybridInput: {
        isSupported: () => boolean;
        injectIntoContainer: (container: HTMLElement) => void;
    };
    styleNormalizer: {
        normalizeCard: (container: HTMLElement, type: string) => void;
        applyCategorySpecificStyles: (container: HTMLElement, type: string) => void;
    };
    focusCard: Record<string, unknown>;
    cardHandlers: {
        register: (type: string, handler: CardHandler) => void;
        handleCorrect: (message?: string, userAnswer?: string) => Promise<void>;
        handleIncorrect: (correctAnswer: string, message?: string, userAnswer?: string) => Promise<void>;
        show: (card: Card) => void;
        close: () => void;
        baseSetup: () => void;
        hideCommonElements: () => void;
        showContainer: (containerId: string) => HTMLElement | null;
        detectType: (card: Card) => string;
        handlers: HandlerRegistry;
        containerIds: string[];
    };
    childState?: {
        isLoggedIn: () => boolean;
    };
    childApi?: {
        getFeedback: (category: string, question: string, answer: string, userAnswer: string, isCorrect: boolean) => Promise<string>;
    };
    childUI?: {
        recordTrial: (question: Card, userAnswer: string, isCorrect: boolean) => void;
    };
}

// Note: Global SpeechGame declaration is in types/global.d.ts
