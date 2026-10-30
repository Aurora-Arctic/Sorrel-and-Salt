// Preload for the sync's scripts (node --import): this devcontainer cannot start Chromium
// itself (musl libc), so chromium.launch() is replaced by a connection to the
// playwright-server compose service. exposeNetwork lets that remote browser reach the
// 127.0.0.1 servers the scripts start here. See .design-sync/NOTES.md.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../.ds-sync/package.json', import.meta.url));
const { chromium } = require('playwright');
const ws = process.env.PLAYWRIGHT_WS_ENDPOINT;
if (ws) chromium.launch = () => chromium.connect(ws, { exposeNetwork: '*' });
