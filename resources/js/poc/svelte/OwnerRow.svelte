<script>
    import { untrack } from 'svelte';
    import { wireField } from 'wire-bridge/svelte';
    import { reportWriteFailure } from '../write.js';

    // The paths are built by the parent, where the index is a loop local.
    let { bridge, index, namePath, sharePath } = $props();

    // A field binding's path is fixed for its lifetime, and so is the bridge.
    // See the note in AMLForm.svelte.
    const [name, share] = untrack(() => [
        wireField(bridge, namePath),
        wireField(bridge, sharePath),
    ]);

    function writeShare(event) {
        // Number inputs return strings; convert deliberately.
        const parsed = Number(event.currentTarget.value);

        if (Number.isFinite(parsed)) {
            reportWriteFailure(share.set(parsed));
        }
    }
</script>

<div class="owner-row">
    <label class="field">
        <span>Owner {index + 1} name</span>
        <input
            type="text"
            value={$name ?? ''}
            data-testid="svelte-owner-{index}-name"
            oninput={(event) => reportWriteFailure(name.set(event.currentTarget.value))}
        />
    </label>

    <label class="field">
        <span>Owner {index + 1} share</span>
        <input
            type="number"
            value={$share ?? ''}
            data-testid="svelte-owner-{index}-share"
            oninput={writeShare}
        />
    </label>
</div>
