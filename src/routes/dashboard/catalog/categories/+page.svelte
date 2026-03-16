<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, Tags, ChevronDown, Pencil } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { DataCards } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import { invalidateAll } from '$app/navigation';
	import type { Action } from '$lib/components/ui/data-cards';
	
	let { data, form } = $props();
	
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isSubmitting = $state(false);
	let editingCategory = $state<any>(null);

	const processedCategories = $derived(
		data.categories.map((row: any) => ({
			id: row.id,
			name: row.name,
			prefix: row.prefix,
			description: row.description ?? '—',
		}))
	);

	const cardColumns = [
		{ key: 'name',        label: 'Name',        primary: true },
		{ key: 'prefix',      label: 'Prefix',      secondary: true },
		{ key: 'description', label: 'Description' },
	];

	const cardActions: Action[] = [
		{
			label: 'Edit',
			onClick: (row: any) => {
				const original = data.categories.find((c: any) => c.id === row.id);
				if (original) openEdit(original);
			},
		},
		{
			label: 'Delete',
			variant: 'destructive',
			onClick: async (row: any) => {
				const fd = new FormData();
				fd.set('id', row.id);
				const res = await fetch('?/delete', { method: 'POST', body: fd });
				if (res.ok) {
					await invalidateAll();
				} else {
					toast.error('Failed to delete category. It may have products assigned to it.');
				}
			},
		},
	];

	function openEdit(cat: any) {
		editingCategory = cat;
		isEditOpen = true;
	}

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
				Category<br/><span class="text-muted-foreground/40 italic">Taxonomy</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.categories.length} Classification{data.categories.length !== 1 ? 's' : ''} Defined
			</p>
		</div>

		<div class="flex items-center gap-4 w-full md:w-auto">
			<Sheet.Root bind:open={isCreateOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] hidden md:flex">
							New Category
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
					<div class="bg-muted px-4 sm:px-10 py-8 sm:py-12 border-b border-border relative overflow-hidden">
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">New Registration</span>
							<Sheet.Title class="text-2xl sm:text-4xl font-black tracking-tight uppercase">Add Category</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								Create a new classification prefix for SKU generation and inventory grouping.
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="flex-1 flex flex-col justify-between px-4 sm:px-10 py-6 sm:py-8 bg-background">
						<div class="space-y-10">
							{#if form?.error || form?.duplicate}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 animate-in fade-in">
									{#if form?.duplicate}
										The prefix "<strong>{form.prefix}</strong>" is already in use.
									{:else}
										{form?.error}
									{/if}
								</div>
							{/if}

							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Identity</h3>

								<div class="space-y-2 group">
									<Label for="name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Category Name *</Label>
									<Input id="name" name="name" placeholder="E.g., Rectangular Hollow Section" required class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-base px-4 transition-all" />
								</div>

								<div class="space-y-2 group">
									<Label for="prefix" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">SKU Prefix *</Label>
									<Input id="prefix" name="prefix" placeholder="E.g., RHS" class="uppercase h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none transition-all" required />
									<p class="text-[0.7rem] text-muted-foreground/60 font-medium tracking-wide">Must be unique. Auto-generates product identifiers.</p>
								</div>

								<div class="space-y-2 group">
									<Label for="description" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Description / Notes</Label>
									<Input id="description" name="description" placeholder="Optional context..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none" />
								</div>
							</div>
						</div>

						<div class="pt-6 sm:pt-10 mt-6 sm:mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-12 sm:h-16 rounded-none text-sm sm:text-base font-bold tracking-widest uppercase bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all" disabled={isSubmitting}>
								{isSubmitting ? 'Saving...' : 'Register Category'}
							</Button>
						</div>
					</form>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</header>

	<!-- Mobile card view -->
	<div class="md:hidden">
		<DataCards columns={cardColumns} data={processedCategories} actions={cardActions} emptyMessage="No categories found." />
	</div>

	<!-- Desktop table view -->
	<div class="hidden md:block">
	<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)]">
		<Table.Root class="w-full">
			<Table.Header>
				<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[120px]">Prefix</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Name</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Description</Table.Head>
					<Table.Head class="w-[80px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.categories as category}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50">
						<Table.Cell class="px-6 py-4">
							<span class="inline-flex items-center justify-center rounded-none bg-foreground text-background px-3 py-1 text-[10px] font-black tracking-widest uppercase">
								{category.prefix}
							</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4">
							<button onclick={() => openEdit(category)} class="font-bold text-base tracking-tight group-hover:text-primary transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
								{category.name}
							</button>
						</Table.Cell>
						<Table.Cell class="hidden md:table-cell px-6 py-4 text-sm text-muted-foreground/70 max-w-[300px] truncate">
							{category.description || '—'}
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
									<DropdownMenu.Item onSelect={() => openEdit(category)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted mb-1">
										<Pencil class="mr-3 h-4 w-4" /> Edit
									</DropdownMenu.Item>
									<DropdownMenu.Separator class="bg-border/50 -mx-2 my-2" />
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={category.id} />
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
						<Table.Cell colspan={4} class="h-64 text-center align-middle">
							<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
								<Tags class="w-12 h-12 opacity-20" />
								<p class="text-lg font-light tracking-widest uppercase">No Classifications Found</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="px-6 py-3 border-t border-border/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
			{data.categories.length} categor{data.categories.length !== 1 ? 'ies' : 'y'} total
		</div>
	</div>
	</div>
</div>

<PageFAB label="Add category" onclick={() => isCreateOpen = true} />

<!-- Edit Category Sheet -->
<Sheet.Root bind:open={isEditOpen}>
	<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
		{#if editingCategory}
			<div class="bg-muted px-4 sm:px-10 py-8 sm:py-12 border-b border-border relative overflow-hidden">
				<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
				<Sheet.Header class="relative z-10">
					<span class="inline-block px-3 py-1 bg-foreground text-background text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">Modulation Mode</span>
					<Sheet.Title class="text-2xl sm:text-4xl font-black tracking-tight uppercase">{editingCategory.name}</Sheet.Title>
					<Sheet.Description class="text-base font-medium opacity-70 mt-2">
						Prefix: <span class="font-mono font-black">{editingCategory.prefix}</span>
					</Sheet.Description>
				</Sheet.Header>
			</div>

			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="flex-1 flex flex-col justify-between px-4 sm:px-10 py-6 sm:py-8 bg-background">
				<input type="hidden" name="id" value={editingCategory.id} />
				<div class="space-y-10">
					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Identity</h3>

						<div class="space-y-2 group">
							<Label for="edit-name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Category Name *</Label>
							<Input id="edit-name" name="name" value={editingCategory.name} required class="h-14 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg px-0 font-bold transition-all" />
						</div>

						<div class="space-y-2 group">
							<Label for="edit-prefix" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">SKU Prefix *</Label>
							<Input id="edit-prefix" name="prefix" value={editingCategory.prefix} required class="uppercase h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0 transition-all" />
						</div>

						<div class="space-y-2 group">
							<Label for="edit-desc" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Description</Label>
							<Input id="edit-desc" name="description" value={editingCategory.description ?? ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0 transition-all" />
						</div>
					</div>
				</div>

				<div class="pt-6 sm:pt-10 mt-6 sm:mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
					<Button type="submit" class="w-full h-12 sm:h-16 rounded-none text-sm sm:text-base font-bold tracking-widest uppercase bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px] transition-all" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Commit Changes'}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
