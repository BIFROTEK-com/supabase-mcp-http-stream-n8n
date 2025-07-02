![BIFROTEK Farm Pixel Header](assets/farm_pixel_5x1.png)

# 🐳 Supabase MCP HTTP Stream Server for n8n

> **One-Click Docker deployment** of Supabase MCP Server with native **HTTP Stream Transport** support for n8n, AI Agents, and modern automation workflows.

[![Docker Hub](https://img.shields.io/docker/pulls/silverstar3o7/supabase-mcp-http-stream-n8n)](https://hub.docker.com/r/silverstar3o7/supabase-mcp-http-stream-n8n)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-HTTP%20Stream%20Transport-blue)](https://mcp-framework.com/docs/Transports/http-stream-transport)

## 🚀 Quick Start

### 🌊 Coolify Deployment (Production)

For production deployment on [Coolify](https://coolify.io), follow these detailed steps:

#### Step 1: Create Resource in Coolify

1. **Navigate to your Coolify dashboard**
2. **Go to Projects** → Select your project (e.g., "My first project")  
3. **Click "Add Resource"** → **"Docker Compose"**
4. **Choose "From GIT Repository"** or **"Raw Docker Compose"**

#### Step 2: Configure Docker Compose

**Option A: From GIT Repository**
- Repository: `https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n.git`
- Branch: `main` or `feature/sse-support`
- Docker Compose Location: `docker/docker-compose.coolify.yaml`

**Option B: Raw Docker Compose**
Copy the content from [`docker/docker-compose.coolify.yaml`](docker/docker-compose.coolify.yaml)

#### Step 3: Set Environment Variables

Configure these **required** environment variables in Coolify:

```bash
# 🔐 Required: Supabase Configuration
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here
SUPABASE_PROJECT_REF=your_project_ref_here

# 🔑 Security: API Keys (highly recommended)
MCP_API_KEYS=your-secure-api-key-here

# 📍 Domain Configuration
DOMAIN=your.domain.com

# ⚙️ Optional: Feature Configuration  
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=false
MCP_PORT=3333
NODE_ENV=production

# 🛡️ Optional: Security Settings
MCP_RATE_LIMIT_REQUESTS=100
MCP_RATE_LIMIT_GENERAL=60
MCP_ALLOWED_ORIGINS=*
NODE_LOG_LEVEL=warn
```

#### Step 4: Configure Domain & Traefik

1. **Resource Name**: `supabase-mcp` (or your preferred name)
2. **Domain Configuration**: `https://your.domain.com:3333`
   - ✅ **Format**: `https://your-domain.com:3333`
   - ✅ **Port**: Must be `3333` (the container port)
   - ✅ **Protocol**: Use `https` for SSL termination via Traefik

#### Step 5: Deploy

1. **Save Configuration**
2. **Click "Deploy"**  
3. **Monitor Logs** for successful startup:
   ```
   ✅ MCP HTTP Server running on port 3333
   🚀 Streamable HTTP: POST /mcp
   ❤️ Health: GET /health
   🔗 Ready for connections!
   ```

#### Step 6: Verify Deployment

Test your deployed instance:

```bash
# Health Check
curl https://your-domain.com/health

# API Test (with your API key)
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### Docker Compose (Local Development)

1. **Clone the repository:**
```bash
git clone https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n.git
cd supabase-mcp-http-stream-n8n
```

2. **Create `.env` file:**
```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

3. **Start the server:**
```bash
cd docker && docker-compose up -d
```

4. **Test the connection:**
```bash
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### 🌊 Coolify Deployment (Production)

For production deployment on [Coolify](https://coolify.io), follow these detailed steps:

#### Step 1: Create Resource in Coolify

1. **Navigate to your Coolify dashboard**
2. **Go to Projects** → Select your project (e.g., "My first project")
3. **Click "Add Resource"** → **"Docker Compose"**
4. **Choose "From GIT Repository"** or **"Raw Docker Compose"**

#### Step 2: Configure Docker Compose

**Option A: From GIT Repository**
- Repository: `https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n.git`
- Branch: `main`
- Docker Compose Location: `docker/docker-compose.coolify.yaml`

**Option B: Raw Docker Compose**
Copy the content from [`docker/docker-compose.coolify.yaml`](docker/docker-compose.coolify.yaml)

#### Step 3: Set Environment Variables

Configure these **required** environment variables in Coolify:

```bash
# 🔐 Required: Supabase Configuration
SUPABASE_ACCESS_TOKEN=sbp_your_access_token_here
SUPABASE_PROJECT_REF=your_project_ref_here

# 🔑 Security: API Keys (highly recommended)
MCP_API_KEYS=your-secure-api-key-here

# 📍 Domain Configuration
DOMAIN=sb-mcp.bifrotek.com

# ⚙️ Optional: Feature Configuration
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=false
MCP_PORT=3333
NODE_ENV=production

# 🛡️ Optional: Security Settings
MCP_RATE_LIMIT_REQUESTS=100
MCP_RATE_LIMIT_GENERAL=60
MCP_ALLOWED_ORIGINS=*
NODE_LOG_LEVEL=warn
```

#### Step 4: Configure Domain & Traefik

1. **Resource Name**: `supabase-mcp` (or your preferred name)
2. **Domain Configuration**: `https://sb-mcp.bifrotek.com:3333`
   - ✅ **Format**: `https://your-domain.com:3333`
   - ✅ **Port**: Must be `3333` (the container port)
   - ✅ **Protocol**: Use `https` for SSL termination via Traefik

#### Step 5: Deploy

1. **Save Configuration**
2. **Click "Deploy"**
3. **Monitor Logs** for successful startup:
   ```
   ✅ MCP HTTP Server running on port 3333
   🚀 Streamable HTTP: POST /mcp
   ❤️ Health: GET /health
   🔗 Ready for connections!
   ```

#### Step 6: Verify Deployment

Test your deployed instance:

```bash
# Health Check
curl https://your-domain.com/health

# API Test (with your API key)
curl -X POST https://your-domain.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## 🔌 API Endpoints

### HTTP Stream Transport (Recommended)
- **Main API**: `POST /mcp` - MCP HTTP Stream Transport
- **Health Check**: `GET /health` - Server status
- **Documentation**: `GET /` - API dashboard (requires API key)
- **Session Termination**: `DELETE /mcp` - Terminate MCP session

### SSE Transport (n8n Legacy)
- **SSE Connect**: `GET /sse` - Server-Sent Events connection
- **SSE Messages**: `POST /sse` - Send messages via SSE

### Legacy Support
- **Tools**: `POST /tools` - Legacy tools endpoint

## 🛡️ Security Features

- ✅ **API Key Authentication**: Secure access control
- ✅ **Rate Limiting**: DoS protection (configurable)
- ✅ **CORS Protection**: Configurable origin restrictions
- ✅ **Security Headers**: Helmet.js with CSP
- ✅ **Input Validation**: JSON-RPC 2.0 validation
- ✅ **SSL/TLS**: HTTPS support via Traefik

## 📊 MCP Tools Available

| Tool | Description |
|------|-------------|
| `list_tables` | Lists all database tables |
| `list_extensions` | Lists database extensions |
| `execute_sql` | Execute raw SQL queries |
| `apply_migration` | Apply database migrations |
| `search_docs` | Search Supabase documentation |
| `list_edge_functions` | List Edge Functions |
| `deploy_edge_function` | Deploy Edge Functions |
| `get_project_url` | Get project API URL |
| `get_anon_key` | Get anonymous API key |
| `generate_typescript_types` | Generate TypeScript types |
| `list_migrations` | List database migrations |

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_ACCESS_TOKEN` | ✅ | - | Supabase Management API token |
| `SUPABASE_PROJECT_REF` | ✅ | - | Your Supabase project reference |
| `MCP_API_KEYS` | ⚠️ | - | Comma-separated API keys |
| `MCP_PORT` | ❌ | `3333` | HTTP server port |
| `MCP_FEATURES` | ❌ | `database,docs,development,functions` | Enabled features |
| `MCP_READ_ONLY` | ❌ | `false` | Read-only mode |
| `MCP_RATE_LIMIT_REQUESTS` | ❌ | `100` | Requests per 15 minutes |
| `MCP_RATE_LIMIT_GENERAL` | ❌ | `60` | Requests per minute |
| `MCP_ALLOWED_ORIGINS` | ❌ | `*` | CORS allowed origins |

### Feature Groups

Enable specific features by setting `MCP_FEATURES`:

- `database` - Database operations (tables, SQL, migrations)
- `docs` - Supabase documentation search
- `development` - Development tools and utilities
- `functions` - Edge Functions management
- `account` - Account management (requires no project scoping)
- `branching` - Database branching operations
- `storage` - Storage management
- `debug` - Debugging tools

## 🔄 n8n Integration

### Using the MCP HTTP Stream Transport

1. **Install n8n MCP Client Node** (when available)
2. **Configure Connection**:
   - **Endpoint**: `https://your-domain.com/mcp`
   - **API Key**: Your configured API key
   - **Transport**: `HTTP Stream`

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "type": "mcp-client",
      "config": {
        "endpoint": "https://sb-mcp.bifrotek.com/mcp",
        "apiKey": "your-api-key",
        "method": "tools/call",
        "tool": "list_tables"
      }
    }
  ]
}
```

## 🎯 Use Cases

- **Database Management**: Query and manage Supabase databases
- **AI Agents**: Provide database access to AI assistants
- **Automation**: Integrate with n8n workflows
- **Documentation**: Search Supabase docs programmatically
- **Edge Functions**: Deploy and manage serverless functions
- **Data Analysis**: Execute complex SQL queries
- **Schema Management**: Handle database migrations

## 🔗 Related Projects

- [MCP Framework](https://mcp-framework.com/) - Model Context Protocol
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [n8n](https://n8n.io/) - Workflow automation platform
- [Coolify](https://coolify.io/) - Self-hosted Heroku alternative

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n/issues)
- **Documentation**: [MCP Framework Docs](https://mcp-framework.com/docs/Transports/http-stream-transport)
- **Supabase**: [Official Documentation](https://supabase.com/docs)

---

**Made with ❤️ by [BIFROTEK](https://github.com/BIFROTEK-com)** 
