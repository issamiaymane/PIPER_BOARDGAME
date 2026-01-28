/**
 * Therapist Dashboard Controller
 * Handles UI state and user interactions
 */

import { api, type Therapist, type Student, type ApiError, type EvalData, type ExtractedGoal, type IEPGoal, type GameplaySession, type SessionWithResponses, type LiveSessionInfo, type School, type Member, type Objective } from './services/api';
import { therapistLiveService, type LiveCardEvent, type LiveResponseEvent, type SessionSummary } from './services/live';
// Categories imported from @shared/categories are defined in ORGANIZED_*_CATEGORIES below
import { hideLoadingScreen } from '@common/components/LoadingScreen';

/**
 * Organized category groups for goal type selection UI
 * Categories are from shared/categories.ts, organized with UI group headers (---)
 * When adding new categories, add to shared/categories.ts first, then organize here
 */
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

/**
 * Organized articulation categories for goal type selection UI
 * Categories are from shared/categories.ts → ARTICULATION_CATEGORIES, organized with UI group headers
 */
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

// Navigation state
let currentPage = 'dashboard';
let schools: School[] = [];
let members: Member[] = [];

// Evaluation upload state
let pendingEvalFile: File | null = null;
let extractedEvalData: EvalData | null = null;
let currentPdfUrl: string | null = null;

// Goals upload state
let pendingGoalsFile: File | null = null;
let extractedGoals: ExtractedGoal[] = [];
let currentGoalsPdfUrl: string | null = null;
let studentGoals: IEPGoal[] = [];
let currentGoalIndex = 0;

// Sessions state
let liveSessions: LiveSessionInfo[] = [];
let sessionHistory: GameplaySession[] = [];
let currentLiveCard: { sessionId: number; cardQuestion: string } | null = null;

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
    // Update sidebar therapist info
    const sidebarName = document.getElementById('sidebar-therapist-name');
    if (sidebarName) {
      sidebarName.textContent = `${currentTherapist.first_name} ${currentTherapist.last_name}`;
    }
    const sidebarEmail = document.getElementById('sidebar-therapist-email');
    if (sidebarEmail) {
      sidebarEmail.textContent = currentTherapist.email;
    }
  }

  // Initialize navigation to dashboard page
  navigate('dashboard');

  // Initialize live WebSocket for real-time session monitoring
  initLiveWebSocket();
}

// ============================================
// Navigation Functions
// ============================================

function navigate(page: string): void {
  currentPage = page;

  // Update nav item active states
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === page);
  });

  // Show/hide pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  // Load data for the page
  if (page === 'dashboard') {
    loadDashboardStats();
  } else if (page === 'schools') {
    loadSchools();
  } else if (page === 'members') {
    loadMembers();
  } else if (page === 'students') {
    loadStudentsPage();
  }
}

async function loadStudentsPage(): Promise<void> {
  // Load students list
  try {
    students = await api.listStudents();
  } catch (err) {
    console.error('Failed to load students:', err);
  }

  // If no student selected, show empty state and open modal
  if (!selectedStudentId) {
    show($('no-student-selected'));
    hide($('student-profile'));
    // Open the select student modal
    openSelectStudentModal();
  } else {
    // Refresh the selected student's data
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      selectStudent(student.id);
    } else {
      // Student no longer exists
      selectedStudentId = null;
      show($('no-student-selected'));
      hide($('student-profile'));
    }
  }
}

function openSelectStudentModal(): void {
  renderStudentModalList();
  openModal('select-student-modal');
}

function renderStudentModalList(filter = ''): void {
  const listEl = document.getElementById('student-modal-list');
  if (!listEl) return;

  const filteredStudents = filter
    ? students.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(filter.toLowerCase())
      )
    : students;

  if (filteredStudents.length === 0) {
    listEl.innerHTML = filter
      ? '<p class="empty-state">No students match your search</p>'
      : '<p class="empty-state">No students yet. Click "+ ADD NEW" to create one.</p>';
    return;
  }

  listEl.innerHTML = filteredStudents
    .map(s => `
      <div class="student-item" data-id="${s.id}">
        <div class="student-avatar">${s.first_name.charAt(0)}${s.last_name.charAt(0)}</div>
        <div class="student-info">
          <span class="student-name">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</span>
          <span class="student-grade">${s.grade_level || 'No grade'}</span>
        </div>
      </div>
    `)
    .join('');

  // Add click handlers
  listEl.querySelectorAll('.student-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.getAttribute('data-id') || '0');
      selectStudent(id);
      closeModal('select-student-modal');
    });
  });
}

async function loadDashboardStats(): Promise<void> {
  // Load all data for stats
  try {
    const [schoolsData, membersData, studentsData] = await Promise.all([
      api.listSchools(),
      api.listMembers(),
      api.listStudents()
    ]);

    schools = schoolsData;
    members = membersData;
    students = studentsData;

    // Update stats display
    const statsSchools = document.getElementById('stats-schools');
    const statsMembers = document.getElementById('stats-members');
    const statsStudents = document.getElementById('stats-students');

    if (statsSchools) statsSchools.textContent = String(schools.length);
    if (statsMembers) statsMembers.textContent = String(members.length);
    if (statsStudents) statsStudents.textContent = String(students.length);
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
  }
}

// ============================================
// Schools Management Functions
// ============================================

async function loadSchools(): Promise<void> {
  const listEl = document.getElementById('schools-list');
  if (!listEl) return;

  try {
    schools = await api.listSchools();
    renderSchoolsList();
  } catch (err) {
    listEl.innerHTML = '<p class="empty-state">Failed to load schools</p>';
  }
}

function renderSchoolsList(): void {
  const listEl = document.getElementById('schools-list');
  if (!listEl) return;

  if (schools.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No schools yet. Click "+ ADD SCHOOL" to create one.</p>';
    return;
  }

  listEl.innerHTML = schools.map(school => `
    <div class="data-list-item" data-id="${school.id}">
      <div class="data-list-item-info">
        <div class="data-list-item-name">${escapeHtml(school.name)}</div>
        <div class="data-list-item-detail">
          ${school.contact_name ? escapeHtml(school.contact_name) : 'No contact'}
          ${school.contact_email ? ` • ${escapeHtml(school.contact_email)}` : ''}
        </div>
      </div>
      <div class="data-list-item-actions">
        <span class="data-list-item-meta">${school.member_count || 0} members</span>
        <button class="btn-delete-small" data-delete-school="${school.id}">Delete</button>
      </div>
    </div>
  `).join('');

  // Add delete handlers
  listEl.querySelectorAll('[data-delete-school]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-delete-school') || '0');
      if (id) handleDeleteSchool(id);
    });
  });
}

