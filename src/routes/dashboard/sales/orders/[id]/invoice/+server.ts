import { error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { salesOrders, salesOrderItems, customers, products } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { createRequire } from "module";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const { default: Printer } = require("pdfmake/js/Printer.js");

const fontsDir = path.join(process.cwd(), "node_modules/pdfmake/build/fonts/Roboto");

const fonts = {
	Roboto: {
		normal: path.join(fontsDir, "Roboto-Regular.ttf"),
		bold: path.join(fontsDir, "Roboto-Medium.ttf"),
		italics: path.join(fontsDir, "Roboto-Italic.ttf"),
		bolditalics: path.join(fontsDir, "Roboto-MediumItalic.ttf")
	}
};

// No-op URL resolver — only needed for http/https assets; local file paths don't require it
const noopUrlResolver = {
	resolve: () => Promise.resolve(),
	resolved: () => Promise.resolve()
};

import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { RequestHandler } from "./$types";

// Cached logo data URL — loaded once on first request
let cachedLogoData: string | null = null;
async function getLogoData(): Promise<string> {
	if (cachedLogoData) return cachedLogoData;
	try {
		const logoPath = path.join(process.cwd(), "static", "nova_logo.jpeg");
		const data = await fs.promises.readFile(logoPath);
		cachedLogoData = `data:image/jpeg;base64,${data.toString("base64")}`;
		return cachedLogoData;
	} catch {
		return "";
	}
}

export const GET: RequestHandler = async ({ params }) => {
	const orderId = params.id;

	try {
		const [order] = await db
			.select({
				id: salesOrders.id,
				orderNumber: salesOrders.orderNumber,
                status: salesOrders.status,
                subtotal: salesOrders.subtotal,
                taxAmount: salesOrders.taxAmount,
                totalAmount: salesOrders.totalAmount,
                createdAt: salesOrders.createdAt,
				customer: {
                    name: customers.name,
                    companyName: customers.companyName,
                    address: customers.address,
                    phone: customers.phone,
                    tinNumber: customers.tinNumber
                }
			})
			.from(salesOrders)
            .leftJoin(customers, eq(salesOrders.customerId, customers.id))
			.where(eq(salesOrders.id, orderId))
			.limit(1);

		if (!order) throw error(404, "Order not found");

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

        // Format Date
        const orderDate = new Date(order.createdAt).toLocaleDateString('en-GB');

        // Load logo as base64 data URL (cached after first request)
        const logoData = await getLogoData();

        // Build PDF Document Definition
        const docDefinition: TDocumentDefinitions = {
            content: [
                {
                    image: logoData,
                    width: 180,
                    alignment: 'center',
                    margin: [0, 0, 0, 5]
                },
                {
                    text: 'Addis Ababa, Ethiopia | TIN: 0000000000 | VAT: 0000000000',
                    alignment: 'center',
                    color: '#666666',
                    fontSize: 9,
                    margin: [0, 0, 0, 30]
                },
                {
                    columns: [
                        {
                            width: '*',
                            text: [
                                { text: 'Billed To:\n', bold: true, fontSize: 12 },
                                `${order.customer?.name || 'Cash Customer'}\n`,
                                order.customer?.companyName ? `${order.customer.companyName}\n` : '',
                                order.customer?.phone ? `Phone: ${order.customer.phone}\n` : '',
                                order.customer?.tinNumber ? `TIN: ${order.customer.tinNumber}` : ''
                            ]
                        },
                        {
                            width: 'auto',
                            text: [
                                { text: `${order.status === 'INVOICED' ? 'INVOICE' : 'QUOTATION'}\n`, bold: true, fontSize: 16, alignment: 'right' },
                                `Number: ${order.orderNumber}\n`,
                                `Date: ${orderDate}\n`
                            ],
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 30]
                },
                {
                    layout: 'lightHorizontalLines',
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'Description', bold: true, color: '#333333' },
                                { text: 'Qty', bold: true, alignment: 'right', color: '#333333' },
                                { text: 'Unit Price (ETB)', bold: true, alignment: 'right', color: '#333333' },
                                { text: 'Total (ETB)', bold: true, alignment: 'right', color: '#333333' }
                            ],
                            ...items.map(item => [
                                `${item.product?.sku} - ${item.product?.name}`,
                                { text: Number(item.quantity).toLocaleString(), alignment: 'right' as const },
                                { text: Number(item.unitPrice).toLocaleString('en-ET', { minimumFractionDigits: 2 }), alignment: 'right' as const },
                                { text: Number(item.lineTotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }), alignment: 'right' as const }
                            ]) as any
                        ]
                    },
                    margin: [0, 0, 0, 20]
                },
                {
                    columns: [
                        { width: '*', text: '' }, // empty column to push totals to right
                        {
                            width: 'auto',
                            table: {
                                widths: [100, 100],
                                body: [
                                    ['Subtotal', { text: Number(order.subtotal).toLocaleString('en-ET', { minimumFractionDigits: 2 }), alignment: 'right' }],
                                    ['VAT (15%)', { text: Number(order.taxAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 }), alignment: 'right' }],
                                    [{ text: 'Total', bold: true, fontSize: 14 }, { text: Number(order.totalAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 }), alignment: 'right', bold: true, fontSize: 14 }]
                                ]
                            },
                            layout: 'noBorders'
                        }
                    ]
                },
                {
                    text: 'Thank you for your business!',
                    alignment: 'center',
                    italics: true,
                    margin: [0, 50, 0, 0],
                    color: '#666666'
                }
            ],
            styles: {
                header: {
                    fontSize: 24,
                    bold: true
                }
            },
            defaultStyle: {
                fontSize: 10,
                color: '#1e293b' // slate-800
            }
        };

        // Server-side PDF generation using pdfmake Printer (PDFKit-based)
        const printer = new Printer(fonts, null, noopUrlResolver);
		
		// Explicitly disable remote URL fetching to mitigate SSRF (CVE-2026-26801)
		// Even with noopUrlResolver, this provides defense-in-depth and silences security warnings.
		if (typeof printer.setUrlAccessPolicy === 'function') {
			printer.setUrlAccessPolicy('none');
		}

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);

        const buffer = await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', reject);
            pdfDoc.end();
        });

        return new Response(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="nova-${order.orderNumber}.pdf"`
            }
        });

	} catch (err) {
		console.error("Failed to load invoice details:", err);
		throw error(500, "Failed to load invoice");
	}
};
