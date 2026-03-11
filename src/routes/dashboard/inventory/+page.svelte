<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { ArrowDownUp, AlertTriangle } from 'lucide-svelte';
	
	let { data, form } = $props();
	
	let isTransactOpen = $state(false);
	let isSubmitting = $state(false);

	let selectedType = $state('STOCK_IN');
	let selectedProduct = $state('');
	let selectedWarehouse = $state('');

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success') {
				isTransactOpen = false;
				selectedProduct = '';
			}
			isSubmitting = false;
			await update();
		};
	}
</script>

<div class="p-6 max-w-7xl mx-auto space-y-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Stock Ledger</h1>
			<p class="text-muted-foreground mt-1">Track physical inventory flows across different warehouses.</p>
		</div>

		<Sheet.Root bind:open={isTransactOpen}>
			<Sheet.Trigger>
				{#snippet child({ props })}
					<Button {...props} size="sm" class="h-8 text-xs font-medium shadow-none px-4 bg-primary text-primary-foreground hover:bg-primary/90">
						<ArrowDownUp class="w-3.5 h-3.5 mr-2" /> Log Transaction
					</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-0 shadow-[0_0_40px_rgba(0,0,0,0.05)] px-8 py-10">
				<Sheet.Header class="mb-10">
					<Sheet.Title class="text-3xl font-light tracking-tight">Record Stock Flow</Sheet.Title>
					<Sheet.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
						Register an incoming shipment or an outgoing dispatch safely.
					</Sheet.Description>
				</Sheet.Header>

				<form method="POST" action="?/transact" use:enhance={handleEnhance} class="flex-1 flex flex-col justify-between">
					<div class="space-y-8">
						{#if form?.error}
							<div class="p-4 text-sm font-medium rounded-2xl bg-destructive/5 text-destructive border-l-4 border-destructive flex items-start gap-3">
								<AlertTriangle class="w-4 h-4 shrink-0" />
								<p>{form.error}</p>
							</div>
						{/if}

						<div class="space-y-1 relative group">
							<Label for="type" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors mix-blend-multiply">Transaction Type</Label>
							<div class="relative">
								<select id="type" name="type" bind:value={selectedType} class="flex h-12 w-full appearance-none items-center justify-between whitespace-nowrap bg-transparent px-0 py-2 text-base shadow-none border-b border-border/40 focus:border-foreground focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50">
									<option value="STOCK_IN" class="text-foreground">Stock In (Receive Goods)</option>
									<option value="STOCK_OUT" class="text-foreground">Stock Out (Dispatch/Spoilage)</option>
									<option value="ADJUSTMENT" class="text-foreground">Adjustment (Audit Correction)</option>
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="m6 9 6 6 6-6"/></svg>
								</div>
							</div>
						</div>

						<div class="space-y-1 relative group">
							<Label for="warehouseId" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors mix-blend-multiply">Target Warehouse <span class="text-destructive">*</span></Label>
							<div class="relative">
								<select id="warehouseId" name="warehouseId" bind:value={selectedWarehouse} required class="flex h-12 w-full appearance-none items-center justify-between whitespace-nowrap bg-transparent px-0 py-2 text-base shadow-none border-b border-border/40 focus:border-foreground focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50">
									<option value="" disabled selected>— Select Location —</option>
									{#each data.warehouses as wh}
										<option value={wh.id} class="text-foreground">{wh.name}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="m6 9 6 6 6-6"/></svg>
								</div>
							</div>
						</div>

						<div class="space-y-1 relative group">
							<Label for="productId" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors mix-blend-multiply">Specific Product <span class="text-destructive">*</span></Label>
							<div class="relative">
								<select id="productId" name="productId" bind:value={selectedProduct} required class="flex h-12 w-full appearance-none items-center justify-between whitespace-nowrap bg-transparent px-0 py-2 text-base shadow-none border-b border-border/40 focus:border-foreground focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50">
									<option value="" disabled selected>— Select a valid SKU —</option>
									{#each data.products as prod}
										<option value={prod.id} class="text-foreground">{prod.sku} — {prod.name}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="m6 9 6 6 6-6"/></svg>
								</div>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-8">
							<div class="space-y-1 group">
								<Label for="quantity" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Quantity Count <span class="text-destructive">*</span></Label>
								<Input id="quantity" name="quantity" type="number" min="1" placeholder="e.g. 150" required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>
							<div class="space-y-1 group">
								<Label for="referenceDoc" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Ref Document</Label>
								<Input id="referenceDoc" name="referenceDoc" placeholder="Bill of landing, invoice #" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>
						</div>

						<div class="space-y-1 pb-10 group">
							<Label for="notes" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Internal Remarks</Label>
							<Input id="notes" name="notes" placeholder="Condition details, auditor tags..." class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
						</div>
					</div>

					<div class="pt-4 mt-auto bg-background/80 backdrop-blur-md pb-4 sticky bottom-0">
						<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl hover:shadow-2xl active:scale-[0.98]" disabled={isSubmitting}>
							{isSubmitting ? 'Validating & Committing...' : `Commit ${selectedType === 'STOCK_OUT' ? 'Dispatch' : 'Receipt'}`}
						</Button>
					</div>
				</form>
			</Sheet.Content>
		</Sheet.Root>
	</div>

	<div class="rounded-xl border shadow overflow-hidden">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
					<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle w-[180px]">Automated SKU</Table.Head>
					<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle">Product Item</Table.Head>
					<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle">Warehouse Depot</Table.Head>
					<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle text-right">Live Stock</Table.Head>
					<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle text-right">Unit Alert</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.stockLevels as row}
					<Table.Row class="hover:bg-muted/30 border-b border-border/40 transition-colors">
						<Table.Cell class="py-3 text-sm font-semibold text-foreground align-middle">{row.product.sku}</Table.Cell>
						<Table.Cell class="py-3 text-[13px] text-muted-foreground align-middle">{row.product.name}</Table.Cell>
						<Table.Cell class="py-3 align-middle">
                            <span class="text-[13px] text-muted-foreground/80 flex items-center">
                                {row.warehouse.name}
                            </span>
                        </Table.Cell>
						<Table.Cell class="text-right py-3 align-middle">
                            <span class="font-bold text-sm {row.stock.quantity <= row.product.minStockLevel ? 'text-amber-600' : 'text-emerald-600'}">
                                {row.stock.quantity}
                            </span>
                        </Table.Cell>
						<Table.Cell class="text-right text-muted-foreground/50 text-xs py-3 align-middle">
                            {row.product.minStockLevel} min
                        </Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
							No inventory records found. Start receiving stock to populate the ledger.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Transaction Audit Log -->
	<div class="mt-8">
		<h2 class="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
			<span class="text-muted-foreground text-sm font-normal">Audit Trail —</span> Transaction Log
		</h2>
		<div class="rounded-xl border shadow overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle w-[110px]">Type</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle">Product</Table.Head>
						<Table.Head class="hidden md:table-cell h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle">Warehouse</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle text-right w-[80px]">Qty Δ</Table.Head>
						<Table.Head class="hidden lg:table-cell h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle">Reference</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle text-right w-[160px]">Date</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.recentTransactions as tx}
						<Table.Row class="hover:bg-muted/30 border-b border-border/40 transition-colors">
							<Table.Cell class="py-3 align-middle">
								<span class="inline-flex items-center justify-center rounded-full px-2 py-[2px] text-[10px] font-bold uppercase tracking-wider border
									{tx.tx.transactionType === 'STOCK_IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50' :
									 tx.tx.transactionType === 'STOCK_OUT' ? 'bg-rose-50 text-rose-700 border-rose-200/50' :
									 'bg-amber-50 text-amber-700 border-amber-200/50'}">
									{tx.tx.transactionType === 'STOCK_IN' ? '↑ IN' :
									 tx.tx.transactionType === 'STOCK_OUT' ? '↓ OUT' : '± ADJ'}
								</span>
							</Table.Cell>
							<Table.Cell class="py-3 align-middle">
								<div class="text-sm font-semibold text-foreground">{tx.productName}</div>
								<div class="text-[11px] text-muted-foreground/70 tracking-wide mt-0.5">{tx.productSku}</div>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell py-3 text-[13px] text-muted-foreground/80 align-middle">{tx.warehouseName}</Table.Cell>
							<Table.Cell class="text-right font-semibold text-sm py-3 align-middle
								{tx.tx.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}">
								{tx.tx.quantityChange > 0 ? '+' : ''}{tx.tx.quantityChange}
							</Table.Cell>
							<Table.Cell class="hidden lg:table-cell py-3 text-[12px] text-muted-foreground/60 italic align-middle">
								{tx.tx.referenceDoc || '—'}
							</Table.Cell>
							<Table.Cell class="text-right py-3 text-[12px] text-muted-foreground/60 align-middle">
								{new Date(tx.tx.createdAt).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground text-sm">
								No transactions yet. Log a stock movement to see the audit trail.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
</div>
