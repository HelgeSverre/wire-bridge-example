<script setup>
import { useWireField } from 'wire-bridge/vue';
import { reportWriteFailure } from '../write.js';
import OwnerRow from './OwnerRow.vue';

const props = defineProps({
    bridge: { type: Object, required: true },
});

// `useWireField` returns a shallowRef because snapshots are deep-frozen.
// Vue unwraps top-level refs in the template, so these read as plain values.
const [name, setName] = useWireField(props.bridge, 'name');
const [country, setCountry] = useWireField(props.bridge, 'country');
const [isPep, setIsPep] = useWireField(props.bridge, 'isPep');
const [city, setCity] = useWireField(props.bridge, 'address.city');
const [postalCode, setPostalCode] = useWireField(props.bridge, 'address.postalCode');
const [owners] = useWireField(props.bridge, 'owners');
</script>

<template>
    <div class="frontend-form" data-testid="vue-form">
        <div class="field-grid">
            <label class="field">
                <span>Name</span>
                <input
                    type="text"
                    :value="name ?? ''"
                    data-testid="vue-name"
                    @input="reportWriteFailure(setName($event.currentTarget.value))"
                />
            </label>

            <label class="field">
                <span>Country</span>
                <input
                    type="text"
                    :value="country ?? ''"
                    data-testid="vue-country"
                    @input="reportWriteFailure(setCountry($event.currentTarget.value))"
                />
            </label>

            <label class="field field-checkbox">
                <input
                    type="checkbox"
                    :checked="isPep === true"
                    data-testid="vue-is-pep"
                    @input="reportWriteFailure(setIsPep($event.currentTarget.checked))"
                />
                <span>Politically exposed person</span>
            </label>

            <label class="field">
                <span>City</span>
                <input
                    type="text"
                    :value="city ?? ''"
                    data-testid="vue-city"
                    @input="reportWriteFailure(setCity($event.currentTarget.value))"
                />
            </label>

            <label class="field">
                <span>Postal code</span>
                <input
                    type="text"
                    :value="postalCode ?? ''"
                    data-testid="vue-postal-code"
                    @input="reportWriteFailure(setPostalCode($event.currentTarget.value))"
                />
            </label>
        </div>

        <fieldset class="owners">
            <legend>Owners</legend>

            <OwnerRow
                v-for="(owner, index) in Array.isArray(owners) ? owners : []"
                :key="index"
                :bridge="bridge"
                :index="index"
            />
        </fieldset>

        <p class="frontend-footnote">
            Editing here writes through <code>useWireField().set</code>; no request is sent.
        </p>
    </div>
</template>
