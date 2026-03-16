<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ShoppingCart, Search, FileText, ChevronDown, Plus, Banknote, Calendar } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import { goto } from '$app/navigation';
	import { DataCards } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import type { Action, ActionsInput } from '$lib/components/ui/data-cards';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();

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

	const processedOrders = $derived(
		data.orders.map((row: any) => ({
			id: row.id,
			orderNumber: row.orderNumber,
			customerName: row.customer?.name ?? '—',
			status: row.status,
			total: row.totalAmount != null ? formatCurrency(Number(row.totalAmount)) : '—',
			createdAt: row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—',
		}))
	);

	const cardColumns = [
		{ key: 'orderNumber',  label: 'Order',    primary: true },
		{ key: 'customerName', label: 'Customer', secondary: true },
		{ key: 'status',       label: 'Status',   badge: true,
			badgeClass: (v: unknown) => getStatusColor(String(v)) },
		{ key: 'total',        label: 'Total' },
		{ key: 'createdAt',    label: 'Date' },
	];

	const cardActions: ActionsInput = (row) => {
		const actions: Action[] = [
			{ label: 'View Details', onClick: (r: any) => goto(`/dashboard/sales/orders/${r.id}`) },
		];
		if (row.status === 'CONFIRMED' || row.status === 'INVOICED') {
			actions.push({ label: 'Record Payment', onClick: (r: any) => goto(`/dashboard/sales/orders/${r.id}/payments`) });
		}
		return actions;
	};
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
	<!-- Header Section (Avant-Garde Style) -->
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6">
		<div class="space-y-2 relative">
			<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
				Sales <br/><span class="text-muted-foreground/40 italic">Orders</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.orders.length} Records
			</p>
		</div>
		
		<div class="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
			<!-- Advanced search input -->
			<form method="GET" class="relative group flex-1 md:flex-none">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
				<Input 
					name="q" 
					placeholder="Search orders..."
					class="w-full md:w-[280px] h-12 pl-10 rounded-none border-x-0 border-t-0 border-b-2 border-foreground/20 bg-transparent shadow-none text-base focus-visible:ring-0 focus-visible:border-foreground transition-all duration-300 placeholder:text-muted-foreground/50"
				/>
			</form>

			<Button onclick={() => goto('/dashboard/sales/orders/create')} class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative hidden md:flex">
				<Plus class="w-4 h-4 mr-2" /> New Order
			</Button>
		</div>
	</header>

	<!-- Mobile card view -->
	<div class="md:hidden">
		<DataCards columns={cardColumns} data={processedOrders} actions={cardActions} emptyMessage="No orders found." />
	</div>

	<!-- Desktop table view -->
	<div class="hidden md:block">
		<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)] relative">
		
		<Table.Root class="w-full text-left border-collapse">
			<Table.Header>
				<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Order / Quote</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Customer</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Date</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Total Amount</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-center">Status</Table.Head>
					<Table.Head class="w-[80px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.orders as order}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50">
						<Table.Cell class="px-6 py-4">
							<a href="/dashboard/sales/orders/{order.id}" class="font-mono font-bold text-lg tracking-tight group-hover:text-primary transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded block">
								{order.orderNumber}
							</a>
						</Table.Cell>
						<Table.Cell class="px-6 py-4">
							<div class="flex flex-col">
								{#if order.customer}
									<span class="font-bold text-foreground/90">{order.customer.name}</span>
								{:else}
									<span class="font-bold text-muted-foreground italic">Walk-In{order.walkInPhone ? ` · ${order.walkInPhone}` : ''}</span>
								{/if}
								{#if order.customer?.companyName}
									<span class="text-xs font-medium text-muted-foreground uppercase mt-1">{order.customer.companyName}</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden md:table-cell text-muted-foreground text-sm font-medium flex items-center gap-2">
							<Calendar class="w-3.5 h-3.5 opacity-50" />
							{new Date(order.createdAt).toLocaleDateString()}
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-right font-mono font-bold text-base">
							{formatCurrency(Number(order.totalAmount))}
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-center">
							<span class="inline-flex items-center justify-center rounded-none border px-2 py-1 text-[9px] font-bold tracking-widest uppercase {getStatusColor(order.status)}">
								{order.status}
							</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" size="sm" class="h-8 text-[10px] font-bold uppercase tracking-widest px-3 flex items-center justify-between min-w-[95px] rounded-none border-2 border-foreground/10 hover:border-foreground/30 transition-colors shadow-[2px_2px_0px_0px_theme(colors.foreground_/_5%)]">
											Actions <ChevronDown class="h-3.5 w-3.5 ml-2 opacity-50" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end" class="w-48 rounded-none border-2 border-foreground/10 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] p-2">
									<DropdownMenu.Item onSelect={() => goto(`/dashboard/sales/orders/${order.id}`)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted mb-1">
										<FileText class="mr-3 h-4 w-4" /> View Details
									</DropdownMenu.Item>
									{#if order.status === 'CONFIRMED' || order.status === 'INVOICED'}
										<DropdownMenu.Item onSelect={() => goto(`/dashboard/sales/orders/${order.id}/payments`)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted">
											<Banknote class="mr-3 h-4 w-4" /> Record Payment
										</DropdownMenu.Item>
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-64 text-center align-middle">
							<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
								<ShoppingCart class="w-12 h-12 opacity-20" />
								<p class="text-lg font-light tracking-widest uppercase">No orders found</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
	</div>
</div>

<PageFAB label="Create order" onclick={() => goto('/dashboard/sales/orders/create')} />
