import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const REQUIRED_RELEASE_PATHS = [
	'install.bat',
	'app/build',
	'app/package.json',
	'app/node_modules',
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
] as const;

export function validateReleaseLayout(root: string): string[] {
	return REQUIRED_RELEASE_PATHS.filter((relativePath) => !existsSync(join(root, relativePath)));
}
