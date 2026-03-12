import { describe, it, expect } from 'vitest';
import { customerSchema } from './customer';

describe('Customer Validation Logic', () => {
	it('should successfully validate a complete enterprise customer', () => {
		const validCustomer = {
			name: 'John Doe',
			companyName: 'Doe Industries',
			customerType: 'ENTERPRISE',
			pricingTier: 'VIP',
			phone: '+251911234567',
			email: 'john@doe.com'
		};
		const result = customerSchema.safeParse(validCustomer);
		expect(result.success).toBe(true);
	});

	it('should return an error if the name is shorter than 2 characters', () => {
		const invalidCustomer = {
			name: 'J',
			customerType: 'INDIVIDUAL',
			pricingTier: 'STANDARD'
		};
		const result = customerSchema.safeParse(invalidCustomer);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Name must be at least 2 characters');
		}
	});

	it('should return an error for an invalid email format', () => {
		const invalidCustomer = {
			name: 'Jane Doe',
			customerType: 'INDIVIDUAL',
			pricingTier: 'STANDARD',
			email: 'not-an-email'
		};
		const result = customerSchema.safeParse(invalidCustomer);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toBe('Invalid email format');
		}
	});

	it('should accept an empty string for email since it is optional', () => {
		const edgeCaseCustomer = {
			name: 'Jane Doe',
			customerType: 'INDIVIDUAL',
			pricingTier: 'STANDARD',
			email: ''
		};
		const result = customerSchema.safeParse(edgeCaseCustomer);
		expect(result.success).toBe(true);
	});
});
