import { LitElement, html } from 'lit';
import { WireFieldController } from '../../poc/lit/wire-field-controller.js';
import { kr, totals } from '../pricing.js';

/**
 * The order summary in the page header. Lit has no package adapter: the same
 * ReactiveController the renderer matrix uses subscribes to the whole order.
 */
class OrderBadge extends LitElement {
    static properties = {
        bridge: { attribute: false },
    };

    // Render into light DOM so the page stylesheet applies.
    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        if (this.order === undefined) {
            this.order = new WireFieldController(this, this.bridge, '');
        }

        super.connectedCallback();
    }

    render() {
        const order = this.order.value;
        const sums = totals(order);
        const placed = order?.placedOrder;

        return html`
            <div class="order-badge" data-testid="order-badge">
                <span class="order-badge-count">${sums.items} ${sums.items === 1 ? 'item' : 'items'}</span>
                <span class="order-badge-total" data-testid="badge-total">${kr(sums.total)}</span>
                ${placed
                    ? html`<span class="order-badge-placed" data-testid="badge-placed">✓ ${placed.number}</span>`
                    : ''}
            </div>
        `;
    }
}

if (customElements.get('wire-bridge-order-badge') === undefined) {
    customElements.define('wire-bridge-order-badge', OrderBadge);
}

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const badge = document.createElement('wire-bridge-order-badge');
    badge.bridge = bridge;
    host.appendChild(badge);

    return {
        destroy: () => badge.remove(),
    };
}
