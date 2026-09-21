import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

let manifest;

try {
    manifest = JSON.parse(readFileSync(join(here, '../../public/build/manifest.json'), 'utf8'));
} catch {
    throw new Error('public/build/manifest.json is missing — run "npm run build" before the browser suite');
}

const PREACT_CHUNK = manifest['resources/js/poc/preact/mount.jsx'].file;

const PAGE_URL = '/poc/wire-bridge';
const UPDATE_PATTERN = /\/livewire-[^/]+\/update/;

/**
 * Count application Livewire update requests only. Static assets, module
 * requests, and the Boost browser-log endpoint are not server synchronization.
 */
function trackLivewireUpdates(page) {
    const updates = [];

    page.on('request', (request) => {
        if (UPDATE_PATTERN.test(request.url())) {
            updates.push(request);
        }
    });

    return updates;
}

function collectPageErrors(page) {
    const errors = [];

    page.on('pageerror', (error) => errors.push(String(error)));

    return errors;
}

async function openDemo(page) {
    await page.goto(PAGE_URL, { waitUntil: 'load' });

    await page.waitForFunction(() => window.__wireBridgePoc?.registered?.() === true, null, { timeout: 15_000 });

    for (const renderer of RENDERERS) {
        await expect(page.locator(`[data-testid="${renderer}-form"] input`).first()).toBeVisible();
    }

    await expect(page.locator('[data-testid="control-commit"]')).toBeVisible();
}

/**
 * Every frontend renderer mounted on the page. Each one reads and writes the
 * same Livewire state through the same bridge, so an edit in any of them must
 * converge in all the others.
 */
const RENDERERS = ['preact', 'react', 'solid', 'svelte', 'vue', 'lit', 'alpine'];

async function mainComponentId(page) {
    return page.evaluate(() => document.querySelectorAll('[wire\\:id]')[0].getAttribute('wire:id'));
}

const mainRoot = (page) => page.locator('[wire\\:id]').first();
const secondRoot = (page) => page.locator('[wire\\:id]').nth(1);

async function browserState(root) {
    return JSON.parse(await root.locator('[data-testid="browser-state"]').innerText());
}

async function serverState(root) {
    return JSON.parse(await root.locator('[data-testid="server-state"]').innerText());
}

