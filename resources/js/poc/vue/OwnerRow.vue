<script setup>
import { useWireField } from 'wire-bridge/vue';
import { reportWriteFailure } from '../write.js';

const props = defineProps({
    bridge: { type: Object, required: true },
    index: { type: Number, required: true },
});

const [name, setName] = useWireField(props.bridge, `owners.${props.index}.name`);
const [share, setShare] = useWireField(props.bridge, `owners.${props.index}.share`);

function writeShare(event) {
    // Number inputs return strings; convert deliberately.
    const parsed = Number(event.currentTarget.value);

    if (Number.isFinite(parsed)) {
        reportWriteFailure(setShare(parsed));
    }
}
</script>

<template>
    <div class="owner-row">
        <label class="field">
            <span>Owner {{ index + 1 }} name</span>
            <input
                type="text"
                :value="name ?? ''"
                :data-testid="`vue-owner-${index}-name`"
                @input="reportWriteFailure(setName($event.currentTarget.value))"
            />
        </label>

        <label class="field">
            <span>Owner {{ index + 1 }} share</span>
            <input
                type="number"
                :value="share ?? ''"
                :data-testid="`vue-owner-${index}-share`"
                @input="writeShare"
            />
        </label>
    </div>
</template>
