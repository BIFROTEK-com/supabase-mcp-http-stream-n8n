# 🐳 **Standalone Dockerized Supabase MCP Server**
## **Multi-Transport Support | Production Ready | Self-Hostable**

> **Host your own Supabase MCP server** with HTTP, SSE, and STDIO support for maximum compatibility with AI assistants, automation tools, and development environments.

![supabase-mcp-demo](https://github.com/user-attachments/assets/3fce101a-b7d4-482f-9182-0be70ed1ad56)

## 🚀 **What This Provides**

This is a **standalone, self-hostable Docker container** that wraps the official Supabase MCP Server and exposes it through **multiple transport protocols**:

### **🔄 Multi-Transport Architecture**
- **📡 HTTP/REST API** - For web applications and services
- **🌊 Server-Sent Events (SSE)** - For real-time streaming (n8n, webhooks)
- **🔌 STDIO** - For desktop AI assistants (Cursor, Claude Desktop, Windsurf)
- **⚡ Streamable HTTP** - Latest MCP 2025 standard (Pipecat Cloud)

### **🏗️ Deployment Benefits**
- **🐳 One Docker container** - Deploy anywhere (Coolify, Railway, AWS, DigitalOcean)
- **🔐 Built-in security** - API keys, rate limiting, CORS protection
- **📊 Health monitoring** - Health checks and status endpoints
- **⚙️ Environment-based config** - Easy customization via env vars
- **🧪 Thoroughly tested** - 27 security tests ensure production readiness

### **🎯 Use Cases**
- **Self-hosted AI infrastructure** for companies wanting data control
- **Multi-client MCP access** - One server, multiple interfaces
- **Production workflows** with n8n, Pipecat, or custom applications
- **Development environments** with desktop AI assistants

---

The [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) standardizes how Large Language Models (LLMs) talk to external services like Supabase. This Docker container hosts that connection, allowing AI assistants to manage tables, fetch config, and query data. See the [full list of tools](#tools).

> **🤖 AI-Generated Code Notice:** This project was programmed with Claude 4.0 Sonnet and includes comprehensive security testing. While extensively tested, AI-generated code may contain errors or oversights. Please review thoroughly before production use.

## ⚠️ **Disclaimer**

This is AI-generated software. While we've implemented extensive security testing and best practices:

- **Review the code** before deploying to production
- **Test thoroughly** in your environment  
- **Use API keys** in production (see Security section)
- **Monitor logs** for unusual activity
- **Keep dependencies updated**

Use at your own risk. No warranty is provided.

## 🚀 **Deploy Your Standalone MCP Server**

### **1️⃣ Quick Docker Start**

Deploy the complete multi-transport MCP server in minutes:

```bash
git clone https://github.com/Silverstar187/supabase-mcp-docker.git
cd supabase-mcp-docker
```

### **2️⃣ Set up environment variables:**
```bash
cp env.example .env
# Edit .env with your Supabase credentials and security settings
```

**Minimum required configuration:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
SUPABASE_PROJECT_REF=your_project_ref_here
```

**For production, enable security (recommended):**
```bash
MCP_API_KEYS="your-secret-key-1,your-secret-key-2"
MCP_ALLOWED_ORIGINS="https://yourdomain.com"
MCP_RATE_LIMIT_REQUESTS=50
```

### **3️⃣ Launch Multi-Transport Server:**
```bash
docker-compose up --build
```

**✅ Your standalone server now provides:**
- **📡 HTTP API:** `http://localhost:3333/mcp`
- **🌊 SSE Stream:** `http://localhost:3333/sse`
- **📊 Health Check:** `http://localhost:3333/health`
- **🔌 STDIO:** Direct connection for AI assistants

### **4️⃣ Test All Interfaces:**

```bash
# Test HTTP/JSON-RPC API
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-1" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Test SSE Stream (great for n8n, automation)
curl -H "X-API-Key: your-secret-key-1" http://localhost:3333/sse

# Test Health (no auth required)
curl http://localhost:3333/health
```

### Environment Variables

**Required configuration:**

- `SUPABASE_ACCESS_TOKEN` - Your Supabase Personal Access Token ([Get it here](https://supabase.com/dashboard/account/tokens))
- `SUPABASE_PROJECT_REF` - Your Supabase Project ID (found in Project Settings → General)

**Optional configuration:**

- `MCP_FEATURES` - Comma-separated feature groups (default: `database,docs,development,functions`)
- `MCP_READ_ONLY` - Enable read-only mode (default: `true`)
- `MCP_PORT` - HTTP server port (default: `3000`)
- `NODE_ENV` - Node environment (default: `production`)

**Security configuration (Highly Recommended for Production):**

- `MCP_API_KEYS` - Comma-separated API keys for authentication (e.g., `"key1,key2,key3"`)
- `MCP_RATE_LIMIT_REQUESTS` - Max requests per 15 minutes for `/mcp` endpoint (default: `100`)
- `MCP_RATE_LIMIT_GENERAL` - Max requests per minute for all endpoints (default: `60`)
- `MCP_ALLOWED_ORIGINS` - Comma-separated allowed CORS origins (default: `"*"`, set to specific domains for security)

## Deployment Examples

### Deploy to Coolify

**Step 1: Create Application in Coolify**
1. Login to your Coolify dashboard
2. Go to "Projects" → "New" → "Public Repository"
3. Enter repository URL: `https://github.com/Silverstar187/supabase-mcp-docker.git`
4. Select branch: `main`
5. Choose "Dockerfile" as build pack

**Step 2: Configure Environment Variables**
In Coolify dashboard, add these environment variables:

**Required:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_1234567890abcdef... # Your Personal Access Token
SUPABASE_PROJECT_REF=abcdefghijklmnop        # Your Project Reference
```

**Optional (with defaults):**
```bash
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=true
MCP_PORT=3000
NODE_ENV=production
```

**Security (Highly Recommended):**
```bash
# Generate strong API keys for authentication
MCP_API_KEYS="$(openssl rand -hex 32),$(openssl rand -hex 32)"

# Rate limiting (conservative production values)
MCP_RATE_LIMIT_REQUESTS=50
MCP_RATE_LIMIT_GENERAL=30

# CORS (restrict to your domains)
MCP_ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
```

**Step 3: Deploy Settings**
- **Build Command:** `npm run build`
- **Start Command:** `node packages/mcp-server-supabase/dist/transports/stdio.js --project-ref=$SUPABASE_PROJECT_REF --read-only --features=$MCP_FEATURES`
- **Port:** `3000` (for health checks)
- **Deploy:** Click "Deploy" button

**Step 4: Get Server URL**
After deployment, note your server URL: `https://your-app.coolify.domain.com`

### Integration with n8n

**Option 1: Native MCP Client (Recommended)**

Install n8n MCP node:
```bash
npm install n8n-nodes-mcp
```

Configure MCP Client node:
```json
{
  "nodes": [
    {
      "parameters": {
        "endpoint": "https://sb-mcp.bifrotek.com/mcp",
        "protocol": "sse",
        "method": "tools/call",
        "tool": "execute_sql",
        "arguments": {
          "sql": "SELECT * FROM todos ORDER BY created_at DESC LIMIT 5;"
        }
      },
      "type": "n8n-nodes-mcp.mcpClient",
      "position": [380, 240],
      "name": "Supabase MCP Client"
    }
  ]
}
```

**Option 2: HTTP Request Node (Alternative)**
```json
{
  "parameters": {
    "url": "https://sb-mcp.bifrotek.com/mcp",
    "method": "POST",
    "options": {
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
          "name": "execute_sql",
          "arguments": {
            "sql": "SELECT COUNT(*) FROM todos;"
          }
        }
      }
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Supabase HTTP Request"
}
```

**Example Workflow: Sync Data**
```json
{
  "name": "Supabase Data Sync",
  "nodes": [
    {
      "parameters": {},
      "type": "n8n-nodes-base.start",
      "position": [240, 300],
      "name": "Start"
    },
    {
      "parameters": {
        "command": "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tables\"}}' | docker run --rm -i -e SUPABASE_ACCESS_TOKEN='{{ $env.SUPABASE_TOKEN }}' your-mcp-image node packages/mcp-server-supabase/dist/transports/stdio.js --project-ref={{ $env.PROJECT_REF }} --read-only"
      },
      "type": "n8n-nodes-base.executeCommand",
      "position": [380, 300],
      "name": "Get Tables"
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "Get Tables",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Integration with Pipecat

### Pipecat Cloud Integration

For Pipecat voicebots, use **STDIO subprocess integration** (not HTTP):

#### Option 1: Direct STDIO Integration

```python
import subprocess
import json
import asyncio
from pipecat.pipeline.pipeline import Pipeline
from pipecat.services.elevenlabs import ElevenLabsTTSService
from pipecat.services.openai import OpenAILLMService

class SupabaseMCPService:
    def __init__(self, project_ref: str, access_token: str):
        self.project_ref = project_ref
        self.access_token = access_token
        self.process = None
        
    async def start(self):
        """Start the MCP server process"""
        self.process = subprocess.Popen([
            'node', 
            'packages/mcp-server-supabase/dist/transports/stdio.js',
            f'--project-ref={self.project_ref}',
            '--read-only',
            '--features=database,docs,development,functions'
        ], 
        stdin=subprocess.PIPE, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        env={'SUPABASE_ACCESS_TOKEN': self.access_token}
        )
        
    async def call_tool(self, tool_name: str, arguments: dict = None) -> dict:
        """Call a Supabase MCP tool"""
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }
        
        # Send request via STDIO
        request_json = json.dumps(request) + '\n'
        self.process.stdin.write(request_json.encode())
        self.process.stdin.flush()
        
        # Read response via STDIO
        response_line = self.process.stdout.readline()
        return json.loads(response_line.decode())
    
    async def stop(self):
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            self.process.wait()

# Usage in Pipecat Pipeline
async def main():
    # Initialize services
    llm = OpenAILLMService(api_key="your-openai-key")
    tts = ElevenLabsTTSService(api_key="your-elevenlabs-key")
    supabase_mcp = SupabaseMCPService(
        project_ref="your_project_ref",
        access_token="your_supabase_token"
    )
    
    # Start MCP server subprocess
    await supabase_mcp.start()
    
    # Use in pipeline...
    try:
        result = await supabase_mcp.call_tool("execute_sql", {
            "sql": "SELECT COUNT(*) FROM todos;"
        })
        print("SQL Result:", result)
    finally:
        await supabase_mcp.stop()

#### Option 2: Use Pipecat's MCP Extension

Install Pipecat with MCP support:
```bash
pip install "pipecat-ai[mcp]"
```

Then use built-in MCP integration:
```python
from pipecat.services.mcp import MCPService

# Pipecat handles the subprocess management
mcp_service = MCPService(
    command="node",
    args=[
        "packages/mcp-server-supabase/dist/transports/stdio.js",
        "--project-ref=your_project_ref",
        "--read-only"
    ],
    env={"SUPABASE_ACCESS_TOKEN": "your_token"}
)
```

#### Option 3: HTTP Fallback (if STDIO not available)

For cloud deployments where subprocess isn't available:

```python
import requests

# Health check
response = requests.get("https://sb-mcp.bifrotek.com/health")
print(response.json())

# Execute SQL
response = requests.post("https://sb-mcp.bifrotek.com/sql", json={
    "sql": "SELECT count(*) FROM todos;"
})
print(response.json())

# List available tools
response = requests.get("https://sb-mcp.bifrotek.com/tools")
print(response.json())
```

## Prerequisites

You will need Node.js installed on your machine. You can check this by running:

```shell
node -v
```

If you don't have Node.js installed, you can download it from [nodejs.org](https://nodejs.org/).

## Setup

### 1. Personal access token (PAT)

First, go to your [Supabase settings](https://supabase.com/dashboard/account/tokens) and create a personal access token. Give it a name that describes its purpose, like "Cursor MCP Server".

This will be used to authenticate the MCP server with your Supabase account. Make sure to copy the token, as you won't be able to see it again.

### 2. Configure MCP client

Next, configure your MCP client (such as Cursor) to use this server. Most MCP clients store the configuration as JSON in the following format:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<personal-access-token>"
      }
    }
  }
}
```

Replace `<personal-access-token>` with the token you created in step 1. Alternatively you can omit `SUPABASE_ACCESS_TOKEN` in this config and instead set it globally on your machine. This allows you to keep your token out of version control if you plan on committing this configuration to a repository.

The following options are available:

- `--read-only`: Used to restrict the server to read-only queries. Recommended by default. See [read-only mode](#read-only-mode).
- `--project-ref`: Used to scope the server to a specific project. Recommended by default. If you omit this, the server will have access to all projects in your Supabase account. See [project scoped mode](#project-scoped-mode).
- `--features`: Used to specify which tool groups to enable. See [feature groups](#feature-groups).

If you are on Windows, you will need to [prefix the command](#windows). If your MCP client doesn't accept JSON, the direct CLI command is:

```shell
npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=<project-ref>
```

> Note: Do not run this command directly - this is meant to be executed by your MCP client in order to start the server. `npx` automatically downloads the latest version of the MCP server from `npm` and runs it in a single command.

#### Windows

On Windows, you will need to prefix the command with `cmd /c`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<personal-access-token>"
      }
    }
  }
}
```

