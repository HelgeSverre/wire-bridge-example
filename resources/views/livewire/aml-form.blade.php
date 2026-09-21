{{-- The Livewire component owns the wrappers; each frontend owns its wire:ignore host. --}}
<div data-component="aml-form" data-compact="{{ $compact ? '1' : '0' }}">
    @if (! $compact)
        <div class="toolbar">
            <div wire:ignore wire:frontend="controls" wire:key="aml-controls"
                 data-wire-frontend-host="controls"></div>

            <div class="toolbar-group" data-testid="server-toggles">
                <span class="toolbar-label">Server morph controls</span>
                <button type="button" wire:click="togglePreactWrapper" data-testid="server-toggle-preact">
                    {{ $showPreactWrapper ? 'Remove' : 'Restore' }} Preact wrapper
                </button>
                <button type="button" wire:click="toggleSolidWrapper" data-testid="server-toggle-solid">
                    {{ $showSolidWrapper ? 'Remove' : 'Restore' }} Solid wrapper
                </button>
            </div>
        </div>
    @endif

    <div class="panels">
        <section class="panel" data-testid="panel-blade">
            <header class="panel-header">
                <h2>Blade</h2>
                <span class="panel-note">wire:model (deferred)</span>
            </header>

            <div class="field-grid">
                <label class="field">
                    <span>Name</span>
                    <input type="text" wire:model="data.name" data-testid="blade-name">
                </label>

                <label class="field">
                    <span>Country</span>
                    <input type="text" wire:model="data.country" data-testid="blade-country">
                </label>

                <label class="field field-checkbox">
                    <input type="checkbox" wire:model="data.isPep" data-testid="blade-is-pep">
                    <span>Politically exposed person</span>
                </label>

                <label class="field">
                    <span>City</span>
                    <input type="text" wire:model="data.address.city" data-testid="blade-city">
                </label>

                <label class="field">
                    <span>Postal code</span>
                    <input type="text" wire:model="data.address.postalCode" data-testid="blade-postal-code">
                </label>

                @foreach ($data['owners'] as $index => $owner)
                    <label class="field">
                        <span>Owner {{ $index + 1 }} name</span>
                        <input type="text" wire:model="data.owners.{{ $index }}.name"
                               data-testid="blade-owner-{{ $index }}-name">
                    </label>

                    <label class="field">
                        <span>Owner {{ $index + 1 }} share</span>
                        <input type="number" wire:model="data.owners.{{ $index }}.share"
                               data-testid="blade-owner-{{ $index }}-share">
                    </label>
                @endforeach
            </div>
        </section>

        @if (! $compact)
            @if ($showPreactWrapper)
                <div wire:key="preact-wrapper">
                    <section class="panel" data-testid="panel-preact">
                        <header class="panel-header">
                            <h2>Preact</h2>
                            <span class="panel-note">preact/compat useSyncExternalStore</span>
                        </header>

                        <div wire:ignore data-wire-frontend-slot="preact">
                            <div wire:ignore wire:frontend="preact" wire:key="aml-preact-host"
                                 data-wire-frontend-host="preact"></div>
                        </div>
                    </section>
                </div>
            @endif

            @if ($showSolidWrapper)
                <div wire:key="solid-wrapper">
                    <section class="panel" data-testid="panel-solid">
                        <header class="panel-header">
                            <h2>Solid</h2>
                            <span class="panel-note">createSignal + onCleanup</span>
                        </header>

                        <div wire:ignore data-wire-frontend-slot="solid">
                            <div wire:ignore wire:frontend="solid" wire:key="aml-solid-host"
                                 data-wire-frontend-host="solid"></div>
                        </div>
                    </section>
                </div>
            @endif

            {{--
                The remaining renderers are always visible. The Preact and Solid
                wrappers above are toggleable because they exist to prove that a
                wire:ignore host survives being removed and reintroduced by a
                Livewire morph; repeating that proof five more times adds
                nothing.
            --}}
            @foreach ([
                ['react', 'React', 'useSyncExternalStore, no Babel plugin'],
                ['vue', 'Vue', 'shallowRef + onScopeDispose'],
                ['svelte', 'Svelte', 'plain store, adapter imports nothing'],
                ['lit', 'Lit', 'ReactiveController, no package code'],
                ['alpine', 'Alpine', 'x-data init/destroy, no package code'],
            ] as [$renderer, $title, $note])
                <div wire:key="{{ $renderer }}-wrapper">
                    <section class="panel" data-testid="panel-{{ $renderer }}">
                        <header class="panel-header">
                            <h2>{{ $title }}</h2>
                            <span class="panel-note">{{ $note }}</span>
                        </header>

                        <div wire:ignore data-wire-frontend-slot="{{ $renderer }}">
                            <div wire:ignore wire:frontend="{{ $renderer }}"
                                 wire:key="aml-{{ $renderer }}-host"
                                 data-wire-frontend-host="{{ $renderer }}"></div>
                        </div>
                    </section>
                </div>
            @endforeach
        @endif
    </div>

    @if (! $compact)
        <div class="inspectors">
            <section class="panel" data-testid="inspector-browser-panel">
                <header class="panel-header">
                    <h2>Browser state</h2>
                    <span class="panel-note">bridge snapshot, updated locally</span>
                </header>
                <div wire:ignore wire:frontend="inspector" wire:key="aml-inspector"
                     data-wire-frontend-host="inspector" data-wire-mode="full"></div>
            </section>

            <section class="panel" data-testid="inspector-server-panel">
                <header class="panel-header">
                    <h2>Last server-rendered state</h2>
                    <span class="panel-note">plain Blade, changes only after a server render</span>
                </header>
                <pre class="json" data-testid="server-state">{{ json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</pre>
            </section>
        </div>
    @else
        <div class="inspectors">
            <section class="panel">
                <header class="panel-header">
                    <h2>Browser state (second instance)</h2>
                </header>
                <div wire:ignore wire:frontend="inspector" wire:key="aml-inspector-compact"
                     data-wire-frontend-host="inspector" data-wire-mode="compact"></div>
            </section>

            <section class="panel">
                <header class="panel-header">
                    <h2>Last server-rendered state</h2>
                </header>
                <pre class="json" data-testid="server-state">{{ json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</pre>
            </section>
        </div>
    @endif

    <div class="status" data-testid="status">
        <div data-testid="validation-errors" class="status-block">
            <span class="status-label">Validation errors (Blade-owned)</span>
            @if ($errors->any())
                <ul class="error-list">
                    @foreach ($errors->all() as $message)
                        <li>{{ $message }}</li>
                    @endforeach
                </ul>
            @else
                <span class="status-ok" data-testid="no-validation-errors">none</span>
            @endif
        </div>

        <div class="status-block" data-testid="save-receipt">
            <span class="status-label">Save receipt (demonstration only, no database write)</span>
            <div class="receipt">
                <span>save count: <strong data-testid="save-count">{{ $saveCount }}</strong></span>
                @if ($saveReceipt)
                    <pre class="json json-small" data-testid="save-receipt-data">{{ json_encode($saveReceipt, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) }}</pre>
                @else
                    <span data-testid="save-receipt-empty">no receipt yet</span>
                @endif
            </div>
        </div>
    </div>
</div>
