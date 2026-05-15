const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;

export type ReleaseManifest = {
	version: string;
	packageUrl: string;
	sha256: string;
	changelog: string;
};

export function createReleaseManifest(input: ReleaseManifest): ReleaseManifest {
	const version = input.version.trim();
	if (!SEMVER_RE.test(version)) {
		throw new Error('version must use X.Y.Z format');
	}

	let url: URL;
	try {
		url = new URL(input.packageUrl);
	} catch {
		throw new Error('packageUrl must be a valid HTTPS URL');
	}
	if (url.protocol !== 'https:') {
		throw new Error('packageUrl must use HTTPS');
	}

	const sha256 = input.sha256.trim().toLowerCase();
	if (!SHA256_RE.test(sha256)) {
		throw new Error('sha256 must be a 64-character hex string');
	}

	const changelog = input.changelog.trim();
	if (!changelog) {
		throw new Error('changelog is required');
	}

	return {
		version,
		packageUrl: url.toString(),
		sha256,
		changelog
	};
}
