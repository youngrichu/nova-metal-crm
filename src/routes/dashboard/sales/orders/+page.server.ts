import { error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, customers } from "$lib/server/db/schema";
import { eq, desc, ilike, or } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get("q") || "";

	try {
		let dbQuery = db
			.select({
				id: salesOrders.id,
				orderNumber: salesOrders.orderNumber,
				status: salesOrders.status,
				totalAmount: salesOrders.totalAmount,
				createdAt: salesOrders.createdAt,
				customer: {
					id: customers.id,
					name: customers.name,
					companyName: customers.companyName,
				}
			})
			.from(salesOrders)
			.leftJoin(customers, eq(salesOrders.customerId, customers.id))
			.orderBy(desc(salesOrders.createdAt));

		const orders = await dbQuery;

		// Client-side or basic server-side filtering for simplicity if query exists
		let filteredOrders = orders;
		if (query) {
			const lowerQuery = query.toLowerCase();
			filteredOrders = orders.filter(o => 
				o.orderNumber.toLowerCase().includes(lowerQuery) ||
				(o.customer?.name && o.customer.name.toLowerCase().includes(lowerQuery)) ||
				(o.customer?.companyName && o.customer.companyName.toLowerCase().includes(lowerQuery))
			);
		}

		return {
			orders: filteredOrders
		};
	} catch (err) {
		console.error("Failed to load orders:", err);
		throw error(500, "Failed to load orders");
	}
};
