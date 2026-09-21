<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>wire-bridge — Livewire framework bridge PoC</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <main class="page">
        <header class="page-header">
            <h1>wire-bridge</h1>
            <p>
                One <code>AMLForm</code> Livewire component. Three renderers. Deferred local edits,
                explicit commit, and PHP actions. No database.
            </p>
            <p>
                <a href="{{ route('poc.second-page') }}" wire:navigate data-testid="navigate-away">
                    Navigate away and back
                </a>
            </p>
        </header>

        <livewire:aml-form />

        <section class="second-instance" data-testid="second-instance">
            <header class="page-header">
                <h2>Second AMLForm instance</h2>
                <p>Same PHP class and root path, but a separate bridge. Edits here must not leak.</p>
            </header>

            <livewire:aml-form :compact="true" />
        </section>
    </main>
</body>
</html>
