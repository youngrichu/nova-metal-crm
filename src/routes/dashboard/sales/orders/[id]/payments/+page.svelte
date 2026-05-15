<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { Banknote, ChevronLeft, Calendar, FileText, CheckCircle2 } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import { goto } from '$app/navigation';
    import { toast } from "svelte-sonner";

	let { data, form } = $props();

    let isSubmitting = $state(false);
    let paymentAmount = $state(0);
	
	let totalAmount = $derived(Number(data.order.totalAmount));
    let totalPaid = $derived(data.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0));
    let balanceDue = $derived(totalAmount - totalPaid);
    
    // Initialize once from data
    $effect.pre(() => {
        if (paymentAmount === 0) {
            paymentAmount = balanceDue;
        }
    });

    // Keep payment amount within bounds
    $effect(() => {
        if (paymentAmount > balanceDue && balanceDue > 0) {
            paymentAmount = balanceDue;
        }
    });

	function handleSubmit() {
        isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.success) {
				toast.success("Payment recorded successfully");
                // The page will reload data automatically, or we can redirect
                // Let's stay on the page to see the updated balance, or go back to order
                isSubmitting = false;
                goto(`/dashboard/sales/orders/${data.order.id}`);
			} else if (result.type === 'failure') {
                toast.error(result.data?.error || "Failed to record payment");
            }
			isSubmitting = false;
			await update();
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1000px] mx-auto space-y-8">
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-2 relative z-10 w-full md:w-auto">
			<Button variant="ghost" onclick={() => goto(`/dashboard/sales/orders/${data.order.id}`)} class="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent -ml-4 px-4 font-bold tracking-widest uppercase text-xs h-8">
				<ChevronLeft class="w-4 h-4 mr-2" /> Back to Order
			</Button>
			<h1 class="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.85]">
				Record Payment
			</h1>
            <p class="text-sm font-medium tracking-widest text-muted-foreground uppercase pt-2 font-mono">
                {data.order.orderNumber} • {data.order.customer?.name}
            </p>
		</div>
	</header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Payment Form -->
        <div class="space-y-6">
            {#if balanceDue <= 0}
                <div class="bg-green-500/10 border-2 border-green-500 p-8 text-center flex flex-col items-center justify-center space-y-4">
                    <CheckCircle2 class="w-16 h-16 text-green-500" />
                    <h2 class="text-2xl font-black tracking-tighter uppercase text-green-700">Order Fully Paid</h2>
                    <p class="text-sm font-medium tracking-widest uppercase text-green-600/70">No further payments required.</p>
                </div>
            {:else}
                <form method="POST" action="?/record" use:enhance={handleSubmit} class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] p-6 space-y-6 relative">
                    {#if form?.error}
                        <div class="bg-red-500/10 border-l-4 border-red-600 p-4 text-red-600 font-medium text-sm">
                            {form.error}
                        </div>
                    {/if}

                    <div class="space-y-2 group">
                        <Label for="amount" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors flex items-center gap-2">
                            <Banknote class="w-3.5 h-3.5" /> Amount (ETB)
                        </Label>
                        <Input 
                            id="amount" 
                            name="amount" 
                            type="number" 
                            step="0.01" 
                            min="0.01" 
                            max={balanceDue}
                            bind:value={paymentAmount} 
                            required 
                            class="h-16 bg-muted/20 border-b-2 border-t-0 border-x-0 border-border/50 focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-3xl font-mono font-bold px-2 transition-all text-primary" 
                        />
                    </div>

                    <div class="space-y-2 group">
                        <Label for="paymentMethod" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Payment Method</Label>
                        <select id="paymentMethod" name="paymentMethod" required class="flex h-14 w-full items-center justify-between rounded-none border-b-2 border-t-0 border-x-0 border-border/50 bg-muted/20 px-4 text-base font-bold focus:bg-transparent focus:border-primary focus:outline-none transition-colors appearance-none">
                            <option value="BANK_TRANSFER">Bank Transfer (CBE, Awash, etc.)</option>
                            <option value="TELEBIRR">Telebirr</option>
                            <option value="CASH">Cash</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                    </div>

                    <div class="space-y-2 group">
                        <Label for="referenceNumber" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
                            <FileText class="w-3.5 h-3.5" /> Reference Number / Notes (Optional)
                        </Label>
                        <Input 
                            id="referenceNumber" 
                            name="referenceNumber" 
                            placeholder="e.g. FT2349082..."
                            class="h-12 bg-muted/20 border-b-2 border-t-0 border-x-0 border-border/50 focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none font-mono text-base px-2 transition-all" 
                        />
                    </div>

                    <div class="pt-6">
                        <Button type="submit" disabled={isSubmitting || paymentAmount <= 0} class="w-full h-16 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-sm hover:bg-primary shadow-[6px_6px_0px_0px_var(--color-primary)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {#if isSubmitting}
                                <span class="animate-pulse">Recording...</span>
                            {:else}
                                Record {formatCurrency(paymentAmount)}
                            {/if}
                        </Button>
                    </div>
                </form>
            {/if}
        </div>

        <!-- Financial Summary -->
        <div class="space-y-6">
            <section class="bg-slate-900 border-2 border-slate-900 text-slate-100 shadow-[4px_4px_0px_0px_var(--color-slate-800)] p-6 md:p-8">
                <h2 class="text-sm font-bold tracking-widest uppercase text-slate-400 border-b border-slate-700 pb-4 mb-6 flex items-center gap-2">
                    <Banknote class="w-4 h-4" /> Order Financials
                </h2>
                <div class="space-y-4">
                    <div class="flex justify-between items-center py-2 border-b border-slate-800">
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Total Order Amount</span>
                        <span class="font-mono text-slate-100 font-bold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-slate-800">
                        <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Total Paid</span>
                        <span class="font-mono text-green-400 font-bold">{formatCurrency(totalPaid)}</span>
                    </div>
                    <div class="flex justify-between items-center py-4 mt-2">
                        <span class="text-sm font-black uppercase tracking-widest text-slate-300">Balance Due</span>
                        <span class="font-mono text-3xl text-amber-400 font-black tracking-tighter">{formatCurrency(balanceDue)}</span>
                    </div>
                </div>
            </section>

            <!-- Payment History -->
            {#if data.payments.length > 0}
                <section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--color-border)] p-6">
                    <h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-4">Payment History</h2>
                    <div class="space-y-3">
                        {#each data.payments as payment}
                            <div class="flex items-start justify-between p-3 bg-muted/30 border border-border/50">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary px-2 py-0.5">{payment.paymentMethod}</span>
                                        <span class="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><Calendar class="w-3 h-3" /> {new Date(payment.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {#if payment.referenceNumber}
                                        <p class="text-xs font-mono text-muted-foreground mt-1 text-left">{payment.referenceNumber}</p>
                                    {/if}
                                </div>
                                <span class="font-mono font-bold text-green-600">{formatCurrency(Number(payment.amount))}</span>
                            </div>
                        {/each}
                    </div>
                </section>
            {/if}
        </div>
    </div>
</div>
