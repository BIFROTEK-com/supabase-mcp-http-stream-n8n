#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const port = process.env.MCP_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MCP Server Process
let mcpProcess = null;
let mcpReady = false;

// SSE connections for MCP (backward compatibility)
const sseClients = new Map();
let sseClientId = 1;

// Session management for Streamable HTTP
const sessions = new Map();
let sessionIdCounter = 1;

// Response buffer for handling multi-line JSON
let responseBuffer = '';

// Start MCP Server
function startMCPServer() {
    const args = [
        'packages/mcp-server-supabase/dist/transports/stdio.js'
    ];
    
    // Add command line arguments from environment
    if (process.env.SUPABASE_PROJECT_REF) {
        args.push('--project-ref=' + process.env.SUPABASE_PROJECT_REF);
    }
    
    if (process.env.SUPABASE_ACCESS_TOKEN) {
        args.push('--access-token=' + process.env.SUPABASE_ACCESS_TOKEN);
    }
    
    if (process.env.MCP_FEATURES) {
        args.push('--features=' + process.env.MCP_FEATURES);
    }
    
    if (process.env.MCP_READ_ONLY === 'true') {
        args.push('--read-only');
    }
    
    console.log('Starting MCP server with args:', args);
    
    mcpProcess = spawn('node', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
    });
    
    mcpProcess.stdout.on('data', (data) => {
        const text = data.toString();
        console.log('MCP stdout:', text);
        
        // Add to buffer
        responseBuffer += text;
        
        // Try to parse complete JSON messages
        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || ''; // Keep the last incomplete line
        
        lines.forEach(line => {
            if (line.trim()) {
                try {
                    const response = JSON.parse(line.trim());
                    handleMCPResponse(response);
                } catch (err) {
                    // If it's not complete JSON, add it back to buffer
                    responseBuffer = line + '\n' + responseBuffer;
                }
            }
        });
    });
    
    mcpProcess.stderr.on('data', (data) => {
        console.error('MCP stderr:', data.toString());
    });
    
    mcpProcess.on('close', (code) => {
        console.log('MCP process exited with code:', code);
        mcpReady = false;
        mcpProcess = null;
    });
    
    mcpProcess.on('error', (err) => {
        console.error('MCP process error:', err);
        mcpReady = false;
    });
    
    // Initialize the MCP server
    setTimeout(() => {
        const initMessage = {
            jsonrpc: "2.0",
            id: "init",
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                    name: "supabase-mcp-http-server",
                    version: "1.0.0"
                }
            }
        };
        
        mcpProcess.stdin.write(JSON.stringify(initMessage) + '\n');
        mcpReady = true;
        console.log('MCP server initialized');
    }, 1000);
}

// Pending requests
const pendingRequests = new Map();

// Handle MCP responses
function handleMCPResponse(response) {
    const requestId = response.id;
    
    if (pendingRequests.has(requestId)) {
        const { resolve, sessionId } = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        resolve(response);
        
        // For SSE clients, send the response
        if (sseClients.has(sessionId)) {
            const client = sseClients.get(sessionId);
            client.write(`data: ${JSON.stringify(response)}\n\n`);
        }
    }
}

// Send request to MCP server
async function sendMCPRequest(request, sessionId = null) {
    return new Promise((resolve, reject) => {
        if (!mcpProcess || !mcpReady) {
            reject(new Error('MCP server not ready'));
            return;
        }
        
        const requestId = request.id;
        pendingRequests.set(requestId, { resolve, reject, sessionId });
        
        // Set timeout
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error('Request timeout'));
            }
        }, 30000);
        
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    });
}

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        mcpReady: mcpReady,
        timestamp: new Date().toISOString()
    });
});

// MCP Status endpoint for n8n discovery
app.get('/mcp/status', (req, res) => {
    res.json({
        protocol: 'mcp',
        version: '2024-11-05',
        transports: ['streamable-http', 'sse'],
        status: mcpReady ? 'ready' : 'starting',
        capabilities: {
            'tools': true,
            'resources': true,
            'prompts': true
        }
    });
});

// Main MCP endpoint - supports multiple transports
app.post('/mcp', async (req, res) => {
    const acceptHeader = req.headers.accept || '';
    const sessionId = req.headers['mcp-session-id'] || `session-${sessionIdCounter++}`;
    
    // Check if this is SSE request (n8n style)
    if (acceptHeader.includes('text/event-stream')) {
        // SSE Transport (for n8n)
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        
        const clientId = sseClientId++;
        sseClients.set(sessionId, res);
        
        // Send connection confirmation
        res.write(`data: ${JSON.stringify({
            type: 'connection',
            sessionId: sessionId,
            message: 'Connected to MCP server'
        })}\n\n`);
        
        // Handle SSE disconnection
        req.on('close', () => {
            sseClients.delete(sessionId);
            console.log(`SSE client ${sessionId} disconnected`);
        });
        
        // Process the request
        try {
            const response = await sendMCPRequest(req.body, sessionId);
            // Response will be sent via handleMCPResponse
        } catch (error) {
            res.write(`data: ${JSON.stringify({
                jsonrpc: "2.0",
                id: req.body.id,
                error: {
                    code: -32603,
                    message: error.message
                }
            })}\n\n`);
        }
        
        return;
    }
    
    // Streamable HTTP Transport (for Pipecat and modern clients)
    try {
        const response = await sendMCPRequest(req.body);
        
        res.setHeader('Content-Type', 'application/json');
        if (sessionId) {
            res.setHeader('Mcp-Session-Id', sessionId);
        }
        
        res.json(response);
    } catch (error) {
        res.status(500).json({
            jsonrpc: "2.0",
            id: req.body?.id || null,
            error: {
                code: -32603,
                message: error.message
            }
        });
    }
});

// Legacy HTTP endpoint for simple testing
app.post('/tools', async (req, res) => {
    try {
        const response = await sendMCPRequest({
            jsonrpc: "2.0",
            id: `tools-${Date.now()}`,
            method: "tools/list",
            params: {}
        });
        res.json(response.result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
startMCPServer();

app.listen(port, () => {
    console.log(`MCP HTTP Server running on port ${port}`);
    console.log(`Streamable HTTP: POST /mcp`);
    console.log(`SSE (legacy): POST /mcp with Accept: text/event-stream`);
    console.log(`Status: GET /mcp/status`);
    console.log(`Health: GET /health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (mcpProcess) {
        mcpProcess.kill();
    }
    process.exit(0);
}); 