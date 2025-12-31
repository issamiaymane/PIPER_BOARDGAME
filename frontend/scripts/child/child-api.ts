/**
 * PIPER Child API Client
 * API calls for child/student in boardgame
 */

export const childApi = {
  baseUrl: '/api/piper',

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (SpeechGame.childState.token) {
      headers['Authorization'] = `Bearer ${SpeechGame.childState.token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  async login(username, password) {
    const data = await this.request('/child/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    SpeechGame.childState.setToken(data.token);
    SpeechGame.childState.setChild(data.child);
    SpeechGame.childState.setGoals(data.goals);
    SpeechGame.childState.showDemo = data.show_demo;

    return data;
  },

  async getMe() {
    const data = await this.request('/child/me');
    SpeechGame.childState.setChild(data.child);
    SpeechGame.childState.setGoals(data.goals);
    // Restore active session if one exists
    if (data.activeSession) {
      SpeechGame.childState.setSession(data.activeSession);
    }
    return data;
  },

  async markDemoSeen() {
    await this.request('/child/demo-seen', { method: 'POST' });
    SpeechGame.childState.showDemo = false;
  },

  async startSession(goalId = null) {
    const data = await this.request('/child/session/start', {
      method: 'POST',
      body: JSON.stringify({ goal_id: goalId }),
    });
    SpeechGame.childState.setSession(data);
    return data;
  },

  async recordTrial(trialData) {
    if (!SpeechGame.childState.currentSession) {
      throw new Error('No active session');
    }

    const data = await this.request('/child/session/trial', {
      method: 'POST',
      body: JSON.stringify({
        session_id: SpeechGame.childState.currentSession.session_id,
        ...trialData,
      }),
    });
    return data;
  },

  async endSession() {
    if (!SpeechGame.childState.currentSession) {
      throw new Error('No active session');
    }

    const data = await this.request('/child/session/end', {
      method: 'POST',
      body: JSON.stringify({
        session_id: SpeechGame.childState.currentSession.session_id,
      }),
    });

    SpeechGame.childState.setSession(null);
    return data;
  },

  /**
   * Get AI-powered feedback for a trial
   * Uses language or articulation prompt based on child's problem_type
   * @param {string} category - Card category
   * @param {string} question - The question/prompt
   * @param {string} expectedAnswer - Expected correct answer
   * @param {string} userAnswer - Child's answer
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {number} promptLevel - 1=MAX (full support), 2=MOD (moderate), 3=MIN (minimal)
   */
  async getFeedback(category, question, expectedAnswer, userAnswer, isCorrect, promptLevel = null) {
    try {
      // Get prompt level from active goal if not provided
      const level = promptLevel || SpeechGame.childState.getPromptLevel();

      const data = await this.request('/child/feedback', {
        method: 'POST',
        body: JSON.stringify({
          category,
          question,
          expected_answer: expectedAnswer,
          user_answer: userAnswer,
          is_correct: isCorrect,
          prompt_level: level,
        }),
      });
      return data.feedback;
    } catch (error) {
      console.error('AI feedback error:', error);
      // Fallback to simple feedback
      if (isCorrect) {
        return "Great job! That's correct!";
      } else {
        return `Good try! The answer is: ${expectedAnswer}`;
      }
    }
  },

  logout() {
    SpeechGame.childState.logout();
  },
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.childApi = childApi;
