# Coolify Deployment Guide

This guide explains how to deploy the Supabase MCP Server on Coolify with **multi-transport support**.

## 🚨 **Important: Traefik Proxy Configuration**

**Coolify uses Traefik as a reverse proxy.** If you see "no available server" errors, it means Traefik can't route traffic to your container. This deployment configuration includes the required **Traefik labels** to fix this issue.

**What happens:**
```
Internet → Traefik (Port 80/443) → Your Container (Port 3333)
```

**Key Configuration:**
- Container runs on internal port `3333` (no port mapping needed)
- Traefik routes external traffic to your domain → container port `3333`
- SSL certificates handled automatically by Traefik + Let's Encrypt

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
SUPABASE_PROJECT_REF=your_project_reference_id

# Optional (with defaults)
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=true
MCP_PORT=3333

# Security (Highly Recommended for Production)
MCP_API_KEYS=your-secret-api-key-1,your-secret-api-key-2
MCP_RATE_LIMIT_REQUESTS=50
MCP_RATE_LIMIT_GENERAL=30
MCP_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Deployment Configuration (Required!)
DOMAIN=your-domain.com

```

### 3. Configure Domain

- **Domain**: Configure your custom domain (e.g., `sb-mcp.yourdomain.com`)
- **Port**: Not needed! Traefik handles all routing (container runs on internal port 3333)
- **SSL**: Automatically handled by Traefik + Let's Encrypt

### 4. Deploy

Click **"Deploy"** and wait for the build to complete.

---

## 🔧 **Troubleshooting**

### "No Available Server" Error

**Cause:** Traefik proxy can't reach your container

**Solution:** Check docker-compose.yaml contains:
```yaml
services:
  supabase-mcp:
    networks:
      - coolify
    labels:
      - traefik.enable=true
      - traefik.http.routers.supabase-mcp.rule=Host(`${DOMAIN}`) # Set via DOMAIN env variable
      - traefik.http.services.supabase-mcp.loadbalancer.server.port=3333
```

**⚠️ WICHTIG:** Setzen Sie die `DOMAIN` Umgebungsvariable mit Ihrer echten Domain!

### Container Starts But Not Accessible

1. **Check Traefik Dashboard**: http://your-coolify-server:8080
2. **Verify Container Network**: Container must be in `coolify` network
3. **Check Domain DNS**: Domain must point to your Coolify server
4. **Test Internal**: `docker exec container-name curl http://localhost:3333/health`

### SSL Certificate Issues

- **Wait 5-10 minutes** for Let's Encrypt certificate generation
- **Check domain DNS** points to your server
- **Verify Traefik logs**: `docker logs coolify-proxy`

---

## 🔗 **Post-Deployment Integration Guide**

Once deployed, your MCP server supports multiple ways to connect:

### 🚀 **For Pipecat Cloud (Streamable HTTP)**

**Your Endpoint:** `https://your-domain.com/mcp`

```python
# Pipecat Integration Example
import aiohttp

class SupabaseMCPClient:
    def __init__(self):
        self.base_url = "https://your-domain.com/mcp"
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
                return await resp.json()

# Usage in Pipecat Pipeline
client = SupabaseMCPClient()

# Get user profile
profile = await client.call_tool("execute_sql", {
    "query": "SELECT * FROM profiles WHERE user_id = $1",
    "params": ["user-uuid"]
})

# Create new session
session = await client.call_tool("execute_sql", {
    "query": "INSERT INTO sessions (user_id) VALUES ($1) RETURNING id",
    "params": ["user-uuid"]
})
```

### 📡 **For n8n (SSE Transport)**

**Your Endpoint:** `https://your-domain.com/mcp`

1. **Install MCP Client Node**:
   ```bash
   npm install n8n-nodes-mcp
   ```

2. **Add MCP Client Node** to your n8n workflow:
   - **Endpoint URL**: `https://your-domain.com/mcp`
   - **Transport**: `SSE (Server-Sent Events)`
   - **Authentication**: None (protected by Coolify)

3. **Example n8n Workflow**:
   ```json
   {
     "nodes": [
       {
         "parameters": {
           "endpoint": "https://your-domain.com/mcp",
           "transport": "sse",
           "tool": "execute_sql",
           "arguments": {
             "query": "SELECT COUNT(*) as total FROM todo_entries WHERE is_done = false"
           }
         },
         "type": "n8n-nodes-mcp.mcpClient",
         "name": "Get Open Todos"
       }
     ]
   }
   ```

### 💻 **For Desktop Apps (STDIO)**

