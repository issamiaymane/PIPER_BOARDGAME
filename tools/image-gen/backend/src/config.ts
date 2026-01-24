import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  sharedPath: path.resolve(__dirname, process.env.SHARED_PATH || '../../../shared'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
};
