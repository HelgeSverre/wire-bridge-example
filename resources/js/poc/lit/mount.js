import { LitElement, html } from 'lit';
import { WireFieldController } from './wire-field-controller.js';
import { reportWriteFailure } from '../write.js';

/**
 * The bridge is handed in as a property rather than an attribute, so the
 * element is defined once and configured per instance.
 */
class WireBridgeAmlForm extends LitElement {
    static properties = {
        bridge: { attribute: false },
    };

    // Livewire's own stylesheet is global. Rendering into light DOM keeps the
    // demo visually consistent with the other panels; a real component would
    // likely keep its shadow root.
    createRenderRoot() {
        return this;
    }

    /**
     * Controllers are created once the bridge property is first set, which
     * happens before the element is connected in mount() below.
     */
    connectedCallback() {
        if (this.fields === undefined) {
            this.fields = {
                name: new WireFieldController(this, this.bridge, 'name'),
                country: new WireFieldController(this, this.bridge, 'country'),
                isPep: new WireFieldController(this, this.bridge, 'isPep'),
                city: new WireFieldController(this, this.bridge, 'address.city'),
                postalCode: new WireFieldController(this, this.bridge, 'address.postalCode'),
                owners: new WireFieldController(this, this.bridge, 'owners'),
            };
        }

        super.connectedCallback();
    }

    /**
     * @param {import('./wire-field-controller.js').WireFieldController} field
     * @returns {(event: Event) => void}
     */
    writeText(field) {
        return (event) => reportWriteFailure(field.set(/** @type {HTMLInputElement} */ (event.currentTarget).value));
    }

    render() {
        const { name, country, isPep, city, postalCode, owners } = this.fields;
        const ownerList = Array.isArray(owners.value) ? owners.value : [];

        return html`
            <div class="frontend-form" data-testid="lit-form">
                <div class="field-grid">
                    <label class="field">
                        <span>Name</span>
                        <input type="text" data-testid="lit-name"
                            .value=${name.value ?? ''} @input=${this.writeText(name)} />
                    </label>

                    <label class="field">
                        <span>Country</span>
                        <input type="text" data-testid="lit-country"
                            .value=${country.value ?? ''} @input=${this.writeText(country)} />
                    </label>

                    <label class="field field-checkbox">
                        <input type="checkbox" data-testid="lit-is-pep"
                            .checked=${isPep.value === true}
                            @input=${(event) => reportWriteFailure(isPep.set(event.currentTarget.checked))} />
                        <span>Politically exposed person</span>
                    </label>

                    <label class="field">
                        <span>City</span>
                        <input type="text" data-testid="lit-city"
                            .value=${city.value ?? ''} @input=${this.writeText(city)} />
                    </label>

                    <label class="field">
                        <span>Postal code</span>
                        <input type="text" data-testid="lit-postal-code"
                            .value=${postalCode.value ?? ''} @input=${this.writeText(postalCode)} />
                    </label>
                </div>

                <fieldset class="owners">
                    <legend>Owners</legend>
                    ${ownerList.map((owner, index) => html`
                        <wire-bridge-owner-row .bridge=${this.bridge} .index=${index}></wire-bridge-owner-row>
                    `)}
                </fieldset>

                <p class="frontend-footnote">
                    Editing here writes through <code>binding.set</code>; no request is sent.
                </p>
            </div>
        `;
    }
}

class WireBridgeOwnerRow extends LitElement {
    static properties = {
        bridge: { attribute: false },
        index: { attribute: false },
    };

    createRenderRoot() {
        return this;
    }

    connectedCallback() {
        if (this.fields === undefined) {
            this.fields = {
                name: new WireFieldController(this, this.bridge, `owners.${this.index}.name`),
                share: new WireFieldController(this, this.bridge, `owners.${this.index}.share`),
            };
        }

        super.connectedCallback();
    }

    render() {
        const { name, share } = this.fields;

        return html`
            <div class="owner-row">
                <label class="field">
                    <span>Owner ${this.index + 1} name</span>
                    <input type="text" data-testid="lit-owner-${this.index}-name"
                        .value=${name.value ?? ''}
                        @input=${(event) => reportWriteFailure(name.set(event.currentTarget.value))} />
                </label>

                <label class="field">
                    <span>Owner ${this.index + 1} share</span>
                    <input type="number" data-testid="lit-owner-${this.index}-share"
                        .value=${share.value ?? ''}
                        @input=${(event) => {
                            // Number inputs return strings; convert deliberately.
                            const parsed = Number(event.currentTarget.value);

                            if (Number.isFinite(parsed)) {
                                reportWriteFailure(share.set(parsed));
                            }
                        }} />
                </label>
            </div>
        `;
    }
}

// Custom element names are global, so registration must be idempotent: this
// module is loaded once per page but the directive may mount it many times.
if (customElements.get('wire-bridge-aml-form') === undefined) {
    customElements.define('wire-bridge-aml-form', WireBridgeAmlForm);
    customElements.define('wire-bridge-owner-row', WireBridgeOwnerRow);
}

/**
 * Mount the Lit renderer into a wire:ignore host.
 *
 * @param {Element} host
 * @param {import('wire-bridge').WireBridge} bridge
 * @returns {{ destroy: () => void }}
 */
export function mount(host, bridge) {
    const element = document.createElement('wire-bridge-aml-form');

    // Set the property before connecting, so connectedCallback sees the bridge.
    element.bridge = bridge;
    host.append(element);

    return {
        destroy: () => element.remove(),
    };
}
