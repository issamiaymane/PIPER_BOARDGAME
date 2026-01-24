import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { cardsRouter } from './routes/cards.routes.js';
import { imagesRouter } from './routes/images.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/cards', cardsRouter);
app.use('/api/images', imagesRouter);

// Start server
app.listen(config.port, () => {
  console.log(`Image Gen Backend running on http://localhost:${config.port}`);
  if (!config.geminiApiKey) {
    console.warn('Warning: GEMINI_API_KEY not set. Copy .env.example to .env and add your key.');
  }
});
