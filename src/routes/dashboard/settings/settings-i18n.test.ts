import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cases = [
	{
		path: 'src/routes/dashboard/settings/+page.svelte',
		literals: ['Redirecting to settings...']
	},
	{
		path: 'src/routes/dashboard/settings/profile/+page.svelte',
		literals: ['Settings', 'Account Details', 'Display Name', 'Change Password', 'Save Name']
	},
	{
		path: 'src/routes/dashboard/settings/system/+page.svelte',
		literals: ['System Config', 'Pricing Configuration', 'Currency Formatting', 'Barcode Features', 'Save Settings']
	},
	{
		path: 'src/routes/dashboard/settings/users/+page.svelte',
		literals: ['Settings / Admin', 'User Management', 'Create New User', 'Add User', 'No users found']
	},
	{
		path: 'src/routes/dashboard/settings/backup/+page.svelte',
		literals: ['Database Export', 'Backup Schedule', 'System Updates', 'Check for Updates', 'Export Full Data Package']
	}
];

describe('settings pages use i18n messages for visible UI copy', () => {
	it.each(cases)('removes known hard-coded strings from $path', ({ path, literals }) => {
		const source = readFileSync(path, 'utf8')
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/\/\/.*$/gm, '');

		for (const literal of literals) {
			expect(source).not.toContain(literal);
		}
	});
});
