/**
 * The order page's "Livewire requests" counter: increments on every request
 * Livewire sends, so the page itself shows that local edits cost nothing and
 * only commits and PHP actions reach the server.
 */
let count = 0;

function render() {
    for (const element of document.querySelectorAll('[data-request-count]')) {
        element.textContent = String(count);
    }

    for (const element of document.querySelectorAll('[data-request-label]')) {
        element.textContent = count === 1 ? 'Livewire request' : 'Livewire requests';
    }
}

document.addEventListener(
    'livewire:init',
    () => {
        window.Livewire.hook('request', () => {
            count++;
            render();
        });
    },
    { once: true },
);
