import { validateReleaseLayout } from './release-layout';

const root = process.argv[2] ?? 'release';
const missing = validateReleaseLayout(root);

if (missing.length > 0) {
	console.error(`Release layout is missing ${missing.length} required path(s):`);
	for (const path of missing) {
		console.error(`- ${path}`);
	}
	process.exit(1);
}

console.log(`Release layout is valid: ${root}`);
