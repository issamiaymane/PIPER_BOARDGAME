/**
 * Therapist Dashboard Controller
 * Handles UI state and user interactions
 */

import { api, type Therapist, type Student, type ApiError, type EvalData } from '../services/api';

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

// Make closeModal available globally for onclick handlers
(window as unknown as { closeModal: typeof closeModal }).closeModal = closeModal;

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

// Expose functions globally for onclick handlers
const TherapistApp = {
  retryEvalUploadWithPassword,
  cancelEvalUpload,
  confirmEvalData,
};
(window as unknown as { TherapistApp: typeof TherapistApp }).TherapistApp = TherapistApp;

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

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) hide(modal as HTMLElement);
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
