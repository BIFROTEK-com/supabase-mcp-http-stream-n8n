#!/usr/bin/env node

// ✅ Lokaler Test für SSE-Funktionalität

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🧪 Starting local SSE test...');

// Test environment variables
process.env.SUPABASE_ACCESS_TOKEN = 'sbp_dba9b2d1f5bea58f7d4fb37cba7e7b1dc02b16b0';
process.env.SUPABASE_PROJECT_REF = 'cdnhtsayaekckxaatshj';
process.env.MCP_PORT = '3334'; // Different port for local testing
process.env.MCP_READ_ONLY = 'true';
process.env.NODE_ENV = 'development';
process.env.NODE_OPTIONS = '--experimental-global-webcrypto'; // Für SSE benötigt
process.env.EXPRESS_TRUST_PROXY = '1'; // Für SSE empfohlen
process.env.MCP_API_KEYS = 'test-api-key'; // API-Schlüssel für Tests

// Start the server
const server = spawn('node', ['mcp-http-server.js'], {
  stdio: 'inherit',
  env: process.env
});

// Wait for server to start
setTimeout(() => {
  console.log('\n🌊 Testing SSE endpoints...\n');
  
  // Test 1: Health check
  console.log('1️⃣ Testing health endpoint...');
  const healthReq = http.request('http://localhost:3334/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('✅ Health:', JSON.parse(data));
      
      // Test 2: SSE Connection
      console.log('\n2️⃣ Testing SSE connection...');
      const sseReq = http.request({
        hostname: 'localhost',
        port: 3334,
        path: '/sse',
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': 'Bearer test-api-key'
        }
      }, (res) => {
        console.log('✅ SSE Status:', res.statusCode);
        console.log('✅ SSE Headers:', res.headers);
        
        let eventCount = 0;
        res.on('data', (chunk) => {
          eventCount++;
          console.log(`📡 SSE Event ${eventCount}:`, chunk.toString());
          
          // After receiving connection event, test a tool call
          if (eventCount === 1) {
            setTimeout(() => {
              console.log('\n3️⃣ Testing tools/list via SSE...');
              testToolsList();
            }, 1000);
          }
        });
        
        // Close SSE after 5 seconds
        setTimeout(() => {
          console.log('\n🏁 Closing SSE connection...');
          sseReq.destroy();
        }, 5000);
      });
      
      sseReq.end();
    });
  });
  healthReq.end();
  
}, 3000);

function testToolsList() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  });
  
  const options = {
    hostname: 'localhost',
    port: 3334,
    path: '/sse',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': 'Bearer test-api-key'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Tools List Result:', JSON.stringify(result, null, 2));
        
        // Test 4: Streamable HTTP
        console.log('\n4️⃣ Testing Streamable HTTP...');
        testStreamableHTTP();
      } catch (error) {
        console.error('❌ Failed to parse tools list response:', error);
        process.exit(1);
      }
    });
  });
  
  req.write(postData);
  req.end();
}

function testStreamableHTTP() {
  const postData = JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list"
  });
  
  const options = {
    hostname: 'localhost',
    port: 3334,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'MCP-Session-ID': 'test-session-123',
      'Authorization': 'Bearer test-api-key'
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Streamable HTTP Result:', JSON.stringify(result, null, 2));
        console.log('✅ Session ID Header:', res.headers['mcp-session-id']);
        
        // Test completed successfully
        setTimeout(() => {
          console.log('\n🎉 All tests completed! SSE and Streamable HTTP are working locally.');
          console.log('\n📋 Next steps:');
          console.log('   1. Use docker/docker-compose.yaml for standard deployment');
          console.log('   2. Use docker/docker-compose.coolify.yaml for Coolify deployment');
          console.log('   3. Test: wget -qO- --header="Accept: text/event-stream" --header="Cache-Control: no-cache" https://your-domain.com/sse');
          console.log('   4. Test: curl -X POST -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\' https://your-domain.com/mcp');
          
          process.exit(0);
        }, 2000);
      } catch (error) {
        console.error('❌ Failed to parse Streamable HTTP response:', error);
        process.exit(1);
      }
    });
  });
  
  req.write(postData);
  req.end();
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test server...');
  server.kill();
  process.exit(0);
});

process.on('exit', () => {
  if (server && !server.killed) {
    server.kill();
  }
}); 