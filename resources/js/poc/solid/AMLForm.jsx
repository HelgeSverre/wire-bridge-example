import { For } from 'solid-js';
import { createWireField } from 'wire-bridge/solid';
import { reportWriteFailure } from '../write.js';

/**
 * @param {{ bridge: import('wire-bridge').WireBridge }} props
 */
export function AMLForm(props) {
    const [name, setName] = createWireField(props.bridge, 'name');
    const [country, setCountry] = createWireField(props.bridge, 'country');
    const [isPep, setIsPep] = createWireField(props.bridge, 'isPep');
    const [city, setCity] = createWireField(props.bridge, 'address.city');
    const [postalCode, setPostalCode] = createWireField(props.bridge, 'address.postalCode');
    const [owners, setOwners] = createWireField(props.bridge, 'owners');

    return (
        <div class="frontend-form" data-testid="solid-form">
            <div class="field-grid">
                <label class="field">
                    <span>Name</span>
                    <input
                        type="text"
                        value={name() ?? ''}
                        data-testid="solid-name"
                        onInput={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                    />
                </label>

                <label class="field">
                    <span>Country</span>
                    <input
                        type="text"
                        value={country() ?? ''}
                        data-testid="solid-country"
                        onInput={(event) => reportWriteFailure(setCountry(event.currentTarget.value))}
                    />
                </label>

                <label class="field field-checkbox">
                    <input
                        type="checkbox"
                        checked={isPep() === true}
                        data-testid="solid-is-pep"
                        onInput={(event) => reportWriteFailure(setIsPep(event.currentTarget.checked))}
                    />
                    <span>Politically exposed person</span>
                </label>

                <label class="field">
                    <span>City</span>
                    <input
                        type="text"
                        value={city() ?? ''}
                        data-testid="solid-city"
                        onInput={(event) => reportWriteFailure(setCity(event.currentTarget.value))}
                    />
                </label>

                <label class="field">
                    <span>Postal code</span>
                    <input
                        type="text"
                        value={postalCode() ?? ''}
                        data-testid="solid-postal-code"
                        onInput={(event) => reportWriteFailure(setPostalCode(event.currentTarget.value))}
                    />
                </label>
            </div>

            <fieldset class="owners">
                <legend>Owners</legend>

                <For each={Array.isArray(owners()) ? owners() : []}>
                    {(owner, index) => <OwnerRow bridge={props.bridge} index={index()} />}
                </For>
            </fieldset>

            <p class="frontend-footnote">
                Editing here writes through <code>createWireField().set</code>; no request is sent.
            </p>
        </div>
    );
}

/**
 * @param {{ bridge: import('wire-bridge').WireBridge, index: number }} props
 */
function OwnerRow(props) {
    const [name, setName] = createWireField(props.bridge, `owners.${props.index}.name`);
    const [share, setShare] = createWireField(props.bridge, `owners.${props.index}.share`);

    return (
        <div class="owner-row">
            <label class="field">
                <span>Owner {props.index + 1} name</span>
                <input
                    type="text"
                    value={name() ?? ''}
                    data-testid={`solid-owner-${props.index}-name`}
                    onInput={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                />
            </label>

            <label class="field">
                <span>Owner {props.index + 1} share</span>
                <input
                    type="number"
                    value={share() ?? ''}
                    data-testid={`solid-owner-${props.index}-share`}
                    onInput={(event) => {
                        // Number inputs return strings; convert deliberately.
                        const parsed = Number(event.currentTarget.value);

                        if (Number.isFinite(parsed)) {
                            reportWriteFailure(setShare(parsed));
                        }
                    }}
                />
            </label>
        </div>
    );
}
