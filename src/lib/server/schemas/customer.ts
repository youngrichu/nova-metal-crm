import { z } from 'zod';

export const customerSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	companyName: z.string().optional().nullable(),
	tinNumber: z.string().optional().nullable(),
	customerType: z.enum(['INDIVIDUAL', 'WORKSHOP', 'ENTERPRISE']).default('INDIVIDUAL'),
	pricingTier: z.enum(['STANDARD', 'PREFERRED', 'VIP']).default('STANDARD'),
	phone: z.string().optional().nullable(),
	whatsapp: z.string().optional().nullable(),
	email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
	address: z.string().optional().nullable(),
	notes: z.string().optional().nullable()
});

export type CustomerInput = z.infer<typeof customerSchema>;
