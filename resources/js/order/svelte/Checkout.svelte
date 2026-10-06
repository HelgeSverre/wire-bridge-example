<script>
    import { untrack } from 'svelte';
    import { wireField } from 'wire-bridge/svelte';
    import { reportWriteFailure } from '../../poc/write.js';
    import { kr } from '../pricing.js';

    let { bridge: bridgeProp } = $props();

    // The bridge is fixed for the lifetime of a mount.
    const bridge = untrack(() => bridgeProp);

    const delivery = wireField(bridge, 'delivery');
    const rates = wireField(bridge, 'shippingRates');
    const couponCode = wireField(bridge, 'coupon.code');
    const couponMessage = wireField(bridge, 'coupon.message');
    const percentOff = wireField(bridge, 'coupon.percentOff');

    const options = [
        { value: 'pickup', label: 'Pick up in store' },
        { value: 'standard', label: 'Standard (3–5 days)' },
        { value: 'express', label: 'Express (next day)' },
    ];

    let applying = $state(false);

    // A PHP action: sends any pending local edits plus the call in one request.
    async function applyCoupon() {
        applying = true;

        try {
            await bridge.call('applyCoupon');
        } catch (error) {
            console.error('[wire-bridge] applyCoupon failed', error);
        } finally {
            applying = false;
        }
    }
</script>

<div class="checkout" data-testid="order-checkout">
    <fieldset class="delivery">
        {#each options as option (option.value)}
            <label class="delivery-option" class:selected={$delivery === option.value}>
                <input
                    type="radio"
                    name="delivery"
                    value={option.value}
                    checked={$delivery === option.value}
                    data-testid={`delivery-${option.value}`}
                    onchange={() => reportWriteFailure(delivery.set(option.value))}
                />
                <span>{option.label}</span>
                <span class="muted">{$rates?.[option.value] === 0 ? 'Free' : kr($rates?.[option.value] ?? 0)}</span>
            </label>
        {/each}
    </fieldset>

    <div class="coupon">
        <input
            type="text"
            placeholder="Coupon code"
            value={$couponCode ?? ''}
            data-testid="coupon-code"
            oninput={(event) => reportWriteFailure(couponCode.set(event.currentTarget.value))}
        />
        <button type="button" class="button" data-testid="apply-coupon" disabled={applying} onclick={applyCoupon}>
            Apply <span class="tag">PHP</span>
        </button>
    </div>

    {#if $couponMessage}
        <p class="coupon-message" class:ok={$percentOff > 0} data-testid="coupon-message">{$couponMessage}</p>
    {/if}
</div>
