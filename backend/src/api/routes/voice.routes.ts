/**
 * Voice WebSocket Routes
 * Handles WebSocket connections for voice mode
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { voiceSessionManager, ClientMessage } from '../../services/voice/index.js';
import { logger } from '../../utils/logger.js';

// Store session ID by WebSocket connection
const wsSessionMap = new Map<WebSocket, string>();

/**
 * Setup Voice WebSocket server
 */
export function setupVoiceWebSocket(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/api/voice'
  });

  logger.info('Voice WebSocket server initialized on /api/voice');

  wss.on('connection', async (ws: WebSocket) => {
    logger.info('New voice WebSocket connection');

    // Create session when client connects
    const sessionId = await voiceSessionManager.createSession(ws);

    if (!sessionId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to create voice session. Please check server configuration.'
      }));
      ws.close();
      return;
    }

    // Store the mapping
    wsSessionMap.set(ws, sessionId);

    // Send session ready message
    ws.send(JSON.stringify({
      type: 'session_ready',
      sessionId
    }));

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        const sid = wsSessionMap.get(ws);

        if (sid) {
          voiceSessionManager.handleClientMessage(sid, message);
        }
      } catch (err) {
        logger.error('Failed to parse client message:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      const sid = wsSessionMap.get(ws);
      if (sid) {
        voiceSessionManager.endSession(sid);
        wsSessionMap.delete(ws);
      }
      logger.info('Voice WebSocket connection closed');
    });

    // Handle errors
    ws.on('error', (err) => {
      logger.error('Voice WebSocket error:', err);
      const sid = wsSessionMap.get(ws);
      if (sid) {
        voiceSessionManager.endSession(sid);
        wsSessionMap.delete(ws);
      }
    });
  });

  // Cleanup on server close
  wss.on('close', () => {
    voiceSessionManager.endAllSessions();
    wsSessionMap.clear();
    logger.info('Voice WebSocket server closed');
  });

  return wss;
}
