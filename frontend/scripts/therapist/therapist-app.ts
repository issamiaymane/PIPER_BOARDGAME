/**
 * Therapist Dashboard App
 */

export const TherapistApp = {
  currentTherapist: null,
  currentStudent: null,
  students: [],
  goalTypes: [],

  // All categories by problem type - sourced from boardgame-data.js (single source of truth)
  get allCategories() {
    return getBoardGameCategories();
  },

  // Format deadline for display: "2025-04-30" → "By April 2025"
  formatDeadline(deadline) {
    if (!deadline) return '';
    if (deadline.startsWith('By ')) return deadline;

    // Parse ISO date (YYYY-MM-DD)
    const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return deadline;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(match[2], 10) - 1;
    return `By ${monthNames[monthIndex]} ${match[1]}`;
  },

  async init() {
    // Start loading animation
    this.startLoadingAnimation();

    this.bindEvents();

    // Wait for auth check to complete before hiding loading screen
    await this.checkAuth();

    // Hide loading screen after auth check is done
    this.hideLoadingScreen();
  },

  startLoadingAnimation() {
    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
          progress = 90;
          clearInterval(interval);
        }
        loadingBar.style.width = progress + '%';
      }, 100);
      this.loadingInterval = interval;
    }
  },

  hideLoadingScreen() {
    const loadingBar = document.getElementById('loadingBar');
    const loadingScreen = document.getElementById('loadingScreen');

    if (loadingBar) {
      loadingBar.style.width = '100%';
    }

    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }

    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
    }, 300);
  },

  bindEvents() {
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('register-form').classList.remove('hidden');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').classList.add('hidden');
      document.getElementById('login-form').classList.remove('hidden');
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      this.handleLogout();
    });

    // Student management
    document.getElementById('add-student-btn').addEventListener('click', () => {
      this.showModal('add-student-modal');
    });

    document.getElementById('add-student-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddStudent();
    });

    // Edit Evaluation Data form
    document.getElementById('edit-eval-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveEvalData();
    });

    // Goals - Edit Manually opens the edit goals modal with existing goals
    document.getElementById('add-goal-btn')?.addEventListener('click', () => {
      this.editGoalsManually();
    });

    // Add New Goal - opens the add goal modal directly
    document.getElementById('add-new-goal-btn')?.addEventListener('click', () => {
      this.loadGoalTypes();
      this.showModal('add-goal-modal');
    });

    document.getElementById('add-goal-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddGoal();
    });

    // Upload Goals PDF
    document.getElementById('upload-goals-btn')?.addEventListener('click', () => {
      this.showModal('goal-upload-modal');
      this.resetGoalUploadModal();
    });

    // Goal upload dropzone handlers
    this.setupGoalUploadDropzone();

    // Note: goal-type select was replaced with multi-select checkboxes
    // No change event needed - checkboxes work directly

    // SOAP
    document.getElementById('copy-soap-btn').addEventListener('click', () => {
      this.copySoapToClipboard();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    // Close modal on backdrop click
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });
  },

  async checkAuth() {
    if (!TherapistAPI.token) {
      this.showAuthScreen();
      return;
    }

    try {
      const therapist = await TherapistAPI.getMe();
      this.currentTherapist = therapist;
      this.showDashboard();
    } catch {
      TherapistAPI.logout();
      this.showAuthScreen();
    }
  },

  showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('dashboard-screen').classList.add('hidden');
  },

  showDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('dashboard-screen').classList.remove('hidden');

    if (this.currentTherapist) {
      document.getElementById('therapist-name').textContent =
        `${this.currentTherapist.first_name} ${this.currentTherapist.last_name}`;
    }

    this.loadStudents();
  },

  async handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.classList.add('hidden');

    try {
      const result = await TherapistAPI.login(email, password);
      this.currentTherapist = result.therapist;
      this.showDashboard();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  async handleRegister() {
    const firstName = document.getElementById('reg-first').value;
    const lastName = document.getElementById('reg-last').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const credentials = document.getElementById('reg-credentials').value;
    const errorEl = document.getElementById('register-error');

    errorEl.classList.add('hidden');

    try {
      const result = await TherapistAPI.register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        credentials: credentials || undefined,
      });
      this.currentTherapist = result.therapist;
      this.showDashboard();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  handleLogout() {
    TherapistAPI.logout();
    this.currentTherapist = null;
    this.currentStudent = null;
    this.showAuthScreen();
  },

  async loadStudents() {
    const listEl = document.getElementById('student-list');
    listEl.innerHTML = '<p class="empty-state">Loading...</p>';

    try {
      this.students = await TherapistAPI.getStudents();

      if (this.students.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No students yet. Click "+ Add" to create one.</p>';
        return;
      }

      listEl.innerHTML = this.students
        .map(
          (s) => `
        <div class="student-item" data-id="${s.id}">
          <span class="student-avatar">${s.avatar_emoji || '🧒'}</span>
          <div class="student-info">
            <div class="student-name">${s.first_name} ${s.last_name}</div>
            <div class="student-meta">${s.grade_level || ''} ${s.problem_type ? `- ${s.problem_type}` : ''}</div>
          </div>
        </div>
      `
        )
        .join('');

      // Bind click events
      listEl.querySelectorAll('.student-item').forEach((item) => {
        item.addEventListener('click', () => {
          this.selectStudent(parseInt(item.dataset.id));
        });
      });
    } catch (error) {
      listEl.innerHTML = `<p class="empty-state" style="color: red;">Error: ${error.message}</p>`;
    }
  },

  async selectStudent(studentId) {
    // Update UI selection
    document.querySelectorAll('.student-item').forEach((item) => {
      item.classList.toggle('active', parseInt(item.dataset.id) === studentId);
    });

    try {
      const student = await TherapistAPI.getStudent(studentId);
      this.currentStudent = student;
      this.renderStudentProfile(student);
    } catch (error) {
      alert('Error loading student: ' + error.message);
    }
  },

  async renderStudentProfile(student) {
    document.getElementById('no-student-selected').classList.add('hidden');
    document.getElementById('student-profile').classList.remove('hidden');

    // Basic info
    document.getElementById('profile-avatar').textContent = student.avatar_emoji || '🧒';
    document.getElementById('profile-name').textContent = `${student.first_name} ${student.last_name}`;
    document.getElementById('profile-details').textContent = [student.grade_level, student.diagnosis]
      .filter(Boolean)
      .join(' - ');

    const problemBadgeContainer = document.getElementById('profile-problem-type');
    if (student.problem_type === 'both') {
      problemBadgeContainer.innerHTML = `
        <span class="problem-badge language">Language</span>
        <span class="problem-badge articulation">Articulation</span>
      `;
    } else {
      problemBadgeContainer.innerHTML = student.problem_type
        ? `<span class="problem-badge ${student.problem_type}">${student.problem_type}</span>`
        : '';
    }

    // Eval data
    this.renderEvalData(student);

    // Goals
    await this.loadStudentGoals(student.id);

    // Sessions
    await this.loadStudentSessions(student.id);

    // Credentials
    document.getElementById('child-username').textContent = student.username || 'Not set';

    // Bind profile action buttons
    document.getElementById('edit-student-btn').onclick = () => this.editStudent(student);
    document.getElementById('delete-student-btn').onclick = () => this.deleteStudent(student.id);
    document.getElementById('edit-eval-btn').onclick = () => this.editEvalData(student);
    document.getElementById('upload-eval-btn').onclick = () => this.openEvalUploadModal(student);
    document.getElementById('reset-password-btn').onclick = () => this.resetPassword(student.id);
  },

  renderEvalData(student) {
    const container = document.getElementById('eval-data-display');

    if (!student.eval_data) {
      container.innerHTML = '<p class="empty-state">No evaluation data entered yet. Click "Edit Eval Data" to add information.</p>';
      return;
    }

    let evalData;
    try {
      evalData = typeof student.eval_data === 'string' ? JSON.parse(student.eval_data) : student.eval_data;
    } catch {
      container.innerHTML = '<p class="empty-state">Invalid evaluation data.</p>';
      return;
    }

    // Check if there's any data to show
    const hasData = Object.values(evalData).some(v => v && (Array.isArray(v) ? v.length > 0 : true));
    if (!hasData) {
      container.innerHTML = '<p class="empty-state">No evaluation data entered yet. Click "Edit Eval Data" to add information.</p>';
      return;
    }

    const priorTherapyLabels = {
      'none': 'No prior therapy',
      'less-1': 'Less than 1 year',
      '1-2': '1-2 years',
      '2-3': '2-3 years',
      '3+': '3+ years'
    };

    let html = '<div class="eval-grid">';

    // Background Information
    if (evalData.languages_spoken) {
      html += `<div class="eval-item"><label>Languages Spoken</label><div class="value">${evalData.languages_spoken}</div></div>`;
    }
    if (evalData.other_diagnoses) {
      html += `<div class="eval-item"><label>Other Diagnoses</label><div class="value">${evalData.other_diagnoses}</div></div>`;
    }
    if (evalData.medical_history) {
      html += `<div class="eval-item full-width"><label>Medical History</label><div class="value">${evalData.medical_history}</div></div>`;
    }

    // Speech/Language History
    if (evalData.speech_diagnoses) {
      html += `<div class="eval-item full-width"><label>Speech/Language Diagnoses</label><div class="value">${evalData.speech_diagnoses}</div></div>`;
    }
    if (evalData.prior_therapy) {
      html += `<div class="eval-item"><label>Prior Speech Therapy</label><div class="value">${priorTherapyLabels[evalData.prior_therapy] || evalData.prior_therapy}</div></div>`;
    }
    if (evalData.baseline_accuracy !== undefined && evalData.baseline_accuracy !== null) {
      html += `<div class="eval-item"><label>Baseline Accuracy</label><div class="value">${evalData.baseline_accuracy}%</div></div>`;
    }

    // Assessment Results
    if (evalData.goals_benchmarks) {
      html += `<div class="eval-item full-width"><label>Speech Goals & Benchmarks</label><div class="value">${evalData.goals_benchmarks}</div></div>`;
    }
    if (evalData.strengths) {
      html += `<div class="eval-item"><label>Strengths</label><div class="value">${evalData.strengths}</div></div>`;
    }
    if (evalData.weaknesses) {
      html += `<div class="eval-item"><label>Weaknesses</label><div class="value">${evalData.weaknesses}</div></div>`;
    }
    if (evalData.target_sounds?.length) {
      html += `<div class="eval-item"><label>Target Sounds</label><div class="value">${evalData.target_sounds.join(', ')}</div></div>`;
    }

    // Contacts
    if (evalData.teachers) {
      html += `<div class="eval-item full-width"><label>Teacher Contacts</label><div class="value">${evalData.teachers}</div></div>`;
    }
    if (evalData.family_religion) {
      html += `<div class="eval-item"><label>Family Religion/Cultural Notes</label><div class="value">${evalData.family_religion}</div></div>`;
    }
    if (evalData.notes) {
      html += `<div class="eval-item full-width"><label>Additional Notes</label><div class="value">${evalData.notes}</div></div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },

  async loadStudentGoals(studentId) {
    const container = document.getElementById('goals-list');
    container.innerHTML = '<p class="empty-state">Loading goals...</p>';

    try {
      const goals = await TherapistAPI.getStudentGoals(studentId);

      if (goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No goals yet. Add IEP goals to track progress.</p>';
        return;
      }

      // Fetch progress for each goal
      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          try {
            const response = await TherapistAPI.getGoalProgress(goal.id);
            // API returns { goal, progress, threshold_status }
            return { ...goal, progress: response.progress, threshold_status: response.threshold_status };
          } catch {
            return { ...goal, progress: null, threshold_status: null };
          }
        })
      );

      container.innerHTML = goalsWithProgress
        .map((goal) => {
          const status = this.getGoalStatus(goal);
          const progressBar = goal.progress
            ? `<div class="goal-progress-bar">
                <div class="goal-progress-fill" style="width: ${goal.progress.progress_percentage || 0}%"></div>
              </div>`
            : '';

          const deadlineHtml = goal.deadline ? `<div class="goal-deadline">Deadline: ${this.formatDeadline(goal.deadline)}</div>` : '';
          const baselineHtml = goal.baseline ? `<div class="goal-baseline">Baseline: ${goal.baseline}</div>` : '';
          const commentsHtml = goal.comments ? `<div class="goal-comments">Notes: ${goal.comments}</div>` : '';

          return `
        <div class="goal-item ${status.class}" data-id="${goal.id}">
          <div class="goal-header">
            <div class="goal-type">${this.getGoalTypeLabel(goal.goal_type)}</div>
            <span class="goal-status-badge ${status.class}">${status.label}</span>
          </div>
          ${deadlineHtml}
          <div class="goal-description">${goal.goal_description}</div>
          ${baselineHtml}
          ${progressBar}
          <div class="goal-meta">
            <span>Target: ${goal.target_percentage}%</span>
            <span>Current: ${goal.progress ? goal.progress.current_accuracy.toFixed(0) : 0}%</span>
            <span>Prompt: ${this.getPromptLabel(goal.current_prompt_level)}</span>
            <span>Sessions: ${goal.progress ? goal.progress.sessions_completed : 0}</span>
          </div>
          ${commentsHtml}
        </div>
      `;
        })
        .join('');

      // Bind click for SOAP
      container.querySelectorAll('.goal-item').forEach((item) => {
        item.addEventListener('click', () => {
          this.showGoalSOAP(parseInt(item.dataset.id));
        });
      });
    } catch (error) {
      container.innerHTML = `<p class="empty-state" style="color: red;">Error: ${error.message}</p>`;
    }
  },

  // Determine goal status based on progress
  getGoalStatus(goal) {
    if (!goal.is_active) {
      return { label: 'Inactive', class: 'status-inactive' };
    }

    // Check for active session first (child is currently playing)
    if (goal.progress?.has_active_session) {
      return { label: 'In Progress', class: 'status-progress' };
    }

    if (!goal.progress) {
      return { label: 'Not Started', class: 'status-not-started' };
    }

    const { current_accuracy, progress_percentage, sessions_completed } = goal.progress;
    const targetMet = current_accuracy >= goal.target_percentage;
    const atMinPrompt = goal.current_prompt_level === 3; // MIN level

    // Goal is MASTERED if: at target accuracy + MIN prompt level + enough sessions
    if (targetMet && atMinPrompt && sessions_completed >= goal.sessions_to_confirm) {
      return { label: 'Mastered', class: 'status-mastered' };
    }

    // Approaching mastery: meeting target but not at MIN prompt yet
    if (targetMet) {
      return { label: 'Approaching', class: 'status-approaching' };
    }

    // Making progress: some sessions completed
    if (sessions_completed > 0) {
      if (progress_percentage >= 80) {
        return { label: 'Good Progress', class: 'status-good' };
      }
      if (progress_percentage >= 50) {
        return { label: 'In Progress', class: 'status-progress' };
      }
      return { label: 'Needs Work', class: 'status-needs-work' };
    }

    return { label: 'Not Started', class: 'status-not-started' };
  },

  async loadStudentSessions(studentId) {
    const container = document.getElementById('sessions-list');
    container.innerHTML = '<p class="empty-state">Loading sessions...</p>';

    try {
      const sessions = await TherapistAPI.getStudentSessions(studentId);

      if (sessions.length === 0) {
        container.innerHTML = '<p class="empty-state">No sessions yet.</p>';
        return;
      }

      container.innerHTML = sessions
        .map((session) => {
          const date = new Date(session.start_time).toLocaleDateString();
          const hasSoap = session.soap_subjective ? '📋' : '';

          // Show "Current" only for sessions that are still in progress
          const isCurrentSession = session.status === 'in_progress';
          const hasTrials = session.total_trials > 0;

          // Determine accuracy display
          let accuracyClass, accuracyText;
          if (isCurrentSession) {
            accuracyClass = 'current';
            accuracyText = 'Current';
          } else if (!hasTrials) {
            accuracyClass = 'empty';
            accuracyText = 'Empty';
          } else {
            accuracyClass = session.accuracy_percentage >= 70 ? 'good' : session.accuracy_percentage >= 50 ? 'moderate' : 'low';
            accuracyText = `${session.accuracy_percentage.toFixed(0)}%`;
          }

          // Determine stats and hint text
          let statsText, hintText, itemTitle;
          if (isCurrentSession) {
            statsText = hasTrials ? `In progress (${session.correct_trials}/${session.total_trials})` : 'In progress - No cards played';
            hintText = hasTrials ? 'Click for SOAP Note' : 'No activity yet';
            itemTitle = hasTrials ? 'Click to view/edit SOAP Note' : 'No cards played yet';
          } else if (!hasTrials) {
            statsText = 'No cards played';
            hintText = 'No SOAP available';
            itemTitle = 'Session has no activity - SOAP not available';
          } else {
            statsText = `${session.correct_trials}/${session.total_trials} trials`;
            hintText = 'Click for SOAP Note';
            itemTitle = 'Click to view/edit SOAP Note';
          }

          return `
          <div class="session-item${!hasTrials ? ' session-empty' : ''}" data-id="${session.id}" data-has-trials="${hasTrials}" title="${itemTitle}">
            <div class="session-info">
              <div class="session-date">${date} ${hasSoap}</div>
              <div class="session-stats">${statsText}</div>
              <div class="session-hint">${hintText}</div>
            </div>
            <span class="session-accuracy ${accuracyClass}">${accuracyText}</span>
          </div>
        `;
        })
        .join('');

      // Bind click for SOAP - only for sessions with trials
      container.querySelectorAll('.session-item').forEach((item) => {
        item.addEventListener('click', () => {
          const hasTrials = item.dataset.hasTrials === 'true';
          if (hasTrials) {
            this.showSessionSOAP(parseInt(item.dataset.id));
          } else {
            SpeechGame.ui.showNotification('No SOAP note available - session has no card activity', 'warning');
          }
        });
      });
    } catch (error) {
      container.innerHTML = `<p class="empty-state" style="color: red;">Error: ${error.message}</p>`;
    }
  },

  async handleAddStudent() {
    const errorEl = document.getElementById('add-student-error');
    errorEl.classList.add('hidden');

    const data = {
      first_name: document.getElementById('student-first').value,
      last_name: document.getElementById('student-last').value,
      grade_level: document.getElementById('student-grade').value || undefined,
      date_of_birth: document.getElementById('student-dob').value || undefined,
      username: document.getElementById('student-username').value,
      password: document.getElementById('student-password').value,
    };

    try {
      await TherapistAPI.createStudent(data);
      this.closeAllModals();
      this.clearForm('add-student-form');
      await this.loadStudents();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  loadGoalTypes() {
    if (!this.currentStudent) {
      console.error('No student selected');
      return;
    }

    const container = document.getElementById('goal-type-checkboxes');
    container.innerHTML = '<div class="category-select-prompt">Select a category above to see available goal types</div>';

    // Set up category tab click handlers
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach((tab) => {
      tab.classList.remove('active');
      tab.onclick = () => this.selectGoalCategory(tab.dataset.category);
    });

    // Hide the categories preview since we're now using direct category selection
    document.getElementById('goal-categories').classList.add('hidden');
  },

  selectGoalCategory(category) {
    const container = document.getElementById('goal-type-checkboxes');

    // Update active tab
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // Helper function to generate multi-select checkboxes
    const generateCheckboxes = (categories) => {
      if (categories.length === 0) return '<div class="category-select-prompt">No categories available</div>';

      let html = '';
      let currentGroup = null;

      categories.forEach((cat) => {
        if (cat.startsWith('---')) {
          // Section header
          if (currentGroup !== null) html += '</div>';
          const groupName = cat.replace('---', '').trim();
          currentGroup = groupName;
          html += `<div class="category-group"><div class="category-group-header">${groupName}</div>`;
        } else {
          // Category checkbox
          html += `
            <label class="category-checkbox">
              <input type="checkbox" name="goal-type" value="${cat}">
              <span>${cat}</span>
            </label>`;
        }
      });
      if (currentGroup !== null) html += '</div>';
      return html;
    };

    // Show categories for selected type
    const categories = this.allCategories[category] || [];
    container.innerHTML = generateCheckboxes(categories);
  },

  showGoalCategories(categoryName) {
    // Hide categories preview - category is now directly selected
    document.getElementById('goal-categories').classList.add('hidden');
  },

  // Temporarily store manual goal data for after SLP review confirmation
  _pendingManualGoal: null,

  async handleAddGoal() {
    if (!this.currentStudent) {
      alert('No student selected');
      return;
    }

    const errorEl = document.getElementById('add-goal-error');
    errorEl.classList.add('hidden');

    // Collect selected goal types from checkboxes
    const selectedGoalTypes = [];
    const checkboxes = document.querySelectorAll('#goal-type-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(cb => {
      if (cb.value) selectedGoalTypes.push(cb.value);
    });

    const goalDescription = document.getElementById('goal-description').value;

    // Validation
    if (selectedGoalTypes.length === 0) {
      errorEl.textContent = 'Please select at least one Goal Type';
      errorEl.classList.remove('hidden');
      return;
    }

    if (!goalDescription) {
      errorEl.textContent = 'Please enter a Goal Description';
      errorEl.classList.remove('hidden');
      return;
    }

    const data = {
      goal_type: selectedGoalTypes[0], // Primary goal type for backwards compatibility
      goal_types: selectedGoalTypes, // All selected types
      goal_description: goalDescription,
      target_percentage: parseInt(document.getElementById('goal-target').value),
      sessions_to_confirm: parseInt(document.getElementById('goal-sessions').value),
      deadline: document.getElementById('goal-deadline').value || undefined,
      baseline: document.getElementById('goal-baseline').value || undefined,
      comments: document.getElementById('goal-comments').value || undefined,
    };

    // Store goal and show SLP review modal
    this._pendingManualGoal = data;
    this.showSLPReviewModal('add_manual_goal', 'IEP Goal');
  },

  async _executeAddManualGoal() {
    if (!this._pendingManualGoal || !this.currentStudent) return;

    const errorEl = document.getElementById('add-goal-error');

    try {
      await TherapistAPI.createGoal(this.currentStudent.id, this._pendingManualGoal);
      this._pendingManualGoal = null;
      this.closeAllModals();
      this.clearForm('add-goal-form');
      await this.loadStudentGoals(this.currentStudent.id);
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      this._pendingManualGoal = null;
    }
  },

  // Goal Upload Functions
  extractedGoals: [],
  extractedServiceType: null, // 'language', 'articulation', or null (AI-detected)

  resetGoalUploadModal() {
    document.getElementById('goal-upload-state').classList.remove('hidden');
    document.getElementById('goal-loading-state').classList.add('hidden');
    document.getElementById('goal-review-state').classList.add('hidden');
    document.getElementById('goal-upload-error').classList.add('hidden');
    document.getElementById('goal-password-field').classList.add('hidden');
    document.getElementById('goal-file-input').value = '';
    document.getElementById('goal-pdf-password').value = '';
    this.extractedGoals = [];
    this.extractedServiceType = null;
    this.pendingGoalFile = null;
  },

  setupGoalUploadDropzone() {
    const dropzone = document.getElementById('goal-dropzone');
    const fileInput = document.getElementById('goal-file-input');

    if (!dropzone || !fileInput) return;

    // Click to browse
    dropzone.onclick = () => fileInput.click();

    // File input change
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        this.handleGoalFileSelect(e.target.files[0]);
      }
    };

    // Drag events
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    };

    dropzone.ondragleave = () => {
      dropzone.classList.remove('dragover');
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleGoalFileSelect(e.dataTransfer.files[0]);
      }
    };
  },

  async handleGoalFileSelect(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Maximum size is 20MB');
      return;
    }

    // Store file for potential retry with password
    this.pendingGoalFile = file;

    // Get password if provided
    const password = document.getElementById('goal-pdf-password').value || null;

    // Show loading state
    document.getElementById('goal-upload-state').classList.add('hidden');
    document.getElementById('goal-loading-state').classList.remove('hidden');
    document.getElementById('goal-upload-error').classList.add('hidden');

    try {
      // Upload and extract
      const result = await TherapistAPI.uploadGoals(this.currentStudent.id, file, password);

      // Clear pending file on success
      this.pendingGoalFile = null;

      // Store extraction data (baseline is now per-goal, not top-level)
      this.extractedGoals = result.extracted_data.goals || [];
      // Service type comes from student's evaluation data (not extracted from goals PDF)
      this.extractedServiceType = result.service_type || this.currentStudent?.problem_type || null;
      // Store extraction notes
      this.goalExtractionNotes = result.extraction_notes || result.extracted_data.extraction_notes || '';

      // Show review state
      await this.showGoalReviewState();
    } catch (error) {
      // Check if password is required
      if (error.message.includes('PASSWORD_REQUIRED') || error.message.includes('password protected')) {
        // Show password field and prompt user
        document.getElementById('goal-loading-state').classList.add('hidden');
        document.getElementById('goal-upload-state').classList.remove('hidden');
        document.getElementById('goal-password-field').classList.remove('hidden');
        document.getElementById('goal-pdf-password').focus();
        return;
      }

      const errorEl = document.getElementById('goal-upload-error');
      errorEl.textContent = 'Upload failed: ' + error.message;
      errorEl.classList.remove('hidden');
      // Go back to upload state
      document.getElementById('goal-loading-state').classList.add('hidden');
      document.getElementById('goal-upload-state').classList.remove('hidden');
    }
  },

  // Retry goal upload with password
  async retryGoalUploadWithPassword() {
    if (this.pendingGoalFile) {
      document.getElementById('goal-upload-error').classList.add('hidden');
      await this.handleGoalFileSelect(this.pendingGoalFile);
    }
  },

  async showGoalReviewState() {
    document.getElementById('goal-loading-state').classList.add('hidden');
    document.getElementById('goal-review-state').classList.remove('hidden');

    // Load PDF in iframe
    try {
      const pdfUrl = TherapistAPI.getGoalsPdfUrl(this.currentStudent.id);
      const response = await fetch(pdfUrl, {
        headers: { 'Authorization': `Bearer ${TherapistAPI.token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        document.getElementById('goal-pdf-frame').src = blobUrl;
      }
    } catch (err) {
      console.error('Failed to load goals PDF:', err);
    }

    // Display extraction notes
    const notesDisplay = document.getElementById('goal-extraction-notes-display');
    if (notesDisplay && this.goalExtractionNotes) {
      notesDisplay.textContent = this.goalExtractionNotes;
    }

    // Render extracted goals (baseline is now per-goal, not top-level)
    this.renderExtractedGoals();
  },

  renderExtractedGoals() {
    const container = document.getElementById('extracted-goals-list');
    if (!container) return;

    if (!this.extractedGoals || this.extractedGoals.length === 0) {
      container.innerHTML = '<p class="empty-state">No goals could be extracted. Please add goals manually.</p>';
      return;
    }

    // Confidence threshold for highlighting fields that need review
    const CONFIDENCE_THRESHOLD = 0.7;

    // Helper to get confidence class for a field
    const getConfidenceClass = (fieldData) => {
      if (!fieldData?.value || fieldData.confidence < CONFIDENCE_THRESHOLD) {
        return 'low-confidence';
      } else if (fieldData.confidence >= 0.85) {
        return 'high-confidence';
      }
      return '';
    };

    // Get categories from boardgame data (single source of truth)
    const boardGameCategories = getBoardGameCategories();

    // Helper function to find matching categories based on AI-detected goal type
    const findMatchingCategories = (aiDetectedType, availableCategories) => {
      if (!aiDetectedType) return [];

      const matches = [];
      const lowerType = aiDetectedType.toLowerCase();

      // NEW: Check if AI returned an exact section header (e.g., "---S Sound")
      // The updated backend prompt now returns these exact category names
      if (aiDetectedType.startsWith('---')) {
        // Find all cards under this section header
        const sectionName = aiDetectedType;
        let inSection = false;
        availableCategories.forEach(cat => {
          if (cat === sectionName) {
            inSection = true;
            return;
          }
          if (cat.startsWith('---')) {
            inSection = false;
            return;
          }
          if (inSection) {
            matches.push(cat);
          }
        });
        if (matches.length > 0) return matches;
      }

      // LEGACY FALLBACK: Map legacy artic_* keys to sound letters (for backwards compatibility)
      const legacyArticMap = {
        'artic_s': ['S'],
        'artic_r': ['R'],
        'artic_l': ['L'],
        'artic_th': ['Th'],
        'artic_k_g': ['K', 'G'],
        'artic_f_v': ['F', 'V'],
        'artic_sh_ch': ['Sh', 'Ch'],
        'artic_z': ['Z'],
        'artic_j': ['J'],
        'artic_blends': ['Blends', 'Clusters'],
        'artic_other': [],
      };

      // LEGACY FALLBACK: Map legacy language keys to category keywords
      const legacyLangMap = {
        'compare_contrast': ['compare', 'contrast'],
        'object_description': ['describing', 'description'],
        'wh_questions': ['wh'],
        'category_naming': ['categories', 'category'],
        'grammar_syntax': ['grammar', 'syntax', 'verbs', 'pronouns'],
        'similarities_differences': ['similarities', 'differences'],
        'inferencing': ['inferencing'],
        'problem_solving': ['problem solving'],
        'following_directions': ['following directions', 'directions'],
        'vocabulary': ['vocabulary'],
      };

      // Check if it's a legacy articulation key
      if (legacyArticMap[lowerType]) {
        const soundPrefixes = legacyArticMap[lowerType];

        // Special handling for artic_blends - match all blend and cluster cards
        if (lowerType === 'artic_blends') {
          availableCategories.forEach(cat => {
            if (cat.startsWith('---')) return;
            if (cat.includes('Blends') || cat.includes('Clusters') || cat.includes('Cluster')) {
              matches.push(cat);
            }
          });
          return matches;
        }

        availableCategories.forEach(cat => {
          if (cat.startsWith('---')) return;
          for (const prefix of soundPrefixes) {
            // Only match cards that START with the sound letter (e.g., "R Initial", "S Final")
            // Also match special cases like "Vocalic R", "L Blends", "S Blends", "R Blends"
            if (cat.startsWith(prefix + ' ') ||
                cat.startsWith('Vocalic ' + prefix) ||
                cat.startsWith(prefix + ' Blends')) {
              matches.push(cat);
              break;
            }
          }
        });
        return matches;
      }

      // Check if it's a legacy language key
      if (legacyLangMap[lowerType]) {
        const keywords = legacyLangMap[lowerType];
        availableCategories.forEach(cat => {
          if (cat.startsWith('---')) return;
          const lowerCat = cat.toLowerCase();
          for (const keyword of keywords) {
            if (lowerCat.includes(keyword)) {
              matches.push(cat);
              break;
            }
          }
        });
        return matches;
      }

      // Extract key patterns from AI-detected type
      // E.g., "/r/ sound" → "r", "Articulation - /s/" → "s", "Following Directions" → "following directions"
      const soundMatch = lowerType.match(/\/([a-z]+)\//);
      const soundLetter = soundMatch ? soundMatch[1].toUpperCase() : null;

      availableCategories.forEach(cat => {
        if (cat.startsWith('---')) return; // Skip section headers

        const lowerCat = cat.toLowerCase();

        // Exact match
        if (lowerCat === lowerType) {
          matches.push(cat);
          return;
        }

        // Sound-based matching (e.g., AI says "/r/ sound" → match "R Initial...", "R Medial...", etc.)
        if (soundLetter && cat.startsWith(soundLetter + ' ')) {
          matches.push(cat);
          return;
        }

        // Vocalic R special case
        if (lowerType.includes('vocalic') && lowerType.includes('r') && lowerCat.includes('vocalic r')) {
          matches.push(cat);
          return;
        }

        // Keyword matching for language goals
        const keywords = ['adjectives', 'adverbs', 'pronouns', 'verbs', 'nouns', 'prepositions',
          'following directions', 'wh questions', 'wh-questions', 'categories', 'compare', 'contrast',
          'inferencing', 'problem solving', 'vocabulary', 'grammar', 'syntax', 'sequencing',
          'describing', 'similarities', 'differences', 'antonyms', 'synonyms'];

        for (const keyword of keywords) {
          if (lowerType.includes(keyword) && lowerCat.includes(keyword)) {
            matches.push(cat);
            return;
          }
        }

        // Partial match - if AI type contains significant part of category name
        const catWords = lowerCat.split(/[\s\-]+/).filter(w => w.length > 2);
        const typeWords = lowerType.split(/[\s\-]+/).filter(w => w.length > 2);
        const matchingWords = catWords.filter(cw => typeWords.some(tw => cw.includes(tw) || tw.includes(cw)));
        if (matchingWords.length >= 2) {
          matches.push(cat);
        }
      });

      return matches;
    };

    // Helper function to generate multi-select checkboxes for categories
    const generateCategoryCheckboxes = (categories, goalIndex, selectedCategories = []) => {
      let html = '';
      let currentGroup = null;

      categories.forEach((cat) => {
        if (cat.startsWith('---')) {
          // Section header
          if (currentGroup !== null) html += '</div>';
          const groupName = cat.replace('---', '').trim();
          currentGroup = groupName;
          html += `<div class="category-group"><div class="category-group-header">${groupName}</div>`;
        } else {
          // Category checkbox
          const isChecked = selectedCategories.includes(cat) ? 'checked' : '';
          html += `
            <label class="category-checkbox">
              <input type="checkbox" value="${cat}" data-goal-index="${goalIndex}" ${isChecked}>
              <span>${cat}</span>
            </label>`;
        }
      });
      if (currentGroup !== null) html += '</div>';
      return html;
    };

    container.innerHTML = this.extractedGoals.map((goal, index) => {
      // Determine which categories to show based on service type
      let categoriesToShow = [];
      if (this.extractedServiceType === 'articulation') {
        categoriesToShow = boardGameCategories.articulation || [];
      } else if (this.extractedServiceType === 'language') {
        categoriesToShow = boardGameCategories.language || [];
      } else {
        // Both or not detected - show all
        categoriesToShow = [...(boardGameCategories.language || []), ...(boardGameCategories.articulation || [])];
      }

      // Get existing selected categories for this goal (if any)
      // First check if we have explicit goal_types, otherwise try to match AI-detected type to categories
      let existingGoalTypes = goal.goal_types || [];
      if (existingGoalTypes.length === 0 && goal.goal_type?.value) {
        // Try to find matching categories based on AI-detected goal type
        existingGoalTypes = findMatchingCategories(goal.goal_type.value, categoriesToShow);
      }
      const description = goal.description?.value || '';
      const deadline = goal.deadline?.value || '';
      const baseline = goal.baseline?.value || '';
      const targetAccuracy = goal.target_accuracy?.value ?? null;
      const sessionsToConfirm = goal.sessions_to_confirm?.value ?? null;
      const comments = goal.comments?.value || '';

      // Get confidence classes for each field
      const baselineClass = getConfidenceClass(goal.baseline);
      const deadlineClass = getConfidenceClass(goal.deadline);
      const descriptionClass = getConfidenceClass(goal.description);
      const goalTypeClass = getConfidenceClass(goal.goal_type);
      const targetClass = getConfidenceClass(goal.target_accuracy);
      const sessionsClass = getConfidenceClass(goal.sessions_to_confirm);
      const commentsClass = getConfidenceClass(goal.comments);

      // Get source hints for tooltips
      const baselineHint = goal.baseline?.source_hint || '';
      const deadlineHint = goal.deadline?.source_hint || '';
      const descriptionHint = goal.description?.source_hint || '';
      const goalTypeHint = goal.goal_type?.reasoning || goal.goal_type?.source_hint || '';
      const targetHint = goal.target_accuracy?.source_hint || '';
      const sessionsHint = goal.sessions_to_confirm?.source_hint || '';
      const commentsHint = goal.comments?.source_hint || '';

      return `
        <div class="extracted-goal-card" data-index="${index}">
          <div class="goal-card-header">
            <label class="goal-checkbox">
              <input type="checkbox" checked data-goal-index="${index}">
              <span class="goal-card-title">Goal ${index + 1}</span>
            </label>
          </div>
          <div class="goal-card-body">
            <!-- Measurable Baseline -->
            <div class="goal-card-field goal-baseline-field ${baselineClass}" ${baselineHint ? `title="${baselineHint}"` : ''}>
              <label>Measurable Baseline:</label>
              <input type="text" class="goal-edit-baseline" data-goal-index="${index}" value="${baseline}" placeholder="e.g., 40% at the word level">
              ${baselineHint ? `<span class="field-hint">${baselineHint}</span>` : ''}
            </div>

            <!-- Proposed Goal Section -->
            <div class="proposed-goal-section">
              <h4 class="proposed-goal-header">Proposed Goal:</h4>

              <!-- 1. Deadline -->
              <div class="goal-card-field ${deadlineClass}" ${deadlineHint ? `title="${deadlineHint}"` : ''}>
                <label>Deadline:</label>
                <input type="text" class="goal-edit-deadline" data-goal-index="${index}" value="${deadline}" placeholder="e.g., By April 2025">
                ${deadlineHint ? `<span class="field-hint">${deadlineHint}</span>` : ''}
              </div>

              <!-- 2. Description -->
              <div class="goal-card-field ${descriptionClass}" ${descriptionHint ? `title="${descriptionHint}"` : ''}>
                <label>Description:</label>
                <textarea class="goal-edit-description" rows="3" data-goal-index="${index}" placeholder="Full goal description...">${description}</textarea>
                ${descriptionHint ? `<span class="field-hint">${descriptionHint}</span>` : ''}
              </div>

              <!-- 3. Goal Types (Multi-select from boardgame categories) -->
              <div class="goal-card-field goal-types-field ${goalTypeClass}" ${goalTypeHint ? `title="${goalTypeHint}"` : ''}>
                <label>Goal Types (select matching boardgame cards):</label>
                ${goal.goal_type?.value ? `<div class="ai-detected-hint">AI detected: <strong>${goal.goal_type.value}</strong> ${existingGoalTypes.length > 0 ? `(${existingGoalTypes.length} cards auto-selected)` : '(no exact match - please select manually)'}</div>` : ''}
                <div class="goal-types-multiselect" data-goal-index="${index}">
                  ${generateCategoryCheckboxes(categoriesToShow, index, existingGoalTypes)}
                </div>
                ${goalTypeHint ? `<span class="field-hint">${goalTypeHint}</span>` : ''}
              </div>

              <!-- 4. Target Accuracy %, 5. Sessions to Confirm -->
              <div class="goal-card-row">
                <div class="goal-card-field ${targetClass}" ${targetHint ? `title="${targetHint}"` : ''}>
                  <label>Target Accuracy %:</label>
                  <select class="goal-edit-target" data-goal-index="${index}">
                    <option value="" ${targetAccuracy === null ? 'selected' : ''}>Select...</option>
                    <option value="50" ${targetAccuracy === 50 ? 'selected' : ''}>50%</option>
                    <option value="60" ${targetAccuracy === 60 ? 'selected' : ''}>60%</option>
                    <option value="70" ${targetAccuracy === 70 ? 'selected' : ''}>70%</option>
                    <option value="75" ${targetAccuracy === 75 ? 'selected' : ''}>75%</option>
                    <option value="80" ${targetAccuracy === 80 ? 'selected' : ''}>80%</option>
                    <option value="85" ${targetAccuracy === 85 ? 'selected' : ''}>85%</option>
                    <option value="90" ${targetAccuracy === 90 ? 'selected' : ''}>90%</option>
                  </select>
                  ${targetHint ? `<span class="field-hint">${targetHint}</span>` : ''}
                </div>
                <div class="goal-card-field ${sessionsClass}" ${sessionsHint ? `title="${sessionsHint}"` : ''}>
                  <label>Sessions to Confirm:</label>
                  <select class="goal-edit-sessions" data-goal-index="${index}">
                    <option value="" ${sessionsToConfirm === null ? 'selected' : ''}>Select...</option>
                    <option value="2" ${sessionsToConfirm === 2 ? 'selected' : ''}>2</option>
                    <option value="3" ${sessionsToConfirm === 3 ? 'selected' : ''}>3</option>
                    <option value="4" ${sessionsToConfirm === 4 ? 'selected' : ''}>4</option>
                    <option value="5" ${sessionsToConfirm === 5 ? 'selected' : ''}>5</option>
                  </select>
                  ${sessionsHint ? `<span class="field-hint">${sessionsHint}</span>` : ''}
                </div>
              </div>

              <!-- 6. Comments -->
              <div class="goal-card-field ${commentsClass}" ${commentsHint ? `title="${commentsHint}"` : ''}>
                <label>Comments:</label>
                <textarea class="goal-edit-comments" rows="2" data-goal-index="${index}" placeholder="e.g., Based on assessment results...">${comments}</textarea>
                ${commentsHint ? `<span class="field-hint">${commentsHint}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Edit Goals Manually - similar to editEvalData() but for goals
  async editGoalsManually() {
    if (!this.currentStudent) {
      alert('No student selected');
      return;
    }

    // Show the edit goals modal
    this.showModal('edit-goals-modal');

    // Load and render existing goals
    await this.renderExistingGoalsForEdit();
  },

  async renderExistingGoalsForEdit() {
    const container = document.getElementById('existing-goals-list');

    if (!container) return;

    container.innerHTML = '<p class="empty-state">Loading goals...</p>';

    try {
      const goals = await TherapistAPI.getStudentGoals(this.currentStudent.id);

      if (goals.length === 0) {
        container.innerHTML = '<p class="empty-state">No goals yet. Use "+ Add New Goal" to create one.</p>';
        return;
      }

      // Get goal type labels based on student's problem type
      const problemType = this.currentStudent.problem_type || 'both';

      // Helper function to generate multi-select checkboxes for a category section
      const generateCategoryCheckboxes = (categories, goalId, selectedCategories = [], sectionLabel) => {
        if (!categories || categories.length === 0) return '';

        let html = `<div class="category-section"><div class="category-section-header">${sectionLabel}</div>`;
        let currentGroup = null;

        categories.forEach((cat) => {
          if (cat.startsWith('---')) {
            // Section header
            if (currentGroup !== null) html += '</div>';
            const groupName = cat.replace('---', '').trim();
            currentGroup = groupName;
            html += `<div class="category-group"><div class="category-group-header">${groupName}</div>`;
          } else {
            // Category checkbox
            const isChecked = selectedCategories.includes(cat) ? 'checked' : '';
            html += `
              <label class="category-checkbox">
                <input type="checkbox" value="${cat}" data-goal-id="${goalId}" ${isChecked}>
                <span>${cat}</span>
              </label>`;
          }
        });
        if (currentGroup !== null) html += '</div>';
        html += '</div>';
        return html;
      };

      // Build checkboxes for goal based on problem type
      const buildGoalTypeCheckboxes = (goalId, selectedCategories) => {
        let html = '';
        if (problemType === 'language' || problemType === 'both') {
          html += generateCategoryCheckboxes(this.allCategories['language'] || [], goalId, selectedCategories, '═══ LANGUAGE ═══');
        }
        if (problemType === 'articulation' || problemType === 'both') {
          html += generateCategoryCheckboxes(this.allCategories['articulation'] || [], goalId, selectedCategories, '═══ ARTICULATION ═══');
        }
        return html;
      };

      // Render existing goals in editable card format (similar to extracted goals)
      container.innerHTML = goals.map((goal, index) => {
        // Get existing selected categories - use goal_types array if available, otherwise use goal_type
        const selectedCategories = goal.goal_types && goal.goal_types.length > 0
          ? goal.goal_types
          : (goal.goal_type ? [goal.goal_type] : []);

        return `
          <div class="existing-goal-card" data-goal-id="${goal.id}">
            <div class="goal-card-header">
              <span class="goal-card-title">Goal ${index + 1}: ${this.getGoalTypeLabel(goal.goal_type)}</span>
              <div class="goal-card-actions">
                <button type="button" class="btn btn-small btn-danger" onclick="TherapistApp.deleteGoalFromEdit(${goal.id})">Delete</button>
              </div>
            </div>
            <div class="goal-card-body">
              <!-- Measurable Baseline -->
              <div class="goal-card-field ${goal.baseline ? 'has-value' : ''}">
                <label>Measurable Baseline:</label>
                <input type="text" class="edit-goal-baseline" data-goal-id="${goal.id}" value="${goal.baseline || ''}" placeholder="e.g., 40% at the word level">
              </div>

              <!-- Proposed Goal Section -->
              <div class="proposed-goal-section">
                <h4 class="proposed-goal-header">Proposed Goal:</h4>

                <!-- Deadline -->
                <div class="goal-card-field ${goal.deadline ? 'has-value' : ''}">
                  <label>Deadline:</label>
                  <input type="date" class="edit-goal-deadline" data-goal-id="${goal.id}" value="${goal.deadline?.match(/^\d{4}-\d{2}-\d{2}$/) ? goal.deadline : ''}">
                </div>

                <!-- Description -->
                <div class="goal-card-field ${goal.goal_description ? 'has-value' : ''}">
                  <label>Description:</label>
                  <textarea class="edit-goal-description" rows="3" data-goal-id="${goal.id}" placeholder="Full goal description...">${goal.goal_description || ''}</textarea>
                </div>

                <!-- Goal Type(s) - Multi-select checkboxes -->
                <div class="goal-card-field ${selectedCategories.length > 0 ? 'has-value' : ''}">
                  <label>Goal Type(s): <span class="hint">(select one or more)</span></label>
                  <div class="goal-types-multiselect edit-goal-types" data-goal-id="${goal.id}">
                    ${buildGoalTypeCheckboxes(goal.id, selectedCategories)}
                  </div>
                </div>

                <!-- Target Accuracy %, Sessions to Confirm -->
                <div class="goal-card-row">
                  <div class="goal-card-field ${goal.target_percentage ? 'has-value' : ''}">
                    <label>Target Accuracy %:</label>
                    <select class="edit-goal-target" data-goal-id="${goal.id}">
                      <option value="50" ${goal.target_percentage === 50 ? 'selected' : ''}>50%</option>
                      <option value="60" ${goal.target_percentage === 60 ? 'selected' : ''}>60%</option>
                      <option value="70" ${goal.target_percentage === 70 ? 'selected' : ''}>70%</option>
                      <option value="75" ${goal.target_percentage === 75 ? 'selected' : ''}>75%</option>
                      <option value="80" ${goal.target_percentage === 80 ? 'selected' : ''}>80%</option>
                      <option value="85" ${goal.target_percentage === 85 ? 'selected' : ''}>85%</option>
                      <option value="90" ${goal.target_percentage === 90 ? 'selected' : ''}>90%</option>
                    </select>
                  </div>
                  <div class="goal-card-field ${goal.sessions_to_confirm ? 'has-value' : ''}">
                    <label>Sessions to Confirm:</label>
                    <select class="edit-goal-sessions" data-goal-id="${goal.id}">
                      <option value="2" ${goal.sessions_to_confirm === 2 ? 'selected' : ''}>2</option>
                      <option value="3" ${goal.sessions_to_confirm === 3 ? 'selected' : ''}>3</option>
                      <option value="4" ${goal.sessions_to_confirm === 4 ? 'selected' : ''}>4</option>
                      <option value="5" ${goal.sessions_to_confirm === 5 ? 'selected' : ''}>5</option>
                    </select>
                  </div>
                </div>

                <!-- Comments -->
                <div class="goal-card-field ${goal.comments ? 'has-value' : ''}">
                  <label>Comments:</label>
                  <textarea class="edit-goal-comments" rows="2" data-goal-id="${goal.id}" placeholder="e.g., Based on assessment results...">${goal.comments || ''}</textarea>
                </div>
              </div>

              <!-- Save Button for this goal -->
              <div class="goal-card-save">
                <button type="button" class="btn btn-small btn-success" onclick="TherapistApp.saveGoalFromEdit(${goal.id})">Save Changes</button>
                <span class="goal-save-status" id="goal-status-${goal.id}"></span>
              </div>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      container.innerHTML = `<p class="empty-state" style="color: red;">Error loading goals: ${error.message}</p>`;
    }
  },

  buildGoalTypeOptions(selectedType) {
    const problemType = this.currentStudent?.problem_type || '';
    // For 'both', combine language and articulation categories
    let categories = [];
    if (problemType === 'both') {
      categories = [...(this.allCategories['language'] || []), ...(this.allCategories['articulation'] || [])];
    } else {
      categories = this.allCategories[problemType] || [];
    }

    let html = '';
    let currentOptgroup = null;

    categories.forEach(cat => {
      if (cat.startsWith('---')) {
        if (currentOptgroup) {
          html += '</optgroup>';
        }
        const groupName = cat.replace('---', '').trim();
        html += `<optgroup label="${groupName}">`;
        currentOptgroup = groupName;
      } else {
        html += `<option value="${cat}" ${cat === selectedType ? 'selected' : ''}>${cat}</option>`;
      }
    });

    if (currentOptgroup) {
      html += '</optgroup>';
    }

    return html;
  },

  async saveGoalFromEdit(goalId) {
    const statusEl = document.getElementById(`goal-status-${goalId}`);
    if (statusEl) {
      statusEl.textContent = 'Saving...';
      statusEl.style.color = '#666';
    }

    const baseline = document.querySelector(`.edit-goal-baseline[data-goal-id="${goalId}"]`)?.value || '';
    const deadline = document.querySelector(`.edit-goal-deadline[data-goal-id="${goalId}"]`)?.value || '';
    const description = document.querySelector(`.edit-goal-description[data-goal-id="${goalId}"]`)?.value || '';

    // Collect selected goal types from multi-select checkboxes
    const selectedGoalTypes = [];
    const checkboxes = document.querySelectorAll(`.edit-goal-types[data-goal-id="${goalId}"] input[type="checkbox"]:checked`);
    checkboxes.forEach(cb => {
      if (cb.value) selectedGoalTypes.push(cb.value);
    });

    const targetAccuracy = parseInt(document.querySelector(`.edit-goal-target[data-goal-id="${goalId}"]`)?.value) || 80;
    const sessionsToConfirm = parseInt(document.querySelector(`.edit-goal-sessions[data-goal-id="${goalId}"]`)?.value) || 3;
    const comments = document.querySelector(`.edit-goal-comments[data-goal-id="${goalId}"]`)?.value || '';

    try {
      await TherapistAPI.updateGoal(goalId, {
        baseline: baseline || undefined,
        deadline: deadline || undefined,
        goal_description: description,
        goal_type: selectedGoalTypes[0] || undefined, // Primary type for backwards compatibility
        goal_types: selectedGoalTypes.length > 0 ? selectedGoalTypes : undefined,
        target_percentage: targetAccuracy,
        sessions_to_confirm: sessionsToConfirm,
        comments: comments || undefined,
      });

      if (statusEl) {
        statusEl.textContent = 'Saved!';
        statusEl.style.color = '#28a745';
        setTimeout(() => {
          statusEl.textContent = '';
        }, 2000);
      }

      // Refresh goals list in main view
      await this.loadStudentGoals(this.currentStudent.id);
    } catch (error) {
      if (statusEl) {
        statusEl.textContent = 'Error: ' + error.message;
        statusEl.style.color = '#dc3545';
      }
    }
  },

  async deleteGoalFromEdit(goalId) {
    if (!confirm('Are you sure you want to delete this goal? This cannot be undone.')) {
      return;
    }

    try {
      await TherapistAPI.deleteGoal(goalId);
      // Re-render the goals list
      await this.renderExistingGoalsForEdit();
      // Refresh main view
      await this.loadStudentGoals(this.currentStudent.id);
    } catch (error) {
      alert('Error deleting goal: ' + error.message);
    }
  },

  showAddGoalForm() {
    // Close the edit goals modal and open the add goal modal
    this.closeAllModals();
    this.loadGoalTypes();
    this.showModal('add-goal-modal');
  },

  // Temporarily store goals to save for after SLP review confirmation
  _pendingGoalsToSave: null,
  // Temporarily store goal ID for download after SLP review
  _pendingGoalDownloadId: null,

  // Download goal PDF with SLP review requirement
  downloadGoalPDF(goalId, isReviewed = false) {
    if (isReviewed) {
      // Already reviewed, download directly
      this._executeDownloadGoalPDF(goalId);
    } else {
      // Show SLP review modal first
      this._pendingGoalDownloadId = goalId;
      this.showSLPReviewModal('download_goal', 'IEP Goal');
    }
  },

  async _executeDownloadGoalPDF(goalId) {
    try {
      // Mark goal as reviewed first
      await TherapistAPI.markGoalReviewed(goalId, true);
      // Then download the PDF
      await TherapistAPI.downloadGoalPDF(goalId);
    } catch (error) {
      alert('Error downloading goal PDF: ' + error.message);
    }
  },

  async saveExtractedGoals() {
    if (!this.currentStudent) {
      alert('No student selected');
      return;
    }

    const errorEl = document.getElementById('goal-confirm-error');
    errorEl.classList.add('hidden');

    // Get selected goals (main goal checkboxes, not category checkboxes)
    const goalCheckboxes = document.querySelectorAll('#extracted-goals-list .goal-checkbox input[type="checkbox"]:checked');

    if (goalCheckboxes.length === 0) {
      errorEl.textContent = 'Please select at least one goal to save';
      errorEl.classList.remove('hidden');
      return;
    }

    const goalsToSave = [];
    goalCheckboxes.forEach(checkbox => {
      const index = parseInt(checkbox.dataset.goalIndex);

      // Get edited values (baseline is now per goal)
      const baseline = document.querySelector(`.goal-edit-baseline[data-goal-index="${index}"]`)?.value || '';
      const description = document.querySelector(`.goal-edit-description[data-goal-index="${index}"]`)?.value || '';

      // Get selected goal types from multi-select checkboxes
      const selectedGoalTypes = [];
      const categoryCheckboxes = document.querySelectorAll(`.goal-types-multiselect[data-goal-index="${index}"] input[type="checkbox"]:checked`);
      categoryCheckboxes.forEach(cb => {
        if (cb.value) selectedGoalTypes.push(cb.value);
      });
      // Use first selected type as primary goal_type for backwards compatibility
      const goalType = selectedGoalTypes[0] || '';

      const targetAccuracyVal = document.querySelector(`.goal-edit-target[data-goal-index="${index}"]`)?.value;
      const targetAccuracy = targetAccuracyVal ? parseInt(targetAccuracyVal) : null;
      const sessionsVal = document.querySelector(`.goal-edit-sessions[data-goal-index="${index}"]`)?.value;
      const sessionsToConfirm = sessionsVal ? parseInt(sessionsVal) : null;
      const deadline = document.querySelector(`.goal-edit-deadline[data-goal-index="${index}"]`)?.value || '';
      const comments = document.querySelector(`.goal-edit-comments[data-goal-index="${index}"]`)?.value || '';

      if (description.trim()) {
        goalsToSave.push({
          baseline: baseline || undefined,
          description,
          goal_type: goalType || undefined,
          goal_types: selectedGoalTypes.length > 0 ? selectedGoalTypes : undefined,
          target_accuracy: targetAccuracy,
          sessions_to_confirm: sessionsToConfirm,
          deadline: deadline || undefined,
          comments: comments || undefined,
        });
      }
    });

    if (goalsToSave.length === 0) {
      errorEl.textContent = 'No valid goals to save. Please ensure descriptions are filled in.';
      errorEl.classList.remove('hidden');
      return;
    }

    // Store goals and show SLP review modal
    this._pendingGoalsToSave = goalsToSave;
    this.showSLPReviewModal('confirm_goals', 'IEP Goals');
  },

  async _executeConfirmGoals() {
    if (!this._pendingGoalsToSave || !this.currentStudent) return;

    const errorEl = document.getElementById('goal-confirm-error');

    try {
      // Save goals via API (baseline is now per goal, not passed separately)
      await TherapistAPI.confirmGoals(this.currentStudent.id, null, this._pendingGoalsToSave);

      const count = this._pendingGoalsToSave.length;
      this._pendingGoalsToSave = null;

      this.closeAllModals();
      this.extractedGoals = [];
      await this.loadStudentGoals(this.currentStudent.id);

      alert(`Successfully saved ${count} goal(s)!`);
    } catch (error) {
      errorEl.textContent = error.message || 'Failed to save goals';
      errorEl.classList.remove('hidden');
      this._pendingGoalsToSave = null;
    }
  },

  async showSessionSOAP(sessionId) {
    try {
      const soap = await TherapistAPI.getSessionSOAP(sessionId);

      // Store session ID for saving
      document.getElementById('soap-session-id').value = sessionId;

      // Mark this as a session SOAP (not a progress report)
      this._isProgressReport = false;
      this._currentGoalId = null; // Clear goal ID

      // Store SLP review status
      this._currentSessionReviewed = soap.slp_reviewed === 1;

      // Show edit mode, hide view mode
      document.getElementById('soap-edit-mode').classList.remove('hidden');
      document.getElementById('soap-view-mode').classList.add('hidden');

      // Hide save button (Copy/Download will save automatically)
      document.getElementById('save-soap-btn').classList.add('hidden');

      // Always show Copy and Download buttons
      // They will trigger SLP review modal if not yet confirmed
      document.getElementById('copy-soap-btn').classList.remove('hidden');
      document.getElementById('download-pdf-btn').classList.remove('hidden');

      // Update modal subtitle with session info
      document.getElementById('soap-session-info').textContent =
        `Session: ${soap.session_date} | Student: ${soap.student_name}`;

      // Populate textareas with SOAP data (from session or default)
      document.getElementById('soap-subjective').value = soap.soap_subjective || soap.subjective || '';
      document.getElementById('soap-objective').value = soap.soap_objective || soap.objective || '';
      document.getElementById('soap-assessment').value = soap.soap_assessment || soap.assessment || '';
      document.getElementById('soap-plan').value = soap.soap_plan || soap.plan || '';

      // Clear any previous status
      document.getElementById('soap-save-status').textContent = '';

      this.showModal('soap-modal');
    } catch (error) {
      alert('Error loading SOAP note: ' + error.message);
    }
  },

  // Store current goal ID for download
  _currentGoalId: null,

  async showGoalSOAP(goalId) {
    try {
      // Fetch goal data to check review status
      const goal = await TherapistAPI.getGoal(goalId);
      const soap = await TherapistAPI.getGoalSOAP(goalId);
      this._currentSoapText = await TherapistAPI.getGoalSOAP(goalId, 'text');

      // Mark this as a progress report (not a session SOAP)
      this._isProgressReport = true;
      this._currentSessionReviewed = goal.slp_reviewed === 1; // Check if already reviewed in DB
      this._currentGoalId = goalId; // Store goal ID for download

      // Show view mode, hide edit mode
      document.getElementById('soap-view-mode').classList.remove('hidden');
      document.getElementById('soap-edit-mode').classList.add('hidden');

      // Show Copy and Download buttons, hide Save button for cumulative reports
      document.getElementById('copy-soap-btn').classList.remove('hidden');
      document.getElementById('download-pdf-btn').classList.remove('hidden');
      document.getElementById('save-soap-btn').classList.add('hidden');

      // Clear session ID (not a session)
      document.getElementById('soap-session-id').value = '';

      // Update modal subtitle
      document.getElementById('soap-session-info').textContent = 'Cumulative Progress Report';

      this.renderCumulativeSOAP(soap);
      this.showModal('soap-modal');
    } catch (error) {
      alert('Error loading SOAP note: ' + error.message);
    }
  },

  renderSOAP(soap) {
    const container = document.getElementById('soap-content');
    container.innerHTML = `
      <div class="soap-section">
        <h4>Session: ${soap.session_date}</h4>
        <p><strong>Student:</strong> ${soap.student_name}</p>
        ${soap.goal_type ? `<p><strong>Goal:</strong> ${soap.goal_type}</p>` : ''}
      </div>
      <div class="soap-section">
        <h4>Objective</h4>
        <p>${soap.objective}</p>
      </div>
      <div class="soap-section">
        <h4>Results</h4>
        <p><strong>Accuracy:</strong> ${soap.trials.accuracy.toFixed(0)}% (${soap.trials.correct}/${soap.trials.total})</p>
        <p><strong>Prompt Level:</strong> ${soap.prompt_level}</p>
      </div>
      <div class="soap-section">
        <h4>Assessment</h4>
        <p>${soap.assessment}</p>
      </div>
      <div class="soap-section">
        <h4>Plan</h4>
        <p>${soap.plan}</p>
      </div>
    `;
  },

  renderCumulativeSOAP(soap) {
    const container = document.getElementById('soap-content');
    container.innerHTML = `
      <div class="soap-section">
        <h4>Progress Report: ${soap.student_name}</h4>
        <p><strong>Goal:</strong> ${soap.goal_description}</p>
        <p><strong>Period:</strong> ${soap.reporting_period.start} - ${soap.reporting_period.end}</p>
      </div>
      <div class="soap-section">
        <h4>Current Status</h4>
        <p><strong>Average Accuracy:</strong> ${soap.current_status.average_accuracy.toFixed(0)}%</p>
        <p><strong>Prompt Level:</strong> ${soap.current_status.current_prompt_level}</p>
        <p><strong>Sessions:</strong> ${soap.current_status.sessions_completed}</p>
        <p><strong>Progress:</strong> ${soap.current_status.progress_toward_goal.toFixed(0)}% toward goal</p>
      </div>
      <div class="soap-section">
        <h4>Session History</h4>
        ${soap.session_history
          .map(
            (s) => `
          <p>${s.date}: ${s.accuracy.toFixed(0)}% (${s.trials} trials, ${s.prompt_level})</p>
        `
          )
          .join('')}
      </div>
      <div class="soap-section">
        <h4>Recommendation</h4>
        <p>${soap.recommendation}</p>
      </div>
    `;
  },

  // SLP Review confirmation - stores pending action
  _pendingExportAction: null,
  _pendingExportContext: null, // Additional context (e.g., 'soap', 'goals', 'progress')
  _currentSessionReviewed: false,

  showSLPReviewModal(action, docType = 'SOAP Note') {
    this._pendingExportAction = action;

    // Reset checkbox state
    const checkbox = document.getElementById('slp-review-checkbox');
    const confirmBtn = document.getElementById('slp-review-confirm-btn');
    checkbox.checked = false;
    confirmBtn.disabled = true;

    // Update document type text
    const docTypeText = document.getElementById('review-modal-doc-type');
    docTypeText.textContent = `Please review this ${docType} before exporting.`;

    this.showModal('slp-review-modal');
  },

  toggleReviewConfirmBtn() {
    const checkbox = document.getElementById('slp-review-checkbox');
    const confirmBtn = document.getElementById('slp-review-confirm-btn');
    confirmBtn.disabled = !checkbox.checked;
  },

  cancelSLPReview() {
    this._pendingExportAction = null;
    this._pendingExportContext = null;
    this._pendingGoalDownloadId = null;
    closeModal('slp-review-modal');
  },

  async confirmSLPReview() {
    closeModal('slp-review-modal');

    // Handle SOAP/Progress Report exports
    if (this._pendingExportAction === 'copy' || this._pendingExportAction === 'download') {
      const sessionId = document.getElementById('soap-session-id').value;

      // For session SOAPs (not progress reports), save and mark reviewed
      if (sessionId && !this._isProgressReport) {
        // Save SOAP first
        await this._executeSaveSOAP();

        // Mark session as reviewed in database
        try {
          await TherapistAPI.markSessionReviewed(sessionId, true);
          this._currentSessionReviewed = true;
        } catch (error) {
          console.error('Failed to mark session as reviewed:', error);
        }
      } else {
        // Progress report - just mark as reviewed locally
        this._currentSessionReviewed = true;
      }

      // Execute the pending action
      if (this._pendingExportAction === 'copy') {
        await this._executeCopySoap();
      } else if (this._pendingExportAction === 'download') {
        await this._executeDownloadPDF();
      }
    }
    // Handle goal confirmation (extracted goals)
    else if (this._pendingExportAction === 'confirm_goals') {
      await this._executeConfirmGoals();
    }
    // Handle manual goal add
    else if (this._pendingExportAction === 'add_manual_goal') {
      await this._executeAddManualGoal();
    }
    // Handle goal PDF download
    else if (this._pendingExportAction === 'download_goal') {
      if (this._pendingGoalDownloadId) {
        await this._executeDownloadGoalPDF(this._pendingGoalDownloadId);
        // Refresh goals list to update reviewed status
        if (this.currentStudent) {
          await this.loadStudentGoals(this.currentStudent.id);
        }
      }
      this._pendingGoalDownloadId = null;
    }

    this._pendingExportAction = null;
    this._pendingExportContext = null;
  },

  async copySoapToClipboard() {
    // If not reviewed, show modal first
    if (!this._currentSessionReviewed) {
      const docType = this._isProgressReport ? 'Progress Report' : 'SOAP Note';
      this.showSLPReviewModal('copy', docType);
      return;
    }
    // Already reviewed, copy directly
    await this._executeCopySoap();
  },

  async _executeCopySoap() {
    // Check if we're in edit mode (session SOAP) or view mode (cumulative report)
    const editMode = document.getElementById('soap-edit-mode');
    const isEditMode = !editMode.classList.contains('hidden');

    let textToCopy;
    if (isEditMode) {
      // Build text from the editable fields
      const s = document.getElementById('soap-subjective').value;
      const o = document.getElementById('soap-objective').value;
      const a = document.getElementById('soap-assessment').value;
      const p = document.getElementById('soap-plan').value;

      textToCopy = `SOAP NOTE\n\nSUBJECTIVE:\n${s}\n\nOBJECTIVE:\n${o}\n\nASSESSMENT:\n${a}\n\nPLAN:\n${p}`;
    } else {
      // Use the cached cumulative report text
      textToCopy = this._currentSoapText;
    }

    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        alert('Copied to clipboard!');
      } catch {
        alert('Failed to copy');
      }
    }
  },

  async _executeSaveSOAP() {
    const sessionId = document.getElementById('soap-session-id').value;
    if (!sessionId) return;

    const statusEl = document.getElementById('soap-save-status');
    statusEl.textContent = 'Saving...';
    statusEl.style.color = '#666';

    const soapData = {
      soap_subjective: document.getElementById('soap-subjective').value,
      soap_objective: document.getElementById('soap-objective').value,
      soap_assessment: document.getElementById('soap-assessment').value,
      soap_plan: document.getElementById('soap-plan').value,
    };

    try {
      await TherapistAPI.saveSessionSOAP(sessionId, soapData);
      statusEl.textContent = 'Saved!';
      statusEl.style.color = '#28a745';

      // Clear status after 2 seconds
      setTimeout(() => {
        statusEl.textContent = '';
      }, 2000);
    } catch (error) {
      statusEl.textContent = 'Error: ' + error.message;
      statusEl.style.color = '#dc3545';
    }
  },

  async downloadSOAPPDF() {
    // If not reviewed, show modal first (will save + mark reviewed + download)
    if (!this._currentSessionReviewed) {
      const docType = this._isProgressReport ? 'IEP Goal' : 'SOAP Note';
      this.showSLPReviewModal('download', docType);
      return;
    }
    // Already reviewed, download directly
    await this._executeDownloadPDF();
  },

  async _executeDownloadPDF() {
    const sessionId = document.getElementById('soap-session-id').value;
    const statusEl = document.getElementById('soap-save-status');

    // Handle Goal PDF download (progress report)
    if (this._isProgressReport && this._currentGoalId) {
      statusEl.textContent = 'Generating PDF...';
      statusEl.style.color = '#666';

      try {
        // Mark goal as reviewed first, then download
        await TherapistAPI.markGoalReviewed(this._currentGoalId, true);
        await TherapistAPI.downloadGoalPDF(this._currentGoalId);
        statusEl.textContent = 'PDF downloaded!';
        statusEl.style.color = '#28a745';
        this._currentSessionReviewed = true;

        // Refresh goals list to update reviewed status
        if (this.currentStudent) {
          await this.loadStudentGoals(this.currentStudent.id);
        }

        // Clear status after 3 seconds
        setTimeout(() => {
          statusEl.textContent = '';
        }, 3000);
      } catch (error) {
        statusEl.textContent = 'Error: ' + error.message;
        statusEl.style.color = '#dc3545';
      }
      return;
    }

    // Handle Session SOAP PDF download
    if (!sessionId) {
      return;
    }

    statusEl.textContent = 'Generating PDF...';
    statusEl.style.color = '#666';

    try {
      await TherapistAPI.downloadSOAPPDF(sessionId);
      statusEl.textContent = 'PDF downloaded!';
      statusEl.style.color = '#28a745';

      // Clear status after 3 seconds
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);
    } catch (error) {
      statusEl.textContent = 'Error: ' + error.message;
      statusEl.style.color = '#dc3545';
    }
  },

  async deleteStudent(studentId) {
    if (!confirm('Are you sure you want to delete this student? This cannot be undone.')) {
      return;
    }

    try {
      await TherapistAPI.deleteStudent(studentId);
      this.currentStudent = null;
      document.getElementById('student-profile').classList.add('hidden');
      document.getElementById('no-student-selected').classList.remove('hidden');
      await this.loadStudents();
    } catch (error) {
      alert('Error deleting student: ' + error.message);
    }
  },

  editStudent(student) {
    // TODO: Implement edit student modal
    alert('Edit student feature coming soon!');
  },

  editEvalData(student) {
    // Parse existing eval data if any
    let evalData = {};
    if (student.eval_data) {
      try {
        evalData = typeof student.eval_data === 'string' ? JSON.parse(student.eval_data) : student.eval_data;
      } catch {
        evalData = {};
      }
    }

    // Field mapping: form element ID -> eval data key
    const fieldMap = {
      'eval-languages': 'languages_spoken',
      'eval-religion': 'family_religion',
      'eval-medical-history': 'medical_history',
      'eval-other-diagnoses': 'other_diagnoses',
      'eval-speech-diagnoses': 'speech_diagnoses',
      'eval-prior-therapy': 'prior_therapy',
      'eval-baseline-accuracy': 'baseline_accuracy',
      'eval-goals-benchmarks': 'goals_benchmarks',
      'eval-strengths': 'strengths',
      'eval-weaknesses': 'weaknesses',
      'eval-target-sounds': 'target_sounds',
      'eval-teachers': 'teachers',
      'eval-notes': 'notes'
    };

    let filledCount = 0;
    let emptyCount = 0;

    // First, remove has-value class from all form groups to start fresh
    document.querySelectorAll('#edit-eval-form .form-group').forEach(fg => {
      fg.classList.remove('has-value');
    });

    // Populate form fields and apply styling
    Object.entries(fieldMap).forEach(([elementId, dataKey]) => {
      const element = document.getElementById(elementId);
      if (!element) return;

      // Get value from eval data
      let value = evalData[dataKey];
      if (Array.isArray(value)) {
        value = value.join(', ');
      }

      // Set the value
      element.value = value ?? '';

      // Find the parent form-group
      const formGroup = element.closest('.form-group');
      if (!formGroup) return;

      // Apply has-value class ONLY if field has actual content
      const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
      if (hasValue) {
        formGroup.classList.add('has-value');
      }

      // Count filled vs empty (exclude target-sounds for non-articulation)
      if (elementId === 'eval-target-sounds' && student.problem_type !== 'articulation' && student.problem_type !== 'both') {
        return; // Don't count target sounds for language-only students
      }

      if (hasValue) {
        filledCount++;
      } else {
        emptyCount++;
      }
    });

    // Update summary display
    const summaryEl = document.getElementById('eval-summary');
    const filledEl = document.getElementById('eval-filled-count');
    const emptyEl = document.getElementById('eval-empty-count');

    if (summaryEl && filledEl && emptyEl) {
      filledEl.textContent = filledCount;
      emptyEl.textContent = emptyCount;
      // Apply colors via JS to ensure they're set
      filledEl.style.background = '#dcfce7';
      filledEl.style.color = '#16a34a';
      emptyEl.style.background = '#facc15';
      emptyEl.style.color = '#713f12';
      summaryEl.classList.toggle('hidden', filledCount === 0);
    }

    // Show/hide target sounds based on problem type (show for articulation or both)
    const targetSoundsGroup = document.getElementById('eval-target-sounds-group');
    if (student.problem_type === 'articulation' || student.problem_type === 'both') {
      targetSoundsGroup.style.display = 'block';
    } else {
      targetSoundsGroup.style.display = 'none';
    }

    this.showModal('edit-eval-modal');
  },

  async handleSaveEvalData() {
    if (!this.currentStudent) {
      alert('No student selected');
      return;
    }

    const errorEl = document.getElementById('edit-eval-error');
    errorEl.classList.add('hidden');

    const targetSoundsValue = document.getElementById('eval-target-sounds').value;
    const baselineValue = document.getElementById('eval-baseline-accuracy').value;

    const evalData = {
      languages_spoken: document.getElementById('eval-languages').value || undefined,
      family_religion: document.getElementById('eval-religion').value || undefined,
      medical_history: document.getElementById('eval-medical-history').value || undefined,
      other_diagnoses: document.getElementById('eval-other-diagnoses').value || undefined,
      speech_diagnoses: document.getElementById('eval-speech-diagnoses').value || undefined,
      prior_therapy: document.getElementById('eval-prior-therapy').value || undefined,
      baseline_accuracy: baselineValue ? parseInt(baselineValue) : undefined,
      goals_benchmarks: document.getElementById('eval-goals-benchmarks').value || undefined,
      strengths: document.getElementById('eval-strengths').value || undefined,
      weaknesses: document.getElementById('eval-weaknesses').value || undefined,
      target_sounds: targetSoundsValue ? targetSoundsValue.split(',').map(s => s.trim()).filter(s => s) : undefined,
      teachers: document.getElementById('eval-teachers').value || undefined,
      notes: document.getElementById('eval-notes').value || undefined,
    };

    // Remove undefined values
    Object.keys(evalData).forEach(key => {
      if (evalData[key] === undefined) {
        delete evalData[key];
      }
    });

    try {
      await TherapistAPI.updateStudent(this.currentStudent.id, { eval_data: evalData });
      this.currentStudent.eval_data = JSON.stringify(evalData);
      this.renderEvalData(this.currentStudent);
      this.closeAllModals();
    } catch (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  resetPassword(studentId) {
    const newPassword = prompt('Enter new password for child (min 4 characters):');
    if (!newPassword || newPassword.length < 4) {
      alert('Password must be at least 4 characters');
      return;
    }

    TherapistAPI.updateStudent(studentId, { password: newPassword })
      .then(() => alert('Password updated!'))
      .catch((error) => alert('Error: ' + error.message));
  },

  // Helpers
  getGoalTypeLabel(type) {
    // Language goal type labels
    const languageLabels = {
      compare_contrast: 'Compare & Contrast',
      object_description: 'Object Description',
      wh_questions: 'Wh- Questions',
      category_naming: 'Category Naming',
      grammar_syntax: 'Grammar & Syntax',
      similarities_differences: 'Similarities & Differences',
      inferencing: 'Inferencing',
      problem_solving: 'Problem Solving',
      following_directions: 'Following Directions',
      vocabulary: 'Vocabulary',
    };

    // Articulation goal type labels
    const articulationLabels = {
      artic_r: '/r/ Sound',
      artic_s: '/s/ Sound & Blends',
      artic_l: '/l/ Sound & Blends',
      artic_th: '/th/ Sound',
      artic_k_g: '/k/ & /g/ Sounds',
      artic_f_v: '/f/ & /v/ Sounds',
      artic_sh_ch: '/sh/ & /ch/ Sounds',
      artic_z: '/z/ Sound',
      artic_j: '/j/ Sound',
      artic_blends: 'Blends & Clusters',
      artic_other: 'Other Articulation',
    };

    // Return label if exists in either map, otherwise return the type directly (it's the category name)
    return languageLabels[type] || articulationLabels[type] || type;
  },

  getPromptLabel(level) {
    const labels = { 1: 'MAX', 2: 'MOD', 3: 'MIN' };
    return labels[level] || 'MOD';
  },

  showModal(modalId) {
    this.closeAllModals();
    document.getElementById(modalId)?.classList.remove('hidden');
  },

  closeAllModals() {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.add('hidden');
    });
  },

  clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
      form.querySelectorAll('.form-error').forEach((el) => el.classList.add('hidden'));
    }
  },

  // ============================================
  // Evaluation Upload Methods
  // ============================================

  evalUploadData: null, // Stores extraction result during review

  openEvalUploadModal(student) {
    this.currentStudent = student;
    this.evalUploadData = null;
    this.pendingEvalFile = null;

    // Reset to upload state
    document.getElementById('eval-upload-state').classList.remove('hidden');
    document.getElementById('eval-loading-state').classList.add('hidden');
    document.getElementById('eval-review-state').classList.add('hidden');
    document.getElementById('eval-confirm-error').classList.add('hidden');
    document.getElementById('eval-password-field').classList.add('hidden');
    document.getElementById('eval-upload-error').classList.add('hidden');
    document.getElementById('eval-pdf-password').value = '';
    document.getElementById('eval-file-input').value = '';

    // Setup dropzone events
    this.setupEvalDropzone();

    this.showModal('eval-upload-modal');
  },

  setupEvalDropzone() {
    const dropzone = document.getElementById('eval-dropzone');
    const fileInput = document.getElementById('eval-file-input');

    // Click to browse
    dropzone.onclick = () => fileInput.click();

    // File input change
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        this.handleEvalFileSelect(e.target.files[0]);
      }
    };

    // Drag events
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    };

    dropzone.ondragleave = () => {
      dropzone.classList.remove('dragover');
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleEvalFileSelect(e.dataTransfer.files[0]);
      }
    };
  },

  async handleEvalFileSelect(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('File too large. Maximum size is 20MB');
      return;
    }

    // Store file for potential retry with password
    this.pendingEvalFile = file;

    // Get password if provided
    const password = document.getElementById('eval-pdf-password').value || null;

    // Show loading state
    document.getElementById('eval-upload-state').classList.add('hidden');
    document.getElementById('eval-loading-state').classList.remove('hidden');

    try {
      // Upload and extract
      const result = await TherapistAPI.uploadEvaluation(this.currentStudent.id, file, password);

      // Clear pending file on success
      this.pendingEvalFile = null;

      // Store extraction data
      this.evalUploadData = result.extracted_data;

      // Show review state
      await this.showEvalReviewState(result);
    } catch (error) {
      const errorEl = document.getElementById('eval-upload-error');

      // Check if password is required
      if (error.message.includes('PASSWORD_REQUIRED') || error.message.includes('password protected')) {
        // Show password field and prompt user
        document.getElementById('eval-loading-state').classList.add('hidden');
        document.getElementById('eval-upload-state').classList.remove('hidden');
        document.getElementById('eval-password-field').classList.remove('hidden');
        document.getElementById('eval-pdf-password').focus();
        return;
      }

      // Show error
      errorEl.textContent = 'Upload failed: ' + error.message;
      errorEl.classList.remove('hidden');
      // Go back to upload state
      document.getElementById('eval-loading-state').classList.add('hidden');
      document.getElementById('eval-upload-state').classList.remove('hidden');
    }
  },

  // Retry eval upload with password
  async retryEvalUploadWithPassword() {
    if (this.pendingEvalFile) {
      document.getElementById('eval-upload-error').classList.add('hidden');
      await this.handleEvalFileSelect(this.pendingEvalFile);
    }
  },

  async showEvalReviewState(result) {
    document.getElementById('eval-loading-state').classList.add('hidden');
    document.getElementById('eval-review-state').classList.remove('hidden');

    // Fetch PDF with auth headers and create blob URL for iframe
    try {
      const pdfUrl = TherapistAPI.getEvaluationPdfUrl(this.currentStudent.id);
      const response = await fetch(pdfUrl, {
        headers: { 'Authorization': `Bearer ${TherapistAPI.token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        document.getElementById('eval-pdf-frame').src = blobUrl;
      }
    } catch (err) {
      console.error('Failed to load PDF:', err);
    }

    const extractedData = result.extracted_data;
    const CONFIDENCE_THRESHOLD = 0.7;

    // Populate service_type field
    const serviceTypeData = extractedData.service_type;
    const serviceTypeEl = document.getElementById('extracted-service_type');
    const serviceTypeWrapper = document.getElementById('field-service_type');
    const serviceTypeHint = serviceTypeWrapper?.querySelector('.field-hint');

    if (serviceTypeEl) {
      serviceTypeEl.value = serviceTypeData?.value || '';

      // Apply confidence styling
      if (serviceTypeWrapper) {
        serviceTypeWrapper.classList.remove('low-confidence', 'high-confidence');
        if (!serviceTypeData?.value || serviceTypeData.confidence < CONFIDENCE_THRESHOLD) {
          serviceTypeWrapper.classList.add('low-confidence');
        } else if (serviceTypeData.confidence >= 0.85) {
          serviceTypeWrapper.classList.add('high-confidence');
        }
      }

      // Set hint with reasoning
      if (serviceTypeHint && serviceTypeData?.reasoning) {
        serviceTypeHint.textContent = serviceTypeData.reasoning;
        serviceTypeHint.title = serviceTypeData.reasoning;
      }
    }

    // Populate extracted fields with confidence highlighting
    const fields = [
      'languages_spoken', 'family_religion', 'medical_history', 'other_diagnoses',
      'speech_diagnoses', 'prior_therapy', 'baseline_accuracy',
      'goals_benchmarks', 'strengths', 'weaknesses', 'target_sounds',
      'teachers', 'notes'
    ];

    fields.forEach(field => {
      const fieldData = extractedData[field];
      const inputEl = document.getElementById(`extracted-${field}`);
      const fieldWrapper = document.getElementById(`field-${field}`);
      const hintEl = fieldWrapper?.querySelector('.field-hint');

      if (!inputEl) return;

      // Set value
      let value = fieldData?.value;
      if (Array.isArray(value)) {
        value = value.join(', ');
      }
      inputEl.value = value ?? '';

      // Apply confidence styling
      if (fieldWrapper) {
        fieldWrapper.classList.remove('low-confidence', 'high-confidence');

        if (!fieldData?.value || fieldData.confidence < CONFIDENCE_THRESHOLD) {
          fieldWrapper.classList.add('low-confidence');
        } else if (fieldData.confidence >= 0.85) {
          fieldWrapper.classList.add('high-confidence');
        }
      }

      // Set hint tooltip
      if (hintEl && fieldData?.source_hint) {
        hintEl.textContent = fieldData.source_hint;
        hintEl.title = fieldData.source_hint;
      }
    });

    // Show extraction notes
    const notesDisplay = document.getElementById('extraction-notes-display');
    if (notesDisplay && result.extraction_notes) {
      notesDisplay.textContent = result.extraction_notes;
      notesDisplay.classList.remove('hidden');
    }
  },

  async confirmEvalData() {
    if (!this.currentStudent) {
      alert('No student selected');
      return;
    }

    // Gather data from form
    const evalData = {};

    const getValue = (id) => {
      const el = document.getElementById(id);
      return el?.value?.trim() || undefined;
    };

    // Get service type (for updating student's problem_type)
    const serviceType = getValue('extracted-service_type');

    evalData.languages_spoken = getValue('extracted-languages_spoken');
    evalData.family_religion = getValue('extracted-family_religion');
    evalData.medical_history = getValue('extracted-medical_history');
    evalData.other_diagnoses = getValue('extracted-other_diagnoses');
    evalData.speech_diagnoses = getValue('extracted-speech_diagnoses');
    evalData.prior_therapy = getValue('extracted-prior_therapy');

    const baseline = getValue('extracted-baseline_accuracy');
    if (baseline) {
      evalData.baseline_accuracy = parseInt(baseline);
    }

    evalData.goals_benchmarks = getValue('extracted-goals_benchmarks');
    evalData.strengths = getValue('extracted-strengths');
    evalData.weaknesses = getValue('extracted-weaknesses');

    const targetSounds = getValue('extracted-target_sounds');
    if (targetSounds) {
      evalData.target_sounds = targetSounds.split(',').map(s => s.trim()).filter(s => s);
    }

    evalData.teachers = getValue('extracted-teachers');
    evalData.notes = getValue('extracted-notes');

    // Remove undefined values
    Object.keys(evalData).forEach(key => {
      if (evalData[key] === undefined) {
        delete evalData[key];
      }
    });

    try {
      // Pass service_type to update student's problem_type
      const result = await TherapistAPI.confirmEvaluation(this.currentStudent.id, evalData, serviceType);

      // Update current student
      this.currentStudent = result.student;

      // Re-render eval data display
      this.renderEvalData(this.currentStudent);

      // Clean up blob URL
      const iframe = document.getElementById('eval-pdf-frame');
      if (iframe.src && iframe.src.startsWith('blob:')) {
        URL.revokeObjectURL(iframe.src);
        iframe.src = '';
      }

      // Close modal
      this.closeAllModals();

      // Reset file input and states
      document.getElementById('eval-file-input').value = '';
      document.getElementById('eval-pdf-password').value = '';
      document.getElementById('eval-password-field').classList.add('hidden');
      document.getElementById('eval-upload-state').classList.remove('hidden');
      document.getElementById('eval-review-state').classList.add('hidden');
      this.pendingEvalFile = null;
    } catch (error) {
      const errorEl = document.getElementById('eval-confirm-error');
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
    }
  },

  cancelEvalUpload() {
    this.evalUploadData = null;
    this.pendingEvalFile = null;

    // Clean up blob URL to prevent memory leak
    const iframe = document.getElementById('eval-pdf-frame');
    if (iframe.src && iframe.src.startsWith('blob:')) {
      URL.revokeObjectURL(iframe.src);
      iframe.src = '';
    }

    this.closeAllModals();

    // Reset file input and password
    document.getElementById('eval-file-input').value = '';
    document.getElementById('eval-pdf-password').value = '';
    document.getElementById('eval-password-field').classList.add('hidden');
    document.getElementById('eval-upload-error').classList.add('hidden');

    // Reset states
    document.getElementById('eval-upload-state').classList.remove('hidden');
    document.getElementById('eval-loading-state').classList.add('hidden');
    document.getElementById('eval-review-state').classList.add('hidden');
  },
};

// Global helper for inline onclick
export function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  TherapistApp.init();
});

// ==================== GLOBAL EXPORTS ====================
// Expose for inline onclick handlers in HTML
window.TherapistApp = TherapistApp;
window.closeModal = closeModal;
