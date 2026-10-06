import { createApp } from 'vue';
import Totals from './Totals.vue';

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const app = createApp(Totals, { bridge });

    app.mount(host);

    return {
        destroy: () => app.unmount(),
    };
}
