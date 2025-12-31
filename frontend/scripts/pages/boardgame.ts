/**
 * Winter Board Game - Speech Therapy AI
 * Main Game Logic (Refactored to use SpeechGame modules)
 * Card data is loaded from boardgame-data.js
 */

// ==================== IMPORTS ====================
import { getRandomCard, categoryHasCards, resetCardIndex } from '../data/boardgame-data';

// ==================== LEGACY ALIASES (for backward compatibility) ====================
// These provide shortcuts to module functions until full migration is complete
const API_BASE = '/api';

// ==================== INITIALIZATION ====================
export async function init() {
    try {
        console.log('[Init] Starting initialization...');

        // Initialize modules
        console.log('[Init] Initializing DOM...');
        SpeechGame.dom.init();
        console.log('[Init] Initializing audio...');
        SpeechGame.audio.init();

        // Show loading progress
        SpeechGame.ui.updateLoadingProgress(10);

        // Generate game board
        console.log('[Init] Generating board...');
        SpeechGame.board.generate();
        SpeechGame.ui.updateLoadingProgress(30);

        // Populate targets
        console.log('[Init] Populating targets...');
        populateTargets('articulation');
        SpeechGame.ui.updateLoadingProgress(50);

        // Setup event listeners
        console.log('[Init] Setting up event listeners...');
        setupEventListeners();
        SpeechGame.ui.updateLoadingProgress(70);

        // Hide modals
        SpeechGame.ui.hideModals();
        SpeechGame.ui.updateLoadingProgress(90);

        // Preload sounds
        console.log('[Init] Preloading sounds...');
        await SpeechGame.audio.preload();
        SpeechGame.ui.updateLoadingProgress(100);

        // Hide loading screen after a brief delay
        console.log('[Init] Hiding loading screen...');
        setTimeout(() => {
            SpeechGame.ui.hideLoadingScreen();
            console.log('[Init] Initialization complete!');
        }, 500);
    } catch (error) {
        console.error('[Init] Error during initialization:', error);
        // Still try to hide loading screen so the user isn't stuck
        SpeechGame.ui?.hideLoadingScreen?.();
    }
}

// ==================== TARGETS DATA ====================
export const targetsData = {
    articulation: [
        'VC Mixed', 'CV Mixed', 'CVC Mixed', 'CVCV Mixed', 'CVCC Mixed', 'CCVC Mixed', 'Multisyllabic Words Mixed',
        '---Phonology',
        'Stopping', 'Pre-Vocalic Voicing', 'Gliding', 'Fronting', 'Final Consonant Deletion', 'Cluster Reduction',
        '---B Sound',
        'B Initial 1 CVC Word', 'B Initial 1 Simple Word, Phrase, Sentence', 'B Initial 5 More Complex Words', 'B Initial 5 More Complex Sentences',
        'B Medial 1 Simple Word, Phrase, Sentence', 'B Medial 5 More Complex Words', 'B Medial 5 More Complex Sentences',
        'B Final 1 CVC Word', 'B Final 1 Simple Word, Phrase, Sentence', 'B Final 5 More Complex Words', 'B Final 5 More Complex Sentences',
        '---CH Sound',
        'Ch Initial 1 CVC Word', 'Ch Initial 1 Simple Word, Phrase, Sentence', 'Ch Initial 5 More Complex Words', 'Ch Initial 5 More Complex Sentences',
        'Ch Medial 1 Simple Word, Phrase, Sentence', 'Ch Medial 5 More Complex Words', 'Ch Medial 5 More Complex Sentences',
        'Ch Final 1 Simple Word, Phrase, Sentence', 'Ch Final 5 More Complex Words', 'Ch Final 5 More Complex Sentences',
        '---D Sound',
        'D Initial 1 CVC Word', 'D Initial 1 Simple Word, Phrase, Sentence', 'D Initial 5 More Complex Words', 'D Initial 5 More Complex Sentences',
        'D Medial 1 Simple Word, Phrase, Sentence', 'D Medial 5 More Complex Words', 'D Medial 5 More Complex Sentences',
        'D Final 1 CVC Word', 'D Final 1 Simple Word, Phrase, Sentence', 'D Final 5 More Complex Words', 'D Final 5 More Complex Sentences',
        '---F Sound',
        'F Initial 1 CVC Word', 'F Initial 1 Simple Word, Phrase, Sentence', 'F Initial 5 More Complex Words', 'F Initial 5 More Complex Sentences',
        'F Medial 1 Simple Word, Phrase, Sentence', 'F Medial 5 More Complex Words', 'F Medial 5 More Complex Sentences',
        'F Final 1 CVC Word', 'F Final 1 Simple Word, Phrase, Sentence', 'F Final 5 More Complex Words', 'F Final 5 More Complex Sentences',
        '---G Sound',
        'G Initial 1 CVC Word', 'G Initial 1 Simple Word, Phrase, Sentence', 'G Initial 5 More Complex Words', 'G Initial 5 More Complex Sentences',
        'G Medial 1 Simple Word, Phrase, Sentence', 'G Medial 5 More Complex Words', 'G Medial 5 More Complex Sentences',
        'G Final 1 CVC Word', 'G Final 1 Simple Word, Phrase, Sentence', 'G Final 5 More Complex Words', 'G Final 5 More Complex Sentences',
        '---H Sound',
        'H Initial 1 CVC Word', 'H Initial 1 Simple Word, Phrase, Sentence', 'H Initial 5 More Complex Words', 'H Initial 5 More Complex Sentences',
        'H Medial 1 Simple Word, Phrase, Sentence', 'H Medial 5 More Complex Words', 'H Medial 5 More Complex Sentences',
        '---J Sound /ʤ/',
        'J Initial 1 CVC Word', 'J Initial 1 Simple Word, Phrase, Sentence', 'J Initial 5 More Complex Words', 'J Initial 5 More Complex Sentences',
        'J Medial 1 Simple Word, Phrase, Sentence', 'J Medial 5 More Complex Words', 'J Medial 5 More Complex Sentences',
        'J Final 1 CVC Word', 'J Final 1 Simple Word, Phrase, Sentence', 'J Final 5 More Complex Words', 'J Final 5 More Complex Sentences',
        '---K Sound',
        'K Initial 1 CVC Word', 'K Initial 1 Simple Word, Phrase, Sentence', 'K Initial 5 More Complex Words', 'K Initial 5 More Complex Sentences',
        'K Medial 1 Simple Word, Phrase, Sentence', 'K Medial 5 More Complex Words', 'K Medial 5 More Complex Sentences',
        'K Final 1 CVC Word', 'K Final 1 Simple Word, Phrase, Sentence', 'K Final 5 More Complex Words', 'K Final 5 More Complex Sentences',
        '---L Sound',
        'L Initial 1 CVC Word', 'L Initial 1 Simple Word, Phrase, Sentence', 'L Initial 5 More Complex Words', 'L Initial 5 More Complex Sentences',
        'L Medial 1 Simple Word, Phrase, Sentence', 'L Medial 5 More Complex Words', 'L Medial 5 More Complex Sentences',
        'L Final 1 CVC Word', 'L Final 1 Simple Word, Phrase, Sentence', 'L Final 5 More Complex Words', 'L Final 5 More Complex Sentences',
        'L In Paragraphs All Word Positions', 'L Blends 5 More Complex Words', 'L Blends In Paragraphs',
        '---M Sound',
        'M Initial 1 CVC Word', 'M Initial 1 Simple Word, Phrase, Sentence', 'M Initial 5 More Complex Words', 'M Initial 5 More Complex Sentences',
        'M Medial 1 Simple Word, Phrase, Sentence', 'M Medial 5 More Complex Words', 'M Medial 5 More Complex Sentences',
        'M Final 1 CVC Word', 'M Final 1 Simple Word, Phrase, Sentence', 'M Final 5 More Complex Words', 'M Final 5 More Complex Sentences',
        '---N Sound',
        'N Initial 1 CVC Word', 'N Initial 1 Simple Word, Phrase, Sentence', 'N Initial 5 More Complex Words', 'N Initial 5 More Complex Sentences',
        'N Medial 1 Simple Word, Phrase, Sentence', 'N Medial 5 More Complex Words', 'N Medial 5 More Complex Sentences',
        'N Final 1 CVC Word', 'N Final 1 Simple Word, Phrase, Sentence', 'N Final 5 More Complex Words', 'N Final 5 More Complex Sentences',
        '---NG Sound',
        'Ng Medial 1 Simple Word, Phrase, Sentence', 'Ng Final 1 Simple Word, Phrase, Sentence',
        '---P Sound',
        'P Initial 1 CVC Word', 'P Initial 1 Simple Word, Phrase, Sentence', 'P Initial 5 More Complex Words', 'P Initial 5 More Complex Sentences',
        'P Medial 1 Simple Word, Phrase, Sentence', 'P Medial 5 More Complex Words', 'P Medial 5 More Complex Sentences',
        'P Final 1 CVC Word', 'P Final 1 Simple Word, Phrase, Sentence', 'P Final 5 More Complex Words', 'P Final 5 More Complex Sentences',
        '---R Sound',
        'R Initial 1 CVC Word', 'R Initial 1 Simple Word, Phrase, Sentence', 'R Initial 5 More Complex Words', 'R Initial 5 More Complex Sentences',
        'R Medial 1 Simple Word, Phrase, Sentence', 'R Medial 5 More Complex Words', 'R Medial 5 More Complex Sentences',
        'R Final 1 CVC Word', 'R Final 1 Simple Word, Phrase, Sentence', 'R Final 5 More Complex Words', 'R Final 5 More Complex Sentences',
        'R In Paragraphs All Word Positions',
        'Vocalic R Air Words', 'Vocalic R Ar Words', 'Vocalic R Ear Words', 'Vocalic R Er Words', 'Vocalic R Ire Words', 'Vocalic R Or Words',
        'R Blends 5 More Complex Words', 'R Blends In Paragraphs',
        '---S Sound',
        'S Initial 1 CVC Word', 'S Initial 1 Simple Word, Phrase, Sentence', 'S Initial 5 More Complex Words', 'S Initial 5 More Complex Sentences',
        'S Medial 1 Simple Word, Phrase, Sentence', 'S Medial 5 More Complex Words', 'S Medial 5 More Complex Sentences',
        'S Final 1 CVC Word', 'S Final 1 Simple Word, Phrase, Sentence', 'S Final 5 More Complex Words', 'S Final 5 More Complex Sentences',
        'S In Paragraphs All Word Positions', 'S Blends 5 More Complex Words', 'S Blends 1 Simple Word, Phrase, Sentence', 'S Blends In Paragraphs',
        '---SH Sound',
        'Sh Initial 1 CVC Word', 'Sh Initial 1 Simple Word, Phrase, Sentence', 'Sh Initial 5 More Complex Words', 'Sh Initial 5 More Complex Sentences',
        'Sh Medial 1 Simple Word, Phrase, Sentence', 'Sh Medial 5 More Complex Words', 'Sh Medial 5 More Complex Sentences',
        'Sh Final 1 CVC Word', 'Sh Final 1 Simple Word, Phrase, Sentence', 'Sh Final 5 More Complex Words', 'Sh Final 5 More Complex Sentences',
        '---T Sound',
        'T Initial 1 CVC Word', 'T Initial 1 Simple Word, Phrase, Sentence', 'T Initial 5 More Complex Words', 'T Initial 5 More Complex Sentences',
        'T Medial 1 Simple Word, Phrase, Sentence', 'T Medial 5 More Complex Words', 'T Medial 5 More Complex Sentences',
        'T Final 1 CVC Word', 'T Final 1 Simple Word, Phrase, Sentence', 'T Final 5 More Complex Words', 'T Final 5 More Complex Sentences',
        '---TH Voiced Sound',
        'Th Voiced Initial Words', 'Th Voiced Initial Sentences', 'Th Voiced Medial Words', 'Th Voiced Medial Sentences', 'Th Voiced In Paragraphs All Word Positions',
        '---TH Voiceless Sound',
        'Th Voiceless Initial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Initial Words', 'Th Voiceless Initial Sentences',
        'Th Voiceless Medial 1 Simple Word, Phrase, Sentence', 'Th Voiceless Medial Words', 'Th Voiceless Medial Sentences',
        'Th Voiceless Final 1 Simple Word, Phrase, Sentence', 'Th Voiceless Final Words', 'Th Voiceless Final Sentences',
        'Th Voiceless In Paragraphs All Word Positions',
        '---V Sound',
        'V Initial 1 CVC Word', 'V Initial 1 Simple Word, Phrase, Sentence', 'V Initial 5 More Complex Words', 'V Initial 5 More Complex Sentences',
        'V Medial 1 Simple Word, Phrase, Sentence', 'V Medial 5 More Complex Words', 'V Medial 5 More Complex Sentences',
        'V Final 1 CVC Word', 'V Final 1 Simple Word, Phrase, Sentence', 'V Final 5 More Complex Words', 'V Final 5 More Complex Sentences',
        '---W Sound',
        'W Initial 1 CVC Word', 'W Initial 1 Simple Word, Phrase, Sentence', 'W Initial 5 More Complex Words', 'W Initial 5 More Complex Sentences',
        'W Medial 1 Simple Word, Phrase, Sentence', 'W Medial 5 More Complex Words', 'W Medial 5 More Complex Sentences',
        '---Y Sound /j/',
        'Y Initial 1 Simple Word, Phrase, Sentence', 'Y Initial 5 More Complex Words', 'Y Initial 5 More Complex Sentences',
        'Y Medial 1 Simple Word, Phrase, Sentence', 'Y Medial 5 More Complex Words', 'Y Medial 5 More Complex Sentences',
        '---Z Sound',
        'Z Initial 1 CVC Word', 'Z Initial 5 More Complex Words', 'Z Initial 5 More Complex Sentences',
        'Z Medial 5 More Complex Words', 'Z Medial 5 More Complex Sentences',
        'Z Final 1 CVC Word', 'Z Final 5 More Complex Words', 'Z Final 5 More Complex Sentences',
        '---Consonant Clusters',
        'Consonant Clusters - Scr', 'Consonant Clusters - Shr', 'Consonant Clusters - Skw', 'Consonant Clusters - Spl',
        'Consonant Clusters - Spr', 'Consonant Clusters - Str', 'Consonant Clusters - Thr',
        '---Vowels',
        'Vowels - Long Vowel A Type In Answer', 'Vowels - Long Vowel E Type In Answer', 'Vowels - Long Vowel I Type In Answer',
        'Vowels - Long Vowel O Type In Answer', 'Vowels - Long Vowel U Type In Answer',
        'Vowels - Short A Type In Answer', 'Vowels - Short E Type In Answer', 'Vowels - Short I Type In Answer',
        'Vowels - Short O Type In Answer', 'Vowels - Short U Type In Answer'
    ],
    language: [
        'Adjectives - Opposites', 'Adverbs', 'Analogies Elementary', 'Analogies High', 'Analogies Middle',
        'Antonym Name One - Middle', 'Antonyms', 'Antonyms Level 2',
        'Basic Spatial Concepts Fill In Word Or Phrase', 'Basic Temporal Concepts - Before And After',
        'Basic Temporal Concepts Pick First - Second-Third', 'Before - After',
        'Building Sentences Level 1 - Elementary', 'Building Sentences Level 2 - Elementary',
        'Categories - Identifying Members Of A Category', 'Categories - Label The Category',
        'Common Items Around The House', 'Comparatives - Superlatives', 'Compare And Contrast (Same And Different)',
        'Conditional Following Directions', 'Context Clues - Define Word In Paragraph',
        'Context Clues Define Word In Sentence', 'Context Clues In Paragraphs - Fill In The Blank',
        'Context Clues In Short Paragraphs', 'Coordinating Conjuctions', 'Describe The Scene Create One Sentence',
        'Describing', 'Describing - More Advanced', 'Descriptive Words - Opposites', 'Do Vs Does',
        'Expanding Sentences - Images With Who What Where', 'Figurative Language - Identify The Meaning',
        'First Next Then Last',
        'Following 1-Step Directions', 'Following 2-Step Directions',
        'Following Directions - Conditional', 'Following Multistep Directions Level 2',
        'Function Labeling', 'Future Tense', 'Has Vs Have', 'Homophones', 'How To', 'Identify The Meaning',
        'Identify What Is Missing', 'Identifying Parts Of A Whole', 'Idioms', 'Inferencing Based On Images',
        'Inferencing Level 1', 'Inferencing Level 2', 'Irregular Past Tense Verbs', 'Irregular Plurals',
        'Is Vs Are', 'Metaphors - Identify The Meaning', 'Metaphors - Identify The Meaning - Multiple Choice',
        'Metaphors Elementary', 'Metaphors Middle', 'Multiple Meaning Words', 'Naming And Categorizing',
        'Naming Community Helpers', 'Negation', 'Negation Animals', 'Negation Clothing', 'Negation Colors',
        'Negation Food', 'Negation Vehicles', 'Noun Naming', 'Nouns Set Of Three',
        'Past Tense Verbs Irregular', 'Past Tense Verbs Regular', 'Personal Hygiene Items',
        'Possessives Common Nouns', 'Prepositions', 'Prepositions Simple Images',
        'Problem Solving', 'Problem Solving Based On Images', 'Problem Solving Part 2',
        'Pronouns - His Hers Him Her Their', 'Pronouns (He She They)', 'Pronouns Mixed',
        'Questions For You', 'Reflexive Pronouns', 'Regular Plurals', 'Rhyming',
        'Rhyming - Match The Words That Rhyme', 'Safety Signs', 'Semantic Relationships',
        'Sequencing Images - Set Of 3 Or 4', 'Short Stories - High', 'Short Stories Level 1',
        'Short Stories Level 2', 'Short Stories Sequencing', 'Sight Words', 'Similes',
        'Similes - Identify The Meaning', 'Similes - Identify The Meaning - Multiple Choice',
        'Subordinating Conjunctions', 'Synonym-Name One - Middle', 'Synonym Name One - Elementary',
        'Synonyms', 'Synonyms Level 2', 'Third Person Singular', 'Understanding Quantitative Concepts',
        'Verbs - Basic Actions', 'Verbs - Select From Three', 'Vocabulary - Animals',
        'Vocabulary - Basic Vocab', 'Vocabulary - Beach', 'Vocabulary - Clothing', 'Vocabulary - Color',
        'Vocabulary - Core Vocab', 'Vocabulary - Food', 'Vocabulary - Food Real Images',
        'Vocabulary - Halloween', 'Vocabulary - House', 'Vocabulary - Musical Instruments',
        'Vocabulary - Parts Of The Body', 'Vocabulary - Parts Of The Body Preschool',
        'Vocabulary - Places In A Town Or City', 'Vocabulary - School', 'Vocabulary - Seasonal Fall',
        'Vocabulary - Seasonal Spring', 'Vocabulary - Seasonal Winter', 'Vocabulary - Shapes',
        'Vocabulary - Sports', 'Vocabulary - Vehicles', 'Vocabulary - Vehicles Preschool',
        'Vocabulary General', 'Was Vs Were', 'Wh- Questions Mixed', 'Wh- Questions Short Stories',
        'Wh- Questions (What)', 'Wh- Questions (When)', 'Wh- Questions (Where)', 'Wh- Questions (Who)',
        'Wh- Questions (Why)', 'Wh Questions With Picture Choices', 'What Will Happen',
        'What Will Happen - Predictions', 'Which One Does Not Belong', 'Who Questions - Four Quadrants', 'Yes No Questions'
    ]
};

