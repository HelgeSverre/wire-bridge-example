# Wire Bridge Example

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

<img src="docs/demo.gif" alt="Eight panels (Blade, Preact, Solid, React, Vue, Svelte, Lit, Alpine) editing one shared Livewire state with zero requests; then Commit sends one request and the PHP panel catches up, and a PHP action upper-cases the country in every panel" width="100%">

Editing any view updates the other seven **without an HTTP request**. Committing and
running PHP actions are explicit. Changes made by PHP propagate back to all views.
No Livewire, Alpine, or frontend framework fork is involved.

Lit and Alpine show that an adapter is optional. Each field binding is a plain
external store (`getSnapshot`/`subscribe`/`set`), so Lit and Alpine use it directly:
subscribe on connect/`init`, unsubscribe on disconnect/`destroy`, and read
`getSnapshot()` in between.

This app installs `wire-bridge` from npm, so it exercises the published package and
its `exports` map rather than a vendored copy.

## Version baseline

Versions this example was built and tested against. Packages are pinned by
`composer.lock` and `package-lock.json`; PHP, Node and the skeleton version are as
recorded at build time.

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
composer run setup            # install deps, create .env + app key + sqlite DB, build assets
php artisan serve
```

Open http://127.0.0.1:8000/poc/wire-bridge.

`composer run setup` is equivalent to:

```bash
composer install
cp -n .env.example .env       # only if .env does not exist
php artisan key:generate
php artisan migrate --force   # creates database/database.sqlite if missing
npm install --ignore-scripts
npm run build
```

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
composer run dev              # php artisan dev: serve + queue:listen + pail + vite
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
existing server on that port. `npm run test:browser` builds first; if you run
`npx playwright test` directly, run `npm run build` before it, because the suite reads
`public/build/manifest.json` to intercept lazy renderer chunks.

To regenerate `docs/demo.gif`, run `node tools/capture-readme-demo.mjs --all`
while the app is served on port 8457, then run the ffmpeg commands it prints.

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
Livewire's local browser state synchronously and returns a promise that settles
once Livewire's local `$set` does — no request. The bridge refreshes its cache
immediately and again when the watcher fires, so all renderers converge locally.

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

(Simplified: the demo wraps each host in a `wire:ignore` slot so the local
Mount/Unmount buttons can reinsert it.)

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

Eight panels (Blade, Preact, Solid, React, Vue, Svelte, Lit, Alpine) share one
`AMLForm` state. Under them sit two inspectors:

- **Browser state** — the bridge snapshot, updated locally on every edit.
- **Last server-rendered state** — plain Blade JSON, changed only after a server render.

Typing never updates the server inspector; edits stay local until a request is sent.
**Commit** sends the pending edits as-is. **Normalize (PHP)**, **Reset form (PHP)**,
**Replace owners (PHP)**, **Save (PHP, demo)** and the wrapper toggles send them along
with a PHP action. After any of these, the server inspector catches up. Save writes a
demonstration receipt, not a database row. The Mount/Unmount buttons add and remove
each framework host locally.

A server-controlled toggle removes and restores the Preact and Solid wrappers during a
Livewire morph, proving a `wire:ignore` host survives being removed and reintroduced.
Only those two wrappers have it; repeating the proof in the other panels would add
nothing.

A second, compact `AMLForm` instance at the bottom (Blade inputs and its own
browser-state inspector, no framework islands) has its own bridge, proving instance
isolation.

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
  behavior.