or with `wsl` if you are running Node.js inside WSL:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "wsl",
      "args": [
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--read-only",
        "--project-ref=<project-ref>"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<personal-access-token>"
      }
    }
  }
}
```

Make sure Node.js is available in your system `PATH` environment variable. If you are running Node.js natively on Windows, you can set this by running the following commands in your terminal.

1. Get the path to `npm`:

   ```shell
   npm config get prefix
   ```

2. Add the directory to your PATH:

   ```shell
   setx PATH "%PATH%;<path-to-dir>"
   ```

3. Restart your MCP client.

### Project scoped mode

Without project scoping, the MCP server will have access to all organizations and projects in your Supabase account. We recommend you restrict the server to a specific project by setting the `--project-ref` flag on the CLI command:

```shell
npx -y @supabase/mcp-server-supabase@latest --project-ref=<project-ref>
```

Replace `<project-ref>` with the ID of your project. You can find this under **Project ID** in your Supabase [project settings](https://supabase.com/dashboard/project/_/settings/general).

After scoping the server to a project, [account-level](#project-management) tools like `list_projects` and `list_organizations` will no longer be available. The server will only have access to the specified project and its resources.

### Read-only mode

To restrict the Supabase MCP server to read-only queries, set the `--read-only` flag on the CLI command:

```shell
npx -y @supabase/mcp-server-supabase@latest --read-only
```

We recommend you enable this by default. This prevents write operations on any of your databases by executing SQL as a read-only Postgres user. Note that this flag only applies to database tools (`execute_sql` and `apply_migration`) and not to other tools like `create_project` or `create_branch`.

### Feature groups

You can enable or disable specific tool groups by passing the `--features` flag to the MCP server. This allows you to customize which tools are available to the LLM. For example, to enable only the [database](#database) and [docs](#knowledge-base) tools, you would run:

```shell
npx -y @supabase/mcp-server-supabase@latest --features=database,docs
```

Available groups are: [`account`](#account), [`docs`](#knowledge-base), [`database`](#database), [`debug`](#debug), [`development`](#development), [`functions`](#edge-functions), [`storage`](#storage), and [`branching`](#branching-experimental-requires-a-paid-plan).

If this flag is not passed, the default feature groups are: `account`, `database`, `debug`, `development`, `docs`, `functions`, and `branching`.

## Tools

_**Note:** This server is pre-1.0, so expect some breaking changes between versions. Since LLMs will automatically adapt to the tools available, this shouldn't affect most users._

The following Supabase tools are available to the LLM, [grouped by feature](#feature-groups).

#### Account

Enabled by default when no `--project-ref` is passed. Use `account` to target this group of tools with the [`--features`](#feature-groups) option.

_**Note:** these tools will be unavailable if the server is [scoped to a project](#project-scoped-mode)._

- `list_projects`: Lists all Supabase projects for the user.
- `get_project`: Gets details for a project.
- `create_project`: Creates a new Supabase project.
- `pause_project`: Pauses a project.
- `restore_project`: Restores a project.
- `list_organizations`: Lists all organizations that the user is a member of.
- `get_organization`: Gets details for an organization.
- `get_cost`: Gets the cost of a new project or branch for an organization.
- `confirm_cost`: Confirms the user's understanding of new project or branch costs. This is required to create a new project or branch.

#### Knowledge Base

Enabled by default. Use `docs` to target this group of tools with the [`--features`](#feature-groups) option.

- `search_docs`: Searches the Supabase documentation for up-to-date information. LLMs can use this to find answers to questions or learn how to use specific features.

#### Database

Enabled by default. Use `database` to target this group of tools with the [`--features`](#feature-groups) option.

- `list_tables`: Lists all tables within the specified schemas.
- `list_extensions`: Lists all extensions in the database.
- `list_migrations`: Lists all migrations in the database.
- `apply_migration`: Applies a SQL migration to the database. SQL passed to this tool will be tracked within the database, so LLMs should use this for DDL operations (schema changes).
- `execute_sql`: Executes raw SQL in the database. LLMs should use this for regular queries that don't change the schema.

#### Debug

Enabled by default. Use `debug` to target this group of tools with the [`--features`](#feature-groups) option.

- `get_logs`: Gets logs for a Supabase project by service type (api, postgres, edge functions, auth, storage, realtime). LLMs can use this to help with debugging and monitoring service performance.
- `get_advisors`: Gets a list of advisory notices for a Supabase project. LLMs can use this to check for security vulnerabilities or performance issues.

#### Development

Enabled by default. Use `development` to target this group of tools with the [`--features`](#feature-groups) option.

- `get_project_url`: Gets the API URL for a project.
- `get_anon_key`: Gets the anonymous API key for a project.
- `generate_typescript_types`: Generates TypeScript types based on the database schema. LLMs can save this to a file and use it in their code.

#### Edge Functions

Enabled by default. Use `functions` to target this group of tools with the [`--features`](#feature-groups) option.

- `list_edge_functions`: Lists all Edge Functions in a Supabase project.
- `deploy_edge_function`: Deploys a new Edge Function to a Supabase project. LLMs can use this to deploy new functions or update existing ones.

#### Branching (Experimental, requires a paid plan)

Enabled by default. Use `branching` to target this group of tools with the [`--features`](#feature-groups) option.

- `create_branch`: Creates a development branch with migrations from production branch.
- `list_branches`: Lists all development branches.
- `delete_branch`: Deletes a development branch.
- `merge_branch`: Merges migrations and edge functions from a development branch to production.
- `reset_branch`: Resets migrations of a development branch to a prior version.
- `rebase_branch`: Rebases development branch on production to handle migration drift.

#### Storage

Disabled by default to reduce tool count. Use `storage` to target this group of tools with the [`--features`](#feature-groups) option.

- `list_storage_buckets`: Lists all storage buckets in a Supabase project.
- `get_storage_config`: Gets the storage config for a Supabase project.
- `update_storage_config`: Updates the storage config for a Supabase project (requires a paid plan).

## Other MCP servers

### `@supabase/mcp-server-postgrest`

The PostgREST MCP server allows you to connect your own users to your app via REST API. See more details on its [project README](./packages/mcp-server-postgrest).

## Resources

- [**Model Context Protocol**](https://modelcontextprotocol.io/introduction): Learn more about MCP and its capabilities.
- [**From development to production**](/docs/production.md): Learn how to safely promote changes to production environments.

## For developers

This repo uses npm for package management, and the latest LTS version of Node.js.

Clone the repo and run:

```
npm install --ignore-scripts
```

> [!NOTE]
> On recent versions of MacOS, you may have trouble installing the `libpg-query` transient dependency without the `--ignore-scripts` flag.

## License

This project is licensed under Apache 2.0. See the [LICENSE](./LICENSE) file for details.

## 🔄 **Integration Guide - Transport Protocols**

This MCP server supports **3 different transport protocols** depending on your use case. Choose the right one for your application:

### 📋 **Quick Reference**

| Transport | Use Case | Accept Header | Endpoint |
|-----------|----------|---------------|----------|
| **Streamable HTTP** | Pipecat Cloud, Modern APIs | `application/json` | `POST /mcp` |
| **SSE** | n8n MCP Client | `text/event-stream` | `POST /mcp` |
| **STDIO** | Desktop Apps | N/A | Direct subprocess |

---

## 🚀 **1. Streamable HTTP Transport (MCP 2025 Standard)**

**Perfect for:** Pipecat Cloud, modern cloud services, HTTP-based integrations

### **Basic Request**
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: your-session-123" \
  -d '{
    "jsonrpc": "2.0",
    "id": "request-1",
    "method": "tools/list",
    "params": {}
  }'
```

