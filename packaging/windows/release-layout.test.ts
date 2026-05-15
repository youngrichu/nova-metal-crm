import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateReleaseLayout } from './release-layout';

function makeReleaseRoot(paths: string[]): string {
	const root = mkdtempSync(join(tmpdir(), 'nova-release-layout-'));
	for (const relativePath of paths) {
		const fullPath = join(root, relativePath);
		if (relativePath.endsWith('/')) {
			mkdirSync(fullPath, { recursive: true });
		} else {
			mkdirSync(join(fullPath, '..'), { recursive: true });
			writeFileSync(fullPath, '');
		}
	}
	return root;
}

describe('validateReleaseLayout', () => {
	it('accepts a complete release directory', () => {
		const root = makeReleaseRoot([
			'install.bat',
			'app/build/',
			'app/package.json',
			'app/node_modules/',
			'app/scripts/migrate.mjs',
			'app/src/lib/server/db/migrations/meta/_journal.json',
			'runtime/node/node.exe',
			'runtime/postgres/bin/initdb.exe',
			'runtime/postgres/bin/pg_ctl.exe',
			'runtime/postgres/bin/pg_dump.exe',
			'runtime/postgres/bin/psql.exe',
			'service/winsw.exe',
			'packaging/windows/install.ps1',
			'packaging/windows/update.ps1',
			'packaging/windows/uninstall.ps1'
		]);

		expect(validateReleaseLayout(root)).toEqual([]);
	});

	it('reports every missing required path', () => {
		const root = makeReleaseRoot(['app/build/']);

		expect(validateReleaseLayout(root)).toContain('app/package.json');
		expect(validateReleaseLayout(root)).toContain('runtime/postgres/bin/initdb.exe');
		expect(validateReleaseLayout(root)).toContain('packaging/windows/update.ps1');
	});
});
