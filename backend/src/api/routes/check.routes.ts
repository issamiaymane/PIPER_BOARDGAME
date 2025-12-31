/**
 * Check Routes - All AI-powered answer checking endpoints
 * Consolidates 41 check-* endpoints into a single router
 */

import { Router } from 'express';
import OpenAI from 'openai';
import { createCheckHandler, checkConfigs, CheckConfig } from '../controllers/check.controller';

export function createCheckRouter(openAI: OpenAI): Router {
  const router = Router();

  // Register all check endpoints dynamically
  Object.entries(checkConfigs).forEach(([key, config]) => {
    const fullConfig: CheckConfig = { ...config, name: key };
    router.post(`/check-${key}`, createCheckHandler(openAI, fullConfig));
  });

  return router;
}
