<?php

namespace App\Livewire;

use Livewire\Component;

/**
 * The showcase: one order, with each part of the page owned by a different
 * frontend framework. Every island reads and writes this component's `$data`
 * through wire-bridge; PHP owns the coupon rules and order placement.
 */
class OrderBuilder extends Component
{
    /**
     * Coupon codes PHP accepts, mapped to their percentage discount.
     *
     * @var array<string, int>
     */
    public const COUPONS = [
        'SPRING10' => 10,
        'WELCOME25' => 25,
    ];

    /**
     * The single writable order state. Named `data` so it shares the page
     * runtime's `wire:frontend` directive root with the renderer matrix.
     *
     * @var array<string, mixed>
     */
    public array $data = [];

    /**
     * Demonstration order counter. No database is involved.
     */
    public int $ordersPlaced = 0;

    public function mount(): void
    {
        $this->data = self::defaults();
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'customer' => [
                'name' => 'Ada Lovelace',
                'email' => 'ada@example.com',
            ],
            'items' => [
                ['id' => 'keyboard', 'name' => 'Mechanical keyboard', 'price' => 1290, 'qty' => 1],
                ['id' => 'cable', 'name' => 'USB-C cable', 'price' => 149, 'qty' => 2],
            ],
            'delivery' => 'standard',
            'shippingRates' => ['pickup' => 0, 'standard' => 79, 'express' => 149],
            'coupon' => ['code' => '', 'percentOff' => 0, 'message' => null],
            'notes' => '',
            'placedOrder' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(): array
    {
        return [
            'data.customer.name' => ['required', 'string', 'max:120'],
            'data.customer.email' => ['required', 'email', 'max:190'],
            'data.items' => ['required', 'array', 'min:1'],
            'data.items.*.qty' => ['required', 'integer', 'min:1', 'max:99'],
            'data.delivery' => ['required', 'in:pickup,standard,express'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function validationAttributes(): array
    {
        return [
            'data.customer.name' => 'name',
            'data.customer.email' => 'email',
            'data.items' => 'items',
            'data.items.*.qty' => 'quantity',
            'data.delivery' => 'delivery',
        ];
    }

    /**
     * Validate the coupon code on the server and write the result back into
     * the shared state, where every island picks it up.
     */
    public function applyCoupon(): void
    {
        $code = strtoupper(trim((string) ($this->data['coupon']['code'] ?? '')));
        $percentOff = self::COUPONS[$code] ?? 0;

        $this->data['coupon'] = [
            'code' => $code,
            'percentOff' => $percentOff,
            'message' => match (true) {
                $code === '' => null,
                $percentOff > 0 => "{$code}: {$percentOff}% off",
                default => "{$code} is not a valid code",
            },
        ];
    }

    public function placeOrder(): void
    {
        $this->validate();

        $this->ordersPlaced++;

        $this->data['placedOrder'] = [
            'number' => 'WB-'.(1000 + $this->ordersPlaced),
            'total' => $this->totals()['total'],
        ];
    }

    /**
     * Server-side pricing, rendered in the "PHP" panel. The Vue island computes
     * the same numbers locally; this is what PHP sees after a request.
     *
     * @return array{items: int, subtotal: int, discount: int, shipping: int, total: int}
     */
    public function totals(): array
    {
        $items = collect($this->data['items'] ?? []);
        $subtotal = (int) $items->sum(fn (array $item) => (int) $item['price'] * (int) $item['qty']);
        $discount = (int) round($subtotal * (int) ($this->data['coupon']['percentOff'] ?? 0) / 100);
        $shipping = (int) ($this->data['shippingRates'][$this->data['delivery'] ?? ''] ?? 0);

        return [
            'items' => (int) $items->sum('qty'),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'shipping' => $shipping,
            'total' => $subtotal - $discount + $shipping,
        ];
    }

    public function render()
    {
        return view('livewire.order-builder', [
            'serverTotals' => $this->totals(),
        ]);
    }
}