### **Pipecat Cloud Integration**
```python
import aiohttp
import json

class SupabaseMCPClient:
    def __init__(self, base_url: str):
        self.base_url = f"{base_url}/mcp"
        self.session_id = f"pipecat-{uuid.uuid4()}"
    
    async def call_tool(self, tool_name: str, arguments: dict):
        async with aiohttp.ClientSession() as session:
            payload = {
                "jsonrpc": "2.0",
                "id": f"tool-{int(time.time())}",
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Mcp-Session-Id": self.session_id
            }
            
            async with session.post(self.base_url, json=payload, headers=headers) as resp:
                result = await resp.json()
                return result["result"]

# Usage in Pipecat Pipeline
mcp_client = SupabaseMCPClient("https://your-coolify-domain.com")

# List all tables
tables = await mcp_client.call_tool("list_tables", {"schemas": ["public"]})

# Execute SQL query
data = await mcp_client.call_tool("execute_sql", {
    "query": "SELECT * FROM profiles WHERE user_id = $1 LIMIT 1",
    "params": ["user-uuid-here"]
})
```

### **Available Tools**
- `list_tables` - List database tables
- `execute_sql` - Run SQL queries
- `list_extensions` - List PostgreSQL extensions
- `get_project_url` - Get Supabase project URL
- `get_anon_key` - Get anonymous API key
- `search_docs` - Search Supabase documentation
- `list_edge_functions` - List Edge Functions
- `deploy_edge_function` - Deploy Edge Functions

