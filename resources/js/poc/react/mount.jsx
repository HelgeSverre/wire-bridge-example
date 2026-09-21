/** @jsxImportSource react */
import { createRoot } from 'react-dom/client';
import { AMLForm } from './AMLForm.jsx';

/**
 * Mount the React renderer into a wire:ignore host.
 *
 * This is also the Next / Remix / Waku story: their client layer is plain
 * React, so `'use client'` plus `wire-bridge/react` is the whole integration.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const root = createRoot(host);

    root.render(<AMLForm bridge={bridge} />);

    return {
        // React 18+ warns if unmount happens during its own render pass;
        // deferring one microtask keeps the directive's synchronous cleanup
        // out of that window.
        destroy: () => queueMicrotask(() => root.unmount()),
    };
}
