/**
 * Therapist Dashboard Controller
 * Handles UI state and user interactions
 */

import { api, type Therapist, type Student, type ApiError } from '../services/api';

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
