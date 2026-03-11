<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, MapPin, ChevronDown, Pencil } from 'lucide-svelte';
	
	let { data, form } = $props();
	
	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isSubmitting = $state(false);
	let editingWarehouse = $state<any>(null);

	function openEdit(wh: any) {
		editingWarehouse = wh;
		isEditModalOpen = true;
	}

	function makeEnhance(closeKey: 'create' | 'edit') {
		return () => {
			isSubmitting = true;
			return async ({ result, update }: any) => {
				if (result.type === 'success') {
					if (closeKey === 'create') isCreateModalOpen = false;
					if (closeKey === 'edit') isEditModalOpen = false;
				}
				isSubmitting = false;
				await update();
			};
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">

	{#if form?.error}
		<div class="p-3 text-sm rounded bg-destructive/15 text-destructive border border-destructive/20 mb-4">
			{form.error}
		</div>
	{/if}

	<!-- Main Table Card -->
	<div class="rounded-lg border bg-card shadow-sm flex flex-col">
		
		<!-- Table Toolbar -->
		<div class="flex flex-col sm:flex-row justify-between items-center p-3 border-b border-border/50 gap-3">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<Input placeholder="Search warehouses…" class="w-[220px] h-8 text-sm bg-transparent shadow-none" />
			</div>

			<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
				
				<Dialog.Root bind:open={isCreateModalOpen}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} size="sm" class="h-8 text-xs font-medium shadow-none px-4 bg-primary text-primary-foreground hover:bg-primary/90">
								New Warehouse
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content class="sm:max-w-[500px] border-none shadow-[0_0_40px_rgba(0,0,0,0.1)] px-8 py-10 rounded-3xl">
						<Dialog.Header class="mb-8">
							<Dialog.Title class="text-3xl font-light tracking-tight">New Warehouse</Dialog.Title>
							<Dialog.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
								Register a new storage location to hold stock quantities.
							</Dialog.Description>
						</Dialog.Header>

						<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="space-y-8">
							<div class="space-y-1 group">
								<Label for="name" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Warehouse Name <span class="text-destructive">*</span></Label>
								<Input id="name" name="name" placeholder="E.g., Head Office Depot" required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>

							<div class="space-y-1 pb-4 group">
								<Label for="location" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Physical Location</Label>
								<Input id="location" name="location" placeholder="Address or Zone..." class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>

							<div class="pt-4">
								<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl hover:shadow-2xl active:scale-[0.98]" disabled={isSubmitting}>
									{isSubmitting ? 'Saving...' : 'Register Warehouse'}
								</Button>
							</div>
						</form>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
						<Table.Head class="w-[40px] px-4 py-3 h-10 align-middle">
							<input type="checkbox" class="w-3.5 h-3.5 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary/50" />
						</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle transition-colors">
							Name
						</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle transition-colors">
							Location / Address
						</Table.Head>
						<Table.Head class="w-[120px] text-right h-10 align-middle"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.warehouses as warehouse}
						<Table.Row class="hover:bg-muted/30 border-b border-border/40 transition-colors group/row">
							<Table.Cell class="px-4 py-3 align-middle">
								<input type="checkbox" class="w-3.5 h-3.5 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary/50 opacity-40 group-hover/row:opacity-100 transition-opacity" />
							</Table.Cell>
							<Table.Cell class="py-3 text-sm align-middle">
								<button onclick={() => openEdit(warehouse)} class="text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 text-left outline-none">{warehouse.name}</button>
							</Table.Cell>
							<Table.Cell class="py-3 text-[13px] align-middle">
								<div class="flex items-center text-muted-foreground/80 whitespace-nowrap">
									{#if warehouse.location}
										<MapPin class="mr-2 h-3.5 w-3.5 opacity-50" /> {warehouse.location}
									{:else}
										<span class="text-muted-foreground/50 italic">Unspecified</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell class="text-right py-2 px-4 align-middle">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="outline" size="sm" class="h-8 shadow-sm text-xs font-medium px-3 flex items-center justify-between min-w-[85px] cursor-pointer">
												Actions <ChevronDown class="h-3.5 w-3.5 ml-2 opacity-50" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-44 bg-card/95 backdrop-blur-md rounded-xl shadow-xl border-white/10 p-1">
								<DropdownMenu.Item onSelect={() => openEdit(warehouse)} class="text-xs font-medium rounded-lg px-3 py-2 cursor-pointer">
									<Pencil class="mr-2 h-4 w-4" />
									Edit
								</DropdownMenu.Item>
										<DropdownMenu.Separator class="my-1 bg-border/40" />
										<form method="POST" action="?/delete" use:enhance class="w-full">
											<input type="hidden" name="id" value={warehouse.id} />
											<button type="submit" class="w-full flex items-center text-xs font-medium cursor-pointer rounded-lg px-3 py-2 text-destructive focus:bg-destructive/10 hover:bg-destructive/10 transition-colors outline-none text-left">
												<Trash2 class="mr-2 h-4 w-4" />
												Delete
											</button>
										</form>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={4} class="h-32 text-center text-xs align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
									<MapPin class="w-6 h-6 opacity-40" />
									<p>No storage locations defined.</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Table Footer / Pagination -->
		<div class="flex items-center justify-between px-4 py-3 border-t border-border/50 text-xs text-muted-foreground bg-muted/10">
		<div class="px-4 py-3 border-t border-border/50 text-sm text-muted-foreground bg-muted/10">
			{data.warehouses.length} warehouse{data.warehouses.length !== 1 ? 's' : ''} total
		</div>
		</div>

	</div>
</div>

<!-- Edit Warehouse Dialog -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-[500px] border-none shadow-[0_0_40px_rgba(0,0,0,0.1)] px-8 py-10 rounded-3xl">
		<Dialog.Header class="mb-8">
			<Dialog.Title class="text-3xl font-light tracking-tight">Edit Warehouse</Dialog.Title>
			<Dialog.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
				Update the storage location name or address.
			</Dialog.Description>
		</Dialog.Header>

		{#if editingWarehouse}
			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="space-y-8">
				<input type="hidden" name="id" value={editingWarehouse.id} />

				<div class="space-y-1 group">
					<Label for="edit-wh-name" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Warehouse Name <span class="text-destructive">*</span></Label>
					<Input id="edit-wh-name" name="name" value={editingWarehouse.name} required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
				</div>

				<div class="space-y-1 pb-4 group">
					<Label for="edit-wh-loc" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Physical Location</Label>
					<Input id="edit-wh-loc" name="location" value={editingWarehouse.location ?? ''} class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
				</div>

				<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Save Changes'}
				</Button>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
