import { Request, Response } from 'express';
import { SupabaseMCPServer } from './server.js';

export class SSEServer {
  private server: SupabaseMCPServer;
  private clients: Map<string, Response> = new Map();

  constructor(server: SupabaseMCPServer) {
    this.server = server;
  }

  async handleSSE(req: Request, res: Response) {
    const clientId = Math.random().toString(36).substring(7);
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
    });

    // Store client
    this.clients.set(clientId, res);

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ 
      type: 'connection', 
      clientId,
      message: 'Connected to Supabase MCP Server' 
    })}\n\n`);

    // Handle disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
    });

    req.on('error', () => {
      this.clients.delete(clientId);
    });
  }

  async handleSSEMessage(req: Request, res: Response) {
    try {
      const { jsonrpc, id, method, params } = req.body;

      if (jsonrpc !== '2.0') {
        return res.status(400).json({ 
          error: 'Invalid JSON-RPC version' 
        });
      }

      let result;
      
      switch (method) {
        case 'tools/list':
          result = await this.server.listTools();
          break;
        case 'tools/call':
          if (!params?.name || !params?.arguments) {
            throw new Error('Missing tool name or arguments');
          }
          result = await this.server.callTool(params.name, params.arguments);
          break;
        case 'ping':
          result = { message: 'pong' };
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      // Send result as SSE to all clients
      const message = {
        jsonrpc: '2.0',
        id,
        result
      };

      this.broadcast(message);
      
      res.json(message);
    } catch (error) {
      const errorMessage = {
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      this.broadcast(errorMessage);
      res.status(500).json(errorMessage);
    }
  }

  private broadcast(message: any) {
    const data = `data: ${JSON.stringify(message)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.write(data);
      } catch (error) {
        // Client disconnected, will be cleaned up on 'close' event
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
} 