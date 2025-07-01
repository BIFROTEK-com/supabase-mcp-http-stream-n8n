# Docker-Konfigurationen für Supabase MCP

Dieses Verzeichnis enthält verschiedene Docker-Konfigurationen für den Supabase MCP Server.

## Dateien

- `Dockerfile.standard` - Standard Docker-Konfiguration für den MCP Server
- `Dockerfile.sse` - Docker-Konfiguration mit SSE-Unterstützung für n8n
- `docker-compose-coolify-sse.yaml` - Docker Compose Konfiguration für Coolify mit SSE-Unterstützung

## Verwendung

### Standard-Konfiguration

```bash
docker build -t supabase-mcp -f docker/Dockerfile.standard .
docker run -p 3333:3333 -e SUPABASE_ACCESS_TOKEN=your-token -e SUPABASE_PROJECT_REF=your-ref supabase-mcp
```

### SSE-Konfiguration für n8n

```bash
docker build -t supabase-mcp-sse -f docker/Dockerfile.sse .
docker run -p 3333:3333 -e SUPABASE_ACCESS_TOKEN=your-token -e SUPABASE_PROJECT_REF=your-ref supabase-mcp-sse
```

### Coolify-Deployment

Kopieren Sie die `docker-compose-coolify-sse.yaml` in Ihr Coolify-Projekt und passen Sie die Umgebungsvariablen an. 