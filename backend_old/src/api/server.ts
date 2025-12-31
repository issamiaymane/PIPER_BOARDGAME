/**
 * Express API Server - PIPER Boardgame
 * Streamlined for the PIPER speech therapy boardgame
 */

import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import multer from 'multer';

// Config and Middleware
import { config } from '../config';
import { corsMiddleware, errorHandler } from './middleware';

// Route creators
import { createCheckRouter } from './routes';

// PIPER (Language Therapy Boardgame - Core)
import piperRoutes from './routes/piper.routes';
import { initializeDatabase as initializePiperDB } from '../services/piper';

// Initialize Express
export const app = express();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// CORS middleware
app.use(corsMiddleware);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(config.frontendPath));

// =============================================================================
// SERVICES INITIALIZATION
// =============================================================================

// Initialize OpenAI (used by PIPER feedback service)
const openAI = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Configure multer for audio file uploads
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (Whisper API limit)
});

// Initialize PIPER database
initializePiperDB();

// =============================================================================
// ROUTES
// =============================================================================

// Root redirect to boardgame
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/pages/boardgame.html');
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0-boardgame',
  });
});

// Transcribe audio using OpenAI Whisper
app.post('/api/transcribe', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    // Convert buffer to a File-like object for OpenAI
    const audioFile = new File([req.file.buffer], 'audio.wav', { type: 'audio/wav' });

    const transcription = await openAI.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: req.body.language || 'en',
    });

    res.json({ text: transcription.text });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Transcription failed',
      text: ''
    });
  }
});

// Mount routers
app.use('/api', createCheckRouter(openAI));
app.use('/api/piper', piperRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use(errorHandler);

// =============================================================================
// SERVER START
// =============================================================================

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`Speech Therapy AI API running on port ${config.port}`);
  });
}
