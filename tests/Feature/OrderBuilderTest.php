<?php

namespace Tests\Feature;

use App\Livewire\OrderBuilder;
use Livewire\Livewire;
use Tests\TestCase;

class OrderBuilderTest extends TestCase
{
    public function test_it_starts_with_the_demo_order(): void
    {
        Livewire::test(OrderBuilder::class)
            ->assertSet('data', OrderBuilder::defaults())
            ->assertSet('ordersPlaced', 0);
    }

    public function test_totals_match_the_order(): void
    {
        $component = Livewire::test(OrderBuilder::class)
            ->set('data.items.0.qty', 2)
            ->set('data.delivery', 'express');

        $this->assertSame([
            'items' => 4,
            'subtotal' => 2 * 1290 + 2 * 149,
            'discount' => 0,
            'shipping' => 149,
            'total' => 2 * 1290 + 2 * 149 + 149,
        ], $component->instance()->totals());
    }

    public function test_a_valid_coupon_is_normalized_and_applied(): void
    {
        $component = Livewire::test(OrderBuilder::class)
            ->set('data.coupon.code', ' spring10 ')
            ->call('applyCoupon')
            ->assertSet('data.coupon', [
                'code' => 'SPRING10',
                'percentOff' => 10,
                'message' => 'SPRING10: 10% off',
            ]);

        $this->assertSame(159, $component->instance()->totals()['discount']);
    }

    public function test_an_unknown_coupon_gives_no_discount(): void
    {
        Livewire::test(OrderBuilder::class)
            ->set('data.coupon.code', 'nope')
            ->call('applyCoupon')
            ->assertSet('data.coupon.percentOff', 0)
            ->assertSet('data.coupon.message', 'NOPE is not a valid code');
    }

    public function test_an_empty_coupon_clears_the_message(): void
    {
        Livewire::test(OrderBuilder::class)
            ->call('applyCoupon')
            ->assertSet('data.coupon.message', null);
    }

    public function test_placing_an_order_requires_a_customer_and_items(): void
    {
        Livewire::test(OrderBuilder::class)
            ->set('data.customer.name', '')
            ->set('data.items', [])
            ->call('placeOrder')
            ->assertHasErrors(['data.customer.name', 'data.items'])
            ->assertSet('data.placedOrder', null);
    }

    public function test_placing_an_order_records_its_number_and_total(): void
    {
        Livewire::test(OrderBuilder::class)
            ->call('placeOrder')
            ->assertHasNoErrors()
            ->assertSet('data.placedOrder', ['number' => 'WB-1001', 'total' => 1290 + 2 * 149 + 79])
            ->call('placeOrder')
            ->assertSet('data.placedOrder.number', 'WB-1002');
    }

    public function test_the_order_page_renders(): void
    {
        $this->get('/order')
            ->assertOk()
            ->assertSeeLivewire(OrderBuilder::class);
    }
}
