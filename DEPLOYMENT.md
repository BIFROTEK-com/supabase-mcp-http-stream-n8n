# Deployment Guide für Supabase MCP Server

## Für Coolify Hosting

### 1. Vorbereitung

1. **Supabase Personal Access Token erstellen:**
   - Gehe zu [Supabase Dashboard → Account → Tokens](https://supabase.com/dashboard/account/tokens)
   - Erstelle einen neuen Token mit dem Namen "Pipecat MCP Server"
   - Kopiere den Token (wird nur einmal angezeigt!)

2. **Project Reference ermitteln:**
   - Öffne dein Supabase Projekt
   - Gehe zu Settings → General
   - Kopiere die "Project ID" (das ist deine `SUPABASE_PROJECT_REF`)

### 2. Coolify Deployment

1. **Repository in Coolify hinzufügen:**
   - Gehe zu deinem Coolify Dashboard
   - Erstelle eine neue Application
   - Verbinde dieses Git Repository
   - Branch: `main`

2. **Environment Variables in Coolify setzen:**
   ```
   SUPABASE_ACCESS_TOKEN=dein_personal_access_token
   SUPABASE_PROJECT_REF=dein_project_ref
   MCP_FEATURES=database,docs,development,functions
   MCP_READ_ONLY=true
   NODE_ENV=production
   ```

3. **Build Settings:**
   - Build Command: `npm run build`
   - Start Command: `node packages/mcp-server-supabase/dist/transports/stdio.js --project-ref=$SUPABASE_PROJECT_REF --read-only --features=$MCP_FEATURES`
   - Port: `3000` (optional, für Health Checks)

### 3. Für Pipecat Cloud Integration

Der MCP Server läuft über STDIO (Standard Input/Output), was perfekt für Pipecat Cloud ist:

```python
# Beispiel für Pipecat Cloud Integration
import subprocess
import json

# MCP Server starten
mcp_process = subprocess.Popen([
    'node', 
    'packages/mcp-server-supabase/dist/transports/stdio.js',
    '--project-ref=your_project_ref',
    '--read-only',
    '--features=database,docs,development,functions'
], 
stdin=subprocess.PIPE, 
stdout=subprocess.PIPE, 
stderr=subprocess.PIPE,
env={'SUPABASE_ACCESS_TOKEN': 'your_token'}
)

# MCP Request senden
request = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
}

mcp_process.stdin.write(json.dumps(request).encode() + b'\n')
mcp_process.stdin.flush()

# Response lesen
response = mcp_process.stdout.readline()
print(json.loads(response.decode()))
```

### 4. Verfügbare Tools für Voicebot

Mit der Standard-Konfiguration stehen folgende Tools zur Verfügung:

#### Database Tools:
- `list_tables` - Tabellen auflisten
- `execute_sql` - SQL Queries ausführen (read-only)
- `list_extensions` - Verfügbare Extensions

#### Documentation Tools:
- `search_docs` - Supabase Dokumentation durchsuchen

#### Development Tools:
- `get_project_url` - API URL abrufen
- `get_anon_key` - Anonymous Key abrufen
- `generate_typescript_types` - TypeScript Types generieren

#### Functions Tools:
- `list_edge_functions` - Edge Functions auflisten
- `deploy_edge_function` - Neue Functions deployen

### 5. Sicherheitsempfehlungen

- **Immer `--read-only` verwenden** für Produktionsumgebungen
- **Project Scoping aktivieren** mit `--project-ref`
- **Minimale Features** nur die benötigten Tools aktivieren
- **Environment Variables** niemals in Code committen

### 6. Testing lokal

```bash
# Environment Variables setzen
cp env.example .env
# .env editieren mit deinen Werten

# Docker Compose verwenden
docker-compose up --build

# Oder direkt mit Node.js
npm run build
node packages/mcp-server-supabase/dist/transports/stdio.js \
  --project-ref=your_project_ref \
  --read-only \
  --features=database,docs,development,functions
```

### 7. Monitoring & Debugging

- **Health Check Endpoint:** Port 3000 (wenn aktiviert)
- **Logs:** Coolify zeigt alle STDOUT/STDERR Logs
- **Debug Mode:** Entferne `--read-only` für Schreibzugriff (nur für Testing!)

### 8. Troubleshooting

**Problem:** `libpg-query` Fehler beim Build
**Lösung:** Dockerfile verwendet bereits `--ignore-scripts`

**Problem:** MCP Server startet nicht
**Lösung:** Überprüfe Environment Variables und Token Gültigkeit

**Problem:** Keine Verbindung zu Supabase
**Lösung:** Überprüfe `SUPABASE_PROJECT_REF` und Netzwerk-Zugriff 