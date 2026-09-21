/**
 * Demonstration instrumentation. This is not part of the stable bridge API.
 *
 * Counters are updated by the demo controls and the frontend directive; the
 * inspector renders them into the diagnostics panel.
 *
 * @module poc/diagnostics
 */

/**
 * @typedef {object} DiagnosticsSnapshot
 * @property {number} bridgeRequestsInFlight
 * @property {number} pendingRendererMounts
 * @property {Record<string, number>} mountedRenderers
 * @property {number} livewireRequestsObserved
 * @property {string[]} log
 */

export function createDiagnostics({ maxLogLines = 60 } = {}) {
    let bridgeRequestsInFlight = 0;
    let pendingRendererMounts = 0;
    let livewireRequestsObserved = 0;

    /** @type {Map<string, number>} */
    const mountedRenderers = new Map();

    /** @type {Set<() => void>} */
    const listeners = new Set();

    /** @type {string[]} */
    const log = [];

    function emit() {
        for (const listener of [...listeners]) {
            try {
                listener();
            } catch (error) {
                console.error('[wire-bridge] diagnostics listener failed', error);
            }
        }
    }

    return {
        bridgeRequestStarted() {
            bridgeRequestsInFlight++;
            emit();
        },

        bridgeRequestFinished() {
            bridgeRequestsInFlight = Math.max(0, bridgeRequestsInFlight - 1);
            emit();
        },

        rendererMountStarted() {
            pendingRendererMounts++;
            emit();
        },

        rendererMounted(name) {
            pendingRendererMounts = Math.max(0, pendingRendererMounts - 1);
            mountedRenderers.set(name, (mountedRenderers.get(name) ?? 0) + 1);
            emit();
        },

        rendererMountCanceled() {
            pendingRendererMounts = Math.max(0, pendingRendererMounts - 1);
            emit();
        },

        rendererUnmounted(name) {
            const next = (mountedRenderers.get(name) ?? 0) - 1;

            if (next <= 0) {
                mountedRenderers.delete(name);
            } else {
                mountedRenderers.set(name, next);
            }

            emit();
        },

        livewireRequestObserved() {
            livewireRequestsObserved++;
            emit();
        },

        logLine(line) {
            log.unshift(`${new Date().toISOString().slice(11, 23)} ${line}`);

            if (log.length > maxLogLines) {
                log.length = maxLogLines;
            }

            emit();
        },

        /**
         * @returns {DiagnosticsSnapshot}
         */
        snapshot() {
            return {
                bridgeRequestsInFlight,
                pendingRendererMounts,
                mountedRenderers: Object.fromEntries(mountedRenderers),
                livewireRequestsObserved,
                log: [...log],
            };
        },

        /**
         * @param {() => void} listener
         * @returns {() => void}
         */
        subscribe(listener) {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
    };
}

export const diagnostics = createDiagnostics();
