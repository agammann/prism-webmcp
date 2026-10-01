import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', testMatch: '**/native-companion.spec.ts', workers: 1, timeout: 60000,
  use: { baseURL: process.env.PRISM_WEBMCP_URL || 'http://localhost:3023' },
  webServer: process.env.PRISM_WEBMCP_URL ? undefined : {
    command: 'pnpm start --port 3023', url: 'http://localhost:3023', reuseExistingServer: false, timeout: 120000,
  },
});
