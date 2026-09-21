import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import solid from 'vite-plugin-solid';
import vue from '@vitejs/plugin-vue';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),

        // Preact, React and Solid JSX use different transforms. Solid only
        // transforms files under its own directory; everything else falls
        // through to the esbuild JSX settings below, which default to Preact.
        // There is no global React alias and no cross-framework transform.
        solid({
            include: ['**/poc/solid/**'],
        }),

        // Vue and Svelte are keyed off their file extensions, so they need no
        // include globs and cannot collide with the JSX transforms.
        vue(),
        svelte(),
    ],

    resolve: {
        // wire-bridge is linked from ../wire-bridge-pkg, which keeps its own
        // copies of these frameworks as devDependencies for typechecking.
        // Without deduping, the adapters would import that second copy and
        // every hook would run against a dispatcher belonging to a different
        // instance. Consumers installing wire-bridge from npm never hit this;
        // it is purely an artifact of the local file: link.
        dedupe: ['preact', 'react', 'react-dom', 'solid-js', 'vue', 'svelte'],
    },

    esbuild: {
        // React deliberately has no plugin: @vitejs/plugin-react pulls in
        // Babel 8, which conflicts with the Babel 7 that vite-plugin-solid
        // pins. esbuild already does the automatic JSX runtime, and the React
        // files carry a per-file `@jsxImportSource react` pragma that
        // overrides the Preact default below. No Babel, no conflict.
        jsx: 'automatic',
        jsxImportSource: 'preact',
    },

    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
