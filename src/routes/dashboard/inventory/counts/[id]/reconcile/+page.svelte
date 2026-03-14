<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { ClipboardList, CheckCircle2, AlertTriangle, XCircle, Package } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let { data, form } = $props();

	let isClosing = $state(false);
	let showConfirm = $state(false);

	function deltaClass(delta: number | null) {
		if (delta === null) return 'text-muted-foreground/40';
		if (delta > 0) return 'text-amber-600 font-bold';
		if (delta < 0) return 'text-rose-600 font-bold';
		return 'text-muted-foreground/60';
	}

	function rowClass(delta: number | null) {
		if (delta === null) return '';
		if (delta > 0) return 'bg-amber-500/5';
		if (delta < 0) return 'bg-rose-500/5';
		return '';
	}

	function deltaLabel(delta: number | null) {
		if (delta === null) return '—';
		if (delta > 0) return `+${delta}`;
		return `${delta}`;
	}

	function handleCloseEnhance() {
		isClosing = true;
		return async ({ result, update }: any) => {
			if (result.type === 'redirect') {
				goto(result.location);
				return;
			}
			if (result.type === 'failure') {
				toast.error(result.data?.error ?? 'Failed to close count');
			}
			if (result.type === 'success') {
				const skipped: string[] = result.data?.skippedProducts ?? [];
				if (skipped.length > 0) {
					toast.warning(`Count closed, but ${skipped.length} product(s) had no inventory record and were not adjusted.`);
				} else {
					toast.success('Count closed and inventory updated.');
				}
			}
			isClosing = false;
			showConfirm = false;
			await update();
		};
	}

	$effect(() => {
		if (form?.error) {
			toast.error(form.error);
		}
	});

	const isClosed = $derived(data.count.status === 'CLOSED');
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div>
			<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Stock-Take</span>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				Reconcile<br /><span class="text-muted-foreground/40 italic">Report</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.warehouse.name} &mdash; {new Date(data.count.startedAt).toLocaleDateString('en-ET', { dateStyle: 'medium' })}
			</p>
		</div>
		{#if !isClosed}
			<div class="flex items-center gap-4 w-full md:w-auto">
				{#if !showConfirm}
					<Button
						onclick={() => (showConfirm = true)}
						class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
					>
						<CheckCircle2 class="w-3.5 h-3.5 mr-2" /> Close Count & Apply Adjustments
					</Button>
				{:else}
					<form method="POST" action="?/closeCount" use:enhance={handleCloseEnhance} class="flex items-center gap-3">
						<span class="text-sm font-bold text-foreground/70">Confirm close?</span>
						<Button
							type="submit"
							disabled={isClosing}
							class="h-10 px-6 rounded-none bg-rose-600 text-white font-bold uppercase tracking-widest text-xs hover:bg-rose-700 transition-colors disabled:opacity-50"
						>
							{isClosing ? 'Applying...' : 'Yes, Close & Apply'}
						</Button>
						<Button
							type="button"
							onclick={() => (showConfirm = false)}
							variant="outline"
							class="h-10 px-6 rounded-none font-bold uppercase tracking-widest text-xs"
						>
							Cancel
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Breadcrumb -->
	<div class="flex items-center gap-4">
		<a href="/dashboard/inventory/counts" class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
			&larr; All Count Sessions
		</a>
		<span class="text-muted-foreground/30">|</span>
		<a href="/dashboard/inventory/counts/{data.count.id}" class="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
			Count Entry
		</a>
	</div>

	{#if isClosed}
		<div class="p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-700 text-sm font-medium flex items-center gap-2">
			<CheckCircle2 class="w-4 h-4" /> This count was closed on {data.count.completedAt ? new Date(data.count.completedAt).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : '—'}. Adjustments have been applied.
		</div>
	{/if}

	<!-- Summary Stats -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="flex items-center gap-3 mb-2">
				<AlertTriangle class="w-5 h-5 text-amber-500" />
				<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Total Discrepancies</span>
			</div>
			<div class="text-4xl font-black font-mono">{data.totalDiscrepancies}</div>
			<div class="text-xs text-muted-foreground/50 mt-1 uppercase tracking-wider">Items with delta &ne; 0</div>
		</div>
		<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="flex items-center gap-3 mb-2">
				<CheckCircle2 class="w-5 h-5 text-amber-600" />
				<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Surplus Items</span>
			</div>
			<div class="text-4xl font-black font-mono text-amber-600">{data.surplusItems}</div>
			<div class="text-xs text-muted-foreground/50 mt-1 uppercase tracking-wider">Physical &gt; Expected</div>
		</div>
		<div class="border-2 border-foreground/10 bg-card p-6 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="flex items-center gap-3 mb-2">
				<XCircle class="w-5 h-5 text-rose-600" />
				<span class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Shortage Items</span>
			</div>
			<div class="text-4xl font-black font-mono text-rose-600">{data.shortageItems}</div>
			<div class="text-xs text-muted-foreground/50 mt-1 uppercase tracking-wider">Physical &lt; Expected</div>
		</div>
	</div>

	<!-- Reconciliation Table -->
	<section>
		<h2 class="text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
			<ClipboardList class="w-5 h-5 text-primary" /> Item Comparison
		</h2>
		<div class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<Table.Root class="w-full text-left border-collapse">
				<Table.Header>
					<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[120px]">SKU</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Product</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[110px]">Expected</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[110px]">Physical</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[100px]">Delta</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center w-[100px]">Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.items as row (row.item.id)}
						<Table.Row class="hover:bg-muted/30 border-b border-border/50 transition-colors {rowClass(row.delta)}">
							<Table.Cell class="px-6 py-4 font-mono text-xs font-bold align-middle">{row.product.sku}</Table.Cell>
							<Table.Cell class="px-6 py-4 align-middle">
								<div class="text-sm font-medium">{row.product.name}</div>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-center align-middle">
								<span class="font-mono font-bold text-sm text-muted-foreground">{row.item.expectedQuantity}</span>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-center align-middle">
								<span class="font-mono font-bold text-sm {row.item.physicalQuantity === null ? 'text-muted-foreground/30' : ''}">
									{row.item.physicalQuantity ?? '—'}
								</span>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-center align-middle">
								<span class="font-mono text-base {deltaClass(row.delta)}">
									{deltaLabel(row.delta)}
								</span>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-center align-middle">
								{#if row.delta === null}
									<span class="inline-flex items-center px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground/50">
										Not Counted
									</span>
								{:else if row.delta === 0}
									<span class="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-700">
										<CheckCircle2 class="w-3 h-3" /> Match
									</span>
								{:else if row.delta > 0}
									<span class="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-700">
										<AlertTriangle class="w-3 h-3" /> Surplus
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-700">
										<XCircle class="w-3 h-3" /> Shortage
									</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-48 text-center align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
									<Package class="w-10 h-10 opacity-20" />
									<p class="text-sm font-bold tracking-widest uppercase">No items in this count session.</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>
</div>
