/**
 * Therapist Dashboard Controller
 * Handles UI state and user interactions
 */

import { api, type Therapist, type Student, type ApiError, type EvalData, type ExtractedGoal, type IEPGoal } from '../../services/api';
import { CATEGORY_HANDLER_MAP } from '../../constants/handler-map';
import { hideLoadingScreen } from '../../shared/components/LoadingScreen';

// Organized category groups for goal type selection
const ORGANIZED_LANGUAGE_CATEGORIES = [
  '---Vocabulary & Naming',
  'Vocabulary - Basic Vocab',
  'Vocabulary - Core Vocab',
  'Vocabulary - Animals',
  'Vocabulary - Food',
  'Vocabulary - Clothing',
  'Vocabulary - House',
  'Vocabulary - School',
  'Vocabulary - Beach',
  'Common Items Around The House',
  'Naming Community Helpers',
  'Noun Naming',
  'Function Labeling',

  '---Concepts & Relationships',
  'Semantic Relationships',
  'Categories - Label The Category',
  'Categories - Identifying Members Of A Category',
  'Identifying Parts Of A Whole',
  'Basic Spatial Concepts Fill In Word Or Phrase',
  'Basic Temporal Concepts - Before And After',
  'Before - After',
  'Understanding Quantitative Concepts',
  'Prepositions',
  'Prepositions Simple Images',

  '---Wh-Questions',
  'Wh- Questions Mixed',
  'Wh- Questions (What)',
  'Wh- Questions (When)',
  'Wh- Questions (Where)',
  'Wh- Questions (Who)',
  'Wh- Questions (Why)',
  'Wh Questions With Picture Choices',
  'Who Questions - Four Quadrants',
  'Wh- Questions Short Stories',
  'Questions For You',
  'Yes No Questions',

  '---Grammar & Syntax',
  'Pronouns (He She They)',
  'Pronouns - His Hers Him Her Their',
  'Pronouns Mixed',
  'Reflexive Pronouns',
  'Possessives Common Nouns',
  'Regular Plurals',
  'Irregular Plurals',
  'Do Vs Does',
  'Has Vs Have',
  'Is Vs Are',
  'Was Vs Were',
  'Third Person Singular',
  'Coordinating Conjuctions',
  'Subordinating Conjunctions',

  '---Verbs & Tenses',
  'Verbs - Basic Actions',
  'Verbs - Select From Three',
  'Future Tense',
  'Past Tense Verbs Regular',
  'Past Tense Verbs Irregular',
  'Irregular Past Tense Verbs',

  '---Adjectives & Describing',
  'Adjectives - Opposites',
  'Descriptive Words - Opposites',
  'Adverbs',
  'Describing',
  'Describing - More Advanced',
  'Describe The Scene Create One Sentence',

  '---Comparatives & Antonyms/Synonyms',
  'Comparatives - Superlatives',
  'Compare And Contrast (Same And Different)',
  'Antonyms',
  'Antonym Name One - Middle',
  'Synonyms',
  'Synonym-Name One - Middle',
  'Synonym Name One - Elementary',
  'Antonyms Level 2',
  'Synonyms Level 2',

  '---Figurative Language',
  'Idioms',
  'Metaphors Elementary',
  'Metaphors Middle',
  'Metaphors - Identify The Meaning',
  'Metaphors - Identify The Meaning - Multiple Choice',
  'Similes',
  'Similes - Identify The Meaning',
  'Similes - Identify The Meaning - Multiple Choice',
  'Figurative Language - Identify The Meaning',
  'Identify The Meaning',
  'Multiple Meaning Words',

  '---Analogies & Context',
  'Analogies Elementary',
  'Analogies Middle',
  'Analogies High',
  'Context Clues Define Word In Sentence',
  'Context Clues - Define Word In Paragraph',
  'Context Clues In Short Paragraphs',
  'Context Clues In Paragraphs - Fill In The Blank',

  '---Inferencing & Predictions',
  'Inferencing Level 1',
  'Inferencing Level 2',
  'Inferencing Based On Images',
  'What Will Happen',
  'What Will Happen - Predictions',

  '---Problem Solving',
  'Problem Solving',
  'Problem Solving Based On Images',
  'Problem Solving Part 2',

  '---Sequencing & Stories',
  'First Next Then Last',
  'Sequencing Images - Set Of 3 Or 4',
  'Short Stories Sequencing',
  'How To',
  'Basic Temporal Concepts Pick First - Second-Third',
  'Short Stories Level 1',
  'Short Stories Level 2',
  'Short Stories - High',

  '---Directions',
  'Following 1-Step Directions',
  'Following 2-Step Directions',
  'Following Multistep Directions Level 2',
  'Conditional Following Directions',
  'Following Directions - Conditional',

  '---Sentences',
  'Building Sentences Level 1 - Elementary',
  'Building Sentences Level 2 - Elementary',
  'Expanding Sentences - Images With Who What Where',

  '---Other',
  'Negation',
  'Negation Animals',
  'Negation Clothing',
  'Negation Colors',
  'Negation Food',
  'Negation Vehicles',
  'Which One Does Not Belong',
  'Rhyming',
  'Rhyming - Match The Words That Rhyme',
  'Sight Words',
  'Homophones',
  'Safety Signs',
  'Identify What Is Missing',
  'Naming And Categorizing',
  'Nouns Set Of Three',
  'Personal Hygiene Items',
  'Vocabulary General',
  'Vocabulary - Color',
  'Vocabulary - Shapes',
  'Vocabulary - Parts Of The Body',
  'Vocabulary - Parts Of The Body Preschool',
  'Vocabulary - Musical Instruments',
  'Vocabulary - Sports',
  'Vocabulary - Vehicles',
  'Vocabulary - Vehicles Preschool',
  'Vocabulary - Places In A Town Or City',
  'Vocabulary - Seasonal Fall',
  'Vocabulary - Seasonal Spring',
  'Vocabulary - Seasonal Winter',
  'Vocabulary - Halloween',
  'Vocabulary - Food Real Images',
];

