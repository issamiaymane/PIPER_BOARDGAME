/**
 * DOM Cache Module
 * Centralizes all DOM element references for the board game
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dom: Record<string, any> = {
    // Flag to track initialization
    _initialized: false,

    /**
     * Initialize all DOM element references
     * Call this after DOMContentLoaded
     */
    init() {
        if (this._initialized) return;

        // Loading screen elements
        this.loadingScreen = document.getElementById('loadingScreen');
        this.loadingBar = document.getElementById('loadingBar');

        // Game elements
        this.playOverlay = document.getElementById('playOverlay');
        this.playButton = document.getElementById('playButton');
        this.targetModal = document.getElementById('targetModal');
        this.targetList = document.getElementById('targetList');
        this.nextButton = document.getElementById('nextButton');

        // Card modal elements
        this.cardModal = document.getElementById('cardModal');
        this.cardQuestion = document.getElementById('cardQuestion');
        this.wordLabel = document.getElementById('wordLabel');
        this.image1 = document.getElementById('image1');
        this.image2 = document.getElementById('image2');
        this.image3 = document.getElementById('image3');
        this.imagePair3 = document.getElementById('imagePair3');

        // Sequencing elements
        this.sequencingQuestions = document.getElementById('sequencingQuestions');
        this.seqFirst = document.getElementById('seqFirst');
        this.seqSecond = document.getElementById('seqSecond');
        this.seqThird = document.getElementById('seqThird');
        this.picNum1 = document.getElementById('picNum1');
        this.picNum2 = document.getElementById('picNum2');
        this.picNum3 = document.getElementById('picNum3');

        // Answer input elements
        this.answerInput = document.getElementById('answerInput');
        this.doneButton = document.getElementById('doneButton');
        this.cardClose = document.getElementById('cardClose');
        this.feedbackMessage = document.getElementById('feedbackMessage');

        // Spinner elements
        this.spinnerWheel = document.getElementById('spinnerWheel');
        this.spinnerCenter = document.querySelector('.spinner-center');

        // Board elements
        this.boardPath = document.getElementById('boardPath');
        this.playerToken = document.getElementById('player1Token');

        // Control elements
        this.spinBtn = document.getElementById('spinBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.gameControls = document.getElementById('gameControls');

        // Score elements
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.scoreValue = document.getElementById('scoreValue');
        this.positionValue = document.getElementById('positionValue');

        // Notification elements
        this.gameNotification = document.getElementById('gameNotification');
        this.notificationIcon = document.getElementById('notificationIcon');
        this.notificationText = document.getElementById('notificationText');

        // Win screen elements
        this.winScreen = document.getElementById('winScreen');
        this.finalScore = document.getElementById('finalScore');
        this.playAgainBtn = document.getElementById('playAgainBtn');

        // Character selection elements
        this.playerCard = document.getElementById('playerCard');
        this.playerAvatarEmoji = document.getElementById('playerAvatarEmoji');
        this.characterModal = document.getElementById('characterModal');
        this.characterGrid = document.getElementById('characterGrid');
        this.characterDoneBtn = document.getElementById('characterDoneBtn');

        // Reset modal elements
        this.resetModal = document.getElementById('resetModal');
        this.resetModalOverlay = document.getElementById('resetModalOverlay');
        this.resetCurrentBtn = document.getElementById('resetCurrentBtn');
        this.changeCategoryBtn = document.getElementById('changeCategoryBtn');
        this.resetCancelBtn = document.getElementById('resetCancelBtn');

        // AI Voice Display elements
        this.aiVoiceContainer = document.getElementById('aiVoiceContainer');
        this.aiCharacter = document.getElementById('aiCharacter');
        this.aiVoiceText = document.getElementById('aiVoiceText');

        // Voice recording elements
        this.micButton = document.getElementById('micButton');
        this.recordingStatus = document.getElementById('recordingStatus');
        this.recordingText = document.getElementById('recordingText');
        this.voiceWaveform = document.getElementById('voiceWaveform');
        this.aiFeedback = document.getElementById('aiFeedback');
        this.aiFeedbackContent = document.getElementById('aiFeedbackContent');

        // Multiple choice elements
        this.multipleChoiceContainer = document.getElementById('multipleChoiceContainer');
        this.choiceButtons = document.querySelectorAll('.choice-btn');

        // Sentence building elements
        this.sentenceBuildingContainer = document.getElementById('sentenceBuildingContainer');
        this.sentenceDisplay = document.getElementById('sentenceDisplay');
        this.wordBoxes = document.getElementById('wordBoxes');
        this.clearSentenceBtn = document.getElementById('clearSentenceBtn');

        // Category grid elements
        this.categoryGridContainer = document.getElementById('categoryGridContainer');
        this.categoryGrid = document.getElementById('categoryGrid');

        // Comparatives elements
        this.comparativesContainer = document.getElementById('comparativesContainer');
        this.comparativesGrid = document.getElementById('comparativesGrid');
        this.comparativesWord = document.getElementById('comparativesWord');
        this.comparativeInput = document.getElementById('comparativeInput');
        this.superlativeInput = document.getElementById('superlativeInput');

        // Compare and Contrast elements
        this.compareContrastContainer = document.getElementById('compareContrastContainer');
        this.compareQuestion1 = document.getElementById('compareQuestion1');
        this.compareQuestion2 = document.getElementById('compareQuestion2');
        this.compareImage1 = document.getElementById('compareImage1');
        this.compareImage2 = document.getElementById('compareImage2');
        this.sameInput = document.getElementById('sameInput');
        this.differentInput = document.getElementById('differentInput');

        // Conditional Following Directions elements
        this.conditionalContainer = document.getElementById('conditionalContainer');
        this.conditionalImage = document.getElementById('conditionalImage');
        this.conditionalStatement = document.getElementById('conditionalStatement');
        this.conditionalDidIt = document.getElementById('conditionalDidIt');
        this.conditionalDidntDo = document.getElementById('conditionalDidntDo');

        // Context Clues elements
        this.contextCluesContainer = document.getElementById('contextCluesContainer');
        this.contextCluesTitle = document.getElementById('contextCluesTitle');
        this.contextCluesParagraph = document.getElementById('contextCluesParagraph');
        this.contextCluesImage = document.getElementById('contextCluesImage');
        this.contextCluesWord = document.getElementById('contextCluesWord');
        this.contextCluesChoices = document.getElementById('contextCluesChoices');

        // Fill-in-Blank elements
        this.fillBlankContainer = document.getElementById('fillBlankContainer');
        this.fillBlankTitle = document.getElementById('fillBlankTitle');
        this.fillBlankParagraph = document.getElementById('fillBlankParagraph');
        this.fillBlankImage = document.getElementById('fillBlankImage');
        this.fillBlankInput = document.getElementById('fillBlankInput');

        // Conjunction elements
        this.conjunctionContainer = document.getElementById('conjunctionContainer');
        this.conjunctionSentence = document.getElementById('conjunctionSentence');
        this.conjunctionImage = document.getElementById('conjunctionImage');
        this.conjunctionInput = document.getElementById('conjunctionInput');

        // Describe Scene elements
        this.describeSceneContainer = document.getElementById('describeSceneContainer');
        this.describeSceneImage = document.getElementById('describeSceneImage');
        this.describeSceneInput = document.getElementById('describeSceneInput');

        // Describing elements
        this.describingContainer = document.getElementById('describingContainer');
        this.describingNamePrompt = document.getElementById('describingNamePrompt');
        this.describingNameInput = document.getElementById('describingNameInput');
        this.describingImage = document.getElementById('describingImage');
        this.describingQ1 = document.getElementById('describingQ1');
        this.describingQ2 = document.getElementById('describingQ2');
        this.describingQ3 = document.getElementById('describingQ3');
        this.describingQ4 = document.getElementById('describingQ4');
        this.describingA1 = document.getElementById('describingA1');
        this.describingA2 = document.getElementById('describingA2');
        this.describingA3 = document.getElementById('describingA3');
        this.describingA4 = document.getElementById('describingA4');

        // Describing Advanced elements
        this.describingAdvancedContainer = document.getElementById('describingAdvancedContainer');
        this.describingAdvancedImage = document.getElementById('describingAdvancedImage');
        this.describingAdvQ1 = document.getElementById('describingAdvQ1');
        this.describingAdvQ2 = document.getElementById('describingAdvQ2');
        this.describingAdvQ3 = document.getElementById('describingAdvQ3');
        this.describingAdvQ4 = document.getElementById('describingAdvQ4');
        this.describingAdvQ5 = document.getElementById('describingAdvQ5');
        this.describingAdvA1 = document.getElementById('describingAdvA1');
        this.describingAdvA2 = document.getElementById('describingAdvA2');
        this.describingAdvA3 = document.getElementById('describingAdvA3');
        this.describingAdvA4 = document.getElementById('describingAdvA4');
        this.describingAdvA5 = document.getElementById('describingAdvA5');

        // Descriptive Opposites elements
        this.descriptiveOppositesContainer = document.getElementById('descriptiveOppositesContainer');
        this.descriptiveOppImage1 = document.getElementById('descriptiveOppImage1');
        this.descriptiveOppImage2 = document.getElementById('descriptiveOppImage2');
        this.descriptiveOppWord1 = document.getElementById('descriptiveOppWord1');
        this.descriptiveOppWord2 = document.getElementById('descriptiveOppWord2');
        this.descriptiveOppInput = document.getElementById('descriptiveOppInput');

        // Do vs Does elements
        this.doDoesContainer = document.getElementById('doDoesContainer');
        this.doDoesImage = document.getElementById('doDoesImage');
        this.doDoesSentence = document.getElementById('doDoesSentence');
        this.doDoesChoiceA = document.getElementById('doDoesChoiceA');
        this.doDoesChoiceB = document.getElementById('doDoesChoiceB');

        // Expanding Sentences elements
        this.expandingSentencesContainer = document.getElementById('expandingSentencesContainer');
        this.expandingSentencesImage = document.getElementById('expandingSentencesImage');
        this.expandingWho = document.getElementById('expandingWho');
        this.expandingWhat = document.getElementById('expandingWhat');
        this.expandingWhere = document.getElementById('expandingWhere');

        // Figurative Language elements
        this.figurativeLanguageContainer = document.getElementById('figurativeLanguageContainer');
        this.idiomParagraph = document.getElementById('idiomParagraph');
        this.idiomImage = document.getElementById('idiomImage');
        this.idiomQuestion = document.getElementById('idiomQuestion');
        this.idiomChoiceA = document.getElementById('idiomChoiceA');
        this.idiomChoiceB = document.getElementById('idiomChoiceB');
        this.idiomChoiceC = document.getElementById('idiomChoiceC');

        // First Next Then Last elements
        this.firstNextThenLastContainer = document.getElementById('firstNextThenLastContainer');

        // Following Directions elements
        this.followingDirectionsContainer = document.getElementById('followingDirectionsContainer');

        // Function Labeling elements
        this.functionLabelingContainer = document.getElementById('functionLabelingContainer');
        this.functionLabelingImage = document.getElementById('functionLabelingImage');
        this.functionLabelingItem = document.getElementById('functionLabelingItem');
        this.functionLabelingInput = document.getElementById('functionLabelingInput');

        // Future Tense elements
        this.futureTenseContainer = document.getElementById('futureTenseContainer');
        this.futureTenseImage = document.getElementById('futureTenseImage');
        this.futureTenseVerb = document.getElementById('futureTenseVerb');
        this.futureTenseSentence = document.getElementById('futureTenseSentence');
        this.futureTenseInput = document.getElementById('futureTenseInput');

        // Has vs Have elements
        this.hasHaveContainer = document.getElementById('hasHaveContainer');
        this.hasHaveImage = document.getElementById('hasHaveImage');
        this.hasHaveSentence = document.getElementById('hasHaveSentence');
        this.hasHaveChoiceA = document.getElementById('hasHaveChoiceA');
        this.hasHaveChoiceB = document.getElementById('hasHaveChoiceB');

        // Homophones elements
        this.homophonesContainer = document.getElementById('homophonesContainer');
        this.homophonesImages = document.getElementById('homophonesImages');
        this.homophonesSentences = document.getElementById('homophonesSentences');
        this.homophonesCheckBtn = document.getElementById('homophonesCheckBtn');

        // How To elements
        this.howToContainer = document.getElementById('howToContainer');
        this.howToImage = document.getElementById('howToImage');
        this.howToQuestion = document.getElementById('howToQuestion');
        this.howToTextarea = document.getElementById('howToTextarea');
        this.howToCheckBtn = document.getElementById('howToCheckBtn');

        // Identify the Meaning elements (Idioms)
        this.identifyMeaningContainer = document.getElementById('identifyMeaningContainer');
        this.identifyMeaningParagraph = document.getElementById('identifyMeaningParagraph');
        this.identifyMeaningImage = document.getElementById('identifyMeaningImage');
        this.identifyMeaningQuestion = document.getElementById('identifyMeaningQuestion');
        this.identifyMeaningChoices = document.getElementById('identifyMeaningChoices');

        // Identify What Is Missing elements
        this.identifyMissingContainer = document.getElementById('identifyMissingContainer');
        this.identifyMissingImage = document.getElementById('identifyMissingImage');
        this.identifyMissingQuestion = document.getElementById('identifyMissingQuestion');
        this.identifyMissingInput = document.getElementById('identifyMissingInput');
        this.identifyMissingCheckBtn = document.getElementById('identifyMissingCheckBtn');

        // Identifying Parts of a Whole elements
        this.identifyingPartsContainer = document.getElementById('identifyingPartsContainer');
        this.identifyingPartsMainImage = document.getElementById('identifyingPartsMainImage');
        this.identifyingPartsHints = document.getElementById('identifyingPartsHints');
        this.identifyingPartsQuestion = document.getElementById('identifyingPartsQuestion');
        this.partInput1 = document.getElementById('partInput1');
        this.partInput2 = document.getElementById('partInput2');
        this.partInput3 = document.getElementById('partInput3');
        this.identifyingPartsCheckBtn = document.getElementById('identifyingPartsCheckBtn');

        // Idioms elements
        this.idiomsContainer = document.getElementById('idiomsContainer');
        this.idiomsImage = document.getElementById('idiomsImage');
        this.idiomsText = document.getElementById('idiomsText');
        this.idiomsQuestion = document.getElementById('idiomsQuestion');
        this.idiomsInput = document.getElementById('idiomsInput');
        this.idiomsCheckBtn = document.getElementById('idiomsCheckBtn');

        // Inferencing elements
        this.inferencingContainer = document.getElementById('inferencingContainer');
        this.inferencingImage = document.getElementById('inferencingImage');
        this.inferencingProgress = document.getElementById('inferencingProgress');
        this.inferencingFeedback1 = document.getElementById('inferencingFeedback1');
        this.inferencingFeedback2 = document.getElementById('inferencingFeedback2');
        this.inferencingQuestion = document.getElementById('inferencingQuestion');
        this.inferencingInput = document.getElementById('inferencingInput');
        this.inferencingCheckBtn = document.getElementById('inferencingCheckBtn');

        // Inferencing Level 1 elements
        this.inferencingLevel1Container = document.getElementById('inferencingLevel1Container');
        this.inferencingL1Image = document.getElementById('inferencingL1Image');
        this.inferencingL1Paragraph = document.getElementById('inferencingL1Paragraph');
        this.inferencingL1Question = document.getElementById('inferencingL1Question');
        this.inferencingL1Input = document.getElementById('inferencingL1Input');
        this.inferencingL1CheckBtn = document.getElementById('inferencingL1CheckBtn');

        // Inferencing Level 2 elements
        this.inferencingLevel2Container = document.getElementById('inferencingLevel2Container');
        this.inferencingL2Image = document.getElementById('inferencingL2Image');
        this.inferencingL2Title = document.getElementById('inferencingL2Title');
        this.inferencingL2Passage = document.getElementById('inferencingL2Passage');
        this.inferencingL2Progress = document.getElementById('inferencingL2Progress');
        this.inferencingL2Dot1 = document.getElementById('inferencingL2Dot1');
        this.inferencingL2Dot2 = document.getElementById('inferencingL2Dot2');
        this.inferencingL2Dot3 = document.getElementById('inferencingL2Dot3');
        this.inferencingL2Question = document.getElementById('inferencingL2Question');
        this.inferencingL2Input = document.getElementById('inferencingL2Input');
        this.inferencingL2CheckBtn = document.getElementById('inferencingL2CheckBtn');

        // Irregular Past Tense elements
        this.irregularPastTenseContainer = document.getElementById('irregularPastTenseContainer');
        this.irregularVerbHeader = document.getElementById('irregularVerbHeader');
        this.irregularVerbImage = document.getElementById('irregularVerbImage');
        this.irregularVerbSentence = document.getElementById('irregularVerbSentence');
        this.irregularVerbChoices = document.getElementById('irregularVerbChoices');

        // Irregular Plurals elements
        this.irregularPluralsContainer = document.getElementById('irregularPluralsContainer');
        this.irregularPluralImage = document.getElementById('irregularPluralImage');
        this.irregularPluralSingular = document.getElementById('irregularPluralSingular');
        this.irregularPluralInput = document.getElementById('irregularPluralInput');
        this.irregularPluralCheckBtn = document.getElementById('irregularPluralCheckBtn');

        // Is vs Are elements
        this.isVsAreContainer = document.getElementById('isVsAreContainer');
        this.isVsAreImage = document.getElementById('isVsAreImage');
        this.isVsAreSentence = document.getElementById('isVsAreSentence');
        this.isVsAreChoices = document.getElementById('isVsAreChoices');

        // Metaphors elements
        this.metaphorsContainer = document.getElementById('metaphorsContainer');
        this.metaphorsTitle = document.getElementById('metaphorsTitle');
        this.metaphorsImage = document.getElementById('metaphorsImage');
        this.metaphorsParagraph = document.getElementById('metaphorsParagraph');
        this.metaphorsQuestion = document.getElementById('metaphorsQuestion');
        this.metaphorsInput = document.getElementById('metaphorsInput');
        this.metaphorsCheckBtn = document.getElementById('metaphorsCheckBtn');

        // Metaphors Multiple Choice elements
        this.metaphorsMCContainer = document.getElementById('metaphorsMCContainer');
        this.metaphorsMCTitle = document.getElementById('metaphorsMCTitle');
        this.metaphorsMCImage = document.getElementById('metaphorsMCImage');
        this.metaphorsMCParagraph = document.getElementById('metaphorsMCParagraph');
        this.metaphorsMCQuestion = document.getElementById('metaphorsMCQuestion');
        this.metaphorsMCChoices = document.getElementById('metaphorsMCChoices');

        // Metaphors Elementary elements
        this.metaphorsElementaryContainer = document.getElementById('metaphorsElementaryContainer');
        this.metaphorsElementaryTitle = document.getElementById('metaphorsElementaryTitle');
        this.metaphorsElementaryImage = document.getElementById('metaphorsElementaryImage');
        this.metaphorsElementarySentence = document.getElementById('metaphorsElementarySentence');
        this.metaphorsElementaryQuestion = document.getElementById('metaphorsElementaryQuestion');
        this.metaphorsElementaryInput = document.getElementById('metaphorsElementaryInput');
        this.metaphorsElementaryCheckBtn = document.getElementById('metaphorsElementaryCheckBtn');

        // Metaphors Middle elements
        this.metaphorsMiddleContainer = document.getElementById('metaphorsMiddleContainer');
        this.metaphorsMiddleTitle = document.getElementById('metaphorsMiddleTitle');
        this.metaphorsMiddleImage = document.getElementById('metaphorsMiddleImage');
        this.metaphorsMiddleSentence = document.getElementById('metaphorsMiddleSentence');
        this.metaphorsMiddleQuestion = document.getElementById('metaphorsMiddleQuestion');
        this.metaphorsMiddleInput = document.getElementById('metaphorsMiddleInput');
        this.metaphorsMiddleCheckBtn = document.getElementById('metaphorsMiddleCheckBtn');

        // Multiple Meaning Words elements
        this.multipleMeaningContainer = document.getElementById('multipleMeaningContainer');
        this.multipleMeaningWord = document.getElementById('multipleMeaningWord');
        this.multipleMeaningImage = document.getElementById('multipleMeaningImage');
        this.multipleMeaningQuestion = document.getElementById('multipleMeaningQuestion');
        this.multipleMeaningInput1 = document.getElementById('multipleMeaningInput1');
        this.multipleMeaningInput2 = document.getElementById('multipleMeaningInput2');
        this.multipleMeaningFeedback1 = document.getElementById('multipleMeaningFeedback1');
        this.multipleMeaningFeedback2 = document.getElementById('multipleMeaningFeedback2');
        this.multipleMeaningCheckBtn = document.getElementById('multipleMeaningCheckBtn');

        // Naming And Categorizing elements
        this.namingCategorizingContainer = document.getElementById('namingCategorizingContainer');
        this.namingCategorizingImages = document.getElementById('namingCategorizingImages');
        this.namingCategorizingItem1 = document.getElementById('namingCategorizingItem1');
        this.namingCategorizingItem2 = document.getElementById('namingCategorizingItem2');
        this.namingCategorizingItem3 = document.getElementById('namingCategorizingItem3');
        this.namingCategorizingFeedback1 = document.getElementById('namingCategorizingFeedback1');
        this.namingCategorizingFeedback2 = document.getElementById('namingCategorizingFeedback2');
        this.namingCategorizingFeedback3 = document.getElementById('namingCategorizingFeedback3');
        this.namingCategorizingCategory = document.getElementById('namingCategorizingCategory');
        this.namingCategorizingCategoryFeedback = document.getElementById('namingCategorizingCategoryFeedback');
        this.namingCategorizingCheckBtn = document.getElementById('namingCategorizingCheckBtn');

        // Community Helpers elements
        this.communityHelpersContainer = document.getElementById('communityHelpersContainer');
        this.communityHelpersImage = document.getElementById('communityHelpersImage');
        this.communityHelpersQuestion = document.getElementById('communityHelpersQuestion');
        this.communityHelpersInput = document.getElementById('communityHelpersInput');
        this.communityHelpersFeedback = document.getElementById('communityHelpersFeedback');
        this.communityHelpersCheckBtn = document.getElementById('communityHelpersCheckBtn');

        // Noun Naming elements
        this.nounNamingContainer = document.getElementById('nounNamingContainer');
        this.nounNamingImage = document.getElementById('nounNamingImage');
        this.nounNamingQuestion = document.getElementById('nounNamingQuestion');
        this.nounNamingInput = document.getElementById('nounNamingInput');
        this.nounNamingFeedback = document.getElementById('nounNamingFeedback');
        this.nounNamingCheckBtn = document.getElementById('nounNamingCheckBtn');

        // Nouns Set Of Three elements
        this.nounsSetOfThreeContainer = document.getElementById('nounsSetOfThreeContainer');
        this.nounsSetOfThreeQuestion = document.getElementById('nounsSetOfThreeQuestion');
        this.nounsSetOfThreeImages = document.getElementById('nounsSetOfThreeImages');

        // Past Tense Irregular elements
        this.pastTenseIrregularContainer = document.getElementById('pastTenseIrregularContainer');
        this.pastTenseVerbHeader = document.getElementById('pastTenseVerbHeader');
        this.pastTenseImage = document.getElementById('pastTenseImage');
        this.pastTenseSentence = document.getElementById('pastTenseSentence');
        this.pastTenseChoices = document.getElementById('pastTenseChoices');

        // Possessives Common Nouns elements
        this.possessivesCommonContainer = document.getElementById('possessivesCommonContainer');
        this.possessivesCommonImage = document.getElementById('possessivesCommonImage');
        this.possessivesCommonSentence = document.getElementById('possessivesCommonSentence');
        this.possessivesCommonChoices = document.getElementById('possessivesCommonChoices');

        // Prepositions elements
        this.prepositionsContainer = document.getElementById('prepositionsContainer');
        this.prepositionsImage = document.getElementById('prepositionsImage');
        this.prepositionsQuestion = document.getElementById('prepositionsQuestion');
        this.prepositionsSentence = document.getElementById('prepositionsSentence');
        this.prepositionsInput = document.getElementById('prepositionsInput');
        this.prepositionsFeedback = document.getElementById('prepositionsFeedback');
        this.prepositionsCheckBtn = document.getElementById('prepositionsCheckBtn');

        // Problem Solving elements
        this.problemSolvingContainer = document.getElementById('problemSolvingContainer');
        this.problemSolvingImage = document.getElementById('problemSolvingImage');
        this.problemSolvingScenario = document.getElementById('problemSolvingScenario');
        this.problemSolvingQuestion = document.getElementById('problemSolvingQuestion');
        this.problemSolvingTextarea = document.getElementById('problemSolvingTextarea');
        this.problemSolvingFeedback = document.getElementById('problemSolvingFeedback');
        this.problemSolvingCheckBtn = document.getElementById('problemSolvingCheckBtn');

        // Problem Solving Images elements
        this.problemSolvingImagesContainer = document.getElementById('problemSolvingImagesContainer');
        this.problemSolvingImagesImage = document.getElementById('problemSolvingImagesImage');
        this.problemSolvingImagesQuestion = document.getElementById('problemSolvingImagesQuestion');
        this.problemSolvingImagesTextarea = document.getElementById('problemSolvingImagesTextarea');
        this.problemSolvingImagesFeedback = document.getElementById('problemSolvingImagesFeedback');
        this.problemSolvingImagesCheckBtn = document.getElementById('problemSolvingImagesCheckBtn');

        // Pronouns elements
        this.pronounsContainer = document.getElementById('pronounsContainer');
        this.pronounsImage = document.getElementById('pronounsImage');
        this.pronounsQuestion = document.getElementById('pronounsQuestion');
        this.pronounsSentence = document.getElementById('pronounsSentence');
        this.pronounsInput = document.getElementById('pronounsInput');
        this.pronounsFeedback = document.getElementById('pronounsFeedback');
        this.pronounsCheckBtn = document.getElementById('pronounsCheckBtn');

        // Questions For You elements
        this.questionsForYouContainer = document.getElementById('questionsForYouContainer');
        this.questionsForYouImage = document.getElementById('questionsForYouImage');
        this.questionsForYouQuestion = document.getElementById('questionsForYouQuestion');
        this.questionsForYouTextarea = document.getElementById('questionsForYouTextarea');
        this.questionsForYouSubmitBtn = document.getElementById('questionsForYouSubmitBtn');

        // Rhyming Fill In elements
        this.rhymingFillInContainer = document.getElementById('rhymingFillInContainer');
        this.rhymingImage1 = document.getElementById('rhymingImage1');
        this.rhymingImage2 = document.getElementById('rhymingImage2');
        this.rhymingWord1 = document.getElementById('rhymingWord1');
        this.rhymingInput = document.getElementById('rhymingInput');
        this.rhymingFeedback = document.getElementById('rhymingFeedback');
        this.rhymingCheckBtn = document.getElementById('rhymingCheckBtn');

        // Rhyming Match elements
        this.rhymingMatchContainer = document.getElementById('rhymingMatchContainer');
        this.rhymingMatchTargetImage = document.getElementById('rhymingMatchTargetImage');
        this.rhymingMatchTargetWord = document.getElementById('rhymingMatchTargetWord');
        this.rhymingMatchOptions = document.getElementById('rhymingMatchOptions');
        this.rhymingMatchCheckBtn = document.getElementById('rhymingMatchCheckBtn');

        // Safety Signs elements
        this.safetySignsContainer = document.getElementById('safetySignsContainer');
        this.safetySignsImage = document.getElementById('safetySignsImage');
        this.safetySignsType = document.getElementById('safetySignsType');
        this.safetySignsInput = document.getElementById('safetySignsInput');
        this.safetySignsFeedback = document.getElementById('safetySignsFeedback');
        this.safetySignsCheckBtn = document.getElementById('safetySignsCheckBtn');

        // Semantic Relationships elements
        this.semanticRelationshipsContainer = document.getElementById('semanticRelationshipsContainer');
        this.semanticImage = document.getElementById('semanticImage');
        this.semanticDescription = document.getElementById('semanticDescription');
        this.semanticQuestion = document.getElementById('semanticQuestion');
        this.semanticChoices = document.getElementById('semanticChoices');

        // Sequencing Images elements
        this.sequencingImagesContainer = document.getElementById('sequencingImagesContainer');
        this.sequencingImagesGrid = document.getElementById('sequencingImagesGrid');
        this.sequencingAnswerDisplay = document.getElementById('sequencingAnswerDisplay');
        this.sequencingCheckBtn = document.getElementById('sequencingCheckBtn');

        // Short Stories High elements
        this.shortStoriesHighContainer = document.getElementById('shortStoriesHighContainer');
        this.sshStoryImage = document.getElementById('sshStoryImage');
        this.sshStoryTitle = document.getElementById('sshStoryTitle');
        this.sshStoryText = document.getElementById('sshStoryText');
        this.sshQuestionNumber = document.getElementById('sshQuestionNumber');
        this.sshQuestionLabel = document.getElementById('sshQuestionLabel');
        this.sshAnswerInput = document.getElementById('sshAnswerInput');
        this.sshFeedback = document.getElementById('sshFeedback');
        this.sshCheckBtn = document.getElementById('sshCheckBtn');
        this.sshNextBtn = document.getElementById('sshNextBtn');

        // Short Stories Sequencing elements
        this.shortStoriesSequencingContainer = document.getElementById('shortStoriesSequencingContainer');
        this.sssStoryTitle = document.getElementById('sssStoryTitle');
        this.sssStoryText = document.getElementById('sssStoryText');
        this.sssQuestion = document.getElementById('sssQuestion');
        this.sssImagesGrid = document.getElementById('sssImagesGrid');
        this.sssAnswerDisplay = document.getElementById('sssAnswerDisplay');
        this.sssCheckBtn = document.getElementById('sssCheckBtn');

        // Sight Words elements
        this.sightWordsContainer = document.getElementById('sightWordsContainer');
        this.swImage = document.getElementById('swImage');
        this.swImageFallback = document.getElementById('swImageFallback');
        this.swWordDisplay = document.getElementById('swWordDisplay');
        this.swQuestion = document.getElementById('swQuestion');
        this.swInput = document.getElementById('swInput');
        this.swFeedback = document.getElementById('swFeedback');
        this.swCheckBtn = document.getElementById('swCheckBtn');

        // Negation elements
        this.negationContainer = document.getElementById('negationContainer');
        this.negationQuestion = document.getElementById('negationQuestion');
        this.negationImages = document.getElementById('negationImages');

        // Audio player
        this.audioPlayer = document.getElementById('audioPlayer');

        this._initialized = true;
    },

    /**
     * Get an element by ID with caching
     */
    get(id: string): HTMLElement | null {
        if (!this[id]) {
            this[id] = document.getElementById(id);
        }
        return this[id];
    },

    /**
     * Query selector with optional caching
     */
    query(selector: string, cacheKey?: string): Element | null {
        if (cacheKey && this[cacheKey]) {
            return this[cacheKey];
        }
        const el = document.querySelector(selector);
        if (cacheKey) {
            this[cacheKey] = el;
        }
        return el;
    }
};
