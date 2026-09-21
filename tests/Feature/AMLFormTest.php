<?php

namespace Tests\Feature;

use App\Livewire\AMLForm;
use Livewire\Livewire;
use Tests\TestCase;

class AMLFormTest extends TestCase
{
    public function test_it_starts_with_the_synthetic_fixture(): void
    {
        Livewire::test(AMLForm::class)
            ->assertSet('data', AMLForm::defaults())
            ->assertSet('saveCount', 0)
            ->assertSet('saveReceipt', null)
            ->assertSet('showPreactWrapper', true)
            ->assertSet('showSolidWrapper', true);
    }

    public function test_normalize_trims_strings_and_uppercases_the_country(): void
    {
        Livewire::test(AMLForm::class)
            ->set('data.name', '  Ada  ')
            ->set('data.country', ' se ')
            ->set('data.address.city', ' Oslo ')
            ->set('data.address.postalCode', ' 0001 ')
            ->set('data.owners.0.name', '  Ada  ')
            ->call('normalize')
            ->assertReturned([
                'normalized' => true,
                'name' => 'Ada',
                'country' => 'SE',
                'city' => 'Oslo',
                'postalCode' => '0001',
            ])
            ->assertSet('data.name', 'Ada')
            ->assertSet('data.country', 'SE')
            ->assertSet('data.address.city', 'Oslo')
            ->assertSet('data.address.postalCode', '0001')
            ->assertSet('data.owners.0.name', 'Ada');
    }

    public function test_reset_form_replaces_the_root_and_clears_validation_errors(): void
    {
        Livewire::test(AMLForm::class)
            ->set('data.name', '')
            ->call('save')
            ->assertHasErrors('data.name')
            ->set('data.name', 'Changed')
            ->set('data.owners', [['id' => 'x', 'name' => 'X', 'share' => 1]])
            ->call('resetForm')
            ->assertSet('data', AMLForm::defaults())
            ->assertHasNoErrors();
    }

    public function test_save_validates_and_records_a_demonstration_receipt(): void
    {
        Livewire::test(AMLForm::class)
            ->call('save')
            ->assertHasNoErrors()
            ->assertSet('saveCount', 1)
            ->assertSet('saveReceipt.saveNumber', 1)
            ->assertSet('saveReceipt.data.name', 'Helge');

        // A second save increments the demonstration count.
        Livewire::test(AMLForm::class)
            ->call('save')
            ->call('save')
            ->assertSet('saveCount', 2)
            ->assertSet('saveReceipt.saveNumber', 2);
    }

    public function test_save_failure_does_not_increment_the_count(): void
    {
        Livewire::test(AMLForm::class)
            ->set('data.name', '')
            ->set('data.owners.0.share', 150)
            ->call('save')
            ->assertHasErrors(['data.name', 'data.owners.0.share'])
            ->assertSet('saveCount', 0)
            ->assertSet('saveReceipt', null);
    }

    public function test_validation_covers_the_documented_fields(): void
    {
        Livewire::test(AMLForm::class)
            ->set('data.name', '')
            ->set('data.country', 'NOR')
            ->set('data.isPep', 'not-a-boolean')
            ->set('data.address.postalCode', 5000)
            ->set('data.owners.0.name', '')
            ->set('data.owners.0.share', -1)
            ->call('save')
            ->assertHasErrors([
                'data.name' => 'required',
                'data.country' => 'size',
                'data.isPep' => 'boolean',
                'data.address.postalCode' => 'string',
                'data.owners.0.name' => 'required',
                'data.owners.0.share' => 'min',
            ])
            ->assertSet('saveCount', 0);
    }

    public function test_replace_owners_replaces_the_whole_array(): void
    {
        Livewire::test(AMLForm::class)
            ->call('replaceOwners')
            ->assertSet('data.owners', AMLForm::replacementOwners());
    }

    public function test_server_wrapper_toggles_flip_the_public_flags(): void
    {
        Livewire::test(AMLForm::class)
            ->call('togglePreactWrapper')
            ->assertSet('showPreactWrapper', false)
            ->call('togglePreactWrapper')
            ->assertSet('showPreactWrapper', true)
            ->call('toggleSolidWrapper')
            ->assertSet('showSolidWrapper', false);
    }
}
