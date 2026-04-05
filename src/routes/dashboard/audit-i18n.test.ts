import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cases = [
	{
		path: '/Users/richu/programming/nova/src/lib/components/layout/AppHeader.svelte',
		literals: ['Dashboard']
	},
	{
		path: '/Users/richu/programming/nova/src/routes/dashboard/inventory/+page.svelte',
		literals: ['Search locations...', 'Search SKU...', '— Select a valid SKU —']
	},
	{
		path: '/Users/richu/programming/nova/src/routes/dashboard/inventory/counts/[id]/+page.svelte',
		literals: ['This count session is closed. No further edits allowed.', 'All Count Sessions', 'Barcode Scanner']
	},
	{
		path: '/Users/richu/programming/nova/src/routes/dashboard/inventory/counts/[id]/reconcile/+page.svelte',
		literals: ['Count closed and inventory updated.', 'Close Count & Apply Adjustments', 'Confirm close?']
	}
];

describe('audit i18n regressions', () => {
	it.each(cases)('removes hard-coded audited literals from $path', ({ path, literals }) => {
		const source = readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\/\/.*$/gm, '');

		for (const literal of literals) {
			expect(source).not.toContain(literal);
		}
	});
});
