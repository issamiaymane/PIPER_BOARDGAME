/**
 * Therapist Live WebSocket Routes
 * Real-time session monitoring for therapists
 */

import { Server, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Duplex } from 'stream';
import { URL } from 'url';
import { verifyToken } from '../../services/auth/index.js';
import { liveSessionBroadcaster, gameplaySessionManager } from '../../services/session/index.js';
import type { TherapistLiveClientMessage } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Setup therapist live WebSocket server with noServer mode
 */
export function setupTherapistLiveWebSocket(server: Server): void {
  // Create WebSocketServer without attaching to HTTP server
  // This prevents conflicts when multiple WebSocketServers share the same server
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false
  });

  // Handle upgrade requests for /api/therapist/live
  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname === '/api/therapist/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Other paths are handled by other WebSocket servers
  });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    logger.info('Therapist live WebSocket connection attempt');

    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      logger.warn('Therapist live WebSocket: No token provided');
      ws.close(4001, 'No token provided');
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn('Therapist live WebSocket: Invalid token');
      ws.close(4002, 'Invalid token');
      return;
    }

    const therapistId = decoded.therapist_id;
    logger.info(`Therapist ${therapistId} connected to live WebSocket`);

    // Subscribe therapist to live updates
    liveSessionBroadcaster.subscribeTherapist(therapistId, ws);

    // Send current active sessions immediately
    const activeSessions = gameplaySessionManager.getActiveSessionsForTherapist(therapistId);
    liveSessionBroadcaster.sendActiveSessions(ws, activeSessions);

    // Handle messages from client
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as TherapistLiveClientMessage;

        switch (message.type) {
          case 'subscribe':
            // Already subscribed on connection
            logger.debug(`Therapist ${therapistId} sent subscribe (already subscribed)`);
            break;

          case 'get_active_sessions':
            const sessions = gameplaySessionManager.getActiveSessionsForTherapist(therapistId);
            liveSessionBroadcaster.sendActiveSessions(ws, sessions);
            break;

          default:
            logger.warn(`Unknown message type from therapist ${therapistId}:`, message);
        }
      } catch (error) {
        logger.error('Error processing therapist live message:', error);
        liveSessionBroadcaster.sendError(ws, 'Invalid message format');
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.info(`Therapist ${therapistId} disconnected from live WebSocket`);
      // Unsubscribe is handled automatically by the broadcaster's close handler
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`Therapist ${therapistId} WebSocket error:`, error);
    });
  });

  logger.info('Therapist live WebSocket server initialized on /api/therapist/live');
}

export default setupTherapistLiveWebSocket;
