/**
 * Capture the README demo GIF from the running wire-bridge PoC app.
 *
 * Usage (from the app root, with the PoC server on 127.0.0.1:8457):
 *
 *   node tools/capture-readme-demo.mjs [outputDir]
 *
 * Produces `demo.webm` in the output directory; convert to GIF with the
 * ffmpeg commands printed at the end.
 */

import { chromium } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.argv[2] ?? join(here, '.capture'));
const videoDir = join(outputDir, 'raw');

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(videoDir, { recursive: true });

const APP_URL = 'http://127.0.0.1:8457/poc/wire-bridge';

const THEME_CSS = `
  body { background: #0a0c11 !important; }
  .page { max-width: none !important; padding: 54px 26px 20px !important; }
  .page-header, .toolbar, .inspectors, .status, .second-instance, .frontend-footnote { display: none !important; }

  .panels { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 16px !important; align-items: stretch !important; }
  .panel { background: #11151d !important; border: 1px solid #242c3a !important; border-radius: 14px !important; padding: 14px 16px 16px !important; }
  .panel-header { margin-bottom: 12px !important; }
  .panel-header h2 { font-size: 1.02rem !important; font-weight: 900 !important; letter-spacing: .12em !important; text-transform: uppercase !important; color: #fff !important; }
  .panel-note { color: #7d8aa0 !important; font-size: .68rem !important; }
  .field span { color: #94a1b6 !important; font-size: .72rem !important; }
  .field input[type='text'], .field input[type='number'] {
    background: #0a0e15 !important; border: 1px solid #2a3342 !important; color: #f4f7fb !important;
    font-weight: 600 !important; transition: border-color .15s, box-shadow .15s !important;
  }
  .field input:focus, .field input:focus-visible { outline: none !important; }
  .owners { border-color: #232b38 !important; }
  .owners legend { color: #7d8aa0 !important; }

  [data-testid='panel-blade'] { border-color: #fb70a9 !important; box-shadow: 0 0 0 1px #fb70a955, 0 18px 50px -18px #fb70a9aa !important; }
  [data-testid='panel-blade'] h2 { color: #fb70a9 !important; }
  [data-testid='panel-blade'] input:focus { border-color: #fb70a9 !important; box-shadow: 0 0 0 2px #fb70a955 !important; }

  [data-testid='panel-preact'] { border-color: #8b5cf6 !important; box-shadow: 0 0 0 1px #8b5cf655, 0 18px 50px -18px #8b5cf6aa !important; }
  [data-testid='panel-preact'] h2 { color: #a78bfa !important; }
  [data-testid='panel-preact'] input:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 2px #8b5cf655 !important; }

  [data-testid='panel-solid'] { border-color: #38bdf8 !important; box-shadow: 0 0 0 1px #38bdf855, 0 18px 50px -18px #38bdf8aa !important; }
  [data-testid='panel-solid'] h2 { color: #7dd3fc !important; }
  [data-testid='panel-solid'] input:focus { border-color: #38bdf8 !important; box-shadow: 0 0 0 2px #38bdf855 !important; }

  .wb-flash { animation: wb-flash .55s ease-out !important; }
  @keyframes wb-flash {
    0%   { border-color: #ffd400 !important; box-shadow: 0 0 0 2px #ffd400aa, 0 0 26px #ffd40088 !important; transform: translateY(-2px); }
    100% { border-color: #ffd40000 !important; box-shadow: none !important; transform: translateY(0); }
  }
  .field input[type='checkbox'].wb-flash { animation: wb-flash-check .55s ease-out !important; }
  @keyframes wb-flash-check {
    0%   { box-shadow: 0 0 0 3px #ffd400cc, 0 0 26px #ffd40088 !important; }
    100% { box-shadow: none !important; }
  }

  #wb-titlebar {
    position: fixed; inset: 0 0 auto 0; height: 42px; display: flex; align-items: center; gap: 14px;
    padding: 0 18px; background: linear-gradient(180deg, #10141c, #0b0e14);
    border-bottom: 1px solid #232a37; font-family: var(--font-sans); z-index: 99999;
  }
  #wb-titlebar .wb-brand { font-weight: 800; letter-spacing: .02em; color: #fff; font-size: .95rem; }
  #wb-titlebar .wb-brand em { font-style: normal; color: #fb70a9; }
  #wb-titlebar .wb-claim { color: #8b98ad; font-size: .78rem; }
  #wb-titlebar .wb-spacer { flex: 1; }
  #wb-titlebar .wb-badge {
    display: flex; align-items: center; gap: 7px; padding: 4px 11px; border-radius: 999px;
    background: #0f2a1c; border: 1px solid #1f6b45; color: #6ee7a8; font-size: .76rem; font-weight: 700;
  }
  #wb-titlebar .wb-badge.bump { animation: wb-bump .5s ease-out; }
  @keyframes wb-bump { 0% { transform: scale(1.25); } 100% { transform: scale(1); } }

  #wb-cursor {
    position: fixed; left: 0; top: 0; width: 16px; height: 16px; margin: -8px 0 0 -8px;
    border-radius: 999px; background: #ffd400; box-shadow: 0 0 0 4px #ffd40033, 0 0 18px #ffd400aa;
    pointer-events: none; z-index: 100000; transition: transform .3s cubic-bezier(.4, 0, .2, 1);
  }
  #wb-cursor.wb-click { animation: wb-click .22s ease-out; }
  @keyframes wb-click { 0% { box-shadow: 0 0 0 4px #ffffffaa, 0 0 26px #ffd400; } 100% { box-shadow: 0 0 0 4px #ffd40033, 0 0 18px #ffd400aa; } }
`;