---

## 📡 **2. SSE Transport (Server-Sent Events)**

**Perfect for:** n8n MCP Client integration, real-time applications

### **n8n MCP Client Setup**

1. **Install n8n MCP Client Node**
   ```bash
   npm install n8n-nodes-mcp
   ```

2. **Add MCP Client Node to Workflow**
   - Node Type: `MCP Client`
   - Endpoint URL: `https://your-coolify-domain.com/mcp`
   - Transport: `SSE (Server-Sent Events)`
   - Authentication: None (or API key if secured)

3. **Example n8n Workflow Configuration**
   ```json
   {
     "nodes": [
       {
         "parameters": {
           "endpoint": "https://your-coolify-domain.com/mcp",
           "transport": "sse",
           "tool": "list_tables",
           "arguments": {
             "schemas": ["public"]
           }
         },
         "type": "n8n-nodes-mcp.mcpClient",
         "name": "Get Supabase Tables"
       }
     ]
   }
   ```

### **Manual SSE Connection**
```bash
# Connect to SSE endpoint
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": "sse-request",
    "method": "tools/list",
    "params": {}
  }'

# Expected SSE Response:
# data: {"type":"connection","sessionId":"session-1","message":"Connected to MCP server"}
# data: {"result":{"tools":[...]},"jsonrpc":"2.0","id":"sse-request"}
```

