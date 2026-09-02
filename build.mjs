// Bundles the JS entrypoints. Type declarations are emitted separately by
// `tsc -p tsconfig.build.json` (see the "build" script in package.json).
const entrypoints = [
	['./src/index.ts', './lib'],
	['./src/patterns/index.ts', './lib/patterns'],
	['./src/helpers/index.ts', './lib/helpers'],
]

for (const [entrypoint, outdir] of entrypoints) {
	const result = await Bun.build({
		entrypoints: [entrypoint],
		outdir,
		format: 'esm',
		minify: true,
	})
	if (!result.success) {
		for (const log of result.logs) console.error(log)
		process.exit(1)
	}
}
