import { useWireField } from 'wire-bridge/preact';
import { reportWriteFailure } from '../write.js';

/**
 * @param {{ bridge: import('wire-bridge').WireBridge }} props
 */
export function AMLForm({ bridge }) {
    const [name, setName] = useWireField(bridge, 'name');
    const [country, setCountry] = useWireField(bridge, 'country');
    const [isPep, setIsPep] = useWireField(bridge, 'isPep');
    const [city, setCity] = useWireField(bridge, 'address.city');
    const [postalCode, setPostalCode] = useWireField(bridge, 'address.postalCode');
    const [owners, setOwners] = useWireField(bridge, 'owners');

    return (
        <div class="frontend-form" data-testid="preact-form">
            <div class="field-grid">
                <label class="field">
                    <span>Name</span>
                    <input
                        type="text"
                        value={name ?? ''}
                        data-testid="preact-name"
                        onInput={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                    />
                </label>

                <label class="field">
                    <span>Country</span>
                    <input
                        type="text"
                        value={country ?? ''}
                        data-testid="preact-country"
                        onInput={(event) => reportWriteFailure(setCountry(event.currentTarget.value))}
                    />
                </label>

                <label class="field field-checkbox">
                    <input
                        type="checkbox"
                        checked={isPep === true}
                        data-testid="preact-is-pep"
                        onInput={(event) => reportWriteFailure(setIsPep(event.currentTarget.checked))}
                    />
                    <span>Politically exposed person</span>
                </label>

                <label class="field">
                    <span>City</span>
                    <input
                        type="text"
                        value={city ?? ''}
                        data-testid="preact-city"
                        onInput={(event) => reportWriteFailure(setCity(event.currentTarget.value))}
                    />
                </label>

                <label class="field">
                    <span>Postal code</span>
                    <input
                        type="text"
                        value={postalCode ?? ''}
                        data-testid="preact-postal-code"
                        onInput={(event) => reportWriteFailure(setPostalCode(event.currentTarget.value))}
                    />
                </label>
            </div>

            <fieldset class="owners">
                <legend>Owners</legend>

                {Array.isArray(owners)
                    ? owners.map((owner, index) => (
                          <OwnerRow key={owner?.id ?? index} bridge={bridge} index={index} />
                      ))
                    : null}
            </fieldset>

            <p class="frontend-footnote">
                Editing here writes through <code>bridge.field().set()</code>; no request is sent.
            </p>
        </div>
    );
}

/**
 * One owner row is its own component so per-index hooks stay stable when the
 * owners array is replaced.
 *
 * @param {{ bridge: import('wire-bridge').WireBridge, index: number }} props
 */
function OwnerRow({ bridge, index }) {
    const [name, setName] = useWireField(bridge, `owners.${index}.name`);
    const [share, setShare] = useWireField(bridge, `owners.${index}.share`);

    return (
        <div class="owner-row">
            <label class="field">
                <span>Owner {index + 1} name</span>
                <input
                    type="text"
                    value={name ?? ''}
                    data-testid={`preact-owner-${index}-name`}
                    onInput={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                />
            </label>

            <label class="field">
                <span>Owner {index + 1} share</span>
                <input
                    type="number"
                    value={share ?? ''}
                    data-testid={`preact-owner-${index}-share`}
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
