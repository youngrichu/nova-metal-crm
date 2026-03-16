<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, MapPin, ChevronDown, Pencil, Warehouse } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { DataCards } from '$lib/components/ui/data-cards';
	import type { Action } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import { invalidateAll } from '$app/navigation';
	
	let { data, form } = $props();
	
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isSubmitting = $state(false);
	let editingWarehouse = $state<any>(null);

	function openEdit(wh: any) {
		editingWarehouse = wh;
		isEditOpen = true;
	}

	const processedWarehouses = $derived(
		data.warehouses.map((row: any) => ({
			id: row.id,
			name: row.name,
			location: row.location ?? '—',
			isActiveLabel: row.isActive ? 'Active' : 'Inactive',
		}))
	);

	const cardColumns = [
		{ key: 'name',          label: 'Name',     primary: true },
		{ key: 'location',      label: 'Location', secondary: true },
		{ key: 'isActiveLabel', label: 'Status',   badge: true,
			badgeClass: (v: unknown) => v === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' },
	];

	const cardActions: Action[] = [
		{
			label: 'Edit',
			onClick: (row: any) => {
				const original = data.warehouses.find((w: any) => w.id === row.id);
				if (original) openEdit(original);
			},
		},
		{
			label: 'Delete',
			variant: 'destructive',
			onClick: async (row: any) => {
				try {
					const fd = new FormData();
					fd.set('id', row.id);
					const res = await fetch('?/delete', { method: 'POST', body: fd });
					if (res.ok) {
						await invalidateAll();
					} else {
						toast.error('Failed to delete warehouse. It may have linked inventory.');
					}
				} catch {
					toast.error('Failed to delete warehouse. It may have linked inventory.');
				}
			},
		},
	];

	function makeEnhance(closeKey: 'create' | 'edit') {
		return () => {
			isSubmitting = true;
			return async ({ result, update }: any) => {
				if (result.type === 'success') {
					if (closeKey === 'create') isCreateOpen = false;
					if (closeKey === 'edit') isEditOpen = false;
				}
				isSubmitting = false;
				await update();
			};
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

	<!-- Avant-Garde Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-end border-b-2 border-foreground pb-6 gap-6">
		<div class="space-y-2 relative">
			<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
				Storage<br/><span class="text-muted-foreground/40 italic">Network</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.warehouses.length} Depot{data.warehouses.length !== 1 ? 's' : ''} Registered
			</p>
		</div>

		<div class="flex items-center gap-4 w-full md:w-auto">
			<Sheet.Root bind:open={isCreateOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="hidden md:flex h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
							Register Depot
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
					<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">New Location</span>
							<Sheet.Title class="text-4xl font-black tracking-tight uppercase">Add Depot</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								Register a new storage location to hold and track stock quantities.
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background">
						<div class="space-y-10">
							{#if form?.error}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 animate-in fade-in">
									{form.error}
								</div>
							{/if}

							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Location Details</h3>

								<div class="space-y-2 group">
									<Label for="name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Depot Name *</Label>
									<Input id="name" name="name" placeholder="E.g., Head Office Depot" required class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
								</div>

								<div class="space-y-2 group">
									<Label for="location" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors flex items-center gap-2">
										<MapPin class="w-3.5 h-3.5" /> Physical Address
									</Label>
									<Input id="location" name="location" placeholder="Zone, District, or full address..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg" />
								</div>
							</div>
						</div>

						<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all" disabled={isSubmitting}>
								{isSubmitting ? 'Processing...' : 'Register Depot'}
							</Button>
						</div>
					</form>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</header>

	<!-- Data Table -->
	<div class="md:hidden">
		<DataCards columns={cardColumns} data={processedWarehouses} actions={cardActions} emptyMessage="No warehouses found." />
	</div>
	<div class="hidden md:block bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)]">
		<Table.Root class="w-full">
			<Table.Header>
				<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Depot Name</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Physical Address</Table.Head>
					<Table.Head class="w-[80px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.warehouses as warehouse}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50">
						<Table.Cell class="px-6 py-4">
							<button onclick={() => openEdit(warehouse)} class="font-bold text-lg tracking-tight group-hover:text-primary transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
								{warehouse.name}
							</button>
						</Table.Cell>
						<Table.Cell class="hidden md:table-cell px-6 py-4 text-sm text-muted-foreground/70">
							{#if warehouse.location}
								<span class="flex items-center gap-2">
									<MapPin class="w-3.5 h-3.5 opacity-50 shrink-0" /> {warehouse.location}
								</span>
							{:else}
								<span class="italic opacity-40">Unspecified</span>
							{/if}
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
								<DropdownMenu.Content align="end" class="w-44 rounded-none border-2 border-foreground/10 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] p-2">
									<DropdownMenu.Item onSelect={() => openEdit(warehouse)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted mb-1">
										<Pencil class="mr-3 h-4 w-4" /> Edit
									</DropdownMenu.Item>
									<DropdownMenu.Separator class="bg-border/50 -mx-2 my-2" />
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={warehouse.id} />
										<button type="submit" class="w-full flex items-center text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 text-red-600 hover:bg-red-50 focus:bg-red-50 outline-none text-left">
											<Trash2 class="mr-3 h-4 w-4" /> Delete
										</button>
									</form>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={3} class="h-64 text-center align-middle">
							<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
								<Warehouse class="w-12 h-12 opacity-20" />
								<p class="text-lg font-light tracking-widest uppercase">No Depots Registered</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="px-6 py-3 border-t border-border/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
			{data.warehouses.length} warehouse{data.warehouses.length !== 1 ? 's' : ''} total
		</div>
	</div>
</div>

<PageFAB label="Add warehouse" onclick={() => isCreateOpen = true} />

<!-- Edit Warehouse Sheet -->
<Sheet.Root bind:open={isEditOpen}>
	<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
		{#if editingWarehouse}
			<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
				<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
				<Sheet.Header class="relative z-10">
					<span class="inline-block px-3 py-1 bg-foreground text-background text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">Edit Location</span>
					<Sheet.Title class="text-4xl font-black tracking-tight uppercase line-clamp-1">{editingWarehouse.name}</Sheet.Title>
					<Sheet.Description class="text-base font-medium opacity-70 mt-2">
						Update the depot name or physical address.
					</Sheet.Description>
				</Sheet.Header>
			</div>

			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background">
				<input type="hidden" name="id" value={editingWarehouse.id} />
				<div class="space-y-10">
					<div class="space-y-6">
						<div class="space-y-2 group">
							<Label for="edit-wh-name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Depot Name *</Label>
							<Input id="edit-wh-name" name="name" value={editingWarehouse.name} required class="h-14 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg px-0 font-bold transition-all" />
						</div>
						<div class="space-y-2 group">
							<Label for="edit-wh-loc" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
								<MapPin class="w-3.5 h-3.5" /> Physical Address
							</Label>
							<Input id="edit-wh-loc" name="location" value={editingWarehouse.location ?? ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0 transition-all" />
						</div>
					</div>
				</div>

				<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
					<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Commit Changes'}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
