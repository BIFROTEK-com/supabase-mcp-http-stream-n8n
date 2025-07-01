#!/usr/bin/env node

/**
 * Supabase MCP - Quickstart Tool
 * 
 * This script automatically starts the MCP server and creates an ngrok tunnel
 * for easy integration with N8n.
 */

const { spawn } = require('child_process');
const http = require('http');
const https = require('https');
const readline = require('readline');
const { clearLine, cursorTo } = require('readline');

// ASCII colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  blue: '\x1b[34m'
};

// Configuration
const PORT = process.env.MCP_PORT || 3333;
let SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
let SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const API_KEY = process.env.MCP_API_KEYS || 'sk-mcp-' + Math.random().toString(36).substring(2, 15);

// Extract first API key for display (in case there are multiple comma-separated keys)
const DISPLAY_API_KEY = API_KEY.split(',')[0].trim();

// Create interface for command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`${colors.cyan}${colors.bold}
╔═══════════════════════════════════════════════════╗
║        Supabase MCP - Quickstart with ngrok       ║
╚═══════════════════════════════════════════════════╝${colors.reset}
`);

let mcpServer = null;
let ngrokProcess = null;
let tunnelUrl = null;
let healthCheckInterval = null;

// Check if credentials are available
async function checkCredentials() {
  if (!SUPABASE_ACCESS_TOKEN) {
    SUPABASE_ACCESS_TOKEN = await new Promise(resolve => {
      rl.question(`${colors.yellow}Please enter your Supabase Access Token: ${colors.reset}`, answer => {
        resolve(answer.trim());
      });
    });
  }

  if (!SUPABASE_PROJECT_REF) {
    SUPABASE_PROJECT_REF = await new Promise(resolve => {
      rl.question(`${colors.yellow}Please enter your Supabase Project ID: ${colors.reset}`, answer => {
        resolve(answer.trim());
      });
    });
  }

  console.log(`${colors.green}\n✅ Supabase credentials configured${colors.reset}`);
}

// Start MCP Server
function startMCPServer() {
  console.log(`${colors.blue}🔄 Starting MCP server on port ${PORT}...${colors.reset}`);

  const env = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: SUPABASE_ACCESS_TOKEN,
    SUPABASE_PROJECT_REF: SUPABASE_PROJECT_REF,
    MCP_PORT: PORT,
    MCP_READ_ONLY: 'true',
    NODE_ENV: 'development',
    NODE_OPTIONS: '--experimental-global-webcrypto',
    EXPRESS_TRUST_PROXY: '1',
    MCP_API_KEYS: API_KEY
  };

  mcpServer = spawn('node', ['mcp-http-server.js'], {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: env
  });

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Test if server is running
      http.get(`http://localhost:${PORT}/health`, (res) => {
        if (res.statusCode === 200) {
          console.log(`${colors.green}✅ MCP server running on port ${PORT}${colors.reset}`);
          resolve();
        } else {
          reject(new Error(`Server error: Status ${res.statusCode}`));
        }
      }).on('error', (err) => {
        reject(new Error(`Could not start server: ${err.message}`));
      });
    }, 3000);
  });
}

// Start ngrok tunnel
function startNgrok() {
  console.log(`${colors.blue}🔄 Starting ngrok tunnel...${colors.reset}`);

  ngrokProcess = spawn('ngrok', ['http', PORT], {
    stdio: ['ignore', 'pipe', 'inherit']
  });

  return new Promise((resolve, reject) => {
    let urlFound = false;
    
    // Try to get URL from ngrok stdout
    ngrokProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${colors.blue}   ngrok output: ${output.trim()}${colors.reset}`);
      
      if (output.includes('Forwarding') && output.includes('https://')) {
        const match = output.match(/Forwarding\s+(https:\/\/[^\s]+)/);
        if (match && match[1] && !urlFound) {
          urlFound = true;
          tunnelUrl = match[1];
          console.log(`${colors.green}✅ ngrok tunnel started: ${tunnelUrl}${colors.reset}`);
          resolve(tunnelUrl);
        }
      }
    });

    // Give ngrok more time to start, then try API methods
    setTimeout(() => {
      if (!urlFound) {
        console.log(`${colors.yellow}⚠️ Trying to get ngrok URL via API...${colors.reset}`);
        attemptUrlRetrieval().then(url => {
          if (url && !urlFound) {
            urlFound = true;
            tunnelUrl = url;
            console.log(`${colors.green}✅ ngrok tunnel found: ${tunnelUrl}${colors.reset}`);
            resolve(url);
          } else if (!urlFound) {
            // Last resort: ask user
            console.log(`${colors.yellow}⚠️ Please open http://localhost:4040 and copy the URL${colors.reset}`);
            promptForUrl().then(url => {
              tunnelUrl = url;
              resolve(url);
            });
          }
        }).catch(() => {
          if (!urlFound) {
            console.log(`${colors.yellow}⚠️ Please open http://localhost:4040 and copy the URL${colors.reset}`);
            promptForUrl().then(url => {
              tunnelUrl = url;
              resolve(url);
            });
          }
        });
      }
    }, 15000); // Wait longer (15 seconds)
  });
}