function populateSchoolModal(): void {
  // Populate admin dropdown with members who have admin roles
  const adminSelect = document.getElementById('school-admin') as HTMLSelectElement | null;
  if (adminSelect) {
    adminSelect.innerHTML = '<option value="">Select an admin</option>';
    const admins = members.filter(m =>
      m.roles.includes('School Admin') || m.roles.includes('SLP')
    );
    admins.forEach(member => {
      const option = document.createElement('option');
      option.value = String(member.id);
      option.textContent = `${member.name} (${member.email})`;
      adminSelect.appendChild(option);
    });
  }

  // Populate members list with checkboxes
  const membersListEl = document.getElementById('school-members-list');
  if (membersListEl) {
    if (members.length === 0) {
      membersListEl.innerHTML = '<p class="empty-state-small">No members available</p>';
    } else {
      membersListEl.innerHTML = members.map(member => `
        <label class="member-checkbox-item">
          <input type="checkbox" name="school-members" value="${member.id}">
          <div class="member-info">
            <div class="member-name">${escapeHtml(member.name)}</div>
            <div class="member-email">${escapeHtml(member.email)}</div>
          </div>
        </label>
      `).join('');
    }
  }
}

async function handleCreateSchool(e: Event): Promise<void> {
  e.preventDefault();

  const nameInput = document.getElementById('school-name') as HTMLInputElement;
  const contactNameInput = document.getElementById('school-contact-name') as HTMLInputElement;
  const contactEmailInput = document.getElementById('school-contact-email') as HTMLInputElement;
  const contactPhoneInput = document.getElementById('school-contact-phone') as HTMLInputElement;
  const adminSelect = document.getElementById('school-admin') as HTMLSelectElement;
  const errorEl = document.getElementById('create-school-error');

  if (errorEl) hide(errorEl);

  // Get selected members
  const memberCheckboxes = document.querySelectorAll('input[name="school-members"]:checked');
  const selectedMemberIds: number[] = [];
  memberCheckboxes.forEach(checkbox => {
    selectedMemberIds.push(parseInt((checkbox as HTMLInputElement).value));
  });

  try {
    const school = await api.createSchool({
      name: nameInput.value,
      contact_name: contactNameInput.value || undefined,
      contact_email: contactEmailInput.value || undefined,
      contact_phone: contactPhoneInput.value || undefined,
      admin_id: adminSelect.value ? parseInt(adminSelect.value) : undefined,
      member_ids: selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
    });

    schools.push(school);
    renderSchoolsList();

    // Update member school dropdown
    updateMemberSchoolDropdown();

    // Reload members to reflect school assignments
    await loadMembers();

    // Close modal and reset form
    closeModal('create-school-modal');
    (document.getElementById('create-school-form') as HTMLFormElement).reset();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = (err as ApiError).message;
      show(errorEl);
    }
  }
}

async function handleDeleteSchool(id: number): Promise<void> {
  const school = schools.find(s => s.id === id);
  if (!school) return;

  const confirmed = confirm(`Delete "${school.name}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await api.deleteSchool(id);
    schools = schools.filter(s => s.id !== id);
    renderSchoolsList();
    updateMemberSchoolDropdown();
  } catch (err) {
    alert((err as ApiError).message);
  }
}

// ============================================
// Members Management Functions
// ============================================

async function loadMembers(): Promise<void> {
  const listEl = document.getElementById('members-list');
  if (!listEl) return;

  try {
    members = await api.listMembers();
    renderMembersList();
  } catch (err) {
    listEl.innerHTML = '<p class="empty-state">Failed to load members</p>';
  }
}

function renderMembersList(): void {
  const listEl = document.getElementById('members-list');
  if (!listEl) return;

  if (members.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No members yet. Click "+ INVITE MEMBER" to add one.</p>';
    return;
  }

  listEl.innerHTML = members.map(member => {
    const roleBadges = member.roles.map(role => {
      const roleClass = role.toLowerCase().replace(/\s+/g, '-');
      return `<span class="role-badge ${roleClass}">${escapeHtml(role)}</span>`;
    }).join('');

    return `
      <div class="data-list-item" data-id="${member.id}">
        <div class="data-list-item-info">
          <div class="data-list-item-name">${escapeHtml(member.name)}</div>
          <div class="data-list-item-detail">${escapeHtml(member.email)}</div>
          <div class="role-badges">${roleBadges}</div>
        </div>
        <div class="data-list-item-actions">
          ${member.school_name ? `<span class="data-list-item-meta">${escapeHtml(member.school_name)}</span>` : ''}
          <button class="btn-delete-small" data-delete-member="${member.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add delete handlers
  listEl.querySelectorAll('[data-delete-member]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-delete-member') || '0');
      if (id) handleDeleteMember(id);
    });
  });
}

async function handleInviteMember(e: Event): Promise<void> {
  e.preventDefault();

  const nameInput = document.getElementById('member-name') as HTMLInputElement;
  const emailInput = document.getElementById('member-email') as HTMLInputElement;
  const passwordInput = document.getElementById('member-password') as HTMLInputElement;
  const schoolSelect = document.getElementById('member-school') as HTMLSelectElement;
  const errorEl = document.getElementById('invite-member-error');

  // Get selected roles
  const roleCheckboxes = document.querySelectorAll('input[name="member-roles"]:checked');
  const selectedRoles: string[] = [];
  roleCheckboxes.forEach(checkbox => {
    selectedRoles.push((checkbox as HTMLInputElement).value);
  });

  if (selectedRoles.length === 0) {
    if (errorEl) {
      errorEl.textContent = 'Please select at least one role';
      show(errorEl);
    }
    return;
  }

  if (errorEl) hide(errorEl);

  try {
    const member = await api.inviteMember({
      name: nameInput.value,
      email: emailInput.value,
      password: passwordInput.value,
      roles: selectedRoles,
      school_id: schoolSelect.value ? parseInt(schoolSelect.value) : undefined,
    });

    members.push(member);
    renderMembersList();

    // Close modal and reset form
    closeModal('invite-member-modal');
    (document.getElementById('invite-member-form') as HTMLFormElement).reset();
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = (err as ApiError).message;
      show(errorEl);
    }
  }
}

async function handleDeleteMember(id: number): Promise<void> {
  const member = members.find(m => m.id === id);
  if (!member) return;

  const confirmed = confirm(`Remove "${member.name}"? This cannot be undone.`);
  if (!confirmed) return;

  try {
    await api.deleteMember(id);
    members = members.filter(m => m.id !== id);
    renderMembersList();
  } catch (err) {
    alert((err as ApiError).message);
  }
}

