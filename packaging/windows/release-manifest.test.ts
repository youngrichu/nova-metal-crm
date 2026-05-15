import { describe, expect, it } from 'vitest';
import { createReleaseManifest } from './release-manifest';

describe('createReleaseManifest', () => {
	it('creates the updater manifest from release metadata', () => {
		expect(
			createReleaseManifest({
				version: '1.2.3',
				packageUrl: 'https://example.com/nova-pos-1.2.3.zip',
				sha256: 'ABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
				changelog: 'Inventory fixes'
			})
		).toEqual({
			version: '1.2.3',
			packageUrl: 'https://example.com/nova-pos-1.2.3.zip',
			sha256: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
			changelog: 'Inventory fixes'
		});
	});

	it('rejects invalid version strings', () => {
		expect(() =>
			createReleaseManifest({
				version: 'v1.2.3',
				packageUrl: 'https://example.com/nova-pos-v1.2.3.zip',
				sha256: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
				changelog: 'Inventory fixes'
			})
		).toThrow('version');
	});

	it('rejects non-https package URLs', () => {
		expect(() =>
			createReleaseManifest({
				version: '1.2.3',
				packageUrl: 'http://example.com/nova-pos-1.2.3.zip',
				sha256: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
				changelog: 'Inventory fixes'
			})
		).toThrow('packageUrl');
	});
});
