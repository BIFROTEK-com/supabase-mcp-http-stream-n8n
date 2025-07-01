#!/usr/bin/env node

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const port = process.env.MCP_PORT || 3333;

// Configure Express trust proxy for ngrok/proxy environments
if (process.env.EXPRESS_TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    console.log('✅ Express trust proxy enabled for production/proxy environment');
}

// Security: Basic hardening against script kiddies
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
    crossOriginEmbedderPolicy: false // Allow iframe embedding for testing
}));

// Rate limiting - prevents basic DDoS and abuse
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) + ' seconds' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    }
});

// Different rate limits for different endpoints
const mcpLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    parseInt(process.env.MCP_RATE_LIMIT_REQUESTS || '100'), // 100 requests per 15min
    'Too many MCP requests. This server is rate limited to prevent abuse.'
);

const generalLimiter = createRateLimiter(
    60 * 1000, // 1 minute  
    parseInt(process.env.MCP_RATE_LIMIT_GENERAL || '60'), // 60 requests per minute
    'Too many requests. Please slow down.'
);

// Apply rate limiting
app.use(generalLimiter);
app.use('/mcp', mcpLimiter);

// API Key Authentication (optional but recommended)
function authenticateAPIKey(req, res, next) {
    // Skip auth for health and status checks and landing page
    if (req.path === '/health' || req.path === '/' || req.path === '/ping') {
        return next();
    }
    
    // Check if API keys are configured
    const validApiKeys = process.env.MCP_API_KEYS?.split(',').map(key => key.trim()).filter(Boolean) || [];
    
    if (validApiKeys.length === 0) {
        // No API keys configured - log warning but allow access
        console.warn('⚠️  WARNING: MCP_API_KEYS not configured. Server is open to public access!');
        console.warn('   For production use, set MCP_API_KEYS="your-secret-key1,your-secret-key2"');
        return next();
    }
    
    // API keys are configured - require authentication
    const providedKey = req.headers['x-api-key'] || req.headers['api-key'] || req.headers.authorization?.replace('Bearer ', '');
    
    if (!providedKey) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Include X-API-Key header or Authorization: Bearer <key>',
            hint: 'Contact server administrator for API key'
        });
    }
    
    if (!validApiKeys.includes(providedKey)) {
        console.warn(`🚨 Unauthorized access attempt from ${req.ip} with key: ${providedKey.substring(0, 8)}...`);
        return res.status(403).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }
    
    console.log(`✅ Authenticated request from ${req.ip}`);
    next();
}

// Request validation for MCP endpoints
function validateMCPRequest(req, res, next) {
    if (req.method !== 'POST') {
        return next();
    }
    
    const body = req.body;
    
    // Basic JSON-RPC validation
    if (!body || typeof body !== 'object') {
        return res.status(400).json({
            error: 'Invalid request',
            message: 'Request body must be valid JSON'
        });
    }
    
    if (body.jsonrpc !== '2.0' || !body.method || !body.id) {
        return res.status(400).json({
            error: 'Invalid JSON-RPC request',
            message: 'Request must follow JSON-RPC 2.0 specification'
        });
    }
    
    // Prevent potentially dangerous methods (if any)
    const dangeroMethods = ['eval', 'exec', 'system', 'file/write', 'file/delete'];
    if (dangeroMethods.some(dangerous => body.method.toLowerCase().includes(dangerous))) {
        console.warn(`🚨 Blocked potentially dangerous method: ${body.method} from ${req.ip}`);
        return res.status(403).json({
            error: 'Method not allowed',
            message: 'This method is not permitted for security reasons'
        });
    }
    
    next();
}

