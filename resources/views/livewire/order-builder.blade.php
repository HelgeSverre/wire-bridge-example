{{-- Livewire owns every card; each framework owns one wire:ignore host inside it. --}}
<div class="order" data-component="order-builder">
    <header class="order-topbar">
        <div class="order-title">
            <h1>Order builder</h1>
            <p>Six frameworks, one Livewire component.</p>
        </div>

        <div wire:ignore wire:frontend="order-badge" wire:key="order-badge" data-wire-frontend-host="order-badge"></div>

        <div class="request-pill" wire:ignore data-testid="request-pill">
            <span data-request-count>0</span> <span data-request-label>Livewire requests</span>
        </div>
    </header>

    <div class="order-grid">
        <div class="order-col">
        <section class="card card-customer">
            <header class="card-header"><h2>Customer</h2><span class="chip chip-blade">Blade</span></header>

            <label class="order-field">
                <span>Name</span>
                <input type="text" wire:model="data.customer.name" data-testid="customer-name">
                @error('data.customer.name') <span class="field-error">{{ $message }}</span> @enderror
            </label>

            <label class="order-field">
                <span>Email</span>
                <input type="email" wire:model="data.customer.email" data-testid="customer-email">
                @error('data.customer.email') <span class="field-error">{{ $message }}</span> @enderror
            </label>
        </section>

        <section class="card card-notes">
            <header class="card-header"><h2>Delivery notes</h2><span class="chip chip-alpine">Alpine</span></header>
            <div wire:ignore wire:frontend="order-notes" wire:key="order-notes" data-wire-frontend-host="order-notes"></div>
        </section>
        </div>

        <section class="card card-items">
            <header class="card-header"><h2>Items</h2><span class="chip chip-react">React</span></header>
            <div wire:ignore wire:frontend="order-items" wire:key="order-items" data-wire-frontend-host="order-items"></div>
            @error('data.items') <span class="field-error">{{ $message }}</span> @enderror
        </section>

        <div class="order-col">
        <section class="card card-totals">
            <header class="card-header"><h2>Totals</h2><span class="chip chip-vue">Vue</span></header>
            <div wire:ignore wire:frontend="order-totals" wire:key="order-totals" data-wire-frontend-host="order-totals"></div>
        </section>

        <section class="card card-checkout">
            <header class="card-header"><h2>Delivery &amp; coupon</h2><span class="chip chip-svelte">Svelte</span></header>
            <div wire:ignore wire:frontend="order-checkout" wire:key="order-checkout" data-wire-frontend-host="order-checkout"></div>
        </section>
        </div>

        <section class="card card-php" data-testid="php-panel">
            <header class="card-header">
                <h2>What PHP last rendered</h2>
                <span class="chip chip-php">PHP</span>
            </header>
            <p class="muted card-note">Plain Blade. Changes only after a request reaches the server.</p>

            <dl class="php-state">
                <div><dt>Items</dt><dd data-testid="php-items">{{ $serverTotals['items'] }}</dd></div>
                <div><dt>Delivery</dt><dd data-testid="php-delivery">{{ $data['delivery'] }}</dd></div>
                <div><dt>Coupon</dt><dd data-testid="php-coupon">{{ $data['coupon']['percentOff'] > 0 ? $data['coupon']['code'] : '—' }}</dd></div>
                <div><dt>Total</dt><dd data-testid="php-total">{{ number_format($serverTotals['total'], 0, ',', ' ') }} kr</dd></div>
                <div><dt>Order</dt><dd data-testid="php-order">{{ $data['placedOrder']['number'] ?? '—' }}</dd></div>
            </dl>

            <button type="button" class="button button-primary" wire:click="placeOrder" data-testid="place-order">
                Place order <span class="tag">PHP</span>
            </button>
        </section>
    </div>
</div>
