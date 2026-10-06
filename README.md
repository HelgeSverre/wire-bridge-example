# wire-bridge-example

A runnable Laravel + Livewire 4 app for [wire-bridge](https://github.com/HelgeSverre/wire-bridge)
([npm](https://www.npmjs.com/package/wire-bridge)). Clone it, install it, and open one
page where a single mounted Livewire component owns form state for eight renderers at
once:

- **Blade** inputs using deferred `wire:model`
- a **Preact** island using `useSyncExternalStore` from `preact/compat`
- a **React** island using `useSyncExternalStore` from `react`
- a **Solid** island using `createSignal` plus an explicit bridge subscription
- a **Svelte** island using a plain store, from an adapter that imports nothing
- a **Vue** island using `shallowRef` plus `onScopeDispose`
- a **Lit** island using a `ReactiveController`, with no adapter in the package
- an **Alpine** island using `x-data` with `init`/`destroy`, with no adapter in the
  package and no dependency installed — Livewire already ships Alpine

Editing any view updates the other seven **without an HTTP request**. Committing and
running PHP actions are explicit. Changes made by PHP propagate back to all views.
No Livewire, Alpine, or frontend framework fork is involved.

The last two are the point of the exercise: the bridge exposes a plain external
store (`getSnapshot`/`subscribe`/`set`), so a framework only needs a package adapter
when it has a reactivity primitive to convert into. Lit and Alpine consume the
binding directly in about six lines.

This app installs `wire-bridge` from npm, so it exercises the published package and
its `exports` map rather than a vendored copy.

See [`findings.md`](findings.md) for the measured results, installed-version
differences, and the slow-request characterization. The original brief is
[`spec.md`](spec.md).

## Version baseline

Versions this example was built and tested against (pinned by `composer.lock` and
`package-lock.json`).

| Tool | Version |
| --- | --- |
| PHP | 8.3.32 |
| Laravel framework | 13.32.0 (`laravel/laravel` 13.10.1 skeleton) |
| Livewire | 4.4.5 (released 2026-09-14, commit `10aa0b5`) |
| Preact | 10.29.8 |
| React | 19.3.0 |
| Solid | 1.9.15 |
| Svelte | 5.57.1 |
| Vue | 3.5.43 |
| Lit | 3.3.3 |
| Alpine | bundled with Livewire |
| Node / npm | 22.22.3 / 10.9.8 |
| Vite | 8.3.0 (`laravel-vite-plugin` 3.2.0) |
| vite-plugin-solid | 2.11.14 |
| @vitejs/plugin-vue | 6.0.9 |
| @sveltejs/vite-plugin-svelte | 7.3.0 |
| Tailwind CSS | 4.3.3 |
| Vitest | 5.0.1 |
| Playwright | 1.63.0 (Chromium) |

The Livewire 4 API surface the bridge relies on, verified against the installed
build:

- `$wire.$get(path)`
- `$wire.$set(path, value, false)` — local mutation, resolves immediately, no request
- `$wire.$watch(path, callback)` — **returns an unsubscribe function**
- `$wire.$commit()`
- `$wire.$call(method, ...args)`
- `Livewire.directive(name, callback)` with `{ el, directive, component, $wire, cleanup }`

`tests/browser/wire-bridge.spec.js` contains a compatibility test that stops a
`$watch` subscription while the component remains mounted. The bridge refuses to
initialize (visible `WireBridgeCompatibilityError`) if `$watch` returns no disposer.

## Install

Prerequisites: PHP 8.3+, Composer, Node 22+. The browser suite also needs Playwright's
Chromium.

```bash
git clone https://github.com/HelgeSverre/wire-bridge-example.git
cd wire-bridge-example
composer run setup            # composer install, .env, app key, sqlite migrate, npm install, npm run build
php artisan serve
```

Open http://127.0.0.1:8000/poc/wire-bridge.

`composer run setup` is equivalent to:

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm install
npm run build
```

`.npmrc` sets `ignore-scripts=true`, so `npm install` runs no package install scripts.

To run the browser suite:

```bash
npx playwright install chromium
```

### Using wire-bridge in your own app

```bash
npm install wire-bridge
```

The package is JavaScript only; there is no Composer package. See the
[wire-bridge README](https://github.com/HelgeSverre/wire-bridge#readme) for the API.
`resources/js/poc/runtime.js` shows the full wiring used here.

## Run

```bash
php artisan serve             # http://127.0.0.1:8000/poc/wire-bridge
```

Or the combined dev loop:

```bash
composer run dev              # php artisan serve + queue + vite dev + pail
```

The demo route is `/poc/wire-bridge`. A second page exists only to exercise
`wire:navigate` (`/poc/second-page`).

## Test

```bash
npm test                      # Vitest: framework-independent bridge contract (38 tests)
php artisan test --compact    # PHPUnit: AMLForm behavior, validation, and route smoke tests
npm run test:browser          # builds, then runs the Playwright acceptance matrix (21 tests)
```

The Playwright config starts `php artisan serve` on port 8457 itself and reuses an
existing server on that port. Run `npm run build` before the browser suite; the
suite reads the Vite manifest to intercept lazy renderer chunks.

## How it works

```
Blade inputs <--> Livewire browser state
Livewire browser state --$watch('data')--> bridge snapshot cache
bridge snapshot cache --field subscriptions--> framework islands
framework islands --bridge.field().set()--> Livewire browser state
Livewire browser state <-- HTTP commit / call --> AMLForm.php
```

The bridge itself is the [`wire-bridge`](https://github.com/HelgeSverre/wire-bridge) npm
package; its README documents the API.

This repo owns only the demo:

- **`resources/js/poc/`** — the runtime, inspectors, controls, and one directory per
  framework form. Diagnostics and the window test hook live here; none of it is part
  of the bridge contract.
- **`resources/js/poc/lit/wire-field-controller.js`** and
  **`resources/js/poc/alpine/mount.js`** — the two integrations that need no package
  adapter, kept here deliberately to show what consuming the raw binding looks like.

### Deferred writes, commit, and PHP actions

`field.set(value)` only calls `$wire.$set(path, value, false)`. That mutates
Livewire's local browser state synchronously and returns a resolved promise — no
request. The bridge refreshes its cache immediately and again when the watcher
fires, so all renderers converge locally.

Nothing is sent to PHP until:

- `bridge.commit()` → `$wire.$commit()`, or
- `bridge.call('normalize')` → `$wire.$call('normalize')`.

Requests carry whatever pending local edits Livewire includes. The bridge never
constructs requests, synthesizes snapshots, replays edits, or writes a server
snapshot back into `$wire`. A failed request keeps the local edits and surfaces a
retryable error in the controls; there is no homemade rollback.

The control buttons disable while a bridge action is in flight and re-enable when
its promise settles, including rejections.

### DOM ownership

Livewire owns the wrappers (including the server-controlled `@if` visibility),
and each renderer owns exactly one `wire:ignore` host:

```blade
<div wire:ignore wire:frontend="preact" wire:key="aml-preact-host"></div>
```

Blade never renders dynamic descendants inside a host, and the server-state
inspector is plain Blade so it can never be bound to browser state.

### Build isolation

Seven renderers share one Vite config. Three JSX dialects coexist with no plugin
conflict:

- `vite.config.js` registers `vite-plugin-solid` with `include: ['**/poc/solid/**']`,
  so Solid files are transformed before esbuild sees them.
- The global esbuild JSX options (`jsx: 'automatic'`, `jsxImportSource: 'preact'`)
  apply to the remaining `.jsx` files, which makes Preact the default.
- React files open with a `/** @jsxImportSource react */` pragma, which overrides
  that default per file.

React deliberately has **no** Vite plugin: `@vitejs/plugin-react` pulls in Babel 8,
which conflicts with the Babel 7 that `vite-plugin-solid` pins. esbuild already
implements the automatic JSX runtime, so the pragma is enough and no Babel is
involved. The cost is losing React Fast Refresh in dev, which a testbed does not
need. Vue and Svelte are keyed off their file extensions and cannot collide.

## Demo behavior

Eight panels (Blade, Preact, React, Solid, Svelte, Vue, Lit, Alpine) share one
`AMLForm` state. Under them sit a browser-state inspector (bridge snapshot, updated
locally) and a last server-rendered state inspector (plain Blade JSON, changed only
after a server render). The controls commit, normalize on the server, reset the
whole root, replace owners, save (a demonstration receipt, no database), and locally
mount/unmount the Preact and Solid hosts. A server-controlled toggle removes and
restores the Preact and Solid wrappers during a Livewire morph.

Only the Preact and Solid wrappers are toggleable. They exist to prove a
`wire:ignore` host survives being removed and reintroduced by a Livewire morph;
repeating that proof in the other five panels would add nothing.

A second `AMLForm` instance at the bottom of the page has its own bridge, proving
instance isolation.

## Limitations

- Livewire 3 is not supported.
- No SSR/hydration of the islands.
- No automatic dependency tracking for arbitrary property reads; paths only.
- No per-field Livewire watchers or structural-sharing optimizations beyond
  preserving unchanged field snapshot references.
- No configurable blur/debounce/live policies; transport policy stays outside the
  binding layer.
- `owners.0.name` follows the array index, not owner identity. Repeater identity
  management is out of scope.
- Edits made while a request is in flight are subject to Livewire's merge
  behavior. See `findings.md` for the measured cases.
