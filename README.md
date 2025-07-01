# Supabase MCP HTTP Stream Server for n8n

> **One-Click Docker deployment** of Supabase MCP Server with native **HTTP Stream Transport** support for n8n, AI Agents, and modern automation workflows.

![supabase-mcp-demo](https://github.com/user-attachments/assets/3fce101a-b7d4-482f-9182-0be70ed1ad56)

## 🚀 What This Provides

This is a **production-ready Docker container** that hosts the official Supabase MCP Server with **HTTP Stream Transport** - the modern standard for connecting MCP servers to n8n and AI workflows.

### ✨ Key Features

- **🔄 HTTP Stream Transport** - Native n8n support (MCP 2025 standard)
- **🐳 One-Click Docker Deploy** - `docker-compose up` and you're running
- **🔐 Production Security** - API keys, rate limiting, CORS protection
- **📊 Health Monitoring** - Built-in health checks and status endpoints
- **⚡ Multi-Client Support** - One server, multiple n8n workflows
- **🛠 Complete Supabase API** - 50+ tools for database, auth, storage, functions

### 🎯 Perfect For

- **🤖 n8n Automation** - Native HTTP streaming, no SSE headaches
- **🏭 Production Teams** - Self-hosted, secure, scalable
- **🔧 AI Development** - Pipecat, custom agents, LLM workflows
- **📈 Enterprise** - Data control, compliance, custom deployment

---

## 🚀 Quick Start

### 1️⃣ One-Click Docker Deploy

```bash
# Option A: Use pre-built image (fastest)
curl -O https://raw.githubusercontent.com/BIFROTEK-com/supabase-mcp-http-stream-n8n/main/docker-compose.simple.yaml
curl -O https://raw.githubusercontent.com/BIFROTEK-com/supabase-mcp-http-stream-n8n/main/env.example

# Option B: Clone for full control
git clone https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n.git
cd supabase-mcp-http-stream-n8n
```

### 2️⃣ Configure Environment

```bash
cp env.example .env
# Edit .env with your Supabase credentials
```

**Minimum Configuration:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_your_token_here
SUPABASE_PROJECT_REF=your_project_ref_here
```

**Production Security (Recommended):**
```bash
MCP_API_KEYS="your-secret-key-1,your-secret-key-2"
MCP_ALLOWED_ORIGINS="https://yourdomain.com"
MCP_RATE_LIMIT_REQUESTS=50
```

### 3️⃣ Start Server

```bash
# Option A: Pre-built image
docker-compose -f docker-compose.simple.yaml up -d

# Option B: Build from source
docker-compose up --build
```

### 4️⃣ Test Your Server

```bash
# Test HTTP Stream endpoint
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key-1" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Check health
curl http://localhost:3333/health
```

**✅ Your server is now ready for n8n!**

---

## 🔌 n8n Integration

### Using with n8n MCP Client Node

1. **Install the MCP Client Node** in your n8n instance:
   ```bash
   npm install n8n-nodes-mcp
   ```

2. **Configure HTTP Stream Credentials** in n8n:
   - Connection Type: `HTTP Streamable`
   - Base URL: `http://your-server:3333/mcp`
   - API Key: `your-secret-key-1`

3. **Create Your First Workflow**:
   - Add an MCP Client node
   - Set Connection Type to `HTTP Streamable`
   - Select your credentials
   - Choose operation: `List Tools`
   - Execute to see all 50+ Supabase tools

![n8n MCP Client Configuration](https://github.com/user-attachments/assets/example-config-screenshot)

### Example: Database Operations in n8n

```json
{
  "operation": "Execute Tool",
  "tool": "execute_sql",
  "parameters": {
    "query": "SELECT * FROM users WHERE created_at > NOW() - INTERVAL '24 hours'"
  }
}
```

### Example: Project Management Workflow

1. **List Projects** - See all your Supabase projects
2. **Get Project Details** - Fetch configuration and status
3. **Execute SQL** - Run queries on your database
4. **Deploy Functions** - Update Edge Functions from n8n

---

## 🛠 Available Tools

The server provides 50+ tools organized into feature groups:

### 📊 Database Operations
- `execute_sql` - Run SQL queries
- `apply_migration` - Apply database migrations  
- `list_tables` - Get table schemas
- `list_extensions` - View installed extensions

### 🏗 Project Management
- `list_projects` - List all projects
- `get_project` - Get project details
- `create_project` - Create new projects
- `pause_project` / `restore_project` - Manage project lifecycle

### 🌿 Branching & Development
- `create_branch` - Create development branches
- `list_branches` - View all branches
- `merge_branch` - Merge to production
- `reset_branch` / `rebase_branch` - Branch management

### ⚡ Edge Functions
- `list_edge_functions` - View deployed functions
- `deploy_edge_function` - Deploy new functions

### 📚 Documentation & Support
- `search_docs` - Search Supabase documentation
- `get_advisors` - Get security/performance recommendations
- `get_logs` - Fetch project logs

### 🔧 Development Tools
- `generate_typescript_types` - Generate types for your database
- `get_project_url` / `get_anon_key` - Get connection details

> **Feature Groups**: Control which tools are available using `MCP_FEATURES=database,docs,development,functions`

---

## 🐳 Deployment Options

### Deploy to Coolify

1. **Create Application** in Coolify dashboard
2. **Repository**: `https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n.git`
3. **Build Pack**: Dockerfile
4. **Environment Variables**:
   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_your_token
   SUPABASE_PROJECT_REF=your_project_ref
   MCP_API_KEYS="$(openssl rand -hex 32)"
   DOMAIN=your-domain.com
   ```
5. **Deploy** and access at `https://your-domain.com/mcp`

### Deploy to Railway

```bash
# One-click deploy button
```

### Deploy to DigitalOcean

```bash
# Docker droplet with docker-compose
```

---

## ⚙️ Configuration

### Environment Variables

**Required:**
- `SUPABASE_ACCESS_TOKEN` - Your [Supabase Personal Access Token](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_REF` - Your Project ID from Project Settings

**Security (Production):**
- `MCP_API_KEYS` - Comma-separated API keys for authentication
- `MCP_RATE_LIMIT_REQUESTS` - Requests per 15 minutes (default: 100)
- `MCP_ALLOWED_ORIGINS` - CORS origins (default: "*")

**Features:**
- `MCP_FEATURES` - Feature groups: `database,docs,development,functions`
- `MCP_READ_ONLY` - Read-only mode (default: true)
- `MCP_PORT` - Server port (default: 3333)

### Feature Groups

Control available tools by setting `MCP_FEATURES`:

```bash
# Only database operations
MCP_FEATURES=database

# Database + documentation
MCP_FEATURES=database,docs

# All features (default)
MCP_FEATURES=database,docs,development,functions
```

---

## 🔒 Security

### Production Security Checklist

- ✅ **Set API Keys**: `MCP_API_KEYS="strong-key-1,strong-key-2"`
- ✅ **Enable CORS**: `MCP_ALLOWED_ORIGINS="https://yourdomain.com"`
- ✅ **Rate Limiting**: `MCP_RATE_LIMIT_REQUESTS=50`
- ✅ **Read-Only Mode**: `MCP_READ_ONLY=true` (for most use cases)
- ✅ **HTTPS**: Use reverse proxy with SSL certificates
- ✅ **Monitor Logs**: Watch for unusual activity

### API Authentication

Include your API key in all requests:

```bash
# HTTP Header
curl -H "X-API-Key: your-secret-key" http://localhost:3333/mcp

# Query Parameter (less secure)
curl "http://localhost:3333/mcp?api_key=your-secret-key"
```

---

## 🧪 Testing

### Run Security Tests

```bash
npm run test
# 27 security tests covering authentication, rate limiting, CORS, etc.
```

### Test with Different Clients

```bash
# Test with curl
curl -X POST http://localhost:3333/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Test with n8n MCP Client node
# Use your n8n instance with HTTP Streamable credentials

# Test health endpoint
curl http://localhost:3333/health
```

---

## 📈 Monitoring

### Health Checks

```bash
# Basic health
GET /health

# Detailed status
GET /status

# Metrics
GET /metrics
```

### Logging

```bash
# View container logs
docker-compose logs -f

# Structured JSON logging in production
NODE_ENV=production docker-compose up
```

---

## 🤝 Why HTTP Stream vs SSE?

| Transport | Status | n8n Support | Recommendation |
|-----------|--------|-------------|----------------|
| **HTTP Stream** | ✅ Current MCP 2025 standard | ✅ Native support | **Recommended** |
| SSE | ⚠️ Deprecated | ⚠️ Legacy only | Avoid for new projects |
| STDIO | ✅ Desktop AI tools | ❌ Not for n8n | Claude Desktop, Cursor |

**Why we built HTTP-first:**
- SSE has connection stability issues with n8n
- HTTP Stream is the official MCP 2025 standard
- Better performance and reliability
- Native n8n support without workarounds

---

## 🆘 Troubleshooting

### Common Issues

**Connection Refused:**
```bash
# Check if server is running
curl http://localhost:3333/health

# Check Docker logs
docker-compose logs -f
```

**Authentication Errors:**
```bash
# Verify API key
curl -H "X-API-Key: your-key" http://localhost:3333/mcp

# Check environment variables
docker-compose config
```

**n8n Integration Issues:**
- Ensure you're using `HTTP Streamable` connection type
- Verify the base URL includes `/mcp` endpoint
- Check API key in n8n credentials

---

## 📚 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/introduction)
- [n8n MCP Client Node](https://github.com/nerding-io/n8n-nodes-mcp)
- [Supabase API Documentation](https://supabase.com/docs)
- [Docker Compose Guide](https://docs.docker.com/compose/)

---

## 🤖 AI-Generated Code Notice

This project was programmed with Claude 4.0 Sonnet and includes comprehensive security testing. While extensively tested, AI-generated code may contain errors or oversights. Please review thoroughly before production use.

---

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

---

## 🌟 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

## ⭐ Support

If this helped you integrate Supabase with n8n, please give it a star! ⭐

For issues and questions:
- 🐛 [Report Bugs](https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n/issues)
- 💡 [Feature Requests](https://github.com/BIFROTEK-com/supabase-mcp-http-stream-n8n/discussions)
- 📧 [Email Support](mailto:support@bifrotek.com)

---

**🚀 Ready to supercharge your n8n workflows with Supabase? Deploy now!** 