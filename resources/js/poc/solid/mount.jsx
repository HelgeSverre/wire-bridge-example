import { render } from 'solid-js/web';
import { AMLForm } from './AMLForm.jsx';

/**
 * Mount the Solid renderer into a wire:ignore host.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const dispose = render(() => <AMLForm bridge={bridge} />, host);

    return {
        destroy: dispose,
    };
}
