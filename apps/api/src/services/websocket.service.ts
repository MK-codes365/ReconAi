import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export class WebSocketService {
  private wss: WebSocketServer | null = null;

  init(server: Server) {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📡 Dashboard WebSocket client connected');
      ws.send(JSON.stringify({ event: 'connected', message: 'ReconAI Real-Time WebSocket Established' }));

      ws.on('close', () => console.log('Client disconnected from WebSocket'));
    });
  }

  /**
   * Broadcast real-time event to all connected dashboard clients
   */
  broadcast(event: string, payload: any) {
    if (!this.wss) return;
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const wsService = new WebSocketService();
