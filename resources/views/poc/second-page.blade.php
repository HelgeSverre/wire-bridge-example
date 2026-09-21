<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>wire-bridge — second page</title>
</head>
<body>
    <main class="page">
        <h1>Second page</h1>
        <p data-testid="second-page-body">No Livewire component here. Navigate back to re-initialize the PoC page.</p>
        <a href="{{ route('poc.wire-bridge') }}" wire:navigate data-testid="navigate-back">Back to the PoC</a>
    </main>
</body>
</html>
