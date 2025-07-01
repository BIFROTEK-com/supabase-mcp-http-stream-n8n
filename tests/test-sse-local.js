#!/usr/bin/env node

// ✅ Lokaler Test für SSE-Funktionalität vor Coolify-Deployment

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

// Start the server
const server = spawn('node', ['../mcp-http-server.js'], {
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
          'Cache-Control': 'no-cache'
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
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('✅ Tools List Result:', JSON.stringify(result, null, 2));
        
        // Test completed successfully
        setTimeout(() => {
          console.log('\n🎉 All tests completed! SSE is working locally.');
          console.log('💡 You can now deploy to Coolify with confidence.');
          console.log('\n📋 Next steps:');
          console.log('   1. Copy docker/docker-compose-coolify-sse.yaml to your Coolify project');
          console.log('   2. Copy docker/Dockerfile.sse to your Coolify project');
          console.log('   3. Update your Coolify service configuration');
          console.log('   4. Restart the service in Coolify');
          console.log('   5. Test: https://sb-mcp.bifrotek.com/sse');
          
          process.exit(0);
        }, 2000);
      } catch (error) {
        console.error('❌ Failed to parse tools list response:', error);
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