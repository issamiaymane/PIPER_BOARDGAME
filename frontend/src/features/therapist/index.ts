/**
 * Therapist Dashboard Controller
 * Handles UI state and user interactions
 */

import { api, type Therapist, type Student, type ApiError, type EvalData, type ExtractedGoal, type IEPGoal } from '../../services/api';

// DOM element helpers
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el;
}

function hide(el: HTMLElement): void {
  el.classList.add('hidden');
}

function show(el: HTMLElement): void {
  el.classList.remove('hidden');
}

// State
let currentTherapist: Therapist | null = null;
let students: Student[] = [];
let selectedStudentId: number | null = null;
let loadingInterval: ReturnType<typeof setInterval> | null = null;

// Evaluation upload state
let pendingEvalFile: File | null = null;
let extractedEvalData: EvalData | null = null;
let currentPdfUrl: string | null = null;

// Goals upload state
let pendingGoalsFile: File | null = null;
let extractedGoals: ExtractedGoal[] = [];
let currentGoalsPdfUrl: string | null = null;
let studentGoals: IEPGoal[] = [];

// Loading screen
function startLoading(): void {
  const loadingBar = $('loadingBar') as HTMLDivElement;
  let progress = 0;
  loadingInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 90) {
      progress = 90;
      if (loadingInterval) clearInterval(loadingInterval);
    }
    loadingBar.style.width = `${progress}%`;
  }, 100);
}

function stopLoading(): void {
  const loadingBar = $('loadingBar') as HTMLDivElement;
  const loadingScreen = $('loadingScreen');

  loadingBar.style.width = '100%';
  if (loadingInterval) clearInterval(loadingInterval);

  setTimeout(() => hide(loadingScreen), 300);
}

// Screens
function showAuthScreen(): void {
  show($('auth-screen'));
  hide($('dashboard-screen'));
}

function showDashboard(): void {
  hide($('auth-screen'));
  show($('dashboard-screen'));

  if (currentTherapist) {
    $('therapist-name').textContent =
      `${currentTherapist.first_name} ${currentTherapist.last_name}`;
  }

  // Load students
  loadStudents();
}

// Modal helpers
function openModal(modalId: string): void {
  show($(modalId));
}

function closeModal(modalId: string): void {
  hide($(modalId));
}

// Modal close functionality is now handled via event listeners

// Student list
async function loadStudents(): Promise<void> {
  const listEl = $('student-list');

  try {
    students = await api.listStudents();
    renderStudentList();
  } catch (err) {
    listEl.innerHTML = '<p class="empty-state">Failed to load students</p>';
  }
}

function renderStudentList(): void {
  const listEl = $('student-list');

  if (students.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No students yet. Click "+ Add" to create one.</p>';
    return;
  }

  listEl.innerHTML = students
    .map(
      (s) => `
      <div class="student-item ${s.id === selectedStudentId ? 'selected' : ''}" data-id="${s.id}">
        <div class="student-avatar">${s.first_name.charAt(0)}${s.last_name.charAt(0)}</div>
        <div class="student-info">
          <span class="student-name">${s.first_name} ${s.last_name}</span>
          <span class="student-grade">${s.grade_level || 'No grade'}</span>
        </div>
      </div>
    `
    )
    .join('');

  // Add click handlers
  listEl.querySelectorAll('.student-item').forEach((el) => {
    el.addEventListener('click', () => {
      const id = parseInt(el.getAttribute('data-id') || '0');
      selectStudent(id);
    });
  });
}

