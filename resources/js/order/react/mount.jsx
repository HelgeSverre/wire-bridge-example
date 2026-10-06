/** @jsxImportSource react */
import { createRoot } from 'react-dom/client';
import { LineItems } from './LineItems.jsx';

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const root = createRoot(host);

    root.render(<LineItems bridge={bridge} />);

    return {
        destroy: () => queueMicrotask(() => root.unmount()),
    };
}
