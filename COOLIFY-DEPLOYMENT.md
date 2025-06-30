# Coolify Deployment Guide

This guide explains how to deploy the Supabase MCP Server on Coolify with **multi-transport support**.

## 🔄 Supported Transport Protocols

Your deployed MCP server will support:

1. **✨ Streamable HTTP** (MCP 2025 Standard) - For modern integrations like Pipecat Cloud
2. **📡 SSE** (Server-Sent Events) - For n8n MCP Client integration  
3. **💻 STDIO** - For desktop applications (Cursor, Windsurf, Claude Desktop)

## Prerequisites

1. A Coolify instance (self-hosted or cloud)
2. A Supabase project with:
   - Project Reference ID (found in Settings > General)
   - Access Token (create in Settings > Access Tokens)

## Deployment Steps

### 1. Create New Resource

1. Go to your Coolify dashboard
2. Click **"+ New"** → **"Public Repository"**
3. Enter repository URL: `https://github.com/Silverstar187/supabase-mcp-docker`
4. Select **"Docker Compose"** as Build Pack
5. Set **Docker Compose Location** to: `docker-compose.yaml`

### 2. Configure Environment Variables

Add these environment variables in Coolify:

```bash
# Required
SUPABASE_ACCESS_TOKEN=your_access_token_here
SUPABASE_PROJECT_REF=your_project_ref_here

# Optional Configuration  
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=true
MCP_PORT=3000
```

### 3. Configure Domain & Networking

1. **Generate Domain** in Coolify (e.g., `mcp-server.your-coolify-domain.com`)
2. **Set Port** to `3000` for health checks
3. **Enable HTTPS** (recommended for production)

### 4. Deploy

Click **"Deploy"** and wait for the build to complete.

## 🔌 Integration Endpoints

Once deployed, your MCP server provides these endpoints:

| Endpoint | Method | Purpose | Client Type |
|----------|--------|---------|-------------|
| `POST /mcp` | POST | **Streamable HTTP** (new standard) | Pipecat Cloud, modern clients |
| `POST /mcp` | POST | **SSE** (with `Accept: text/event-stream`) | n8n MCP Client |
| `GET /mcp/status` | GET | Server discovery & capabilities | Any HTTP client |
| `GET /health` | GET | Health check | Monitoring tools |

## 🤖 Pipecat Cloud Integration (Streamable HTTP)

### Python Code Example

```python
import httpx
import time

class SupabaseMCP:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session_id = f"pipecat-{int(time.time())}"
    
    async def call_tool(self, tool_name: str, arguments: dict):
        async with httpx.AsyncClient(timeout=30.0) as client:
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

# Usage
mcp = SupabaseMCP("https://mcp-server.your-coolify-domain.com")
result = await mcp.call_tool("query", {"sql": "SELECT * FROM todos"})
```

## 📡 n8n Integration (SSE)

### n8n MCP Client Node Configuration

1. **Add MCP Client Node** to your n8n workflow
2. **Configure endpoint**:
   - **URL**: `https://mcp-server.your-coolify-domain.com/mcp`
   - **Method**: `POST`
   - **Headers**: `Accept: text/event-stream`
3. **Authentication**: None (unless you add custom auth)
4. **Test connection** to verify it works

### n8n Workflow Example

```json
{
  "nodes": [
    {
      "parameters": {
        "url": "https://mcp-server.your-coolify-domain.com/mcp",
        "options": {
          "headers": {
            "Content-Type": "application/json",
            "Accept": "text/event-stream"
          },
          "body": {
            "jsonrpc": "2.0",
            "id": "n8n-{{ $workflow.id }}",
            "method": "tools/call",
            "params": {
              "name": "query",
              "arguments": {
                "sql": "{{ $json.query }}"
              }
            }
          }
        }
      },
      "type": "@n8n/n8n-nodes-mcp.mcpClient",
      "position": [400, 240],
      "name": "Supabase MCP Query"
    }
  ]
}
```

## 💻 Desktop Integration (STDIO)

For **local development** with Cursor, Windsurf, Claude Desktop:

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "SUPABASE_ACCESS_TOKEN=your_token",
        "-e", "SUPABASE_PROJECT_REF=your_ref",
        "your-coolify-registry/mcp-server:latest",
        "node", "packages/mcp-server-supabase/dist/transports/stdio.js",
        "--project-ref=your_ref"
      ]
    }
  }
}
```

## 🔍 Testing & Monitoring

### Health Check
```bash
curl https://mcp-server.your-coolify-domain.com/health
```

### Status Check
```bash  
curl https://mcp-server.your-coolify-domain.com/mcp/status
```

### Available Tools
```bash
curl -X POST https://mcp-server.your-coolify-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc": "2.0", "id": "test", "method": "tools/list", "params": {}}'
```

## 🛠 Troubleshooting

### Common Issues

1. **Connection refused**: Check if port 3000 is properly exposed
2. **CORS errors**: The server includes CORS headers, but verify your domain configuration
3. **n8n SSE timeout**: Ensure `Accept: text/event-stream` header is set
4. **Pipecat HTTP errors**: Use `Accept: application/json` for Streamable HTTP

### Debug Logs

Check Coolify application logs:
```bash
# In Coolify dashboard
Application → Logs → Real-time logs
```

Look for:
- `MCP HTTP Server running on port 3000`
- `Streamable HTTP: POST /mcp`
- `SSE (legacy): POST /mcp with Accept: text/event-stream`

## 🎯 Summary

Your deployed MCP server provides **universal compatibility**:

- ✅ **Modern**: Streamable HTTP for Pipecat Cloud & new clients
- ✅ **Compatible**: SSE for n8n MCP Client integration
- ✅ **Local**: STDIO for desktop applications
- ✅ **Reliable**: Health checks & monitoring endpoints

This gives you the flexibility to integrate with any MCP client, current or future! 🚀 