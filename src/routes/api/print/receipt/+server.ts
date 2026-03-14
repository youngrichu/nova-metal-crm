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

async function getPrinterSettings(): Promise<{ type: string; address: string; paperWidth: number; vatRate: number; currencyCode: string; currencyLocale: string }> {
	const rows = await db
		.select()
		.from(systemSettings)
		.where(inArray(systemSettings.key, ['printer_type', 'printer_address', 'paper_width', 'vat_rate', 'currency_code', 'currency_locale']));

	const map: Record<string, string> = {};
	for (const row of rows) map[row.key] = row.value;

	return {
		type: map.printer_type ?? 'network',
		address: map.printer_address ?? '192.168.1.100',
		paperWidth: parseInt(map.paper_width ?? '80', 10),
		vatRate: parseFloat(map.vat_rate ?? '0.15'),
		currencyCode: map.currency_code ?? 'ETB',
		currencyLocale: map.currency_locale ?? 'en-ET'
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
		// 80mm = 48 chars, 58mm = 32 chars. Name column is 0.55 of line width.
		const lineWidth = config.paperWidth === 58 ? 32 : 48;
		const nameColWidth = Math.floor(lineWidth * 0.55);

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

		const PRINT_TIMEOUT_MS = 15000;

		await new Promise<void>((resolve, reject) => {
			let deviceOpened = false;

			const timeout = setTimeout(() => {
				if (deviceOpened) {
					try { printer.close(); } catch (_) { /* ignore */ }
				}
				reject(new Error('Print timed out after 15 seconds'));
			}, PRINT_TIMEOUT_MS);

			device.open((err: any) => {
				if (err) {
					clearTimeout(timeout);
					return reject(err);
				}
				deviceOpened = true;

				try {
					const vatLabel = `VAT ${Math.round(config.vatRate * 100)}%:`;

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
						.text(`Date:    ${new Date(o.createdAt).toLocaleString(config.currencyLocale)}`)
						.text(`Cashier: ${user.name ?? user.email ?? 'Staff'}`)
						.text(`Customer: ${c?.name ?? 'Walk-in'}`)
						.drawLine()

						.style('b')
						.text('ITEMS')
						.style('normal');

					for (const item of items) {
						const name = (item.product?.name ?? item.product?.sku ?? 'Item').substring(0, nameColWidth);
						printer.tableCustom([
							{ text: name,                                    align: 'LEFT',   width: 0.55 },
							{ text: `x${item.quantity}`,                     align: 'CENTER', width: 0.15 },
							{ text: `${Number(item.lineTotal).toFixed(2)}`,  align: 'RIGHT',  width: 0.30 }
						]);
					}

					printer
						.drawLine()
						.align('rt')
						.text(`Subtotal:  ${config.currencyCode} ${Number(o.subtotal).toFixed(2)}`)
						.text(`${vatLabel.padEnd(10)} ${config.currencyCode} ${Number(o.taxAmount).toFixed(2)}`)
						.style('b')
						.text(`TOTAL:     ${config.currencyCode} ${Number(o.totalAmount).toFixed(2)}`)
						.style('normal')
						.drawLine()
						.align('ct')
						.text('Thank you for your business!')
						.cut()
						.close(() => {
							clearTimeout(timeout);
							resolve();
						});
				} catch (printErr) {
					clearTimeout(timeout);
					reject(printErr);
				}
			});
		});

		return json({ success: true, message: 'Receipt sent to printer' });

	} catch (err: any) {
		console.error('Thermal printing failed:', err);
		return json({ success: false, error: 'Failed to communicate with printer' }, { status: 500 });
	}
};