### **JavaScript SSE Client**
```javascript
// For web applications
const eventSource = new EventSource('/mcp');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('MCP Response:', data);
};

// Send MCP request
fetch('/mcp', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
        jsonrpc: "2.0",
        id: "web-request",
        method: "tools/list",
        params: {}
    })
});
```

---

## 💻 **3. STDIO Transport (Native Desktop)**

**Perfect for:** Cursor, Windsurf, Claude Desktop, local development

### **Claude Desktop Configuration**
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": [
        "/path/to/packages/mcp-server-supabase/dist/transports/stdio.js",
        "--project-ref=your_project_ref",
        "--access-token=your_access_token"
      ],
      "env": {
        "SUPABASE_PROJECT_REF": "your_project_ref",
        "SUPABASE_ACCESS_TOKEN": "your_access_token"
      }
    }
  }
}
```

### **Cursor/Windsurf Integration**
1. Install the MCP extension for your editor
2. Add server configuration:
   ```json
   {
     "mcp": {
       "servers": {
         "supabase": {
           "command": "node",
           "args": [
             "packages/mcp-server-supabase/dist/transports/stdio.js"
           ],
           "env": {
             "SUPABASE_PROJECT_REF": "your_project_ref",
             "SUPABASE_ACCESS_TOKEN": "your_access_token"
           }
         }
       }
     }
   }
   ```

### **Direct STDIO Usage**
```bash
# Start MCP server directly
node packages/mcp-server-supabase/dist/transports/stdio.js \
  --project-ref=your_project_ref \
  --access-token=your_access_token

