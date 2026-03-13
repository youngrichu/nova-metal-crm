import { db } from '$lib/server/db';
import { products, categories } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { generateSKU } from '$lib/utils/skuGenerator';

export const load = async () => {
	const allProducts = await db.select({
		product: products,
		category: categories
	}).from(products)
	  .leftJoin(categories, eq(products.categoryId, categories.id))
	  .orderBy(products.sku);
	  
	const allCategories = await db.select().from(categories).orderBy(categories.name);

	return { 
		products: allProducts,
		categories: allCategories 
	};
};

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString();
		const categoryId = data.get('categoryId')?.toString();
		const description = data.get('description')?.toString();
		const barcode = data.get('barcode')?.toString() || null;

		const thickness = data.get('thickness') ? parseFloat(data.get('thickness') as string) : null;
		const size1 = data.get('size1') ? parseFloat(data.get('size1') as string) : null;
		const size2 = data.get('size2') ? parseFloat(data.get('size2') as string) : null;
		const length = data.get('length') ? parseFloat(data.get('length') as string) : null;
		const weightPerPiece = data.get('weightPerPiece') ? parseFloat(data.get('weightPerPiece') as string) : null;
		const minStockLevel = data.get('minStockLevel') ? parseInt(data.get('minStockLevel') as string, 10) : 10;

		if (!name || !categoryId) {
			return fail(400, { missing: true });
		}

		try {
			// Find the category prefix to generate the SKU
			const category = await db.query.categories.findFirst({
				where: eq(categories.id, categoryId)
			});

			if (!category) return fail(404, { error: 'Category not found' });

			const sku = generateSKU({
				categoryPrefix: category.prefix,
				size1,
				size2,
				thickness,
				length
			});

			await db.insert(products).values({
				categoryId,
				sku,
				name,
				description,
				thickness: thickness ? thickness.toString() : null,
				size1: size1 ? size1.toString() : null,
				size2: size2 ? size2.toString() : null,
				length: length ? length.toString() : null,
				weightPerPiece: weightPerPiece ? weightPerPiece.toString() : null,
				minStockLevel,
				barcode
			});

			return { success: true };
		} catch (e: any) {
			console.error(e)
			if (e.code === '23505') { // Unique constraint violation (SKU or barcode)
				if (e.detail?.includes('barcode') || e.constraint?.includes('barcode')) {
					return fail(400, { duplicate: true, message: 'A product with this barcode already exists.' });
				}
				return fail(400, { duplicate: true, message: 'A product with this identical SKU properties already exists.' });
			}
			return fail(500, { error: 'Unknown server error' });
		}
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();

		if (!id) return fail(400, { missing: true });

		try {
			await db.delete(products).where(eq(products.id, id));
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: 'Could not delete product. Ensure no inventory transactions depend on it.' });
		}
	},
	update: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString();
		const categoryId = data.get('categoryId')?.toString();
		const description = data.get('description')?.toString() || null;
		const barcode = data.get('barcode')?.toString() || null;

		const thickness = data.get('thickness') ? parseFloat(data.get('thickness') as string) : null;
		const size1 = data.get('size1') ? parseFloat(data.get('size1') as string) : null;
		const size2 = data.get('size2') ? parseFloat(data.get('size2') as string) : null;
		const length = data.get('length') ? parseFloat(data.get('length') as string) : null;
		const weightPerPiece = data.get('weightPerPiece') ? parseFloat(data.get('weightPerPiece') as string) : null;
		const minStockLevel = data.get('minStockLevel') ? parseInt(data.get('minStockLevel') as string, 10) : 10;

		if (!id || !name || !categoryId) return fail(400, { missing: true });

		try {
			const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
			if (!category) return fail(404, { error: 'Category not found' });

			const sku = generateSKU({ categoryPrefix: category.prefix, size1, size2, thickness, length });

			await db.update(products)
				.set({
					categoryId, sku, name, description,
					thickness: thickness ? thickness.toString() : null,
					size1: size1 ? size1.toString() : null,
					size2: size2 ? size2.toString() : null,
					length: length ? length.toString() : null,
					weightPerPiece: weightPerPiece ? weightPerPiece.toString() : null,
					minStockLevel,
					barcode
				})
				.where(eq(products.id, id));

			return { success: true };
		} catch (e: any) {
			if (e.code === '23505') {
				if (e.detail?.includes('barcode') || e.constraint?.includes('barcode')) {
					return fail(400, { duplicate: true, message: 'A product with this barcode already exists.' });
				}
				return fail(400, { duplicate: true, message: 'A product with this identical SKU already exists.' });
			}
			return fail(500, { error: 'Could not update product.' });
		}
	}
};
