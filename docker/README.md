# Docker-Konfigurationen für Supabase MCP

Dieses Verzeichnis enthält verschiedene Docker-Konfigurationen für den Supabase MCP Server.

## Dateien

- `Dockerfile` - Standard Docker-Konfiguration für den MCP Server
- `Dockerfile.sse` - Docker-Konfiguration mit SSE-Unterstützung für n8n
- `Dockerfile.standard` - Alternative Standard-Konfiguration
- `docker-compose.simple.yaml` - Einfache Docker Compose Konfiguration
- `docker-compose.coolify.yaml` - Docker Compose Konfiguration für Coolify
- `docker-compose-coolify-sse.yaml` - Docker Compose Konfiguration für Coolify mit SSE-Unterstützung
- `docker-compose.coolify-combined.yaml` - Kombinierte Docker Compose Konfiguration für Coolify mit Standard- und SSE-Instanz

## Verwendung

### Standard-Konfiguration

```bash
docker build -t supabase-mcp -f docker/Dockerfile .
docker run -p 3333:3333 -e SUPABASE_ACCESS_TOKEN=your-token -e SUPABASE_PROJECT_REF=your-ref supabase-mcp
```

### SSE-Konfiguration für n8n

```bash
docker build -t supabase-mcp-sse -f docker/Dockerfile.sse .
docker run -p 3333:3333 -e SUPABASE_ACCESS_TOKEN=your-token -e SUPABASE_PROJECT_REF=your-ref supabase-mcp-sse
```

### Coolify-Deployment

Für Coolify stehen drei Konfigurationen zur Verfügung:

1. **Standard**: Verwenden Sie `docker-compose.coolify.yaml`
2. **SSE**: Verwenden Sie `docker-compose-coolify-sse.yaml`
3. **Kombiniert**: Verwenden Sie `docker-compose.coolify-combined.yaml` für beide Instanzen

Die kombinierte Konfiguration startet zwei Dienste:
- `supabase-mcp`: Standard MCP Server
- `supabase-mcp-sse`: MCP Server mit SSE-Unterstützung auf einer separaten Subdomain 