function selectStudent(id: number): void {
  selectedStudentId = id;
  const student = students.find((s) => s.id === id);

  if (!student) return;

  // Update selection in list
  renderStudentList();

  // Show profile
  hide($('no-student-selected'));
  show($('student-profile'));

  // Populate profile
  $('profile-avatar').textContent = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`;
  $('profile-name').textContent = `${student.first_name} ${student.last_name}`;
  $('profile-details').textContent = student.grade_level || 'No grade level set';
  $('child-username').textContent = student.username;

  // Render evaluation data
  renderEvalData(student);

  // Load and render goals
  loadStudentGoals(student.id);
}

function renderEvalData(student: Student): void {
  const container = $('eval-data-display');

  // Parse eval_data if it's a string (from JSON in database)
  let evalData: EvalData | null = null;
  if (student.eval_data) {
    if (typeof student.eval_data === 'string') {
      try {
        evalData = JSON.parse(student.eval_data);
      } catch {
        evalData = null;
      }
    } else {
      evalData = student.eval_data;
    }
  }

  if (!evalData || Object.keys(evalData).length === 0) {
    container.innerHTML = '<p class="empty-state">No evaluation data entered yet.</p>';
    return;
  }

  // Build display HTML
  const fieldLabels: Record<string, string> = {
    service_type: 'Service Type',
    languages_spoken: 'Languages Spoken',
    family_religion: 'Cultural/Religious Notes',
    medical_history: 'Medical History',
    other_diagnoses: 'Other Diagnoses',
    speech_diagnoses: 'Speech/Language Diagnoses',
    prior_therapy: 'Prior Therapy',
    baseline_accuracy: 'Baseline Accuracy',
    goals_benchmarks: 'Goals & Benchmarks',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    target_sounds: 'Target Sounds',
    teachers: 'Teachers/Contacts',
    notes: 'Additional Notes',
  };

  let html = '<div class="eval-data-grid">';

  for (const [key, label] of Object.entries(fieldLabels)) {
    const field = evalData[key as keyof EvalData];
    if (!field) continue;

    let value: string | number | string[] | null = null;
    if (typeof field === 'object' && 'value' in field) {
      value = field.value;
    } else if (typeof field === 'string') {
      value = field;
    }

    if (value === null || value === undefined || value === '') continue;

    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);

    html += `
      <div class="eval-data-item">
        <span class="eval-data-label">${label}</span>
        <span class="eval-data-value">${displayValue}</span>
      </div>
    `;
  }

  html += '</div>';

  // Check if any fields were rendered
  if (html === '<div class="eval-data-grid"></div>') {
    container.innerHTML = '<p class="empty-state">No evaluation data entered yet.</p>';
  } else {
    container.innerHTML = html;
  }
}

// Add student
async function handleAddStudent(e: Event): Promise<void> {
  e.preventDefault();

  const firstName = ($('student-first') as HTMLInputElement).value;
  const lastName = ($('student-last') as HTMLInputElement).value;
  const username = ($('student-username') as HTMLInputElement).value;
  const password = ($('student-password') as HTMLInputElement).value;
  const grade = ($('student-grade') as HTMLSelectElement).value;
  const dob = ($('student-dob') as HTMLInputElement).value;
  const errorEl = $('add-student-error');

  hide(errorEl);

  try {
    const student = await api.createStudent({
      first_name: firstName,
      last_name: lastName,
      username,
      password,
      grade_level: grade || undefined,
      date_of_birth: dob || undefined,
    });

    // Add to list and select
    students.push(student);
    selectStudent(student.id);

    // Close modal and reset form
    closeModal('add-student-modal');
    ($('add-student-form') as HTMLFormElement).reset();
  } catch (err) {
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

// Delete student
async function handleDeleteStudent(): Promise<void> {
  if (!selectedStudentId) return;

  const student = students.find((s) => s.id === selectedStudentId);
  if (!student) return;

  const confirmed = confirm(`Delete ${student.first_name} ${student.last_name}? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await api.deleteStudent(selectedStudentId);
    students = students.filter((s) => s.id !== selectedStudentId);
    selectedStudentId = null;

    // Hide profile and show placeholder
    hide($('student-profile'));
    show($('no-student-selected'));

    renderStudentList();
  } catch (err) {
    alert((err as ApiError).message);
  }
}

// ============================================
// Evaluation Upload Functions
// ============================================

function resetEvalUploadModal(): void {
  // Clean up blob URL to prevent memory leak
  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
  }

  // Reset state
  pendingEvalFile = null;
  extractedEvalData = null;
  currentPdfUrl = null;

  // Clear iframe
  const pdfFrame = document.getElementById('eval-pdf-frame') as HTMLIFrameElement | null;
  if (pdfFrame) pdfFrame.src = '';

  // Show upload state, hide others
  show($('eval-upload-state'));
  hide($('eval-loading-state'));
  hide($('eval-review-state'));

  // Reset file input
  ($('eval-file-input') as HTMLInputElement).value = '';

  // Hide password field and error
  hide($('eval-password-field'));
  hide($('eval-upload-error'));
  ($('eval-pdf-password') as HTMLInputElement).value = '';
}

