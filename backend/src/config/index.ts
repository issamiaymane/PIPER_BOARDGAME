/**
 * Application Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',

  // OpenAI API
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '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',
  },
};
