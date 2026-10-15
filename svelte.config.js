// Svelte config for svelte-package, svelte-check and Vitest. This is a library:
// there is no SvelteKit app, adapter or `svelte-kit sync` step (1.0.0 dropped the
// Kit dev dependency). svelte-package is invoked with `-i src` explicitly.
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import("svelte/compiler").CompileOptions & { preprocess?: unknown }} */
const config = {
  preprocess: vitePreprocess(),
};

export default config;
