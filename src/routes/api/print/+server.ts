import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use dynamic require/import for node-only modules to avoid Vite client bundling issues
import { createRequire } from "module";
const require = createRequire(import.meta.url);

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
	console.warn("ESC/POS drivers not fully available in this environment, printing might fail in Vercel.");
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		const { order, items, printerType = 'network', printerAddress = '192.168.1.100' } = body;

		if (!escpos) {
			return json({ error: 'Printer drivers missing on host server' }, { status: 500 });
		}

		let device: any;
		if (printerType === 'usb') {
			device = new escpos.USB();
		} else {
			device = new escpos.Network(printerAddress);
		}

		const printer = new escpos.Printer(device);

		await new Promise((resolve, reject) => {
			device.open((err: any) => {
				if (err) return reject(err);

				printer
					.font('a')
					.align('ct')
					.style('b')
					.size(2, 2)
					.text('NOVA METAL PLC')
					.size(1, 1)
					.text('Addis Ababa, Ethiopia')
					.text('Tel: +251 911 000 000')
					.drawLine()
					
					.align('lt')
					.style('normal')
					.text(`Order: ${order.orderNumber}`)
					.text(`Date: ${new Date().toLocaleString()}`)
					.text(`Cashier: ${user.name}`)
					.drawLine();

				// Print Items
				items.forEach((item: any) => {
					printer.tableCustom([
						{ text: item.name.substring(0, 15), align: 'LEFT', width: 0.4 },
						{ text: item.quantity.toString(), align: 'CENTER', width: 0.2 },
						{ text: item.price.toString(), align: 'RIGHT', width: 0.4 }
					]);
				});

				printer
					.drawLine()
					.align('rt')
					.style('b')
					.text(`TOTAL: ETB ${order.totalAmount}`)
					.drawLine()
					.align('ct')
					.style('normal')
					.text('Thanks for your business!')
					.cut()
					.close();

				resolve(true);
			});
		});

		return json({ success: true });
	} catch (e: any) {
		console.error('Print Error:', e);
		return json({ error: 'Failed to connect/print to terminal: ' + (e.message || 'Unknown') }, { status: 500 });
	}
};