// Expose targetsData globally for PIPER goal filtering
window.targetsData = targetsData;

export function populateTargets(category) {
    const dom = SpeechGame.dom;
    dom.targetList.innerHTML = '';
    const targets = targetsData[category] || [];

    targets.forEach(target => {
        if (target.startsWith('---')) {
            const header = document.createElement('p');
            header.className = 'target-section-header';
            header.textContent = target.substring(3);
            dom.targetList.appendChild(header);
            return;
        }

        const item = document.createElement('div');
        item.className = 'target-item';
        const hasCards = categoryHasCards(target);
        if (!hasCards) item.classList.add('no-cards');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'target-checkbox';
        checkbox.id = target.replace(/\s+/g, '-').toLowerCase();
        checkbox.checked = false;
        if (!hasCards) checkbox.disabled = true;

        const label = document.createElement('label');
        label.className = 'target-label';
        label.htmlFor = checkbox.id;
        label.textContent = target;

        item.appendChild(checkbox);
        item.appendChild(label);
        dom.targetList.appendChild(item);
    });
}

// Expose populateTargets globally for PIPER goal filtering
window.populateTargets = populateTargets;

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;

    // Play button - shows target selection modal
    dom.playButton.addEventListener('click', () => {
        dom.playOverlay.classList.add('hidden');
        dom.targetModal.classList.remove('hidden');

        // Check if child has IEP goals
        const childState = SpeechGame.childState;
        const hasIEPGoals = childState && childState.isLoggedIn() && childState.hasGoals();

        const goalBasedView = document.getElementById('goalBasedView');
        const manualSelectView = document.getElementById('manualSelectView');

        if (hasIEPGoals) {
            // Child HAS IEP goals - show AI-selected view
            goalBasedView.style.display = 'block';
            manualSelectView.style.display = 'none';
            displaySessionGoals();
        } else {
            // Child has NO IEP goals - show manual selection view
            goalBasedView.style.display = 'none';
            manualSelectView.style.display = 'block';
            speakFeedback('Hey friend! Pick what you want to practice today!');
            // Populate targets for default category
            populateTargets('language');
        }
    });

    // Theme selection (child can choose visual theme: snowflake or bunny)
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', (e) => {
            // Remove selected from all options
            document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
            // Add selected to clicked option
            const themeOption = e.target.closest('.theme-option');
            if (themeOption) {
                themeOption.classList.add('selected');
                state.selectedTheme = themeOption.dataset.theme;
                SpeechGame.audio.play('click');
            }
        });
    });

    // Category tabs (for manual selection when child has no IEP goals)
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            populateTargets(e.target.dataset.category);
        });
    });

    // Next button (start game)
    dom.nextButton.addEventListener('click', startGame);

    // Spinner
    dom.spinnerCenter.addEventListener('click', () => SpeechGame.board.spin());
    dom.spinBtn.addEventListener('click', () => SpeechGame.board.spin());

    // Card modal
    dom.doneButton.addEventListener('click', checkAnswer);
    dom.cardClose.addEventListener('click', closeCard);
    dom.answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkAnswer();
    });

    // Multiple choice buttons
    dom.choiceButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.choiceButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedChoice = btn.querySelector('.choice-text').textContent;
        });
    });

    // Conditional Following Directions buttons
    if (dom.conditionalDidIt) {
        dom.conditionalDidIt.addEventListener('click', () => handleConditionalAnswer(true));
    }
    if (dom.conditionalDidntDo) {
        dom.conditionalDidntDo.addEventListener('click', () => handleConditionalAnswer(false));
    }

    // Context Clues choice buttons
    if (dom.contextCluesChoices) {
        dom.contextCluesChoices.querySelectorAll('.context-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => handleContextCluesAnswer(btn));
        });
    }

    // Do Vs Does choice buttons
    const doDoesChoiceA = document.getElementById('doDoesChoiceA');
    const doDoesChoiceB = document.getElementById('doDoesChoiceB');
    if (doDoesChoiceA) doDoesChoiceA.addEventListener('click', () => handleDoVsDoesAnswer('do'));
    if (doDoesChoiceB) doDoesChoiceB.addEventListener('click', () => handleDoVsDoesAnswer('does'));

    // Has Vs Have choice buttons
    const hasHaveChoiceA = document.getElementById('hasHaveChoiceA');
    const hasHaveChoiceB = document.getElementById('hasHaveChoiceB');
    if (hasHaveChoiceA) hasHaveChoiceA.addEventListener('click', () => handleHasVsHaveAnswer('has'));
    if (hasHaveChoiceB) hasHaveChoiceB.addEventListener('click', () => handleHasVsHaveAnswer('have'));

    // Homophones check button
    const homophonesCheckBtn = document.getElementById('homophonesCheckBtn');
    if (homophonesCheckBtn) {
        homophonesCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['homophones']) {
                SpeechGame.cardHandlers.handlers['homophones'].checkAnswer();
            }
        });
    }

    // How To check button
    const howToCheckBtn = document.getElementById('howToCheckBtn');
    if (howToCheckBtn) {
        howToCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['how-to']) {
                SpeechGame.cardHandlers.handlers['how-to'].checkAnswer();
            }
        });
    }

    // Identify What Is Missing check button
    const identifyMissingCheckBtn = document.getElementById('identifyMissingCheckBtn');
    if (identifyMissingCheckBtn) {
        identifyMissingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['identify-missing']) {
                SpeechGame.cardHandlers.handlers['identify-missing'].checkAnswer();
            }
        });
    }

    // Identifying Parts of a Whole check button
    const identifyingPartsCheckBtn = document.getElementById('identifyingPartsCheckBtn');
    if (identifyingPartsCheckBtn) {
        identifyingPartsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['identifying-parts']) {
                SpeechGame.cardHandlers.handlers['identifying-parts'].checkAnswer();
            }
        });
    }

    // Idioms check button
    const idiomsCheckBtn = document.getElementById('idiomsCheckBtn');
    if (idiomsCheckBtn) {
        idiomsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['idioms']) {
                SpeechGame.cardHandlers.handlers['idioms'].checkAnswer();
            }
        });
    }

    // Inferencing check button
    const inferencingCheckBtn = document.getElementById('inferencingCheckBtn');
    if (inferencingCheckBtn) {
        inferencingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['inferencing']) {
                SpeechGame.cardHandlers.handlers['inferencing'].checkAnswer();
            }
        });
    }

    // Inferencing input enter key
    const inferencingInput = document.getElementById('inferencingInput');
    if (inferencingInput) {
        inferencingInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['inferencing']) {
                SpeechGame.cardHandlers.handlers['inferencing'].checkAnswer();
            }
        });
    }

    // Inferencing Level 1 check button
    const inferencingL1CheckBtn = document.getElementById('inferencingL1CheckBtn');
    if (inferencingL1CheckBtn) {
        inferencingL1CheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['inferencing-level1']) {
                SpeechGame.cardHandlers.handlers['inferencing-level1'].checkAnswer();
            }
        });
    }

    // Inferencing Level 1 input enter key
    const inferencingL1Input = document.getElementById('inferencingL1Input');
    if (inferencingL1Input) {
        inferencingL1Input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['inferencing-level1']) {
                SpeechGame.cardHandlers.handlers['inferencing-level1'].checkAnswer();
            }
        });
    }

    // Inferencing Level 2 check button
    const inferencingL2CheckBtn = document.getElementById('inferencingL2CheckBtn');
    if (inferencingL2CheckBtn) {
        inferencingL2CheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['inferencing-level2']) {
                SpeechGame.cardHandlers.handlers['inferencing-level2'].checkAnswer();
            }
        });
    }

    // Inferencing Level 2 input enter key
    const inferencingL2Input = document.getElementById('inferencingL2Input');
    if (inferencingL2Input) {
        inferencingL2Input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['inferencing-level2']) {
                SpeechGame.cardHandlers.handlers['inferencing-level2'].checkAnswer();
            }
        });
    }

    // Irregular Plurals check button
    const irregularPluralCheckBtn = document.getElementById('irregularPluralCheckBtn');
    if (irregularPluralCheckBtn) {
        irregularPluralCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['irregular-plurals']) {
                SpeechGame.cardHandlers.handlers['irregular-plurals'].checkAnswer();
            }
        });
    }

    // Irregular Plurals input enter key
    const irregularPluralInput = document.getElementById('irregularPluralInput');
    if (irregularPluralInput) {
        irregularPluralInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['irregular-plurals']) {
                SpeechGame.cardHandlers.handlers['irregular-plurals'].checkAnswer();
            }
        });
    }

    // Metaphors check button
    const metaphorsCheckBtn = document.getElementById('metaphorsCheckBtn');
    if (metaphorsCheckBtn) {
        metaphorsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['metaphors']) {
                SpeechGame.cardHandlers.handlers['metaphors'].checkAnswer();
            }
        });
    }

    // Metaphors input enter key (Ctrl+Enter for textarea)
    const metaphorsInput = document.getElementById('metaphorsInput');
    if (metaphorsInput) {
        metaphorsInput.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' && e.ctrlKey) && SpeechGame.cardHandlers.handlers['metaphors']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['metaphors'].checkAnswer();
            }
        });
    }

    // Metaphors Elementary check button
    const metaphorsElementaryCheckBtn = document.getElementById('metaphorsElementaryCheckBtn');
    if (metaphorsElementaryCheckBtn) {
        metaphorsElementaryCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['metaphors-elementary']) {
                SpeechGame.cardHandlers.handlers['metaphors-elementary'].checkAnswer();
            }
        });
    }

    // Metaphors Elementary input enter key
    const metaphorsElementaryInput = document.getElementById('metaphorsElementaryInput');
    if (metaphorsElementaryInput) {
        metaphorsElementaryInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['metaphors-elementary']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['metaphors-elementary'].checkAnswer();
            }
        });
    }

    // Metaphors Middle check button
    const metaphorsMiddleCheckBtn = document.getElementById('metaphorsMiddleCheckBtn');
    if (metaphorsMiddleCheckBtn) {
        metaphorsMiddleCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['metaphors-middle']) {
                SpeechGame.cardHandlers.handlers['metaphors-middle'].checkAnswer();
            }
        });
    }

    // Metaphors Middle input enter key
    const metaphorsMiddleInput = document.getElementById('metaphorsMiddleInput');
    if (metaphorsMiddleInput) {
        metaphorsMiddleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['metaphors-middle']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['metaphors-middle'].checkAnswer();
            }
        });
    }

    // Multiple Meaning Words check button
    const multipleMeaningCheckBtn = document.getElementById('multipleMeaningCheckBtn');
    if (multipleMeaningCheckBtn) {
        multipleMeaningCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['multiple-meaning']) {
                SpeechGame.cardHandlers.handlers['multiple-meaning'].checkAnswer();
            }
        });
    }

    // Multiple Meaning Words input2 enter key (submit on Enter from second input)
    const multipleMeaningInput2 = document.getElementById('multipleMeaningInput2');
    if (multipleMeaningInput2) {
        multipleMeaningInput2.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['multiple-meaning']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['multiple-meaning'].checkAnswer();
            }
        });
    }

    // Naming And Categorizing check button
    const namingCategorizingCheckBtn = document.getElementById('namingCategorizingCheckBtn');
    if (namingCategorizingCheckBtn) {
        namingCategorizingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['naming-categorizing']) {
                SpeechGame.cardHandlers.handlers['naming-categorizing'].checkAnswer();
            }
        });
    }

    // Naming And Categorizing category input enter key (submit on Enter from category input)
    const namingCategorizingCategory = document.getElementById('namingCategorizingCategory');
    if (namingCategorizingCategory) {
        namingCategorizingCategory.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['naming-categorizing']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['naming-categorizing'].checkAnswer();
            }
        });
    }

    // Community Helpers check button
    const communityHelpersCheckBtn = document.getElementById('communityHelpersCheckBtn');
    if (communityHelpersCheckBtn) {
        communityHelpersCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['community-helpers']) {
                SpeechGame.cardHandlers.handlers['community-helpers'].checkAnswer();
            }
        });
    }

    // Community Helpers input enter key
    const communityHelpersInput = document.getElementById('communityHelpersInput');
    if (communityHelpersInput) {
        communityHelpersInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['community-helpers']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['community-helpers'].checkAnswer();
            }
        });
    }

    // Noun Naming check button
    const nounNamingCheckBtn = document.getElementById('nounNamingCheckBtn');
    if (nounNamingCheckBtn) {
        nounNamingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['noun-naming']) {
                SpeechGame.cardHandlers.handlers['noun-naming'].checkAnswer();
            }
        });
    }

    // Noun Naming input enter key
    const nounNamingInput = document.getElementById('nounNamingInput');
    if (nounNamingInput) {
        nounNamingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['noun-naming']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['noun-naming'].checkAnswer();
            }
        });
    }

    // Prepositions check button
    const prepositionsCheckBtn = document.getElementById('prepositionsCheckBtn');
    if (prepositionsCheckBtn) {
        prepositionsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['prepositions']) {
                SpeechGame.cardHandlers.handlers['prepositions'].checkAnswer();
            }
        });
    }

    // Prepositions input enter key
    const prepositionsInput = document.getElementById('prepositionsInput');
    if (prepositionsInput) {
        prepositionsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['prepositions']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['prepositions'].checkAnswer();
            }
        });
    }

    // Problem Solving check button
    const problemSolvingCheckBtn = document.getElementById('problemSolvingCheckBtn');
    if (problemSolvingCheckBtn) {
        problemSolvingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['problem-solving']) {
                SpeechGame.cardHandlers.handlers['problem-solving'].checkAnswer();
            }
        });
    }

    // Problem Solving textarea Ctrl+Enter key (since Enter creates newlines)
    const problemSolvingTextarea = document.getElementById('problemSolvingTextarea');
    if (problemSolvingTextarea) {
        problemSolvingTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && SpeechGame.cardHandlers.handlers['problem-solving']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['problem-solving'].checkAnswer();
            }
        });
    }

    // Problem Solving Images check button
    const problemSolvingImagesCheckBtn = document.getElementById('problemSolvingImagesCheckBtn');
    if (problemSolvingImagesCheckBtn) {
        problemSolvingImagesCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['problem-solving-images']) {
                SpeechGame.cardHandlers.handlers['problem-solving-images'].checkAnswer();
            }
        });
    }

    // Problem Solving Images textarea Ctrl+Enter key (since Enter creates newlines)
    const problemSolvingImagesTextarea = document.getElementById('problemSolvingImagesTextarea');
    if (problemSolvingImagesTextarea) {
        problemSolvingImagesTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey && SpeechGame.cardHandlers.handlers['problem-solving-images']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['problem-solving-images'].checkAnswer();
            }
        });
    }

    // Pronouns check button
    const pronounsCheckBtn = document.getElementById('pronounsCheckBtn');
    if (pronounsCheckBtn) {
        pronounsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['pronouns']) {
                SpeechGame.cardHandlers.handlers['pronouns'].checkAnswer();
            }
        });
    }

    // Pronouns input Enter key
    const pronounsInput = document.getElementById('pronounsInput');
    if (pronounsInput) {
        pronounsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['pronouns']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['pronouns'].checkAnswer();
            }
        });
    }

    // Questions For You submit button
    const questionsForYouSubmitBtn = document.getElementById('questionsForYouSubmitBtn');
    if (questionsForYouSubmitBtn) {
        questionsForYouSubmitBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['questions-for-you']) {
                SpeechGame.cardHandlers.handlers['questions-for-you'].checkAnswer();
            }
        });
    }

    // Rhyming Fill In check button
    const rhymingCheckBtn = document.getElementById('rhymingCheckBtn');
    if (rhymingCheckBtn) {
        rhymingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['rhyming-fill-in']) {
                SpeechGame.cardHandlers.handlers['rhyming-fill-in'].checkAnswer();
            }
        });
    }

    // Rhyming Fill In input Enter key
    const rhymingInput = document.getElementById('rhymingInput');
    if (rhymingInput) {
        rhymingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['rhyming-fill-in']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['rhyming-fill-in'].checkAnswer();
            }
        });
    }

    // Rhyming Match check button
    const rhymingMatchCheckBtn = document.getElementById('rhymingMatchCheckBtn');
    if (rhymingMatchCheckBtn) {
        rhymingMatchCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['rhyming-match']) {
                SpeechGame.cardHandlers.handlers['rhyming-match'].checkAnswer();
            }
        });
    }

    // Safety Signs check button
    const safetySignsCheckBtn = document.getElementById('safetySignsCheckBtn');
    if (safetySignsCheckBtn) {
        safetySignsCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['safety-signs']) {
                SpeechGame.cardHandlers.handlers['safety-signs'].checkAnswer();
            }
        });
    }

    // Safety Signs input Enter key
    const safetySignsInput = document.getElementById('safetySignsInput');
    if (safetySignsInput) {
        safetySignsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && SpeechGame.cardHandlers.handlers['safety-signs']) {
                e.preventDefault();
                SpeechGame.cardHandlers.handlers['safety-signs'].checkAnswer();
            }
        });
    }

    // Sequencing Images check button
    const sequencingCheckBtn = document.getElementById('sequencingCheckBtn');
    if (sequencingCheckBtn) {
        sequencingCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['sequencing-images']) {
                SpeechGame.cardHandlers.handlers['sequencing-images'].checkAnswer();
            }
        });
    }

    // Short Stories High check button
    const sshCheckBtn = document.getElementById('sshCheckBtn');
    if (sshCheckBtn) {
        sshCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['short-stories-high']) {
                SpeechGame.cardHandlers.handlers['short-stories-high'].checkAnswer();
            }
        });
    }

    // Short Stories High next question button
    const sshNextBtn = document.getElementById('sshNextBtn');
    if (sshNextBtn) {
        sshNextBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['short-stories-high']) {
                SpeechGame.cardHandlers.handlers['short-stories-high'].nextQuestion();
            }
        });
    }

    // Short Stories Sequencing check button
    const sssCheckBtn = document.getElementById('sssCheckBtn');
    if (sssCheckBtn) {
        sssCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['short-stories-sequencing']) {
                SpeechGame.cardHandlers.handlers['short-stories-sequencing'].checkAnswer();
            }
        });
    }

    // Sight Words check button
    const swCheckBtn = document.getElementById('swCheckBtn');
    if (swCheckBtn) {
        swCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['sight-words']) {
                SpeechGame.cardHandlers.handlers['sight-words'].checkAnswer();
            }
        });
    }

    // Sight Words mic button
    const swMicBtn = document.getElementById('swMicBtn');
    if (swMicBtn) {
        swMicBtn.addEventListener('click', () => {
            startSightWordsVoiceRecording();
        });
    }

    // Similes check button
    const similesCheckBtn = document.getElementById('similesCheckBtn');
    if (similesCheckBtn) {
        similesCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['similes']) {
                SpeechGame.cardHandlers.handlers['similes'].checkAnswer();
            }
        });
    }

    // Similes next button
    const similesNextBtn = document.getElementById('similesNextBtn');
    if (similesNextBtn) {
        similesNextBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['similes']) {
                SpeechGame.cardHandlers.handlers['similes'].nextQuestion();
            }
        });
    }

    // Similes mic button
    const similesMicBtn = document.getElementById('similesMicBtn');
    if (similesMicBtn) {
        similesMicBtn.addEventListener('click', () => {
            startSimilesVoiceRecording();
        });
    }

    // Similes Identify check button
    const similesIdentifyCheckBtn = document.getElementById('similesIdentifyCheckBtn');
    if (similesIdentifyCheckBtn) {
        similesIdentifyCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['similes-identify']) {
                SpeechGame.cardHandlers.handlers['similes-identify'].checkAnswer();
            }
        });
    }

    // Similes Identify mic button
    const similesIdentifyMicBtn = document.getElementById('similesIdentifyMicBtn');
    if (similesIdentifyMicBtn) {
        similesIdentifyMicBtn.addEventListener('click', () => {
            startSimilesIdentifyVoiceRecording();
        });
    }

    // Subordinating Conjunctions check button
    const subconjCheckBtn = document.getElementById('subconjCheckBtn');
    if (subconjCheckBtn) {
        subconjCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['subordinating-conjunctions']) {
                SpeechGame.cardHandlers.handlers['subordinating-conjunctions'].checkIdentifyAnswer();
            }
        });
    }

    // Subordinating Conjunctions mic button
    const subconjMicBtn = document.getElementById('subconjMicBtn');
    if (subconjMicBtn) {
        subconjMicBtn.addEventListener('click', () => {
            startSubconjVoiceRecording();
        });
    }

    // Synonym Middle check button
    const synonymMiddleCheckBtn = document.getElementById('synonymMiddleCheckBtn');
    if (synonymMiddleCheckBtn) {
        synonymMiddleCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['synonym-middle']) {
                SpeechGame.cardHandlers.handlers['synonym-middle'].checkAnswer();
            }
        });
    }

    // Synonym Middle mic button
    const synonymMiddleMicBtn = document.getElementById('synonymMiddleMicBtn');
    if (synonymMiddleMicBtn) {
        synonymMiddleMicBtn.addEventListener('click', () => {
            startSynonymMiddleVoiceRecording();
        });
    }

    // Synonym Elementary check button
    const synonymElementaryCheckBtn = document.getElementById('synonymElementaryCheckBtn');
    if (synonymElementaryCheckBtn) {
        synonymElementaryCheckBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['synonym-elementary']) {
                SpeechGame.cardHandlers.handlers['synonym-elementary'].checkAnswer();
            }
        });
    }

    // Synonym Elementary mic button
    const synonymElementaryMicBtn = document.getElementById('synonymElementaryMicBtn');
    if (synonymElementaryMicBtn) {
        synonymElementaryMicBtn.addEventListener('click', () => {
            startSynonymElementaryVoiceRecording();
        });
    }

    // Sentence building clear button
    if (dom.clearSentenceBtn) {
        dom.clearSentenceBtn.addEventListener('click', () => {
            if (SpeechGame.cardHandlers.handlers['sentence-building']) {
                SpeechGame.cardHandlers.handlers['sentence-building'].clearSentence();
            }
        });
    }

    // Reset button - opens the reset modal (parental gate)
    dom.resetBtn.addEventListener('click', openResetModal);

    // Reset modal event listeners
    setupResetModalListeners();

    // Help button (re-show question)
    dom.helpBtn.addEventListener('click', reshowQuestionCard);

    // Play Again button (win screen)
    dom.playAgainBtn.addEventListener('click', performReset);

    // Character selection
    dom.playerCard.addEventListener('click', () => SpeechGame.ui.openCharacterModal());
    dom.characterDoneBtn.addEventListener('click', () => SpeechGame.ui.closeCharacterModal());

    // Character option clicks
    dom.characterGrid.addEventListener('click', (e) => {
        const option = e.target.closest('.character-option');
        if (option) {
            document.querySelectorAll('.character-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            SpeechGame.state.selectedCharacter = option.dataset.emoji;
            SpeechGame.audio.play('click');
        }
    });

    // Microphone button for voice recording
    dom.micButton.addEventListener('click', toggleVoiceRecording);
}

