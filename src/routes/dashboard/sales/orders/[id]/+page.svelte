<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { FileText, Printer, CheckCircle, XCircle, Banknote, ChevronLeft, Download } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import { goto } from '$app/navigation';
    import { toast } from "svelte-sonner";

	let { data, form } = $props();

    let totalPaid = $derived(data.payments.reduce((sum, p) => sum + Number(p.amount), 0));
    let balanceDue = $derived(Number(data.order.totalAmount) - totalPaid);
    let isExpired = $derived(data.order.status === 'QUOTE' && data.order.validUntil && new Date(data.order.validUntil) < new Date());

    function getStatusColor(status: string) {
		switch (status) {
			case 'DRAFT': return 'bg-slate-200 text-slate-700 border-slate-300';
			case 'QUOTE': return 'bg-blue-100 text-blue-700 border-blue-300';
			case 'CONFIRMED': return 'bg-amber-100 text-amber-700 border-amber-300';
			case 'INVOICED': return 'bg-green-100 text-green-700 border-green-300';
			case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-300';
			default: return 'bg-slate-100 text-slate-700 border-slate-300';
		}
	}

    function handleStatusUpdate() {
        return async ({ result, update }: any) => {
            if (result.type === 'success') {
                toast.success('Status updated');
            } else if (result.type === 'failure') {
                toast.error(result.data?.error || 'Failed to update status');
            }
            await update();
        };
    }

	async function handlePrintReceipt() {
		try {
			const res = await fetch('/api/print/receipt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId: data.order.id })
			});
			const result = await res.json();
			if (result.success) {
				toast.success(result.message || 'Receipt sent to printer');
			} else {
				toast.error(result.error || 'Failed to print receipt');
			}
		} catch (e) {
			toast.error('Printer connection failed');
		}
	}
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
    <header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-2 relative z-10 w-full md:w-auto">
			<Button variant="ghost" onclick={() => goto('/dashboard/sales/orders')} class="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent -ml-4 px-4 font-bold tracking-widest uppercase text-xs h-8">
				<ChevronLeft class="w-4 h-4 mr-2" /> Back to Orders
			</Button>
			<div class="flex items-center gap-4">
                <h1 class="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.85] font-mono">
                    {data.order.orderNumber}
                </h1>
                <span class="inline-flex items-center justify-center rounded-none border px-3 py-1.5 text-xs font-bold tracking-widest uppercase {getStatusColor(data.order.status)}">
                    {data.order.status}
                </span>
            </div>
            <p class="text-sm font-medium tracking-widest text-muted-foreground uppercase pt-2">
                Created: {new Date(data.order.createdAt).toLocaleString()}
                {#if data.order.validUntil}
                    <span class="mx-2">|</span>
                    <span class={isExpired ? "text-red-500 font-bold" : ""}>
                        Valid Until: {new Date(data.order.validUntil).toLocaleDateString()}
                    </span>
                {/if}
            </p>
		</div>

        <div class="flex flex-wrap gap-2 md:gap-4 items-center w-full md:w-auto mt-4 md:mt-0">
			<Button variant="outline" onclick={handlePrintReceipt} class="h-10 rounded-none font-bold uppercase tracking-widest text-xs border-2">
				<Printer class="w-4 h-4 mr-2" /> Print Receipt
			</Button>
            <Button variant="outline" onclick={() => window.open(`/dashboard/sales/orders/${data.order.id}/invoice`, '_blank')} class="h-10 rounded-none font-bold uppercase tracking-widest text-xs border-2 cursor-pointer">
				<Download class="w-4 h-4 mr-2" /> PDF Invoice
			</Button>
		</div>
	</header>
    
    {#if isExpired}
        <div class="bg-red-500/10 border-l-4 border-red-600 p-4 animate-in fade-in slide-in-from-top-4">
            <div class="flex items-center gap-3">
                <XCircle class="w-5 h-5 text-red-600" />
                <div>
                    <h3 class="text-sm font-bold tracking-tight text-red-600 uppercase">Quotation Expired</h3>
                    <p class="text-xs font-medium text-red-600/80">The locked pricing period for this quote has ended. Verify current market rates before confirming.</p>
                </div>
            </div>
        </div>
    {/if}

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Main Content -->
        <div class="md:col-span-2 space-y-8">
            <!-- Items Table -->
            <section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] relative">
                <div class="p-6 border-b-2 border-border/50">
                    <h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                        <FileText class="w-4 h-4" /> Order Items
                    </h2>
                </div>
                
                <Table.Root class="w-full text-left border-collapse">
                    <Table.Header>
                        <Table.Row class="bg-muted/50 border-b-2 border-border/50">
                            <Table.Head class="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Product</Table.Head>
                            <Table.Head class="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Qty</Table.Head>
                            <Table.Head class="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Unit Price</Table.Head>
                            <Table.Head class="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Discount</Table.Head>
                            <Table.Head class="h-12 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Total</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each data.items as item}
                            <Table.Row class="border-b border-border/50">
                                <Table.Cell class="px-6 py-4 font-bold">{item.product?.sku} - {item.product?.name}</Table.Cell>
                                <Table.Cell class="px-6 py-4 text-right font-mono">{Number(item.quantity).toLocaleString()}</Table.Cell>
                                <Table.Cell class="px-6 py-4 text-right font-mono text-muted-foreground">{formatCurrency(Number(item.unitPrice))}</Table.Cell>
                                <Table.Cell class="px-6 py-4 text-right font-mono text-amber-500 font-bold">{Number(item.discountPercent) > 0 ? (Number(item.discountPercent) * 100).toFixed(0) + '%' : '-'}</Table.Cell>
                                <Table.Cell class="px-6 py-4 text-right font-mono font-bold text-primary">{formatCurrency(Number(item.lineTotal))}</Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>

                <div class="p-6 bg-muted/20 border-t-2 border-border/50 flex flex-col items-end space-y-2">
                    <div class="flex justify-between w-full md:w-[300px] text-sm font-bold tracking-widest uppercase text-muted-foreground">
                        <span>Subtotal</span>
                        <span class="font-mono text-foreground">{formatCurrency(data.order.subtotal)}</span>
                    </div>
                    {#if Number(data.order.discountAmount) > 0}
                    <div class="flex justify-between w-full md:w-[300px] text-sm font-bold tracking-widest uppercase text-amber-500">
                        <span>Discount Saved</span>
                        <span class="font-mono text-amber-500">-{formatCurrency(data.order.discountAmount)}</span>
                    </div>
                    {/if}
                    <div class="flex justify-between w-full md:w-[300px] text-sm font-bold tracking-widest uppercase text-muted-foreground">
                        <span>VAT (15%)</span>
                        <span class="font-mono text-foreground">{formatCurrency(data.order.taxAmount)}</span>
                    </div>
                    <div class="flex justify-between w-full md:w-[300px] text-2xl font-black uppercase text-primary border-t-2 border-foreground/10 pt-4 mt-2">
                        <span>Total</span>
                        <span class="font-mono">{formatCurrency(data.order.totalAmount)}</span>
                    </div>
                </div>
            </section>
        </div>

        <!-- Sidebar Details -->
        <div class="space-y-8">
            <!-- Customer Card -->
            <section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] p-6">
                <h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-4">Customer Details</h2>
                <div class="space-y-4">
                    <div>
                        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Name</p>
                        <p class="font-bold text-lg">{data.order.customer?.name || 'Unknown'}</p>
                    </div>
                    {#if data.order.customer?.companyName}
                        <div>
                            <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Company</p>
                            <p class="font-medium text-foreground">{data.order.customer.companyName}</p>
                        </div>
                    {/if}
                    {#if data.order.customer?.phone}
                        <div>
                            <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">Phone</p>
                            <p class="font-mono text-sm">{data.order.customer.phone}</p>
                        </div>
                    {/if}
                    {#if data.order.customer?.tinNumber}
                        <div>
                            <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-1">TIN Number</p>
                            <p class="font-mono text-sm">{data.order.customer.tinNumber}</p>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Status Actions -->
            <section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] p-6">
                <h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-4">Workflow Actions</h2>
                <div class="space-y-3">
                    {#if data.order.status === 'DRAFT'}
                        <form method="POST" action="?/updateStatus" use:enhance={handleStatusUpdate}>
                            <input type="hidden" name="status" value="QUOTE" />
                            <Button type="submit" class="w-full h-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary transition-colors">Convert to Quote</Button>
                        </form>
                    {/if}
                    {#if data.order.status === 'DRAFT' || data.order.status === 'QUOTE'}
                        <form method="POST" action="?/updateStatus" use:enhance={handleStatusUpdate}>
                            <input type="hidden" name="status" value="CONFIRMED" />
                            <Button type="submit" class="w-full h-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"><CheckCircle class="w-4 h-4 mr-2" /> Confirm Order</Button>
                        </form>
                    {/if}
                    {#if data.order.status === 'CONFIRMED'}
                        <form method="POST" action="?/updateStatus" use:enhance={handleStatusUpdate}>
                            <input type="hidden" name="status" value="INVOICED" />
                            <Button type="submit" class="w-full h-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"><FileText class="w-4 h-4 mr-2" /> Generate Invoice</Button>
                        </form>
                        <Button variant="outline" onclick={() => goto(`/dashboard/sales/orders/${data.order.id}/payments`)} class="w-full h-12 rounded-none border-2 border-foreground text-foreground font-bold uppercase tracking-widest text-xs hover:bg-foreground hover:text-background transition-colors">
                            <Banknote class="w-4 h-4 mr-2" /> Record Payment
                        </Button>
                    {/if}
                    {#if data.order.status !== 'CANCELLED' && data.order.status !== 'INVOICED'}
                        <form method="POST" action="?/updateStatus" use:enhance={handleStatusUpdate}>
                            <input type="hidden" name="status" value="CANCELLED" />
                            <Button type="submit" variant="outline" class="w-full h-12 rounded-none border-2 border-red-500 text-red-500 font-bold uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-colors mt-4">
                                <XCircle class="w-4 h-4 mr-2" /> Cancel Order
                            </Button>
                        </form>
                    {/if}
                </div>
            </section>

             <!-- Payment Summary -->
              {#if data.order.status === 'CONFIRMED' || data.order.status === 'INVOICED'}
                <section class="bg-slate-900 border-2 border-slate-900 text-slate-100 shadow-[4px_4px_0px_0px_theme(colors.slate.800)] p-6">
                    <h2 class="text-sm font-bold tracking-widest uppercase text-slate-400 border-b border-slate-700 pb-4 mb-4 flex items-center gap-2">
                        <Banknote class="w-4 h-4" /> Financials
                    </h2>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center bg-slate-800 p-3">
                            <span class="text-xs font-bold uppercase tracking-widest text-slate-300">Total Paid</span>
                            <span class="font-mono text-green-400 font-bold">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div class="flex justify-between items-center bg-slate-800 p-3">
                            <span class="text-xs font-bold uppercase tracking-widest text-slate-300">Balance Due</span>
                            <span class="font-mono text-amber-400 font-bold">{formatCurrency(balanceDue)}</span>
                        </div>
                    </div>
                </section>
              {/if}
        </div>
    </div>
</div>
