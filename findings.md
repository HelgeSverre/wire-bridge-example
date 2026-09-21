# wire-bridge findings

Results from implementing `spec.md` with the pinned baseline:

- Livewire **4.4.5** (`10aa0b5ee44c99b5bce0f78ad265bbcf0e74abdc`, released 2026-09-14)
- Laravel **13.32.0**, PHP **8.3.32**
- Preact **10.29.8**, Solid **1.9.15**, Vite **8.3.0**

All 19 real-browser acceptance tests (A1–A16 including both A15 variants, plus the
`$watch` compatibility test and a repeated mount/unmount counter test), 38 core
unit tests, and the PHP suite (AMLForm behavior and validation plus route smoke
tests) pass. The demo sequence from the spec runs end to end.

## What worked

**One Livewire state owner, three renderers.** Every local edit flows through
`$wire.$set(path, value, false)`; every read comes back out of `$wire.$get(root)`.
The Preact and Solid islands never receive `$wire` as writable state — they receive
a frozen snapshot plus stable `getSnapshot/subscribe/set` closures.

**Local propagation without requests.** Editing Blade propagates to Preact and
Solid, Preact to Blade and Solid, and Solid to both, with zero Livewire update
requests (asserted by intercepting only `/livewire-*/update`). Livewire's bundled
Alpine runtime is the only reactivity engine; the bridge translates its root
watcher into plain subscriber callbacks that Preact's `useSyncExternalStore` and
Solid's `createSignal` consume independently.

**PHP round trips.** `commit()`, `normalize()`, `resetForm()`, `replaceOwners()`,
and `save()` all work through the bridge. Normalize trims/uppercases; reset
replaces the whole `data` root while existing bindings keep working (no remount —
verified by node identity of the rendered Preact tree); save records a
demonstration receipt and never touches a database.

**Cleanup.** Unmount/remount, server morph removal, removal during a lazy import,
`wire:navigate` away/back, and two component instances all behave:

- one destroy per mounted renderer on server morph removal (A10),
- no late UI attachment when a host is removed during its lazy import (A11),
- registry/watch/subscriber counts return exactly to baseline after navigation (A12),
- the second instance gets its own bridge and stays isolated (A13).

## Installed-version notes

The spec's source review was pinned at `ed788716…`; the installed release is
`10aa0b5…` (4.4.5). All APIs the spec listed are present and behave as required:

| API | Installed behavior |
| --- | --- |
| `$watch(path, cb)` | Returns an unsubscribe function; stopping it while the component stays mounted works (dedicated compatibility test). |
| `$set(path, value, false)` | Mutates `component.reactive` synchronously, returns a resolved promise, sends no request. |
| `$get(path)` | Reads the reactive state (or the ephemeral state with `reactive = false`). |
| `$commit()` / `$call()` | Fire the action and return a promise; a network failure rejects it; validation failures resolve it (see below). |
| `Livewire.directive(name, cb)` | Delivers `{ el, directive, component, $wire, cleanup }`. |
| `cleanup(cb)` | Registered via Alpine's attribute-removal cleanup; it also fires when the element is removed from the DOM (see below). |

Two behaviors worth recording:

1. **`wire:ignore` hosts still get an Alpine marker.** Livewire's `wire:ignore`
   sets `el.__livewire_ignore` (a morph-skip flag) and does **not** set Alpine's
   `_x_ignore`. The host therefore receives `_x_marker`, so Alpine's
   MutationObserver reports its removal and runs `destroyTree` →
   `cleanupElement`/`cleanupAttributes`, which invokes the directive's cleanup
   callback. That is why host removal and server-morph removal both clean up
   without any private Livewire API. If a host were nested inside an
   `x-ignore`/`_x_ignore` subtree, this would not hold.
2. **A removed wrapper destroys its descendants.** Server-side `@if` removal of a
   wrapper removes the wrapper element; Alpine's observer then walks it with
   `destroyTree`, so the ignored host inside still gets cleaned up.

## Concurrency observations (A15, slow-response characterization)

Test setup: start `normalize()` with a 1200 ms delayed response, then edit a field
before the response arrives. Measured with the installed Livewire 4.4.5:

