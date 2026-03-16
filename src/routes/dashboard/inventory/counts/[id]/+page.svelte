<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { ClipboardList, Scan, Package, CheckCircle2, AlertTriangle } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { tick } from 'svelte';

	let { data, form } = $props();

	// Track which items have been saved locally for immediate UI feedback
	let savedItems = $state<Record<string, number>>({});
	let savingItemId = $state<string | null>(null);

	// Barcode scanner
	let barcodeInput = $state('');
	let barcodeError = $state('');
	let barcodeInputEl = $state<HTMLInputElement | null>(null);
	let highlightedProductId = $state<string | null>(null);

	$effect(() => {
		// Focus barcode input on load (only when barcode feature is enabled)
		if (data.barcodeEnabled) tick().then(() => barcodeInputEl?.focus());
	});

	function handleBarcodeScan(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const code = barcodeInput.trim();
			if (!code) return;
			const match = data.items.find((row: any) => row.product.barcode === code);
			if (match) {
				highlightedProductId = match.product.id;
				barcodeError = '';
				// Scroll to the row
				const el = document.getElementById(`row-${match.item.id}`);
				el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				// Focus the qty input of that row
				const qtyInput = document.getElementById(`qty-${match.item.id}`) as HTMLInputElement | null;
				qtyInput?.focus();
				qtyInput?.select();
			} else {
				barcodeError = `No product found for barcode: ${code.slice(0, 40)}${code.length > 40 ? '...' : ''}`;
				highlightedProductId = null;
			}
			barcodeInput = '';
		}
	}

	function handleItemEnhance(itemId: string) {
		savingItemId = itemId;
		return async ({ result, update }: any) => {
			if (result.type === 'success') {
				const qty = parseInt(
					(document.getElementById(`qty-${itemId}`) as HTMLInputElement)?.value ?? '0',
					10
				);
				savedItems[itemId] = isNaN(qty) ? 0 : qty;
				toast.success('Item saved');
			} else if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'Failed to save item');
			}
			savingItemId = null;
			await update({ reset: false });
		};
	}

	const totalItems = $derived(data.items.length);
	const enteredItems = $derived(
		data.items.filter((r: any) => r.item.physicalQuantity !== null || savedItems[r.item.id] !== undefined).length
	);

	function isEntered(row: any) {
		return row.item.physicalQuantity !== null || savedItems[row.item.id] !== undefined;
	}

	function getInitialQty(row: any) {
		if (savedItems[row.item.id] !== undefined) return savedItems[row.item.id];
		if (row.item.physicalQuantity !== null) return row.item.physicalQuantity;
		return '';
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div>
			<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Stock-Take</span>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				Count<br /><span class="text-muted-foreground/40 italic">Entry</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.warehouse.name} &mdash; {new Date(data.count.startedAt).toLocaleDateString('en-ET', { dateStyle: 'medium' })}
			</p>
		</div>
		<div class="flex items-center gap-4 w-full md:w-auto">
			<!-- Progress Badge -->
			<div class="border-2 border-foreground/10 bg-card px-6 py-3 text-center">
				<div class="text-3xl font-black font-mono">
					{enteredItems}<span class="text-muted-foreground/30">/{totalItems}</span>
				</div>
				<div class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-0.5">Items Counted</div>
			</div>
			<a
				href="/dashboard/inventory/counts/{data.count.id}/reconcile"
				class="inline-flex h-12 items-center px-8 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
			>
				Reconcile &rarr;
			</a>
		</div>
	</header>

	<!-- Breadcrumb back link -->
	<div>
		<a href="/dashboard/inventory/counts" class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
			&larr; All Count Sessions
		</a>
	</div>

	<!-- Barcode Scanner -->
	{#if data.barcodeEnabled}
		<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="flex items-center gap-3 mb-4">
				<Scan class="w-5 h-5 text-primary" />
				<h2 class="text-sm font-black tracking-widest uppercase">Barcode Scanner</h2>
			</div>
			<div class="space-y-2 max-w-md">
				<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">Scan to jump to product row</Label>
				<Input
					bind:ref={barcodeInputEl}
					bind:value={barcodeInput}
					onkeydown={handleBarcodeScan}
					placeholder="Focus here and scan barcode..."
					class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 font-mono transition-all"
				/>
				{#if barcodeError}
					<p class="text-xs text-rose-500 font-medium flex items-center gap-1">
						<AlertTriangle class="w-3 h-3" /> {barcodeError}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Items Table -->
	<section>
		{#if data.count.status === 'CLOSED'}
			<div class="mb-4 p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-700 text-sm font-medium">
				This count session is closed. No further edits allowed.
			</div>
		{/if}
		<div class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<Table.Root class="w-full text-left border-collapse">
				<Table.Header>
					<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[120px]">SKU</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Product</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[110px]">Expected</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[160px]">Physical Qty</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[90px]">Status</Table.Head>
						{#if data.count.status === 'IN_PROGRESS'}
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right w-[80px]">Save</Table.Head>
						{/if}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.items as row (row.item.id)}
						<Table.Row
							id="row-{row.item.id}"
							class="hover:bg-muted/30 border-b border-border/50 transition-colors {highlightedProductId === row.product.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}"
						>
							<Table.Cell class="px-6 py-3 font-mono text-xs font-bold align-middle">{row.product.sku}</Table.Cell>
							<Table.Cell class="px-6 py-3 align-middle">
								<div class="text-sm font-medium">{row.product.name}</div>
								{#if data.barcodeEnabled && row.product.barcode}
									<div class="text-[10px] font-mono text-muted-foreground/50 mt-0.5">{row.product.barcode}</div>
								{/if}
							</Table.Cell>
							<Table.Cell class="px-6 py-3 text-center align-middle">
								<span class="font-mono font-bold text-sm text-muted-foreground">{row.item.expectedQuantity}</span>
							</Table.Cell>
							<Table.Cell class="px-6 py-3 text-center align-middle">
								{#if data.count.status === 'IN_PROGRESS'}
									<form
										method="POST"
										action="?/saveItem"
										use:enhance={() => handleItemEnhance(row.item.id)}
										id="form-{row.item.id}"
									>
										<input type="hidden" name="itemId" value={row.item.id} />
										<Input
											id="qty-{row.item.id}"
											name="physicalQuantity"
											type="number"
											min="0"
											value={getInitialQty(row)}
											placeholder="—"
											class="h-9 w-24 mx-auto text-center font-mono font-bold bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none transition-all"
										/>
									</form>
								{:else}
									<span class="font-mono font-bold text-sm">
										{row.item.physicalQuantity ?? '—'}
									</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="px-6 py-3 text-center align-middle">
								{#if isEntered(row)}
									<span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">
										<CheckCircle2 class="w-3.5 h-3.5" /> Done
									</span>
								{:else}
									<span class="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Pending</span>
								{/if}
							</Table.Cell>
							{#if data.count.status === 'IN_PROGRESS'}
								<Table.Cell class="px-6 py-3 text-right align-middle">
									<Button
										type="submit"
										form="form-{row.item.id}"
										disabled={savingItemId === row.item.id}
										class="h-8 px-3 rounded-none text-[10px] font-black uppercase tracking-widest bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
									>
										{savingItemId === row.item.id ? '...' : 'Save'}
									</Button>
								</Table.Cell>
							{/if}
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-48 text-center align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
									<Package class="w-10 h-10 opacity-20" />
									<p class="text-sm font-bold tracking-widest uppercase">No items in this count session.</p>
									<p class="text-xs">The selected warehouse may have no inventory records.</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>
</div>
