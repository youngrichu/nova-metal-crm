import { describe, expect, it } from 'vitest';
import { resolvePublicAppVersion } from './app-version';

describe('resolvePublicAppVersion', () => {
	it('returns the configured public app version when present', () => {
		expect(resolvePublicAppVersion({ PUBLIC_APP_VERSION: '1.2.3' })).toBe('1.2.3');
	});

	it('falls back when the public app version is missing', () => {
		expect(resolvePublicAppVersion({})).toBe('0.0.0');
	});

	it('falls back when the public app version is blank', () => {
		expect(resolvePublicAppVersion({ PUBLIC_APP_VERSION: '   ' })).toBe('0.0.0');
	});
});
