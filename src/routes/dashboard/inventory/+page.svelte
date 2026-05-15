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
	import { DataCards } from '$lib/components/ui/data-cards';
	import { PageFAB } from '$lib/components/ui/fab';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { getFormattingLocale } from '$lib/i18n/format';

	let { data, form } = $props();

	let isTransactOpen = $state(false);
	let isSubmitting = $state(false);

	let selectedType = $state('STOCK_IN');
	let priceChangeEnabled = $state(false);
	let typeOpen = $state(false);
	let selectedProduct = $state('');
	let prodOpen = $state(false);
	let selectedWarehouse = $state('');
	let whOpen = $state(false);
	const formattingLocale = $derived(getFormattingLocale(getLocale()));

	const txTypes = [
		{ value: 'STOCK_IN', label: m.inv_type_in() },
		{ value: 'STOCK_OUT', label: m.inv_type_out() },
		{ value: 'ADJUSTMENT', label: m.inv_type_adj() }
	];

	const processedStockLevels = $derived(
		data.stockLevels.map((row: any) => {
			const qty = row.stock.quantity;
			const min = row.product.minStockLevel;
			const stockStatus = qty <= 0 ? m.critical() : qty <= min ? m.low() : m.ok();
			return {
				id: row.stock.id,
				productName: row.product.name,
				productSku: row.product.sku,
				warehouseName: row.warehouse.name,
				quantity: qty,
				stockStatus,
			};
		})
	);

	const stockLevelColumns = [
		{ key: 'productName',  label: m.inv_product_item(),   primary: true },
		{ key: 'productSku',   label: 'SKU',       secondary: true },
		{ key: 'stockStatus',  label: m.wh_table_status(),    badge: true,
			badgeClass: (v: unknown) => {
				if (v === m.ok())  return 'bg-green-100 text-green-700';
				if (v === m.low()) return 'bg-yellow-100 text-yellow-700';
				return 'bg-red-100 text-red-700';
			}
		},
		{ key: 'warehouseName', label: m.inv_warehouse() },
		{ key: 'quantity',      label: m.inv_live_stock() },
	];

	const processedTransactions = $derived(
		data.recentTransactions.map((row: any) => ({
			id: row.tx.id,
			productName: row.productName,
			productSku: row.productSku,
			warehouseName: row.warehouseName,
			transactionType: row.tx.transactionType,
			quantityChange: row.tx.quantityChange > 0 ? `+${row.tx.quantityChange}` : String(row.tx.quantityChange),
			createdAt: new Date(row.tx.createdAt).toLocaleDateString(formattingLocale),
		}))
	);

	const transactionColumns = [
		{ key: 'productName',     label: m.inv_product(),   primary: true },
		{ key: 'warehouseName',   label: m.inv_warehouse(), secondary: true },
		{ key: 'transactionType', label: m.inv_type(),      badge: true },
		{ key: 'quantityChange',  label: m.inv_qty_delta() },
		{ key: 'createdAt',       label: m.inv_date() },
	];

	function getProductLabel(id: string) {
		const prod = data.products.find((p: any) => p.id === id);
		if (!prod) return m.inventory_select_valid_sku();
		return `${prod.sku} — ${prod.name}`;
	}

	function getWarehouseLabel(id: string) {
		const wh = data.warehouses.find((w: any) => w.id === id);
		if (!wh) return m.inventory_select_location();
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
				priceChangeEnabled = false;
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
				barcodeError = `${m.inv_no_product_barcode()} ${code.slice(0, 40)}${code.length > 40 ? '...' : ''}`;
			}
			barcodeInput = '';
		}
	}
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">

	<!-- Avant-Garde Page Header -->
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6">
		<div class="space-y-2 relative">
			<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
				{m.inv_title_line1()}<br/><span class="text-muted-foreground/40 italic">{m.inv_title_line2()}</span>
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{m.inv_title_desc()}
			</p>
		</div>

		<div class="flex items-center gap-4 w-full md:w-auto">
			<Sheet.Root bind:open={isTransactOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="hidden md:flex h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_var(--color-primary)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative">
							<ArrowDownUp class="w-3.5 h-3.5 mr-2" /> {m.inv_log_move()}
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-8 border-primary shadow-2xl p-0">
					<div class="bg-muted px-4 sm:px-10 py-8 sm:py-12 border-b border-border relative overflow-hidden">
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">{m.inv_activity_proto()}</span>
							<Sheet.Title class="text-2xl sm:text-4xl font-black tracking-tight uppercase">{m.inv_record_flow()}</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								{m.inv_record_flow_desc()}
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/transact" use:enhance={handleEnhance} class="flex-1 flex flex-col justify-between px-4 sm:px-10 py-6 sm:py-8 bg-background relative z-10">
						<div class="space-y-10">
							{#if form?.error}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in">
									<p class="flex items-center gap-2"><AlertTriangle class="w-4 h-4 shrink-0" /> {form.error}</p>
								</div>
							{/if}

							{#if data.barcodeEnabled}
							<!-- Barcode Scanner Input -->
							<div class="space-y-2">
								<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.inv_scan_barcode()}</Label>
								<div class="relative">
									<Input
										bind:ref={barcodeInputEl}
										bind:value={barcodeInput}
										onkeydown={handleBarcodeScan}
										placeholder={m.inv_scan_placeholder()}
										class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none font-mono transition-all"
									/>
									{#if barcodeError}
										<p class="text-xs text-rose-500 mt-1 font-medium">{barcodeError}</p>
									{/if}
								</div>
							</div>
							{/if}

							<!-- Flow Properties -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.inv_flow_prop()}</h3>

								<div class="space-y-2">
									<Label for="type" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">{m.inv_tx_type()}</Label>
									<input type="hidden" name="type" value={selectedType} />
									<Popover.Root bind:open={typeOpen}>
										<Popover.Trigger
											class={cn(
												"flex h-12 w-full items-center justify-between rounded-none border-2 border-foreground/10 bg-muted/30 px-4 text-sm font-bold focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
												!selectedType && "text-muted-foreground"
											)}
											role="combobox"
											aria-expanded={typeOpen}
										>
											<span class="truncate">{txTypes.find(t => t.value === selectedType)?.label}</span>
											<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Popover.Trigger>
										<Popover.Content class="w-full p-0 rounded-none border-2 border-foreground/10 shadow-[4px_4px_0px_0px_--theme(--color-foreground/10%)] bg-card">
											<Command.Root>
												<Command.List>
													<Command.Group>
														{#each txTypes as type}
															<Command.Item
																value={type.label}
																onSelect={() => {
																	selectedType = type.value;
																	priceChangeEnabled = false;
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
										<Label for="warehouseId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">{m.inv_target_wh()}</Label>
										<input type="hidden" name="warehouseId" value={selectedWarehouse} />
										<Popover.Root bind:open={whOpen}>
											<Popover.Trigger
												class={cn(
													"flex h-12 w-full items-center justify-between rounded-none border-2 border-foreground/10 bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
													!selectedWarehouse && "text-muted-foreground"
												)}
												role="combobox"
												aria-expanded={whOpen}
											>
												<span class="truncate">{getWarehouseLabel(selectedWarehouse)}</span>
												<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Popover.Trigger>
											<Popover.Content class="w-[min(300px,calc(100vw-2rem))] p-0 rounded-none border-2 border-foreground/10 shadow-[4px_4px_0px_0px_--theme(--color-foreground/10%)] bg-card" align="start">
												<Command.Root>
													<Command.Input placeholder={m.inventory_search_locations()} class="h-12 border-none font-medium" />
													<Command.List>
														<Command.Empty>{m.inventory_location_empty()}</Command.Empty>
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
										<Label for="productId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">{m.inv_specific_prod()}</Label>
										<input type="hidden" name="productId" value={selectedProduct} />
										<Popover.Root bind:open={prodOpen}>
											<Popover.Trigger
												class={cn(
													"flex h-12 w-full items-center justify-between rounded-none border-2 border-foreground/10 bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors",
													!selectedProduct && "text-muted-foreground"
												)}
												role="combobox"
												aria-expanded={prodOpen}
											>
												<span class="truncate">{getProductLabel(selectedProduct)}</span>
												<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
											</Popover.Trigger>
											<Popover.Content class="w-[min(300px,calc(100vw-2rem))] p-0 rounded-none border-2 border-foreground/10 shadow-[4px_4px_0px_0px_--theme(--color-foreground/10%)] bg-card" align="start">
												<Command.Root>
													<Command.Input placeholder={m.inventory_search_sku()} class="h-12 border-none font-medium" />
													<Command.List>
														<Command.Empty>{m.inventory_product_empty()}</Command.Empty>
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
										<Label for="quantity" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">{m.inv_qty()}</Label>
										<Input id="quantity" name="quantity" type="number" min="1" placeholder="e.g. 150" required class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg transition-all" />
									</div>
									<div class="space-y-2 group">
										<Label for="referenceDoc" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">{m.inv_ref_doc()}</Label>
										<Input id="referenceDoc" name="referenceDoc" placeholder={m.inv_ref_placeholder()} class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none transition-all" />
									</div>
								</div>

								<div class="space-y-2 group">
									<Label for="notes" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">{m.inv_internal_remarks()}</Label>
									<Input id="notes" name="notes" placeholder={m.inv_remarks_placeholder()} class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none transition-all" />
								</div>

								{#if selectedType === 'STOCK_IN'}
								<div class="space-y-4 border-t border-border/50 pt-6">
									<div class="flex items-center justify-between">
										<div>
											<p class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.inv_price_change()}</p>
											<p class="text-[11px] text-muted-foreground/60 mt-0.5">{m.inv_price_change_desc()}</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={priceChangeEnabled}
											aria-label={m.inv_price_change()}
											onclick={() => { priceChangeEnabled = !priceChangeEnabled; }}
											class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 {priceChangeEnabled ? 'bg-primary' : 'bg-muted'}"
										>
											<span class="pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform {priceChangeEnabled ? 'translate-x-5' : 'translate-x-0'}"></span>
										</button>
									</div>

									{#if priceChangeEnabled}
									<div class="space-y-2 group animate-in fade-in slide-in-from-top-1 duration-150">
										<Label for="unitCost" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">{m.inv_purchase_cost()}</Label>
										<Input
											id="unitCost"
											name="unitCost"
											type="number"
											min="0.01"
											step="0.01"
											placeholder="e.g. 250.00"
											required
											class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg transition-all"
										/>
									</div>
									{/if}
								</div>
								{/if}
							</div>
						</div>

						<div class="pt-6 sm:pt-10 mt-6 sm:mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-12 sm:h-16 rounded-none text-sm sm:text-base font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_var(--color-muted)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
								{isSubmitting ? m.validating() : (selectedType === 'STOCK_OUT' ? m.inv_commit_dispatch() : selectedType === 'STOCK_IN' ? m.inv_commit_receipt() : m.inv_commit_adj())}
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
				<PackageSearch class="w-5 h-5 text-primary" /> {m.inv_live_levels()}
			</h2>
			<!-- Stock Levels mobile -->
			<div class="md:hidden">
				<DataCards columns={stockLevelColumns} data={processedStockLevels} emptyMessage={m.inv_no_stock_mobile()} />
			</div>
			<div class="hidden md:block">
				<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground\\_/_10%)] relative">
					<Table.Root class="w-full text-left border-collapse">
						<Table.Header>
							<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[180px]">{m.inv_auto_sku()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.inv_product_item()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">{m.inv_wh_depot()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">{m.inv_live_stock()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">{m.inv_unit_alert()}</Table.Head>
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
											<p class="text-sm font-bold tracking-widest uppercase">{m.inv_db_void()}</p>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</section>

		<!-- Transaction Audit Log -->
		<section>
			<h2 class="text-lg font-black tracking-widest uppercase mb-4 flex items-center gap-2">
				<Activity class="w-5 h-5 text-primary" /> {m.inv_audit_trail()}
			</h2>
			<!-- Transactions mobile -->
			<div class="md:hidden">
				<DataCards columns={transactionColumns} data={processedTransactions} emptyMessage={m.inv_no_tx_mobile()} />
			</div>
			<div class="hidden md:block">
				<div class="bg-card border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground\\_/_10%)] relative">
					<Table.Root class="w-full text-left border-collapse">
						<Table.Header>
							<Table.Row class="bg-muted/50 hover:bg-muted/50 border-b-2 border-foreground/10">
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 w-[120px]">{m.inv_type()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.inv_product()}</Table.Head>
								<Table.Head class="hidden md:table-cell h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.inv_warehouse()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right w-[80px]">{m.inv_qty_delta()}</Table.Head>
								<Table.Head class="hidden lg:table-cell h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.inv_reference()}</Table.Head>
								<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right w-[160px]">{m.inv_date()}</Table.Head>
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
											{tx.tx.transactionType === 'STOCK_IN' ? m.in_short() :
											tx.tx.transactionType === 'STOCK_OUT' ? m.out_short() : m.adj_short()}
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
										{new Date(tx.tx.createdAt).toLocaleDateString(formattingLocale, { month: 'short', day: '2-digit', year: 'numeric' })}<br/>
										<span class="opacity-50">{new Date(tx.tx.createdAt).toLocaleTimeString(formattingLocale, { hour: '2-digit', minute: '2-digit' })}</span>
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={6} class="h-32 text-center align-middle">
										<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
											<p class="text-xs font-bold tracking-widest uppercase">{m.inv_no_tx()}</p>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		</section>
	</div>
</div>

<PageFAB label={m.inv_log_move()} onclick={() => isTransactOpen = true} />
