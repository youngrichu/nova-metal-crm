import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency';

describe('Calculations & Formatting', () => {
    describe('formatCurrency', () => {
        it('should format positive numbers to ETB', () => {
            expect(formatCurrency(1500).replace(/\s/, ' ')).toBe('ETB 1,500.00');
            expect(formatCurrency(1500.5).replace(/\s/, ' ')).toBe('ETB 1,500.50');
            expect(formatCurrency(0).replace(/\s/, ' ')).toBe('ETB 0.00');
        });

        it('should handle large numbers correctly', () => {
            expect(formatCurrency(1000000).replace(/\s/, ' ')).toBe('ETB 1,000,000.00');
        });
    });

    describe('Order Calculations', () => {
        it('should calculate subtotal, VAT, and total correctly', () => {
            const items = [
                { quantity: 2, unitPrice: 1500 }, // 3000
                { quantity: 5, unitPrice: 200 }   // 1000
            ];

            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const taxAmount = subtotal * 0.15;
            const totalAmount = subtotal + taxAmount;

            expect(subtotal).toBe(4000);
            expect(taxAmount).toBe(600);
            expect(totalAmount).toBe(4600);
        });
    });
});
