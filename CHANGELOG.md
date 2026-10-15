# Changelog

## 1.0.0

Major release: the estate RU1 stack uplift, Bazel-only delivery (RU6/RU8) and
in-house dependencies through the Bazel module graph. The runtime API (every
export subpath and its symbols) is unchanged from 0.12.0.

### Breaking

- **Toolchain:** TypeScript 7.0.2, Svelte 5.57.2, Vite 8.3.3, Vitest 5.0.3,
  `@sveltejs/vite-plugin-svelte` 7.3.1 and `@sveltejs/package` 3, all exact
  except the last (RU5). Effect moves to exactly 4.0.2 (R-C444). Node
  `^22.17.0 || >=24 <25`; the Bazel node toolchain is 22.22.0 and pnpm is
  10.13.1.
- **Peer `svelte` is exactly `5.57.2`** (was `^5.0.0`). The optional Skeleton
  peers stay exactly `5.0.1`.
- **In-house peers removed from package.json.** `@tummycrypt/tinyland-calendar`,
  `@tummycrypt/tinyland-caldav-client` and `@tummycrypt/tinyland-auth-pg` are no
  longer declared as (optional) npm peers or dev dependencies. They are still
  loaded lazily at runtime by `./recurrence`, `./caldav`/`./availability` and the
  legacy HomegrownAdapter schema fallback; consumers supply them through Bazel
  (see Migration).
- **Bazel module:** depends on `tummycrypt_tinyland_calendar` 1.0.0 and
  `tummycrypt_tinyland_caldav_client` 1.0.1 (was 0.2.3 each). The TypeScript
  subpackage targets (`//:core`, `//:adapters`, `//:payments`, ...) and the
  `aspect_rules_ts` / `aspect_rules_swc` dependencies are removed; `//:pkg` is the
  artifact and nothing consumed the subpackage targets. `//:typecheck` is now a
  test suite (`bazel test //:typecheck`).
- **No SvelteKit.** The library never used Kit at runtime; `@sveltejs/kit`,
  `@sveltejs/adapter-auto` and the `svelte-kit sync` step are gone.
  `tsconfig.json` is standalone and `svelte.config.js` only sets `vitePreprocess`.
- The package is `private` and is not published to npmjs or GitHub Packages
  (RU8). Earlier npm versions stay where they are.

### TypeScript 7 (RU13 / RU13b)

- `svelte-check` runs in its TypeScript 7 native mode (`--tsgo`) with the shared
  site.scaffold patch `patches/svelte-check@4.7.6.patch`;
  `//:svelte_check_canary_test` proves a seeded `.ts` and `.svelte` error still
  fails the gate.
- `.pnpmfile.cjs` (copied from site.scaffold) gives the in-process parsers
  (svelte2tsx, `@sveltejs/package`, typescript-eslint) the
  `@typescript/typescript6` companion. All type checking runs on TypeScript
  7.0.2; the declaration emit of `svelte-package` runs on the companion until
  upstream supports TypeScript 7.

### Migration

1. Re-pin the module:

   ```starlark
   bazel_dep(name = "tummycrypt_scheduling_kit", version = "1.0.0")
   ```

   with `https://raw.githubusercontent.com/xoxd-ai/bazel-registry/<commit>` as a
   registry (the `tinyland-inc` registry URL only redirects). Bazel MVS also lifts
   `tummycrypt_tinyland_calendar` to >= 1.0.0 and
   `tummycrypt_tinyland_caldav_client` to >= 1.0.1.
2. Link the package as before:
   `npm_link_package(name = "node_modules/@tummycrypt/scheduling-kit", src = "@tummycrypt_scheduling_kit//:pkg")`.
   `drizzle-orm` and `zod` still travel with `//:pkg`; `effect` stays a consumer
   dependency (pin it exactly at 4.0.2).
3. If you use `./recurrence`, `./caldav` or `./availability`, add
   `bazel_dep`s on `tummycrypt_tinyland_calendar` (and
   `tummycrypt_tinyland_caldav_client` for CalDAV) and link their `//:pkg` next to
   the kit. Drop any npm `@tummycrypt/*` specifiers, `dependenciesMeta` and
   `overrides` entries for them.
4. Consumers that type-check the shipped `.d.ts` files should use TypeScript
   7.0.2 and Svelte 5.57.2 (the estate manifest in site.scaffold).

## 0.12.0 and earlier

See the GitHub releases of xoxd-ai/scheduling-kit (v0.7.0 through v0.12.0). 0.12.0
moved to Effect 4.0.1 and exact Skeleton 5.0.1 peers.