// ==================== GAME FUNCTIONS ====================
function startGame() {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;
    const childState = SpeechGame.childState;

    // Check if child is logged in and has IEP goals
    const hasIEPGoals = childState && childState.isLoggedIn() && childState.hasGoals();

    if (hasIEPGoals) {
        // Child HAS IEP goals - AI auto-selects from goals
        state.selectedTargets = getAutoSelectedTargets();

        if (state.selectedTargets.length === 0) {
            SpeechGame.ui.showNotification('No practice cards available!', '😕', 'warning', 2000);
            speakFeedback('Hmm, we need some practice cards set up first!');
            return;
        }
    } else {
        // Child has NO IEP goals - use manual checkbox selection
        const checkboxes = dom.targetList.querySelectorAll('.target-checkbox:checked');
        state.selectedTargets = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);

        if (state.selectedTargets.length === 0) {
            SpeechGame.ui.showNotification('Please select at least one target!', '☝️', 'warning', 2000);
            speakFeedback('Oops! Please pick at least one thing to practice!');
            return;
        }
    }

    // Apply selected visual theme
    applyGameTheme(state.selectedTheme || 'snowflake');

    dom.targetModal.classList.add('hidden');
    state.isPlaying = true;
    state.currentPosition = 0;
    state.score = 0;

    SpeechGame.ui.updateScoreDisplay();
    SpeechGame.board.positionToken();

    dom.gameControls.classList.remove('hidden');
    dom.scoreDisplay.classList.remove('hidden');

    speakFeedback('Awesome! Now give the wheel a big spin and lets go!', {
        cardType: 'instruction'
    });
}