const browser = await chromium.launch({ channel: 'chromium' });
const context = await browser.newContext({
    viewport: { width: 1280, height: 560 },
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 560 } },
});

// Count Livewire update requests from before any page script runs.
await context.addInitScript(() => {
    window.__wbRequests = 0;
    window.__wbBump = null;

    const isUpdate = (url) => /\/livewire-[^/]+\/update/.test(String(url));

    const originalFetch = window.fetch;
    window.fetch = function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? '';
        if (isUpdate(url)) {
            window.__wbRequests++;
            window.__wbBump?.();
        }
        return originalFetch.apply(this, args);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (isUpdate(url)) {
            window.__wbRequests++;
            window.__wbBump?.();
        }
        return originalOpen.call(this, method, url, ...rest);
    };
});

const page = await context.newPage();
await page.goto(APP_URL, { waitUntil: 'load' });
await page.waitForSelector('[data-testid="solid-form"] input', { timeout: 15_000 });
await page.waitForFunction(() => window.__wireBridgePoc?.registered?.() === true);

await page.addStyleTag({ content: THEME_CSS });

await page.evaluate(() => {
    // Bold renderer labels.
    const labels = {
        'panel-blade': 'LIVEWIRE',
        'panel-preact': 'PREACT',
        'panel-solid': 'SOLID',
    };

    for (const [testId, label] of Object.entries(labels)) {
        document.querySelector(`[data-testid="${testId}"] h2`).textContent = label;
    }

    // Title bar with a live request counter.
    const bar = document.createElement('div');
    bar.id = 'wb-titlebar';
    bar.innerHTML = `
        <div class="wb-brand">wire·<em>bridge</em></div>
        <div class="wb-claim">one Livewire state &nbsp;→&nbsp; three renderers, editing together</div>
        <div class="wb-spacer"></div>
        <div class="wb-badge" id="wb-badge"><span id="wb-requests">0</span> Livewire requests</div>
    `;
    document.body.appendChild(bar);

    const requests = bar.querySelector('#wb-requests');
    const badge = bar.querySelector('#wb-badge');

    window.__wbBump = () => {
        requests.textContent = String(window.__wbRequests);
        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');
    };

    // Glowing cursor.
    const cursor = document.createElement('div');
    cursor.id = 'wb-cursor';
    cursor.style.transform = 'translate(640px, 300px)';
    document.body.appendChild(cursor);

    window.__wbCursorTo = (selector) => {
        const element = document.querySelector(selector);

        if (!element) {
            return;
        }

        const rect = element.getBoundingClientRect();

        cursor.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
    };

    window.__wbCursorClick = () => {
        cursor.classList.remove('wb-click');
        void cursor.offsetWidth;
        cursor.classList.add('wb-click');
    };

    // Flash fields whenever their value changes, so simultaneous updates pop.
    const previous = new WeakMap();

    setInterval(() => {
        for (const input of document.querySelectorAll('.panel input')) {
            const value = input.type === 'checkbox' ? input.checked : input.value;
            const before = previous.get(input);

            if (before !== undefined && before !== value) {
                input.classList.remove('wb-flash');
                void input.offsetWidth;
                input.classList.add('wb-flash');
            }

            previous.set(input, value);
        }
    }, 40);
});

// The page renders a second, compact AMLForm instance that reuses the same
// data-testid values, so every interaction is scoped to the first component.
const mainRoot = page.locator('[wire\\:id]').first();

const moveTo = async (selector) => {
    await page.evaluate((target) => window.__wbCursorTo(target), selector);
    await page.waitForTimeout(330);
};

const click = async (selector) => {
    await moveTo(selector);
    await page.evaluate(() => window.__wbCursorClick());
    await mainRoot.locator(selector).click();
};

const typeInto = async (selector, text) => {
    await click(selector);
    await page.keyboard.press('ControlOrMeta+A');
    await mainRoot.locator(selector).pressSequentially(text, { delay: 75 });
};

// --- the take -----------------------------------------------------------------

await page.waitForTimeout(800);

// 1. Blade (Livewire) name edit.
await typeInto('[data-testid="blade-name"]', 'Ada');
await page.waitForTimeout(650);

// 2. Preact country edit.
await typeInto('[data-testid="preact-country"]', 'SE');
await page.waitForTimeout(650);

// 3. Solid checkbox + nested address edits.
await click('[data-testid="solid-is-pep"]');
await page.waitForTimeout(400);
await typeInto('[data-testid="solid-city"]', 'Oslo');
await page.waitForTimeout(500);
await typeInto('[data-testid="solid-postal-code"]', '0001');
await page.waitForTimeout(1700);

const recordedRequests = await page.evaluate(() => window.__wbRequests);
console.log(`Livewire update requests during the take: ${recordedRequests}`);

const video = page.video();
await context.close();
await browser.close();

const videoPath = await video.path();
console.log(`video: ${videoPath}`);
console.log('\nConvert with:');
console.log(`  ffmpeg -y -i "${videoPath}" -vf "fps=13,scale=1200:-1:flags=lanczos,palettegen=stats_mode=diff" "${join(outputDir, 'palette.png')}"`);
console.log(`  ffmpeg -y -i "${videoPath}" -i "${join(outputDir, 'palette.png')}" -lavfi "fps=13,scale=1200:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 "${join(outputDir, 'demo.gif')}"`);
