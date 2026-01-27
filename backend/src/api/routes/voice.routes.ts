/**
 * Voice WebSocket Routes
 * Handles WebSocket connections for voice mode
 */

import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Duplex } from 'stream';
import { voiceSessionManager, ClientMessage } from '../../services/voice/index.js';
import { logger } from '../../utils/logger.js';

// Store session ID by WebSocket connection
const wsSessionMap = new Map<WebSocket, string>();

// The WebSocketServer instance (created with noServer)
let wss: WebSocketServer;

/**
 * Setup Voice WebSocket server with noServer mode
 * Returns the upgrade handler to be called from the main server
 */
export function setupVoiceWebSocket(server: HttpServer): void {
  // Create WebSocketServer without attaching to HTTP server
  // This prevents conflicts when multiple WebSocketServers share the same server
  wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false
  });

  // Handle upgrade requests for /api/voice
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/api/voice') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Other paths are handled by other WebSocket servers
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
}
