import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30000, fullyParallel: false, workers: 1,
  testIgnore: ['**/native-webmcp.spec.ts', '**/native-companion.spec.ts'],
  use: { baseURL: 'http://localhost:3010', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'pnpm start --port 3010', url: 'http://localhost:3010', reuseExistingServer: false, timeout: 120000 },
});