Desktop applications don't use the deployed HTTP server directly. Instead, they run the MCP server locally:

**Claude Desktop Configuration** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": [
        "/path/to/packages/mcp-server-supabase/dist/transports/stdio.js",
        "--project-ref=your_project_ref",
        "--access-token=your_access_token"
      ]
    }
  }
}
```

**Cursor/Windsurf**: Install MCP extension and configure with local STDIO transport.

---

## 🧪 **Testing Your Deployment**

### 1. Health Check
```bash
curl https://your-domain.com/health
# Expected: {"status":"ok","mcpReady":true,"timestamp":"..."}
```

### 2. MCP Status
```bash
curl https://your-domain.com/mcp/status
# Expected: {"protocol":"mcp","version":"2024-11-05","transports":["streamable-http","sse"]}
```

### 3. List Available Tools
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "tools/list",
    "params": {}
  }'
```

### 4. Test Database Connection
```bash
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-db",
    "method": "tools/call",
    "params": {
      "name": "list_tables",
      "arguments": {
        "schemas": ["public"]
      }
    }
  }'
```

---

## 🔐 **Production Security Hardening**

This MCP server includes built-in security features to prevent abuse and attacks:

### **🔑 API Key Authentication**

**Why:** Prevents unauthorized access and abuse by script kiddies.

```bash
# Generate strong API keys
MCP_API_KEYS="$(openssl rand -hex 32),$(openssl rand -hex 32)"
```

**Usage in clients:**
```bash
# Using X-API-Key header
curl -X POST https://your-domain.com/mcp \
  -H "X-API-Key: your-secret-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}'

# Or using Authorization header
curl -X POST https://your-domain.com/mcp \
  -H "Authorization: Bearer your-secret-api-key-1" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"tools/list","params":{}}'
```

### **🛡️ Rate Limiting**

**Why:** Prevents DDoS attacks and resource abuse.

```bash
# Conservative production settings
MCP_RATE_LIMIT_REQUESTS=50   # Max 50 requests per 15 minutes for /mcp
MCP_RATE_LIMIT_GENERAL=30    # Max 30 requests per minute for all endpoints
```

### **🌐 CORS Protection**

**Why:** Prevents unauthorized websites from accessing your server.

```bash
# Restrict to your domains only
MCP_ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"

# For development (not recommended for production)
MCP_ALLOWED_ORIGINS="*"
```

### **📋 Security Checklist**

Before going live:

1. ✅ **Set API Keys**: Configure `MCP_API_KEYS` with strong random keys
2. ✅ **Restrict CORS**: Set `MCP_ALLOWED_ORIGINS` to your specific domains
3. ✅ **Enable Rate Limiting**: Set conservative limits for `MCP_RATE_LIMIT_*`
4. ✅ **Use HTTPS**: Ensure Coolify uses SSL certificates
5. ✅ **Monitor Logs**: Check for security warnings in Coolify logs
6. ✅ **Read-Only Mode**: Keep `MCP_READ_ONLY=true` unless writes are needed

### **🚨 Security Monitoring**

The server logs security events:

```bash
# In Coolify Application Logs, watch for:
⚠️  WARNING: MCP_API_KEYS not configured. Server is open to public access!
🚨 Unauthorized access attempt from 192.168.1.100 with key: 12345678...
🚨 Rate limit exceeded for IP: 203.0.113.5
🚨 Blocked CORS request from unauthorized origin: https://malicious-site.com
🚨 Blocked potentially dangerous method: eval from 203.0.113.5
```

### **🔄 For Coolify Users**

The security features work seamlessly with Coolify's Traefik proxy:

- **SSL/TLS**: Automatic HTTPS via Traefik
- **Load Balancing**: Built-in with Coolify
- **Health Checks**: Uses `/health` endpoint
- **Log Aggregation**: View all logs in Coolify dashboard

---

## 🔧 **Common Use Cases**

### **Voice Coaching with Pipecat**
```python
# Get user's mood for personalized coaching
mood_data = await mcp_client.call_tool("execute_sql", {
    "query": """
        SELECT focused, confident, motivated, energetic 
        FROM journal_mood_entries 
        WHERE user_id = $1 
        ORDER BY entry_date DESC 
        LIMIT 1
    """,
    "params": [user_id]
})

# Update session with AI insights
await mcp_client.call_tool("execute_sql", {
    "query": "UPDATE sessions SET summary = $1 WHERE id = $2",
    "params": [ai_generated_summary, session_id]
})
```