function showEvalLoading(): void {
  hide($('eval-upload-state'));
  show($('eval-loading-state'));
  hide($('eval-review-state'));
}

function showEvalReview(): void {
  hide($('eval-upload-state'));
  hide($('eval-loading-state'));
  show($('eval-review-state'));
}

function showEvalError(message: string): void {
  const errorEl = $('eval-upload-error');
  errorEl.textContent = message;
  show(errorEl);
}

function populateEvalForm(data: EvalData): void {
  const fields = [
    'service_type',
    'languages_spoken',
    'family_religion',
    'medical_history',
    'other_diagnoses',
    'speech_diagnoses',
    'prior_therapy',
    'baseline_accuracy',
    'goals_benchmarks',
    'strengths',
    'weaknesses',
    'target_sounds',
    'teachers',
    'notes',
  ];

  for (const field of fields) {
    const fieldData = data[field as keyof EvalData];
    const inputEl = document.getElementById(`extracted-${field}`) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;
    const fieldContainer = document.getElementById(`field-${field}`);
    const hintEl = fieldContainer?.querySelector('.field-hint') as HTMLElement | null;

    if (!inputEl) continue;

    // Set value
    if (fieldData && typeof fieldData === 'object' && 'value' in fieldData) {
      const value = fieldData.value;
      if (Array.isArray(value)) {
        inputEl.value = value.join(', ');
      } else if (value !== null && value !== undefined) {
        inputEl.value = String(value);
      } else {
        inputEl.value = '';
      }

      // Set confidence styling
      const confidence = fieldData.confidence ?? 0;
      if (fieldContainer) {
        fieldContainer.classList.remove('low-confidence', 'medium-confidence', 'high-confidence');
        if (confidence < 0.5) {
          fieldContainer.classList.add('low-confidence');
        } else if (confidence < 0.8) {
          fieldContainer.classList.add('medium-confidence');
        } else {
          fieldContainer.classList.add('high-confidence');
        }
      }

      // Set hint
      if (hintEl && fieldData.source_hint) {
        hintEl.textContent = fieldData.source_hint;
      }
    } else {
      inputEl.value = '';
      if (fieldContainer) {
        fieldContainer.classList.add('low-confidence');
      }
    }
  }

  // Set extraction notes
  const notesEl = $('extraction-notes-display');
  if (data.extraction_notes) {
    notesEl.textContent = data.extraction_notes;
    show(notesEl);
  } else {
    hide(notesEl);
  }
}

