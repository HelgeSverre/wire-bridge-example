/**
 * The whole Lit integration, with no adapter shipped in the package.
 *
 * A ReactiveController is duck-typed: any object with `hostConnected` and
 * `hostDisconnected` works. Stencil, FAST and every other custom-element
 * compiler expose the same connected/disconnected lifecycle, so this shape
 * transfers to all of them unchanged.
 */
export class WireFieldController {
    /**
     * @param {import('lit').ReactiveControllerHost} host
     * @param {import('wire-bridge').WireBridge} bridge
     * @param {string} path field path relative to the bridge root
     */
    constructor(host, bridge, path) {
        this.host = host;
        this.binding = bridge.field(path);
        this.value = this.binding.getSnapshot();

        /** @type {(() => void) | null} */
        this.unsubscribe = null;

        host.addController(this);
    }

    hostConnected() {
        const sync = () => {
            this.value = this.binding.getSnapshot();
            this.host.requestUpdate();
        };

        this.unsubscribe = this.binding.subscribe(sync);

        // Subscriptions do not fire at subscribe time.
        sync();
    }

    hostDisconnected() {
        this.unsubscribe?.();
        this.unsubscribe = null;
    }

    /**
     * @param {unknown} nextValue
     * @returns {Promise<void>}
     */
    set(nextValue) {
        return this.binding.set(nextValue);
    }
}
