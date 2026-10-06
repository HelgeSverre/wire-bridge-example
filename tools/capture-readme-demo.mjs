/**
 * Capture the README demo GIF from the order builder page.
 *
 * Usage (from the app root, with the app served on 127.0.0.1:8457):
 *
 *   node tools/capture-readme-demo.mjs [outputDir]
 *
 * Produces a webm in the output directory (default tools/.capture); convert it
 * to a GIF with the ffmpeg commands printed at the end.
 *
 * The page's own request counter and "What PHP last rendered" panel are real;
 * this script only adds a cursor, change flashes, and a caption.
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

const APP_URL = 'http://127.0.0.1:8457/order';
const VIEWPORT = { width: 1280, height: 840 };

const OVERLAY_CSS = `
  .order-footer { display: none !important; }

  .wb-flash { animation: wb-flash .9s ease-out; border-radius: 6px; }
  @keyframes wb-flash { 0% { background: #ffd40055; box-shadow: 0 0 0 4px #ffd40055; } 100% { background: transparent; box-shadow: none; } }

  #wb-caption {
    position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%); z-index: 99999;
    padding: 10px 18px; border-radius: 999px; background: #f4f7fb; color: #0b0e14;
    font: 600 15px/1.2 var(--font-sans); box-shadow: 0 10px 30px rgb(0 0 0 / .25);
    transition: opacity .25s;
  }

  #wb-cursor {
    position: fixed; left: 0; top: 0; width: 18px; height: 18px; margin: -9px 0 0 -9px;
    border-radius: 999px; background: #ffd400; box-shadow: 0 0 0 4px #ffd40044, 0 0 16px #ffd400;
    pointer-events: none; z-index: 100000; transition: transform .35s cubic-bezier(.4, 0, .2, 1);
  }
  #wb-cursor.wb-click { animation: wb-click .25s ease-out; }
  @keyframes wb-click { 0% { box-shadow: 0 0 0 10px #ffd40088; } 100% { box-shadow: 0 0 0 4px #ffd40044; } }
`;

// Values worth flashing when they change: totals, badge, quantities, the
// request counter, and what PHP rendered.
const WATCHED = [
    '.totals dd',
    '.order-badge span',
    '.line-item-total',
    '[data-testid^="qty-"]',
    '[data-request-count]',
    '.php-state dd',
    '[data-testid="coupon-message"]',
].join(', ');

const browser = await chromium.launch({ channel: 'chromium' });
const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    recordVideo: { dir: videoDir, size: VIEWPORT },
});

const page = await context.newPage();
await page.goto(APP_URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__wireBridgePoc?.registered?.() === true);
await page.waitForSelector('[data-testid="order-badge"]');

await page.addStyleTag({ content: OVERLAY_CSS });

await page.evaluate((watched) => {
    const caption = document.createElement('div');
    caption.id = 'wb-caption';
    document.body.appendChild(caption);

    window.__wbCaption = (text) => {
        caption.textContent = text;
    };

    const cursor = document.createElement('div');
    cursor.id = 'wb-cursor';
    cursor.style.transform = 'translate(640px, 360px)';
    document.body.appendChild(cursor);

    window.__wbCursorTo = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        cursor.style.transform = `translate(${rect.left + rect.width / 2}px, ${rect.top + rect.height / 2}px)`;
    };

    window.__wbCursorClick = () => {
        cursor.classList.remove('wb-click');
        void cursor.offsetWidth;
        cursor.classList.add('wb-click');
    };

    const previous = new WeakMap();

    setInterval(() => {
        for (const element of document.querySelectorAll(watched)) {
            const text = element.textContent;
            const before = previous.get(element);

            if (before !== undefined && before !== text) {
                element.classList.remove('wb-flash');
                void element.offsetWidth;
                element.classList.add('wb-flash');
            }

            previous.set(element, text);
        }
    }, 50);
}, WATCHED);

const caption = (text) => page.evaluate((value) => window.__wbCaption(value), text);

const moveTo = async (selector) => {
    await page.evaluate((target) => window.__wbCursorTo(target), selector);
    await page.waitForTimeout(400);
};

const click = async (selector) => {
    await moveTo(selector);
    await page.evaluate(() => window.__wbCursorClick());
    await page.locator(selector).click();
};

const typeInto = async (selector, text) => {
    await click(selector);
    await page.locator(selector).pressSequentially(text, { delay: 80 });
};

// --- the take -----------------------------------------------------------------

await caption('Edit anywhere: every framework updates locally, no requests');
await page.waitForTimeout(1200);

// React: one more keyboard, then a mouse from the picker.
await click('[data-testid="more-keyboard"]');
await page.waitForTimeout(700);
await moveTo('[data-testid="add-item"]');
await page.evaluate(() => window.__wbCursorClick());
await page.locator('[data-testid="add-item"]').selectOption('mouse');
await page.waitForTimeout(800);

// Svelte: express delivery.
await click('[data-testid="delivery-express"]');
await page.waitForTimeout(700);

// Alpine: delivery notes.
await typeInto('[data-testid="notes"]', 'Ring twice');
await page.waitForTimeout(500);

// Svelte: a coupon code, still local.
await typeInto('[data-testid="coupon-code"]', 'spring10');
await page.waitForTimeout(1000);

// PHP action: one request validates the coupon and carries every pending edit.
await caption('Apply: one request; PHP validates the coupon and sees every edit');
await click('[data-testid="apply-coupon"]');
await page.waitForTimeout(2600);

// Blade wire:click: PHP validates and numbers the order.
await caption('Place order: PHP validates and numbers it; every island shows it');
await click('[data-testid="place-order"]');
await page.waitForTimeout(2800);

const requests = await page.locator('[data-request-count]').innerText();
console.log(`Livewire requests during the take: ${requests}`);

const video = page.video();
await context.close();
await browser.close();

const videoPath = await video.path();
const palette = join(outputDir, 'palette.png');
const gif = join(outputDir, 'demo.gif');

console.log(`video: ${videoPath}`);
console.log('\nConvert with:');
console.log(`  ffmpeg -y -i "${videoPath}" -vf "fps=10,scale=1000:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=128" "${palette}"`);
console.log(`  ffmpeg -y -i "${videoPath}" -i "${palette}" -lavfi "fps=10,scale=1000:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" -loop 0 "${gif}"`);
