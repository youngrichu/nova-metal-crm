import { describe, expect, it } from 'vitest';
import { getBreadcrumbLabel } from './navigation';

describe('getBreadcrumbLabel', () => {
	it('returns translated labels for known dashboard segments', () => {
		expect(
			getBreadcrumbLabel('inventory', {
				dashboard: 'Dashboard',
				inventory: 'Inventory',
				counts: 'Stock Takes',
				reconcile: 'Reconciliation'
			})
		).toBe('Inventory');
	});

	it('falls back to a humanized label for unknown segments', () => {
		expect(
			getBreadcrumbLabel('order-history', {
				dashboard: 'Dashboard',
				inventory: 'Inventory',
				counts: 'Stock Takes',
				reconcile: 'Reconciliation'
			})
		).toBe('Order History');
	});
});
