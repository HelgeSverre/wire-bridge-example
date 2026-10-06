<?php

namespace App\Livewire;

use Livewire\Component;

class AMLForm extends Component
{
    /**
     * The single writable form state. It is intentionally a plain array so that
     * the browser bridge can copy and freeze immutable projections of it.
     *
     * @var array<string, mixed>
     */
    public array $data = [
        'name' => 'Helge',
        'country' => 'NO',
        'isPep' => false,
        'address' => [
            'city' => 'Bergen',
            'postalCode' => '5000',
        ],
        'owners' => [
            ['id' => 'owner-1', 'name' => 'Helge', 'share' => 100],
        ],
    ];

    /**
     * Demonstration save counter. No database is involved.
     */
    public int $saveCount = 0;

    /**
     * Demonstration save receipt. No database is involved.
     *
     * @var array{saveNumber: int, savedAt: string, data: array<string, mixed>}|null
     */
    public ?array $saveReceipt = null;

    /**
     * Server-controlled visibility of the frontend wrappers. Toggling these
     * removes and reintroduces a wire:ignore host during a Livewire morph.
     */
    public bool $showPreactWrapper = true;

    public bool $showSolidWrapper = true;

    /**
     * The second instance on the page renders a reduced view.
     */
    public bool $compact = false;

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'name' => 'Helge',
            'country' => 'NO',
            'isPep' => false,
            'address' => [
                'city' => 'Bergen',
                'postalCode' => '5000',
            ],
            'owners' => [
                ['id' => 'owner-1', 'name' => 'Helge', 'share' => 100],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function replacementOwners(): array
    {
        return [
            ['id' => 'owner-2', 'name' => 'Kari', 'share' => 60],
            ['id' => 'owner-3', 'name' => 'Ola', 'share' => 40],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function rules(): array
    {
        return [
            'data.name' => ['required', 'string', 'max:255'],
            'data.country' => ['required', 'string', 'size:2'],
            'data.isPep' => ['boolean'],
            'data.address' => ['required', 'array'],
            'data.address.city' => ['required', 'string', 'max:255'],
            'data.address.postalCode' => ['required', 'string', 'max:32'],
            'data.owners' => ['required', 'array', 'min:1'],
            'data.owners.*.id' => ['required', 'string', 'max:255'],
            'data.owners.*.name' => ['required', 'string', 'max:255'],
            'data.owners.*.share' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function validationAttributes(): array
    {
        return [
            'data.name' => 'name',
            'data.country' => 'country',
            'data.isPep' => 'PEP status',
            'data.address.city' => 'city',
            'data.address.postalCode' => 'postal code',
            'data.owners.*.id' => 'owner id',
            'data.owners.*.name' => 'owner name',
            'data.owners.*.share' => 'owner share',
        ];
    }

    /**
     * Postal codes the demo can resolve. Deliberately tiny: it exists to show a
     * server-side change flowing back into every renderer after a commit.
     *
     * @var array<string, string>
     */
    private const CITIES_BY_POSTAL_CODE = [
        '0150' => 'Oslo',
        '4006' => 'Stavanger',
        '5003' => 'Bergen',
        '7010' => 'Trondheim',
        '9008' => 'Tromsø',
    ];

    /**
     * When a request changes the postal code to one PHP knows, fill in the city.
     */
    public function updatedData(mixed $value, string $key): void
    {
        if (! in_array($key, ['address', 'address.postalCode'], true)) {
            return;
        }

        $postalCode = trim((string) ($this->data['address']['postalCode'] ?? ''));
        $city = self::CITIES_BY_POSTAL_CODE[$postalCode] ?? null;

        if ($city !== null) {
            $this->data['address']['city'] = $city;
        }
    }

    /**
     * Trim strings on the server and report what was normalized.
     *
     * @return array{normalized: bool, name: string, country: string, city: string, postalCode: string}
     */
    public function normalize(): array
    {
        $this->data['name'] = trim((string) ($this->data['name'] ?? ''));
        $this->data['country'] = strtoupper(trim((string) ($this->data['country'] ?? '')));
        $this->data['address']['city'] = trim((string) ($this->data['address']['city'] ?? ''));
        $this->data['address']['postalCode'] = trim((string) ($this->data['address']['postalCode'] ?? ''));

        foreach ($this->data['owners'] as $index => $owner) {
            $this->data['owners'][$index]['id'] = trim((string) ($owner['id'] ?? ''));
            $this->data['owners'][$index]['name'] = trim((string) ($owner['name'] ?? ''));
        }

        return [
            'normalized' => true,
            'name' => $this->data['name'],
            'country' => $this->data['country'],
            'city' => $this->data['address']['city'],
            'postalCode' => $this->data['address']['postalCode'],
        ];
    }

    public function resetForm(): void
    {
        $this->data = self::defaults();
        $this->resetValidation();
    }

    public function replaceOwners(): void
    {
        $this->data['owners'] = self::replacementOwners();
    }

    public function save(): void
    {
        $validated = $this->validate();

        $this->saveCount++;

        $this->saveReceipt = [
            'saveNumber' => $this->saveCount,
            'savedAt' => now()->toIso8601String(),
            'data' => $validated['data'],
        ];
    }

    public function togglePreactWrapper(): void
    {
        $this->showPreactWrapper = ! $this->showPreactWrapper;
    }

    public function toggleSolidWrapper(): void
    {
        $this->showSolidWrapper = ! $this->showSolidWrapper;
    }

    public function render()
    {
        return view('livewire.aml-form');
    }
}
