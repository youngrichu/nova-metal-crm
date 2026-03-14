// src/routes/api/print/receipt/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products, systemSettings } from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

// Dynamic require to avoid Vite bundling native USB/network modules
let escpos: any;
let escposUsb: any;
let escposNetwork: any;

try {
	escpos = require('escpos');
	escposUsb = require('escpos-usb');
	escposNetwork = require('escpos-network');
	escpos.USB = escposUsb;
	escpos.Network = escposNetwork;
} catch (e) {
	console.warn('ESC/POS drivers not available:', e);
}

async function getPrinterSettings(): Promise<{ type: string; address: string; paperWidth: number }> {
	const rows = await db
		.select()
		.from(systemSettings)
		.where(inArray(systemSettings.key, ['printer_type', 'printer_address', 'paper_width']));

	const map: Record<string, string> = {};
	for (const row of rows) map[row.key] = row.value;

	return {
		type: map.printer_type ?? 'network',
		address: map.printer_address ?? '192.168.1.100',
		paperWidth: parseInt(map.paper_width ?? '80', 10)
	};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { orderId } = await request.json();

		if (!orderId) {
			return json({ success: false, error: 'Order ID is required' }, { status: 400 });
		}

		const [order] = await db
			.select()
			.from(salesOrders)
			.leftJoin(customers, eq(salesOrders.customerId, customers.id))
			.where(eq(salesOrders.id, orderId))
			.limit(1);

		if (!order) {
			return json({ success: false, error: 'Order not found' }, { status: 404 });
		}

		const items = await db
			.select({
				quantity: salesOrderItems.quantity,
				unitPrice: salesOrderItems.unitPrice,
				lineTotal: salesOrderItems.lineTotal,
				product: {
					sku: products.sku,
					name: products.name
				}
			})
			.from(salesOrderItems)
			.leftJoin(products, eq(salesOrderItems.productId, products.id))
			.where(eq(salesOrderItems.orderId, orderId));

		if (!escpos) {
			return json({ success: false, error: 'Printer drivers not available on this server' }, { status: 500 });
		}

		const config = await getPrinterSettings();
		// 80mm paper = 48 chars wide; 58mm paper = 32 chars wide
		const lineWidth = config.paperWidth === 58 ? 32 : 48;

		let device: any;
		if (config.type === 'usb') {
			device = new escpos.USB();
		} else {
			// address may include port as "ip:port", default to 9100
			const [host, port] = config.address.split(':');
			device = new escpos.Network(host, port ? parseInt(port, 10) : 9100);
		}

		const printer = new escpos.Printer(device);
		const o = order.sales_orders;
		const c = order.customers;

		await new Promise<void>((resolve, reject) => {
			device.open((err: any) => {
				if (err) return reject(err);

				printer
					.font('a')
					.align('ct')
					.style('b')
					.size(2, 2)
					.text('NOVA METAL PLC')
					.size(1, 1)
					.style('normal')
					.text('Addis Ababa, Ethiopia')
					.drawLine()

					.align('lt')
					.text(`Receipt: ${o.orderNumber}`)
					.text(`Date:    ${new Date(o.createdAt).toLocaleString('en-ET')}`)
					.text(`Cashier: ${user.name}`)
					.text(`Customer: ${c?.name ?? 'Walk-in'}`)
					.drawLine()

					.style('b')
					.text('ITEMS')
					.style('normal');

				for (const item of items) {
					const name = (item.product?.name ?? item.product?.sku ?? 'Item').substring(0, lineWidth - 16);
					printer.tableCustom([
						{ text: name,                                       align: 'LEFT',  width: 0.55 },
						{ text: `x${item.quantity}`,                        align: 'CENTER', width: 0.15 },
						{ text: `${Number(item.lineTotal).toFixed(2)}`,     align: 'RIGHT', width: 0.30 }
					]);
				}

				printer
					.drawLine()
					.align('rt')
					.text(`Subtotal: ETB ${Number(o.subtotal).toFixed(2)}`)
					.text(`VAT 15%:  ETB ${Number(o.taxAmount).toFixed(2)}`)
					.style('b')
					.text(`TOTAL:    ETB ${Number(o.totalAmount).toFixed(2)}`)
					.style('normal')
					.drawLine()
					.align('ct')
					.text('Thank you for your business!')
					.cut()
					.close();

				resolve();
			});
		});

		return json({ success: true, message: 'Receipt sent to printer' });

	} catch (err: any) {
		console.error('Thermal printing failed:', err);
		return json({ success: false, error: err.message ?? 'Failed to communicate with printer' }, { status: 500 });
	}
};
