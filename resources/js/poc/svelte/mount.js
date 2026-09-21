import { mount as mountSvelte, unmount } from 'svelte';
import AMLForm from './AMLForm.svelte';

/**
 * Mount the Svelte renderer into a wire:ignore host.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const component = mountSvelte(AMLForm, {
        target: host,
        props: { bridge },
    });

    return {
        destroy: () => unmount(component),
    };
}
