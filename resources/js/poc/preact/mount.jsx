import { render } from 'preact';
import { AMLForm } from './AMLForm.jsx';

/**
 * Mount the Preact renderer into a wire:ignore host.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    render(<AMLForm bridge={bridge} />, host);

    return {
        destroy() {
            render(null, host);
        },
    };
}