function updateMemberSchoolDropdown(): void {
  const select = document.getElementById('member-school') as HTMLSelectElement | null;
  if (!select) return;

  // Keep the first "No school" option
  const firstOption = select.options[0];
  select.innerHTML = '';
  select.appendChild(firstOption);

  // Add school options
  schools.forEach(school => {
    const option = document.createElement('option');
    option.value = String(school.id);
    option.textContent = school.name;
    select.appendChild(option);
  });
}

// Modal helpers
function openModal(modalId: string): void {
  show($(modalId));
}

function closeModal(modalId: string): void {
  hide($(modalId));
}

// Modal close functionality is now handled via event listeners

// Student list - now loaded via loadStudentsPage
async function loadStudents(): Promise<void> {
  try {
    students = await api.listStudents();
  } catch (err) {
    console.error('Failed to load students:', err);
  }
}

function selectStudent(id: number): void {
  selectedStudentId = id;
  const student = students.find((s) => s.id === id);

  if (!student) return;

  // Show profile
  hide($('no-student-selected'));
  show($('student-profile'));

  // Populate profile
  $('profile-avatar').textContent = `${student.first_name.charAt(0)}${student.last_name.charAt(0)}`;
  $('profile-name').textContent = `${student.first_name} ${student.last_name}`;
  $('profile-details').textContent = student.grade_level || 'No grade level set';

  // Populate student info card
  $('child-first-name').textContent = student.first_name || '—';
  $('child-last-name').textContent = student.last_name || '—';
  $('child-grade').textContent = student.grade_level || '—';
  $('child-dob').textContent = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // Look up SLP name from members list
  const slp = student.slp_id ? members.find(m => m.id === student.slp_id) : null;
  $('child-slp').textContent = slp?.name || '—';

  // Look up School name from schools list
  const school = student.school_id ? schools.find(s => s.id === student.school_id) : null;
  $('child-school').textContent = school?.name || '—';

  $('child-username').textContent = student.username || '—';

  // Render evaluation data
  renderEvalData(student);

  // Load and render goals
  loadStudentGoals(student.id);

  // Load and render sessions
  loadSessionHistory(student.id);
  renderLiveSessions(); // Update live sessions to show only this student's sessions
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

  // Build display HTML with categorized sections
  const sections = [
    {
      id: 'basic',
      title: 'Basic Information',
      icon: '📋',
      fields: {
        service_type: 'Service Type',
        languages_spoken: 'Languages Spoken',
        family_religion: 'Cultural/Religious Notes',
      },
    },
    {
      id: 'medical',
      title: 'Medical & Diagnoses',
      icon: '🏥',
      fields: {
        medical_history: 'Medical History',
        other_diagnoses: 'Other Diagnoses',
        speech_diagnoses: 'Speech/Language Diagnoses',
        prior_therapy: 'Prior Therapy',
      },
    },
    {
      id: 'performance',
      title: 'Performance & Goals',
      icon: '🎯',
      fields: {
        baseline_accuracy: 'Baseline Accuracy',
        goals_benchmarks: 'Goals & Benchmarks',
        target_sounds: 'Target Sounds',
      },
    },
    {
      id: 'assessment',
      title: 'Assessment',
      icon: '📊',
      fields: {
        strengths: 'Strengths',
        weaknesses: 'Weaknesses',
      },
    },
    {
      id: 'other',
      title: 'Other Information',
      icon: '📝',
      fields: {
        teachers: 'Teachers/Contacts',
        notes: 'Additional Notes',
      },
    },
  ];

  let html = '<div class="eval-sections">';

  // Render each section as collapsible accordion
  for (const section of sections) {
    // Check if section has any non-empty values
    let hasValues = false;
    const fieldsHtml: string[] = [];

    for (const [key, label] of Object.entries(section.fields)) {
      const field = evalData[key as keyof EvalData];

      let value: string | number | string[] | null = null;
      if (field) {
        if (typeof field === 'object' && 'value' in field) {
          value = field.value;
        } else if (typeof field === 'string' || typeof field === 'number') {
          value = field;
        }
      }

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
        hasValues = true;
      }

      if (!isEmpty) hasValues = true;

      // Show all fields, including empty ones
      fieldsHtml.push(`
        <div class="eval-field-item${isEmpty ? ' empty' : ''}">
          <span class="eval-field-label">${label}</span>
          <span class="eval-field-value${isEmpty ? ' empty-value' : ''}">${escapeHtml(displayValue)}</span>
        </div>
      `);
    }

    // Always render sections (show all fields)
    if (fieldsHtml.length > 0) {
      html += `
        <details class="eval-section-accordion">
          <summary class="eval-section-header">
            <span class="eval-section-icon">${section.icon}</span>
            <span class="eval-section-title">${section.title}</span>
            <span class="eval-section-count">${fieldsHtml.length}</span>
            <svg class="eval-section-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6,9 12,15 18,9"></polyline>
            </svg>
          </summary>
          <div class="eval-section-content">
            ${fieldsHtml.join('')}
          </div>
        </details>
      `;
    }
  }

  html += '</div>';
  container.innerHTML = html;
}