// CORS with security considerations
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, postman, etc.)
        if (!origin) return callback(null, true);
        
        // Check if specific origins are configured
        const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || ['*'];
        
        if (allowedOrigins.includes('*')) {
            // Allow all origins if explicitly configured
            return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        console.warn(`🚨 Blocked CORS request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Middleware order matters - auth and validation after CORS
app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(authenticateAPIKey);
app.use('/mcp', validateMCPRequest);

// Security headers for responses
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

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

// Landing page with live status dashboard  
app.get('/', (req, res) => {
    const hasApiKeys = !!(process.env.MCP_API_KEYS?.split(',').filter(Boolean).length);
    const rateLimitMcp = process.env.MCP_RATE_LIMIT_REQUESTS || '100';
    const rateLimitGeneral = process.env.MCP_RATE_LIMIT_GENERAL || '60';
    const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS || '*';
    const features = process.env.MCP_FEATURES || 'database,docs,development,functions';
    const readOnly = process.env.MCP_READ_ONLY === 'true';
    
    // Security status calculation
    const securityFeatures = {
        'api_keys': hasApiKeys,
        'rate_limiting': true,
        'cors_protection': allowedOrigins !== '*',
        'security_headers': true,
        'request_validation': true
    };
    
    const securityScore = Object.values(securityFeatures).filter(Boolean).length;
    const maxSecurityScore = Object.keys(securityFeatures).length;
    
    res.setHeader('Content-Type', 'application/json');
    res.json({
        service: '🐳 Supabase MCP Server',
        description: 'Multi-transport Model Context Protocol server for Supabase',
        version: '1.0.0',
        
        // 🚦 Live status indicators
        status: {
            http_server: '🟢 online',
            mcp_backend: mcpReady ? '🟢 ready' : '🟡 initializing',
            supabase_connection: mcpReady ? '🟢 connected' : '🔴 disconnected',
            overall: mcpReady ? '🟢 fully operational' : '🟡 starting up',
            timestamp: new Date().toISOString()
        },
        
        // 🔄 Multi-transport support
        transports: {
            'streamable_http': '🚀 POST /mcp (MCP Streamable HTTP Transport)',
            'server_sent_events': '🌊 GET/POST /sse (n8n compatible)'
        },
        
        // 📍 Available endpoints
        endpoints: {
            'api_dashboard': '📖 GET / (this page)',
            'health_check': '❤️ GET /health',
            'mcp_api': '🔌 POST /mcp (Streamable HTTP)',
            'sse_api': '🌊 GET/POST /sse'
        },
        
        // 🔒 Security dashboard
        security: {
            overall_status: securityScore >= 4 ? '🔒 secure' : securityScore >= 2 ? '🟡 basic protection' : '🔴 vulnerable',
            security_score: `${securityScore}/${maxSecurityScore}`,
            features: {
                '🔑 API Authentication': hasApiKeys ? '🟢 enabled' : '🔴 DISABLED (open access!)',
                '⏱️ Rate Limiting': `🟢 enabled (${rateLimitMcp}/15min, ${rateLimitGeneral}/1min)`,
                '🌐 CORS Protection': allowedOrigins !== '*' ? '🟢 restricted origins' : '🟡 permissive (*)',
                '🛡️ Security Headers': '🟢 helmet.js active',
                '✅ Input Validation': '🟢 JSON-RPC validation'
            }
        },
        
        // ⚙️ Configuration info
        configuration: {
            'supabase_features': features.split(','),
            'read_only_mode': readOnly ? '🔒 enabled (safe)' : '🔓 disabled (full access)',
            'environment': process.env.NODE_ENV || 'development',
            'port': port
        },
        
        // 📝 Quick start examples
        examples: {
            'list_available_tools': {
                method: 'POST',
                url: '/mcp',
                headers: hasApiKeys 
                    ? { 'X-API-Key': 'your-api-key', 'Content-Type': 'application/json' } 
                    : { 'Content-Type': 'application/json' },
                body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }
            },
            'streamable_http_session': {
                method: 'POST',
                url: '/mcp',
                headers: {
                    'Content-Type': 'application/json',
                    'MCP-Session-ID': 'your-session-id' // Optional, server will create one if not provided
                },
                body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
                description: 'Server responds with MCP-Session-ID header for session tracking'
            },
            'health_check': {
                method: 'GET', 
                url: '/health',
                auth_required: false,
                expected_response: { status: 'ok', mcpReady: true }
            },
            'sse_connection': {
                method: 'GET',
                url: '/sse',
                headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' },
                auth_required: hasApiKeys,
                description: 'Establishes SSE connection for n8n integration'
            }
        },
        
        // 🔗 Useful links
        links: {
            'documentation': 'https://github.com/Silverstar187/supabase-mcp-docker',
            'mcp_specification': 'https://modelcontextprotocol.io',
            'supabase_platform': 'https://supabase.com'
        },
        
        // ⚠️ Warnings and recommendations
        warnings: [
            ...(hasApiKeys ? [] : [
                '⚠️ SECURITY WARNING: No API keys configured!',
                '💡 Set MCP_API_KEYS environment variable for production'
            ]),
            ...(allowedOrigins === '*' ? [
                '⚠️ CORS is permissive - consider restricting origins for production'
            ] : []),
            ...(!readOnly ? [
                '⚠️ Read-only mode disabled - server has full write access to Supabase'
            ] : [])
        ].filter(Boolean)
    });
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok',
        mcpReady: mcpReady,
        timestamp: new Date().toISOString()
    });
});

// Simple ping endpoint for load balancers
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// ✅ SSE Endpoint speziell für n8n MCP Client Tool Node
app.get('/sse', async (req, res) => {
    console.log('🌊 SSE connection request from:', req.ip);
    
    // N8n-compatible SSE Headers with additional specifications
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-API-Key, Accept, Last-Event-ID',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Expose-Headers': 'Content-Type, Cache-Control',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'X-Content-Type-Options': 'nosniff'
    });
    
    const clientId = `sse-${sseClientId++}`;
    sseClients.set(clientId, res);
    
    // Send N8n-compatible initial event (simple format)
    res.write(`event: endpoint\n`);
    res.write(`data: /sse/messages?sessionId=${clientId}\n\n`);
    
    // Send simplified connection confirmation
    res.write(`data: ${JSON.stringify({
        type: 'ready',
        status: 'connected',
        session: clientId
    })}\n\n`);
    
    // Keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
        try {
            res.write(`data: ${JSON.stringify({
                type: 'ping',
                timestamp: new Date().toISOString()
            })}\n\n`);
        } catch (error) {
            clearInterval(keepAlive);
            sseClients.delete(clientId);
        }
    }, 30000);
    
    // Handle client disconnect
    req.on('close', () => {
        clearInterval(keepAlive);
        sseClients.delete(clientId);
        console.log(`🌊 SSE client ${clientId} disconnected`);
    });
    
    req.on('error', () => {
        clearInterval(keepAlive);
        sseClients.delete(clientId);
    });
});

// ✅ SSE Message endpoint für n8n POST-Requests
app.post('/sse', async (req, res) => {
    console.log('🌊 SSE POST request from:', req.ip, 'Body:', req.body);
    
    try {
        const response = await sendMCPRequest(req.body);
        
        // Send response to all SSE clients
        const message = `data: ${JSON.stringify(response)}\n\n`;
        sseClients.forEach((client, clientId) => {
            try {
                client.write(message);
            } catch (error) {
                sseClients.delete(clientId);
            }
        });
        
        // Also send regular HTTP response
        res.json(response);
    } catch (error) {
        const errorResponse = {
            jsonrpc: "2.0",
            id: req.body?.id || null,
            error: {
                code: -32603,
                message: error.message
            }
        };
        
        // Send error to SSE clients
        const errorMessage = `data: ${JSON.stringify(errorResponse)}\n\n`;
        sseClients.forEach((client, clientId) => {
            try {
                client.write(errorMessage);
            } catch (error) {
                sseClients.delete(clientId);
            }
        });
        
        res.status(500).json(errorResponse);
    }
});

// Main MCP endpoint - Streamable HTTP Transport
app.post('/mcp', async (req, res) => {
    // Get or create session ID
    const sessionId = req.headers['mcp-session-id'] || `session-${sessionIdCounter++}`;
    
    // Set response headers for Streamable HTTP
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('MCP-Session-ID', sessionId);
    
    try {
        // Process the request
        const response = await sendMCPRequest(req.body);
        
        // Send response
        res.json(response);
    } catch (error) {
        // Send error response in JSON-RPC format
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
console.log('🚀 Starting MCP HTTP Server...');
console.log(`Port: ${port}`);
console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Supabase Token: ${process.env.SUPABASE_ACCESS_TOKEN ? 'configured' : '❌ MISSING'}`);
console.log(`Supabase Project: ${process.env.SUPABASE_PROJECT_REF ? 'configured' : '❌ MISSING'}`);
console.log(`API Keys: ${process.env.MCP_API_KEYS ? 'configured' : '⚠️ not configured'}`);

startMCPServer();

app.listen(port, () => {
    console.log(`✅ MCP HTTP Server running on port ${port}`);
    console.log(`🚀 Streamable HTTP: POST /mcp`);
    console.log(`🌊 SSE: GET/POST /sse`);
    console.log(`❤️ Health: GET /health`);
    console.log(`🏠 Landing: GET /`);
    console.log('');
    console.log('🔗 Ready for connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    if (mcpProcess) {
        mcpProcess.kill();
    }
    process.exit(0);
}); 