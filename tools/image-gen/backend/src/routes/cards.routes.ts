import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export const cardsRouter = Router();

type CardType = 'language' | 'articulation';

// GET /api/cards/files - List available JSON files
cardsRouter.get('/files', (_req: Request, res: Response) => {
  try {
    const languagePath = path.join(config.sharedPath, 'cards', 'language');
    const articulationPath = path.join(config.sharedPath, 'cards', 'articulation');

    const languageFiles = fs.existsSync(languagePath)
      ? fs.readdirSync(languagePath).filter(f => f.endsWith('.json'))
      : [];

    const articulationFiles = fs.existsSync(articulationPath)
      ? fs.readdirSync(articulationPath).filter(f => f.endsWith('.json'))
      : [];

    res.json({
      language: languageFiles,
      articulation: articulationFiles
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read card files' });
  }
});

// GET /api/cards/files/:type/:filename - Get file content with sections
cardsRouter.get('/files/:type/:filename', (req: Request, res: Response) => {
  try {
    const { type, filename } = req.params;

    if (type !== 'language' && type !== 'articulation') {
      res.status(400).json({ error: 'Invalid type. Use "language" or "articulation"' });
      return;
    }

    const filePath = path.join(config.sharedPath, 'cards', type, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const sections = Object.keys(data);

    res.json({ sections, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

interface CardImage {
  image: string;
  label?: string;
  style?: string;
  prompt?: string;
}

interface Card {
  question?: string;
  images?: CardImage[];
  prompt?: string;
  image?: string;
}

interface ParsedCardImage {
  cardIndex: number;
  imageIndex: number;
  label: string;
  prompt: string;
  imagePath: string;
  style: string;
  exists: boolean;
}

// GET /api/cards/:type/:filename/:section - Get cards with image status
cardsRouter.get('/:type/:filename/:section', (req: Request, res: Response) => {
  try {
    const { type, filename, section } = req.params;

    if (type !== 'language' && type !== 'articulation') {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    const filePath = path.join(config.sharedPath, 'cards', type, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const sectionData = data[section];

    if (!sectionData) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    // Handle both array and object with cards property
    const cardsArray: Card[] = Array.isArray(sectionData) ? sectionData : (sectionData.cards || []);

    // Extract images from cards
    const images: ParsedCardImage[] = [];
    const boardgamePath = path.resolve(config.sharedPath, '..');

    for (let cardIdx = 0; cardIdx < cardsArray.length; cardIdx++) {
      const card = cardsArray[cardIdx];

      // Handle nested images array
      if (card.images && Array.isArray(card.images)) {
        for (let imgIdx = 0; imgIdx < card.images.length; imgIdx++) {
          const img = card.images[imgIdx];
          if (img.prompt && img.image) {
            const fullPath = path.join(boardgamePath, img.image);
            images.push({
              cardIndex: cardIdx,
              imageIndex: imgIdx,
              label: img.label || 'Untitled',
              prompt: img.prompt,
              imagePath: img.image,
              style: img.style || 'illustrated',
              exists: fs.existsSync(fullPath)
            });
          }
        }
      }
      // Handle flat format
      else if (card.prompt && card.image) {
        const fullPath = path.join(boardgamePath, card.image);
        images.push({
          cardIndex: cardIdx,
          imageIndex: 0,
          label: 'Card ' + (cardIdx + 1),
          prompt: card.prompt,
          imagePath: card.image,
          style: 'illustrated',
          exists: fs.existsSync(fullPath)
        });
      }
    }

    const pending = images.filter(img => !img.exists).length;

    res.json({
      images,
      total: images.length,
      pending
    });
  } catch (error) {
    console.error('Error reading cards:', error);
    res.status(500).json({ error: 'Failed to read cards' });
  }
});

// POST /api/cards/update-prompt - Update a card's prompt in the JSON file
cardsRouter.post('/update-prompt', (req: Request, res: Response) => {
  try {
    const { type, filename, section, cardIndex, imageIndex, newPrompt } = req.body;

    if (!type || !filename || !section || cardIndex === undefined || imageIndex === undefined || !newPrompt) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (type !== 'language' && type !== 'articulation') {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    const filePath = path.join(config.sharedPath, 'cards', type, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    const sectionData = data[section];

    if (!sectionData) {
      res.status(404).json({ error: 'Section not found' });
      return;
    }

    const cardsArray = Array.isArray(sectionData) ? sectionData : (sectionData.cards || []);
    const card = cardsArray[cardIndex];

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    // Update the prompt
    if (card.images && card.images[imageIndex]) {
      card.images[imageIndex].prompt = newPrompt;
    } else if (card.prompt !== undefined) {
      card.prompt = newPrompt;
    } else {
      res.status(404).json({ error: 'Image not found in card' });
      return;
    }

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});
