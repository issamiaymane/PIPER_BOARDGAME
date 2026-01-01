/**
 * Shared TypeScript Types
 * Common types used across multiple features
 */

// Card data structure
export interface CardData {
  question?: string;
  images?: Array<string | { image?: string; label?: string }>;
  choices?: string[];
  words?: string[];
  title?: string;
  story?: string;
  paragraph?: string;
  sentence?: string;
  questions?: Array<{ question: string; answer?: string | string[]; answers?: string[] }>;
  answerIndex?: number;
  answerSequence?: number[];
  [key: string]: unknown;
}

// Category data mapping
export type CategoryData = Record<string, CardData[]>;

// Handler types - re-exported from the single source of truth
export type { HandlerType, HandlerConfig } from '../../constants/handler-map';