// Multiple attempts to get URL automatically
async function attemptUrlRetrieval() {
  // Attempt 1: Normal API
  try {
    const url = await getNgrokUrlFromAPI();
    if (url) return url;
  } catch (error) {
    console.log(`${colors.yellow}   First attempt failed${colors.reset}`);
  }
  
  // Wait 2 seconds and try again
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Attempt 2: API again
  try {
    console.log(`${colors.yellow}   Second attempt...${colors.reset}`);
    const url = await getNgrokUrlFromAPI();
    if (url) return url;
  } catch (error) {
    console.log(`${colors.yellow}   Second attempt failed${colors.reset}`);
  }
  
  // Wait again and try alternative
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    console.log(`${colors.yellow}   Third attempt with alternative method...${colors.reset}`);
    const url = await tryAlternativeMethod();
    if (url) return url;
  } catch (error) {
    console.log(`${colors.yellow}   All automatic attempts failed${colors.reset}`);
  }
  
  return null;
}

// Get ngrok URL from local API
function getNgrokUrlFromAPI() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.yellow}   Trying ngrok API on localhost:4040...${colors.reset}`);
    
    const req = http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          console.log(`${colors.yellow}   Found tunnels: ${tunnels.tunnels.length}${colors.reset}`);
          
          if (tunnels.tunnels && tunnels.tunnels.length > 0) {
            // Look for HTTPS tunnel
            const httpsTunnel = tunnels.tunnels.find(t => 
              t.public_url && t.public_url.startsWith('https://') && 
              t.config && t.config.addr && t.config.addr.includes('3333')
            );
            
            if (httpsTunnel) {
              console.log(`${colors.green}   ✅ HTTPS tunnel found: ${httpsTunnel.public_url}${colors.reset}`);
              resolve(httpsTunnel.public_url);
              return;
            }
            
            // Fallback: Take first HTTPS tunnel
            const anyHttpsTunnel = tunnels.tunnels.find(t => 
              t.public_url && t.public_url.startsWith('https://')
            );
            
            if (anyHttpsTunnel) {
              console.log(`${colors.green}   ✅ General HTTPS tunnel found: ${anyHttpsTunnel.public_url}${colors.reset}`);
              resolve(anyHttpsTunnel.public_url);
              return;
            }
          }
          
          console.log(`${colors.yellow}   ⚠️ No HTTPS tunnel found${colors.reset}`);
          resolve(null);
        } catch (error) {
          console.log(`${colors.red}   ❌ Error parsing API response: ${error.message}${colors.reset}`);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`${colors.red}   ❌ Error accessing ngrok API: ${error.message}${colors.reset}`);
      // Try alternative method
      tryAlternativeMethod().then(resolve).catch(reject);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`${colors.yellow}   ⚠️ Timeout accessing ngrok API${colors.reset}`);
      tryAlternativeMethod().then(resolve).catch(reject);
    });
  });
}

// Alternative method: Try ngrok status via CLI
function tryAlternativeMethod() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.yellow}   Trying ngrok CLI status...${colors.reset}`);
    
    const { spawn } = require('child_process');
    const ngrokStatus = spawn('curl', ['-s', 'http://localhost:4040/api/tunnels'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });
    
    let output = '';
    ngrokStatus.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ngrokStatus.on('close', (code) => {
      try {
        if (output) {
          const tunnels = JSON.parse(output);
          if (tunnels.tunnels && tunnels.tunnels.length > 0) {
            const httpsTunnel = tunnels.tunnels.find(t => 
              t.public_url && t.public_url.startsWith('https://')
            );
            
            if (httpsTunnel) {
              console.log(`${colors.green}   ✅ URL found via curl: ${httpsTunnel.public_url}${colors.reset}`);
              resolve(httpsTunnel.public_url);
              return;
            }
          }
        }
        
        console.log(`${colors.yellow}   ⚠️ No URL found via alternative methods${colors.reset}`);
        resolve(null);
      } catch (error) {
        console.log(`${colors.red}   ❌ Error with alternative method: ${error.message}${colors.reset}`);
        resolve(null);
      }
    });
    
    setTimeout(() => {
      ngrokStatus.kill();
      resolve(null);
    }, 3000);
  });
}

