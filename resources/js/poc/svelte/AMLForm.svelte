<script>
    import { untrack } from 'svelte';
    import { wireField } from 'wire-bridge/svelte';
    import { reportWriteFailure } from '../write.js';
    import OwnerRow from './OwnerRow.svelte';

    let { bridge: bridgeProp } = $props();

    // Runes mode treats every prop as reactive, but the bridge is fixed for the
    // lifetime of a mount — the directive creates a new component per host.
    // `untrack` states that deliberately instead of silencing a warning.
    const bridge = untrack(() => bridgeProp);

    // `wireField` returns a plain Svelte store, so `$name` auto-subscribes and
    // auto-unsubscribes with the component. No adapter lifecycle code here.
    const name = wireField(bridge, 'name');
    const country = wireField(bridge, 'country');
    const isPep = wireField(bridge, 'isPep');
    const city = wireField(bridge, 'address.city');
    const postalCode = wireField(bridge, 'address.postalCode');
    const owners = wireField(bridge, 'owners');
</script>

<div class="frontend-form" data-testid="svelte-form">
    <div class="field-grid">
        <label class="field">
            <span>Name</span>
            <input
                type="text"
                value={$name ?? ''}
                data-testid="svelte-name"
                oninput={(event) => reportWriteFailure(name.set(event.currentTarget.value))}
            />
        </label>

        <label class="field">
            <span>Country</span>
            <input
                type="text"
                value={$country ?? ''}
                data-testid="svelte-country"
                oninput={(event) => reportWriteFailure(country.set(event.currentTarget.value))}
            />
        </label>

        <label class="field field-checkbox">
            <input
                type="checkbox"
                checked={$isPep === true}
                data-testid="svelte-is-pep"
                oninput={(event) => reportWriteFailure(isPep.set(event.currentTarget.checked))}
            />
            <span>Politically exposed person</span>
        </label>

        <label class="field">
            <span>City</span>
            <input
                type="text"
                value={$city ?? ''}
                data-testid="svelte-city"
                oninput={(event) => reportWriteFailure(city.set(event.currentTarget.value))}
            />
        </label>

        <label class="field">
            <span>Postal code</span>
            <input
                type="text"
                value={$postalCode ?? ''}
                data-testid="svelte-postal-code"
                oninput={(event) => reportWriteFailure(postalCode.set(event.currentTarget.value))}
            />
        </label>
    </div>

    <fieldset class="owners">
        <legend>Owners</legend>

        {#each Array.isArray($owners) ? $owners : [] as owner, index}
            <OwnerRow
                {bridge}
                {index}
                namePath={`owners.${index}.name`}
                sharePath={`owners.${index}.share`}
            />
        {/each}
    </fieldset>

    <p class="frontend-footnote">
        Editing here writes through <code>wireField().set</code>; no request is sent.
    </p>
</div>
