/**
 * Browser-state inspector.
 *
 * A plain-JavaScript bridge subscriber: it reads snapshots and re-renders a
 * read-only JSON view. It never writes to the bridge.
 *
 * @module poc/inspector
 */

import { DEBUG_STATE } from 'wire-bridge';
import { diagnostics } from './diagnostics.js';
import { registry } from './runtime.js';

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @param {{ mode: string }} config
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge, config) {
    const container = document.createElement('div');
    container.className = 'inspector';

    const state = document.createElement('pre');
    state.className = 'json';
    state.setAttribute('data-testid', 'browser-state');
    container.appendChild(state);

    let diagnosticsBody = null;
    let unsubscribeDiagnostics = () => {};

    if (config.mode === 'full') {
        const details = document.createElement('details');
        details.className = 'diagnostics';
        details.setAttribute('data-testid', 'diagnostics');

        const summary = document.createElement('summary');
        summary.textContent = 'Developer diagnostics';
        details.appendChild(summary);

        diagnosticsBody = document.createElement('pre');
        diagnosticsBody.className = 'json json-small';
        diagnosticsBody.setAttribute('data-testid', 'diagnostics-body');
        details.appendChild(diagnosticsBody);

        container.appendChild(details);
    }

    host.appendChild(container);

    const renderState = () => {
        state.textContent = JSON.stringify(bridge.getSnapshot(), null, 2);
    };

    const renderDiagnostics = () => {
        if (diagnosticsBody === null) {
            return;
        }

        const snapshot = diagnostics.snapshot();
        const entries = registry.entries();

        const mounted = Object.entries(snapshot.mountedRenderers)
            .map(([name, count]) => `${name}=${count}`)
            .join(', ') || 'none';

        const lines = [
            `mounted renderers: ${mounted}${snapshot.pendingRendererMounts > 0 ? ` (mounting: ${snapshot.pendingRendererMounts})` : ''}`,
            `active bridges: ${entries.length}`,
            `root watchers: ${entries.filter((entry) => entry.bridge[DEBUG_STATE]().watcherActive).length}`,
            `field subscribers: ${entries.reduce((total, entry) => total + entry.bridge[DEBUG_STATE]().fieldSubscribers, 0)}`,
            `bridge revision: ${entries.map((entry) => `${entry.componentId.slice(0, 6)}=${entry.bridge[DEBUG_STATE]().revision}`).join(', ') || 'none'}`,
            `bridge-originated requests in flight: ${snapshot.bridgeRequestsInFlight}`,
            `Livewire requests observed (any source): ${snapshot.livewireRequestsObserved}`,
            '',
            'log:',
            ...snapshot.log,
        ];

        diagnosticsBody.textContent = lines.join('\n');
    };

    const unsubscribeState = bridge.subscribe(renderState);
    unsubscribeDiagnostics = diagnostics.subscribe(renderDiagnostics);

    // subscriptions do not fire immediately; render the current caches once
    renderState();
    renderDiagnostics();

    return {
        destroy() {
            unsubscribeState();
            unsubscribeDiagnostics();
            host.textContent = '';
        },
    };
}
