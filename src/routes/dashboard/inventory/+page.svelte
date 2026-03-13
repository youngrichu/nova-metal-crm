<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { ArrowDownUp, AlertTriangle, PackageSearch, Activity, Check, ChevronsUpDown } from 'lucide-svelte';
	import * as Popover from "$lib/components/ui/popover";
	import * as Command from "$lib/components/ui/command";
	import { cn } from "$lib/utils";
	
	let { data, form } = $props();
	
	let isTransactOpen = $state(false);
	let isSubmitting = $state(false);

	let selectedType = $state('STOCK_IN');
	let typeOpen = $state(false);
	let selectedProduct = $state('');
	let prodOpen = $state(false);
	let selectedWarehouse = $state('');
	let whOpen = $state(false);

	const txTypes = [
		{ value: 'STOCK_IN', label: 'STOCK IN (RECEIVE GOODS) ↑' },
		{ value: 'STOCK_OUT', label: 'STOCK OUT (DISPATCH) ↓' },
		{ value: 'ADJUSTMENT', label: 'ADJUSTMENT (AUDIT) ±' }
	];

	function getProductLabel(id: string) {
		const prod = data.products.find((p: any) => p.id === id);
		if (!prod) return "— Select a valid SKU —";
		return `${prod.sku} — ${prod.name}`;
	}

	function getWarehouseLabel(id: string) {
		const wh = data.warehouses.find((w: any) => w.id === id);
		if (!wh) return "— Select Location —";
		return wh.name;
	}

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success') {
				isTransactOpen = false;
				selectedProduct = '';
				barcodeInput = '';
				barcodeError = '';
			}
			isSubmitting = false;
			await update();
		};
	}

	let barcodeInputEl = $state<HTMLInputElement | null>(null);
	let barcodeInput = $state('');
	let barcodeError = $state('');

	// Auto-focus the barcode input when the sheet opens
	$effect(() => {
		if (isTransactOpen && barcodeInputEl) {
			tick().then(() => barcodeInputEl?.focus());
		}
	});

	function handleBarcodeScan(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const code = barcodeInput.trim();
			if (!code) return;
			const match = data.products.find((p: any) => p.barcode === code);
			if (match) {
				selectedProduct = match.id;
				barcodeError = '';
			} else {
				barcodeError = `No product found for barcode: ${code.slice(0, 40)}${code.length > 40 ? '...' : ''}`;
			}
			barcodeInput = '';
		}
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

	<!-- Avant-Garde Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-end border-b-2 border-foreground pb-6 gap-6">
		<div class="space-y-2 relative">
			<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
				Stock<br/><span class="text-muted-foreground/40 italic">Ledger</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				Track physical inventory flows across warehouses.
			</p>
		</div>

		<div class="flex items-center gap-4 w-full md:w-auto">
			<Sheet.Root bind:open={isTransactOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative">
							<ArrowDownUp class="w-3.5 h-3.5 mr-2" /> Log Move
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
					<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">Activity Protocol</span>
							<Sheet.Title class="text-4xl font-black tracking-tight uppercase">Record Flow</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								Register an incoming shipment, an outgoing dispatch, or an audit adjustment.
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/transact" use:enhance={handleEnhance} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background relative z-10">
						<div class="space-y-10">
							{#if form?.error}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in">
									<p class="flex items-center gap-2"><AlertTriangle class="w-4 h-4 shrink-0" /> {form.error}</p>
								</div>
							{/if}

							<!-- Barcode Scanner Input -->
							<div class="space-y-2">
								<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">Scan Barcode</Label>
								<div class="relative">
									<Input
										bind:this={barcodeInputEl}
										bind:value={barcodeInput}
										onkeydown={handleBarcodeScan}
										placeholder="Focus here and scan barcode..."
										class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg font-mono transition-all"
									/>
									{#if barcodeError}
										<p class="text-xs text-rose-500 mt-1 font-medium">{barcodeError}</p>
									{/if}
								</div>
							</div>

							<!-- Flow Properties -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">Flow Properties</h3>

								<div class="space-y-2">
									<Label for="type" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">Transaction Type *</Label>
									<input type="hidden" name="type" value={selectedType} />
									<Popover.Root bind:open={typeOpen}>
										<Popover.Trigger
											class={cn(
												"flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm font-bold focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
												!selectedType && "text-muted-foreground"
											)}
											role="combobox"
											aria-expanded={typeOpen}
										>
											<span class="truncate">{txTypes.find(t => t.value === selectedType)?.label}</span>
											<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Popover.Trigger>
										<Popover.Content class="w-full p-0 rounded-lg border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card">
											<Command.Root>
												<Command.List>
													<Command.Group>
														{#each txTypes as type}
															<Command.Item
																value={type.label}
																onSelect={() => {
																	selectedType = type.value;
																	typeOpen = false;
																}}
																class="cursor-pointer py-2"
															>
																<Check class={cn("mr-2 h-4 w-4", selectedType === type.value ? "opacity-100 text-primary" : "opacity-0")} />
																<span class="font-bold">{type.label}</span>
															</Command.Item>
														{/each}
													</Command.Group>
												</Command.List>
											</Command.Root>
										</Popover.Content>
									</Popover.Root>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2">
										<Label for="warehouseId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">Target Warehouse *</Label>
										<input type="hidden" name="warehouseId" value={selectedWarehouse} />
										<Popover.Root bind:open={whOpen}>
											<Popover.Trigger
												class={cn(
													"flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
													!selectedWarehouse && "text-muted-foreground"
												)}
												role="combobox"
												aria-expanded={whOpen}
											>
												<span class="truncate">{getWarehouseLabel(selectedWarehouse)}</span>
												<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Popover.Trigger>
											<Popover.Content class="w-[300px] p-0 rounded-lg border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card" align="start">
												<Command.Root>
													<Command.Input placeholder="Search locations..." class="h-12 border-none font-medium" />
													<Command.List>
														<Command.Empty>No location found.</Command.Empty>
														<Command.Group>
															{#each data.warehouses as wh}
																<Command.Item
																	value={wh.name}
																	onSelect={() => {
																		selectedWarehouse = wh.id;
																		whOpen = false;
																	}}
																	class="cursor-pointer py-2"
																>
																	<Check class={cn("mr-2 h-4 w-4", selectedWarehouse === wh.id ? "opacity-100 text-primary" : "opacity-0")} />
																	<span class="font-bold">{wh.name}</span>
																</Command.Item>
															{/each}
														</Command.Group>
													</Command.List>
												</Command.Root>
											</Popover.Content>
										</Popover.Root>
									</div>

									<div class="space-y-2">
										<Label for="productId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">Specific Product *</Label>
										<input type="hidden" name="productId" value={selectedProduct} />
										<Popover.Root bind:open={prodOpen}>
											<Popover.Trigger
												class={cn(
													"flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
													!selectedProduct && "text-muted-foreground"
												)}
												role="combobox"
												aria-expanded={prodOpen}
											>
												<span class="truncate">{getProductLabel(selectedProduct)}</span>
												<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Popover.Trigger>
											<Popover.Content class="w-[300px] p-0 rounded-lg border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card" align="start">
												<Command.Root>
													<Command.Input placeholder="Search SKU..." class="h-12 border-none font-medium" />
													<Command.List>
														<Command.Empty>No product found.</Command.Empty>
														<Command.Group>
															{#each data.products as prod}
																<Command.Item
																	value={prod.sku + " " + prod.name}
																	onSelect={() => {
																		selectedProduct = prod.id;
																		prodOpen = false;
																	}}
																	class="cursor-pointer py-2"
																>
																	<Check class={cn("mr-2 h-4 w-4", selectedProduct === prod.id ? "opacity-100 text-primary" : "opacity-0")} />
																	<span class="font-bold">{prod.sku} — {prod.name}</span>
																</Command.Item>
															{/each}
														</Command.Group>
													</Command.List>
												</Command.Root>
											</Popover.Content>
										</Popover.Root>
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="quantity" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Quantity *</Label>
										<Input id="quantity" name="quantity" type="number" min="1" placeholder="e.g. 150" required class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg transition-all" />
									</div>
									<div class="space-y-2 group">
										<Label for="referenceDoc" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Ref Document</Label>
										<Input id="referenceDoc" name="referenceDoc" placeholder="Bill of landing, invoice #" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
									</div>
								</div>
								
								<div class="space-y-2 group">
									<Label for="notes" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">Internal Remarks</Label>
									<Input id="notes" name="notes" placeholder="Condition details, auditor tags..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg transition-all" />
								</div>
							</div>
						</div>

						<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
								{isSubmitting ? 'Validating...' : `Commit ${selectedType === 'STOCK_OUT' ? 'Dispatch' : selectedType === 'STOCK_IN' ? 'Receipt' : 'Adjustment'}`}
							</Button>
						</div>
					</form>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</header>

	<div class="grid grid-cols-1 gap-12">
		<!-- Stock Levels Table -->
		<section>
			<h2 class="text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
				<PackageSearch class="w-5 h-5 text-primary" /> Live Levels
			</h2>
			<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)] relative">
				<Table.Root class="w-full text-left border-collapse">
					<Table.Header>
						<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[180px]">Automated SKU</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Product Item</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">Warehouse Depot</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Live Stock</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">Unit Alert</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.stockLevels as row}
							<Table.Row class="hover:bg-muted/30 border-b border-border/50 transition-colors">
								<Table.Cell class="px-6 py-4 font-bold text-sm tracking-tight align-middle">{row.product.sku}</Table.Cell>
								<Table.Cell class="px-6 py-4 text-[13px] font-medium text-foreground/80 align-middle">{row.product.name}</Table.Cell>
								<Table.Cell class="hidden md:table-cell px-6 py-4 align-middle">
									<span class="inline-flex items-center justify-center rounded-none border border-foreground/20 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase text-foreground/70">
										{row.warehouse.name}
									</span>
								</Table.Cell>
								<Table.Cell class="px-6 py-4 text-right align-middle">
									<span class="font-mono font-bold text-base {row.stock.quantity <= row.product.minStockLevel ? 'text-amber-600' : 'text-emerald-600'}">
										{row.stock.quantity}
									</span>
								</Table.Cell>
								<Table.Cell class="px-6 py-4 text-right align-middle">
									<span class="font-mono text-muted-foreground/50 text-xs">
										{row.product.minStockLevel}
									</span>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={5} class="h-48 text-center align-middle">
									<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
										<PackageSearch class="w-10 h-10 opacity-20" />
										<p class="text-sm font-bold tracking-widest uppercase">Database Void — No inventory records found.</p>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</section>

		<!-- Transaction Audit Log -->
		<section>
			<h2 class="text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
				<Activity class="w-5 h-5 text-primary" /> Audit Trail
			</h2>
			<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)] relative">
				<Table.Root class="w-full text-left border-collapse">
					<Table.Header>
						<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[120px]">Type</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Product</Table.Head>
							<Table.Head class="hidden md:table-cell h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Warehouse</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right w-[80px]">Qty Δ</Table.Head>
							<Table.Head class="hidden lg:table-cell h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">Reference</Table.Head>
							<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right w-[160px]">Date</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.recentTransactions as tx}
							<Table.Row class="hover:bg-muted/30 border-b border-border/50 transition-colors">
								<Table.Cell class="px-6 py-4 align-middle">
									<span class="inline-flex items-center justify-center rounded-none px-2 py-1 text-[9px] font-black uppercase tracking-widest 
										{tx.tx.transactionType === 'STOCK_IN' ? 'bg-emerald-500/10 text-emerald-700' :
										tx.tx.transactionType === 'STOCK_OUT' ? 'bg-rose-500/10 text-rose-700' :
										'bg-amber-500/10 text-amber-700'}">
										{tx.tx.transactionType === 'STOCK_IN' ? '↑ IN' :
										tx.tx.transactionType === 'STOCK_OUT' ? '↓ OUT' : '± ADJ'}
									</span>
								</Table.Cell>
								<Table.Cell class="px-6 py-4 align-middle">
									<div class="text-sm font-bold text-foreground tracking-tight">{tx.productName}</div>
									<div class="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{tx.productSku}</div>
								</Table.Cell>
								<Table.Cell class="hidden md:table-cell px-6 py-4 text-[13px] font-medium text-foreground/80 align-middle">
									{tx.warehouseName}
								</Table.Cell>
								<Table.Cell class="px-6 py-4 text-right align-middle">
									<span class="font-mono font-bold text-sm {tx.tx.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}">
										{tx.tx.quantityChange > 0 ? '+' : ''}{tx.tx.quantityChange}
									</span>
								</Table.Cell>
								<Table.Cell class="hidden lg:table-cell px-6 py-4 text-[11px] font-mono text-muted-foreground/50 align-middle">
									{tx.tx.referenceDoc || '—'}
								</Table.Cell>
								<Table.Cell class="px-6 py-4 text-right text-[11px] font-mono font-medium text-foreground/60 align-middle">
									{new Date(tx.tx.createdAt).toLocaleDateString('en-ET', { month: 'short', day: '2-digit', year: 'numeric' })}<br/>
									<span class="opacity-50">{new Date(tx.tx.createdAt).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}</span>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-32 text-center align-middle">
									<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
										<p class="text-xs font-bold tracking-widest uppercase">No transactions recorded yet.</p>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</section>
	</div>
</div>
