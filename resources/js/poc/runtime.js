/**
 * The demo page runtime: owns the bridge registry, the renderer map, and the
 * single registration of the `wire:frontend` directive.
 *
 * The renderer map is application-owned and fixed; hosts cannot request
 * arbitrary URLs.
 *
 * @module poc/runtime
 */

import { createWireBridge, DEBUG_STATE } from 'wire-bridge';
import { createBridgeRegistry, createFrontendDirective } from 'wire-bridge/livewire';
import { diagnostics } from './diagnostics.js';

export const registry = createBridgeRegistry();

export const renderers = {
    preact: { load: () => import('./preact/mount.jsx') },
    react: { load: () => import('./react/mount.jsx') },
    solid: { load: () => import('./solid/mount.jsx') },
    svelte: { load: () => import('./svelte/mount.js') },
    vue: { load: () => import('./vue/mount.js') },
    lit: { load: () => import('./lit/mount.js') },
    alpine: { load: () => import('./alpine/mount.js') },
    inspector: { load: () => import('./inspector.js') },
    controls: { load: () => import('./controls.js') },
};

const frontendDirective = createFrontendDirective({
    getLivewire: () => window.Livewire,
    registry,
    renderers,
    root: 'data',
    hooks: {
        onMountStarted() {
            diagnostics.rendererMountStarted();
        },

        onMounted(name) {
            diagnostics.rendererMounted(name);
            diagnostics.logLine(`renderer mounted: ${name}`);
        },

        onUnmounted(name, el, { didMount }) {
            if (didMount) {
                diagnostics.rendererUnmounted(name);
            } else {
                diagnostics.rendererMountCanceled();
            }

            diagnostics.logLine(`renderer ${didMount ? 'destroyed' : 'mount canceled'}: ${name}`);
        },

        onError(error, context) {
            console.error('[wire-bridge] renderer error', context, error);
            diagnostics.logLine(`renderer error: ${error?.message ?? String(error)}`);
        },
    },
});

let registered = false;

function register() {
    if (registered || window.Livewire === undefined) {
        return;
    }

    try {
        frontendDirective.register();
        registered = true;

        // Observe Livewire requests separately from bridge-originated commands.
        window.Livewire.hook('request', () => {
            diagnostics.livewireRequestObserved();
        });

        diagnostics.logLine('wire:frontend directive registered');
    } catch (error) {
        console.error('[wire-bridge] directive registration failed', error);
        diagnostics.logLine(`directive registration failed: ${error?.message ?? String(error)}`);
    }
}

document.addEventListener('livewire:init', register, { once: true });

// Cover the case where the Livewire script tag already executed before this
// module was evaluated.
register();

// Instrumentation handle for the browser test suite and manual debugging.
// Nothing in the application reads from it.
window.__wireBridgePoc = {
    registry,
    renderers,
    diagnostics,
    createBridge: createWireBridge,
    componentWire: (componentId) => window.Livewire?.find(componentId) ?? null,
    debugStateFor: (componentId, root = 'data') => {
        const entry = registry.entries().find(
            (candidate) => candidate.componentId === componentId && candidate.root === root,
        );

        return entry === undefined ? null : entry.bridge[DEBUG_STATE]();
    },
    registered: () => registered,
};