# Send JSON-RPC over STDIN
echo '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}' | \
node packages/mcp-server-supabase/dist/transports/stdio.js \
  --project-ref=your_project_ref \
  --access-token=your_access_token
```

### **Python Subprocess Integration**
```python
import subprocess
import json

class MCPSubprocess:
    def __init__(self, project_ref: str, access_token: str):
        self.process = subprocess.Popen([
            'node', 
            'packages/mcp-server-supabase/dist/transports/stdio.js',
            f'--project-ref={project_ref}',
            f'--access-token={access_token}'
        ], 
        stdin=subprocess.PIPE, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        text=True)
    
    def call_tool(self, method: str, params: dict = None):
        request = {
            "jsonrpc": "2.0",
            "id": "python-request",
            "method": method,
            "params": params or {}
        }
        
        self.process.stdin.write(json.dumps(request) + '\n')
        self.process.stdin.flush()
        
        response_line = self.process.stdout.readline()
        return json.loads(response_line)

# Usage
mcp = MCPSubprocess("your_project_ref", "your_access_token")
tables = mcp.call_tool("tools/call", {
    "name": "list_tables",
    "arguments": {"schemas": ["public"]}
})
```

---

## ⚙️ **Environment Variables**

All transports use the same environment variables:

```bash
# Required
SUPABASE_PROJECT_REF=your_project_reference_id
SUPABASE_ACCESS_TOKEN=your_personal_access_token