// Populate Add Student modal dropdowns
function populateStudentModal(): void {
  // Populate SLP dropdown with members who have SLP role
  const slpSelect = document.getElementById('student-slp') as HTMLSelectElement | null;
  if (slpSelect) {
    slpSelect.innerHTML = '<option value="">Select an SLP</option>';
    const slps = members.filter(m => m.roles.includes('SLP'));
    slps.forEach(member => {
      const option = document.createElement('option');
      option.value = String(member.id);
      option.textContent = `${member.name} (${member.email})`;
      slpSelect.appendChild(option);
    });
  }

  // Populate School dropdown
  const schoolSelect = document.getElementById('student-school') as HTMLSelectElement | null;
  if (schoolSelect) {
    schoolSelect.innerHTML = '<option value="">Select a school</option>';
    schools.forEach(school => {
      const option = document.createElement('option');
      option.value = String(school.id);
      option.textContent = school.name;
      schoolSelect.appendChild(option);
    });
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
  const slpSelect = document.getElementById('student-slp') as HTMLSelectElement;
  const schoolSelect = document.getElementById('student-school') as HTMLSelectElement;
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
      slp_id: slpSelect.value ? parseInt(slpSelect.value) : undefined,
      school_id: schoolSelect.value ? parseInt(schoolSelect.value) : undefined,
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

    renderStudentModalList();
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

  // Populate session time (from goal data)
  const durationEl = document.getElementById('goal-detail-duration');
  if (durationEl) {
    durationEl.textContent = goal.session_duration_minutes
      ? `${goal.session_duration_minutes} minutes`
      : 'Not specified';
  }
  const frequencyEl = document.getElementById('goal-detail-frequency');
  if (frequencyEl) {
    frequencyEl.textContent = goal.session_frequency || 'Not specified';
  }

  // Populate objectives
  const objectivesList = document.getElementById('goal-detail-objectives-list');
  if (objectivesList) {
    objectivesList.innerHTML = '';
    let hasObjectives = false;

    if (goal.objectives) {
      try {
        const objectives = JSON.parse(goal.objectives) as Objective[];
        if (objectives && objectives.length > 0) {
          hasObjectives = true;
          objectives.forEach((obj, index) => {
            const objEl = document.createElement('div');
            objEl.className = 'goal-detail-objective-item';
            objEl.innerHTML = `
              <div class="objective-item-header">
                <span class="objective-item-number">Objective ${index + 1}</span>
                <span class="objective-item-target">${obj.target_percentage}%</span>
              </div>
              <p class="objective-item-description">${obj.description}</p>
              ${obj.deadline ? `<p class="objective-item-deadline">Deadline: ${obj.deadline}</p>` : ''}
            `;
            objectivesList.appendChild(objEl);
          });
        }
      } catch {
        // Invalid JSON, show empty state
      }
    }

    if (!hasObjectives) {
      objectivesList.innerHTML = '<p class="empty-objectives">No objectives specified</p>';
    }
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
  currentGoalIndex = 0;

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

// Goal navigation functions
function showGoalAtIndex(index: number): void {
  const container = $('extracted-goals-list');
  const goalItems = container.querySelectorAll('.extracted-goal-item');
  const totalGoals = goalItems.length;

  if (totalGoals === 0) return;

  // Clamp index
  currentGoalIndex = Math.max(0, Math.min(index, totalGoals - 1));

  // Hide all goals, show current
  goalItems.forEach((item, i) => {
    (item as HTMLElement).style.display = i === currentGoalIndex ? 'block' : 'none';
  });

  // Update counter
  const counter = document.getElementById('goals-counter');
  if (counter) {
    counter.textContent = `Goal ${currentGoalIndex + 1} of ${totalGoals}`;
  }

  // Update button states
  const prevBtn = document.getElementById('goals-prev-btn') as HTMLButtonElement;
  const nextBtn = document.getElementById('goals-next-btn') as HTMLButtonElement;

  if (prevBtn) {
    prevBtn.disabled = currentGoalIndex === 0;
  }
  if (nextBtn) {
    nextBtn.disabled = currentGoalIndex === totalGoals - 1;
  }
}

function showNextGoal(): void {
  showGoalAtIndex(currentGoalIndex + 1);
}

function showPrevGoal(): void {
  showGoalAtIndex(currentGoalIndex - 1);
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

// ============================================
// Add Goal Modal Functions
// ============================================

function openAddGoalModal(): void {
  const student = students.find(s => s.id === selectedStudentId);

  // Reset form fields
  const baselineInput = document.getElementById('add-goal-baseline') as HTMLInputElement;
  const deadlineInput = document.getElementById('add-goal-deadline') as HTMLInputElement;
  const descriptionInput = document.getElementById('add-goal-description') as HTMLTextAreaElement;
  const targetSelect = document.getElementById('add-goal-target') as HTMLSelectElement;
  const sessionsSelect = document.getElementById('add-goal-sessions') as HTMLSelectElement;
  const commentsInput = document.getElementById('add-goal-comments') as HTMLTextAreaElement;
  const durationInput = document.getElementById('add-goal-duration') as HTMLInputElement;
  const frequencyInput = document.getElementById('add-goal-frequency') as HTMLInputElement;

  if (baselineInput) baselineInput.value = '';
  if (deadlineInput) deadlineInput.value = '';
  if (descriptionInput) descriptionInput.value = '';
  if (targetSelect) targetSelect.value = '80';
  if (sessionsSelect) sessionsSelect.value = '3';
  if (commentsInput) commentsInput.value = '';
  if (durationInput) durationInput.value = student?.session_duration_minutes?.toString() || '';
  if (frequencyInput) frequencyInput.value = student?.session_frequency || '';

  // Reset goal type toggle to Language
  const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
  goalTypeBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-type') === 'language') {
      btn.classList.add('active');
    }
  });

  // Populate categories for Language type
  populateAddGoalCategories('language');

  // Clear objectives list
  clearObjectives('add-goal-objectives-list');

  // Hide error
  hide($('add-goal-error'));

  openModal('add-goal-modal');
}

function populateAddGoalCategories(goalType: 'language' | 'articulation'): void {
  const container = document.getElementById('add-goal-categories');
  if (!container) return;

  const categories = goalType === 'articulation' ? ORGANIZED_ARTICULATION_CATEGORIES : ORGANIZED_LANGUAGE_CATEGORIES;
  container.innerHTML = generateCategoryCheckboxes(categories, 0, []);
}

// ============================================
// Objectives Handling Functions
// ============================================

let objectiveCounter = 0;

function addObjectiveRow(containerId: string, objective?: Objective): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  objectiveCounter++;
  const objId = objectiveCounter;

  const row = document.createElement('div');
  row.className = 'objective-row';
  row.dataset.objId = objId.toString();
  row.innerHTML = `
    <div class="objective-number">Objective ${container.children.length + 1}</div>
    <div class="objective-fields">
      <div class="objective-field objective-field-description">
        <label>Description:</label>
        <textarea class="obj-description" rows="2" placeholder="Objective description...">${objective?.description || ''}</textarea>
      </div>
      <div class="objective-field-row">
        <div class="objective-field">
          <label>Target %:</label>
          <select class="obj-target">
            <option value="50" ${objective?.target_percentage === 50 ? 'selected' : ''}>50%</option>
            <option value="55" ${objective?.target_percentage === 55 ? 'selected' : ''}>55%</option>
            <option value="60" ${objective?.target_percentage === 60 ? 'selected' : ''}>60%</option>
            <option value="65" ${objective?.target_percentage === 65 ? 'selected' : ''}>65%</option>
            <option value="70" ${objective?.target_percentage === 70 ? 'selected' : ''}>70%</option>
            <option value="75" ${objective?.target_percentage === 75 ? 'selected' : ''}>75%</option>
            <option value="80" ${objective?.target_percentage === 80 ? 'selected' : ''}>80%</option>
          </select>
        </div>
        <div class="objective-field">
          <label>Deadline:</label>
          <input type="text" class="obj-deadline" value="${objective?.deadline || ''}" placeholder="e.g., By first reporting period">
        </div>
      </div>
    </div>
    <button type="button" class="btn-remove-objective" title="Remove objective">&times;</button>
  `;

  // Add remove handler
  const removeBtn = row.querySelector('.btn-remove-objective');
  removeBtn?.addEventListener('click', () => {
    row.remove();
    renumberObjectives(containerId);
  });

  container.appendChild(row);
}

