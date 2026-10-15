import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Vitest configuration for Svelte component tests
 * Uses jsdom environment for browser-like testing
 */
export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // Don't generate CSS - avoids preprocessing issues in jsdom
        css: 'external',
      },
      // Skip Vite's CSS preprocessing - just pass styles through as-is
      preprocess: [],
    }),
  ],
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    server: {
      deps: {
        // skeleton-svelte ships raw .svelte sources; inline so the svelte
        // plugin compiles them (needed by Dialog-based drawer tests)
        inline: ['@skeletonlabs/skeleton-svelte', /@zag-js\//],
      },
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts', 'tests/e2e/setup.ts'],
    // Component tests may need longer timeouts
    testTimeout: 15000,
  },
  resolve: {
    conditions: ['browser'],
  },
  // jsdom tests run in Vite's web transform mode, which serves modules through
  // /@fs/ and enforces server.fs.allow. Under Bazel the runfiles tree is a
  // symlink farm and Vite resolves setup files to their real path in the
  // output tree, outside the runfiles root, so strict fs serving rejects them
  // (ERR_MODULE_NOT_FOUND). Test-only config; no dev server is exposed.
  server: {
    fs: {
      strict: false,
    },
  },
});