test.describe('wire-bridge acceptance', () => {
    test('compatibility: $watch returns a disposer that works while the component stays mounted', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const result = await page.evaluate(async () => {
            const componentId = document.querySelectorAll('[wire\\:id]')[0].getAttribute('wire:id');
            const wire = window.__wireBridgePoc.componentWire(componentId);

            let notifications = 0;
            const disposer = wire.$watch('data.name', () => {
                notifications++;
            });

            const disposerIsFunction = typeof disposer === 'function';

            wire.$set('data.name', 'Watcher-1', false);
            await new Promise((resolve) => setTimeout(resolve, 150));

            const afterFirstEdit = notifications;

            disposer();

            wire.$set('data.name', 'Watcher-2', false);
            await new Promise((resolve) => setTimeout(resolve, 150));

            return {
                disposerIsFunction,
                afterFirstEdit,
                afterDispose: notifications,
                stillMounted: document.querySelector(`[wire\\:id="${componentId}"]`) !== null,
                currentValue: wire.$get('data.name'),
            };
        });

        expect(result.disposerIsFunction).toBe(true);
        expect(result.afterFirstEdit).toBeGreaterThan(0);
        expect(result.afterDispose).toBe(result.afterFirstEdit);
        expect(result.stillMounted).toBe(true);
        expect(result.currentValue).toBe('Watcher-2');
        expect(errors).toEqual([]);
    });

    test('A1: editing Blade name converges to both frontends with zero update requests', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="blade-name"]').fill('Ada');

        await expect(root.locator('[data-testid="preact-name"]')).toHaveValue('Ada');
        await expect(root.locator('[data-testid="solid-name"]')).toHaveValue('Ada');
        await expect.poll(async () => (await browserState(root)).name).toBe('Ada');

        // The server inspector only changes after a server render.
        await page.waitForTimeout(250);
        expect((await serverState(root)).name).toBe('Helge');
        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });

    test('A2: editing Preact country converges to Blade and Solid with zero update requests', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="preact-country"]').fill('SE');

        await expect(root.locator('[data-testid="blade-country"]')).toHaveValue('SE');
        await expect(root.locator('[data-testid="solid-country"]')).toHaveValue('SE');

        await page.waitForTimeout(250);
        expect((await serverState(root)).country).toBe('NO');
        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });

    test('A3: Solid checkbox and nested address edits keep boolean and string types', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="solid-is-pep"]').check();
        await root.locator('[data-testid="solid-city"]').fill('Oslo');
        await root.locator('[data-testid="solid-postal-code"]').fill('0001');

        await expect(root.locator('[data-testid="preact-is-pep"]')).toBeChecked();
        await expect(root.locator('[data-testid="blade-is-pep"]')).toBeChecked();
        await expect(root.locator('[data-testid="preact-city"]')).toHaveValue('Oslo');
        await expect(root.locator('[data-testid="blade-postal-code"]')).toHaveValue('0001');

        const state = await browserState(root);
        expect(state.isPep).toBe(true);
        expect(state.address).toEqual({ city: 'Oslo', postalCode: '0001' });
        expect(typeof state.isPep).toBe('boolean');
        expect(typeof state.address.city).toBe('string');
        expect(typeof state.address.postalCode).toBe('string');
        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });

    test('A4: commit sends exactly one Livewire request and the server inspector catches up', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="blade-name"]').fill('Committed');
        await root.locator('[data-testid="control-commit"]').click();

        await expect.poll(async () => (await serverState(root)).name).toBe('Committed');
        expect(updates).toHaveLength(1);
        expect(errors).toEqual([]);
    });

    test('A5: PHP normalize reaches every view and triggers no feedback request', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="blade-name"]').fill('  Ada  ');
        await root.locator('[data-testid="blade-country"]').fill(' se ');

        await root.locator('[data-testid="control-normalize"]').click();

        await expect(root.locator('[data-testid="blade-name"]')).toHaveValue('Ada');
        await expect(root.locator('[data-testid="preact-name"]')).toHaveValue('Ada');
        await expect(root.locator('[data-testid="solid-name"]')).toHaveValue('Ada');
        await expect(root.locator('[data-testid="blade-country"]')).toHaveValue('SE');
        await expect(root.locator('[data-testid="preact-country"]')).toHaveValue('SE');
        await expect(root.locator('[data-testid="solid-country"]')).toHaveValue('SE');

        await expect.poll(async () => (await browserState(root)).country).toBe('SE');

        // No request follows the response: only the normalize call itself.
        await page.waitForTimeout(300);
        expect(updates).toHaveLength(1);
        expect(errors).toEqual([]);
    });

    test('A6: PHP reset replaces the root and existing bindings keep working without a remount', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="preact-name"]').fill('Kari');

        await page.evaluate(() => {
            const host = document.querySelector('[data-wire-frontend-host="preact"]');
            host.firstElementChild.__pocIdentityMarker = true;
        });

        await root.locator('[data-testid="control-resetForm"]').click();

        await expect(root.locator('[data-testid="blade-name"]')).toHaveValue('Helge');
        await expect(root.locator('[data-testid="preact-name"]')).toHaveValue('Helge');
        await expect(root.locator('[data-testid="solid-country"]')).toHaveValue('NO');

        // No remount: the rendered Preact tree is the same node as before.
        const sameNode = await page.evaluate(() => {
            const host = document.querySelector('[data-wire-frontend-host="preact"]');

            return host.firstElementChild.__pocIdentityMarker === true;
        });

        expect(sameNode).toBe(true);

        // Existing bindings still write.
        await root.locator('[data-testid="preact-name"]').fill('AfterReset');
        await expect(root.locator('[data-testid="blade-name"]')).toHaveValue('AfterReset');
        await expect(root.locator('[data-testid="solid-name"]')).toHaveValue('AfterReset');
        expect(errors).toEqual([]);
    });

    test('A7: changed bindings get new immutable snapshots; unrelated snapshots keep identity', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const result = await page.evaluate(async () => {
            const componentId = document.querySelectorAll('[wire\\:id]')[0].getAttribute('wire:id');
            const entry = window.__wireBridgePoc.registry.entries()
                .find((candidate) => candidate.componentId === componentId);

            const address = entry.bridge.field('address');
            const country = entry.bridge.field('country');

            const addressBefore = address.getSnapshot();
            const countryBefore = country.getSnapshot();

            let addressNotifications = 0;
            let countryNotifications = 0;

            address.subscribe(() => addressNotifications++);
            country.subscribe(() => countryNotifications++);

            await entry.bridge.field('address.city').set('Trondheim');
            await new Promise((resolve) => setTimeout(resolve, 50));

            const addressAfter = address.getSnapshot();

            return {
                addressChanged: addressAfter !== addressBefore,
                countrySameIdentity: country.getSnapshot() === countryBefore,
                rootFrozen: Object.isFrozen(addressAfter),
                nestedFrozen: Object.isFrozen(addressAfter.city ?? addressAfter),
                addressNotifications,
                countryNotifications,
            };
        });

        expect(result.addressChanged).toBe(true);
        expect(result.countrySameIdentity).toBe(true);
        expect(result.rootFrozen).toBe(true);
        expect(result.addressNotifications).toBe(1);
        expect(result.countryNotifications).toBe(0);
        expect(errors).toEqual([]);
    });

    test('A8: validation failure shows Blade errors, keeps edits, and does not increase the save count', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);

        const saveCountBefore = await root.locator('[data-testid="save-count"]').innerText();

        await root.locator('[data-testid="blade-country"]').fill('X');
        await root.locator('[data-testid="control-save"]').click();

        await expect(root.locator('[data-testid="validation-errors"]')).toContainText('2 characters');
        await expect(root.locator('[data-testid="save-count"]')).toHaveText(saveCountBefore);
        await expect(root.locator('[data-testid="request-error"]')).toHaveText('');

        // The edit stays visible everywhere: no adapter rollback.
        await expect(root.locator('[data-testid="blade-country"]')).toHaveValue('X');
        await expect(root.locator('[data-testid="preact-country"]')).toHaveValue('X');
        await expect(root.locator('[data-testid="solid-country"]')).toHaveValue('X');
        await expect.poll(async () => (await browserState(root)).country).toBe('X');
        expect(errors).toEqual([]);
    });

    test('A9: unmounting and remounting Preact drops its subscriptions and rereads current state', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);
        const componentId = await mainComponentId(page);

        const subscribersWithPreact = await page.evaluate((id) => {
            return window.__wireBridgePoc.debugStateFor(id).fieldSubscribers;
        }, componentId);

        await root.locator('[data-testid="control-toggle-preact"]').click();

        await expect(page.locator('[data-testid="preact-form"]')).toHaveCount(0);
        await expect(root.locator('[data-testid="control-toggle-preact"]')).toHaveText('Mount Preact');

        await expect.poll(async () => {
            return page.evaluate((id) => window.__wireBridgePoc.debugStateFor(id).fieldSubscribers, componentId);
        }).toBeLessThan(subscribersWithPreact);

        // Solid still works while Preact is unmounted.
        await root.locator('[data-testid="solid-name"]').fill('OnlySolid');
        await expect(root.locator('[data-testid="blade-name"]')).toHaveValue('OnlySolid');

        // Remount reads the current state immediately.
        await root.locator('[data-testid="control-toggle-preact"]').click();
        await expect(page.locator('[data-testid="preact-form"]')).toBeVisible();
        await expect(root.locator('[data-testid="preact-name"]')).toHaveValue('OnlySolid');
        expect(errors).toEqual([]);
    });

    test('repeated mount/unmount cycles return registry, watcher, and subscriber counts to baseline', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);
        const componentId = await mainComponentId(page);

        const baseline = await page.evaluate((id) => {
            const entries = window.__wireBridgePoc.registry.entries();
            const debug = window.__wireBridgePoc.debugStateFor(id);

            return {
                bridges: entries.length,
                renderers: { ...window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers },
                watchers: entries.filter((entry) => window.__wireBridgePoc.debugStateFor(entry.componentId).watcherActive).length,
                subscribers: debug.fieldSubscribers,
            };
        }, componentId);

        for (let cycle = 0; cycle < 3; cycle++) {
            await root.locator('[data-testid="control-toggle-preact"]').click();
            await expect(page.locator('[data-testid="preact-form"]')).toHaveCount(0);

            await root.locator('[data-testid="control-toggle-preact"]').click();
            await expect(page.locator('[data-testid="preact-form"]')).toBeVisible();
        }

        // Let the cleanup microtasks settle, then assert counters are restored.
        await expect.poll(async () => {
            return page.evaluate((id) => {
                const entries = window.__wireBridgePoc.registry.entries();

                return {
                    bridges: entries.length,
                    renderers: { ...window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers },
                    watchers: entries.filter((entry) => window.__wireBridgePoc.debugStateFor(entry.componentId).watcherActive).length,
                    subscribers: window.__wireBridgePoc.debugStateFor(id).fieldSubscribers,
                };
            }, componentId);
        }, { message: 'counters return to baseline after three mount/unmount cycles' }).toEqual(baseline);

        expect(errors).toEqual([]);
    });

    test('A10: server morph removal destroys exactly one renderer and leaves no zombie callbacks', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);

        await root.locator('[data-testid="server-toggle-preact"]').click();

        await expect(root.locator('[data-testid="panel-preact"]')).toHaveCount(0);
        await expect(page.locator('[data-testid="preact-form"]')).toHaveCount(0);

        await expect.poll(async () => {
            return page.evaluate(() => window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers.preact ?? 0);
        }).toBe(0);

        const logAfterRemoval = await page.evaluate(() => window.__wireBridgePoc.diagnostics.snapshot().log);
        expect(logAfterRemoval.filter((line) => line.includes('destroyed: preact'))).toHaveLength(1);

        // A later server render must not resurrect the destroyed renderer.
        await root.locator('[data-testid="solid-name"]').fill('NoZombie');
        await root.locator('[data-testid="control-commit"]').click();

        await expect.poll(async () => (await serverState(root)).name).toBe('NoZombie');
        await page.waitForTimeout(200);
        expect(await page.locator('[data-testid="preact-form"]').count()).toBe(0);

        const logAfterCommit = await page.evaluate(() => window.__wireBridgePoc.diagnostics.snapshot().log);
        expect(logAfterCommit.filter((line) => line.includes('destroyed: preact'))).toHaveLength(1);

        // Restore through the server: the host comes back and mounts again.
        await root.locator('[data-testid="server-toggle-preact"]').click();
        await expect(page.locator('[data-testid="preact-form"]')).toBeVisible();
        expect(errors).toEqual([]);
    });

    test('A11: removing the host during a lazy import never attaches late UI', async ({ page }) => {
        const errors = collectPageErrors(page);

        // Delay the Preact renderer chunk so the host can be removed mid-import.
        await page.route(`**/${PREACT_CHUNK}`, async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            await route.continue();
        }, { times: 1 });

        await page.goto(PAGE_URL, { waitUntil: 'load' });

        await expect(page.locator('[data-testid="control-toggle-preact"]')).toBeVisible({ timeout: 15_000 });

        // The Preact module is still in flight; remove its host now.
        await page.locator('[data-testid="control-toggle-preact"]').click();

        await page.waitForTimeout(2500);

        expect(await page.locator('[data-testid="preact-form"]').count()).toBe(0);

        const snapshot = await page.evaluate(() => ({
            renderers: window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers,
            pending: window.__wireBridgePoc.diagnostics.snapshot().pendingRendererMounts,
            log: window.__wireBridgePoc.diagnostics.snapshot().log,
        }));

        expect(snapshot.renderers.preact ?? 0).toBe(0);
        expect(snapshot.pending).toBe(0);
        expect(snapshot.log.some((line) => line.includes('mount canceled: preact'))).toBe(true);

        // The remaining renderers still work.
        const root = mainRoot(page);
        await root.locator('[data-testid="solid-country"]').fill('DK');
        await expect(root.locator('[data-testid="blade-country"]')).toHaveValue('DK');
        expect(errors).toEqual([]);
    });

    test('A12: navigating away and back leaves no duplicate bridges or watchers', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const before = await page.evaluate(() => {
            const entries = window.__wireBridgePoc.registry.entries();

            return {
                bridges: entries.length,
                renderers: window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers,
                watchers: entries.filter((entry) => window.__wireBridgePoc.debugStateFor(entry.componentId).watcherActive).length,
                subscribers: entries.reduce((total, entry) => {
                    return total + window.__wireBridgePoc.debugStateFor(entry.componentId).fieldSubscribers;
                }, 0),
            };
        });

        expect(before.bridges).toBe(2);
        expect(before.watchers).toBe(2);

        await page.locator('[data-testid="navigate-away"]').click();
        await expect(page.locator('[data-testid="second-page-body"]')).toBeVisible();

        await page.locator('[data-testid="navigate-back"]').click();
        await expect(page.locator('[data-testid="solid-form"] input').first()).toBeVisible();
        await page.waitForFunction(() => window.__wireBridgePoc?.registered?.() === true);

        // The counts must converge back to the baseline; poll so a renderer
        // that is still mounting does not make the assertion flaky.
        await expect.poll(async () => {
            return page.evaluate(() => {
                const entries = window.__wireBridgePoc.registry.entries();

                return {
                    bridges: entries.length,
                    renderers: window.__wireBridgePoc.diagnostics.snapshot().mountedRenderers,
                    watchers: entries.filter((entry) => window.__wireBridgePoc.debugStateFor(entry.componentId).watcherActive).length,
                    subscribers: entries.reduce((total, entry) => {
                        return total + window.__wireBridgePoc.debugStateFor(entry.componentId).fieldSubscribers;
                    }, 0),
                };
            });
        }, { message: 'bridge/renderer counts return to the pre-navigation baseline' }).toEqual(before);

        expect(errors).toEqual([]);
    });

    test('A13: a second AMLForm instance stays isolated', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const first = mainRoot(page);
        const second = secondRoot(page);

        await second.locator('[data-testid="blade-name"]').fill('SecondOnly');

        await expect(second.locator('[data-testid="blade-name"]')).toHaveValue('SecondOnly');
        await expect.poll(async () => (await browserState(second)).name).toBe('SecondOnly');

        // The first instance is untouched.
        await page.waitForTimeout(250);
        expect((await browserState(first)).name).toBe('Helge');
        await expect(first.locator('[data-testid="blade-name"]')).toHaveValue('Helge');
        await expect(first.locator('[data-testid="preact-name"]')).toHaveValue('Helge');
        await expect(first.locator('[data-testid="solid-name"]')).toHaveValue('Helge');
        expect((await serverState(first)).name).toBe('Helge');
        expect(errors).toEqual([]);
    });

    test('A14: a failed request keeps local edits, clears busy state, and can be retried', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);
        const commitButton = root.locator('[data-testid="control-commit"]');

        await root.locator('[data-testid="blade-name"]').fill('RetryMe');

        await page.route('**/livewire-*/update', (route) => route.abort('failed'), { times: 1 });

        await commitButton.click();

        await expect(root.locator('[data-testid="request-error"]')).toContainText('request failed');
        await expect(commitButton).toBeEnabled();

        // No homemade rollback: the local edit is still visible everywhere.
        await expect(root.locator('[data-testid="blade-name"]')).toHaveValue('RetryMe');
        await expect(root.locator('[data-testid="preact-name"]')).toHaveValue('RetryMe');
        await expect(root.locator('[data-testid="solid-name"]')).toHaveValue('RetryMe');
        expect((await serverState(root)).name).toBe('Helge');

        await commitButton.click();

        await expect.poll(async () => (await serverState(root)).name).toBe('RetryMe');
        await expect(root.locator('[data-testid="request-error"]')).toHaveText('');
        expect(errors).toEqual([]);
    });

    for (const field of ['name', 'country']) {
        const testId = field === 'name' ? 'blade-name' : 'blade-country';
        const newerValue = field === 'name' ? 'NewerThanServer' : 'FR';

        test(`A15: slow response with a newer ${field} edit converges to $wire without extra writebacks`, async ({ page }) => {
            const errors = collectPageErrors(page);
            const updates = trackLivewireUpdates(page);

            await openDemo(page);

            const root = mainRoot(page);
            const input = root.locator(`[data-testid="${testId}"]`);

            // Make the normalize round trip slow, then edit the same field
            // while it is in flight.
            await page.route('**/livewire-*/update', async (route) => {
                await new Promise((resolve) => setTimeout(resolve, 1200));

                await route.continue();
            }, { times: 1 });

            const responsePromise = page.waitForResponse((response) => UPDATE_PATTERN.test(response.url()));

            await root.locator('[data-testid="control-normalize"]').click();
            await page.waitForTimeout(300);
            await input.fill(newerValue);

            await responsePromise;
            await page.waitForTimeout(500);

            const settled = await page.evaluate((fieldName) => {
                const componentId = document.querySelectorAll('[wire\\:id]')[0].getAttribute('wire:id');
                const wire = window.__wireBridgePoc.componentWire(componentId);
                const entry = window.__wireBridgePoc.registry.entries()
                    .find((candidate) => candidate.componentId === componentId);

                return {
                    wireValue: wire.$get(`data.${fieldName}`),
                    bridgeValue: entry.bridge.getSnapshot()[fieldName],
                };
            }, field);

            // The bridge exposes exactly the state $wire holds; the installed
            // Livewire version decides which edit wins.
            expect(settled.bridgeValue).toBe(settled.wireValue);

            const diagnostics = await page.evaluate(() => window.__wireBridgePoc.diagnostics.snapshot());
            expect(diagnostics.bridgeRequestsInFlight).toBe(0);

            // Only the normalize click itself produced a request: no writeback loop.
            expect(updates).toHaveLength(1);
            expect(errors).toEqual([]);
        });
    }

    test('A16: a plain JavaScript subscriber sees changes and can unsubscribe', async ({ page }) => {
        const errors = collectPageErrors(page);

        await openDemo(page);

        const root = mainRoot(page);
        const componentId = await mainComponentId(page);

        await page.evaluate((id) => {
            const entry = window.__wireBridgePoc.registry.entries()
                .find((candidate) => candidate.componentId === id);

            window.__pocObserved = { notifications: 0, unsubscribe: null };
            window.__pocObserved.unsubscribe = entry.bridge.subscribe(() => {
                window.__pocObserved.notifications++;
            });
        }, componentId);

        await root.locator('[data-testid="preact-city"]').fill('ObserverCity');
        await page.waitForTimeout(200);

        const afterFirstEdit = await page.evaluate(() => window.__pocObserved.notifications);

        await page.evaluate(() => window.__pocObserved.unsubscribe());

        await root.locator('[data-testid="preact-city"]').fill('ObserverCity2');
        await page.waitForTimeout(200);

        const afterUnsubscribe = await page.evaluate(() => window.__pocObserved.notifications);

        expect(afterFirstEdit).toBeGreaterThan(0);
        expect(afterUnsubscribe).toBe(afterFirstEdit);
        expect(errors).toEqual([]);
    });

    test('A17: an edit in any renderer converges in every other renderer and Blade', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        for (const [step, source] of RENDERERS.entries()) {
            const value = `From-${source}-${step}`;

            await root.locator(`[data-testid="${source}-name"]`).fill(value);

            // Blade is the seventh reader: it is driven by wire:model off the
            // same Livewire state, not by the bridge.
            await expect(root.locator('[data-testid="blade-name"]')).toHaveValue(value);

            for (const target of RENDERERS) {
                await expect(root.locator(`[data-testid="${target}-name"]`)).toHaveValue(value);
            }

            await expect.poll(async () => (await browserState(root)).name).toBe(value);
        }

        // Seven renderers, seven edits, still no server round trip.
        await page.waitForTimeout(250);
        expect((await serverState(root)).name).toBe('Helge');
        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });

    test('A18: every renderer handles nested paths, booleans and array rows', async ({ page }) => {
        const errors = collectPageErrors(page);
        const updates = trackLivewireUpdates(page);

        await openDemo(page);

        const root = mainRoot(page);

        // A nested string path, written from the newest adapter.
        await root.locator('[data-testid="vue-city"]').fill('Trondheim');

        for (const target of RENDERERS) {
            await expect(root.locator(`[data-testid="${target}-city"]`)).toHaveValue('Trondheim');
        }

        // A boolean, written from a renderer with no package adapter at all.
        await root.locator('[data-testid="alpine-is-pep"]').check();

        for (const target of RENDERERS) {
            await expect(root.locator(`[data-testid="${target}-is-pep"]`)).toBeChecked();
        }

        // An indexed array row, written from the store-shaped adapter.
        await root.locator('[data-testid="svelte-owner-0-share"]').fill('42');

        for (const target of RENDERERS) {
            await expect(root.locator(`[data-testid="${target}-owner-0-share"]`)).toHaveValue('42');
        }

        const state = await browserState(root);
        expect(state.address.city).toBe('Trondheim');
        expect(state.isPep).toBe(true);
        expect(state.owners[0].share).toBe(42);
        // The number input converts deliberately; the type must survive.
        expect(typeof state.owners[0].share).toBe('number');
        expect(typeof state.isPep).toBe('boolean');
        expect(updates).toHaveLength(0);
        expect(errors).toEqual([]);
    });
});