function getFormEvalData(): EvalData {
  const fields = [
    'service_type',
    'languages_spoken',
    'family_religion',
    'medical_history',
    'other_diagnoses',
    'speech_diagnoses',
    'prior_therapy',
    'baseline_accuracy',
    'goals_benchmarks',
    'strengths',
    'weaknesses',
    'target_sounds',
    'teachers',
    'notes',
  ];

  const data: EvalData = {};

  for (const field of fields) {
    const inputEl = document.getElementById(`extracted-${field}`) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | null;

    if (!inputEl) continue;

    let value: string | number | string[] | null = inputEl.value.trim() || null;

    // Handle special fields
    if (field === 'baseline_accuracy' && value) {
      value = parseInt(value as string, 10);
      if (isNaN(value)) value = null;
    } else if (field === 'target_sounds' && value) {
      value = (value as string).split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Keep original confidence if available
    const original = extractedEvalData?.[field as keyof EvalData];
    const confidence = original && typeof original === 'object' && 'confidence' in original
      ? original.confidence
      : 0.9; // User-edited fields get high confidence

    (data as Record<string, unknown>)[field] = {
      value,
      confidence,
    };
  }

  return data;
}

async function handleEvalFileSelect(file: File): Promise<void> {
  if (!selectedStudentId) {
    showEvalError('Please select a student first');
    return;
  }

  if (file.type !== 'application/pdf') {
    showEvalError('Please select a PDF file');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showEvalError('File is too large. Maximum size is 20MB.');
    return;
  }

  pendingEvalFile = file;
  hide($('eval-upload-error'));

  await uploadEvalFile();
}

async function uploadEvalFile(password?: string): Promise<void> {
  if (!pendingEvalFile || !selectedStudentId) return;

  showEvalLoading();

  try {
    const result = await api.uploadEvaluation(selectedStudentId, pendingEvalFile, password);

    // Store extracted data
    extractedEvalData = result.extracted_data;

    // Populate form
    populateEvalForm(result.extracted_data);

    // Fetch PDF with auth and create blob URL for iframe
    try {
      const pdfBlob = await api.getEvaluationPdfBlob(selectedStudentId);
      currentPdfUrl = URL.createObjectURL(pdfBlob);
      const pdfFrame = $('eval-pdf-frame') as HTMLIFrameElement;
      pdfFrame.src = currentPdfUrl;
    } catch {
      // PDF preview failed, but extraction succeeded - continue anyway
      console.warn('Could not load PDF preview');
    }

    // Show review state
    showEvalReview();
  } catch (err) {
    const error = err as ApiError & { code?: string };

    if (error.code === 'PASSWORD_REQUIRED') {
      // Show password field
      show($('eval-upload-state'));
      hide($('eval-loading-state'));
      show($('eval-password-field'));
      return;
    }

    // Show error
    show($('eval-upload-state'));
    hide($('eval-loading-state'));
    showEvalError(error.message);
  }
}

async function retryEvalUploadWithPassword(): Promise<void> {
  const password = ($('eval-pdf-password') as HTMLInputElement).value;
  if (!password) {
    showEvalError('Please enter the PDF password');
    return;
  }
  await uploadEvalFile(password);
}

function cancelEvalUpload(): void {
  resetEvalUploadModal();
  closeModal('eval-upload-modal');
}

async function confirmEvalData(): Promise<void> {
  if (!selectedStudentId) return;

  const evalData = getFormEvalData();
  const serviceType = ($('extracted-service_type') as HTMLSelectElement).value || undefined;

  try {
    hide($('eval-confirm-error'));

    const result = await api.confirmEvaluation(selectedStudentId, evalData, serviceType);

    // Update local student data
    const idx = students.findIndex((s) => s.id === selectedStudentId);
    if (idx !== -1) {
      students[idx] = result.student;
    }

    // Close modal and reset
    resetEvalUploadModal();
    closeModal('eval-upload-modal');

    // Re-select student to refresh profile
    selectStudent(selectedStudentId);
  } catch (err) {
    const errorEl = $('eval-confirm-error');
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

// ============================================
// Goals Upload Functions
// ============================================

async function loadStudentGoals(studentId: number): Promise<void> {
  const container = document.getElementById('goals-data-display');
  if (!container) return;

  try {
    const result = await api.getGoals(studentId);
    studentGoals = result.goals;
    renderGoalsData();
  } catch {
    container.innerHTML = '<p class="empty-state">Failed to load goals</p>';
  }
}

function renderGoalsData(): void {
  const container = document.getElementById('goals-data-display');
  if (!container) return;

  if (studentGoals.length === 0) {
    container.innerHTML = '<p class="empty-state">No IEP goals entered yet.</p>';
    return;
  }

  let html = '<div class="goals-list">';

  for (const goal of studentGoals) {
    const typeLabel = goal.goal_type === 'language' ? 'Language' : 'Articulation';
    const statusClass = goal.status === 'active' ? 'active' : goal.status === 'achieved' ? 'achieved' : 'discontinued';
    const statusBadge = goal.status === 'active' ? 'Active' : goal.status === 'achieved' ? 'Achieved' : 'Discontinued';
    const targetDate = goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'Not set';

    html += `
      <div class="goal-item ${statusClass}" data-goal-id="${goal.id}">
        <div class="goal-header">
          <span class="goal-type-badge ${goal.goal_type}">${typeLabel}</span>
          <span class="goal-target">${goal.target_percentage}% target</span>
        </div>
        <p class="goal-description">${goal.goal_description}</p>
        <div class="goal-details hidden" id="goal-details-${goal.id}">
          <div class="goal-detail-row">
            <strong>Status:</strong> ${statusBadge}
          </div>
          <div class="goal-detail-row">
            <strong>Target Date:</strong> ${targetDate}
          </div>
          <div class="goal-detail-row">
            <strong>Current Progress:</strong> ${goal.current_percentage ?? 0}%
          </div>
          <div class="goal-detail-row">
            <strong>Created:</strong> ${new Date(goal.created_at).toLocaleDateString()}
          </div>
          ${goal.updated_at !== goal.created_at ? `<div class="goal-detail-row"><strong>Last Updated:</strong> ${new Date(goal.updated_at).toLocaleDateString()}</div>` : ''}
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;

  // Add click handlers to toggle details
  container.querySelectorAll('.goal-item').forEach((item) => {
    item.addEventListener('click', () => {
      const goalId = item.getAttribute('data-goal-id');
      const detailsEl = document.getElementById(`goal-details-${goalId}`);
      if (detailsEl) {
        const isHidden = detailsEl.classList.contains('hidden');
        // Hide all other details first
        container.querySelectorAll('.goal-details').forEach(d => d.classList.add('hidden'));
        // Toggle this one
        if (isHidden) {
          detailsEl.classList.remove('hidden');
        }
      }
    });
  });
}

function resetGoalsUploadModal(): void {
  if (currentGoalsPdfUrl) {
    URL.revokeObjectURL(currentGoalsPdfUrl);
  }

  pendingGoalsFile = null;
  extractedGoals = [];
  currentGoalsPdfUrl = null;

  const pdfFrame = document.getElementById('goals-pdf-frame') as HTMLIFrameElement | null;
  if (pdfFrame) pdfFrame.src = '';

  show($('goals-upload-state'));
  hide($('goals-loading-state'));
  hide($('goals-review-state'));

  const fileInput = document.getElementById('goals-file-input') as HTMLInputElement | null;
  if (fileInput) fileInput.value = '';

  hide($('goals-password-field'));
  hide($('goals-upload-error'));
  const passwordInput = document.getElementById('goals-pdf-password') as HTMLInputElement | null;
  if (passwordInput) passwordInput.value = '';
}

function showGoalsLoading(): void {
  hide($('goals-upload-state'));
  show($('goals-loading-state'));
  hide($('goals-review-state'));
}

function showGoalsReview(): void {
  hide($('goals-upload-state'));
  hide($('goals-loading-state'));
  show($('goals-review-state'));
}

function showGoalsError(message: string): void {
  const errorEl = $('goals-upload-error');
  errorEl.textContent = message;
  show(errorEl);
}

function populateGoalsForm(goals: ExtractedGoal[]): void {
  const container = $('extracted-goals-list');

  if (goals.length === 0) {
    container.innerHTML = '<p class="empty-state">No goals were extracted from the document.</p>';
    return;
  }

  let html = '';

  goals.forEach((goal, index) => {
    const goalType = goal.goal_type.value || 'language';
    const description = goal.goal_description.value || '';
    const targetPct = goal.target_percentage.value || 80;
    const targetDate = goal.target_date.value || '';

    html += `
      <div class="extracted-goal-item" data-index="${index}">
        <div class="goal-form-row">
          <label>Type:</label>
          <select class="goal-type-select">
            <option value="language" ${goalType === 'language' ? 'selected' : ''}>Language</option>
            <option value="articulation" ${goalType === 'articulation' ? 'selected' : ''}>Articulation</option>
          </select>
        </div>
        <div class="goal-form-row">
          <label>Goal:</label>
          <textarea class="goal-description-input" rows="3">${description}</textarea>
        </div>
        <div class="goal-form-row">
          <label>Target %:</label>
          <input type="number" class="goal-target-input" min="0" max="100" value="${targetPct}">
        </div>
        <div class="goal-form-row">
          <label>Target Date:</label>
          <input type="date" class="goal-date-input" value="${targetDate}">
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getFormGoalsData(): ExtractedGoal[] {
  const container = $('extracted-goals-list');
  const goalItems = container.querySelectorAll('.extracted-goal-item');
  const goals: ExtractedGoal[] = [];

  goalItems.forEach((item) => {
    const typeSelect = item.querySelector('.goal-type-select') as HTMLSelectElement;
    const descInput = item.querySelector('.goal-description-input') as HTMLTextAreaElement;
    const targetInput = item.querySelector('.goal-target-input') as HTMLInputElement;
    const dateInput = item.querySelector('.goal-date-input') as HTMLInputElement;

    goals.push({
      goal_type: { value: typeSelect.value as 'language' | 'articulation', confidence: 0.9 },
      goal_description: { value: descInput.value || null, confidence: 0.9 },
      target_percentage: { value: parseInt(targetInput.value) || 80, confidence: 0.9 },
      target_date: { value: dateInput.value || null, confidence: 0.9 },
    });
  });

  return goals;
}

async function handleGoalsFileSelect(file: File): Promise<void> {
  if (!selectedStudentId) {
    showGoalsError('Please select a student first');
    return;
  }

  if (file.type !== 'application/pdf') {
    showGoalsError('Please select a PDF file');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showGoalsError('File is too large. Maximum size is 20MB.');
    return;
  }

  pendingGoalsFile = file;
  hide($('goals-upload-error'));

  await uploadGoalsFile();
}

async function uploadGoalsFile(password?: string): Promise<void> {
  if (!pendingGoalsFile || !selectedStudentId) return;

  showGoalsLoading();

  try {
    const result = await api.uploadGoals(selectedStudentId, pendingGoalsFile, password);

    extractedGoals = result.extracted_data.goals;

    populateGoalsForm(extractedGoals);

    try {
      const pdfBlob = await api.getGoalsPdfBlob(selectedStudentId);
      currentGoalsPdfUrl = URL.createObjectURL(pdfBlob);
      const pdfFrame = document.getElementById('goals-pdf-frame') as HTMLIFrameElement;
      if (pdfFrame) pdfFrame.src = currentGoalsPdfUrl;
    } catch {
      console.warn('Could not load PDF preview');
    }

    showGoalsReview();
  } catch (err) {
    const error = err as ApiError & { code?: string };

    if (error.code === 'PASSWORD_REQUIRED') {
      show($('goals-upload-state'));
      hide($('goals-loading-state'));
      show($('goals-password-field'));
      return;
    }

    show($('goals-upload-state'));
    hide($('goals-loading-state'));
    showGoalsError(error.message);
  }
}

async function retryGoalsUploadWithPassword(): Promise<void> {
  const password = ($('goals-pdf-password') as HTMLInputElement).value;
  if (!password) {
    showGoalsError('Please enter the PDF password');
    return;
  }
  await uploadGoalsFile(password);
}

function cancelGoalsUpload(): void {
  resetGoalsUploadModal();
  closeModal('goals-upload-modal');
}

async function confirmGoalsData(): Promise<void> {
  if (!selectedStudentId) return;

  const goals = getFormGoalsData();

  try {
    hide($('goals-confirm-error'));

    await api.confirmGoals(selectedStudentId, goals);

    resetGoalsUploadModal();
    closeModal('goals-upload-modal');

    // Reload goals
    await loadStudentGoals(selectedStudentId);
  } catch (err) {
    const errorEl = $('goals-confirm-error');
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

// Auth handlers
async function handleLogin(e: Event): Promise<void> {
  e.preventDefault();

  const email = ($('login-email') as HTMLInputElement).value;
  const password = ($('login-password') as HTMLInputElement).value;
  const errorEl = $('login-error');

  hide(errorEl);

  try {
    const result = await api.login({ email, password });
    currentTherapist = result.therapist;
    showDashboard();
  } catch (err) {
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

async function handleRegister(e: Event): Promise<void> {
  e.preventDefault();

  const firstName = ($('reg-first') as HTMLInputElement).value;
  const lastName = ($('reg-last') as HTMLInputElement).value;
  const email = ($('reg-email') as HTMLInputElement).value;
  const password = ($('reg-password') as HTMLInputElement).value;
  const errorEl = $('register-error');

  hide(errorEl);

  try {
    const result = await api.register({
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });
    currentTherapist = result.therapist;
    showDashboard();
  } catch (err) {
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

function handleLogout(): void {
  api.logout();
  currentTherapist = null;
  showAuthScreen();
}

// Auth check
async function checkAuth(): Promise<void> {
  if (!api.isAuthenticated()) {
    showAuthScreen();
    return;
  }

  try {
    const result = await api.getMe();
    currentTherapist = result.therapist;
    showDashboard();
  } catch {
    api.logout();
    showAuthScreen();
  }
}

// Event binding
function bindEvents(): void {
  // Auth forms
  $('login-form').addEventListener('submit', handleLogin);
  $('register-form').addEventListener('submit', handleRegister);

  // Form switching
  $('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    hide($('login-form'));
    show($('register-form'));
  });

  $('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    hide($('register-form'));
    show($('login-form'));
  });

  // Logout
  $('logout-btn').addEventListener('click', handleLogout);

  // Add student
  $('add-student-btn').addEventListener('click', () => {
    openModal('add-student-modal');
  });

  $('add-student-form').addEventListener('submit', handleAddStudent);

  // Delete student
  $('delete-student-btn').addEventListener('click', handleDeleteStudent);

  // Upload PDF button
  $('upload-eval-btn').addEventListener('click', () => {
    if (!selectedStudentId) {
      alert('Please select a student first');
      return;
    }
    resetEvalUploadModal();
    openModal('eval-upload-modal');
  });

  // Evaluation dropzone
  const dropzone = $('eval-dropzone');
  const fileInput = $('eval-file-input') as HTMLInputElement;

  // Click to browse
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) {
      handleEvalFileSelect(file);
    }
  });

  // Drag and drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) {
      handleEvalFileSelect(file);
    }
  });

  // Upload Goals PDF button
  const uploadGoalsBtn = document.getElementById('upload-goals-btn');
  if (uploadGoalsBtn) {
    uploadGoalsBtn.addEventListener('click', () => {
      if (!selectedStudentId) {
        alert('Please select a student first');
        return;
      }
      resetGoalsUploadModal();
      openModal('goals-upload-modal');
    });
  }

  // Goals dropzone
  const goalsDropzone = document.getElementById('goals-dropzone');
  const goalsFileInput = document.getElementById('goals-file-input') as HTMLInputElement | null;

  if (goalsDropzone && goalsFileInput) {
    goalsDropzone.addEventListener('click', () => {
      goalsFileInput.click();
    });

    goalsFileInput.addEventListener('change', () => {
      const file = goalsFileInput.files?.[0];
      if (file) {
        handleGoalsFileSelect(file);
      }
    });

    goalsDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      goalsDropzone.classList.add('drag-over');
    });

    goalsDropzone.addEventListener('dragleave', () => {
      goalsDropzone.classList.remove('drag-over');
    });

    goalsDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      goalsDropzone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file) {
        handleGoalsFileSelect(file);
      }
    });
  }

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) {
        const modalId = modal.id;
        // Reset modal state when closing
        if (modalId === 'eval-upload-modal') {
          resetEvalUploadModal();
        } else if (modalId === 'goals-upload-modal') {
          resetGoalsUploadModal();
        }
        hide(modal as HTMLElement);
      }
    });
  });

  // Cancel modal buttons
  document.querySelectorAll('.cancel-modal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal');
      if (modalId) closeModal(modalId);
    });
  });

  // Close modal on backdrop click
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hide(modal as HTMLElement);
      }
    });
  });

  // Evaluation upload modal buttons
  const evalRetryPasswordBtn = document.getElementById('eval-retry-password-btn');
  if (evalRetryPasswordBtn) {
    evalRetryPasswordBtn.addEventListener('click', retryEvalUploadWithPassword);
  }

  const evalCancelBtn = document.getElementById('eval-cancel-btn');
  if (evalCancelBtn) {
    evalCancelBtn.addEventListener('click', cancelEvalUpload);
  }

  const evalConfirmBtn = document.getElementById('eval-confirm-btn');
  if (evalConfirmBtn) {
    evalConfirmBtn.addEventListener('click', confirmEvalData);
  }

  // Goals upload modal buttons
  const goalsRetryPasswordBtn = document.getElementById('goals-retry-password-btn');
  if (goalsRetryPasswordBtn) {
    goalsRetryPasswordBtn.addEventListener('click', retryGoalsUploadWithPassword);
  }

  const goalsCancelBtn = document.getElementById('goals-cancel-btn');
  if (goalsCancelBtn) {
    goalsCancelBtn.addEventListener('click', cancelGoalsUpload);
  }

  const goalsConfirmBtn = document.getElementById('goals-confirm-btn');
  if (goalsConfirmBtn) {
    goalsConfirmBtn.addEventListener('click', confirmGoalsData);
  }
}

// Initialize
export async function init(): Promise<void> {
  startLoading();
  bindEvents();
  await checkAuth();
  stopLoading();
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
