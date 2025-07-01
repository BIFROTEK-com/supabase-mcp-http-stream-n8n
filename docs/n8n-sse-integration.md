# n8n SSE Integration Status

## Current Status: ❌ Not Working

The SSE (Server-Sent Events) transport for n8n MCP integration is currently not functioning properly. Despite extensive debugging and following the SSE specification, n8n consistently drops the connection after receiving the `initialize` message.

## What We've Tried

### Server Implementation (`mcp-sse-server.mjs`)
- ✅ Implements SSE transport according to MCP specification
- ✅ Sends proper `event: endpoint` with session ID
- ✅ Handles JSON-RPC 2.0 messages correctly
- ✅ Returns correct protocol version (`2025-03-26`)
- ✅ Sends responses both via HTTP and SSE stream

### ngrok Configuration
We tried various ngrok configurations to disable buffering:
```bash
# Disable buffering for SSE
ngrok http 3333 --request-header-add "X-Accel-Buffering:no" --response-header-add "X-Accel-Buffering:no" --response-header-add "Cache-Control:no-cache"
```

### Known Issues

1. **Connection Drops**: n8n establishes SSE connection and sends `initialize` request but immediately drops the connection with `ECONNRESET`
2. **Community Reports**: Multiple users report similar issues in n8n community forums
3. **Common Solutions Don't Work**: 
   - Disabling gzip compression (common fix) doesn't resolve the issue
   - Using local connections bypassing ngrok still fails
   - Various header configurations attempted without success

## Error Pattern

```
🌊 SSE connection from: ::1
📤 Message received: {
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: { tools: {} },
    clientInfo: { name: '@n8n/n8n-nodes-langchain.mcpClientTool', version: '1' }
  },
  jsonrpc: '2.0',
  id: 0
}
❌ SSE error: Error: aborted
    at connResetException (node:internal/errors:720:14)
    at abortIncoming (node:_http_server:781:17)
    at socketOnClose (node:_http_server:775:3)
  code: 'ECONNRESET'
}
```

## Community Resources

- [n8n Community: MCP Client connection issues](https://community.n8n.io/t/mcp-client-can-t-reach-mcp-server-on-n8n/116772)
- [n8n Community: SSE and gzip compression](https://community.n8n.io/t/failed-to-connect-to-mcp-server-mcp-error-32001-request-timed-out/98691)
- [GitHub Issue: SSE transport deprecated in MCP](https://github.com/n8n-io/n8n/issues/16240)

## Help Wanted

If you have successfully integrated an MCP server with n8n using SSE transport, please contribute! We'd appreciate:
- Working examples
- Configuration tips
- Debugging insights
- Alternative approaches

## Alternative: HTTP Transport

While SSE doesn't work, the standard HTTP transport (`mcp-http-server.js`) provides a working alternative for MCP integration. 