<script setup>
import { computed } from 'vue';
import { useWireField } from 'wire-bridge/vue';
import { kr, totals } from '../pricing.js';

const props = defineProps({
    bridge: { type: Object, required: true },
});

// `field('')` is the whole order. Read-only here: totals are derived, never written.
const [order] = useWireField(props.bridge, '');
const sums = computed(() => totals(order.value));
</script>

<template>
    <dl class="totals" data-testid="order-totals">
        <dt>Subtotal</dt>
        <dd data-testid="total-subtotal">{{ kr(sums.subtotal) }}</dd>

        <template v-if="sums.discount > 0">
            <dt class="discount">Discount {{ order.coupon.percentOff }}%</dt>
            <dd class="discount" data-testid="total-discount">−{{ kr(sums.discount) }}</dd>
        </template>

        <dt>Shipping</dt>
        <dd data-testid="total-shipping">{{ sums.shipping === 0 ? 'Free' : kr(sums.shipping) }}</dd>

        <div class="rule"></div>

        <dt class="grand">Total</dt>
        <dd class="grand" data-testid="total-total">{{ kr(sums.total) }}</dd>
    </dl>
</template>
