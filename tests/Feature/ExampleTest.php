<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_redirects_to_the_order_builder(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('order'));
    }

    public function test_the_wire_bridge_page_renders(): void
    {
        $this->get(route('poc.wire-bridge'))
            ->assertOk()
            ->assertSee('wire-bridge')
            ->assertSee('Last server-rendered state');
    }
}