# Optional
MCP_FEATURES=database,docs,development,functions  # Default: all features
MCP_READ_ONLY=true                                # Default: true (safe mode)
MCP_PORT=3000                                     # HTTP server port (Streamable HTTP + SSE only)
```

---

## 🔍 **Testing Your Integration**

### **Health Check**
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","mcpReady":true,"timestamp":"..."}
```

### **MCP Status**
```bash
curl https://your-domain.com/mcp/status
# Expected: {"protocol":"mcp","version":"2024-11-05","transports":["streamable-http","sse"],...}
```

### **List Available Tools**
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}'
```

---

## 🧪 **Testing & Quality Assurance**

This project includes comprehensive security tests to ensure production readiness:

- **27 Security Tests** covering authentication, rate limiting, input validation
- **Automated CI/CD** testing for all critical paths
- **Coverage Reports** to ensure thorough testing
- **Security Hardening** against common attack vectors

```bash
# Run HTTP server security tests
npm run test:http

# Run all workspace tests  
npm test

# Generate coverage reports
npm run test:http:coverage
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

## 🔐 **Security Features**

### **Built-in Security Hardening**

The MCP server includes enterprise-grade security features to prevent abuse:

#### **🔑 API Key Authentication (Recommended)**
```bash
# Set API keys in environment variables
MCP_API_KEYS="your-secret-key-1,your-secret-key-2,your-secret-key-3"

# Client requests must include the key
curl -X POST https://your-domain.com/mcp \
  -H "X-API-Key: your-secret-key-1" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}'
```

