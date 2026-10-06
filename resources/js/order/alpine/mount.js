import { reportWriteFailure } from '../../poc/write.js';

/**
 * Delivery notes, in Alpine. No adapter and no dependency: Livewire already
 * ships Alpine, and the binding is subscribed in `init()` and released in
 * `destroy()`.
 *
 * @type {WeakMap<Element, import('wire-bridge').WireBridge>}
 */
const bridges = new WeakMap();

const MAX_LENGTH = 200;

let registered = false;

function registerOnce(Alpine) {
    if (registered) {
        return;
    }

    registered = true;

    Alpine.data('orderNotes', () => ({
        notes: '',

        /** @type {(() => void) | null} */
        unsubscribe: null,

        init() {
            const binding = bridges.get(this.$el.closest('[data-wire-frontend-host]')).field('notes');

            this.write = (value) => reportWriteFailure(binding.set(value.slice(0, MAX_LENGTH)));

            const sync = () => {
                this.notes = binding.getSnapshot() ?? '';
            };

            this.unsubscribe = binding.subscribe(sync);
            sync();
        },

        destroy() {
            this.unsubscribe?.();
            this.unsubscribe = null;
        },
    }));
}

/**
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const Alpine = window.Alpine;

    if (Alpine === undefined) {
        throw new Error('Alpine is not available on this page; Livewire normally provides it');
    }

    registerOnce(Alpine);
    bridges.set(host, bridge);

    host.innerHTML = `
        <div class="notes" x-data="orderNotes" data-testid="order-notes">
            <textarea rows="3" placeholder="Leave at the door, ring twice…" data-testid="notes"
                :value="notes" @input="write($event.currentTarget.value)"></textarea>
            <span class="muted notes-count" x-text="notes.length + ' / ${MAX_LENGTH}'"></span>
        </div>
    `;

    Alpine.initTree(host);

    return {
        destroy() {
            Alpine.destroyTree(host);
            bridges.delete(host);
            host.textContent = '';
        },
    };
}
