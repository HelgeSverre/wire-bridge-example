import { reportWriteFailure } from '../write.js';

/**
 * The whole Alpine integration: no adapter shipped in the package and no
 * dependency installed, because Livewire already puts Alpine on the page.
 *
 * `init()` subscribes and `destroy()` unsubscribes — the same two lifecycle
 * hooks every other renderer here uses under a different name.
 */

/**
 * Alpine.data names are global and an x-data expression cannot carry a live
 * object, so each host records its bridge here and the component walks up to
 * find it. One registration serves every mount.
 *
 * @type {WeakMap<Element, import('wire-bridge').WireBridge>}
 */
const bridges = new WeakMap();

let registered = false;

function registerOnce(Alpine) {
    if (registered) {
        return;
    }

    registered = true;

    Alpine.data('wireField', () => ({
        value: null,

        /** @type {(() => void) | null} */
        unsubscribe: null,

        init() {
            const host = this.$el.closest('[data-wire-frontend-host]');
            const bridge = bridges.get(host);

            if (bridge === undefined) {
                throw new Error('No wire-bridge recorded for this Alpine host');
            }

            const binding = bridge.field(this.$el.dataset.wirePath);

            this.write = (nextValue) => reportWriteFailure(binding.set(nextValue));

            const sync = () => {
                this.value = binding.getSnapshot();
            };

            this.unsubscribe = binding.subscribe(sync);

            // Subscriptions do not fire at subscribe time.
            sync();
        },

        destroy() {
            this.unsubscribe?.();
            this.unsubscribe = null;
        },
    }));
}

/**
 * @param {string} testId
 * @param {string} path
 * @param {string} label
 */
function textField(testId, path, label) {
    return `
        <label class="field" x-data="wireField" data-wire-path="${path}">
            <span>${label}</span>
            <input type="text" data-testid="alpine-${testId}"
                :value="value ?? ''" @input="write($event.currentTarget.value)">
        </label>
    `;
}

/**
 * @param {number} index
 */
function ownerRow(index) {
    return `
        <div class="owner-row">
            <label class="field" x-data="wireField" data-wire-path="owners.${index}.name">
                <span>Owner ${index + 1} name</span>
                <input type="text" data-testid="alpine-owner-${index}-name"
                    :value="value ?? ''" @input="write($event.currentTarget.value)">
            </label>

            <label class="field" x-data="wireField" data-wire-path="owners.${index}.share">
                <span>Owner ${index + 1} share</span>
                <input type="number" data-testid="alpine-owner-${index}-share"
                    :value="value ?? ''"
                    @input="Number.isFinite(Number($event.currentTarget.value))
                        && write(Number($event.currentTarget.value))">
            </label>
        </div>
    `;
}

/**
 * Mount the Alpine renderer into a wire:ignore host.
 *
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

    const owners = bridge.field('owners').getSnapshot();
    const ownerRows = (Array.isArray(owners) ? owners : [])
        .map((owner, index) => ownerRow(index))
        .join('');

    host.innerHTML = `
        <div class="frontend-form" data-testid="alpine-form">
            <div class="field-grid">
                ${textField('name', 'name', 'Name')}
                ${textField('country', 'country', 'Country')}

                <label class="field field-checkbox" x-data="wireField" data-wire-path="isPep">
                    <input type="checkbox" data-testid="alpine-is-pep"
                        :checked="value === true" @input="write($event.currentTarget.checked)">
                    <span>Politically exposed person</span>
                </label>

                ${textField('city', 'address.city', 'City')}
                ${textField('postal-code', 'address.postalCode', 'Postal code')}
            </div>

            <fieldset class="owners">
                <legend>Owners</legend>
                ${ownerRows}
            </fieldset>

            <p class="frontend-footnote">
                Editing here writes through <code>binding.set</code>; no request is sent.
            </p>
        </div>
    `;

    Alpine.initTree(host);

    return {
        destroy() {
            // destroyTree runs each component's destroy(), which unsubscribes.
            Alpine.destroyTree(host);
            bridges.delete(host);
            host.textContent = '';
        },
    };
}