### **Productivity Dashboard with n8n**
1. **Daily Mood Check**: Query `journal_mood_entries` for today's entry
2. **Todo Progress**: Count open/completed tasks from `todo_entries`
3. **Goal Status**: Check progress on active goals from `goals` table
4. **Send Summary**: Email daily productivity report

### **Development with Cursor/Windsurf**
- Query database schema and relationships
- Generate TypeScript types from database structure
- Search Supabase documentation for best practices
- Deploy Edge Functions directly from your editor

---

## 🔒 **Security & Performance**

### **Security Features**
- ✅ **Read-Only Mode** by default (safe for AI agents)
- ✅ **Row Level Security** enforced on all queries
- ✅ **CORS** configured for web applications
- ✅ **Rate Limiting** via Coolify proxy

### **Performance Optimization**
- ✅ **Connection Pooling** to Supabase
- ✅ **Request Timeouts** (30 seconds default)
- ✅ **Session Management** for Streamable HTTP
- ✅ **Graceful Error Handling**

### **Monitoring**
Monitor your deployment via:
- **Coolify Logs**: Real-time server logs
- **Health Endpoint**: `/health` for uptime monitoring
- **MCP Status**: `/mcp/status` for protocol information

---

## 🆘 **Troubleshooting**

### **Deployment Issues**
1. **Build fails**: Check environment variables are set
2. **Port conflicts**: Ensure port 3000 is configured in Coolify
3. **Domain issues**: Verify DNS and SSL certificate setup

### **Runtime Issues**
1. **"MCP server not ready"**: Check Supabase credentials and network access
2. **Tool errors**: Verify read-only mode settings and RLS policies
3. **Timeout errors**: Check Supabase project status and network latency

### **Getting Help**
- Check Coolify application logs
- Enable debug mode: Set `DEBUG=mcp:*` environment variable
- Test locally first before deploying

---

## 🚀 **Next Steps**

After successful deployment:

1. **Integrate with Pipecat**: Build voice coaching workflows
2. **Connect to n8n**: Create automation workflows
3. **Desktop Development**: Use with Cursor/Windsurf for AI-assisted coding
4. **Scale Up**: Add more Supabase features or custom tools

Your Supabase MCP Server is now ready for production use! 🎉 

## Deployment mit SSE-Unterstützung für n8n

Für die Integration mit n8n benötigen Sie die SSE-Unterstützung. Sie haben drei Möglichkeiten:

### Option 1: Nur SSE-Server

- `docker/Dockerfile.sse` - Dockerfile mit SSE-Unterstützung
- `docker/docker-compose-coolify-sse.yaml` - Docker Compose Konfiguration für Coolify mit SSE-Unterstützung

### Option 2: Kombinierter Server (Standard + SSE)

- `docker/Dockerfile.sse` - Dockerfile mit SSE-Unterstützung
- `docker/docker-compose.coolify-combined.yaml` - Kombinierte Docker Compose Konfiguration für Coolify mit Standard- und SSE-Instanz

### Schritte für das Deployment:

1. Kopieren Sie die Dateien in Ihr Coolify-Projekt:
   ```bash
   # Für Option 1: Nur SSE
   cp docker/Dockerfile.sse /path/to/coolify/project/Dockerfile
   cp docker/docker-compose-coolify-sse.yaml /path/to/coolify/project/docker-compose.yaml
   
   # ODER für Option 2: Kombiniert
   cp docker/Dockerfile.sse /path/to/coolify/project/Dockerfile
   cp docker/docker-compose.coolify-combined.yaml /path/to/coolify/project/docker-compose.yaml
   ```

2. Konfigurieren Sie die Umgebungsvariablen in Coolify:
   - `SUPABASE_ACCESS_TOKEN` - Ihr Supabase Access Token
   - `SUPABASE_PROJECT_REF` - Ihre Supabase Projekt-ID
   - `MCP_FEATURES` - Aktivierte Features (z.B. `database,docs,development,functions,account,debug,branching,storage`)
   - `MCP_READ_ONLY` - Schreibgeschützter Modus (true/false)
   - `MCP_API_KEYS` - API-Schlüssel für die Authentifizierung
   - `MCP_ALLOWED_ORIGINS` - Erlaubte Ursprünge für CORS
   - `DOMAIN` - Ihre Hauptdomain
   - `SSE_DOMAIN` - (Nur für Option 2) Domain für den SSE-Server (Standard: sse.${DOMAIN})

3. Starten Sie den Dienst in Coolify

4. Testen Sie die SSE-Verbindung:
   ```bash
   wget -qO- --header="Accept: text/event-stream" --header="Cache-Control: no-cache" https://your-domain.com/sse
   ``` 