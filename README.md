# Supabase MCP Server

> Connect your Supabase projects to Cursor, Claude, Windsurf, and other AI assistants.

![supabase-mcp-demo](https://github.com/user-attachments/assets/3fce101a-b7d4-482f-9182-0be70ed1ad56)

The [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) standardizes how Large Language Models (LLMs) talk to external services like Supabase. It connects AI assistants directly with your Supabase project and allows them to perform tasks like managing tables, fetching config, and querying data. See the [full list of tools](#tools).

## Docker Deployment

This repository includes production-ready Docker configuration for hosting the Supabase MCP server.

### Quick Start with Docker

1. **Clone and build:**
   ```bash
   git clone https://github.com/Silverstar187/supabase-mcp-docker.git
   cd supabase-mcp-docker
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

### Environment Variables

Required configuration:

- `SUPABASE_ACCESS_TOKEN` - Your Supabase Personal Access Token ([Get it here](https://supabase.com/dashboard/account/tokens))
- `SUPABASE_PROJECT_REF` - Your Supabase Project ID (found in Project Settings → General)

Optional configuration:

- `MCP_FEATURES` - Comma-separated feature groups (default: `database,docs,development,functions`)
- `MCP_READ_ONLY` - Enable read-only mode (default: `true`)
- `NODE_ENV` - Node environment (default: `production`)

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
```bash
SUPABASE_ACCESS_TOKEN=sbp_1234567890abcdef... # Your Personal Access Token
SUPABASE_PROJECT_REF=abcdefghijklmnop        # Your Project Reference
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=true
NODE_ENV=production
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

## 🔄 Transport Protocols

This MCP server supports **multiple transport protocols** for maximum compatibility:

### 1. **STDIO** (Native Desktop Integration)
Perfect for desktop applications like Cursor, Windsurf, Claude Desktop:
```bash
# Direct STDIO execution
node packages/mcp-server-supabase/dist/transports/stdio.js --project-ref=your_ref --access-token=your_token
```

### 2. **Streamable HTTP** (MCP 2025 Standard) ⭐ NEW
The official new transport protocol replacing SSE:
```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: application/json
Mcp-Session-Id: session-123

{
  "jsonrpc": "2.0",
  "id": "req-1",
  "method": "tools/list",
  "params": {}
}
```

### 3. **SSE** (Server-Sent Events) - Legacy Support
For older MCP clients and n8n compatibility:
```http
POST /mcp HTTP/1.1
Content-Type: application/json
Accept: text/event-stream

{
  "jsonrpc": "2.0",
  "id": "req-1", 
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "n8n", "version": "1.0"}
  }
}
```

## 🔗 Integration Examples

### Pipecat Cloud Integration (RECOMMENDED: Streamable HTTP)

**Modern Streamable HTTP approach:**
```python
import httpx
import asyncio
from pipecat.pipeline.pipeline import Pipeline
from pipecat.services.mcp import StreamableHTTPMCPService

class SupabaseMCPService:
    def __init__(self, base_url: str, project_ref: str, access_token: str):
        self.base_url = base_url
        self.project_ref = project_ref
        self.access_token = access_token
        self.session_id = f"pipecat-{int(time.time())}"
        
    async def call_tool(self, tool_name: str, arguments: dict):
        """Call MCP tool using Streamable HTTP"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mcp",
                json={
                    "jsonrpc": "2.0",
                    "id": f"req-{int(time.time())}",
                    "method": "tools/call",
                    "params": {
                        "name": tool_name,
                        "arguments": arguments
                    }
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Mcp-Session-Id": self.session_id
                }
            )
            return response.json()
    
    async def list_tools(self):
        """List available tools"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mcp",
                json={
                    "jsonrpc": "2.0", 
                    "id": "list-tools",
                    "method": "tools/list",
                    "params": {}
                },
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Mcp-Session-Id": self.session_id
                }
            )
            return response.json()

# Usage in Pipecat pipeline
async def setup_pipecat_with_mcp():
    mcp_service = SupabaseMCPService(
        base_url="https://your-mcp-server.domain.com",
        project_ref="your_project_ref",
        access_token="your_access_token"
    )
    
    # Initialize MCP connection
    tools = await mcp_service.list_tools()
    print(f"Available tools: {tools}")
    
    # Call a tool
    result = await mcp_service.call_tool("query", {
        "sql": "SELECT * FROM todos LIMIT 5"
    })
    print(f"Query result: {result}")
```

**Legacy STDIO approach (still supported):**
