import { mount as mountSvelte, unmount } from 'svelte';
import Checkout from './Checkout.svelte';

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const component = mountSvelte(Checkout, {
        target: host,
        props: { bridge },
    });

    return {
        destroy: () => unmount(component),
    };
}
