<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, Plus, Box, ChevronDown, Pencil, Copy, Archive } from 'lucide-svelte';
	
	let { data, form } = $props();
	
	let isCreateOpen = $state(false);
	let isSubmitting = $state(false);

	let selectedCategory = $state('');

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success') {
				isCreateOpen = false;
			}
			isSubmitting = false;
			await update();
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">

	<!-- Main Table Card -->
	<div class="rounded-lg border bg-card shadow-sm flex flex-col">
		
		<!-- Table Toolbar -->
		<div class="flex flex-col sm:flex-row justify-between items-center p-3 border-b border-border/50 gap-3">
			<div class="flex items-center gap-2 w-full sm:w-auto">
				<Input placeholder="Search products…" class="w-[220px] h-8 text-sm bg-transparent shadow-none" />
			</div>

			<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
				
				<Sheet.Root bind:open={isCreateOpen}>
					<Sheet.Trigger>
						{#snippet child({ props })}
							<Button {...props} size="sm" class="h-8 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-none px-4">
								New Product
							</Button>
						{/snippet}
					</Sheet.Trigger>
					<Sheet.Content class="sm:max-w-[600px] overflow-y-auto flex flex-col h-full border-l-0 shadow-[0_0_40px_rgba(0,0,0,0.05)] px-8 py-10">
						<Sheet.Header class="mb-10">
							<Sheet.Title class="text-3xl font-light tracking-tight">New Product</Sheet.Title>
							<Sheet.Description class="text-sm font-light leading-relaxed mt-2 opacity-70">
								Automated SKU generation based on precise physical dimensions.
							</Sheet.Description>
						</Sheet.Header>

						<form method="POST" action="?/create" use:enhance={handleEnhance} class="flex-1 flex flex-col justify-between">
							<div class="space-y-8">
								{#if form?.error || form?.duplicate}
									<div class="p-4 text-sm font-medium rounded-2xl bg-destructive/5 text-destructive border-l-4 border-destructive flex items-start gap-3">
										<Box class="w-4 h-4 shrink-0" />
										<p>{form.message || form.error}</p>
									</div>
								{/if}

								<div class="space-y-1 relative group">
									<Label for="categoryId" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors mix-blend-multiply">Structural Category</Label>
									<div class="relative">
										<select id="categoryId" name="categoryId" bind:value={selectedCategory} required class="flex h-12 w-full appearance-none items-center justify-between whitespace-nowrap bg-transparent px-0 py-2 text-base shadow-none border-b border-border/40 focus:border-foreground focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50">
											<option value="" disabled selected>— Select Classification —</option>
											{#each data.categories as cat}
												<option value={cat.id} class="text-foreground">{cat.name} ({cat.prefix})</option>
											{/each}
										</select>
										<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-30"><path d="m6 9 6 6 6-6"/></svg>
										</div>
									</div>
								</div>

								<div class="space-y-1 group">
									<Label for="name" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Identifier Name</Label>
									<Input id="name" name="name" placeholder="Square Tube 40x40" required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
								</div>

								<div class="grid grid-cols-2 gap-8">
									<div class="space-y-1 group">
										<Label for="size1" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Size 1 (mm)</Label>
										<Input id="size1" name="size1" type="number" step="0.1" placeholder="40" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
									<div class="space-y-1 group">
										<Label for="size2" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Size 2 (mm)</Label>
										<Input id="size2" name="size2" type="number" step="0.1" placeholder="Optional" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
								</div>

								<div class="grid grid-cols-2 gap-8">
									<div class="space-y-1 group">
										<Label for="thickness" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Gauge / Thickness (mm)</Label>
										<Input id="thickness" name="thickness" type="number" step="0.1" placeholder="1.5" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
									<div class="space-y-1 group">
										<Label for="length" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Standard Length (mm)</Label>
										<Input id="length" name="length" type="number" placeholder="6000" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
								</div>

								<div class="grid grid-cols-2 gap-8">
									<div class="space-y-1 group">
										<Label for="weightPerPiece" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Unit Weight (kg)</Label>
										<Input id="weightPerPiece" name="weightPerPiece" type="number" step="0.01" placeholder="Optional" class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
									<div class="space-y-1 group">
										<Label for="minStockLevel" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Alert Threshold</Label>
										<Input id="minStockLevel" name="minStockLevel" type="number" value="10" required class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
									</div>
								</div>

								<div class="space-y-1 pb-10 group">
									<Label for="description" class="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold group-focus-within:text-foreground transition-colors">Specs & Annotations</Label>
									<Input id="description" name="description" placeholder="Any special remarks..." class="h-12 border-0 border-b border-border/40 rounded-none bg-transparent px-0 text-base shadow-none focus-visible:ring-0 focus-visible:border-foreground transition-colors" />
								</div>
							</div>

							<div class="pt-4 mt-auto bg-background/80 backdrop-blur-md pb-4 sticky bottom-0">
								<Button type="submit" class="w-full h-14 rounded-full text-base font-medium transition-all hover:scale-[1.02] bg-foreground text-background shadow-xl hover:shadow-2xl active:scale-[0.98]" disabled={isSubmitting}>
									{isSubmitting ? 'Generating SKU...' : 'Save Product Record'}
								</Button>
							</div>
						</form>
					</Sheet.Content>
				</Sheet.Root>
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
						<Table.Head class="h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide group cursor-pointer hover:text-foreground transition-colors">
							<div class="flex items-center gap-1">Category <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 group-hover:opacity-100 transition-opacity"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>
						</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide group cursor-pointer hover:text-foreground transition-colors">
							<div class="flex items-center gap-1">SKU <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 group-hover:opacity-100 transition-opacity"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>
						</Table.Head>
						<Table.Head class="h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide group cursor-pointer hover:text-foreground transition-colors">
							<div class="flex items-center gap-1">Product <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 group-hover:opacity-100 transition-opacity"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>
						</Table.Head>
						<Table.Head class="hidden md:table-cell h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide group cursor-pointer hover:text-foreground transition-colors">
							<div class="flex items-center gap-1">Specs <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 group-hover:opacity-100 transition-opacity"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>
						</Table.Head>
						<Table.Head class="hidden lg:table-cell text-right h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide group cursor-pointer hover:text-foreground transition-colors">
							<div class="flex items-center gap-1 justify-end">Weight <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-50 group-hover:opacity-100 transition-opacity"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>
						</Table.Head>
						<Table.Head class="w-[120px] text-right h-10 text-xs font-semibold text-muted-foreground align-middle tracking-wide"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.products as row}
						<Table.Row class="hover:bg-muted/30 border-b border-border/40 transition-colors group/row">
							<Table.Cell class="px-4 py-3 align-middle">
								<input type="checkbox" class="w-3.5 h-3.5 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary/50 opacity-40 group-hover/row:opacity-100 transition-opacity" />
							</Table.Cell>
							<Table.Cell class="py-3 align-middle">
								<span class="inline-flex items-center justify-center rounded bg-emerald-100/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 tracking-wide uppercase">
									{row.category?.prefix || '—'}
								</span>
							</Table.Cell>
							<Table.Cell class="py-3 text-sm align-middle">
								<span class="text-blue-600 font-medium hover:underline cursor-pointer transition-all">{row.product.sku}</span>
							</Table.Cell>
							<Table.Cell class="py-3 text-sm align-middle">
								<div class="font-medium text-foreground">{row.product.name}</div>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell py-3 text-sm align-middle text-muted-foreground">
								{[
									row.product.size1 && `S1=${row.product.size1}`,
									row.product.size2 && `S2=${row.product.size2}`,
									row.product.thickness && `T=${row.product.thickness}mm`,
									row.product.length && `L=${row.product.length}mm`
								].filter(Boolean).join(' · ')}
							</Table.Cell>
							<Table.Cell class="hidden lg:table-cell text-right py-3 text-sm align-middle text-muted-foreground font-mono">
								{row.product.weightPerPiece ? `${row.product.weightPerPiece}kg` : '—'}
							</Table.Cell>
							<Table.Cell class="text-right py-2 px-4 align-middle">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="outline" size="sm" class="h-8 bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white border-none shadow-sm text-[11px] font-medium px-3 flex items-center justify-between min-w-[85px] cursor-pointer rounded">
												Actions <ChevronDown class="h-3.5 w-3.5 ml-2 opacity-70" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-48 bg-card/95 backdrop-blur-md rounded-xl shadow-xl border-white/10 p-1">
										<DropdownMenu.Item disabled class="text-xs font-medium rounded-lg px-3 py-2 text-muted-foreground/40 cursor-not-allowed">
											<Pencil class="mr-2 h-4 w-4" />
											Edit
										</DropdownMenu.Item>
										<DropdownMenu.Item disabled class="text-xs font-medium rounded-lg px-3 py-2 text-muted-foreground/40 cursor-not-allowed">
											<Copy class="mr-2 h-4 w-4" />
											Clone
										</DropdownMenu.Item>
										<DropdownMenu.Separator class="my-1 bg-border/40" />
										<form method="POST" action="?/delete" use:enhance class="w-full">
											<input type="hidden" name="id" value={row.product.id} />
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
							<Table.Cell colspan={7} class="h-32 text-center text-xs align-middle">
								<div class="flex flex-col items-center justify-center text-muted-foreground/60 gap-2">
									<Box class="w-6 h-6 opacity-40" />
									<p>No records found</p>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Table Footer -->
		<div class="px-4 py-3 border-t border-border/50 text-sm text-muted-foreground bg-muted/10">
			{data.products.length} product{data.products.length !== 1 ? 's' : ''} total
		</div>

	</div>
</div>
