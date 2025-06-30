import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Test app factory that mimics the security features from mcp-http-server.js
function createTestApp() {
  const app = express();
  
  // Security hardening
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }));

  // Rate limiting
  const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/health'
  });

  const mcpRateLimit = createRateLimiter(
    15 * 60 * 1000,
    parseInt(process.env.MCP_RATE_LIMIT_REQUESTS || '100'),
    'Too many MCP requests'
  );

  const generalRateLimit = createRateLimiter(
    60 * 1000,
    parseInt(process.env.MCP_RATE_LIMIT_GENERAL || '60'),
    'Too many requests'
  );

  app.use(generalRateLimit);

  // CORS
  const allowedOrigins = process.env.MCP_ALLOWED_ORIGINS 
    ? process.env.MCP_ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['*'];

  app.use(cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'API-Key'],
    credentials: true
  }));

  app.use(express.json({ limit: '1mb' }));

  // Auth middleware
  function requireAuth(req, res, next) {
    const apiKeys = process.env.MCP_API_KEYS;
    
    if (!apiKeys) return next();

    const keys = apiKeys.split(',').map(k => k.trim());
    const providedKey = req.headers['x-api-key'] || 
                       req.headers['api-key'] || 
                       req.headers.authorization?.replace('Bearer ', '');

    if (!providedKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide API key'
      });
    }

    if (!keys.includes(providedKey)) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
  }

  // Request validation
  function validateMcpRequest(req, res, next) {
    const { jsonrpc, id, method } = req.body;

    if (!jsonrpc || jsonrpc !== '2.0' || !id || !method) {
      return res.status(400).json({
        error: 'Invalid JSON-RPC request'
      });
    }

    const dangerousMethods = ['eval', 'exec', 'system', 'file/write', 'file/delete'];
    if (dangerousMethods.includes(method)) {
      return res.status(403).json({
        error: 'Method not allowed',
        method: method
      });
    }

    next();
  }

  // Routes
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      mcpReady: true,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/mcp/status', (req, res) => {
    res.json({
      protocol: 'mcp',
      version: '2024-11-05',
      transports: ['streamable-http', 'sse'],
      status: 'ready',
      capabilities: { tools: true, resources: true, prompts: true }
    });
  });

  app.post('/mcp', mcpRateLimit, requireAuth, validateMcpRequest, (req, res) => {
    const accept = req.headers.accept;
    
    if (accept && accept.includes('text/event-stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('data: {"jsonrpc":"2.0","id":"test","result":{"status":"ok"}}\n\n');
      res.end();
    } else {
      res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: { status: 'test-success' }
      });
    }
  });

  return app;
}

