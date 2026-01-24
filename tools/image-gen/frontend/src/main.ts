import { store } from './state';
import * as api from './api';
import type { AppState, CardImage } from './types';

// DOM Elements
const stepFiles = document.getElementById('step-files')!;
const stepCategories = document.getElementById('step-categories')!;
const stepViewer = document.getElementById('step-viewer')!;
const fileList = document.getElementById('file-list')!;
const categoryList = document.getElementById('category-list')!;
const selectedFileInfo = document.getElementById('selected-file-info')!;

// Menu bar elements
const navFiles = document.getElementById('nav-files') as HTMLButtonElement;
const navCategories = document.getElementById('nav-categories') as HTMLButtonElement;
const navViewer = document.getElementById('nav-viewer') as HTMLButtonElement;

// Card viewer elements
const cardProgress = document.getElementById('card-progress')!;
const cardLabel = document.getElementById('card-label')!;
const cardStyle = document.getElementById('card-style')!;
const currentImage = document.getElementById('current-image')!;
const generatedImage = document.getElementById('generated-image')!;
const promptDisplay = document.getElementById('prompt-display')!;
const promptEdit = document.getElementById('prompt-edit') as HTMLTextAreaElement;
const promptEditControls = document.getElementById('prompt-edit-controls')!;
const statusMessage = document.getElementById('status-message')!;

// Buttons
const btnGenerate = document.getElementById('btn-generate') as HTMLButtonElement;
const btnAccept = document.getElementById('btn-accept') as HTMLButtonElement;
const btnRegenerate = document.getElementById('btn-regenerate') as HTMLButtonElement;
const btnSkip = document.getElementById('btn-skip') as HTMLButtonElement;
const btnEditPrompt = document.getElementById('btn-edit-prompt') as HTMLButtonElement;
const btnSavePrompt = document.getElementById('btn-save-prompt') as HTMLButtonElement;
const btnCancelEdit = document.getElementById('btn-cancel-edit') as HTMLButtonElement;
const btnPrev = document.getElementById('btn-prev') as HTMLButtonElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;

// Editing state
let isEditingPrompt = false;
let editedPrompt = '';

// Rate limiting
const GENERATION_COOLDOWN = 5000;
let lastGenerationTime = 0;

// Render functions
function showStep(step: string) {
  stepFiles.classList.toggle('active', step === 'files');
  stepCategories.classList.toggle('active', step === 'categories');
  stepViewer.classList.toggle('active', step === 'viewer');

  // Update menu bar
  updateMenuBar(step);
}

function updateMenuBar(step: string) {
  const state = store.getState();

  // Reset all menu items
  navFiles.classList.remove('active', 'completed');
  navCategories.classList.remove('active', 'completed');
  navViewer.classList.remove('active', 'completed');

  // Set active state
  if (step === 'files') {
    navFiles.classList.add('active');
  } else if (step === 'categories') {
    navFiles.classList.add('completed');
    navCategories.classList.add('active');
  } else if (step === 'viewer') {
    navFiles.classList.add('completed');
    navCategories.classList.add('completed');
    navViewer.classList.add('active');
  }

  // Update disabled states based on available data
  navFiles.disabled = false;
  navCategories.disabled = !state.selectedFile;
  navViewer.disabled = !state.selectedSection || state.cards.length === 0;
}

