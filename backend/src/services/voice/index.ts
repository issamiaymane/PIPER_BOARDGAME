/**
 * Voice Services Module
 * Exports voice-related services for OpenAI Realtime API integration
 */

export { RealtimeVoiceService } from './realtime.js';
export { VoiceSessionManager, voiceSessionManager } from './session.js';
export type { VoiceSession } from './session.js';

// Re-export types from centralized types file
export type {
  ClientMessage,
  ServerMessage,
  RealtimeServerEvent,
  RealtimeClientEvent,
  RealtimeEventHandler
} from '../../types/voice.js';