| Case | Final state | Meaning |
| --- | --- | --- |
| Edit a field that was **not dirty** in the request payload, and the server did not change that path | Newer local edit **wins** | No server diff for the path, so nothing overwrites it. |
| Edit a field that **was dirty** in the request payload and the server changed it (normalize trimmed it) | Server value **wins**; the newer local edit is **lost** | The response carries a diff for that path and Livewire merges it over the newer local value. |
| Edit a **different** path while another path was dirty and server-normalized | Both survive independently | Server diffs merge per path; unaffected local edits stay. |

In every case the bridge converged to exactly the state `$wire` exposed (asserted
per field), issued exactly one request (the `normalize` call), and performed no
extra overwrites or writeback loops. The bridge must not promise merge ordering:
that behavior belongs to Livewire's request handling, and a production
conflict/rebase policy would be a separate project.

Reproduction: `resources/views/poc/wire-bridge.blade.php` panel inputs plus the
controls' Normalize button; the Playwright A15 tests implement the delayed-request
harness (`tests/browser/wire-bridge.spec.js`, both `name` and `country` variants).

## Error and promise behavior

- **Validation failure** (`save()` with a one-character country): the `$call`
  promise **resolves**, Blade renders the error messages, the save count does not
  change, and the controls show "save returned without a new receipt". The edits
  stay visible in all views.
- **Network failure** (aborted `update` request): the promise **rejects**, the
  controls show a retryable "request failed" message, the busy state clears, and
  local edits remain. A retry succeeds without any adapter rollback.
- A resolved `save()` is never treated as "saved" on its own: the controls compare
  the server-provided `saveCount` before and after and display the receipt number.

## Implementation traps worth remembering

- **Self-triggering MutationObserver loop.** The controls refresh their
  mount/unmount button labels from a `MutationObserver`. Writing `textContent`
  unconditionally mutated the observed subtree again, producing a microtask loop
  that starved the event loop (the renderer hung at 100% CPU). Fixed by
  write-if-changed DOM helpers. Any observer that writes into its own observed
  subtree needs this guard.
- **Test doubles must model watcher timing.** The unit-test `$wire` double queues
  watcher callbacks on a microtask; the bridge's structural dedupe means a
  synchronous refresh after a local write plus the later queued watcher callback
  produce exactly one notification.
- **`Symbol` debug accessor.** Browser tests read live bridge counters through
  `window.__wireBridgePoc.debugStateFor(componentId)`. A global
  `Symbol.for('wire-bridge.debug-state')` does not match the module's
  `Symbol('wire-bridge.debug-state')`; the hook exists so tests do not have to
  know the symbol.

## Is the adapter small enough to justify extraction?

Linear source sizes, excluding the demo app:

| Module | Lines |
| --- | --- |
| `wire-bridge/core.js` | 500 |
| `wire-bridge/json.js` | 357 |
| `wire-bridge/directive.js` | 201 |
| `wire-bridge/registry.js` | 99 |
| `wire-bridge/preact/use-wire-field.js` | 25 |
| `wire-bridge/solid/create-wire-field.js` | 36 |

The two framework adapters are ~25–40 lines each, and the core is ordinary
JavaScript with no framework or Livewire dependency. The abstraction earns its
place: both renderers share one snapshot cache and notification graph, and the
strict JSON value/path rules caught real classes of bugs in tests (missing paths,
caller-owned mutation, unsafe segments). The caveats:

- The lifecycle machinery (leases, directive, late-import cancellation) is a
  meaningful part of the surface, but it is Livewire-integration code, not
  framework adapter code.
- Debug instrumentation lives outside the bridge; keeping it out of the contract
  was worth it.
- `core.js` at 500 lines is larger than the happy path needs because of the
  documented path/value rules and disposal semantics. That is contract surface,
  not incidental complexity, but it is the first thing to split if the API grows.

## Filament

Not attempted. The spec marks it optional and conditional on the core PoC
succeeding; nothing in the ordinary Livewire PoC depends on the referenced
Filament PR. Its current merge/release status was not checked.

## Known gaps / future work

- Per-path Livewire watchers and structural sharing for large forms.
- Reactive path accessors for the adapters (bridge/path are fixed per binding).
- A validation adapter for frontend-specific error styling.
- Conflict/rebase policy for edits during in-flight requests.
- Optional Filament spike with `props.onChange`/`props.onBlur` preserved.
