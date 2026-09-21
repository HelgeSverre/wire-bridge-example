/**
 * Shared by every renderer in the proof of concept.
 *
 * `binding.set()` returns a promise. The write itself is local and synchronous
 * — Livewire's own state is already updated by the time the promise exists —
 * but the promise still rejects if the path is gone, so it must not be dropped
 * silently.
 *
 * @param {Promise<void>} write
 */
export function reportWriteFailure(write) {
    write.catch((error) => {
        console.error('[wire-bridge] local write failed', error);
    });
}
