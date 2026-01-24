import type { AppState } from './types';

type Listener = (state: AppState) => void;

const initialState: AppState = {
  step: 'files',
  files: null,
  selectedFile: null,
  sections: [],
  selectedSection: null,
  cards: [],
  currentIndex: 0,
  generatedImage: null,
  isGenerating: false,
  isSaving: false,
  error: null,
  statusMessage: null
};

class Store {
  private state: AppState = { ...initialState };
  private listeners: Listener[] = [];

  getState(): AppState {
    return this.state;
  }

  setState(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.state));
  }
}

export const store = new Store();
