#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { createSupabaseApiPlatform, createSupabaseMcpServer } from './packages/mcp-server-supabase/dist/index.js';

const app = express();
const port = process.env.PORT || 3333;

// Session management
const sessions = new Map();

// Middleware
app.use(cors({
    origin: '*',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Last-Event-ID'],
    methods: ['GET', 'POST', 'OPTIONS']
}));
app.use(express.json({ limit: '4mb' }));

// Initialize Supabase MCP Server
console.log('🔧 Initializing Supabase MCP Server...');

const platform = createSupabaseApiPlatform({
    accessToken: process.env.SUPABASE_ACCESS_TOKEN || 'dummy-token',
    apiUrl: process.env.SUPABASE_API_URL,
});

const mcpServer = createSupabaseMcpServer({
    platform,
    projectId: process.env.SUPABASE_PROJECT_REF || 'dummy-project',
    readOnly: process.env.MCP_READ_ONLY === 'true',
});

console.log('✅ Supabase MCP Server initialized');

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        server: 'MCP SSE Server',
        transport: 'SSE (n8n compatible)',
        timestamp: new Date().toISOString(),
        sessions: sessions.size
    });
});

// SSE endpoint - n8n compatible
app.get('/sse', (req, res) => {
    console.log('🌊 SSE connection from:', req.ip);
    
    // Generate session ID
    const sessionId = randomUUID();
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    
    // Store session
    sessions.set(sessionId, {
        response: res,
        createdAt: new Date(),
        lastActivity: new Date()
    });
    
    // Send initial endpoint event (n8n expects this!)
    res.write(`event: endpoint\n`);
    res.write(`data: /messages?sessionId=${sessionId}\n\n`);
    
    // Send ready event
    res.write(`data: ${JSON.stringify({
        type: 'ready',
        status: 'connected',
        session: sessionId,
        capabilities: {
            tools: true,
            resources: false,
            prompts: false
        }
    })}\n\n`);
    
    // Keep-alive ping every 15 seconds
    const pingInterval = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch (error) {
            clearInterval(pingInterval);
        }
    }, 15000);
    
    // Handle disconnect
    req.on('close', () => {
        console.log('🔌 SSE client disconnected:', sessionId);
        clearInterval(pingInterval);
        sessions.delete(sessionId);
    });
    
    req.on('error', (error) => {
        console.error('❌ SSE error:', error);
        clearInterval(pingInterval);
        sessions.delete(sessionId);
    });
});

// Messages endpoint - handles JSON-RPC 2.0
app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({
            jsonrpc: '2.0',
            id: req.body?.id || null,
            error: {
                code: -32000,
                message: 'Invalid or missing session ID'
            }
        });
    }
    
    const session = sessions.get(sessionId);
    session.lastActivity = new Date();
    
    console.log('📤 Message received:', req.body);
    
    try {
        const { jsonrpc, id, method, params } = req.body;
        
        if (jsonrpc !== '2.0') {
            throw new Error('Invalid JSON-RPC version');
        }
        
        let result;
        
        switch (method) {
            case 'initialize':
                result = {
                    protocolVersion: '2025-03-26',
                    capabilities: {
                        tools: true,
                        resources: false,
                        prompts: false
                    }
                };
                break;
                
            case 'tools/list':
                const tools = await mcpServer.listTools();
                result = { tools };
                break;
                
            case 'tools/call':
                if (!params?.name || !params?.arguments) {
                    throw new Error('Missing tool name or arguments');
                }
                result = await mcpServer.callTool(params.name, params.arguments);
                break;
                
            case 'ping':
                result = { message: 'pong' };
                break;
                
            default:
                throw new Error(`Unknown method: ${method}`);
        }
        
        const response = {
            jsonrpc: '2.0',
            id,
            result
        };
        
        // Send response via HTTP (n8n expects this!)
        res.json(response);
        
        // Also send via SSE to the connected client
        if (session.response && !session.response.writableEnded) {
            session.response.write(`data: ${JSON.stringify(response)}\n\n`);
        }
        
    } catch (error) {
        console.error('❌ Message error:', error);
        const errorResponse = {
            jsonrpc: '2.0',
            id: req.body?.id || null,
            error: {
                code: -32000,
                message: error instanceof Error ? error.message : 'Unknown error',
                data: {
                    method: req.body?.method,
                    sessionId,
                    connectionActive: sessions.has(sessionId)
                }
            }
        };
        
        res.status(500).json(errorResponse);
    }
});

// Clean up stale sessions every minute
setInterval(() => {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [sessionId, session] of sessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > timeout) {
            console.log('🧹 Cleaning up stale session:', sessionId);
            if (session.response && !session.response.writableEnded) {
                session.response.end();
            }
            sessions.delete(sessionId);
        }
    }
}, 60000);

// Start server
app.listen(port, () => {
    console.log('🎯 MCP SSE Server (n8n compatible) running on port', port);
    console.log('✅ SSE Transport implementation');
    console.log('✅ JSON-RPC 2.0 compliant');
    console.log('✅ Session management enabled');
    console.log('🌊 SSE Endpoint: GET /sse');
    console.log('📤 Messages: POST /messages?sessionId={id}');
    console.log('❤️ Health: GET /health');
    console.log('');
    console.log('🔗 Ready for n8n MCP Client connection!');
    console.log('📋 Environment:');
    console.log(`   SUPABASE_ACCESS_TOKEN: ${process.env.SUPABASE_ACCESS_TOKEN ? '✅ set' : '❌ missing'}`);
    console.log(`   SUPABASE_PROJECT_REF: ${process.env.SUPABASE_PROJECT_REF ? '✅ set' : '❌ missing'}`);
}); 