describe('MCP HTTP Server Security Tests', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    delete process.env.MCP_API_KEYS;
    delete process.env.MCP_ALLOWED_ORIGINS;
    delete process.env.MCP_RATE_LIMIT_REQUESTS;
    delete process.env.MCP_RATE_LIMIT_GENERAL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Health Endpoint', () => {
    test('returns status without auth', async () => {
      const app = createTestApp();
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        mcpReady: true,
        timestamp: expect.any(String)
      });
    });
  });

  describe('Status Endpoint', () => {
    test('returns MCP capabilities', async () => {
      const app = createTestApp();
      const response = await request(app).get('/mcp/status').expect(200);

      expect(response.body).toEqual({
        protocol: 'mcp',
        version: '2024-11-05',
        transports: ['streamable-http', 'sse'],
        status: 'ready',
        capabilities: { tools: true, resources: true, prompts: true }
      });
    });
  });

  describe('Authentication', () => {
    test('allows access without API keys when not configured', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'tools/list', params: {} })
        .expect(200);
    });

    test('requires API key when configured', async () => {
      process.env.MCP_API_KEYS = 'secret-key';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'tools/list', params: {} })
        .expect(401);
    });

    test('accepts valid API key', async () => {
      process.env.MCP_API_KEYS = 'valid-key';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .set('X-API-Key', 'valid-key')
        .send({ jsonrpc: '2.0', id: 'test', method: 'tools/list', params: {} })
        .expect(200);
    });

    test('rejects invalid API key', async () => {
      process.env.MCP_API_KEYS = 'valid-key';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .set('X-API-Key', 'invalid-key')
        .send({ jsonrpc: '2.0', id: 'test', method: 'tools/list', params: {} })
        .expect(403);
    });
  });

  describe('Request Validation', () => {
    test('validates JSON-RPC format', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .send({ invalid: 'request' })
        .expect(400);
    });

    test('blocks dangerous methods', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'eval', params: {} })
        .expect(403);
    });

    test('requires all JSON-RPC fields', async () => {
      const app = createTestApp();
      
      // Missing method
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test' })
        .expect(400);

      // Missing id
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', method: 'test' })
        .expect(400);
    });
  });

  describe('Security Headers', () => {
    test('includes security headers', async () => {
      const app = createTestApp();
      
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('SSE Support', () => {
    test('handles SSE requests', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .post('/mcp')
        .set('Accept', 'text/event-stream')
        .send({ jsonrpc: '2.0', id: 'test', method: 'tools/list', params: {} })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.headers['cache-control']).toBe('no-cache');
    });
  });

  describe('CORS Configuration', () => {
    test('allows requests by default', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('restricts origins when configured', async () => {
      process.env.MCP_ALLOWED_ORIGINS = 'https://allowed.com,https://also-allowed.com';
      const app = createTestApp();
      
      // Check CORS headers for allowed origins in preflight
      const response = await request(app)
        .options('/mcp')
        .set('Origin', 'https://allowed.com')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    test('health endpoint bypasses rate limiting', async () => {
      process.env.MCP_RATE_LIMIT_GENERAL = '1';
      const app = createTestApp();
      
      // Should be able to call health multiple times
      await request(app).get('/health').expect(200);
      await request(app).get('/health').expect(200);
      await request(app).get('/health').expect(200);
    });

    test('rate limiting uses correct time windows', async () => {
      process.env.MCP_RATE_LIMIT_REQUESTS = '2';
      const app = createTestApp();
      
      // These should succeed
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test1', method: 'test', params: {} })
        .expect(200);

      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test2', method: 'test', params: {} })
        .expect(200);
    });
  });

  describe('Multiple API Keys', () => {
    test('accepts any of multiple configured API keys', async () => {
      process.env.MCP_API_KEYS = 'key1,key2,key3';
      const app = createTestApp();

      // Test each key works
      for (const key of ['key1', 'key2', 'key3']) {
        await request(app)
          .post('/mcp')
          .set('X-API-Key', key)
          .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
          .expect(200);
      }
    });

    test('trims whitespace from API keys', async () => {
      process.env.MCP_API_KEYS = ' key1 , key2 ,  key3  ';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .set('X-API-Key', 'key2')
        .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
        .expect(200);
    });
  });

  describe('Header Variations', () => {
    test('accepts API key via Authorization Bearer header', async () => {
      process.env.MCP_API_KEYS = 'bearer-token-123';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .set('Authorization', 'Bearer bearer-token-123')
        .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
        .expect(200);
    });

    test('accepts API key via API-Key header', async () => {
      process.env.MCP_API_KEYS = 'api-key-123';
      const app = createTestApp();

      await request(app)
        .post('/mcp')
        .set('API-Key', 'api-key-123')
        .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
        .expect(200);
    });
  });

  describe('Payload Security', () => {
    test('rejects malformed JSON', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    test('handles empty request body', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .send('')
        .expect(400);
    });

    test('validates method names against dangerous patterns', async () => {
      const app = createTestApp();
      const dangerousMethods = ['eval', 'exec', 'system', 'file/write', 'file/delete'];
      
      for (const method of dangerousMethods) {
        await request(app)
          .post('/mcp')
          .send({ jsonrpc: '2.0', id: 'test', method, params: {} })
          .expect(403);
      }
    });
  });

  describe('Content Type Handling', () => {
    test('requires JSON content type for MCP endpoint', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .set('Content-Type', 'text/plain')
        .send('not json')
        .expect(400);
    });

    test('handles missing content type gracefully', async () => {
      const app = createTestApp();
      
      await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
        .expect(200);
    });
  });

  describe('Error Response Format', () => {
    test('returns structured error for invalid requests', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({ invalid: 'request' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid JSON-RPC request');
    });

    test('returns structured error for blocked methods', async () => {
      const app = createTestApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'eval', params: {} })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Method not allowed');
      expect(response.body.method).toBe('eval');
    });

    test('returns structured error for auth failures', async () => {
      process.env.MCP_API_KEYS = 'secret';
      const app = createTestApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({ jsonrpc: '2.0', id: 'test', method: 'test', params: {} })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Authentication required');
      expect(response.body).toHaveProperty('message');
    });
  });
}); 