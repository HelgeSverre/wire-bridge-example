/** @jsxImportSource react */
import { useWireField } from 'wire-bridge/react';
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
    const [owners] = useWireField(bridge, 'owners');

    return (
        <div className="frontend-form" data-testid="react-form">
            <div className="field-grid">
                <label className="field">
                    <span>Name</span>
                    <input
                        type="text"
                        value={name ?? ''}
                        data-testid="react-name"
                        onChange={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                    />
                </label>

                <label className="field">
                    <span>Country</span>
                    <input
                        type="text"
                        value={country ?? ''}
                        data-testid="react-country"
                        onChange={(event) => reportWriteFailure(setCountry(event.currentTarget.value))}
                    />
                </label>

                <label className="field field-checkbox">
                    <input
                        type="checkbox"
                        checked={isPep === true}
                        data-testid="react-is-pep"
                        onChange={(event) => reportWriteFailure(setIsPep(event.currentTarget.checked))}
                    />
                    <span>Politically exposed person</span>
                </label>

                <label className="field">
                    <span>City</span>
                    <input
                        type="text"
                        value={city ?? ''}
                        data-testid="react-city"
                        onChange={(event) => reportWriteFailure(setCity(event.currentTarget.value))}
                    />
                </label>

                <label className="field">
                    <span>Postal code</span>
                    <input
                        type="text"
                        value={postalCode ?? ''}
                        data-testid="react-postal-code"
                        onChange={(event) => reportWriteFailure(setPostalCode(event.currentTarget.value))}
                    />
                </label>
            </div>

            <fieldset className="owners">
                <legend>Owners</legend>

                {(Array.isArray(owners) ? owners : []).map((owner, index) => (
                    <OwnerRow key={index} bridge={bridge} index={index} />
                ))}
            </fieldset>

            <p className="frontend-footnote">
                Editing here writes through <code>useWireField().set</code>; no request is sent.
            </p>
        </div>
    );
}

/**
 * @param {{ bridge: import('wire-bridge').WireBridge, index: number }} props
 */
function OwnerRow({ bridge, index }) {
    const [name, setName] = useWireField(bridge, `owners.${index}.name`);
    const [share, setShare] = useWireField(bridge, `owners.${index}.share`);

    return (
        <div className="owner-row">
            <label className="field">
                <span>Owner {index + 1} name</span>
                <input
                    type="text"
                    value={name ?? ''}
                    data-testid={`react-owner-${index}-name`}
                    onChange={(event) => reportWriteFailure(setName(event.currentTarget.value))}
                />
            </label>

            <label className="field">
                <span>Owner {index + 1} share</span>
                <input
                    type="number"
                    value={share ?? ''}
                    data-testid={`react-owner-${index}-share`}
                    onChange={(event) => {
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