// Prompt user for URL
function promptForUrl() {
  return new Promise(resolve => {
    rl.question(`${colors.yellow}Please enter the ngrok URL (from http://localhost:4040): ${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Start health checks
function startHealthChecks(url) {
  console.log(`${colors.yellow}\nStarting health checks (every 15 seconds)...${colors.reset}`);
  
  // Initial check
  checkHealth(url);
  
  // Periodic checks
  healthCheckInterval = setInterval(() => {
    checkHealth(url);
  }, 15000);
}

function checkHealth(baseUrl) {
  const healthUrl = `${baseUrl}/health`;
  const client = healthUrl.startsWith('https') ? https : http;
  
  const req = client.get(healthUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        displayStatus(true, result, baseUrl);
      } catch (error) {
        displayStatus(false, { error: 'Failed to parse response' }, baseUrl);
      }
    });
  });
  
  req.on('error', (error) => {
    displayStatus(false, { error: error.message }, baseUrl);
  });
  
  req.end();
}

function displayStatus(isHealthy, result, baseUrl) {
  const timestamp = new Date().toLocaleTimeString();
  
  // Clear previous status line if not first check
  if (displayStatus.hasShown) {
    process.stdout.write('\r');
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
  }
  
  if (isHealthy) {
    process.stdout.write(`${colors.green}✓ Server healthy at ${timestamp} - ${JSON.stringify(result)}${colors.reset}`);
    
    // Show instructions only once
    if (!displayStatus.instructionsShown) {
      showConnectionInstructions(baseUrl);
      displayStatus.instructionsShown = true;
    }
  } else {
    process.stdout.write(`${colors.red}✗ Connection failed at ${timestamp} - ${result.error}${colors.reset}`);
  }
  
  displayStatus.hasShown = true;
}

// Initialize flags
displayStatus.instructionsShown = false;
displayStatus.hasShown = false;

function showConnectionInstructions(baseUrl) {
  console.log(`\n\n${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════╗
║              Connection Information               ║
╚═══════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.green}✓ Server available at:${colors.reset} ${baseUrl}`);
  console.log(`${colors.green}✓ Health endpoint:${colors.reset} ${baseUrl}/health`);
  console.log(`${colors.green}✓ SSE endpoint:${colors.reset} ${baseUrl}/sse`);
  console.log(`${colors.green}✓ MCP endpoint:${colors.reset} ${baseUrl}/mcp`);
  console.log(`${colors.green}✓ Generated API Key:${colors.reset} ${colors.bold}${DISPLAY_API_KEY}${colors.reset}\n`);

  console.log(`${colors.cyan}${colors.bold}╔═══════════════════════════════════════════════════╗
║         Connect your N8n to Supabase MCP         ║
║              Follow these steps:                  ║
╚═══════════════════════════════════════════════════╝${colors.reset}
`);

  console.log(`${colors.yellow}1. Create a new workflow in N8n${colors.reset}
   - Add a "When chat message received" trigger node

${colors.yellow}2. Add an OpenAI Chat Model node${colors.reset}
   - Configure with your OpenAI API key
   - Select a model (e.g., gpt-4-turbo)

${colors.yellow}3. Add an MCP Client node${colors.reset}
   - SSE Endpoint: ${colors.green}${baseUrl}/sse${colors.reset}
   - Authentication: Choose one of these options:
     ${colors.green}• X-API-Key: ${DISPLAY_API_KEY}${colors.reset}
     ${colors.green}• Authorization: Bearer ${DISPLAY_API_KEY}${colors.reset}

${colors.yellow}4. Add an AI Agent node${colors.reset}
   - Connect "When chat message received" → AI Agent
   - Connect MCP Client → AI Agent (ai_tool input)
   - Connect OpenAI Chat Model → AI Agent (ai_languageModel input)
   - Add this system message:${colors.reset}

${colors.cyan}"You are the Supabase database expert.
You handle all database requests via chat. You can also formulate SQL queries to meet specific requirements.

Supabase MCP Tools:
mcp_supabase-mcp_list_organizations - List organizations
mcp_supabase-mcp_get_organization - Organization details
mcp_supabase-mcp_list_projects - List projects
mcp_supabase-mcp_get_project - Project details
mcp_supabase-mcp_execute_sql - Execute SQL
mcp_supabase-mcp_list_tables - List database tables
mcp_supabase-mcp_search_docs - Search Supabase documentation"${colors.reset}

${colors.yellow}5. Test your integration${colors.reset}
   - Activate the workflow and test with a message like:
     "Show me my Supabase projects"

${colors.yellow}Test commands:${colors.reset}
# Using X-API-Key header:
curl -N -H "Accept: text/event-stream" -H "X-API-Key: ${DISPLAY_API_KEY}" ${baseUrl}/sse

# Using Authorization Bearer:
curl -N -H "Accept: text/event-stream" -H "Authorization: Bearer ${DISPLAY_API_KEY}" ${baseUrl}/sse

${colors.green}✨ The server will keep running until you stop this script with Ctrl+C.${colors.reset}
`);
}

// Cleanup function
function cleanup() {
  console.log(`\n${colors.yellow}🛑 Stopping server and tunnel...${colors.reset}`);
  
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  if (mcpServer && !mcpServer.killed) {
    mcpServer.kill();
  }
  
  if (ngrokProcess && !ngrokProcess.killed) {
    ngrokProcess.kill();
  }
  
  rl.close();
  process.exit(0);
}

// Main function
async function main() {
  try {
    await checkCredentials();
    await startMCPServer();
    const url = await startNgrok();
    startHealthChecks(url);
    
    // Cleanup on exit
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    console.error(`${colors.red}\n❌ Error: ${error.message}${colors.reset}`);
    cleanup();
  }
}

// Start the script
main(); 