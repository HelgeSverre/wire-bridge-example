<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Wire Bridge — order builder</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="order-body">
    <main class="order-page">
        <livewire:order-builder />

        <footer class="order-footer">
            One Livewire component, five frontend frameworks plus Blade, sharing one state through
            <a href="https://github.com/HelgeSverre/wire-bridge">wire-bridge</a>.
            Every renderer on one form: <a href="{{ route('poc.wire-bridge') }}">renderer matrix</a>.
        </footer>
    </main>
</body>
</html>
