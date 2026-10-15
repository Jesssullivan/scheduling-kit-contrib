#!/usr/bin/env node
// RU13: TypeScript 7.0.2 is this module's `typescript`, so svelte-check runs in its
// native mode (`--tsgo`): svelte2tsx writes the transpiled components to an emit
// directory and TypeScript 7 (`typescript/bin/tsc`) checks them with every .ts file
// tsconfig.json includes. patches/svelte-check@4.7.6.patch lets `--tsgo` find
// TypeScript 7 as `typescript` itself; .pnpmfile.cjs gives svelte2tsx its in-process
// parser (the RU13b companion). Copied from xoxd-spectrogram, adapted from site.scaffold scripts/bazel
// (run-svelte-check.mjs + prepare-sveltekit-types.mjs), without SvelteKit.
//
//   --workspace <tree>           check a writable scratch copy of the declared tree
//                                (runfiles are read-only and --tsgo writes)
//   --workspace <tree> --canary  seed one .ts and one .svelte type error and fail
//                                unless svelte-check reports both
import { spawn } from 'node:child_process';
import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const svelteCheckCli = resolve(dirname(require.resolve('svelte-check/package.json')), 'bin/svelte-check');

let args = process.argv.slice(2);
if (args[0] !== '--workspace' || !args[1]) throw new Error('usage: --workspace <declared-tree> [--canary] [svelte-check args]');
const declared = resolve(args[1]);
args = args.slice(2);
const canary = args.includes('--canary');
args = args.filter((arg) => arg !== '--canary');

for (const required of ['src', 'tsconfig.json', 'package.json']) {
	if (!existsSync(join(declared, required))) throw new Error(`declared workspace is missing ${required}`);
}
const declaredNodeModules = join(dirname(declared), 'node_modules');
if (!existsSync(declaredNodeModules)) throw new Error('declared runfiles are missing node_modules');

// Bazel inputs are symlinks into read-only trees; statSync/copyFileSync follow every
// link, so each entry in the scratch copy is a new writable file.
function copyTree(source, destination) {
	if (statSync(source).isDirectory()) {
		mkdirSync(destination, { recursive: true });
		chmodSync(destination, 0o755);
		for (const entry of readdirSync(source)) copyTree(join(source, entry), join(destination, entry));
		return;
	}
	copyFileSync(source, destination);
	chmodSync(destination, 0o644);
}

const root = mkdtempSync(join(process.env.TEST_TMPDIR ?? tmpdir(), 'svelte-check-'));
const cleanup = () => rmSync(root, { recursive: true, force: true });
const workspace = join(root, 'workspace');
copyTree(declared, workspace);
// A real node_modules directory (svelte-check may write its cache there); every declared
// package entry is a symlink into the read-only runfiles tree.
const nodeModules = join(workspace, 'node_modules');
mkdirSync(nodeModules, { recursive: true });
for (const entry of readdirSync(declaredNodeModules)) symlinkSync(join(declaredNodeModules, entry), join(nodeModules, entry));

const CANARY_TS = 'src/__tsgo_canary__.ts';
const CANARY_SVELTE = 'src/components/__TsgoCanary__.svelte';
if (canary) {
	writeFileSync(join(workspace, CANARY_TS), "export const canary: number = 'not a number';\n");
	writeFileSync(
		join(workspace, CANARY_SVELTE),
		"<script lang=\"ts\">\n\tconst canary: number = 'not a number';\n</script>\n\n<p>{canary}</p>\n",
	);
}

const child = spawn(
	process.execPath,
	[svelteCheckCli, '--tsgo', '--tsconfig', './tsconfig.json', ...(canary ? ['--output', 'machine'] : []), ...args],
	{ stdio: canary ? ['ignore', 'pipe', 'inherit'] : 'inherit', cwd: workspace, env: process.env },
);

let output = '';
child.stdout?.on('data', (chunk) => {
	output += chunk;
	process.stdout.write(chunk);
});
child.on('error', (error) => {
	cleanup();
	console.error(error);
	process.exit(1);
});
child.on('exit', (code) => {
	cleanup();
	if (!canary) process.exit(code ?? 1);
	const errors = output.split('\n').filter((line) => / ERROR /u.test(line));
	const missing = [CANARY_TS, CANARY_SVELTE].filter((file) => !errors.some((line) => line.includes(file)));
	if (code === 0 || missing.length > 0) {
		console.error(`svelte-check --tsgo canary FAILED: exit ${code}; seeded errors not reported in ${missing.join(', ') || '(none)'}`);
		process.exit(1);
	}
	console.log('svelte-check --tsgo canary: both seeded type errors were reported, the gate is live');
	process.exit(0);
});
