<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, Tags, ChevronDown, Pencil } from 'lucide-svelte';
	
	let { data, form } = $props();
	
	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isSubmitting = $state(false);
	let editingCategory = $state<any>(null);

	function openEdit(cat: any) {
		editingCategory = cat;
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
				<Input placeholder="Search categories…" class="w-[220px] h-8 text-sm bg-transparent shadow-none" />
			</div>

			<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
				
				<Dialog.Root bind:open={isCreateModalOpen}>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<Button {...props} size="sm" class="h-8 text-xs font-medium shadow-none px-4 bg-primary text-primary-foreground hover:bg-primary/90">
								New Category
							</Button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content class="sm:max-w-[500px] border-none shadow-[0_0_40px_rgba(0,0,0,0.1)] px-8 py-10 rounded-3xl">
						<Dialog.Header class="mb-8">
							<Dialog.Title class="text-3xl font-light tracking-tight">New Category</Dialog.Title>
							<Dialog.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
								Create a new category prefix for accurate inventory grouping and SKU generation.
							</Dialog.Description>
						</Dialog.Header>

						<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="space-y-8">
							{#if form?.duplicate}
								<div class="p-4 text-sm font-medium rounded-2xl bg-destructive/5 text-destructive border-l-4 border-destructive flex items-start gap-3">
									<p>The prefix "<span class="font-bold">{form.prefix}</span>" is already in use.</p>
								</div>
							{/if}

							<div class="space-y-1 group">
								<Label for="name" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Category Name <span class="text-destructive">*</span></Label>
								<Input id="name" name="name" placeholder="E.g., Rectangular Hollow Section" required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>

							<div class="space-y-1 group">
								<Label for="prefix" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">SKU Prefix <span class="text-destructive">*</span></Label>
								<Input id="prefix" name="prefix" placeholder="E.g., RHS" class="uppercase h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" required />
								<p class="text-[0.75rem] text-muted-foreground/60 pt-2 font-medium tracking-wide">Must be unique. Used to auto-generate identifiers.</p>
							</div>

							<div class="space-y-1 pb-4 group">
								<Label for="description" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Description / Internal Notes</Label>
								<Input id="description" name="description" placeholder="Optional context..." class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
							</div>

							<div class="pt-4">
								<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl hover:shadow-2xl active:scale-[0.98]" disabled={isSubmitting}>
									{isSubmitting ? 'Saving...' : 'Save Category'}
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
							Prefix
						</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle transition-colors">
							Name
						</Table.Head>
						<Table.Head class="hidden md:table-cell h-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground align-middle transition-colors">
							Description
						</Table.Head>
						<Table.Head class="w-[120px] text-right h-10 align-middle"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.categories as category}
						<Table.Row class="hover:bg-muted/30 border-b border-border/40 transition-colors group/row">
							<Table.Cell class="px-4 py-3 align-middle">
								<input type="checkbox" class="w-3.5 h-3.5 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary/50 opacity-40 group-hover/row:opacity-100 transition-opacity" />
							</Table.Cell>
							<Table.Cell class="py-3 align-middle">
								<span class="inline-flex items-center justify-center rounded-full bg-muted/60 text-foreground/80 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wider border border-border/50">
									{category.prefix}
								</span>
							</Table.Cell>
							<Table.Cell class="py-3 text-sm align-middle">
								<button onclick={() => openEdit(category)} class="text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 text-left outline-none">{category.name}</button>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell py-3 text-[13px] align-middle text-muted-foreground/80 max-w-[300px] truncate">
								{category.description || '—'}
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
								<DropdownMenu.Item onSelect={() => openEdit(category)} class="text-xs font-medium rounded-lg px-3 py-2 cursor-pointer">
									<Pencil class="mr-2 h-4 w-4" />
									Edit
								</DropdownMenu.Item>
										<DropdownMenu.Separator class="my-1 bg-border/40" />
										<form method="POST" action="?/delete" use:enhance class="w-full">
											<input type="hidden" name="id" value={category.id} />
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
							<Table.Cell colspan={5} class="h-32 text-center text-xs align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
									<Tags class="w-6 h-6 opacity-40" />
									<p>No categories found</p>
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
			{data.categories.length} categor{data.categories.length !== 1 ? 'ies' : 'y'} total
		</div>
		</div>
	</div>
</div>

<!-- Edit Category Dialog -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-[500px] border-none shadow-[0_0_40px_rgba(0,0,0,0.1)] px-8 py-10 rounded-3xl">
		<Dialog.Header class="mb-8">
			<Dialog.Title class="text-3xl font-light tracking-tight">Edit Category</Dialog.Title>
			<Dialog.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
				Update the category name, prefix, or description.
			</Dialog.Description>
		</Dialog.Header>

		{#if editingCategory}
			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="space-y-8">
				<input type="hidden" name="id" value={editingCategory.id} />

				<div class="space-y-1 group">
					<Label for="edit-name" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Category Name <span class="text-destructive">*</span></Label>
					<Input id="edit-name" name="name" value={editingCategory.name} required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
				</div>

				<div class="space-y-1 group">
					<Label for="edit-prefix" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">SKU Prefix <span class="text-destructive">*</span></Label>
					<Input id="edit-prefix" name="prefix" value={editingCategory.prefix} required class="uppercase h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
				</div>

				<div class="space-y-1 pb-4 group">
					<Label for="edit-desc" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Description</Label>
					<Input id="edit-desc" name="description" value={editingCategory.description ?? ''} class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
				</div>

				<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Save Changes'}
				</Button>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
