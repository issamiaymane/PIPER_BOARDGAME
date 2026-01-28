/**
 * Application Configuration
 */

import dotenv from 'dotenv';
import { safetyGateConfig } from './safety-gate.js';
import { calibrationConfig, calibrationPrompts } from './calibration.js';
import { gameConfig } from './game.js';
import { authConfig } from './auth.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables in production
if (isProduction) {
  const requiredEnvVars = ['JWT_SECRET', 'OPENAI_API_KEY'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missing.join(', ')}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-only-never-use-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // OpenAI API
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },

  // Safety-gate configuration (from separate module)
  safetyGate: safetyGateConfig,

  // Calibration configuration
  calibration: calibrationConfig,
  calibrationPrompts: calibrationPrompts,

  // Game configuration
  game: gameConfig,

  // Auth configuration
  auth: authConfig,
};
