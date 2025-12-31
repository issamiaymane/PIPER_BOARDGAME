/**
 * PIPER Child UI
 * UI components for child login and gameplay
 */

export const childUI = {
  _trialStartTime: null,

  init() {
    this.createModals();
    this.bindEvents();
    this.checkExistingAuth();
  },

  createModals() {
    // Child Login Modal (hidden by default - will show only if needed)
    const loginModal = document.createElement('div');
    loginModal.id = 'child-login-modal';
    loginModal.className = 'piper-modal hidden';
    loginModal.innerHTML = `
      <div class="piper-modal-content">
        <h2>Welcome!</h2>
        <p style="text-align: center; margin-bottom: 20px; color: #666;">Enter your username and password to play</p>
        <form id="child-login-form">
          <div class="piper-form-group">
            <label for="child-username">Username</label>
            <input type="text" id="child-username" required autocomplete="username">
          </div>
          <div class="piper-form-group">
            <label for="child-password">Password</label>
            <input type="password" id="child-password" required autocomplete="current-password">
          </div>
          <div class="piper-form-error hidden" id="child-login-error"></div>
          <button type="submit" class="piper-btn piper-btn-primary">Let's Play!</button>
        </form>
      </div>
    `;
    document.body.appendChild(loginModal);

    // Demo Video Modal
    const demoModal = document.createElement('div');
    demoModal.id = 'child-demo-modal';
    demoModal.className = 'piper-modal hidden';
    demoModal.innerHTML = `
      <div class="piper-modal-content piper-modal-wide">
        <h2>Welcome to the Game!</h2>
        <div id="demo-video-container" style="margin: 20px 0; text-align: center;">
          <p style="padding: 40px; background: #f5f5f5; border-radius: 8px; color: #666;">
            Demo video will be shown here.<br>
            <small>Ask your therapist about how to play!</small>
          </p>
        </div>
        <button id="demo-continue-btn" class="piper-btn piper-btn-primary">I'm Ready to Play!</button>
      </div>
    `;
    document.body.appendChild(demoModal);

    // Session Progress UI (overlay during game)
    const sessionUI = document.createElement('div');
    sessionUI.id = 'child-session-ui';
    sessionUI.className = 'child-session-ui hidden';
    sessionUI.innerHTML = `
      <div class="child-session-header">
        <span id="child-session-name"></span>
        <div class="child-session-buttons">
          <button id="child-end-session-btn" class="piper-btn piper-btn-primary" style="padding: 4px 12px; font-size: 12px;">End Session</button>
          <button id="child-logout-btn" class="piper-btn piper-btn-secondary" style="padding: 4px 12px; font-size: 12px;">Logout</button>
        </div>
      </div>
      <div class="child-session-progress">
        <div class="child-progress-bar">
          <div id="child-progress-fill" class="child-progress-fill"></div>
        </div>
        <span id="child-progress-text">0/0</span>
      </div>
    `;
    document.body.appendChild(sessionUI);

    // Session Summary Modal
    const summaryModal = document.createElement('div');
    summaryModal.id = 'child-summary-modal';
    summaryModal.className = 'piper-modal hidden';
    summaryModal.innerHTML = `
      <div class="piper-modal-content" style="text-align: center;">
        <h2 id="summary-title">Great Job!</h2>
        <div id="summary-stars" style="font-size: 48px; margin: 20px 0;"></div>
        <p id="summary-message" style="font-size: 18px; margin-bottom: 20px;"></p>
        <div id="summary-stats" style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Correct:</strong> <span id="summary-correct">0</span> / <span id="summary-total">0</span></p>
          <p><strong>Score:</strong> <span id="summary-accuracy">0</span>%</p>
        </div>
        <button id="summary-continue-btn" class="piper-btn piper-btn-primary">Play Again!</button>
      </div>
    `;
    document.body.appendChild(summaryModal);

    // Add child-specific styles
    this.addStyles();
  },

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .child-session-ui {
        position: fixed;
        top: 10px;
        left: 10px;
        background: white;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 180px;
      }
      .child-session-ui.hidden { display: none; }
      .child-session-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 12px;
      }
      #child-session-name {
        font-weight: 600;
        color: #667eea;
      }
      .child-session-buttons {
        display: flex;
        gap: 6px;
      }
      .child-session-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .child-progress-bar {
        flex: 1;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      .child-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transition: width 0.3s;
        width: 0%;
      }
      #child-progress-text {
        font-size: 12px;
        color: #666;
        min-width: 50px;
        text-align: right;
      }
    `;
    document.head.appendChild(style);
  },

  bindEvents() {
    // Login form
    document.getElementById('child-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Demo continue
    document.getElementById('demo-continue-btn')?.addEventListener('click', () => {
      this.handleDemoContinue();
    });

    // Logout
    document.getElementById('child-logout-btn')?.addEventListener('click', () => {
      this.handleLogout();
    });

    // End Session
    document.getElementById('child-end-session-btn')?.addEventListener('click', () => {
      this.endSessionAndShowSummary();
    });

    // Summary continue
    document.getElementById('summary-continue-btn')?.addEventListener('click', () => {
      this.closeModal('child-summary-modal');
      // Restart game or show menu
      this.startNewSession();
    });
  },

  async checkExistingAuth() {
    // No saved token - show login
    if (!SpeechGame.childState.token) {
      this.showModal('child-login-modal');
      return;
    }

    // Token exists - validate it with the server
    console.log('Found existing token, validating...');

    try {
      await SpeechGame.childApi.getMe();
      console.log('Token valid, restoring session');
      // Token is valid - user is already logged in, no need to show login modal
      this.onLoginSuccess();
    } catch (error) {
      // Token invalid or expired - clear it and show login
      console.log('Token invalid, clearing session:', error.message);
      SpeechGame.childState.logout();
      this.showModal('child-login-modal');
    }
  },

  async handleLogin() {
    const username = document.getElementById('child-username').value;
    const password = document.getElementById('child-password').value;
    const errorEl = document.getElementById('child-login-error');

    errorEl.classList.add('hidden');

    try {
      const result = await SpeechGame.childApi.login(username, password);
      this.closeModal('child-login-modal');

      if (result.show_demo) {
        this.showModal('child-demo-modal');
      } else {
        this.onLoginSuccess();
      }
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  async handleDemoContinue() {
    try {
      await SpeechGame.childApi.markDemoSeen();
    } catch (e) {
      console.error('Error marking demo seen:', e);
    }
    this.closeModal('child-demo-modal');
    this.onLoginSuccess();
  },

  onLoginSuccess() {
    const child = SpeechGame.childState.child;
    if (!child) return;

    // Update session UI
    document.getElementById('child-session-name').textContent = child.first_name;
    document.getElementById('child-session-ui').classList.remove('hidden');

    // Install the goal-based filter for targets (before populating)
    this.installGoalFilter();

    // Show only the relevant category tab based on problem type
    this.filterCategoryTabs(child.problem_type || 'language');

    // Check if there's an existing session to restore
    const existingSession = SpeechGame.childState.currentSession;
    if (existingSession) {
      // Restore progress display from existing session
      this.updateProgress(existingSession.correct_trials || 0, existingSession.total_trials || 0);
      console.log('Restored existing session:', existingSession.session_id);
    } else {
      // Start new session
      this.startNewSession();
    }

    // Show notification based on goal status
    if (SpeechGame.ui?.showNotification) {
      const hasGoals = SpeechGame.childState.hasGoals();
      const nonMasteredGoals = SpeechGame.childState.getNonMasteredGoals();
      const allMastered = SpeechGame.childState.allGoalsMastered();

      if (!hasGoals) {
        // No IEP goals assigned - child can practice all available cards
        SpeechGame.ui.showNotification(`Welcome ${child.first_name}! Let's practice together!`, 'success');
      } else if (allMastered) {
        SpeechGame.ui.showNotification(`Amazing work, ${child.first_name}! You've mastered all your goals! 🎉`, 'success');
      } else if (nonMasteredGoals.length > 0) {
        SpeechGame.ui.showNotification(`Welcome ${child.first_name}! You have ${nonMasteredGoals.length} goal${nonMasteredGoals.length > 1 ? 's' : ''} to practice.`, 'success');
      } else {
        SpeechGame.ui.showNotification(`Welcome back, ${child.first_name}!`, 'success');
      }
    }
  },

  // Install filter to only show targets from IEP goals
  // If child has no IEP goals, shows ALL categories (no filtering)
  installGoalFilter() {
    // Save original function if not already saved
    if (!this._originalPopulateTargets && typeof window.populateTargets === 'function') {
      this._originalPopulateTargets = window.populateTargets;
    }

    // Check if child has any IEP goals assigned
    const hasGoals = SpeechGame.childState.hasGoals();
    const allowedCategories = SpeechGame.childState.getAllowedCategories();

    // If child has NO IEP goals OR no active goals with categories, show ALL cards
    if (!hasGoals || !allowedCategories) {
      this._allowedCategories = null;

      if (!hasGoals) {
        console.log('Child has no IEP goals assigned - showing ALL categories');
      } else {
        console.log('No active goal categories - showing ALL categories');
      }

      // Restore original populateTargets to show all cards
      if (this._originalPopulateTargets) {
        window.populateTargets = this._originalPopulateTargets;
      }
      return;
    }

    // Child has active goals with categories - install filter
    this._allowedCategories = allowedCategories;
    console.log('IEP Goal categories:', Array.from(allowedCategories));

    // Override populateTargets to filter based on goals
    const self = this;
    window.populateTargets = function(category) {
      self.populateTargetsFiltered(category);
    };
  },

  // Filtered version of populateTargets that only shows goal categories
  populateTargetsFiltered(category) {
    const dom = SpeechGame.dom;
    if (!dom || !dom.targetList) return;

    dom.targetList.innerHTML = '';

    // Get targets data
    const targets = window.targetsData?.[category] || [];
    const allowedCategories = this._allowedCategories;

    // If no goals, use original function
    if (!allowedCategories) {
      if (this._originalPopulateTargets) {
        this._originalPopulateTargets(category);
      }
      return;
    }

    let currentHeader = null;
    let hasItemsInSection = false;

    targets.forEach(target => {
      // Check if this is a section header
      if (target.startsWith('---')) {
        // Store header, we'll add it only if section has matching items
        currentHeader = target;
        hasItemsInSection = false;
        return;
      }

      // Check if this target is in the allowed categories
      if (!allowedCategories.has(target)) {
        return; // Skip targets not in goals
      }

      // Add section header if this is first item in section
      if (currentHeader && !hasItemsInSection) {
        const header = document.createElement('p');
        header.className = 'target-section-header';
        header.textContent = currentHeader.substring(3);
        dom.targetList.appendChild(header);
        hasItemsInSection = true;
      }

      // Create target item
      const item = document.createElement('div');
      item.className = 'target-item';

      const hasCards = typeof window.categoryHasCards === 'function'
        ? window.categoryHasCards(target)
        : true;
      if (!hasCards) item.classList.add('no-cards');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'target-checkbox';
      checkbox.id = target.replace(/\s+/g, '-').toLowerCase();
      checkbox.checked = true; // Auto-check goal categories
      if (!hasCards) checkbox.disabled = true;

      const label = document.createElement('label');
      label.className = 'target-label';
      label.htmlFor = checkbox.id;
      label.textContent = target;

      item.appendChild(checkbox);
      item.appendChild(label);
      dom.targetList.appendChild(item);
    });

    // If no matching targets found, show message
    if (dom.targetList.children.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'empty-state';
      msg.style.cssText = 'text-align: center; padding: 20px; color: #666;';
      msg.textContent = 'No practice cards available for your goals in this category.';
      dom.targetList.appendChild(msg);
    }
  },

  filterCategoryTabs(problemType) {
    const tabs = document.querySelectorAll('.category-tab');
    let firstVisibleTab = null;
    tabs.forEach(tab => {
      const category = tab.dataset.category;
      // Show tab if it matches problemType, or if problemType is 'both' show both language and articulation
      const shouldShow = category === problemType ||
        (problemType === 'both' && (category === 'language' || category === 'articulation'));

      if (shouldShow) {
        tab.style.display = '';
        if (!firstVisibleTab) {
          firstVisibleTab = tab;
        }
      } else {
        tab.style.display = 'none';
        tab.classList.remove('active');
      }
    });

    // Activate and click the first visible tab
    if (firstVisibleTab) {
      tabs.forEach(t => t.classList.remove('active'));
      firstVisibleTab.classList.add('active');
      firstVisibleTab.click();
    }
  },

  async startNewSession() {
    // Don't start a new session if one already exists
    if (SpeechGame.childState.currentSession) {
      console.log('Session already active:', SpeechGame.childState.currentSession.session_id);
      return;
    }

    const goal = SpeechGame.childState.getActiveGoal();

    try {
      const session = await SpeechGame.childApi.startSession(goal?.id);

      // Reset progress display
      this.updateProgress(0, 0);

      console.log('Session started:', session);
    } catch (error) {
      console.error('Error starting session:', error);
      if (SpeechGame.ui?.showNotification) {
        SpeechGame.ui.showNotification('Error starting session: ' + error.message, 'error');
      }
    }
  },

  handleLogout() {
    // Don't end the session on logout - keep it in progress so child can resume later
    SpeechGame.childApi.logout();
    document.getElementById('child-session-ui').classList.add('hidden');
    this.showModal('child-login-modal');
  },

  // Trial recording - called from base-handler.js
  startTrialTimer() {
    this._trialStartTime = Date.now();
  },

  async recordTrial(cardData, userAnswer, isCorrect) {
    if (!SpeechGame.childState.isLoggedIn() || !SpeechGame.childState.currentSession) {
      return;
    }

    const responseTime = this._trialStartTime ? Date.now() - this._trialStartTime : null;

    try {
      const result = await SpeechGame.childApi.recordTrial({
        card_category: cardData.category || cardData.subcategory || 'Unknown',
        card_data: JSON.stringify(cardData),
        user_answer: userAnswer,
        is_correct: isCorrect,
        response_time_ms: responseTime,
      });

      // Update progress display
      if (result.running_accuracy) {
        this.updateProgress(result.running_accuracy.correct, result.running_accuracy.total);
      }

      return result;
    } catch (error) {
      console.error('Failed to record trial:', error);
    }
  },

  updateProgress(correct, total) {
    const fill = document.getElementById('child-progress-fill');
    const text = document.getElementById('child-progress-text');

    if (fill && total > 0) {
      const percent = (correct / total) * 100;
      fill.style.width = `${percent}%`;
    }

    if (text) {
      text.textContent = `${correct}/${total}`;
    }
  },

  async endSessionAndShowSummary() {
    if (!SpeechGame.childState.currentSession) return;

    try {
      const result = await SpeechGame.childApi.endSession();
      const session = result.session;

      // Show summary
      this.showSummary(session);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  },

  showSummary(session) {
    const accuracy = session.accuracy_percentage || 0;

    // Set stars based on accuracy
    let stars = '';
    if (accuracy >= 80) stars = '⭐⭐⭐';
    else if (accuracy >= 60) stars = '⭐⭐';
    else if (accuracy >= 40) stars = '⭐';
    else stars = '🌟';

    // Set message based on accuracy
    let message = '';
    if (accuracy >= 80) message = 'Amazing work! You did fantastic!';
    else if (accuracy >= 60) message = 'Great job! Keep practicing!';
    else if (accuracy >= 40) message = 'Good effort! Let\'s try again!';
    else message = 'Nice try! Practice makes perfect!';

    document.getElementById('summary-stars').textContent = stars;
    document.getElementById('summary-message').textContent = message;
    document.getElementById('summary-correct').textContent = session.correct_trials || 0;
    document.getElementById('summary-total').textContent = session.total_trials || 0;
    document.getElementById('summary-accuracy').textContent = accuracy.toFixed(0);

    this.showModal('child-summary-modal');
  },

  showModal(modalId) {
    this.closeAllModals();
    document.getElementById(modalId)?.classList.remove('hidden');
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  },

  closeAllModals() {
    document.querySelectorAll('.piper-modal').forEach((modal) => {
      modal.classList.add('hidden');
    });
  },
};

// Attach to namespace for backward compatibility
window.SpeechGame = window.SpeechGame || {};
window.SpeechGame.childUI = childUI;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only init if we're on the boardgame page
  if (document.getElementById('game-board') || document.querySelector('.game-container')) {
    childUI.init();
  }
});