const ORGANIZED_ARTICULATION_CATEGORIES = [
  '---Consonant Sounds',
  'B Sound',
  'P Sound',
  'M Sound',
  'T Sound',
  'D Sound',
  'N Sound',
  'K Sound',
  'G Sound',
  'F Sound',
  'V Sound',
  'S Sound',
  'Z Sound',
  'Sh Sound',
  'J Sound',
  'Ch Sound',
  'L Sound',
  'R Sound',
  'W Sound',
  'Y Sound',
  'H Sound',
  'Th Voiceless Sound',
  'Th Voiced Sound',
  'Ng Sound',

  '---Consonant Blends & Clusters',
  'S Blends Sound',
  'R Blends Sound',
  'L Blends Sound',
  'Consonant Clusters',

  '---Vowels & Phonology',
  'Vowels',
  'Phonology',
  'Syllable Shapes',
];

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

// Evaluation upload state
let pendingEvalFile: File | null = null;
let extractedEvalData: EvalData | null = null;
let currentPdfUrl: string | null = null;

// Goals upload state
let pendingGoalsFile: File | null = null;
let extractedGoals: ExtractedGoal[] = [];
let currentGoalsPdfUrl: string | null = null;
let studentGoals: IEPGoal[] = [];

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

  // Build display HTML with categorized fields
  const fieldCategories = {
    basic: {
      service_type: 'Service Type',
      languages_spoken: 'Languages Spoken',
      family_religion: 'Cultural/Religious Notes',
    },
    medical: {
      medical_history: 'Medical History',
      other_diagnoses: 'Other Diagnoses',
      speech_diagnoses: 'Speech/Language Diagnoses',
      prior_therapy: 'Prior Therapy',
    },
    performance: {
      baseline_accuracy: 'Baseline Accuracy',
      goals_benchmarks: 'Goals & Benchmarks',
      target_sounds: 'Target Sounds',
    },
    assessment: {
      strengths: 'Strengths',
      weaknesses: 'Weaknesses',
    },
    other: {
      teachers: 'Teachers/Contacts',
      notes: 'Additional Notes',
    },
  };

  let html = '<div class="eval-data-grid">';

  // Render fields by category
  for (const [category, fields] of Object.entries(fieldCategories)) {
    for (const [key, label] of Object.entries(fields)) {
      const field = evalData[key as keyof EvalData];

      let value: string | number | string[] | null = null;
      if (field) {
        if (typeof field === 'object' && 'value' in field) {
          value = field.value;
        } else if (typeof field === 'string' || typeof field === 'number') {
          value = field;
        }
      }

      // Show all fields, even if empty
      let displayValue: string;
      let isEmpty = false;

      if (value === null || value === undefined || value === '') {
        displayValue = 'Not provided';
        isEmpty = true;
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          displayValue = 'Not provided';
          isEmpty = true;
        } else {
          displayValue = value.join(', ');
        }
      } else {
        displayValue = String(value);
      }

      html += `
        <div class="eval-data-item${isEmpty ? ' eval-data-empty' : ''}">
          <span class="eval-data-label">${label}</span>
          <span class="eval-data-value">${displayValue}</span>
        </div>
      `;
    }
  }

  html += '</div>';
  container.innerHTML = html;
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
  console.log('🔍 populateEvalForm - Full data:', JSON.stringify(data, null, 2));

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

    console.log(`🔍 Field "${field}":`, fieldData);

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

      // Set confidence styling - yellow for missing or uncertain (< 0.7)
      const confidence = fieldData.confidence ?? 0;
      const hasValue = value !== null && value !== undefined && value !== '';
      if (fieldContainer) {
        fieldContainer.classList.remove('low-confidence');
        if (!hasValue || confidence < 0.7) {
          fieldContainer.classList.add('low-confidence');
        }
      }

      // Set hint
      if (hintEl) {
        if (fieldData.source_hint) {
          console.log(`✅ Setting hint for "${field}": ${fieldData.source_hint}`);
          hintEl.textContent = fieldData.source_hint;
        } else {
          console.log(`⚠️ No source_hint for "${field}"`);
          hintEl.textContent = '';
        }
      } else {
        console.log(`❌ No hintEl found for "${field}"`);
      }
    } else {
      inputEl.value = '';
      if (fieldContainer) {
        fieldContainer.classList.add('low-confidence');
      }
      if (hintEl) {
        hintEl.textContent = '';
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
      const pdfFrame = document.getElementById('eval-pdf-frame') as HTMLIFrameElement | null;
      if (pdfFrame) pdfFrame.src = currentPdfUrl;
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

  console.log('📤 SENDING EVALUATION TO BACKEND:', JSON.stringify({
    eval_data: evalData,
    service_type: serviceType,
  }, null, 2));

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

  // Add click handlers to show goal details modal
  container.querySelectorAll('.goal-item').forEach((item) => {
    item.addEventListener('click', () => {
      const goalId = parseInt(item.getAttribute('data-goal-id') || '0');
      const goal = studentGoals.find(g => g.id === goalId);
      if (goal) {
        showGoalDetailsModal(goal);
      }
    });
  });
}

function showGoalDetailsModal(goal: IEPGoal): void {
  // Populate baseline
  const baselineEl = document.getElementById('goal-detail-baseline');
  if (baselineEl) {
    baselineEl.textContent = goal.baseline || '';
  }

  // Populate deadline
  const deadlineEl = document.getElementById('goal-detail-deadline');
  if (deadlineEl) {
    deadlineEl.textContent = goal.target_date
      ? new Date(goal.target_date).toLocaleDateString()
      : '';
  }

  // Populate description
  const descEl = document.getElementById('goal-detail-description');
  if (descEl) {
    descEl.textContent = goal.goal_description;
  }

  // Populate goal type
  const typeEl = document.getElementById('goal-detail-type');
  if (typeEl) {
    typeEl.textContent = goal.goal_type === 'language' ? 'Language' : 'Articulation';
  }

  // Populate boardgame categories
  const categoriesEl = document.getElementById('goal-detail-categories');
  if (categoriesEl) {
    categoriesEl.innerHTML = '';
    if (goal.boardgame_categories) {
      try {
        const categories = JSON.parse(goal.boardgame_categories) as string[];
        if (categories && categories.length > 0) {
          categories.forEach(cat => {
            const badge = document.createElement('span');
            badge.className = 'goal-detail-category-badge';
            badge.textContent = cat;
            categoriesEl.appendChild(badge);
          });
        }
      } catch {
        // Invalid JSON, leave empty
      }
    }
  }

  // Populate target accuracy
  const targetEl = document.getElementById('goal-detail-target');
  if (targetEl) {
    targetEl.textContent = `${goal.target_percentage}%`;
  }

  // Populate sessions
  const sessionsEl = document.getElementById('goal-detail-sessions');
  if (sessionsEl) {
    sessionsEl.textContent = goal.sessions_to_confirm ? goal.sessions_to_confirm.toString() : '3';
  }

  // Populate comments
  const commentsEl = document.getElementById('goal-detail-comments');
  if (commentsEl) {
    commentsEl.textContent = goal.comments || '';
  }

  // Populate status
  const statusEl = document.getElementById('goal-detail-status');
  if (statusEl) {
    const statusText = goal.status === 'active' ? 'Active' :
                       goal.status === 'achieved' ? 'Achieved' : 'Discontinued';
    statusEl.textContent = statusText;
  }

  // Populate current progress
  const progressEl = document.getElementById('goal-detail-progress');
  if (progressEl) {
    progressEl.textContent = `${goal.current_percentage ?? 0}%`;
  }

  // Populate created date
  const createdEl = document.getElementById('goal-detail-created');
  if (createdEl) {
    createdEl.textContent = new Date(goal.created_at).toLocaleDateString();
  }

  // Populate updated date
  const updatedEl = document.getElementById('goal-detail-updated');
  if (updatedEl) {
    updatedEl.textContent = new Date(goal.updated_at).toLocaleDateString();
  }

  // Show modal
  openModal('goal-details-modal');
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

/**
 * Generate category checkboxes organized by groups
 * @param categories - Array of categories with '---' prefixed group headers
 * @param goalIndex - Goal index for unique IDs
 * @param selectedCategories - Array of pre-selected category names
 */
function generateCategoryCheckboxes(categories: string[], goalIndex: number, selectedCategories: string[] = []): string {
  let html = '';
  let currentGroup: string | null = null;

  categories.forEach((cat) => {
    if (cat.startsWith('---')) {
      // Close previous group
      if (currentGroup !== null) {
        html += '</div>'; // Close category-group
      }
      // Start new group
      const groupName = cat.replace('---', '').trim();
      currentGroup = groupName;
      html += `<div class="category-group">
                 <div class="category-group-header">${groupName}</div>`;
    } else {
      // Category checkbox
      const isChecked = selectedCategories.includes(cat);
      const checkboxId = `goal-${goalIndex}-cat-${cat.replace(/[^a-zA-Z0-9]/g, '-')}`;
      html += `
        <label class="category-checkbox">
          <input type="checkbox" id="${checkboxId}" value="${cat}" data-goal-index="${goalIndex}" ${isChecked ? 'checked' : ''}>
          <span>${cat}</span>
        </label>`;
    }
  });

  // Close last group
  if (currentGroup !== null) {
    html += '</div>';
  }

  return html;
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
    const baseline = goal.baseline?.value || '';
    const deadline = goal.deadline?.value || '';
    const sessions = goal.sessions_to_confirm?.value || 3;
    const comments = goal.comments?.value || '';
    const boardgameCategories = goal.boardgame_categories?.value || [];

    // Extract source hints
    const baselineHint = goal.baseline?.source_hint || '';
    const deadlineHint = (goal.deadline?.source_hint || goal.target_date?.source_hint) || '';
    const descriptionHint = goal.goal_description?.source_hint || '';
    const targetPctHint = goal.target_percentage?.source_hint || '';
    const sessionsHint = goal.sessions_to_confirm?.source_hint || '';
    const commentsHint = goal.comments?.source_hint || '';
    const categoriesReasoning = goal.boardgame_categories?.reasoning || goal.goal_type?.reasoning || '';

    // Determine low-confidence classes (yellow highlighting for missing/uncertain)
    const baselineConfidence = goal.baseline?.confidence ?? 0;
    const baselineLowConf = !baseline || baselineConfidence < 0.7 ? 'low-confidence' : '';
    const deadlineConfidence = Math.max(goal.deadline?.confidence ?? 0, goal.target_date?.confidence ?? 0);
    const deadlineLowConf = !deadline || deadlineConfidence < 0.7 ? 'low-confidence' : '';
    const descConfidence = goal.goal_description?.confidence ?? 0;
    const descLowConf = !description || descConfidence < 0.7 ? 'low-confidence' : '';
    const targetPctConfidence = goal.target_percentage?.confidence ?? 0;
    const targetPctLowConf = targetPctConfidence < 0.7 ? 'low-confidence' : '';
    const sessionsConfidence = goal.sessions_to_confirm?.confidence ?? 0;
    const sessionsLowConf = sessionsConfidence < 0.7 ? 'low-confidence' : '';
    const commentsConfidence = goal.comments?.confidence ?? 0;
    const commentsLowConf = !comments || commentsConfidence < 0.7 ? 'low-confidence' : '';
    const categoriesConfidence = goal.boardgame_categories?.confidence ?? 0;
    const categoriesLowConf = boardgameCategories.length === 0 || categoriesConfidence < 0.7 ? 'low-confidence' : '';

    // Determine which categories to show based on goal type
    const categoriesToShow = goalType === 'articulation' ? ORGANIZED_ARTICULATION_CATEGORIES : ORGANIZED_LANGUAGE_CATEGORIES;
    const selectedCategories = boardgameCategories.length > 0 ? boardgameCategories : [];

    html += `
      <div class="extracted-goal-item" data-index="${index}">
        <div class="goal-header">
          <h3 class="goal-number">Goal ${index + 1}</h3>
        </div>

        <!-- Measurable Baseline -->
        <div class="goal-form-row ${baselineLowConf}">
          <label>Measurable Baseline:</label>
          <input type="text" class="goal-baseline-input" value="${baseline}" placeholder="e.g., 60% accuracy at word level">
          ${baselineHint ? `<span class="field-hint">${baselineHint}</span>` : ''}
        </div>

        <!-- Proposed Goal Section -->
        <div class="proposed-goal-section">
          <h4>Proposed Goal:</h4>

          <div class="goal-form-row ${deadlineLowConf}">
            <label>Deadline:</label>
            <input type="text" class="goal-deadline-input" value="${deadline}" placeholder="e.g., By February 2026">
            ${deadlineHint ? `<span class="field-hint">${deadlineHint}</span>` : ''}
          </div>

          <div class="goal-form-row ${descLowConf}">
            <label>Description:</label>
            <textarea class="goal-description-input" rows="3" placeholder="Full goal description...">${description}</textarea>
            ${descriptionHint ? `<span class="field-hint">${descriptionHint}</span>` : ''}
          </div>

          <div class="goal-form-row ${categoriesLowConf}">
            <label>Goal Types (select matching boardgame cards):</label>
            ${selectedCategories.length > 0 ? `<div class="ai-detected-hint">AI detected: <strong>${goalType}</strong> (${selectedCategories.length} cards auto-selected)</div>` : `<div class="ai-detected-hint">AI detected: <strong>${goalType}</strong> (no specific cards selected - please select manually)</div>`}
            ${categoriesReasoning ? `<span class="field-hint">${categoriesReasoning}</span>` : ''}
            <div class="goal-types-multiselect" data-goal-index="${index}">
              ${generateCategoryCheckboxes(categoriesToShow, index, selectedCategories)}
            </div>
          </div>

          <div class="goal-form-row-split">
            <div class="goal-form-row ${targetPctLowConf}">
              <label>Target Accuracy %:</label>
              <select class="goal-target-input">
                <option value="50" ${targetPct === 50 ? 'selected' : ''}>50%</option>
                <option value="60" ${targetPct === 60 ? 'selected' : ''}>60%</option>
                <option value="70" ${targetPct === 70 ? 'selected' : ''}>70%</option>
                <option value="75" ${targetPct === 75 ? 'selected' : ''}>75%</option>
                <option value="80" ${targetPct === 80 ? 'selected' : ''}>80%</option>
                <option value="85" ${targetPct === 85 ? 'selected' : ''}>85%</option>
                <option value="90" ${targetPct === 90 ? 'selected' : ''}>90%</option>
              </select>
              ${targetPctHint ? `<span class="field-hint">${targetPctHint}</span>` : ''}
            </div>

            <div class="goal-form-row ${sessionsLowConf}">
              <label>Sessions to Confirm:</label>
              <select class="goal-sessions-input">
                <option value="2" ${sessions === 2 ? 'selected' : ''}>2</option>
                <option value="3" ${sessions === 3 ? 'selected' : ''}>3</option>
                <option value="4" ${sessions === 4 ? 'selected' : ''}>4</option>
                <option value="5" ${sessions === 5 ? 'selected' : ''}>5</option>
              </select>
              ${sessionsHint ? `<span class="field-hint">${sessionsHint}</span>` : ''}
            </div>
          </div>

          <div class="goal-form-row ${commentsLowConf}">
            <label>Comments:</label>
            <textarea class="goal-comments-input" rows="2" placeholder="e.g., Based on assessment results...">${comments}</textarea>
            ${commentsHint ? `<span class="field-hint">${commentsHint}</span>` : ''}
          </div>
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

  goalItems.forEach((item, index) => {
    const descInput = item.querySelector('.goal-description-input') as HTMLTextAreaElement;
    const targetInput = item.querySelector('.goal-target-input') as HTMLSelectElement;
    const baselineInput = item.querySelector('.goal-baseline-input') as HTMLInputElement;
    const deadlineInput = item.querySelector('.goal-deadline-input') as HTMLInputElement;
    const sessionsInput = item.querySelector('.goal-sessions-input') as HTMLSelectElement;
    const commentsInput = item.querySelector('.goal-comments-input') as HTMLTextAreaElement;

    // Collect selected boardgame categories from checkboxes
    const categoryCheckboxes = item.querySelectorAll('.goal-types-multiselect input[type="checkbox"]:checked');
    const selectedCategories: string[] = [];
    categoryCheckboxes.forEach((checkbox) => {
      selectedCategories.push((checkbox as HTMLInputElement).value);
    });

    // Infer goal_type from selected categories
    let goalType: 'language' | 'articulation' = 'language';
    if (selectedCategories.length > 0) {
      // Check if any selected category is in articulation list
      const hasArticulation = selectedCategories.some(cat =>
        ORGANIZED_ARTICULATION_CATEGORIES.includes(cat)
      );
      goalType = hasArticulation ? 'articulation' : 'language';
    }

    goals.push({
      goal_type: { value: goalType, confidence: 0.9 },
      goal_description: { value: descInput.value || null, confidence: 0.9 },
      target_percentage: { value: parseInt(targetInput.value) || 80, confidence: 0.9 },
      target_date: { value: null, confidence: 0.9 },
      baseline: { value: baselineInput.value || null, confidence: 0.9 },
      deadline: { value: deadlineInput.value || null, confidence: 0.9 },
      sessions_to_confirm: { value: parseInt(sessionsInput.value) || 3, confidence: 0.9 },
      comments: { value: commentsInput.value || null, confidence: 0.9 },
      boardgame_categories: { value: selectedCategories.length > 0 ? selectedCategories : null, confidence: 0.9 },
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
    console.log('🎯 EXTRACTED GOALS FROM AI:', JSON.stringify(extractedGoals, null, 2));

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

  console.log('📤 SENDING GOALS TO BACKEND:', JSON.stringify(goals, null, 2));

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

// Theme switching
function initThemeSelector(): void {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeSelectorPanel = document.getElementById('themeSelectorPanel');
  const themeButtons = document.querySelectorAll('.theme-btn');

  let currentTheme = 'autumn';
  document.body.classList.add('theme-autumn');

  // Toggle theme panel
  themeToggleBtn?.addEventListener('click', () => {
    themeSelectorPanel?.classList.toggle('hidden');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.theme-selector-floating')) {
      themeSelectorPanel?.classList.add('hidden');
    }
  });

  // Update theme decorations
  function updateThemeDecorations(theme: string) {
    const decorations: Record<string, string[]> = {
      spring: ['🌸', '🌷'],
      summer: ['☀️', '🌻'],
      autumn: ['🍂', '🍁'],
      winter: ['❄', '🌨️']
    };

    const decorationIcon = decorations[theme] || decorations.autumn;
    const snowflakes = document.querySelectorAll('.snowflake');
    snowflakes.forEach((flake, index) => {
      flake.textContent = decorationIcon[index % 2];
    });
  }

  // Theme button click handlers
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = (btn as HTMLElement).dataset.theme || 'autumn';

      // Remove previous theme class
      document.body.classList.remove(`theme-${currentTheme}`);
      currentTheme = theme;
      document.body.classList.add(`theme-${theme}`);

      // Update active state
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update decorations
      updateThemeDecorations(theme);
    });
  });

  // Initialize decorations
  updateThemeDecorations(currentTheme);
}

// Initialize
export async function init(): Promise<void> {
  bindEvents();
  await checkAuth();
  initThemeSelector();
  // Hide loading screen using shared component
  hideLoadingScreen(300);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
