# Docker Configurations

This directory contains Docker configurations for deploying the Supabase MCP Server.

## Available Configurations

### 1. Standard Docker Deployment (`docker-compose.yaml`)

For standard Docker deployments without reverse proxy:

```bash
docker-compose up -d
```

Features:
- Direct port mapping (3333:3333)
- Suitable for local development
- Works with VPS deployments
- Simple configuration

### 2. Coolify Deployment (`docker-compose.coolify.yaml`)

For deployments using Coolify with Traefik:

```bash
# Deploy via Coolify UI or:
docker-compose -f docker-compose.coolify.yaml up -d
```

Features:
- Traefik integration for automatic SSL
- No port exposure (Traefik handles routing)
- Requires `DOMAIN` environment variable
- Stricter rate limiting for production
- External network configuration

## Environment Variables

Required:
- `SUPABASE_ACCESS_TOKEN` - Your Supabase access token
- `SUPABASE_PROJECT_REF` - Your Supabase project reference

Optional:
- `MCP_PORT` - Server port (default: 3333)
- `MCP_API_KEYS` - Comma-separated API keys for authentication
- `MCP_RATE_LIMIT_REQUESTS` - Max requests per 15 minutes
- `MCP_RATE_LIMIT_GENERAL` - Max requests per minute
- `MCP_ALLOWED_ORIGINS` - CORS allowed origins
- `DOMAIN` - Your domain (required for Coolify deployment)

See `env.example` in the root directory for a complete list. 