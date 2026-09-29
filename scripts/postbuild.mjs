// Copies non-TS assets (.node.json descriptors and .svg icons) from source
// directories into dist/, mirroring the structure tsc produced.
import { cp, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(path);
		else yield path;
	}
}

let copied = 0;
for (const base of ['nodes', 'credentials']) {
	for await (const file of walk(join(ROOT, base))) {
		if (/\.(json|svg)$/.test(file)) {
			const target = join(ROOT, 'dist', relative(ROOT, file));
			await cp(file, target, { force: true });
			copied++;
		}
	}
}
console.log(`postbuild: copied ${copied} asset file(s) to dist/`);
