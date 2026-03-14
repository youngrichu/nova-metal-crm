import { json } from '@sveltejs/kit';
import { calculateDynamicPrice } from '$lib/server/pricing/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { productId, customerId, quantity, pricingTier } = await request.json();

        if (!productId) {
            return json({ error: 'Missing productId' }, { status: 400 });
        }

        // Suppression rule: if customerId is present, it wins — never forward pricingTierOverride.
        // customerId || null guards against empty-string values (treated same as absent)
        const effectiveCustomerId = customerId || null;
        const VALID_TIERS = ['RETAIL', 'WHOLESALE', 'VIP', 'PREFERRED'] as const;
        const validatedTier = VALID_TIERS.includes(pricingTier) ? pricingTier : undefined;
        const tierOverride = effectiveCustomerId ? undefined : validatedTier;

        const pricing = await calculateDynamicPrice(productId, effectiveCustomerId, quantity || 1, undefined, tierOverride);
        return json(pricing);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to calculate price';
        return json({ error: message }, { status: 500 });
    }
};
