import { test, expect } from '@playwright/test';

const PAGE_URL = '/order';
const UPDATE_PATTERN = /\/livewire-[^/]+\/update/;

function trackLivewireUpdates(page) {
    const updates = [];

    page.on('request', (request) => {
        if (UPDATE_PATTERN.test(request.url())) {
            updates.push(request);
        }
    });

    return updates;
}

/**
 * `Intl.NumberFormat('nb-NO')` groups thousands with a no-break space and PHP's
 * `number_format` with a plain one; compare amounts as digits only.
 */
async function amount(locator) {
    return Number((await locator.innerText()).replace(/[^\d]/g, ''));
}

async function openOrder(page) {
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto(PAGE_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__wireBridgePoc?.registered?.() === true, null, { timeout: 15_000 });

    for (const testId of ['order-items', 'order-totals', 'order-checkout', 'order-badge', 'order-notes']) {
        await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible();
    }

    return errors;
}

test.describe('order builder showcase', () => {
    test('edits in one framework update the others without a request', async ({ page }) => {
        const errors = await openOrder(page);
        const updates = trackLivewireUpdates(page);

        // React: keyboard 1 → 2. Vue totals and the Lit badge follow.
        await page.locator('[data-testid="more-keyboard"]').click();
        await expect(page.locator('[data-testid="qty-keyboard"]')).toHaveText('2');
        await expect.poll(() => amount(page.locator('[data-testid="total-subtotal"]'))).toBe(2 * 1290 + 2 * 149);

        // Svelte: express shipping.
        await page.locator('[data-testid="delivery-express"]').check();
        await expect.poll(() => amount(page.locator('[data-testid="total-shipping"]'))).toBe(149);
        await expect.poll(() => amount(page.locator('[data-testid="badge-total"]'))).toBe(2580 + 298 + 149);

        // Alpine: notes.
        await page.locator('[data-testid="notes"]').fill('Ring twice');

        // PHP has not seen any of it.
        await expect.poll(() => amount(page.locator('[data-testid="php-total"]'))).toBe(1290 + 298 + 79);
        await expect(page.locator('[data-testid="php-delivery"]')).toHaveText('standard');
        await expect(page.locator('[data-testid="request-pill"]')).toContainText('0');

        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });

    test('a PHP action applies the coupon and carries pending edits in one request', async ({ page }) => {
        const errors = await openOrder(page);
        const updates = trackLivewireUpdates(page);

        await page.locator('[data-testid="more-keyboard"]').click();
        await page.locator('[data-testid="coupon-code"]').fill('spring10');
        await page.locator('[data-testid="apply-coupon"]').click();

        await expect(page.locator('[data-testid="coupon-message"]')).toHaveText('SPRING10: 10% off');
        await expect(page.locator('[data-testid="coupon-code"]')).toHaveValue('SPRING10');

        const subtotal = 2580 + 298;
        const expectedTotal = subtotal - Math.round(subtotal * 0.1) + 79;

        await expect.poll(() => amount(page.locator('[data-testid="total-discount"]'))).toBe(Math.round(subtotal * 0.1));
        await expect.poll(() => amount(page.locator('[data-testid="total-total"]'))).toBe(expectedTotal);
        await expect.poll(() => amount(page.locator('[data-testid="badge-total"]'))).toBe(expectedTotal);

        // PHP saw the quantity edit and computed the same total.
        await expect(page.locator('[data-testid="php-coupon"]')).toHaveText('SPRING10');
        await expect.poll(() => amount(page.locator('[data-testid="php-total"]'))).toBe(expectedTotal);

        expect(updates).toHaveLength(1);
        expect(errors).toEqual([]);
    });

    test('an unknown coupon is rejected by PHP', async ({ page }) => {
        await openOrder(page);

        await page.locator('[data-testid="coupon-code"]').fill('nope');
        await page.locator('[data-testid="apply-coupon"]').click();

        await expect(page.locator('[data-testid="coupon-message"]')).toHaveText('NOPE is not a valid code');
        await expect(page.locator('[data-testid="total-discount"]')).toHaveCount(0);
    });

    test('placing an order validates in PHP and shows the order number everywhere', async ({ page }) => {
        const errors = await openOrder(page);

        await page.locator('[data-testid="customer-name"]').fill('');
        await page.locator('[data-testid="place-order"]').click();
        await expect(page.locator('.card-customer .field-error')).toContainText('name');
        await expect(page.locator('[data-testid="php-order"]')).toHaveText('—');

        await page.locator('[data-testid="customer-name"]').fill('Grace Hopper');
        await page.locator('[data-testid="place-order"]').click();

        await expect(page.locator('[data-testid="php-order"]')).toHaveText('WB-1001');
        await expect(page.locator('[data-testid="badge-placed"]')).toContainText('WB-1001');
        expect(errors).toEqual([]);
    });
});
