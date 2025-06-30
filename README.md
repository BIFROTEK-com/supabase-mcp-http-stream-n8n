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

**Option 1: Execute Command Node**
```json
{
  "nodes": [
    {
      "parameters": {
        "command": "docker run --rm -i -e SUPABASE_ACCESS_TOKEN='{{ $env.SUPABASE_TOKEN }}' -e SUPABASE_PROJECT_REF='{{ $env.PROJECT_REF }}' your-coolify-image node packages/mcp-server-supabase/dist/transports/stdio.js --project-ref={{ $env.PROJECT_REF }} --read-only --features=database,docs",
        "additionalFields": {
          "stdin": "{{ $json.mcpRequest }}"
        }
      },
      "type": "n8n-nodes-base.executeCommand",
      "position": [380, 240],
      "name": "Supabase MCP"
    }
  ]
}
```

**Option 2: HTTP Request Node (if using HTTP transport)**
```json
{
  "parameters": {
    "url": "https://your-mcp-server.coolify.domain.com/mcp",
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
            "sql": "SELECT * FROM users LIMIT 10"
          }
        }
      }
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Query Supabase"
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

**Basic Pipecat Integration**
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
        
        # Send request
        request_json = json.dumps(request) + '\n'
        self.process.stdin.write(request_json.encode())
        self.process.stdin.flush()
        
        # Read response
        response_line = self.process.stdout.readline()
        return json.loads(response_line.decode())
    
    async def stop(self):
        """Stop the MCP server process"""
        if self.process:
            self.process.terminate()
            self.process.wait()

# Pipecat Pipeline with Supabase MCP
async def main():
    # Initialize services
    llm = OpenAILLMService(api_key="your-openai-key")
    tts = ElevenLabsTTSService(api_key="your-elevenlabs-key")
    supabase_mcp = SupabaseMCPService(
        project_ref="your_project_ref",
        access_token="your_supabase_token"
    )
    
    # Start MCP server
    await supabase_mcp.start()
    
    # Create pipeline
    pipeline = Pipeline([
        llm,
        supabase_mcp,  # Add as a service in your pipeline
        tts
    ])
    
    # Example: Query database through voice
    async def handle_voice_query(query: str):
        # Use LLM to convert natural language to SQL
        sql_query = await llm.process(f"Convert to SQL: {query}")
        
        # Execute SQL via MCP
        result = await supabase_mcp.call_tool("execute_sql", {
            "sql": sql_query
        })
        
        # Convert result to speech
        await tts.process(f"Here are your results: {result}")
    
    # Run pipeline
    try:
        await pipeline.run()
    finally:
        await supabase_mcp.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

**Advanced Pipecat Example: Voice-Controlled Database Assistant**
```python
from pipecat.vad import SileroVADAnalyzer
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.frames.frames import TextFrame, AudioRawFrame
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService

class VoiceDatabaseAssistant(PipelineTask):
    def __init__(self):
        super().__init__()
        self.supabase_mcp = SupabaseMCPService(
            project_ref=os.getenv("SUPABASE_PROJECT_REF"),
            access_token=os.getenv("SUPABASE_ACCESS_TOKEN")
        )
        
    async def process_frame(self, frame):
        if isinstance(frame, TextFrame):
            # Process voice commands
            text = frame.text.lower()
            
            if "show tables" in text:
                result = await self.supabase_mcp.call_tool("list_tables")
                tables = [table["name"] for table in result.get("result", [])]
                response = f"Available tables: {', '.join(tables)}"
                
            elif "count users" in text:
                result = await self.supabase_mcp.call_tool("execute_sql", {
                    "sql": "SELECT COUNT(*) as total FROM users"
                })
                count = result["result"][0]["total"]
                response = f"Total users: {count}"
                
            elif "search docs" in text and "about" in text:
                topic = text.split("about")[-1].strip()
                result = await self.supabase_mcp.call_tool("search_docs", {
                    "query": topic
                })
                response = f"Documentation found: {result.get('result', 'No results')}"
                
            else:
                response = "I can help you with: show tables, count users, or search docs about a topic"
            
            # Send response back through pipeline
            await self.push_frame(TextFrame(response))

# Complete pipeline setup
async def run_voice_assistant():
    stt = DeepgramSTTService(api_key="your-deepgram-key")
    llm = OpenAILLMService(api_key="your-openai-key")
    tts = CartesiaTTSService(api_key="your-cartesia-key")
    vad = SileroVADAnalyzer()
    assistant = VoiceDatabaseAssistant()
    
    # Pipeline: Audio -> STT -> Assistant -> LLM -> TTS -> Audio
    pipeline = Pipeline([
        vad,           # Voice activity detection
        stt,           # Speech to text
        assistant,     # Our database assistant
        llm,           # Language model for responses
        tts            # Text to speech
    ])
    
    # Run the pipeline
    runner = PipelineRunner()
    await runner.run(pipeline)

if __name__ == "__main__":
    asyncio.run(run_voice_assistant())
```

**Environment Setup for Pipecat**
```bash
# .env file for Pipecat project
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
SUPABASE_PROJECT_REF=your_project_ref_here
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DEEPGRAM_API_KEY=your_deepgram_key
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