/**
 * Display what the AI has selected for this session
 * Shows the child what they're working on and their support level
 */
function displaySessionGoals() {
    const goalTextEl = document.getElementById('sessionGoalText');
    const goalIconEl = document.getElementById('goalIcon');
    const goalCategoriesEl = document.getElementById('goalCategories');
    const promptLevelEl = document.getElementById('promptLevelDisplay');

    // Get AI-selected targets and info
    const targets = getAutoSelectedTargets();
    const childState = SpeechGame.childState;
    const child = childState?.child;
    const activeGoal = childState?.getActiveGoal?.();
    const promptLevel = childState?.getPromptLevel?.() || 2;

    // Get problem type for icon
    const problemType = child?.problem_type || 'language';
    const isArticulation = problemType === 'articulation';

    // Set icon based on therapy type
    goalIconEl.textContent = isArticulation ? '🗣️' : '📚';

    // Format what child is working on (limit to 3 for display)
    let workingOnText = '';
    if (targets.length > 0) {
        const displayTargets = targets.slice(0, 3);
        workingOnText = displayTargets.join(', ');
        if (targets.length > 3) {
            workingOnText += ` and ${targets.length - 3} more`;
        }
    } else {
        workingOnText = isArticulation ? 'speech sounds' : 'language skills';
    }

    // Get goal description if available
    const goalDesc = activeGoal?.goal_type || (isArticulation ? 'Articulation Practice' : 'Language Practice');

    // Update display elements
    goalTextEl.textContent = `Today we are working on ${goalDesc}!`;

    // Show categories (display first 4, then show total count if more)
    let categoriesHtml = targets.slice(0, 4).map(t =>
        `<span class="goal-category-tag">${t}</span>`
    ).join('');

    if (targets.length > 4) {
        categoriesHtml += `<span class="goal-category-tag more-tag">+${targets.length - 4} more</span>`;
    }

    goalCategoriesEl.innerHTML = categoriesHtml;
    console.log('Total categories available for game:', targets.length);

    // Show support level
    const levelLabels = {
        1: { label: 'Full Support', emoji: '🌟🌟🌟', desc: "I'll help you lots!" },
        2: { label: 'Some Support', emoji: '🌟🌟', desc: "I'll give you hints!" },
        3: { label: 'Little Support', emoji: '🌟', desc: "You've got this!" }
    };
    const level = levelLabels[promptLevel] || levelLabels[2];
    promptLevelEl.innerHTML = `
        <div class="support-level">
            <span class="support-emoji">${level.emoji}</span>
            <span class="support-text">${level.desc}</span>
        </div>
    `;

    // Speak to child - AI tells them what they're working on
    const childName = child?.first_name || 'friend';
    speakFeedback(`Hey ${childName}! Today we are working on ${goalDesc}. ${level.desc} Let's have fun!`);

    console.log('AI session goals:', { targets, promptLevel, goalDesc });
}

/**
 * AI-driven target selection: Get targets from IEP goals automatically
 * Child does NOT choose what to practice - AI/therapist determines this
 */
function getAutoSelectedTargets() {
    const childState = SpeechGame.childState;
    const problemType = childState?.child?.problem_type || 'language';

    // Check if child is logged in with IEP goals
    if (childState && childState.isLoggedIn()) {
        // If child has NO IEP goals assigned, show ALL available cards
        if (!childState.hasGoals()) {
            console.log('Child has no IEP goals - showing ALL available cards');
            return getAllAvailableTargets(problemType);
        }

        const allowedCategories = childState.getAllowedCategories();
        if (allowedCategories && allowedCategories.size > 0) {
            console.log('AI selecting deck from IEP goals:', Array.from(allowedCategories));
            return Array.from(allowedCategories);
        }

        // Has goals but none with categories - show all
        console.log('IEP goals have no mapped categories - showing ALL available cards');
        return getAllAvailableTargets(problemType);
    }

    // Fallback for therapist preview: get from any checked boxes
    const checkboxes = document.querySelectorAll('.target-checkbox:checked');
    if (checkboxes.length > 0) {
        return Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);
    }

    // Final fallback: Get all available categories for practice
    return getAllAvailableTargets(problemType);
}

/**
 * Get all available targets for a problem type
 * Used when child has no IEP goals or as fallback
 */
function getAllAvailableTargets(problemType) {
    const allTargets = [];
    const targetData = targetsData[problemType] || targetsData['language'] || [];

    console.log('getAllAvailableTargets - problemType:', problemType, '- targetData length:', targetData.length);

    targetData.forEach(target => {
        // Skip section headers
        if (target.startsWith('---')) return;

        // Check if category has cards - if categoryHasCards isn't available, include anyway
        const hasCards = typeof categoryHasCards === 'function' ? categoryHasCards(target) : true;
        if (hasCards) {
            allTargets.push(target);
        }
    });

    console.log('getAllAvailableTargets - returning', allTargets.length, 'categories with cards');
    return allTargets;
}

/**
 * Apply visual theme to the game (snowflake or bunny)
 */
function applyGameTheme(theme) {
    const gameContainer = document.querySelector('.game-container');
    const snowflakes = document.querySelector('.snowflakes');

    // Remove existing theme classes
    gameContainer?.classList.remove('theme-snowflake', 'theme-bunny');

    // Apply selected theme
    gameContainer?.classList.add(`theme-${theme}`);

    // Show/hide snowflakes based on theme
    if (snowflakes) {
        snowflakes.style.display = theme === 'snowflake' ? 'block' : 'none';
    }

    console.log('Applied game theme:', theme);
}

function showQuestionCard() {
    const state = SpeechGame.state;
    const card = getRandomCard(state.selectedTargets);

    if (!card) {
        SpeechGame.ui.showNotification('No cards available for selected targets!', '❌', 'warning', 2000);
        return;
    }

    // Use the modular card handler system
    SpeechGame.cardHandlers.show(card);

    // Show card modal (keep game controls visible)
    const dom = SpeechGame.dom;
    dom.cardModal.classList.remove('hidden');
    // TTS is handled by SpeechGame.cardHandlers.show()
}

// Expose showQuestionCard globally for board-logic.js
window.showQuestionCard = showQuestionCard;

