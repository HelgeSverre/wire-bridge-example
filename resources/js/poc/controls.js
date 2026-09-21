/**
 * Bridge-originated controls.
 *
 * These buttons call `bridge.commit()` and `bridge.call()`. Blade-originated
 * actions (for example the server wrapper toggles) keep using Livewire's
 * normal `wire:click` behavior and are counted separately in the diagnostics.
 *
 * @module poc/controls
 */

import { diagnostics } from './diagnostics.js';

/**
 * Every renderer that can be mounted and unmounted locally. The toggle works
 * off the generic slot/host attributes, so this list is the only thing that
 * decides which renderers get a button — and cleanup is the directive's main
 * job, so all of them do.
 */
const TOGGLEABLE = ['preact', 'react', 'solid', 'svelte', 'vue', 'lit', 'alpine'];

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const container = document.createElement('div');
    container.className = 'controls';

    const actionButtons = [
        { id: 'commit', label: 'Commit', run: () => bridge.commit() },
        { id: 'normalize', label: 'Normalize (PHP)', run: () => bridge.call('normalize') },
        { id: 'resetForm', label: 'Reset form (PHP)', run: () => bridge.call('resetForm') },
        { id: 'replaceOwners', label: 'Replace owners (PHP)', run: () => bridge.call('replaceOwners') },
    ];

    const actionsBar = document.createElement('div');
    actionsBar.className = 'control-group';

    /** @type {Map<string, HTMLButtonElement>} */
    const buttons = new Map();

    for (const action of actionButtons) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label;
        button.setAttribute('data-action', action.id);
        button.setAttribute('data-testid', `control-${action.id}`);
        button.addEventListener('click', () => {
            void runAction(action.id, action.run);
        });
        actionsBar.appendChild(button);
        buttons.set(action.id, button);
    }

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save (PHP, demo)';
    saveButton.setAttribute('data-action', 'save');
    saveButton.setAttribute('data-testid', 'control-save');
    saveButton.addEventListener('click', () => {
        void runSave();
    });
    actionsBar.appendChild(saveButton);

    const lifecycleBar = document.createElement('div');
    lifecycleBar.className = 'control-group';

    for (const name of TOGGLEABLE) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-action', `toggle-${name}`);
        button.setAttribute('data-testid', `control-toggle-${name}`);
        button.addEventListener('click', () => {
            toggleFrontend(name);
        });
        lifecycleBar.appendChild(button);
        buttons.set(`toggle-${name}`, button);
    }

    const status = document.createElement('div');
    status.className = 'control-status';
    status.setAttribute('data-testid', 'control-status');

    const requestError = document.createElement('div');
    requestError.className = 'control-error';
    requestError.setAttribute('data-testid', 'request-error');

    container.append(actionsBar, lifecycleBar, status, requestError);
    host.appendChild(container);

    let inFlight = false;

    /** @type {WeakMap<Element, Node>} */
    const localTemplates = new WeakMap();

    const componentRoot = () => host.closest('[wire\\:id]');

    const slotFor = (name) => componentRoot()?.querySelector(`[data-wire-frontend-slot="${name}"]`) ?? null;

    const hostFor = (name) => componentRoot()?.querySelector(`[data-wire-frontend-host="${name}"]`) ?? null;

    function setBusy(busy) {
        inFlight = busy;

        for (const button of buttons.values()) {
            setDisabled(button, busy);
        }

        setDisabled(saveButton, busy);
    }

    function refreshLifecycleLabels() {
        for (const name of TOGGLEABLE) {
            const button = buttons.get(`toggle-${name}`);
            const slot = slotFor(name);

            if (slot === null) {
                setText(button, `${capitalize(name)} wrapper removed on the server`);
                setDisabled(button, true);
                continue;
            }

            const present = slot.querySelector(`[data-wire-frontend-host="${name}"]`) !== null;

            setDisabled(button, inFlight);
            setText(button, present ? `Unmount ${capitalize(name)}` : `Mount ${capitalize(name)}`);
        }
    }

    function toggleFrontend(name) {
        const slot = slotFor(name);

        if (slot === null) {
            status.textContent = `The ${name} wrapper is currently removed by the server.`;

            return;
        }

        const existing = slot.querySelector(`[data-wire-frontend-host="${name}"]`);

        if (existing !== null) {
            // Keep the host element so it can be recreated with the same
            // wire:ignore/wire:frontend attributes. The clone is deliberately
            // shallow: a deep clone would also copy whatever the renderer had
            // drawn inside, and remounting would then re-insert that stale
            // markup alongside the freshly mounted renderer.
            localTemplates.set(slot, existing.cloneNode(false));
            existing.remove();
            diagnostics.logLine(`local unmount: ${name}`);
            status.textContent = `Unmounted ${name} locally.`;
        } else {
            const template = localTemplates.get(slot);

            if (template === undefined) {
                status.textContent = `No remembered markup to remount ${name}; toggle the server wrapper instead.`;

                return;
            }

            slot.appendChild(template.cloneNode(true));
            diagnostics.logLine(`local mount: ${name}`);
            status.textContent = `Mounted ${name} locally.`;
        }

        refreshLifecycleLabels();
    }

    /**
     * @param {string} label
     * @param {() => Promise<unknown>} operation
     */
    async function runAction(label, operation) {
        if (inFlight) {
            return;
        }

        requestError.textContent = '';
        setBusy(true);
        diagnostics.bridgeRequestStarted();
        diagnostics.logLine(`bridge command: ${label}`);

        try {
            await operation();
            status.textContent = `${label} finished.`;
        } catch (error) {
            requestError.textContent = `request failed: ${error?.message ?? String(error)}`;
            diagnostics.logLine(`bridge command failed: ${label}`);
        } finally {
            diagnostics.bridgeRequestFinished();
            setBusy(false);
            refreshLifecycleLabels();
        }
    }

    async function runSave() {
        if (inFlight) {
            return;
        }

        const before = readSaveCount();

        requestError.textContent = '';
        setBusy(true);
        diagnostics.bridgeRequestStarted();
        diagnostics.logLine('bridge command: save');

        try {
            await bridge.call('save');

            const after = readSaveCount();

            if (after > before) {
                status.textContent = `save recorded receipt #${after} (demonstration only, no database write).`;
            } else {
                status.textContent = 'save returned without a new receipt — check the Blade validation errors.';
            }
        } catch (error) {
            requestError.textContent = `request failed: ${error?.message ?? String(error)}`;
            diagnostics.logLine('bridge command failed: save');
        } finally {
            diagnostics.bridgeRequestFinished();
            setBusy(false);
            refreshLifecycleLabels();
        }
    }

    function readSaveCount() {
        try {
            const count = bridge.wire.$get('saveCount');

            return typeof count === 'number' ? count : 0;
        } catch (error) {
            console.error('[wire-bridge] could not read saveCount through the $wire escape hatch', error);

            return 0;
        }
    }

    // Track server morphs so the local toggle labels stay accurate.
    const observer = new MutationObserver(() => {
        refreshLifecycleLabels();
    });

    const root = componentRoot();

    if (root !== null) {
        observer.observe(root, { childList: true, subtree: true });
    }

    refreshLifecycleLabels();

    return {
        destroy() {
            observer.disconnect();
            host.textContent = '';
        },
    };
}

/**
 * @param {string} value
 * @returns {string}
 */
function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Write-if-changed DOM helpers. The lifecycle labels are refreshed from a
 * MutationObserver; unconditional writes would mutate the observed subtree
 * again and starve the event loop with a self-triggering microtask loop.
 *
 * @param {Element} element
 * @param {string} text
 */
function setText(element, text) {
    if (element.textContent !== text) {
        element.textContent = text;
    }
}

/**
 * @param {HTMLButtonElement} element
 * @param {boolean} disabled
 */
function setDisabled(element, disabled) {
    if (element.disabled !== disabled) {
        element.disabled = disabled;
    }
}
