import type { FileList, CardsResponse, GeneratedImage } from './types';

const API_BASE = '/api';

export async function fetchFiles(): Promise<FileList> {
  const res = await fetch(`${API_BASE}/cards/files`);
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export async function fetchSections(type: string, filename: string): Promise<{ sections: string[] }> {
  const res = await fetch(`${API_BASE}/cards/files/${type}/${filename}`);
  if (!res.ok) throw new Error('Failed to fetch sections');
  return res.json();
}

export async function fetchCards(type: string, filename: string, section: string): Promise<CardsResponse> {
  const encodedSection = encodeURIComponent(section);
  const res = await fetch(`${API_BASE}/cards/${type}/${filename}/${encodedSection}`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const res = await fetch(`${API_BASE}/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to generate image');
  }
  return res.json();
}

export async function saveImage(imageBase64: string, imagePath: string): Promise<void> {
  const res = await fetch(`${API_BASE}/images/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, imagePath })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to save image');
  }
}

export async function updatePrompt(
  type: string,
  filename: string,
  section: string,
  cardIndex: number,
  imageIndex: number,
  newPrompt: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/cards/update-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, filename, section, cardIndex, imageIndex, newPrompt })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update prompt');
  }
}
