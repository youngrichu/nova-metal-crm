import { writeFileSync } from 'node:fs';
import { createReleaseManifest } from './release-manifest';

function requireEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

const manifest = createReleaseManifest({
	version: requireEnv('NOVA_RELEASE_VERSION'),
	packageUrl: requireEnv('NOVA_RELEASE_PACKAGE_URL'),
	sha256: requireEnv('NOVA_RELEASE_SHA256'),
	changelog: requireEnv('NOVA_RELEASE_CHANGELOG')
});

const outFile = process.env.NOVA_RELEASE_MANIFEST_PATH?.trim() || 'latest.json';
writeFileSync(`${outFile}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote release manifest to ${outFile}`);
