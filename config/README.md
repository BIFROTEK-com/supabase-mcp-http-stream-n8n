# Konfigurationsdateien für Supabase MCP

Dieses Verzeichnis enthält Beispielkonfigurationen für den Supabase MCP Server.

## Dateien

- `server-config-example.env` - Beispiel für Umgebungsvariablen für den MCP Server
- `n8n-final-config.json` - Konfiguration für n8n MCP Integration
- `n8n-sse-config.json` - Konfiguration für n8n mit SSE-Unterstützung
- `sse-example.json` - Beispiel-JSON für SSE-Anfragen

## Verwendung

### Server-Konfiguration

Kopieren Sie `server-config-example.env` nach `.env` im Stammverzeichnis und passen Sie die Werte an:

```bash
cp config/server-config-example.env .env
# Bearbeiten Sie .env mit Ihren Werten
```

### n8n-Konfiguration

Importieren Sie die JSON-Dateien in n8n, um die MCP-Integration zu konfigurieren. 