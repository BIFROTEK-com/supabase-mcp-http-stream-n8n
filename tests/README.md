# Testskripte für Supabase MCP

Dieses Verzeichnis enthält Testskripte für den Supabase MCP Server.

## Dateien

- `test-sse-local.js` - Lokaler Test für die SSE-Funktionalität

## Verwendung

### SSE-Test

Führen Sie den SSE-Test aus, um die SSE-Funktionalität lokal zu testen:

```bash
cd tests
node test-sse-local.js
```

Der Test startet einen lokalen MCP-Server auf Port 3334 und testet die SSE-Verbindung und Anfragen. 