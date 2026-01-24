import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { generateImage } from '../services/gemini.service.js';

export const imagesRouter = Router();

// POST /api/images/generate - Generate image via Gemini
imagesRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const result = await generateImage(prompt);
    res.json(result);
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate image'
    });
  }
});

// POST /api/images/save - Save image to disk
imagesRouter.post('/save', (req: Request, res: Response) => {
  try {
    const { imageBase64, imagePath } = req.body;

    if (!imageBase64 || !imagePath) {
      res.status(400).json({ error: 'imageBase64 and imagePath are required' });
      return;
    }

    // Validate path is within shared/images
    if (!imagePath.startsWith('/shared/images/')) {
      res.status(400).json({ error: 'Invalid image path' });
      return;
    }

    const boardgamePath = path.resolve(config.sharedPath, '..');
    const fullPath = path.join(boardgamePath, imagePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save image
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(fullPath, imageBuffer);

    res.json({ success: true, path: imagePath });
  } catch (error) {
    console.error('Save image error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to save image'
    });
  }
});

// POST /api/images/check - Check if image exists
imagesRouter.post('/check', (req: Request, res: Response) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      res.status(400).json({ error: 'imagePath is required' });
      return;
    }

    const boardgamePath = path.resolve(config.sharedPath, '..');
    const fullPath = path.join(boardgamePath, imagePath);
    const exists = fs.existsSync(fullPath);

    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check image' });
  }
});
