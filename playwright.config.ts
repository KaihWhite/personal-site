import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  },
  projects: [
    // Chromium runs the full suite (static + game). Game tests rely on SwiftShader
    // launch args to get WebGL in headless mode — Chromium-only flags.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Pin to 1280×800 so resolveLayout is the identity (floorShift = 0).
        // devices['Desktop Chrome'] sets 1280×720 which activates real pit/spike
        // geometry in the new resolver — the test timings were written for 800px.
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args: [
            '--use-gl=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
    // Firefox/WebKit/mobile projects run static-pages.spec.ts only.
    // - Firefox/WebKit headless WebGL is unreliable across versions; the game itself
    //   is verified manually on these browsers (see Task 4).
    // - Mobile viewports auto-opt-out via useIsMobile (900px breakpoint), so the
    //   game canvas is intentionally absent — only the static fallback is exercised.
    {
      name: 'firefox',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /static-pages\.spec\.ts$/,
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
