<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, Box, ChevronDown, Pencil } from 'lucide-svelte';
	
	let { data, form } = $props();
	
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isSubmitting = $state(false);
	let editingProduct = $state<any>(null);

	function openEdit(row: any) {
		editingProduct = row;
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
				Product<br/><span class="text-muted-foreground/40 italic">Catalog</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.products.length} Material{data.products.length !== 1 ? 's' : ''} Indexed
			</p>
		</div>

		<div class="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
			<!-- Advanced search input -->
			<form method="GET" class="relative group flex-1 md:flex-none">
				<div class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
				</div>
				<Input 
					name="q" 
					placeholder="Search catalog..."
					class="w-full md:w-[280px] h-12 pl-10 rounded-none border-x-0 border-t-0 border-b-2 border-foreground/20 bg-transparent shadow-none text-base focus-visible:ring-0 focus-visible:border-foreground transition-all duration-300 placeholder:text-muted-foreground/50"
				/>
			</form>

			<Sheet.Root bind:open={isCreateOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative">
							New Item
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
					<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">New Registration</span>
							<Sheet.Title class="text-4xl font-black tracking-tight uppercase">Define Product</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								Automated SKU generation based on precise physical dimensions.
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background relative z-10">
						<div class="space-y-10">
							{#if form?.error || form?.duplicate}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in">
									<p>{form.message || form.error}</p>
								</div>
							{/if}

							<!-- Core Identity -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Classification</h3>

								<div class="space-y-2 relative group">
									<Label for="categoryId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Structural Category *</Label>
									<select id="categoryId" name="categoryId" required class="flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors">
										<option value="" disabled selected>— Select Classification —</option>
										{#each data.categories as cat}
											<option value={cat.id}>{cat.name} ({cat.prefix})</option>
										{/each}
									</select>
								</div>

								<div class="space-y-2 group">
									<Label for="name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Identifier Name *</Label>
									<Input id="name" name="name" placeholder="Square Tube 40x40" required class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
								</div>
							</div>

							<!-- Dimensions -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Dimensions & Metrics</h3>
								
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="size1" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Size 1 (mm)</Label>
										<Input id="size1" name="size1" type="number" step="0.1" placeholder="40" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
									<div class="space-y-2 group">
										<Label for="size2" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Size 2 (mm)</Label>
										<Input id="size2" name="size2" type="number" step="0.1" placeholder="Optional" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="thickness" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Gauge / Thickness (mm)</Label>
										<Input id="thickness" name="thickness" type="number" step="0.1" placeholder="1.5" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
									<div class="space-y-2 group">
										<Label for="length" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Standard Length (mm)</Label>
										<Input id="length" name="length" type="number" placeholder="6000" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="weightPerPiece" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Unit Weight (kg)</Label>
										<Input id="weightPerPiece" name="weightPerPiece" type="number" step="0.01" placeholder="Optional" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
									<div class="space-y-2 group">
										<Label for="minStockLevel" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Alert Threshold *</Label>
										<Input id="minStockLevel" name="minStockLevel" type="number" value="10" required class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
								</div>

								<div class="space-y-2 group">
									<Label for="description" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Specs & Annotations</Label>
									<Input id="description" name="description" placeholder="Any special remarks..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
								</div>
							</div>
						</div>

						<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
								{isSubmitting ? 'Generating SKU...' : 'Save Product Record'}
							</Button>
						</div>
					</form>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</header>

	<!-- Main Data Presentation -->
	<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)] relative">
		
		<Table.Root class="w-full text-left border-collapse">
			<Table.Header>
				<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[110px]">Category</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[180px]">Automated SKU</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Identifier</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Dimensions</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell text-right">Min Stock</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell text-right">Weight / Pc</Table.Head>
					<Table.Head class="w-[80px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.products as row}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50">
						<Table.Cell class="px-6 py-4 align-middle">
							<span class="inline-flex items-center justify-center rounded-none bg-muted px-2 py-0.5 text-[9px] font-black tracking-widest uppercase text-foreground/70 border border-border/50">
								{row.category?.prefix || '—'}
							</span>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 align-middle">
							<button onclick={() => openEdit(row)} class="font-bold text-sm tracking-tight group-hover:text-primary transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
								{row.product.sku}
							</button>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-[13px] font-medium text-foreground/80 align-middle">
							{row.product.name}
						</Table.Cell>
						<Table.Cell class="hidden md:table-cell px-6 py-4 align-middle">
							<div class="flex gap-2 items-center flex-wrap">
								{#if row.product.size1 || row.product.size2}
									<span class="inline-flex items-center justify-center rounded-none border border-foreground/20 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase text-foreground/70">
										{row.product.size1 ?? '-'}{#if row.product.size2}×{row.product.size2}{/if}
									</span>
								{/if}
								{#if row.product.thickness}
									<span class="inline-flex items-center justify-center rounded-none border border-foreground/20 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase text-foreground/70">
										T:{row.product.thickness}
									</span>
								{/if}
								{#if row.product.length}
									<span class="inline-flex items-center justify-center rounded-none border border-foreground/20 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase text-foreground/70">
										L:{row.product.length}
									</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="hidden lg:table-cell px-6 py-4 text-right align-middle text-sm font-mono text-muted-foreground/50">
							{row.product.minStockLevel}
						</Table.Cell>
						<Table.Cell class="hidden lg:table-cell px-6 py-4 text-right align-middle text-sm font-mono text-muted-foreground/50">
							{row.product.weightPerPiece ? `${row.product.weightPerPiece}kg` : '—'}
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
									<DropdownMenu.Item onSelect={() => openEdit(row)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted mb-1">
										<Pencil class="mr-3 h-4 w-4" /> Edit
									</DropdownMenu.Item>
									<DropdownMenu.Separator class="bg-border/50 -mx-2 my-2" />
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={row.product.id} />
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
						<Table.Cell colspan={7} class="h-64 text-center align-middle">
							<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
								<Box class="w-12 h-12 opacity-20" />
								<p class="text-lg font-light tracking-widest uppercase">No materials indexed</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		
		<div class="px-6 py-3 border-t border-border/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
			{data.products.length} product{data.products.length !== 1 ? 's' : ''} total
		</div>
	</div>
</div>

<!-- Edit Product Sheet -->
<Sheet.Root bind:open={isEditOpen}>
	<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
		{#if editingProduct}
			<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
				<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
				<Sheet.Header class="relative z-10">
					<span class="inline-block px-3 py-1 bg-foreground text-background text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">Modulation Mode</span>
					<Sheet.Title class="text-4xl font-black tracking-tight uppercase line-clamp-1">{editingProduct.product.name}</Sheet.Title>
					<Sheet.Description class="text-base font-medium opacity-70 mt-2">
						SKU <span class="font-mono text-primary font-bold">{editingProduct.product.sku}</span>
					</Sheet.Description>
				</Sheet.Header>
			</div>

			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background relative z-10">
				<input type="hidden" name="id" value={editingProduct.product.id} />
				<div class="space-y-10">
					{#if form?.error}
						<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in">
							<p>{form.error}</p>
						</div>
					{/if}

					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Classification</h3>

						<div class="space-y-2 group">
							<Label for="edit-categoryId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Structural Category *</Label>
							<select id="edit-categoryId" name="categoryId" required class="flex h-12 w-full items-center justify-between rounded-none border-t-0 border-x-0 border-b-2 border-border/50 bg-transparent px-0 text-sm focus:border-primary focus:outline-none transition-colors">
								{#each data.categories as cat}
									<option value={cat.id} selected={cat.id === editingProduct.product.categoryId}>{cat.name} ({cat.prefix})</option>
								{/each}
							</select>
						</div>

						<div class="space-y-2 group">
							<Label for="edit-name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Identifier Name *</Label>
							<Input id="edit-name" name="name" value={editingProduct.product.name} required class="h-14 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg px-0 transition-all font-bold" />
						</div>
					</div>

					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Dimensions & Metrics</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-size1" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Size 1 (mm)</Label>
								<Input id="edit-size1" name="size1" type="number" step="0.1" value={editingProduct.product.size1 ?? ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
							<div class="space-y-2 group">
								<Label for="edit-size2" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Size 2 (mm)</Label>
								<Input id="edit-size2" name="size2" type="number" step="0.1" value={editingProduct.product.size2 ?? ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-thickness" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Gauge / Thickness (mm)</Label>
								<Input id="edit-thickness" name="thickness" type="number" step="0.1" value={editingProduct.product.thickness ?? ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
							<div class="space-y-2 group">
								<Label for="edit-length" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Standard Length (mm)</Label>
								<Input id="edit-length" name="length" type="number" value={editingProduct.product.length ?? ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-weight" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Unit Weight (kg)</Label>
								<Input id="edit-weight" name="weightPerPiece" type="number" step="0.01" value={editingProduct.product.weightPerPiece ?? ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
							<div class="space-y-2 group">
								<Label for="edit-minStock" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Alert Threshold *</Label>
								<Input id="edit-minStock" name="minStockLevel" type="number" value={editingProduct.product.minStockLevel} required class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
						</div>

						<div class="space-y-2 group">
							<Label for="edit-desc" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">Specs & Annotations</Label>
							<Input id="edit-desc" name="description" value={editingProduct.product.description ?? ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
						</div>
					</div>
				</div>

				<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
					<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
						{isSubmitting ? 'Saving...' : 'Commit Changes'}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>
