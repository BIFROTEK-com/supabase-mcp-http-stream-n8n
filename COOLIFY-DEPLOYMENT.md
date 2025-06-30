# Coolify Deployment Guide

Complete step-by-step guide to deploy the Supabase MCP Server on Coolify.

## Prerequisites

Before starting, ensure you have:
- A Coolify instance running
- A Supabase account with a project
- Git repository access: `https://github.com/Silverstar187/supabase-mcp-docker`

## Step 1: Sources Configuration

### 1.1 Add Git Source (if not already configured)
1. Navigate to **Sources** in your Coolify dashboard
2. Click **"+ New"** or **"Add Source"**
3. Select **"GitHub"** or **"Git"**
4. Configure your Git connection:
   - **Name:** `github-silverstar187`
   - **URL:** `https://github.com`
   - **Username:** Your GitHub username
   - **Token:** Your GitHub Personal Access Token
5. Click **"Validate & Save"**

### 1.2 Verify Source Connection
- Ensure the source shows as **"Connected"** with a green status
- Test the connection by clicking **"Test Connection"**

## Step 2: Projects Setup

### 2.1 Create New Project (Option A)
1. Go to **"Projects"** in the main navigation
2. Click **"+ New Project"**
3. Configure project settings:
   - **Name:** `supabase-mcp-server`
   - **Description:** `MCP Server for Supabase integration with AI assistants`
   - **Environment:** `production` (or your preferred environment)
4. Click **"Create Project"**

### 2.2 Use Existing Project (Option B)
1. Navigate to **"Projects"**
2. Select an existing project from the list
3. Proceed to the next step

## Step 3: Resources - Add Public Repository

### 3.1 Create New Resource
1. Inside your selected project, click **"+ New Resource"**
2. Select **"Public Repository"**

### 3.2 Repository Configuration
Fill in the repository details:

**Basic Settings:**
- **Repository URL:** `https://github.com/Silverstar187/supabase-mcp-docker`
- **Branch:** `main`
- **Name:** `supabase-mcp-server`

**Build Configuration:**
- **Build Pack:** `Docker Compose`
- **Docker Compose Location:** `docker-compose.yaml`
- **Base Directory:** `/` (root)

### 3.3 Environment Variables
Configure the following environment variables:

**Required Variables:**
```bash
SUPABASE_ACCESS_TOKEN=sbp_your_personal_access_token_here
SUPABASE_PROJECT_REF=your_project_reference_id_here
```

**Optional Variables (with defaults):**
```bash
MCP_FEATURES=database,docs,development,functions
MCP_READ_ONLY=true
NODE_ENV=production
MCP_PORT=3000
```

### 3.4 Advanced Settings

**Ports Configuration:**
- **Port:** `3000`
- **Exposed:** `Yes`
- **Protocol:** `HTTP`

**Health Check (Optional):**
- **Path:** `/health` (if implemented)
- **Port:** `3000`
- **Interval:** `30s`

**Resource Allocation:**
- **Memory:** `512MB` (minimum)
- **CPU:** `0.5` cores (minimum)

## Step 4: Deployment Process

### 4.1 Initial Deployment
1. Click **"Deploy"** button
2. Monitor the build logs in real-time
3. Wait for successful deployment status

### 4.2 Verify Deployment
1. Check the **"Logs"** tab for any errors
2. Verify the application is running:
   - Status should show **"Running"**
   - Health checks passing (if configured)
3. Note the assigned URL: `https://your-app.your-coolify-domain.com`

## Step 5: Getting Your Supabase Credentials

### 5.1 Personal Access Token
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Account Settings** → **Access Tokens**
3. Click **"Create new token"**
4. Name it: `Coolify MCP Server`
5. Copy the token (starts with `sbp_`)

### 5.2 Project Reference ID
1. Open your Supabase project
2. Go to **Settings** → **General**
3. Copy the **Project ID** (this is your project reference)

## Step 6: Testing the Deployment

### 6.1 Local Testing
Test the MCP server locally first:
```bash
# Clone and test locally
git clone https://github.com/Silverstar187/supabase-mcp-docker.git
cd supabase-mcp-docker
cp env.example .env
# Edit .env with your credentials
docker-compose -f docker-compose.yaml up --build
```

### 6.2 Production Testing
Once deployed on Coolify, test the MCP server:
```bash
# Test MCP tools list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
curl -X POST https://your-app.your-coolify-domain.com/mcp \
  -H "Content-Type: application/json" \
  -d @-
```

## Step 7: Integration Examples

### 7.1 For Pipecat Cloud
```python
import subprocess
import json

# Use your deployed Coolify URL
mcp_process = subprocess.Popen([
    'docker', 'run', '--rm', '-i',
    '-e', f'SUPABASE_ACCESS_TOKEN={token}',
    'your-coolify-registry-url/supabase-mcp-server',
    'node', 'packages/mcp-server-supabase/dist/transports/stdio.js',
    '--project-ref=your_project_ref',
    '--read-only'
], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
```

### 7.2 For n8n Workflows
```json
{
  "parameters": {
    "url": "https://your-app.your-coolify-domain.com/mcp",
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
            "sql": "SELECT COUNT(*) FROM users"
          }
        }
      }
    }
  },
  "type": "n8n-nodes-base.httpRequest"
}
```

## Troubleshooting

### Common Issues

**Build Fails:**
- Check if `docker-compose.yaml` exists in root
- Verify environment variables are set correctly
- Check build logs for specific error messages

**Container Won't Start:**
- Verify Supabase credentials are valid
- Check if PROJECT_REF is correct
- Ensure sufficient memory allocation (min 512MB)

**MCP Server Not Responding:**
- Check container logs for startup errors
- Verify port 3000 is exposed
- Test with simpler MCP request first

**Supabase Connection Issues:**
- Validate Personal Access Token
- Check Project Reference ID format
- Ensure network connectivity from Coolify to Supabase

### Support Resources
- [Coolify Documentation](https://coolify.io/docs)
- [Supabase MCP GitHub Issues](https://github.com/Silverstar187/supabase-mcp-docker/issues)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/introduction)

## Security Best Practices

1. **Environment Variables:** Never commit credentials to git
2. **Read-Only Mode:** Always use `--read-only` in production
3. **Project Scoping:** Limit access with `--project-ref`
4. **Feature Limiting:** Use `--features` to enable only needed tools
5. **Network Security:** Configure proper firewall rules in Coolify

---

**Repository:** [https://github.com/Silverstar187/supabase-mcp-docker](https://github.com/Silverstar187/supabase-mcp-docker)  
**Docker Compose File:** `docker-compose.yaml`  
**Build Pack:** Docker Compose 