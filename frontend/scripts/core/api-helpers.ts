/**
 * API Helpers Module
 * Centralized API calls for AI-powered answer checking
 */

export const api = {
    baseUrl: typeof API_BASE !== 'undefined' ? API_BASE : '/api',

    async call(endpoint, data) {
        try {
            SpeechGame.ui.showNotification('PIPER is checking...', '🤖', 'info', 1500);
            const response = await fetch(this.baseUrl + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('API request failed');
            return await response.json();
        } catch (error) {
            console.error('API call error:', error);
            return null;
        }
    },

    async checkAntonym(word, userAnswer) {
        return this.call('/check-antonym', { word, userAnswer });
    },

    async checkBeforeAfter(title, before, after, userAnswer) {
        return this.call('/check-before-after', { title, before, after, userAnswer });
    },

    async checkTemporalConcept(question, expectedAnswer, userAnswer) {
        return this.call('/check-temporal-concept', { question, expectedAnswer, userAnswer });
    },

    async checkCategory(category, validItems, userAnswer) {
        return this.call('/check-category', { category, validItems, userAnswer });
    },

    async checkComparatives(word, comparative, superlative, userComparative, userSuperlative) {
        return this.call('/check-comparatives', { word, comparative, superlative, userComparative, userSuperlative });
    },

    async checkCompareContrast(item1, item2, sameAnswer, differentAnswer) {
        return this.call('/check-compare-contrast', { item1, item2, sameAnswer, differentAnswer });
    },

    async checkDescribeScene(imagePath, description) {
        return this.call('/check-describe-scene', { imagePath, description });
    },

    async checkDescribing(data) {
        return this.call('/check-describing', data);
    },

    async checkDescribingAdvanced(data) {
        return this.call('/check-describing-advanced', data);
    },

    async checkDescriptiveOpposite(word1, word2, userAnswer) {
        return this.call('/check-descriptive-opposite', { word1, word2, userAnswer });
    },

    async checkExpandingSentences(image, whoAnswer, whatAnswer, whereAnswer) {
        return this.call('/check-expanding-sentences', { image, whoAnswer, whatAnswer, whereAnswer });
    },

    async checkCommonItem(question, validAnswers, userAnswer) {
        return this.call('/check-common-item', { question, validAnswers, userAnswer });
    },

    async checkCategoryLabel(items, validAnswers, userAnswer) {
        return this.call('/check-category-label', { items, validAnswers, userAnswer });
    },

    async checkSpatialConcept(sentence, expectedAnswer, userAnswer) {
        return this.call('/check-spatial-concept', { sentence, expectedAnswer, userAnswer });
    },

    async checkFunctionLabel(item, validFunctions, userAnswer) {
        return this.call('/check-function-label', { item, validFunctions, userAnswer });
    },

    async checkFutureTense(verb, expectedAnswer, userAnswer) {
        return this.call('/check-future-tense', { verb, expectedAnswer, userAnswer });
    },

    async checkHomophone(sentence, expectedAnswer, userAnswer, allWords) {
        return this.call('/check-homophones', { sentence, expectedAnswer, userAnswer, allWords });
    },

    async checkHowTo(question, expectedSteps, keywords, userAnswer) {
        return this.call('/check-how-to', { question, expectedSteps, keywords, userAnswer });
    },

    async checkMissing(validAnswers, userAnswer) {
        return this.call('/check-missing', { validAnswers, userAnswer });
    },

    async checkParts(item, validParts, userParts) {
        return this.call('/check-parts', { item, validParts, userParts });
    },

    async checkIdiom(idiom, validMeanings, userAnswer) {
        return this.call('/check-idiom', { idiom, validMeanings, userAnswer });
    },

    async checkInference(imageContext, question, validAnswers, userAnswer) {
        return this.call('/check-inference', { imageContext, question, validAnswers, userAnswer });
    },

    async checkPlural(singular, validPlurals, userAnswer) {
        return this.call('/check-plural', { singular, validPlurals, userAnswer });
    },

    async checkMetaphor(metaphor, context, validMeanings, userAnswer) {
        return this.call('/check-metaphor', { metaphor, context, validMeanings, userAnswer });
    },

    async checkMultipleMeaning(word, meanings, userMeaning1, userMeaning2) {
        return this.call('/check-multiple-meaning', { word, meanings, userMeaning1, userMeaning2 });
    },

    async checkNamingCategory(items, category, userItems, userCategory) {
        return this.call('/check-naming-category', { items, category, userItems, userCategory });
    },

    async checkCommunityHelper(validAnswers, userAnswer) {
        return this.call('/check-community-helper', { validAnswers, userAnswer });
    },

    async checkNoun(validAnswers, userAnswer) {
        return this.call('/check-noun', { validAnswers, userAnswer });
    },

    async checkPreposition(validPrepositions, userAnswer) {
        return this.call('/check-preposition', { validPrepositions, userAnswer });
    },

    async checkProblemSolving(scenario, validSolutions, keywords, userAnswer) {
        return this.call('/check-problem-solving', { scenario, validSolutions, keywords, userAnswer });
    },

    async checkProblemSolvingImages(imageContext, validSolutions, keywords, userAnswer) {
        return this.call('/check-problem-solving', { imageContext, validSolutions, keywords, userAnswer });
    },

    async checkPronoun(validAnswers, userAnswer) {
        return this.call('/check-pronoun', { validAnswers, userAnswer });
    },

    async checkRhyme(word1, validRhymes, userAnswer) {
        return this.call('/check-rhyme', { word1, validRhymes, userAnswer });
    },

    async checkSignMeaning(signType, validMeanings, keywords, userAnswer) {
        return this.call('/check-sign-meaning', { signType, validMeanings, keywords, userAnswer });
    },

    async checkStoryComprehension(story, questionType, keywords, validAnswers, userAnswer) {
        return this.call('/check-story-comprehension', { story, questionType, keywords, validAnswers, userAnswer });
    },

    async checkSightWord(word, validAnswers, userAnswer) {
        return this.call('/check-sight-word', { word, validAnswers, userAnswer });
    },

    async checkSimile(simile, questionType, validAnswers, userAnswer, meaning, comparedItems) {
        return this.call('/check-simile', { simile, questionType, validAnswers, userAnswer, meaning, comparedItems });
    },

    async checkSimileMeaning(simile, validMeanings, userAnswer) {
        return this.call('/check-simile-meaning', { simile, validMeanings, userAnswer });
    },

    async checkSynonym(word, validSynonyms, userAnswer) {
        return this.call('/check-synonym', { word, validSynonyms, userAnswer });
    },

    async checkPrediction(scenario, sampleAnswers, userAnswer) {
        return this.call('/check-prediction', { scenario, sampleAnswers, userAnswer });
    },

    async checkWhAnswer(questionWord, question, expectedAnswerType, sampleAnswers, userAnswer) {
        return this.call('/check-wh-answer', { questionWord, question, expectedAnswerType, sampleAnswers, userAnswer });
    }
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.api = api;
