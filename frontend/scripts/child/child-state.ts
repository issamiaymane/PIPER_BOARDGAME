/**
 * PIPER Child State
 * State management for child/student in boardgame
 */

export const childState = {
  token: localStorage.getItem('piper_child_token'),
  child: null,
  goals: [],
  currentSession: null,
  showDemo: false,

  isLoggedIn() {
    return !!this.token && !!this.child;
  },

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('piper_child_token', token);
    } else {
      localStorage.removeItem('piper_child_token');
    }
  },

  setChild(child) {
    this.child = child;
  },

  setGoals(goals) {
    this.goals = goals || [];
  },

  setSession(session) {
    this.currentSession = session;
  },

  getActiveGoal() {
    // Return first goal that is:
    // 1. NOT mastered, AND
    // 2. NOT past deadline
    // This ensures ONE goal per session focus
    const activeGoals = this.getActiveGoals();
    return activeGoals.length > 0 ? activeGoals[0] : null;
  },

  getPromptLevel() {
    const goal = this.getActiveGoal();
    return goal ? goal.current_prompt_level : 2;
  },

  // Check if a goal's deadline has passed
  // Deadline format: ISO date "YYYY-MM-DD" (e.g., "2025-04-30")
  // Also supports legacy "By April 2025" format for backwards compatibility
  isGoalPastDeadline(goal) {
    if (!goal.deadline) return false;

    let deadlineDate;

    // Check if ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(goal.deadline)) {
      deadlineDate = new Date(goal.deadline + 'T23:59:59');
    }
    // Legacy format: "By April 2025"
    else {
      const match = goal.deadline.match(/By\s+(\w+)\s+(\d{4})/i);
      if (!match) return false;

      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const monthIndex = monthNames.indexOf(match[1].toLowerCase());
      if (monthIndex === -1) return false;

      const year = parseInt(match[2], 10);
      deadlineDate = new Date(year, monthIndex + 1, 0); // Last day of month
    }

    if (isNaN(deadlineDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > deadlineDate;
  },

  // Format deadline for display: "2025-04-30" → "By April 2025"
  formatDeadline(deadline) {
    if (!deadline) return '';

    // If already in "By Month Year" format, return as is
    if (deadline.startsWith('By ')) return deadline;

    // Parse ISO date
    const date = new Date(deadline);
    if (isNaN(date.getTime())) return deadline;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `By ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  },

  // Get goals that are still active (not mastered AND not past deadline)
  getActiveGoals() {
    if (!this.goals || this.goals.length === 0) return [];

    return this.goals.filter(goal => {
      // Skip mastered goals
      if (goal.is_mastered) return false;
      // Skip goals past deadline
      if (this.isGoalPastDeadline(goal)) return false;
      return true;
    });
  },

  // Get categories from ONLY the active goal (one goal per session)
  // This ensures focused therapy practice
  // Returns null if no goals assigned OR no active goals - showing all categories
  getAllowedCategories() {
    // If child has NO IEP goals assigned at all, show ALL categories
    if (!this.hasGoals()) {
      console.log('No IEP goals assigned - showing ALL categories');
      return null;
    }

    const activeGoal = this.getActiveGoal();

    if (!activeGoal) {
      // Has goals but none active (all mastered or past deadline)
      console.log('No active goals (all mastered/past deadline) - showing all categories');
      return null;
    }

    // Return categories from ONLY the active goal
    const categories = new Set();
    if (activeGoal.mapped_categories) {
      try {
        const cats = typeof activeGoal.mapped_categories === 'string'
          ? JSON.parse(activeGoal.mapped_categories)
          : activeGoal.mapped_categories;
        cats.forEach(cat => categories.add(cat));
      } catch (e) {
        console.error('Error parsing goal categories:', e);
      }
    }

    // If goal has no mapped categories, show all categories
    if (categories.size === 0) {
      console.log('Active goal has no mapped categories - showing all categories');
      return null;
    }

    console.log('Session focus: ONE goal -', activeGoal.goal_type, '- Categories:', Array.from(categories));
    return categories;
  },

  // Get non-mastered goals only (legacy - use getActiveGoals instead)
  getNonMasteredGoals() {
    if (!this.goals || this.goals.length === 0) return [];
    return this.goals.filter(goal => !goal.is_mastered);
  },

  // Check if all goals are mastered
  allGoalsMastered() {
    if (!this.goals || this.goals.length === 0) return false;
    return this.goals.every(goal => goal.is_mastered);
  },

  hasGoals() {
    return this.goals && this.goals.length > 0;
  },

  logout() {
    this.token = null;
    this.child = null;
    this.goals = [];
    this.currentSession = null;
    localStorage.removeItem('piper_child_token');
  },

  reset() {
    this.logout();
  },
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.childState = childState;
