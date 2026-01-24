export interface FileList {
  language: string[];
  articulation: string[];
}

export interface CardImage {
  cardIndex: number;
  imageIndex: number;
  label: string;
  prompt: string;
  imagePath: string;
  style: string;
  exists: boolean;
}

export interface CardsResponse {
  images: CardImage[];
  total: number;
  pending: number;
}

export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
}

export type Step = 'files' | 'categories' | 'viewer';

export interface AppState {
  step: Step;
  files: FileList | null;
  selectedFile: { type: 'language' | 'articulation'; filename: string } | null;
  sections: string[];
  selectedSection: string | null;
  cards: CardImage[];
  currentIndex: number;
  generatedImage: GeneratedImage | null;
  isGenerating: boolean;
  isSaving: boolean;
  error: string | null;
  statusMessage: string | null;
}
