// src/server.ts

import { parseArgs } from 'node:util';
import { createKeychainApp } from './transports/http.js';
import { runStdioTransport } from './transports/stdio.js';

const { values } = parseArgs({
  options: {
    stdio: { type: 'boolean', default: false },
    http: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  strict: false,
});

if (values.help) {
  process.stdout.write(`Usage: warden-mcp [OPTIONS]

Vaultwarden/Bitwarden MCP server for AI agents.

Options:
  --stdio   Use stdio transport (for desktop MCP hosts like Claude Code)
  --http    Use HTTP/SSE transport (default, listens on PORT, default 3005)
  --help    Show this help and exit

Environment:
  BW_HOST            Vaultwarden/Bitwarden server URL
  BW_CLIENTID        API client ID (API-key auth)
  BW_CLIENTSECRET    API client secret (API-key auth)
  BW_USER            Account email (username/password auth)
  BW_PASSWORD        Master password
  BW_BIN             Path to bw CLI binary (overrides auto-detection)
  PORT               HTTP port to listen on (default: 3005)
  WARDEN_MCP_HOST    Host/IP to bind in HTTP mode
  WARDEN_MCP_STDIO   Set to "true" to enable stdio without --stdio flag

Examples:
  BW_HOST=https://vault.example.com BW_PASSWORD=secret warden-mcp --stdio
  BW_HOST=https://vault.example.com BW_PASSWORD=secret PORT=3005 warden-mcp
`);
  process.exit(0);
}

const useStdio =
  values.stdio === true || process.env.WARDEN_MCP_STDIO === 'true';

async function main(): Promise<void> {
  if (useStdio) {
    await runStdioTransport();
    return;
  }

  const PORT = Number.parseInt(process.env.PORT ?? '3005', 10);
  const rawHost = process.env.WARDEN_MCP_HOST?.trim();
  const host = rawHost && rawHost.length > 0 ? rawHost : undefined;
  const app = createKeychainApp();
  const server = host
    ? app.listen(PORT, host, () => {
        console.log(`[warden-mcp] listening on http://${host}:${PORT}/sse`);
      })
    : app.listen(PORT, () => {
        console.log(`[warden-mcp] listening on http://localhost:${PORT}/sse`);
      });

  await new Promise<void>((resolve, reject) => {
    server.once('close', resolve);
    server.once('error', reject);
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
