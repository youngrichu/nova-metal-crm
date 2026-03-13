import { json } from '@sveltejs/kit';
import { calculateDynamicPrice } from '$lib/server/pricing/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { productId, customerId, quantity } = await request.json();

        if (!productId) {
            return json({ error: 'Missing productId' }, { status: 400 });
        }

        const pricing = await calculateDynamicPrice(productId, customerId, quantity || 1);
        return json(pricing);
    } catch (error: any) {
        return json({ error: error.message || 'Failed to calculate price' }, { status: 500 });
    }
};
