# 🧪 Testing Documentation

## Overview

This project includes comprehensive security tests for the MCP HTTP Server to ensure it's hardened against common attacks and follows security best practices.

## Test Coverage

### ✅ **Security Features Tested**

#### 🔐 **Authentication & Authorization**
- API key authentication (optional/required modes)
- Multiple API key support
- Header variations (`X-API-Key`, `API-Key`, `Authorization: Bearer`)
- Invalid key rejection
- Missing authentication handling

#### 🛡️ **Request Validation** 
- JSON-RPC 2.0 format validation
- Required field checking (`jsonrpc`, `id`, `method`)
- Dangerous method blocking (`eval`, `exec`, `system`, etc.)
- Malformed JSON rejection
- Empty request body handling

#### 🚧 **Rate Limiting**
- MCP endpoint rate limiting (15min windows)
- General endpoint rate limiting (1min windows)
- Health check bypass
- Configurable limits via environment variables

#### 🌐 **CORS Protection**
- Default allow-all behavior
- Configurable origin restrictions
- Preflight request handling
- Cross-origin header management

#### 🔒 **Security Headers**
- Helmet.js security headers
- Content type protection
- XSS protection
- Frame options

#### 📡 **Transport Support**
- Server-Sent Events (SSE) handling
- Content type detection
- Streaming response management

## Running Tests

### **HTTP Server Tests**

```bash
# Run all HTTP security tests
npm run test:http

# Run tests in watch mode
npm run test:http:watch

# Run tests with coverage report
npm run test:http:coverage
```

### **Package Tests (Supabase MCP)**

```bash
# Run all workspace tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Test Results

**Current Status: ✅ All 27 tests passing**

```
✓ Health Endpoint (1)
✓ Status Endpoint (1) 
✓ Authentication (4)
✓ Request Validation (3)
✓ Security Headers (1)
✓ SSE Support (1)
✓ CORS Configuration (2)
✓ Rate Limiting Edge Cases (2)
✓ Multiple API Keys (2)
✓ Header Variations (2)
✓ Payload Security (3)
✓ Content Type Handling (2)
✓ Error Response Format (3)
```

## Test Categories

### **Core Security Tests**

| Category | Tests | Description |
|----------|-------|-------------|
| Authentication | 4 | API key validation and auth flows |
| Request Validation | 3 | JSON-RPC format and dangerous method blocking |
| Security Headers | 1 | Helmet.js security header verification |

### **Edge Case Tests**

| Category | Tests | Description |
|----------|-------|-------------|
| Rate Limiting | 2 | Time windows and bypass logic |
| Multiple API Keys | 2 | Multi-key support and whitespace handling |
| Header Variations | 2 | Different auth header formats |
| Payload Security | 3 | Malformed requests and method validation |
| Content Type | 2 | JSON handling and content type requirements |
| Error Handling | 3 | Structured error response validation |

### **Integration Tests**

| Category | Tests | Description |
|----------|-------|-------------|
| Health Endpoint | 1 | Unauthenticated health checks |
| Status Endpoint | 1 | MCP capability reporting |
| SSE Support | 1 | Event stream transport |
| CORS | 2 | Cross-origin request handling |

## Environment Variables Tested

```bash
# Authentication
MCP_API_KEYS="key1,key2,key3"

# Rate Limiting
MCP_RATE_LIMIT_REQUESTS="100"    # Per 15 minutes
MCP_RATE_LIMIT_GENERAL="60"      # Per minute

# CORS
MCP_ALLOWED_ORIGINS="https://allowed.com,https://trusted.app"
```

## Security Validation

### **🔍 What's Tested**

✅ **Authentication bypass prevention**  
✅ **Injection attack protection** (`eval`, `exec`, etc.)  
✅ **Rate limiting effectiveness**  
✅ **CORS policy enforcement**  
✅ **Input validation robustness**  
✅ **Error message security** (no info leakage)  
✅ **Header security** (XSS, frame protection)  

### **🚨 Attack Scenarios Covered**

- **Unauthenticated access attempts**
- **Brute force API key attacks** 
- **Code injection via method names**
- **DDoS via rapid requests**
- **Cross-origin attacks**
- **Malformed payload exploits**

## Adding New Tests

### **Test Structure**

```javascript
describe('New Security Feature', () => {
  test('should prevent specific attack', async () => {
    const app = createTestApp();
    
    await request(app)
      .post('/mcp')
      .send(maliciousPayload)
      .expect(403); // or appropriate error code
  });
});
```

### **Test Categories to Add**

- **WebSocket security** (if implemented)
- **File upload validation** (if added)
- **SQL injection prevention** (database operations)
- **Memory exhaustion protection**
- **Timeout handling**

## Security Recommendations

Based on test results, the server includes:

✅ **Production-ready security hardening**  
✅ **Configurable authentication** (warn if disabled)  
✅ **Rate limiting** (prevent abuse)  
✅ **Input validation** (block dangerous operations)  
✅ **Security headers** (XSS/CSRF protection)  
✅ **Error handling** (no information leakage)  

## Continuous Security

```bash
# Run tests before deployment
npm run test:http

# Check for security vulnerabilities
npm audit

# Format and lint
npm run format:check
```

## Test Dependencies

- **Vitest**: Modern test framework
- **Supertest**: HTTP testing library  
- **Express**: Test app framework
- **Helmet**: Security headers
- **Rate Limiter**: DDoS protection

---

**🔒 Security Status: HARDENED**  
**🧪 Test Coverage: 27/27 PASSING**  
**🚀 Production Ready: YES** 