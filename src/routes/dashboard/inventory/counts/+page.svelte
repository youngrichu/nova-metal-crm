<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { ClipboardList, Package, AlertTriangle, Plus, X } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { DataCards } from '$lib/components/ui/data-cards';
	import type { ActionsInput } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import { goto } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { getFormattingLocale } from '$lib/i18n/format';

	let { data, form } = $props();

	let showStartForm = $state(false);
	let selectedWarehouse = $state('');
	let isSubmitting = $state(false);
	const formattingLocale = $derived(getFormattingLocale(getLocale()));

	function statusBadgeClass(status: string) {
		if (status === 'IN_PROGRESS' || status === m.counts_status_in_progress()) return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
		if (status === 'CLOSED' || status === m.counts_status_closed()) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
		return 'bg-muted/50 text-muted-foreground border-border';
	}

	function statusLabel(status: string) {
		if (status === 'IN_PROGRESS') return m.counts_status_in_progress();
		if (status === 'CLOSED') return m.counts_status_closed();
		return status;
	}

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'redirect') {
				goto(result.location);
				return;
			}
			if (result.type === 'failure') {
				toast.error(result.data?.error ?? m.counts_start_failed());
			}
			isSubmitting = false;
			await update();
		};
	}

	$effect(() => {
		if (form?.error) {
			toast.error(form.error);
		}
	});

	const processedCounts = $derived(
		data.counts.map((row: any) => ({
			id: row.count.id,
			reference: `Count #${row.count.id.slice(0, 8)}`,
			warehouseName: row.warehouse.name,
			rawStatus: row.count.status,
			status: statusLabel(row.count.status),
			startedAt: new Date(row.count.startedAt).toLocaleDateString(formattingLocale),
		}))
	);

	const cardColumns = [
		{ key: 'reference',     label: m.counts_reference(), primary: true },
		{ key: 'warehouseName', label: m.counts_warehouse(), secondary: true },
		{ key: 'status',        label: m.counts_status(),    badge: true,
			badgeClass: (v: unknown) => {
				const s = String(v);
				if (s === m.counts_status_in_progress()) return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
				if (s === m.counts_status_closed()) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
				return 'bg-muted text-muted-foreground';
			}},
		{ key: 'startedAt',     label: m.counts_date() },
	];

	const cardActions: ActionsInput = (row) => {
		if (row.rawStatus === 'IN_PROGRESS') {
			return [
				{ label: m.counts_continue(),   onClick: (r: any) => goto(`/dashboard/inventory/counts/${r.id}`) },
				{ label: m.counts_reconcile(),  onClick: (r: any) => goto(`/dashboard/inventory/counts/${r.id}/reconcile`) },
			];
		}
		return [
			{ label: m.counts_view_report(), onClick: (r: any) => goto(`/dashboard/inventory/counts/${r.id}/reconcile`) },
		];
	};
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
	<!-- Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div>
			<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">{m.counts_badge()}</span>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				{m.counts_title_line1()}<br /><span class="text-muted-foreground/40 italic">{m.counts_title_line2()}</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{m.counts_desc()}
			</p>
		</div>
		<div class="flex items-center gap-4 w-full md:w-auto">
			<Button
				onclick={() => (showStartForm = !showStartForm)}
				class="hidden md:flex h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
			>
				{#if showStartForm}
					<X class="w-3.5 h-3.5 mr-2" /> {m.counts_cancel()}
				{:else}
					<Plus class="w-3.5 h-3.5 mr-2" /> {m.counts_start_new()}
				{/if}
			</Button>
		</div>
	</header>

	<!-- Start New Count Form (inline) -->
	{#if showStartForm}
		<div class="border-2 border-foreground/10 bg-card p-8 shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-lg font-black tracking-widest uppercase flex items-center gap-2">
					<ClipboardList class="w-5 h-5 text-primary" /> {m.counts_new_session()}
				</h2>
				<!-- Mobile-only cancel button (desktop uses the header toggle) -->
				<button
					class="md:hidden flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
					onclick={() => showStartForm = false}
					aria-label={m.counts_cancel()}
				>
					<X class="w-4 h-4" /> {m.counts_cancel()}
				</button>
			</div>
			<form method="POST" action="?/startCount" use:enhance={handleEnhance} class="flex flex-col md:flex-row gap-4 items-end">
				<div class="space-y-2 flex-1">
					<Label for="warehouseId" class="text-xs font-bold tracking-wider uppercase text-foreground/70">
						{m.counts_select_warehouse()}
					</Label>
					<select
						id="warehouseId"
						name="warehouseId"
						bind:value={selectedWarehouse}
						required
						class="flex h-12 w-full rounded-none border-2 border-foreground/20 bg-background px-4 text-sm font-medium focus:border-primary focus:outline-none transition-colors"
					>
						<option value="" disabled>{m.counts_choose_warehouse()}</option>
						{#each data.warehouses as wh}
							<option value={wh.id}>{wh.name}</option>
						{/each}
					</select>
				</div>
				<Button
					type="submit"
					disabled={isSubmitting || !selectedWarehouse}
					class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
				>
					{isSubmitting ? m.counts_starting() : m.counts_begin()}
				</Button>
			</form>
			{#if data.warehouses.length === 0}
				<p class="text-sm text-amber-600 mt-4 flex items-center gap-2">
					<AlertTriangle class="w-4 h-4" /> {m.counts_no_warehouses()}
				</p>
			{/if}
		</div>
	{/if}

	<!-- Counts Table -->
	<section>
		<div class="md:hidden">
			<DataCards columns={cardColumns} data={processedCounts} actions={cardActions} emptyMessage={m.counts_none()} />
		</div>
		<div class="hidden md:block border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<Table.Root class="w-full text-left border-collapse">
				<Table.Header>
					<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.counts_date_started()}</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.counts_warehouse()}</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.counts_performed_by()}</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.counts_status()}</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center">{m.counts_progress()}</Table.Head>
						<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">{m.actions()}</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.counts as row}
						<Table.Row class="hover:bg-muted/30 border-b border-border/50 transition-colors">
							<Table.Cell class="px-6 py-4 font-mono text-sm align-middle">
								{new Date(row.count.startedAt).toLocaleDateString(formattingLocale, { month: 'short', day: '2-digit', year: 'numeric' })}
								<div class="text-[10px] text-muted-foreground/50 mt-0.5">
									{new Date(row.count.startedAt).toLocaleTimeString(formattingLocale, { hour: '2-digit', minute: '2-digit' })}
								</div>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 font-bold text-sm align-middle">{row.warehouse.name}</Table.Cell>
							<Table.Cell class="px-6 py-4 text-sm text-foreground/70 align-middle">{row.performedByName}</Table.Cell>
							<Table.Cell class="px-6 py-4 align-middle">
								<span class="inline-flex items-center px-2 py-1 text-[9px] font-black uppercase tracking-widest border {statusBadgeClass(row.count.status)}">
									{statusLabel(row.count.status)}
								</span>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-center align-middle">
								<span class="font-mono text-sm font-bold">
									{row.itemStats.entered}<span class="text-muted-foreground/40">/{row.itemStats.total}</span>
								</span>
								<div class="text-[9px] text-muted-foreground/50 uppercase tracking-wider mt-0.5">{m.counts_items_entered()}</div>
							</Table.Cell>
							<Table.Cell class="px-6 py-4 text-right align-middle">
								<div class="flex items-center justify-end gap-2">
									{#if row.count.status === 'IN_PROGRESS'}
										<a
											href="/dashboard/inventory/counts/{row.count.id}"
											class="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-widest bg-foreground text-background hover:bg-primary hover:text-primary-foreground transition-colors rounded-none"
										>
											{m.counts_continue()}
										</a>
										<a
											href="/dashboard/inventory/counts/{row.count.id}/reconcile"
											class="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 border-foreground/20 hover:border-foreground text-foreground transition-colors rounded-none"
										>
											{m.counts_reconcile()}
										</a>
									{:else}
										<a
											href="/dashboard/inventory/counts/{row.count.id}/reconcile"
											class="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-widest border-2 border-foreground/20 hover:border-foreground text-foreground transition-colors rounded-none"
										>
											{m.counts_view_report()}
										</a>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-48 text-center align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
									<ClipboardList class="w-10 h-10 opacity-20" />
									<p class="text-sm font-bold tracking-widest uppercase">{m.counts_none()}</p>
									<p class="text-xs">{m.counts_none_hint()}</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>
</div>

<PageFAB label={m.counts_start_fab()} onclick={() => showStartForm = true} />
