import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/native-webmcp.spec.ts',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: process.env.PRISM_WEBMCP_URL || 'http://localhost:3022',
    channel: process.env.PRISM_WEBMCP_BROWSER ? undefined : process.env.PRISM_WEBMCP_CHANNEL || 'chrome',
    launchOptions: { executablePath: process.env.PRISM_WEBMCP_BROWSER, args: ['--enable-features=WebMCP'], ignoreDefaultArgs: ['--disable-back-forward-cache'] },
    trace: 'retain-on-failure',
  },
  webServer: process.env.PRISM_WEBMCP_URL ? undefined : {
    command: 'pnpm start --port 3022', url: 'http://localhost:3022', reuseExistingServer: false, timeout: 120000,
  },
});