#### **🛡️ Rate Limiting & DDoS Protection**
```bash
# Configure rate limits (optional)
MCP_RATE_LIMIT_REQUESTS=100  # Max requests per 15min for /mcp endpoint
MCP_RATE_LIMIT_GENERAL=60    # Max requests per minute for all endpoints
```

#### **🌐 CORS Security**
```bash
# Restrict to specific domains (recommended)
MCP_ALLOWED_ORIGINS="https://app.yourdomain.com,https://admin.yourdomain.com"

# Or allow all origins (not recommended for production)
MCP_ALLOWED_ORIGINS="*"
```

#### **🔒 Additional Security Headers**
- **Helmet.js**: Secure HTTP headers (XSS protection, CSRF, etc.)
- **Content Security Policy**: Prevents code injection attacks
- **Request Validation**: JSON-RPC format validation
- **Payload Limits**: 1MB max request size
- **Method Filtering**: Blocks potentially dangerous methods

### **⚠️ Production Security Checklist**

```bash
# 1. Set strong API keys
MCP_API_KEYS="$(openssl rand -hex 32),$(openssl rand -hex 32)"

# 2. Restrict CORS origins
MCP_ALLOWED_ORIGINS="https://yourdomain.com"

# 3. Configure rate limiting
MCP_RATE_LIMIT_REQUESTS=50   # Conservative limit
MCP_RATE_LIMIT_GENERAL=30

# 4. Enable read-only mode
MCP_READ_ONLY=true

# 5. Use HTTPS (via Coolify/Traefik)
# 6. Monitor logs for suspicious activity
```

### **🚨 Security Warnings**

The server will log security events:
- ⚠️  **No API keys configured** - Server runs in open mode
- 🚨 **Unauthorized access attempts** - Invalid API keys
- 🚨 **Rate limiting triggered** - Too many requests
- 🚨 **Blocked dangerous methods** - Potential attack attempts
- 🚨 **CORS violations** - Unauthorized origin access

### **Legacy Security Notes**

- **Access Token**: Keep your Supabase access token secure
- **Read-Only Mode**: Enabled by default to prevent accidental data modification  
- **RLS**: Row Level Security is enforced on all database operations

---

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"MCP server not ready"**
   - Check environment variables are set correctly
   - Verify Supabase project is accessible
   - Check server logs for detailed error messages

2. **Connection timeouts**
   - Increase request timeout (default: 30 seconds)
   - Check network connectivity to Supabase

3. **JSON parsing errors**
   - Ensure request format follows JSON-RPC 2.0 specification
   - Check Content-Type headers are set correctly

4. **Tool not found**
   - Use `tools/list` to see available tools
   - Check tool name spelling and parameters

### **Debug Mode**
Set environment variable for verbose logging:
```bash
DEBUG=mcp:* node mcp-http-server.js
```