function renderFileList(state: AppState) {
  if (!state.files) {
    fileList.innerHTML = '<p class="loading">Loading files...</p>';
    return;
  }

  const { language, articulation } = state.files;

  fileList.innerHTML = `
    <div class="file-group">
      <h3>Language (${language.length})</h3>
      <div class="file-grid">
        ${language.map(f => `
          <button class="file-btn" data-type="language" data-file="${f}">
            ${f.replace('.json', '')}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="file-group">
      <h3>Articulation (${articulation.length})</h3>
      <div class="file-grid">
        ${articulation.map(f => `
          <button class="file-btn" data-type="articulation" data-file="${f}">
            ${f.replace('.json', '')}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCategoryList(state: AppState) {
  if (!state.selectedFile) return;

  selectedFileInfo.textContent = `${state.selectedFile.type} / ${state.selectedFile.filename}`;

  categoryList.innerHTML = state.sections.map(section => `
    <button class="category-btn" data-section="${section}">
      ${section}
    </button>
  `).join('');
}

function renderCardViewer(state: AppState) {
  const cards = state.cards;
  const idx = state.currentIndex;
  const card = cards[idx];

  // Update nav buttons
  btnPrev.disabled = idx <= 0;
  btnNext.disabled = idx >= cards.length - 1;

  if (!card) {
    cardProgress.innerHTML = '<span class="complete">All images in this category have been processed!</span>';
    cardLabel.textContent = '';
    cardStyle.textContent = '';
    promptDisplay.textContent = '';
    currentImage.innerHTML = '<span class="placeholder">No more cards</span>';
    generatedImage.innerHTML = '<span class="placeholder">-</span>';
    btnGenerate.disabled = true;
    btnSkip.disabled = true;
    btnEditPrompt.disabled = true;
    btnPrev.disabled = idx <= 0;
    btnNext.disabled = true;
    return;
  }

  const pending = cards.filter(c => !c.exists).length;
  cardProgress.innerHTML = `
    <span>Card ${idx + 1} of ${cards.length}</span>
    <span class="pending-count">${pending} pending</span>
  `;

  cardLabel.textContent = card.label;
  cardStyle.textContent = card.style;

  // Handle prompt display/edit mode
  if (isEditingPrompt) {
    promptDisplay.classList.add('hidden');
    promptEdit.classList.remove('hidden');
    promptEditControls.classList.remove('hidden');
    btnEditPrompt.textContent = 'Editing...';
    btnEditPrompt.disabled = true;
  } else {
    promptDisplay.classList.remove('hidden');
    promptEdit.classList.add('hidden');
    promptEditControls.classList.add('hidden');
    promptDisplay.textContent = card.prompt;
    btnEditPrompt.textContent = 'Edit';
    btnEditPrompt.disabled = false;
  }

  // Show current image if exists (add cache-busting timestamp)
  if (card.exists) {
    const cacheBust = (card as any).savedAt || Date.now();
    currentImage.innerHTML = `<img src="${card.imagePath}?t=${cacheBust}" alt="${card.label}">`;
  } else {
    currentImage.innerHTML = '<span class="placeholder">No image yet</span>';
  }

  // Show generated image
  if (state.generatedImage) {
    generatedImage.innerHTML = `
      <img src="data:${state.generatedImage.mimeType};base64,${state.generatedImage.imageBase64}" alt="Generated">
    `;
  } else {
    generatedImage.innerHTML = '<span class="placeholder">Click Generate</span>';
  }

  // Update button states
  btnGenerate.disabled = state.isGenerating || state.isSaving;
  btnAccept.disabled = !state.generatedImage || state.isSaving;
  btnRegenerate.disabled = !state.generatedImage || state.isGenerating || state.isSaving;
  btnSkip.disabled = state.isGenerating || state.isSaving;

  // Update button text during loading
  btnGenerate.textContent = state.isGenerating ? 'Generating...' : 'Generate Image';
  btnAccept.textContent = state.isSaving ? 'Saving...' : 'Accept & Save';

  // Status message
  if (state.error) {
    statusMessage.className = 'status-message error';
    statusMessage.textContent = state.error;
  } else if (state.statusMessage) {
    statusMessage.className = 'status-message success';
    statusMessage.textContent = state.statusMessage;
  } else {
    statusMessage.className = 'status-message';
    statusMessage.textContent = '';
  }
}

// Main render
function render(state: AppState) {
  showStep(state.step);

  switch (state.step) {
    case 'files':
      renderFileList(state);
      break;
    case 'categories':
      renderCategoryList(state);
      break;
    case 'viewer':
      renderCardViewer(state);
      break;
  }
}

// Event handlers
async function handleFileSelect(type: 'language' | 'articulation', filename: string) {
  store.setState({ selectedFile: { type, filename }, sections: [] });

  try {
    const result = await api.fetchSections(type, filename);
    store.setState({ sections: result.sections, step: 'categories' });
  } catch (err) {
    store.setState({ error: 'Failed to load sections' });
  }
}

async function handleCategorySelect(section: string) {
  const { selectedFile } = store.getState();
  if (!selectedFile) return;

  store.setState({ selectedSection: section, cards: [], currentIndex: 0 });

  try {
    const result = await api.fetchCards(selectedFile.type, selectedFile.filename, section);
    store.setState({
      cards: result.images,
      step: 'viewer',
      generatedImage: null,
      error: null,
      statusMessage: null
    });
  } catch (err) {
    store.setState({ error: 'Failed to load cards' });
  }
}

async function handleGenerate() {
  const state = store.getState();
  const card = state.cards[state.currentIndex];
  if (!card) return;

  // Use edited prompt if in edit mode, otherwise use card prompt
  const promptToUse = isEditingPrompt ? promptEdit.value.trim() : card.prompt;
  if (!promptToUse) {
    store.setState({ error: 'Prompt cannot be empty' });
    return;
  }

  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastGenerationTime;
  if (elapsed < GENERATION_COOLDOWN) {
    const wait = Math.ceil((GENERATION_COOLDOWN - elapsed) / 1000);
    store.setState({ statusMessage: `Please wait ${wait}s...` });
    await new Promise(r => setTimeout(r, GENERATION_COOLDOWN - elapsed));
  }

  store.setState({
    isGenerating: true,
    generatedImage: null,
    error: null,
    statusMessage: 'Generating image...'
  });

  try {
    const result = await api.generateImage(promptToUse);
    lastGenerationTime = Date.now();
    store.setState({
      isGenerating: false,
      generatedImage: result,
      statusMessage: 'Image generated! Review and accept or regenerate.'
    });
  } catch (err) {
    store.setState({
      isGenerating: false,
      error: err instanceof Error ? err.message : 'Generation failed'
    });
  }
}

async function handleAccept() {
  const state = store.getState();
  const card = state.cards[state.currentIndex];
  if (!card || !state.generatedImage) return;

  store.setState({ isSaving: true, error: null, statusMessage: 'Saving image...' });

  try {
    await api.saveImage(state.generatedImage.imageBase64, card.imagePath);

    // Update card as existing with timestamp for cache busting
    const updatedCards = [...state.cards];
    updatedCards[state.currentIndex] = { ...card, exists: true, savedAt: Date.now() } as any;

    // Move to next card and reset edit mode
    const nextIndex = state.currentIndex + 1;
    isEditingPrompt = false;
    editedPrompt = '';

    store.setState({
      isSaving: false,
      cards: updatedCards,
      currentIndex: nextIndex,
      generatedImage: null,
      statusMessage: 'Image saved! Moving to next card...'
    });
  } catch (err) {
    store.setState({
      isSaving: false,
      error: err instanceof Error ? err.message : 'Save failed'
    });
  }
}

function handleSkip() {
  const state = store.getState();
  const nextIndex = state.currentIndex + 1;

  // Reset edit mode when skipping
  isEditingPrompt = false;
  editedPrompt = '';

  store.setState({
    currentIndex: nextIndex,
    generatedImage: null,
    error: null,
    statusMessage: null
  });
}

function handlePrev() {
  const state = store.getState();
  if (state.currentIndex <= 0) return;

  isEditingPrompt = false;
  editedPrompt = '';

  store.setState({
    currentIndex: state.currentIndex - 1,
    generatedImage: null,
    error: null,
    statusMessage: null
  });
}

function handleNext() {
  const state = store.getState();
  if (state.currentIndex >= state.cards.length - 1) return;

  isEditingPrompt = false;
  editedPrompt = '';

  store.setState({
    currentIndex: state.currentIndex + 1,
    generatedImage: null,
    error: null,
    statusMessage: null
  });
}

function handleEditPrompt() {
  const state = store.getState();
  const card = state.cards[state.currentIndex];
  if (!card) return;

  isEditingPrompt = true;
  editedPrompt = card.prompt;
  promptEdit.value = card.prompt;
  render(state);
}

function handleCancelEdit() {
  isEditingPrompt = false;
  editedPrompt = '';
  render(store.getState());
}

async function handleSavePrompt() {
  const state = store.getState();
  const card = state.cards[state.currentIndex];
  if (!card || !state.selectedFile || !state.selectedSection) return;

  const newPrompt = promptEdit.value.trim();
  if (!newPrompt) {
    store.setState({ error: 'Prompt cannot be empty' });
    return;
  }

  store.setState({ statusMessage: 'Saving prompt to JSON...' });

  try {
    await api.updatePrompt(
      state.selectedFile.type,
      state.selectedFile.filename,
      state.selectedSection,
      card.cardIndex,
      card.imageIndex,
      newPrompt
    );

    // Update local state
    const updatedCards = [...state.cards];
    updatedCards[state.currentIndex] = { ...card, prompt: newPrompt };

    isEditingPrompt = false;
    editedPrompt = '';

    store.setState({
      cards: updatedCards,
      statusMessage: 'Prompt saved to JSON!'
    });
  } catch (err) {
    store.setState({
      error: err instanceof Error ? err.message : 'Failed to save prompt'
    });
  }
}

// Initialize
store.subscribe(render);

// Load files on start
api.fetchFiles().then(files => {
  store.setState({ files });
}).catch(() => {
  store.setState({ error: 'Failed to load files. Is the backend running?' });
});

// Event listeners
fileList.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.file-btn') as HTMLElement;
  if (btn) {
    handleFileSelect(
      btn.dataset.type as 'language' | 'articulation',
      btn.dataset.file!
    );
  }
});

categoryList.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest('.category-btn') as HTMLElement;
  if (btn) {
    handleCategorySelect(btn.dataset.section!);
  }
});

// Menu bar navigation
navFiles.addEventListener('click', () => {
  store.setState({ step: 'files' });
});

navCategories.addEventListener('click', () => {
  const state = store.getState();
  if (state.selectedFile) {
    store.setState({
      step: 'categories',
      selectedSection: null,
      cards: [],
      currentIndex: 0,
      generatedImage: null
    });
  }
});

navViewer.addEventListener('click', () => {
  const state = store.getState();
  if (state.selectedSection && state.cards.length > 0) {
    store.setState({ step: 'viewer' });
  }
});

btnGenerate.addEventListener('click', handleGenerate);
btnAccept.addEventListener('click', handleAccept);
btnRegenerate.addEventListener('click', handleGenerate);
btnSkip.addEventListener('click', handleSkip);
btnEditPrompt.addEventListener('click', handleEditPrompt);
btnSavePrompt.addEventListener('click', handleSavePrompt);
btnCancelEdit.addEventListener('click', handleCancelEdit);
btnPrev.addEventListener('click', handlePrev);
btnNext.addEventListener('click', handleNext);

// Initial render
render(store.getState());

// ==========================================================================
// THEME SWITCHING
// ==========================================================================

const themeToggle = document.getElementById('theme-toggle')!;
const themePanel = document.getElementById('theme-panel')!;
const themeBtns = document.querySelectorAll('.theme-btn');
const snowflakes = document.querySelector('.snowflakes')!;

const themeDecorations: Record<string, string[]> = {
  spring: ['🌸', '🌷', '🌼', '🦋'],
  summer: ['☀️', '🌻', '🌴', '🍉'],
  autumn: ['🍂', '🍁', '🍂', '🍁'],
  winter: ['❄️', '⛄', '❄️', '🌨️']
};

function setTheme(theme: string) {
  // Update classes
  document.documentElement.className = `theme-${theme}`;
  document.body.className = `theme-${theme}`;

  // Update active button
  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
  });

  // Update decorations
  const decorations = themeDecorations[theme] || themeDecorations.autumn;
  const snowflakeElements = snowflakes.querySelectorAll('.snowflake');
  snowflakeElements.forEach((el, i) => {
    el.textContent = decorations[i % decorations.length];
  });

  // Save preference
  localStorage.setItem('piper-theme', theme);
}

function loadSavedTheme() {
  const saved = localStorage.getItem('piper-theme');
  if (saved && ['spring', 'summer', 'autumn', 'winter'].includes(saved)) {
    setTheme(saved);
  }
}

// Toggle panel visibility
themeToggle.addEventListener('click', () => {
  themePanel.classList.toggle('hidden');
});

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  if (!themeToggle.contains(e.target as Node) && !themePanel.contains(e.target as Node)) {
    themePanel.classList.add('hidden');
  }
});

// Theme button clicks
themeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    if (theme) {
      setTheme(theme);
      themePanel.classList.add('hidden');
    }
  });
});

// Load saved theme on startup
loadSavedTheme();
