import { createApp } from 'vue';
import AMLForm from './AMLForm.vue';

/**
 * Mount the Vue renderer into a wire:ignore host.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const app = createApp(AMLForm, { bridge });

    app.mount(host);

    return {
        destroy: () => app.unmount(),
    };
}