function reshowQuestionCard() {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;

    if (state.currentQuestion) {
        SpeechGame.audio.play('click');
        dom.helpBtn.classList.add('hidden');
        SpeechGame.cardHandlers.show(state.currentQuestion);
        dom.cardModal.classList.remove('hidden');
    }
}

function closeCard() {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;

    stopVoiceRecording();
    SpeechGame.ui.hideRecordingStatus();
    SpeechGame.ui.hideAIFeedback();
    SpeechGame.vadState.isProcessing = false;

    dom.cardModal.classList.add('hidden');
    dom.gameControls.classList.remove('hidden');

    if (!state.questionAnswered) {
        dom.helpBtn.classList.remove('hidden');
        setTimeout(() => {
            SpeechGame.ui.showNotification('Oops! Press ❓ to see the question again!', '👆', 'warning', 3000);
            speakFeedback('Oops! Press the question mark button to see the question again!');
        }, 300);
    } else {
        dom.helpBtn.classList.add('hidden');
    }
}

function resetGame() {
    const dom = SpeechGame.dom;

    SpeechGame.audio.stopAmbient();
    resetCardIndex();
    SpeechGame.state.reset();

    dom.spinnerWheel.style.transition = 'none';
    dom.spinnerWheel.style.transform = 'rotate(0deg)';
    dom.winScreen.classList.add('hidden');

    SpeechGame.ui.hideModals();
    SpeechGame.board.positionToken();
    SpeechGame.ui.updateScoreDisplay();

    // Hide game UI elements when returning to welcome screen
    dom.gameControls.classList.add('hidden');
    dom.scoreDisplay.classList.add('hidden');

    dom.playOverlay.classList.remove('hidden');
}

// ==================== RESET CONFIRMATION MODAL ====================

/**
 * Open the reset confirmation modal
 */
function openResetModal() {
    const dom = SpeechGame.dom;
    dom.resetModal.classList.remove('hidden');
    SpeechGame.audio.play('click');
}

/**
 * Close the reset modal
 */
function closeResetModal() {
    const dom = SpeechGame.dom;
    dom.resetModal.classList.add('hidden');
}

/**
 * Setup reset modal event listeners
 */
function setupResetModalListeners() {
    const dom = SpeechGame.dom;

    // Cancel button - closes modal
    dom.resetCancelBtn.addEventListener('click', closeResetModal);

    // Click overlay to cancel
    dom.resetModalOverlay.addEventListener('click', closeResetModal);

    // Reset Game button - restart with same targets
    dom.resetCurrentBtn.addEventListener('click', () => {
        closeResetModal();
        performReset('restart');
    });

    // Change Category button - go back to category selection
    dom.changeCategoryBtn.addEventListener('click', () => {
        closeResetModal();
        performReset('change');
    });
}

/**
 * Perform the game reset
 * @param {string} type - 'restart' to keep same targets, 'change' to go back to category selection
 */
function performReset(type) {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;

    // Stop ambient audio
    SpeechGame.audio.stopAmbient();
    resetCardIndex();

    // Reset common game state
    state.currentPosition = 0;
    state.score = 0;
    state.isSpinning = false;
    state.questionAnswered = false;
    state.currentQuestion = null;
    state.spinResult = 0;

    // Reset wheel
    dom.spinnerWheel.style.transition = 'none';
    dom.spinnerWheel.style.transform = 'rotate(0deg)';
    dom.winScreen.classList.add('hidden');

    // Hide card modal if open
    dom.cardModal.classList.add('hidden');
    dom.helpBtn.classList.add('hidden');

    if (type === 'change') {
        // Go back to category selection - clear targets and show target modal
        state.selectedTargets = [];
        state.isPlaying = false;

        // Hide game controls and score
        dom.gameControls.classList.add('hidden');
        dom.scoreDisplay.classList.add('hidden');

        // Position token at start
        SpeechGame.board.positionToken();

        // Show target selection modal
        dom.targetModal.classList.remove('hidden');

        // Rebuild the target list to clear selections
        if (typeof buildTargetList === 'function') {
            buildTargetList();
        }

        // Show notification
        SpeechGame.ui.showNotification('Choose a new category!', '📋', 'bonus', 2000);
        speakFeedback('Let\'s pick a new category!', { logToHistory: false });
    } else {
        // Restart with same targets - reset position
        SpeechGame.board.positionToken();
        SpeechGame.ui.updateScoreDisplay();

        // Show notification
        SpeechGame.ui.showNotification('Game restarted! Spin to begin!', '🔄', 'bonus', 2000);
        speakFeedback('Alright! Let\'s try again! Give the wheel a spin!', {
            cardType: 'instruction'
        });
    }
}

// ==================== ANSWER HANDLERS ====================
function handleConditionalAnswer(userDidIt) {
    const handler = SpeechGame.cardHandlers.handlers['conditional'];
    if (handler && handler.handleAnswer) {
        handler.handleAnswer(userDidIt);
    }
}

function handleContextCluesAnswer(clickedBtn) {
    const handler = SpeechGame.cardHandlers.handlers['context-clues'];
    if (handler && handler.handleAnswer) {
        handler.handleAnswer(clickedBtn);
    }
}

function handleDoVsDoesAnswer(selectedAnswer) {
    const handler = SpeechGame.cardHandlers.handlers['do-vs-does'];
    if (handler && handler.handleAnswer) {
        handler.handleAnswer(selectedAnswer);
    }
}

function handleHasVsHaveAnswer(selectedAnswer) {
    const handler = SpeechGame.cardHandlers.handlers['has-vs-have'];
    if (handler && handler.handleAnswer) {
        handler.handleAnswer(selectedAnswer);
    }
}

// ==================== ANSWER CHECKING (with API calls) ====================
async function checkAnswer() {
    const dom = SpeechGame.dom;
    const state = SpeechGame.state;
    const card = state.currentQuestion;
    if (!card) return;

    const cardType = SpeechGame.cardHandlers.detectType(card);
    const handler = SpeechGame.cardHandlers.handlers[cardType];

    // Some card types use their own buttons
    const selfHandledTypes = ['conditional', 'context-clues', 'do-vs-does', 'figurative-language', 'following-directions'];
    if (selfHandledTypes.includes(cardType)) {
        dom.feedbackMessage.textContent = 'Click the answer buttons above';
        return;
    }

    // Get user answer
    let userAnswer = dom.answerInput.value.trim();

    // For multiple choice
    if (state.selectedChoice) {
        userAnswer = state.selectedChoice;
    }

    // Delegate to handler if it has checkAnswer
    if (handler && handler.checkAnswer) {
        handler.checkAnswer(userAnswer);
        return;
    }

    // Fallback: simple answer check
    if (!userAnswer) {
        SpeechGame.ui.showNotification('Please enter an answer!', '✍️', 'warning', 2000);
        return;
    }

    const normalizedAnswer = userAnswer.toLowerCase();
    const correctAnswer = card.answer || card.opposite || (card.answers ? card.answers[0] : '');
    const isCorrect = normalizedAnswer === correctAnswer.toLowerCase() ||
                      normalizedAnswer.includes(correctAnswer.toLowerCase());

    if (isCorrect) {
        SpeechGame.cardHandlers.handleCorrect();
    } else {
        SpeechGame.cardHandlers.handleIncorrect(correctAnswer);
    }
}

// ==================== VOICE RECORDING ====================
let vadAudioContext = null;
let vadAnalyser = null;
let vadMicrophone = null;
let vadMediaStream = null;
let vadScriptProcessor = null;
let vadAudioBuffer = [];
let vadSpeechStartSampleIndex = -1;
let vadIsSpeechDetected = false;
let vadSilenceTimer = null;
let vadCheckInterval = null;
let vadSampleRate = 44100;
let vadMaxBufferSamples = 220500;
let vadIsProcessing = false;
let vadIsRecording = false;

const VAD_THRESHOLD = 0.015;
const VAD_SILENCE_DURATION = 1200;
const VAD_PRE_BUFFER_MS = 300;
const VAD_CHECK_INTERVAL = 100;
const WAVEFORM_BARS = 25;

function toggleVoiceRecording() {
    if (vadIsProcessing) return;
    if (vadIsRecording) {
        stopVoiceRecording();
    } else {
        startVoiceRecording();
    }
}

async function startVoiceRecording() {
    if (vadIsRecording || vadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    try {
        vadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        vadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        vadSampleRate = vadAudioContext.sampleRate;
        vadAnalyser = vadAudioContext.createAnalyser();
        vadAnalyser.fftSize = 2048;
        vadAnalyser.smoothingTimeConstant = 0.3;

        vadMicrophone = vadAudioContext.createMediaStreamSource(vadMediaStream);
        vadMicrophone.connect(vadAnalyser);

        vadScriptProcessor = vadAudioContext.createScriptProcessor(4096, 1, 1);
        vadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            vadAudioBuffer.push(new Float32Array(inputData));

            let totalSamples = vadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > vadMaxBufferSamples && vadAudioBuffer.length > 0) {
                const removed = vadAudioBuffer.shift();
                totalSamples -= removed.length;
                if (vadSpeechStartSampleIndex >= removed.length) {
                    vadSpeechStartSampleIndex -= removed.length;
                } else {
                    vadSpeechStartSampleIndex = -1;
                }
            }
        };

        const silentGain = vadAudioContext.createGain();
        silentGain.gain.value = 0;
        vadMicrophone.connect(vadScriptProcessor);
        vadScriptProcessor.connect(silentGain);
        silentGain.connect(vadAudioContext.destination);

        vadIsSpeechDetected = false;
        vadAudioBuffer = [];
        vadSpeechStartSampleIndex = -1;
        vadIsRecording = true;

        const dom = SpeechGame.dom;
        dom.micButton.classList.add('recording');
        dom.micButton.querySelector('.mic-icon').textContent = '🔴';
        SpeechGame.ui.showRecordingStatus('listening', 'Say the answer...');
        SpeechGame.ui.initializeWaveform();

        vadCheckInterval = setInterval(checkVoiceActivityForGame, VAD_CHECK_INTERVAL);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopVoiceRecording() {
    if (vadCheckInterval) { clearInterval(vadCheckInterval); vadCheckInterval = null; }
    if (vadSilenceTimer) { clearTimeout(vadSilenceTimer); vadSilenceTimer = null; }
    if (vadScriptProcessor) { vadScriptProcessor.disconnect(); vadScriptProcessor = null; }
    if (vadMediaStream) { vadMediaStream.getTracks().forEach(track => track.stop()); vadMediaStream = null; }
    if (vadAudioContext && vadAudioContext.state !== 'closed') { vadAudioContext.close(); vadAudioContext = null; }

    vadAnalyser = null;
    vadMicrophone = null;
    vadIsSpeechDetected = false;
    vadAudioBuffer = [];
    vadSpeechStartSampleIndex = -1;
    vadIsRecording = false;

    const dom = SpeechGame.dom;
    dom.micButton.classList.remove('recording', 'processing');
    dom.micButton.querySelector('.mic-icon').textContent = '🎤';
    SpeechGame.ui.hideRecordingStatus();
}

function checkVoiceActivityForGame() {
    if (!vadAnalyser) return;

    const dataArray = new Uint8Array(vadAnalyser.fftSize);
    vadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > VAD_THRESHOLD;

    if (detected) {
        if (!vadIsSpeechDetected) {
            vadIsSpeechDetected = true;
            const totalSamples = vadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            vadSpeechStartSampleIndex = totalSamples;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (vadSilenceTimer) { clearTimeout(vadSilenceTimer); vadSilenceTimer = null; }
    } else {
        if (vadIsSpeechDetected) {
            vadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (vadSilenceTimer) clearTimeout(vadSilenceTimer);
            vadSilenceTimer = setTimeout(() => {
                extractAndProcessVoiceAnswer();
                vadSilenceTimer = null;
            }, VAD_SILENCE_DURATION);
        }
    }
}

async function extractAndProcessVoiceAnswer() {
    if (vadAudioBuffer.length === 0 || vadIsProcessing) return;
    vadIsProcessing = true;

    const dom = SpeechGame.dom;
    dom.micButton.classList.remove('recording');
    dom.micButton.classList.add('processing');
    dom.micButton.querySelector('.mic-icon').textContent = '⏳';
    SpeechGame.ui.showRecordingStatus('processing', 'Checking your answer...');

    const preBufferSamples = Math.floor((VAD_PRE_BUFFER_MS / 1000) * vadSampleRate);
    let startChunkIndex = 0;
    let startSampleInChunk = 0;

    if (vadSpeechStartSampleIndex >= 0) {
        let samplesSoFar = 0;
        for (let i = 0; i < vadAudioBuffer.length; i++) {
            const chunkSamples = vadAudioBuffer[i].length;
            if (samplesSoFar + chunkSamples > vadSpeechStartSampleIndex) {
                startChunkIndex = i;
                startSampleInChunk = vadSpeechStartSampleIndex - samplesSoFar;
                break;
            }
            samplesSoFar += chunkSamples;
        }

        let samplesToGoBack = preBufferSamples;
        while (samplesToGoBack > 0 && (startChunkIndex > 0 || startSampleInChunk > 0)) {
            if (startSampleInChunk >= samplesToGoBack) {
                startSampleInChunk -= samplesToGoBack;
                samplesToGoBack = 0;
            } else {
                samplesToGoBack -= startSampleInChunk;
                startChunkIndex--;
                if (startChunkIndex >= 0) {
                    startSampleInChunk = vadAudioBuffer[startChunkIndex].length;
                } else {
                    startChunkIndex = 0;
                    startSampleInChunk = 0;
                    break;
                }
            }
        }
    }

    const extractedAudio = [];
    for (let i = startChunkIndex; i < vadAudioBuffer.length; i++) {
        const chunk = vadAudioBuffer[i];
        if (i === startChunkIndex && startSampleInChunk > 0) {
            extractedAudio.push(chunk.subarray(startSampleInChunk));
        } else {
            extractedAudio.push(chunk);
        }
    }

    if (extractedAudio.length === 0) {
        stopVoiceRecording();
        vadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        return;
    }

    const totalLength = extractedAudio.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedAudio = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of extractedAudio) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
    }

    const wavBlob = float32ArrayToWav(combinedAudio, vadSampleRate);
    stopVoiceRecording();

    if (wavBlob.size < 1000) {
        vadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Please speak louder!', '🔊', 'warning', 2000);
        return;
    }

    await processVoiceAnswer(wavBlob);
}

