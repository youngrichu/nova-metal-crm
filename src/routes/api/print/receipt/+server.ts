// src/routes/api/print/receipt/+server.ts
import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products, systemSettings } from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

// Dynamic require to avoid Vite bundling native USB/network modules.
// Each driver is loaded independently so a missing sub-module doesn't
// silently leave escpos.USB / escpos.Network undefined.
let escpos: any;

try { escpos = require('escpos'); } catch (e) { console.warn('escpos not available:', e); }
try {
	const escposUsb = require('escpos-usb');
	if (escpos) escpos.USB = escposUsb;
} catch (e) { console.warn('escpos-usb not available:', e); }
try {
	const escposNetwork = require('escpos-network');
	if (escpos) escpos.Network = escposNetwork;
} catch (e) { console.warn('escpos-network not available:', e); }

async function getPrinterSettings(): Promise<{ type: string; address: string; paperWidth: number; vatRate: number; currencyCode: string; currencyLocale: string; companyName: string; companyAddress: string }> {
	const rows = await db
		.select()
		.from(systemSettings)
		.where(inArray(systemSettings.key, ['printer_type', 'printer_address', 'paper_width', 'vat_rate', 'currency_code', 'currency_locale', 'company_name', 'company_address']));

	const map: Record<string, string> = {};
	for (const row of rows) map[row.key] = row.value;

	return {
		type: map.printer_type ?? 'network',
		address: map.printer_address ?? '192.168.1.100',
		paperWidth: parseInt(map.paper_width ?? '80', 10),
		vatRate: parseFloat(map.vat_rate ?? '0.15'),
		currencyCode: map.currency_code ?? 'ETB',
		currencyLocale: map.currency_locale ?? 'en-ET',
		companyName: map.company_name ?? 'NOVA METAL PLC',
		companyAddress: map.company_address ?? 'Addis Ababa, Ethiopia'
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
		// 80mm = 48 chars, 58mm = 32 chars. Name column is 0.55 of line width.
		const lineWidth = config.paperWidth === 58 ? 32 : 48;
		const nameColWidth = Math.floor(lineWidth * 0.55);

		let device: any;
		if (config.type === 'usb') {
			if (!escpos.USB) {
				return json({ success: false, error: 'USB printer driver failed to load on this server' }, { status: 500 });
			}
			device = new escpos.USB();
		} else {
			if (!escpos.Network) {
				return json({ success: false, error: 'Network printer driver failed to load on this server' }, { status: 500 });
			}
			const lastColon = config.address.lastIndexOf(':');
			const host = lastColon === -1 ? config.address : config.address.substring(0, lastColon);
			const portNum = lastColon === -1 ? 9100 : parseInt(config.address.substring(lastColon + 1), 10);
			if (isNaN(portNum)) {
				return json({ success: false, error: `Invalid port in printer address: ${config.address}` }, { status: 500 });
			}
			device = new escpos.Network(host, portNum);
		}

		if (typeof escpos.Printer !== 'function') {
			return json({ success: false, error: 'Printer class not available — check escpos package version' }, { status: 500 });
		}
		const printer = new escpos.Printer(device);
		const o = order.sales_orders;
		const c = order.customers;

		const PRINT_TIMEOUT_MS = 15000;

		await new Promise<void>((resolve, reject) => {
			let deviceOpened = false;
			let cancelled = false;
			let alreadyClosed = false;

			function safeClose() {
				if (!alreadyClosed) {
					alreadyClosed = true;
					try { printer.close(); } catch (_) { /* ignore */ }
				}
			}

			const timeout = setTimeout(() => {
				cancelled = true;
				if (deviceOpened) safeClose();
				reject(new Error('Print timed out after 15 seconds'));
			}, PRINT_TIMEOUT_MS);

			device.open((err: any) => {
				// Timeout already fired — close device immediately to prevent ghost print
				if (cancelled) {
					safeClose();
					return;
				}
				if (err) {
					clearTimeout(timeout);
					return reject(err);
				}
				deviceOpened = true;

				try {
					const vatLabel = `VAT ${Math.round(config.vatRate * 100)}%:`;

					// At 2× width each char takes 2 positions; cap to avoid overflow
					const maxHeaderChars = Math.floor(lineWidth / 2);

					printer
						.font('a')
						.align('ct')
						.style('b')
						.size(2, 2)
						.text(config.companyName.substring(0, maxHeaderChars))
						.size(1, 1)
						.style('normal')
						.text(config.companyAddress.substring(0, lineWidth))
						.drawLine()

						.align('lt')
						.text(`Receipt: ${o.orderNumber}`)
						.text(`Date:    ${(() => { try { return new Date(o.createdAt).toLocaleString(config.currencyLocale); } catch { return new Date(o.createdAt).toLocaleString('en-ET'); } })()}`)
						.text(`Cashier: ${user.name ?? user.email ?? 'Staff'}`)
						.text(`Customer: ${c?.name ?? 'Walk-in'}`)
						.drawLine()

						.style('b')
						.text('ITEMS')
						.style('normal');

					if (items.length === 0) {
						printer.text('(no items)');
					} else {
						for (const item of items) {
							const name = (item.product?.name ?? item.product?.sku ?? 'Item').substring(0, nameColWidth);
							printer.tableCustom([
								{ text: name,                                    align: 'LEFT',   width: 0.55 },
								{ text: `x${item.quantity ?? 0}`,                align: 'CENTER', width: 0.15 },
								{ text: `${Number(item.lineTotal).toFixed(2)}`,  align: 'RIGHT',  width: 0.30 }
							]);
						}
					}

					printer
						.drawLine()
						.align('rt')
						.text(`Subtotal:  ${config.currencyCode} ${Number(o.subtotal).toFixed(2)}`)
						.text(`${vatLabel.padEnd(11)}${config.currencyCode} ${Number(o.taxAmount).toFixed(2)}`)
						.style('b')
						.text(`TOTAL:     ${config.currencyCode} ${Number(o.totalAmount).toFixed(2)}`)
						.style('normal')
						.drawLine()
						.align('ct')
						.text('Thank you for your business!')
						.cut()
						.close((closeErr: any) => {
							alreadyClosed = true;
							clearTimeout(timeout);
							if (closeErr) {
								reject(closeErr);
							} else {
								resolve();
							}
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
		return json({ success: false, error: err.message ?? 'Failed to communicate with printer' }, { status: 500 });
	}
};