function renumberObjectives(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = container.querySelectorAll('.objective-row');
  rows.forEach((row, index) => {
    const numberEl = row.querySelector('.objective-number');
    if (numberEl) {
      numberEl.textContent = `Objective ${index + 1}`;
    }
  });
}

function clearObjectives(containerId: string): void {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
  objectiveCounter = 0;
}

function getObjectivesFromContainer(containerId: string): Objective[] {
  const container = document.getElementById(containerId);
  if (!container) return [];

  const objectives: Objective[] = [];
  const rows = container.querySelectorAll('.objective-row');

  rows.forEach(row => {
    const descriptionEl = row.querySelector('.obj-description') as HTMLTextAreaElement;
    const targetEl = row.querySelector('.obj-target') as HTMLSelectElement;
    const deadlineEl = row.querySelector('.obj-deadline') as HTMLInputElement;

    const description = descriptionEl?.value.trim();
    if (description) {
      objectives.push({
        description,
        target_percentage: parseInt(targetEl?.value || '70'),
        deadline: deadlineEl?.value.trim() || undefined
      });
    }
  });

  return objectives;
}

async function saveNewGoal(): Promise<void> {
  if (!selectedStudentId) return;

  const baselineInput = document.getElementById('add-goal-baseline') as HTMLInputElement;
  const deadlineInput = document.getElementById('add-goal-deadline') as HTMLInputElement;
  const descriptionInput = document.getElementById('add-goal-description') as HTMLTextAreaElement;
  const targetSelect = document.getElementById('add-goal-target') as HTMLSelectElement;
  const sessionsSelect = document.getElementById('add-goal-sessions') as HTMLSelectElement;
  const commentsInput = document.getElementById('add-goal-comments') as HTMLTextAreaElement;
  const durationInput = document.getElementById('add-goal-duration') as HTMLInputElement;
  const frequencyInput = document.getElementById('add-goal-frequency') as HTMLInputElement;

  const description = descriptionInput?.value.trim() || '';
  if (!description) {
    const errorEl = $('add-goal-error');
    errorEl.textContent = 'Please enter a goal description';
    show(errorEl);
    return;
  }

  // Get selected goal type
  const activeTypeBtn = document.querySelector('.goal-type-btn.active');
  const goalType = (activeTypeBtn?.getAttribute('data-type') as 'language' | 'articulation') || 'language';

  // Get selected categories
  const categoryContainer = document.getElementById('add-goal-categories');
  const checkedBoxes = categoryContainer?.querySelectorAll('input[type="checkbox"]:checked') || [];
  const selectedCategories: string[] = [];
  checkedBoxes.forEach(cb => {
    const label = cb.nextElementSibling?.textContent;
    if (label) selectedCategories.push(label);
  });

  // Build the goal data with session time included
  const sessionDuration = durationInput?.value ? parseInt(durationInput.value) : null;
  const sessionFrequency = frequencyInput?.value || null;

  // Get objectives
  const objectives = getObjectivesFromContainer('add-goal-objectives-list');

  const goal: ExtractedGoal = {
    goal_type: { value: goalType, confidence: 1 },
    goal_description: { value: description, confidence: 1 },
    target_percentage: { value: parseInt(targetSelect?.value || '80'), confidence: 1 },
    target_date: { value: deadlineInput?.value || '', confidence: 1 },
    baseline: { value: baselineInput?.value || '', confidence: 1 },
    deadline: { value: deadlineInput?.value || '', confidence: 1 },
    sessions_to_confirm: { value: parseInt(sessionsSelect?.value || '3'), confidence: 1 },
    comments: { value: commentsInput?.value || '', confidence: 1 },
    boardgame_categories: { value: selectedCategories, confidence: 1 },
    session_duration_minutes: { value: sessionDuration, confidence: 1 },
    session_frequency: { value: sessionFrequency, confidence: 1 },
    objectives: { value: objectives.length > 0 ? objectives : null, confidence: 1 }
  };

  try {
    await api.addGoals(selectedStudentId, [goal]);

    closeModal('add-goal-modal');
    selectStudent(selectedStudentId);
  } catch (err) {
    const errorEl = $('add-goal-error');
    errorEl.textContent = (err as ApiError).message || 'Failed to save goal';
    show(errorEl);
  }
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
    const sessionDuration = goal.session_duration_minutes?.value || null;
    const sessionFrequency = goal.session_frequency?.value || '';

    // Extract source hints
    const baselineHint = goal.baseline?.source_hint || '';
    const deadlineHint = (goal.deadline?.source_hint || goal.target_date?.source_hint) || '';
    const descriptionHint = goal.goal_description?.source_hint || '';
    const targetPctHint = goal.target_percentage?.source_hint || '';
    const sessionsHint = goal.sessions_to_confirm?.source_hint || '';
    const commentsHint = goal.comments?.source_hint || '';
    const categoriesReasoning = goal.boardgame_categories?.reasoning || goal.goal_type?.reasoning || '';
    const sessionDurationHint = goal.session_duration_minutes?.source_hint || '';
    const sessionFrequencyHint = goal.session_frequency?.source_hint || '';

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
    const sessionDurationConfidence = goal.session_duration_minutes?.confidence ?? 0;
    const sessionDurationLowConf = !sessionDuration || sessionDurationConfidence < 0.7 ? 'low-confidence' : '';
    const sessionFrequencyConfidence = goal.session_frequency?.confidence ?? 0;
    const sessionFrequencyLowConf = !sessionFrequency || sessionFrequencyConfidence < 0.7 ? 'low-confidence' : '';

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

          <!-- Session Time Section -->
          <div class="goal-session-time-section">
            <h5>Recommended Session Time</h5>
            <div class="goal-form-row-split">
              <div class="goal-form-row ${sessionDurationLowConf}">
                <label>Duration (minutes):</label>
                <input type="number" class="goal-duration-input" min="15" max="180" step="5" value="${sessionDuration || ''}" placeholder="e.g., 30">
                ${sessionDurationHint ? `<span class="field-hint">${sessionDurationHint}</span>` : ''}
              </div>
              <div class="goal-form-row ${sessionFrequencyLowConf}">
                <label>Frequency:</label>
                <input type="text" class="goal-frequency-input" value="${sessionFrequency}" placeholder="e.g., 2x weekly">
                ${sessionFrequencyHint ? `<span class="field-hint">${sessionFrequencyHint}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Objectives Section -->
          <div class="goal-objectives-section">
            <h5>Objectives <span class="section-hint">(Optional incremental targets)</span></h5>
            <div class="objectives-list" id="extracted-goal-objectives-${index}"></div>
            <button type="button" class="btn btn-secondary btn-small add-extracted-objective-btn" data-goal-index="${index}">+ Add Objective</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Populate objectives for each goal
  goals.forEach((goal, index) => {
    const objectives = goal.objectives?.value || [];
    objectives.forEach(obj => {
      addObjectiveRow(`extracted-goal-objectives-${index}`, obj);
    });
  });

  // Add event listeners for add objective buttons
  container.querySelectorAll('.add-extracted-objective-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const goalIndex = btn.getAttribute('data-goal-index');
      addObjectiveRow(`extracted-goal-objectives-${goalIndex}`);
    });
  });

  // Show first goal and update navigation
  showGoalAtIndex(0);
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
    const durationInput = item.querySelector('.goal-duration-input') as HTMLInputElement;
    const frequencyInput = item.querySelector('.goal-frequency-input') as HTMLInputElement;

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

    // Get objectives for this goal
    const objectives = getObjectivesFromContainer(`extracted-goal-objectives-${index}`);

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
      session_duration_minutes: { value: durationInput?.value ? parseInt(durationInput.value) : null, confidence: 0.9 },
      session_frequency: { value: frequencyInput?.value || null, confidence: 0.9 },
      objectives: { value: objectives.length > 0 ? objectives : null, confidence: 0.9 },
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

    // Get document-level session time from extraction
    const sessionDuration = result.extracted_data.session_duration_minutes;
    const sessionFreq = result.extracted_data.session_frequency;

    // Apply document-level session time to each goal (since AI extracts it at document level)
    extractedGoals = result.extracted_data.goals.map(goal => ({
      ...goal,
      session_duration_minutes: goal.session_duration_minutes || sessionDuration,
      session_frequency: goal.session_frequency || sessionFreq,
    }));

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

  try {
    hide($('goals-confirm-error'));

    await api.confirmGoals(selectedStudentId, goals);

    resetGoalsUploadModal();
    closeModal('goals-upload-modal');

    // Reload goals
    await loadStudentGoals(selectedStudentId);

    if (selectedStudentId) {
      selectStudent(selectedStudentId);
    }
  } catch (err) {
    const errorEl = $('goals-confirm-error');
    errorEl.textContent = (err as ApiError).message;
    show(errorEl);
  }
}

// ============================================
// Session Management Functions
// ============================================

function initLiveWebSocket(): void {
  const token = api.getToken();
  if (!token) return;

  therapistLiveService.setCallbacks({
    onConnected: () => {
      console.log('[Therapist] Live WebSocket connected');
    },
    onDisconnected: () => {
      console.log('[Therapist] Live WebSocket disconnected');
    },
    onActiveSessions: (sessions) => {
      liveSessions = sessions;
      renderLiveSessions();
    },
    onSessionStarted: (session) => {
      // Add to live sessions if it's for one of our students
      const student = students.find(s => s.id === session.childId);
      if (student) {
        const existingIdx = liveSessions.findIndex(s => s.sessionId === session.sessionId);
        if (existingIdx === -1) {
          liveSessions.push(session);
        } else {
          liveSessions[existingIdx] = session;
        }
        renderLiveSessions();
      }
    },
    onCardShown: (data: LiveCardEvent) => {
      currentLiveCard = { sessionId: data.sessionId, cardQuestion: data.cardQuestion };
      // Update the live session display
      const liveSession = liveSessions.find(s => s.sessionId === data.sessionId);
      if (liveSession) {
        liveSession.cardsPlayed++;
        renderLiveSessions();
      }
    },
    onChildResponse: (data: LiveResponseEvent) => {
      // Update live session stats
      const liveSession = liveSessions.find(s => s.sessionId === data.sessionId);
      if (liveSession) {
        if (data.isCorrect) {
          liveSession.correctResponses++;
        }
        renderLiveSessions();
      }
    },
    onSessionEnded: (data: SessionSummary) => {
      // Remove from live sessions
      liveSessions = liveSessions.filter(s => s.sessionId !== data.sessionId);
      currentLiveCard = null;
      renderLiveSessions();
      // Refresh session history for the selected student
      if (selectedStudentId) {
        loadSessionHistory(selectedStudentId);
      }
    },
    onError: (message) => {
      console.error('[Therapist] Live error:', message);
    },
  });

  therapistLiveService.connect(token);
}

function renderLiveSessions(): void {
  const section = document.getElementById('live-sessions-section');
  const list = document.getElementById('live-sessions-list');
  const indicator = document.getElementById('live-indicator');

  if (!section || !list || !indicator) return;

  // Filter sessions for selected student if applicable
  const sessionsToShow = selectedStudentId
    ? liveSessions.filter(s => s.childId === selectedStudentId)
    : liveSessions;

  if (sessionsToShow.length === 0) {
    hide(section);
    hide(indicator);
    return;
  }

  show(section);
  show(indicator);

  list.innerHTML = sessionsToShow.map(session => {
    const duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
    const durationStr = formatDuration(duration);
    const accuracy = session.cardsPlayed > 0
      ? Math.round((session.correctResponses / session.cardsPlayed) * 100)
      : 0;

    const currentCard = currentLiveCard?.sessionId === session.sessionId
      ? currentLiveCard.cardQuestion
      : null;

    return `
      <div class="live-session-item" data-session-id="${session.sessionId}">
        <div class="live-session-header">
          <span class="live-session-child">${escapeHtml(session.childName)}</span>
          <span class="live-session-time">${durationStr}</span>
        </div>
        <div class="live-session-stats">
          <div class="live-stat">
            <span>Score:</span>
            <span class="live-stat-value">${session.currentScore}</span>
          </div>
          <div class="live-stat">
            <span>Cards:</span>
            <span class="live-stat-value">${session.cardsPlayed}</span>
          </div>
          <div class="live-stat">
            <span>Accuracy:</span>
            <span class="live-stat-value">${accuracy}%</span>
          </div>
        </div>
        ${currentCard ? `
          <div class="live-session-current">
            <span>Current card:</span>
            <div class="live-session-card">${escapeHtml(currentCard)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function loadSessionHistory(studentId: number): Promise<void> {
  const list = document.getElementById('sessions-list');
  if (!list) return;

  try {
    const result = await api.getSessionHistory(studentId, 10);
    sessionHistory = result.sessions;
    renderSessionHistory();
  } catch (err) {
    console.error('Failed to load session history:', err);
    list.innerHTML = '<p class="empty-state">Failed to load sessions</p>';
  }
}

function renderSessionHistory(): void {
  const list = document.getElementById('sessions-list');
  if (!list) return;

  if (sessionHistory.length === 0) {
    list.innerHTML = '<p class="empty-state">No sessions yet</p>';
    return;
  }

  list.innerHTML = sessionHistory.map(session => {
    const date = new Date(session.started_at);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const durationStr = session.duration_seconds ? formatDuration(session.duration_seconds) : '--';
    const accuracy = session.total_cards_played > 0
      ? Math.round((session.correct_responses / session.total_cards_played) * 100)
      : 0;

    const statusClass = session.status;
    const statusLabel = session.status === 'completed' ? 'Completed' :
                        session.status === 'abandoned' ? 'Abandoned' : 'In Progress';

    return `
      <div class="session-history-item" data-session-id="${session.id}">
        <div class="session-history-header">
          <span class="session-date">${dateStr} ${timeStr}</span>
          <span class="session-status ${statusClass}">${statusLabel}</span>
        </div>
        <div class="session-history-stats">
          <div class="session-stat">
            <span>Duration:</span>
            <span class="session-stat-value">${durationStr}</span>
          </div>
          <div class="session-stat">
            <span>Score:</span>
            <span class="session-stat-value">${session.final_score}</span>
          </div>
          <div class="session-stat">
            <span>Accuracy:</span>
            <span class="session-stat-value">${accuracy}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  list.querySelectorAll('.session-history-item').forEach(item => {
    item.addEventListener('click', () => {
      const sessionId = parseInt(item.getAttribute('data-session-id') || '0');
      if (sessionId) showSessionDetails(sessionId);
    });
  });
}

async function showSessionDetails(sessionId: number): Promise<void> {
  try {
    const result = await api.getSessionDetails(sessionId);
    const session = result.session;

    // Populate header stats
    const durationEl = document.getElementById('session-detail-duration');
    const scoreEl = document.getElementById('session-detail-score');
    const accuracyEl = document.getElementById('session-detail-accuracy');
    const statusEl = document.getElementById('session-detail-status');

    if (durationEl) {
      durationEl.textContent = session.duration_seconds
        ? formatDuration(session.duration_seconds)
        : '--';
    }
    if (scoreEl) {
      scoreEl.textContent = String(session.final_score);
    }
    if (accuracyEl) {
      const accuracy = session.total_cards_played > 0
        ? Math.round((session.correct_responses / session.total_cards_played) * 100)
        : 0;
      accuracyEl.textContent = `${accuracy}%`;
    }
    if (statusEl) {
      const statusLabel = session.status === 'completed' ? 'Completed' :
                          session.status === 'abandoned' ? 'Abandoned' : 'In Progress';
      statusEl.textContent = statusLabel;
    }

    // Populate categories (already parsed by backend)
    const categoriesEl = document.getElementById('session-detail-categories');
    if (categoriesEl) {
      const categories = Array.isArray(session.categories_selected)
        ? session.categories_selected
        : [];
      if (categories.length > 0) {
        categoriesEl.innerHTML = categories.map(cat =>
          `<span class="session-category-badge">${escapeHtml(cat)}</span>`
        ).join('');
      } else {
        categoriesEl.innerHTML = '<span class="empty-state">No categories</span>';
      }
    }

    // Populate responses
    const responsesEl = document.getElementById('session-detail-responses');
    if (responsesEl) {
      if (!session.responses || session.responses.length === 0) {
        responsesEl.innerHTML = '<p class="empty-state">No responses recorded</p>';
      } else {
        responsesEl.innerHTML = session.responses.map(response => {
          const isCorrect = Boolean(response.is_correct);
          const resultClass = isCorrect ? 'correct' : 'incorrect';
          const resultLabel = isCorrect ? 'Correct' : 'Incorrect';
          const timeStr = response.time_spent_seconds
            ? `${response.time_spent_seconds}s`
            : '--';

          // Safety level labels and colors
          const safetyLevelNames = ['Green', 'Yellow', 'Orange', 'Red'];
          const safetyLevel = response.safety_level || 0;
          const safetyLevelName = safetyLevelNames[safetyLevel] || 'Green';

          // Intervention display
          const interventionLabels: Record<string, string> = {
            'SKIP_CARD': '⏭️ Skipped',
            'RETRY_CARD': '🔄 Retry',
            'BUBBLE_BREATHING': '🫧 Breathing',
            'START_BREAK': '☕ Break',
            'CALL_GROWNUP': '👨‍👩‍👧 Grownup'
          };
          const intervention = response.intervention_chosen;
          const interventionHtml = intervention
            ? `<span class="intervention-chosen">${interventionLabels[intervention] || intervention}</span>`
            : '';

          return `
            <div class="session-response-item ${resultClass}">
              <div class="response-category">${escapeHtml(response.card_category)}</div>
              <div class="response-question">${escapeHtml(response.card_question)}</div>
              <div class="response-answer">
                <span class="response-child-answer">"${escapeHtml(response.child_response || '(no response)')}"</span>
                <span class="response-result ${resultClass}">${resultLabel}</span>
                ${interventionHtml}
              </div>
              <div class="response-meta">
                <span>Time: ${timeStr}</span>
                <span class="safety-level level-${safetyLevel}">${safetyLevelName}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    openModal('session-details-modal');
  } catch (err) {
    console.error('Failed to load session details:', err);
    alert('Failed to load session details');
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
  therapistLiveService.disconnect();
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

// ==========================================================================
// THEME MANAGEMENT
// ==========================================================================
type ThemeName = 'default' | 'spring' | 'summer' | 'autumn' | 'winter';

const THEME_STORAGE_KEY = 'piper-theme';
const SEASONAL_THEMES: ThemeName[] = ['spring', 'summer', 'autumn', 'winter'];
const ALL_THEMES: ThemeName[] = ['default', ...SEASONAL_THEMES];
const THEME_ICONS: Record<ThemeName, string> = {
  default: '🖥️',
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️'
};
const THEME_DECORATIONS: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️'
};

let currentTheme: ThemeName = 'default';

function initTheme(): void {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved && ALL_THEMES.includes(saved as ThemeName)) {
    currentTheme = saved as ThemeName;
  } else {
    currentTheme = 'default';
  }
  applyTheme(currentTheme);
  updateThemeButtonIcon();
  updateThemePanelSelection();
}

function applyTheme(theme: ThemeName): void {
  // Remove all seasonal theme classes
  document.body.classList.remove('theme-spring', 'theme-summer', 'theme-autumn', 'theme-winter');
  document.documentElement.classList.remove('theme-spring', 'theme-summer', 'theme-autumn', 'theme-winter');

  // Apply seasonal theme class if not default
  if (theme !== 'default') {
    document.body.classList.add(`theme-${theme}`);
    document.documentElement.classList.add(`theme-${theme}`);
  }

  generateSnowflakes(theme);
}

function updateThemeButtonIcon(): void {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.textContent = THEME_ICONS[currentTheme];
  }
}

function updateThemePanelSelection(): void {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    const btnTheme = btn.getAttribute('data-theme');
    btn.classList.toggle('active', btnTheme === currentTheme);
  });
}

function generateSnowflakes(theme: ThemeName): void {
  const container = document.getElementById('snowflakes-container');
  if (!container) return;

  // Clear existing snowflakes
  container.innerHTML = '';

  // Only show decorations for seasonal themes (not default)
  if (theme === 'default' || !THEME_DECORATIONS[theme]) return;

  const decoration = THEME_DECORATIONS[theme];

  // Generate 10 snowflakes/decorations
  for (let i = 0; i < 10; i++) {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.textContent = decoration;
    container.appendChild(snowflake);
  }
}

function bindThemeEvents(): void {
  // Theme toggle button
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const panel = document.getElementById('theme-selector-panel');

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
    });

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target as Node) && e.target !== toggleBtn) {
        panel.classList.add('hidden');
      }
    });
  }

  // Theme selection buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme') as ThemeName;

      currentTheme = theme;
      if (theme === 'default') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }

      applyTheme(currentTheme);
      updateThemeButtonIcon();
      updateThemePanelSelection();

      // Close panel
      const panel = document.getElementById('theme-selector-panel');
      if (panel) panel.classList.add('hidden');
    });
  });
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

  // Logout (both header and sidebar buttons)
  $('logout-btn').addEventListener('click', handleLogout);
  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', handleLogout);
  }

  // Navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.getAttribute('data-page');
      if (page) navigate(page);
    });
  });

  // Add school button
  const addSchoolBtn = document.getElementById('add-school-btn');
  if (addSchoolBtn) {
    addSchoolBtn.addEventListener('click', async () => {
      // Load members for admin dropdown and member selection
      await loadMembers();
      populateSchoolModal();
      openModal('create-school-modal');
    });
  }

  // Create school form
  const createSchoolForm = document.getElementById('create-school-form');
  if (createSchoolForm) {
    createSchoolForm.addEventListener('submit', handleCreateSchool);
  }

  // Invite member button
  const inviteMemberBtn = document.getElementById('invite-member-btn');
  if (inviteMemberBtn) {
    inviteMemberBtn.addEventListener('click', () => {
      // Load schools for dropdown before opening modal
      loadSchools().then(() => {
        updateMemberSchoolDropdown();
        openModal('invite-member-modal');
      });
    });
  }

  // Invite member form
  const inviteMemberForm = document.getElementById('invite-member-form');
  if (inviteMemberForm) {
    inviteMemberForm.addEventListener('submit', handleInviteMember);
  }

  // Add student (legacy button - may not exist in new modal-based flow)
  const addStudentBtn = document.getElementById('add-student-btn');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', async () => {
      // Load members and schools for dropdowns
      await Promise.all([loadMembers(), loadSchools()]);
      populateStudentModal();
      openModal('add-student-modal');
    });
  }

  $('add-student-form').addEventListener('submit', handleAddStudent);

  // Delete student
  $('delete-student-btn').addEventListener('click', handleDeleteStudent);

  // Select student modal buttons
  const selectStudentBtn = document.getElementById('select-student-btn');
  if (selectStudentBtn) {
    selectStudentBtn.addEventListener('click', openSelectStudentModal);
  }

  const changeStudentBtn = document.getElementById('change-student-btn');
  if (changeStudentBtn) {
    changeStudentBtn.addEventListener('click', openSelectStudentModal);
  }

  const addStudentFromModalBtn = document.getElementById('add-student-from-modal-btn');
  if (addStudentFromModalBtn) {
    addStudentFromModalBtn.addEventListener('click', async () => {
      closeModal('select-student-modal');
      await Promise.all([loadMembers(), loadSchools()]);
      populateStudentModal();
      openModal('add-student-modal');
    });
  }

  const studentSearchInput = document.getElementById('student-search') as HTMLInputElement;
  if (studentSearchInput) {
    studentSearchInput.addEventListener('input', () => {
      renderStudentModalList(studentSearchInput.value);
    });
  }

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

  // Add Goal manually button
  const addGoalBtn = document.getElementById('add-goal-btn');
  if (addGoalBtn) {
    addGoalBtn.addEventListener('click', () => {
      if (!selectedStudentId) {
        alert('Please select a student first');
        return;
      }
      openAddGoalModal();
    });
  }

  // Goal type toggle buttons in add-goal-modal
  const goalTypeBtns = document.querySelectorAll('.goal-type-btn');
  goalTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      goalTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const goalType = btn.getAttribute('data-type') as 'language' | 'articulation';
      populateAddGoalCategories(goalType);
    });
  });

  // Save new goal button
  const saveNewGoalBtn = document.getElementById('save-new-goal-btn');
  if (saveNewGoalBtn) {
    saveNewGoalBtn.addEventListener('click', saveNewGoal);
  }

  // Add objective button
  const addObjectiveBtn = document.getElementById('add-objective-btn');
  if (addObjectiveBtn) {
    addObjectiveBtn.addEventListener('click', () => {
      addObjectiveRow('add-goal-objectives-list');
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

  // Goals navigation buttons
  const goalsPrevBtn = document.getElementById('goals-prev-btn');
  if (goalsPrevBtn) {
    goalsPrevBtn.addEventListener('click', showPrevGoal);
  }

  const goalsNextBtn = document.getElementById('goals-next-btn');
  if (goalsNextBtn) {
    goalsNextBtn.addEventListener('click', showNextGoal);
  }

  // Theme selector events
  bindThemeEvents();
}

// Initialize
export async function init(): Promise<void> {
  bindEvents();
  initTheme();
  await checkAuth();
  // Hide loading screen using shared component
  hideLoadingScreen(300);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