function float32ArrayToWav(audioData, sampleRate) {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    let writeOffset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(writeOffset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        writeOffset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

async function processVoiceAnswer(wavBlob) {
    SpeechGame.ui.showRecordingStatus('processing', 'PIPER is checking...');

    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();
        await checkVoiceAnswer(transcription);

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        vadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

async function checkVoiceAnswer(transcription) {
    const state = SpeechGame.state;
    const dom = SpeechGame.dom;
    const cleanAnswer = (text) => text.trim().toLowerCase().replace(/[.,!?'"]/g, '').trim();

    const userAnswer = cleanAnswer(transcription);
    const word = state.currentQuestion.word || '';
    const expectedAnswer = state.currentQuestion.opposite || state.currentQuestion.answer;
    const isAdverbType = !!state.currentQuestion.answer;

    dom.answerInput.value = transcription;

    let isCorrect = userAnswer === cleanAnswer(expectedAnswer);

    if (!isCorrect && userAnswer.length > 0 && word && !isAdverbType) {
        SpeechGame.ui.showRecordingStatus('processing', 'AI is thinking...');
        try {
            const response = await fetch(`${API_BASE}/check-antonym`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word, userAnswer })
            });
            if (response.ok) {
                const data = await response.json();
                isCorrect = data.isCorrect;
            }
        } catch (error) {
            console.error('AI check error:', error);
        }
        SpeechGame.ui.hideRecordingStatus();
    }

    SpeechGame.ui.showAIFeedback(transcription, isCorrect, expectedAnswer);

    if (isCorrect) {
        state.questionAnswered = true;
        SpeechGame.audio.play('correct');
        state.score += 10;
        SpeechGame.ui.updateScoreDisplay();
        SpeechGame.ui.showNotification('Correct! +10 points', '🎉', 'success');
        SpeechGame.ui.showFeedback('Correct! Great job!', true);

        const feedbackText = `Great job! You said ${expectedAnswer}. That's correct!`;
        await speakFeedback(feedbackText);

        setTimeout(() => {
            vadIsProcessing = false;
            SpeechGame.audio.resumeAmbient();
            closeCard();
            if (state.currentPosition < SpeechGame.board.config.totalSpaces) {
                setTimeout(() => {
                    SpeechGame.ui.showNotification('Spin the wheel to move!', '🎡', 'bonus', 2500);
                    speakFeedback('Now spin the wheel to keep moving!');
                }, 500);
            }
        }, 1500);
    } else {
        SpeechGame.audio.play('incorrect');
        SpeechGame.ui.showFeedback(`You said "${transcription}". The answer is "${expectedAnswer}".`, false);

        const feedbackText = transcription
            ? `You said ${transcription}. The correct answer is ${expectedAnswer}. Try again!`
            : `The correct answer is ${expectedAnswer}. Try again!`;
        await speakFeedback(feedbackText);

        vadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
    }
}

// ==================== Sight Words Voice Recording ====================
let swVadIsRecording = false;
let swVadCheckInterval = null;
let swVadSilenceTimer = null;
let swVadMediaStream = null;
let swVadAudioContext = null;
let swVadAnalyser = null;
let swVadMicrophone = null;
let swVadScriptProcessor = null;
let swVadAudioBuffer = [];
let swVadIsSpeechDetected = false;
let swVadIsProcessing = false;
let swVadSampleRate = 16000;

// Similes VAD state
let similesVadIsRecording = false;
let similesVadCheckInterval = null;
let similesVadSilenceTimer = null;
let similesVadMediaStream = null;
let similesVadAudioContext = null;
let similesVadAnalyser = null;
let similesVadMicrophone = null;
let similesVadScriptProcessor = null;
let similesVadAudioBuffer = [];
let similesVadIsSpeechDetected = false;
let similesVadIsProcessing = false;
let similesVadSampleRate = 16000;

// Similes Identify VAD state
let similesIdentifyVadIsRecording = false;
let similesIdentifyVadCheckInterval = null;
let similesIdentifyVadSilenceTimer = null;
let similesIdentifyVadMediaStream = null;
let similesIdentifyVadAudioContext = null;
let similesIdentifyVadAnalyser = null;
let similesIdentifyVadMicrophone = null;
let similesIdentifyVadScriptProcessor = null;
let similesIdentifyVadAudioBuffer = [];
let similesIdentifyVadIsSpeechDetected = false;
let similesIdentifyVadIsProcessing = false;
let similesIdentifyVadSampleRate = 16000;

// Subordinating Conjunctions VAD state
let subconjVadIsRecording = false;
let subconjVadCheckInterval = null;
let subconjVadSilenceTimer = null;
let subconjVadMediaStream = null;
let subconjVadAudioContext = null;
let subconjVadAnalyser = null;
let subconjVadMicrophone = null;
let subconjVadScriptProcessor = null;
let subconjVadAudioBuffer = [];
let subconjVadIsSpeechDetected = false;
let subconjVadIsProcessing = false;
let subconjVadSampleRate = 16000;

// Synonym Middle VAD state
let synonymMiddleVadIsRecording = false;
let synonymMiddleVadCheckInterval = null;
let synonymMiddleVadSilenceTimer = null;
let synonymMiddleVadMediaStream = null;
let synonymMiddleVadAudioContext = null;
let synonymMiddleVadAnalyser = null;
let synonymMiddleVadMicrophone = null;
let synonymMiddleVadScriptProcessor = null;
let synonymMiddleVadAudioBuffer = [];
let synonymMiddleVadIsSpeechDetected = false;
let synonymMiddleVadIsProcessing = false;
let synonymMiddleVadSampleRate = 16000;

// Synonym Elementary VAD state
let synonymElementaryVadIsRecording = false;
let synonymElementaryVadCheckInterval = null;
let synonymElementaryVadSilenceTimer = null;
let synonymElementaryVadMediaStream = null;
let synonymElementaryVadAudioContext = null;
let synonymElementaryVadAnalyser = null;
let synonymElementaryVadMicrophone = null;
let synonymElementaryVadScriptProcessor = null;
let synonymElementaryVadAudioBuffer = [];
let synonymElementaryVadIsSpeechDetected = false;
let synonymElementaryVadIsProcessing = false;
let synonymElementaryVadSampleRate = 16000;

async function startSightWordsVoiceRecording() {
    if (swVadIsRecording || swVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const swMicBtn = document.getElementById('swMicBtn');
    const swInput = document.getElementById('swInput');

    try {
        swVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        swVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        swVadSampleRate = swVadAudioContext.sampleRate;
        swVadAnalyser = swVadAudioContext.createAnalyser();
        swVadAnalyser.fftSize = 2048;
        swVadAnalyser.smoothingTimeConstant = 0.3;

        swVadMicrophone = swVadAudioContext.createMediaStreamSource(swVadMediaStream);
        swVadMicrophone.connect(swVadAnalyser);

        swVadScriptProcessor = swVadAudioContext.createScriptProcessor(4096, 1, 1);
        swVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            swVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = swVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && swVadAudioBuffer.length > 0) {
                const removed = swVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = swVadAudioContext.createGain();
        silentGain.gain.value = 0;
        swVadMicrophone.connect(swVadScriptProcessor);
        swVadScriptProcessor.connect(silentGain);
        silentGain.connect(swVadAudioContext.destination);

        swVadIsSpeechDetected = false;
        swVadAudioBuffer = [];
        swVadIsRecording = true;

        if (swMicBtn) swMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Say the word...');
        SpeechGame.ui.initializeWaveform();

        swVadCheckInterval = setInterval(checkSightWordsVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSightWordsVoiceRecording() {
    if (swVadCheckInterval) { clearInterval(swVadCheckInterval); swVadCheckInterval = null; }
    if (swVadSilenceTimer) { clearTimeout(swVadSilenceTimer); swVadSilenceTimer = null; }
    if (swVadScriptProcessor) { swVadScriptProcessor.disconnect(); swVadScriptProcessor = null; }
    if (swVadMediaStream) { swVadMediaStream.getTracks().forEach(track => track.stop()); swVadMediaStream = null; }
    if (swVadAudioContext && swVadAudioContext.state !== 'closed') { swVadAudioContext.close(); swVadAudioContext = null; }

    swVadAnalyser = null;
    swVadMicrophone = null;
    swVadIsSpeechDetected = false;
    swVadAudioBuffer = [];
    swVadIsRecording = false;

    const swMicBtn = document.getElementById('swMicBtn');
    if (swMicBtn) swMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSightWordsVoiceActivity() {
    if (!swVadAnalyser) return;

    const dataArray = new Uint8Array(swVadAnalyser.fftSize);
    swVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!swVadIsSpeechDetected) {
            swVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (swVadSilenceTimer) { clearTimeout(swVadSilenceTimer); swVadSilenceTimer = null; }
    } else {
        if (swVadIsSpeechDetected) {
            swVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (swVadSilenceTimer) clearTimeout(swVadSilenceTimer);
            swVadSilenceTimer = setTimeout(() => {
                processSightWordsVoice();
                swVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSightWordsVoice() {
    if (swVadAudioBuffer.length === 0 || swVadIsProcessing) return;
    swVadIsProcessing = true;

    const swMicBtn = document.getElementById('swMicBtn');
    if (swMicBtn) swMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSightWordsVoiceRecording();

    // Combine audio buffer
    const totalLength = swVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of swVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = swVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in sight words input and check
        const swInput = document.getElementById('swInput');
        if (swInput && transcription) {
            swInput.value = transcription.toLowerCase().trim();
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['sight-words']) {
                SpeechGame.cardHandlers.handlers['sight-words'].checkAnswer();
            }
        }

        swVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        swVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== Similes Voice Recording ====================
async function startSimilesVoiceRecording() {
    if (similesVadIsRecording || similesVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const similesMicBtn = document.getElementById('similesMicBtn');

    try {
        similesVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        similesVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        similesVadSampleRate = similesVadAudioContext.sampleRate;
        similesVadAnalyser = similesVadAudioContext.createAnalyser();
        similesVadAnalyser.fftSize = 2048;
        similesVadAnalyser.smoothingTimeConstant = 0.3;

        similesVadMicrophone = similesVadAudioContext.createMediaStreamSource(similesVadMediaStream);
        similesVadMicrophone.connect(similesVadAnalyser);

        similesVadScriptProcessor = similesVadAudioContext.createScriptProcessor(4096, 1, 1);
        similesVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            similesVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = similesVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && similesVadAudioBuffer.length > 0) {
                const removed = similesVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = similesVadAudioContext.createGain();
        silentGain.gain.value = 0;
        similesVadMicrophone.connect(similesVadScriptProcessor);
        similesVadScriptProcessor.connect(silentGain);
        silentGain.connect(similesVadAudioContext.destination);

        similesVadIsSpeechDetected = false;
        similesVadAudioBuffer = [];
        similesVadIsRecording = true;

        if (similesMicBtn) similesMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Speak your answer...');
        SpeechGame.ui.initializeWaveform();

        similesVadCheckInterval = setInterval(checkSimilesVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSimilesVoiceRecording() {
    if (similesVadCheckInterval) { clearInterval(similesVadCheckInterval); similesVadCheckInterval = null; }
    if (similesVadSilenceTimer) { clearTimeout(similesVadSilenceTimer); similesVadSilenceTimer = null; }
    if (similesVadScriptProcessor) { similesVadScriptProcessor.disconnect(); similesVadScriptProcessor = null; }
    if (similesVadMediaStream) { similesVadMediaStream.getTracks().forEach(track => track.stop()); similesVadMediaStream = null; }
    if (similesVadAudioContext && similesVadAudioContext.state !== 'closed') { similesVadAudioContext.close(); similesVadAudioContext = null; }

    similesVadAnalyser = null;
    similesVadMicrophone = null;
    similesVadIsSpeechDetected = false;
    similesVadAudioBuffer = [];
    similesVadIsRecording = false;

    const similesMicBtn = document.getElementById('similesMicBtn');
    if (similesMicBtn) similesMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSimilesVoiceActivity() {
    if (!similesVadAnalyser) return;

    const dataArray = new Uint8Array(similesVadAnalyser.fftSize);
    similesVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!similesVadIsSpeechDetected) {
            similesVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (similesVadSilenceTimer) { clearTimeout(similesVadSilenceTimer); similesVadSilenceTimer = null; }
    } else {
        if (similesVadIsSpeechDetected) {
            similesVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (similesVadSilenceTimer) clearTimeout(similesVadSilenceTimer);
            similesVadSilenceTimer = setTimeout(() => {
                processSimilesVoice();
                similesVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSimilesVoice() {
    if (similesVadAudioBuffer.length === 0 || similesVadIsProcessing) return;
    similesVadIsProcessing = true;

    const similesMicBtn = document.getElementById('similesMicBtn');
    if (similesMicBtn) similesMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSimilesVoiceRecording();

    // Combine audio buffer
    const totalLength = similesVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of similesVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = similesVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in similes input and check
        const similesInput = document.getElementById('similesInput');
        if (similesInput && transcription) {
            similesInput.value = transcription;
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['similes']) {
                SpeechGame.cardHandlers.handlers['similes'].checkAnswer();
            }
        }

        similesVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        similesVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== Similes Identify Voice Recording ====================
async function startSimilesIdentifyVoiceRecording() {
    if (similesIdentifyVadIsRecording || similesIdentifyVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const similesIdentifyMicBtn = document.getElementById('similesIdentifyMicBtn');

    try {
        similesIdentifyVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        similesIdentifyVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        similesIdentifyVadSampleRate = similesIdentifyVadAudioContext.sampleRate;
        similesIdentifyVadAnalyser = similesIdentifyVadAudioContext.createAnalyser();
        similesIdentifyVadAnalyser.fftSize = 2048;
        similesIdentifyVadAnalyser.smoothingTimeConstant = 0.3;

        similesIdentifyVadMicrophone = similesIdentifyVadAudioContext.createMediaStreamSource(similesIdentifyVadMediaStream);
        similesIdentifyVadMicrophone.connect(similesIdentifyVadAnalyser);

        similesIdentifyVadScriptProcessor = similesIdentifyVadAudioContext.createScriptProcessor(4096, 1, 1);
        similesIdentifyVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            similesIdentifyVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = similesIdentifyVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && similesIdentifyVadAudioBuffer.length > 0) {
                const removed = similesIdentifyVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = similesIdentifyVadAudioContext.createGain();
        silentGain.gain.value = 0;
        similesIdentifyVadMicrophone.connect(similesIdentifyVadScriptProcessor);
        similesIdentifyVadScriptProcessor.connect(silentGain);
        silentGain.connect(similesIdentifyVadAudioContext.destination);

        similesIdentifyVadIsSpeechDetected = false;
        similesIdentifyVadAudioBuffer = [];
        similesIdentifyVadIsRecording = true;

        if (similesIdentifyMicBtn) similesIdentifyMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Explain the simile...');
        SpeechGame.ui.initializeWaveform();

        similesIdentifyVadCheckInterval = setInterval(checkSimilesIdentifyVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSimilesIdentifyVoiceRecording() {
    if (similesIdentifyVadCheckInterval) { clearInterval(similesIdentifyVadCheckInterval); similesIdentifyVadCheckInterval = null; }
    if (similesIdentifyVadSilenceTimer) { clearTimeout(similesIdentifyVadSilenceTimer); similesIdentifyVadSilenceTimer = null; }
    if (similesIdentifyVadScriptProcessor) { similesIdentifyVadScriptProcessor.disconnect(); similesIdentifyVadScriptProcessor = null; }
    if (similesIdentifyVadMediaStream) { similesIdentifyVadMediaStream.getTracks().forEach(track => track.stop()); similesIdentifyVadMediaStream = null; }
    if (similesIdentifyVadAudioContext && similesIdentifyVadAudioContext.state !== 'closed') { similesIdentifyVadAudioContext.close(); similesIdentifyVadAudioContext = null; }

    similesIdentifyVadAnalyser = null;
    similesIdentifyVadMicrophone = null;
    similesIdentifyVadIsSpeechDetected = false;
    similesIdentifyVadAudioBuffer = [];
    similesIdentifyVadIsRecording = false;

    const similesIdentifyMicBtn = document.getElementById('similesIdentifyMicBtn');
    if (similesIdentifyMicBtn) similesIdentifyMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSimilesIdentifyVoiceActivity() {
    if (!similesIdentifyVadAnalyser) return;

    const dataArray = new Uint8Array(similesIdentifyVadAnalyser.fftSize);
    similesIdentifyVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!similesIdentifyVadIsSpeechDetected) {
            similesIdentifyVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (similesIdentifyVadSilenceTimer) { clearTimeout(similesIdentifyVadSilenceTimer); similesIdentifyVadSilenceTimer = null; }
    } else {
        if (similesIdentifyVadIsSpeechDetected) {
            similesIdentifyVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (similesIdentifyVadSilenceTimer) clearTimeout(similesIdentifyVadSilenceTimer);
            similesIdentifyVadSilenceTimer = setTimeout(() => {
                processSimilesIdentifyVoice();
                similesIdentifyVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSimilesIdentifyVoice() {
    if (similesIdentifyVadAudioBuffer.length === 0 || similesIdentifyVadIsProcessing) return;
    similesIdentifyVadIsProcessing = true;

    const similesIdentifyMicBtn = document.getElementById('similesIdentifyMicBtn');
    if (similesIdentifyMicBtn) similesIdentifyMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSimilesIdentifyVoiceRecording();

    // Combine audio buffer
    const totalLength = similesIdentifyVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of similesIdentifyVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = similesIdentifyVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in similes-identify input and check
        const similesIdentifyInput = document.getElementById('similesIdentifyInput');
        if (similesIdentifyInput && transcription) {
            similesIdentifyInput.value = transcription;
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['similes-identify']) {
                SpeechGame.cardHandlers.handlers['similes-identify'].checkAnswer();
            }
        }

        similesIdentifyVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        similesIdentifyVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== Subordinating Conjunctions Voice Recording ====================
async function startSubconjVoiceRecording() {
    if (subconjVadIsRecording || subconjVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const subconjMicBtn = document.getElementById('subconjMicBtn');

    try {
        subconjVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        subconjVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        subconjVadSampleRate = subconjVadAudioContext.sampleRate;
        subconjVadAnalyser = subconjVadAudioContext.createAnalyser();
        subconjVadAnalyser.fftSize = 2048;
        subconjVadAnalyser.smoothingTimeConstant = 0.3;

        subconjVadMicrophone = subconjVadAudioContext.createMediaStreamSource(subconjVadMediaStream);
        subconjVadMicrophone.connect(subconjVadAnalyser);

        subconjVadScriptProcessor = subconjVadAudioContext.createScriptProcessor(4096, 1, 1);
        subconjVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            subconjVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = subconjVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && subconjVadAudioBuffer.length > 0) {
                const removed = subconjVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = subconjVadAudioContext.createGain();
        silentGain.gain.value = 0;
        subconjVadMicrophone.connect(subconjVadScriptProcessor);
        subconjVadScriptProcessor.connect(silentGain);
        silentGain.connect(subconjVadAudioContext.destination);

        subconjVadIsSpeechDetected = false;
        subconjVadAudioBuffer = [];
        subconjVadIsRecording = true;

        if (subconjMicBtn) subconjMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Say the conjunction...');
        SpeechGame.ui.initializeWaveform();

        subconjVadCheckInterval = setInterval(checkSubconjVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSubconjVoiceRecording() {
    if (subconjVadCheckInterval) { clearInterval(subconjVadCheckInterval); subconjVadCheckInterval = null; }
    if (subconjVadSilenceTimer) { clearTimeout(subconjVadSilenceTimer); subconjVadSilenceTimer = null; }
    if (subconjVadScriptProcessor) { subconjVadScriptProcessor.disconnect(); subconjVadScriptProcessor = null; }
    if (subconjVadMediaStream) { subconjVadMediaStream.getTracks().forEach(track => track.stop()); subconjVadMediaStream = null; }
    if (subconjVadAudioContext && subconjVadAudioContext.state !== 'closed') { subconjVadAudioContext.close(); subconjVadAudioContext = null; }

    subconjVadAnalyser = null;
    subconjVadMicrophone = null;
    subconjVadIsSpeechDetected = false;
    subconjVadAudioBuffer = [];
    subconjVadIsRecording = false;

    const subconjMicBtn = document.getElementById('subconjMicBtn');
    if (subconjMicBtn) subconjMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSubconjVoiceActivity() {
    if (!subconjVadAnalyser) return;

    const dataArray = new Uint8Array(subconjVadAnalyser.fftSize);
    subconjVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!subconjVadIsSpeechDetected) {
            subconjVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (subconjVadSilenceTimer) { clearTimeout(subconjVadSilenceTimer); subconjVadSilenceTimer = null; }
    } else {
        if (subconjVadIsSpeechDetected) {
            subconjVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (subconjVadSilenceTimer) clearTimeout(subconjVadSilenceTimer);
            subconjVadSilenceTimer = setTimeout(() => {
                processSubconjVoice();
                subconjVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSubconjVoice() {
    if (subconjVadAudioBuffer.length === 0 || subconjVadIsProcessing) return;
    subconjVadIsProcessing = true;

    const subconjMicBtn = document.getElementById('subconjMicBtn');
    if (subconjMicBtn) subconjMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSubconjVoiceRecording();

    // Combine audio buffer
    const totalLength = subconjVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of subconjVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = subconjVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in subordinating conjunctions input and check
        const subconjInput = document.getElementById('subconjInput');
        if (subconjInput && transcription) {
            subconjInput.value = transcription;
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['subordinating-conjunctions']) {
                SpeechGame.cardHandlers.handlers['subordinating-conjunctions'].checkIdentifyAnswer();
            }
        }

        subconjVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        subconjVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== Synonym Middle Voice Recording ====================
async function startSynonymMiddleVoiceRecording() {
    if (synonymMiddleVadIsRecording || synonymMiddleVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const synonymMiddleMicBtn = document.getElementById('synonymMiddleMicBtn');

    try {
        synonymMiddleVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        synonymMiddleVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        synonymMiddleVadSampleRate = synonymMiddleVadAudioContext.sampleRate;
        synonymMiddleVadAnalyser = synonymMiddleVadAudioContext.createAnalyser();
        synonymMiddleVadAnalyser.fftSize = 2048;
        synonymMiddleVadAnalyser.smoothingTimeConstant = 0.3;

        synonymMiddleVadMicrophone = synonymMiddleVadAudioContext.createMediaStreamSource(synonymMiddleVadMediaStream);
        synonymMiddleVadMicrophone.connect(synonymMiddleVadAnalyser);

        synonymMiddleVadScriptProcessor = synonymMiddleVadAudioContext.createScriptProcessor(4096, 1, 1);
        synonymMiddleVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            synonymMiddleVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = synonymMiddleVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && synonymMiddleVadAudioBuffer.length > 0) {
                const removed = synonymMiddleVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = synonymMiddleVadAudioContext.createGain();
        silentGain.gain.value = 0;
        synonymMiddleVadMicrophone.connect(synonymMiddleVadScriptProcessor);
        synonymMiddleVadScriptProcessor.connect(silentGain);
        silentGain.connect(synonymMiddleVadAudioContext.destination);

        synonymMiddleVadIsSpeechDetected = false;
        synonymMiddleVadAudioBuffer = [];
        synonymMiddleVadIsRecording = true;

        if (synonymMiddleMicBtn) synonymMiddleMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Say a synonym...');
        SpeechGame.ui.initializeWaveform();

        synonymMiddleVadCheckInterval = setInterval(checkSynonymMiddleVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSynonymMiddleVoiceRecording() {
    if (synonymMiddleVadCheckInterval) { clearInterval(synonymMiddleVadCheckInterval); synonymMiddleVadCheckInterval = null; }
    if (synonymMiddleVadSilenceTimer) { clearTimeout(synonymMiddleVadSilenceTimer); synonymMiddleVadSilenceTimer = null; }
    if (synonymMiddleVadScriptProcessor) { synonymMiddleVadScriptProcessor.disconnect(); synonymMiddleVadScriptProcessor = null; }
    if (synonymMiddleVadMediaStream) { synonymMiddleVadMediaStream.getTracks().forEach(track => track.stop()); synonymMiddleVadMediaStream = null; }
    if (synonymMiddleVadAudioContext && synonymMiddleVadAudioContext.state !== 'closed') { synonymMiddleVadAudioContext.close(); synonymMiddleVadAudioContext = null; }

    synonymMiddleVadAnalyser = null;
    synonymMiddleVadMicrophone = null;
    synonymMiddleVadIsSpeechDetected = false;
    synonymMiddleVadAudioBuffer = [];
    synonymMiddleVadIsRecording = false;

    const synonymMiddleMicBtn = document.getElementById('synonymMiddleMicBtn');
    if (synonymMiddleMicBtn) synonymMiddleMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSynonymMiddleVoiceActivity() {
    if (!synonymMiddleVadAnalyser) return;

    const dataArray = new Uint8Array(synonymMiddleVadAnalyser.fftSize);
    synonymMiddleVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!synonymMiddleVadIsSpeechDetected) {
            synonymMiddleVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (synonymMiddleVadSilenceTimer) { clearTimeout(synonymMiddleVadSilenceTimer); synonymMiddleVadSilenceTimer = null; }
    } else {
        if (synonymMiddleVadIsSpeechDetected) {
            synonymMiddleVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (synonymMiddleVadSilenceTimer) clearTimeout(synonymMiddleVadSilenceTimer);
            synonymMiddleVadSilenceTimer = setTimeout(() => {
                processSynonymMiddleVoice();
                synonymMiddleVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSynonymMiddleVoice() {
    if (synonymMiddleVadAudioBuffer.length === 0 || synonymMiddleVadIsProcessing) return;
    synonymMiddleVadIsProcessing = true;

    const synonymMiddleMicBtn = document.getElementById('synonymMiddleMicBtn');
    if (synonymMiddleMicBtn) synonymMiddleMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSynonymMiddleVoiceRecording();

    // Combine audio buffer
    const totalLength = synonymMiddleVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of synonymMiddleVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = synonymMiddleVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in synonym middle input and check
        const synonymMiddleInput = document.getElementById('synonymMiddleInput');
        if (synonymMiddleInput && transcription) {
            synonymMiddleInput.value = transcription;
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['synonym-middle']) {
                SpeechGame.cardHandlers.handlers['synonym-middle'].checkAnswer();
            }
        }

        synonymMiddleVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        synonymMiddleVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== Synonym Elementary Voice Recording ====================
async function startSynonymElementaryVoiceRecording() {
    if (synonymElementaryVadIsRecording || synonymElementaryVadIsProcessing) return;
    SpeechGame.audio.pauseAmbient();
    SpeechGame.audio.play('click');

    const synonymElementaryMicBtn = document.getElementById('synonymElementaryMicBtn');

    try {
        synonymElementaryVadMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });

        synonymElementaryVadAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        synonymElementaryVadSampleRate = synonymElementaryVadAudioContext.sampleRate;
        synonymElementaryVadAnalyser = synonymElementaryVadAudioContext.createAnalyser();
        synonymElementaryVadAnalyser.fftSize = 2048;
        synonymElementaryVadAnalyser.smoothingTimeConstant = 0.3;

        synonymElementaryVadMicrophone = synonymElementaryVadAudioContext.createMediaStreamSource(synonymElementaryVadMediaStream);
        synonymElementaryVadMicrophone.connect(synonymElementaryVadAnalyser);

        synonymElementaryVadScriptProcessor = synonymElementaryVadAudioContext.createScriptProcessor(4096, 1, 1);
        synonymElementaryVadScriptProcessor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            synonymElementaryVadAudioBuffer.push(new Float32Array(inputData));

            // Limit buffer size
            let totalSamples = synonymElementaryVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
            while (totalSamples > 480000 && synonymElementaryVadAudioBuffer.length > 0) {
                const removed = synonymElementaryVadAudioBuffer.shift();
                totalSamples -= removed.length;
            }
        };

        const silentGain = synonymElementaryVadAudioContext.createGain();
        silentGain.gain.value = 0;
        synonymElementaryVadMicrophone.connect(synonymElementaryVadScriptProcessor);
        synonymElementaryVadScriptProcessor.connect(silentGain);
        silentGain.connect(synonymElementaryVadAudioContext.destination);

        synonymElementaryVadIsSpeechDetected = false;
        synonymElementaryVadAudioBuffer = [];
        synonymElementaryVadIsRecording = true;

        if (synonymElementaryMicBtn) synonymElementaryMicBtn.classList.add('recording');
        SpeechGame.ui.showRecordingStatus('listening', 'Say a synonym...');
        SpeechGame.ui.initializeWaveform();

        synonymElementaryVadCheckInterval = setInterval(checkSynonymElementaryVoiceActivity, 50);

    } catch (error) {
        console.error('Microphone access error:', error);
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not access microphone!', '🎤', 'warning', 2000);
    }
}

function stopSynonymElementaryVoiceRecording() {
    if (synonymElementaryVadCheckInterval) { clearInterval(synonymElementaryVadCheckInterval); synonymElementaryVadCheckInterval = null; }
    if (synonymElementaryVadSilenceTimer) { clearTimeout(synonymElementaryVadSilenceTimer); synonymElementaryVadSilenceTimer = null; }
    if (synonymElementaryVadScriptProcessor) { synonymElementaryVadScriptProcessor.disconnect(); synonymElementaryVadScriptProcessor = null; }
    if (synonymElementaryVadMediaStream) { synonymElementaryVadMediaStream.getTracks().forEach(track => track.stop()); synonymElementaryVadMediaStream = null; }
    if (synonymElementaryVadAudioContext && synonymElementaryVadAudioContext.state !== 'closed') { synonymElementaryVadAudioContext.close(); synonymElementaryVadAudioContext = null; }

    synonymElementaryVadAnalyser = null;
    synonymElementaryVadMicrophone = null;
    synonymElementaryVadIsSpeechDetected = false;
    synonymElementaryVadAudioBuffer = [];
    synonymElementaryVadIsRecording = false;

    const synonymElementaryMicBtn = document.getElementById('synonymElementaryMicBtn');
    if (synonymElementaryMicBtn) synonymElementaryMicBtn.classList.remove('recording');
    SpeechGame.ui.hideRecordingStatus();
}

function checkSynonymElementaryVoiceActivity() {
    if (!synonymElementaryVadAnalyser) return;

    const dataArray = new Uint8Array(synonymElementaryVadAnalyser.fftSize);
    synonymElementaryVadAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    SpeechGame.ui.updateWaveform(rms * 100);

    const detected = rms > 0.015;

    if (detected) {
        if (!synonymElementaryVadIsSpeechDetected) {
            synonymElementaryVadIsSpeechDetected = true;
            SpeechGame.ui.showRecordingStatus('speaking', 'I hear you!');
        }
        if (synonymElementaryVadSilenceTimer) { clearTimeout(synonymElementaryVadSilenceTimer); synonymElementaryVadSilenceTimer = null; }
    } else {
        if (synonymElementaryVadIsSpeechDetected) {
            synonymElementaryVadIsSpeechDetected = false;
            SpeechGame.ui.showRecordingStatus('listening', 'Continue speaking...');
            if (synonymElementaryVadSilenceTimer) clearTimeout(synonymElementaryVadSilenceTimer);
            synonymElementaryVadSilenceTimer = setTimeout(() => {
                processSynonymElementaryVoice();
                synonymElementaryVadSilenceTimer = null;
            }, 800);
        }
    }
}

async function processSynonymElementaryVoice() {
    if (synonymElementaryVadAudioBuffer.length === 0 || synonymElementaryVadIsProcessing) return;
    synonymElementaryVadIsProcessing = true;

    const synonymElementaryMicBtn = document.getElementById('synonymElementaryMicBtn');
    if (synonymElementaryMicBtn) synonymElementaryMicBtn.classList.remove('recording');
    SpeechGame.ui.showRecordingStatus('processing', 'Processing...');

    stopSynonymElementaryVoiceRecording();

    // Combine audio buffer
    const totalLength = synonymElementaryVadAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of synonymElementaryVadAudioBuffer) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    // Resample to 16kHz and create WAV
    const targetSampleRate = 16000;
    const ratio = synonymElementaryVadSampleRate / targetSampleRate;
    const newLength = Math.round(combinedBuffer.length / ratio);
    const resampledBuffer = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
        resampledBuffer[i] = combinedBuffer[Math.round(i * ratio)];
    }

    const wavBuffer = createWavBuffer(resampledBuffer, targetSampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    // Send to transcription API
    try {
        const formData = new FormData();
        formData.append('audio', wavBlob, 'recording.wav');
        formData.append('language', 'en');

        const response = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: formData });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();
        const transcription = data.text || '';

        SpeechGame.ui.hideRecordingStatus();

        // Put transcription in synonym elementary input and check
        const synonymElementaryInput = document.getElementById('synonymElementaryInput');
        if (synonymElementaryInput && transcription) {
            synonymElementaryInput.value = transcription;
            // Auto-check the answer
            if (SpeechGame.cardHandlers.handlers['synonym-elementary']) {
                SpeechGame.cardHandlers.handlers['synonym-elementary'].checkAnswer();
            }
        }

        synonymElementaryVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();

    } catch (error) {
        console.error('Voice processing error:', error);
        SpeechGame.ui.hideRecordingStatus();
        synonymElementaryVadIsProcessing = false;
        SpeechGame.audio.resumeAmbient();
        SpeechGame.ui.showNotification('Could not process audio!', '❌', 'warning', 2000);
    }
}

// ==================== TTS (Browser Speech Synthesis) ====================
/**
 * Speak feedback text with karaoke-style visual display and history logging
 * @param {string} text - Text to speak
 * @param {Object} options - Optional settings
 *   - useVisual: Show karaoke overlay (default: true)
 *   - logToHistory: Add to speech history (default: true)
 *   - cardType: History card type ('ai-speech', 'player-task', 'feedback-positive', etc.)
 *   - character: AI character emoji
 *   - autoHide: Auto-hide karaoke display
 *   - cardContent: Embedded card content for history
 *   - image: Image URL for history card
 *   - answer: Answer text for history card
 * @returns {Promise} Resolves when speech completes
 */
async function speakFeedback(text, options = {}) {
    // Check for speech synthesis support
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
    }

    // Default options
    const useVisual = options.useVisual !== false;
    const cardType = options.cardType || 'ai-speech';
    const character = options.character || '🤖';
    const autoHide = options.autoHide !== false;
    const rate = options.rate || 0.9;
    const pitch = options.pitch || 1.1;

    // Use the AI Voice Display component if available and visual is enabled
    if (useVisual && SpeechGame.aiVoice && SpeechGame.aiVoice.speak) {
        return SpeechGame.aiVoice.speak(text, {
            rate: rate,
            pitch: pitch,
            character: character,
            autoHide: autoHide
        });
    }

    // Fallback to basic speech synthesis (no visual)
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
    });
}

function playAudioResponse(base64Audio) {
    return new Promise((resolve) => {
        const dom = SpeechGame.dom;
        const audioData = `data:audio/mpeg;base64,${base64Audio}`;
        dom.audioPlayer.src = audioData;

        const onEnded = () => {
            dom.audioPlayer.removeEventListener('ended', onEnded);
            dom.audioPlayer.removeEventListener('error', onError);
            setTimeout(resolve, 300);
        };

        const onError = () => {
            dom.audioPlayer.removeEventListener('ended', onEnded);
            dom.audioPlayer.removeEventListener('error', onError);
            resolve();
        };

        dom.audioPlayer.addEventListener('ended', onEnded);
        dom.audioPlayer.addEventListener('error', onError);
        dom.audioPlayer.play().catch(() => resolve());
    });
}

// ==================== STARTUP ====================
// Initialization is handled by boardgame-entry.ts to ensure proper module loading order
