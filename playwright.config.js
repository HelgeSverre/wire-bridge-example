import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    timeout: 45_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    reporter: [['list']],

    use: {
        baseURL: 'http://127.0.0.1:8457',
        trace: 'retain-on-failure',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8457',
        url: 'http://127.0.0.1:8457/poc/wire-bridge',
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
