import { describe, expect, it } from 'vitest';
import {
	buildProductCardColumns,
	formatProductCountLabel,
	getProductStatusLabel
} from './catalog-products';

describe('getProductStatusLabel', () => {
	it('uses the active label for active products', () => {
		expect(getProductStatusLabel(true, 'Enabled', 'Disabled')).toBe('Enabled');
	});

	it('uses the inactive label for inactive products', () => {
		expect(getProductStatusLabel(false, 'Enabled', 'Disabled')).toBe('Disabled');
	});
});

describe('buildProductCardColumns', () => {
	it('returns translated labels in the expected order', () => {
		expect(
			buildProductCardColumns({
				name: 'Name',
				sku: 'SKU',
				status: 'Status',
				category: 'Category',
				cost: 'Cost (ETB)',
				minStock: 'Min Stock',
				active: 'Active'
			})
		).toEqual([
			{ key: 'name', label: 'Name', primary: true },
			{ key: 'sku', label: 'SKU', secondary: true },
			{
				key: 'isActiveLabel',
				label: 'Status',
				badge: true,
				badgeClass: expect.any(Function)
			},
			{ key: 'categoryName', label: 'Category' },
			{ key: 'averageLandingCost', label: 'Cost (ETB)' },
			{ key: 'minStockLevel', label: 'Min Stock' }
		]);
	});

	it('marks active labels with the success badge class', () => {
		const columns = buildProductCardColumns({
			name: 'Name',
			sku: 'SKU',
			status: 'Status',
			category: 'Category',
			cost: 'Cost (ETB)',
			minStock: 'Min Stock',
			active: 'Active'
		});

		const statusColumn = columns[2];
		expect(statusColumn.badgeClass?.('Active')).toContain('bg-green-100');
		expect(statusColumn.badgeClass?.('Inactive')).toContain('bg-red-100');
	});
});

describe('formatProductCountLabel', () => {
	it('uses the singular template when the count is one', () => {
		expect(formatProductCountLabel(1, '# Material Indexed', '# Materials Indexed')).toBe(
			'1 Material Indexed'
		);
	});

	it('uses the plural template for all other counts', () => {
		expect(formatProductCountLabel(3, '# Material Indexed', '# Materials Indexed')).toBe(
			'3 Materials Indexed'
		);
	});
});
