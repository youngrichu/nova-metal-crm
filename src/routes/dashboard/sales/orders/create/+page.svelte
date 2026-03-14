<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { Trash2, Box, ChevronLeft, Save, FileText, User, PlusCircle, Check, ChevronsUpDown } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils/currency';
	import { goto } from '$app/navigation';
    import * as Popover from "$lib/components/ui/popover";
    import * as Command from "$lib/components/ui/command";
    import { cn } from "$lib/utils";
    import { tick, untrack } from "svelte";

	let { data, form } = $props();

	let isSubmitting = $state(false);
	let selectedCustomerId = $state('');
	let customerOpen = $state(false);
	
	// Line items state
	let items = $state([{ productId: '', quantity: 1, unitPrice: 0, _isOpen: false }]);

    function getCustomerLabel(id: string) {
        const cust = data.customers.find((c: any) => c.id === id);
        if (!cust) return "-- Choose Customer --";
        return cust.companyName ? `${cust.name} (${cust.companyName})` : cust.name;
    }

	function getProductLabel(id: string) {
        const prod = data.products.find((p: any) => p.id === id);
        if (!prod) return "-- Select Product --";
        return `${prod.sku} | ${prod.name}`;
    }

	// Computed totals
	let subtotal = $derived(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0));
	let taxAmount = $derived(subtotal * 0.15); // 15% VAT
	let totalAmount = $derived(subtotal + taxAmount);

	function addItem() {
		items = [...items, { productId: '', quantity: 1, unitPrice: 0, _isOpen: false }];
	}

	function removeItem(index: number) {
		if (items.length > 1) {
			items = items.filter((_, i) => i !== index);
		}
	}

    async function fetchAndUpdatePrice(index: number, productId: string, quantity: number, customerId: string) {
        if (!productId) return;
        try {
            const body: Record<string, unknown> = { productId, quantity };
            if (customerId) {
                body.customerId = customerId;
            } else if (isWalkIn) {
                body.pricingTier = walkInPricingTier;
            }
            const res = await fetch('/api/pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const data = await res.json();
                const newItems = [...items];
                // Only update if it's still the same product at this index
                if (newItems[index].productId === productId) {
                    newItems[index].unitPrice = data.finalUnitPrice;
                    items = newItems;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

	function onProductSelect(index: number, productId: string) {
		const product = data.products.find((p: any) => p.id === productId);
		if (product) {
			const newItems = [...items];
			newItems[index].productId = product.id;
			items = newItems;
            fetchAndUpdatePrice(index, product.id, items[index].quantity, selectedCustomerId);
		}
	}

    function onQuantityChange(index: number) {
        fetchAndUpdatePrice(index, items[index].productId, items[index].quantity, selectedCustomerId);
    }

	// Walk-in mode state
	let isWalkIn = $state(false);
	let savedCustomerId = $state(''); // preserves selection when toggling to walk-in and back
	let walkInPricingTier = $state('RETAIL');
	let walkInPhone = $state('');

	// NOTE: these are PRICING ENGINE tiers, not CRM customer tiers (STANDARD/PREFERRED/VIP).
	// Do NOT "normalise" this to match the CRM enum — they serve different purposes.
	const WALK_IN_TIERS = ['RETAIL', 'WHOLESALE', 'VIP', 'PREFERRED'] as const;

	function switchToWalkIn() {
		savedCustomerId = selectedCustomerId;
		selectedCustomerId = '';
		isWalkIn = true;
	}

	function switchToRegistered() {
		selectedCustomerId = savedCustomerId;
		walkInPhone = '';
		walkInPricingTier = 'RETAIL';
		isWalkIn = false;
	}

    $effect(() => {
        // When customer changes, recalculate all prices.
        // untrack() prevents items reads inside from becoming reactive dependencies —
        // without it, fetchAndUpdatePrice writing back to items would cause an infinite loop.
        if (selectedCustomerId) {
            untrack(() => {
                items.forEach((item, index) => {
                    if (item.productId) {
                        fetchAndUpdatePrice(index, item.productId, item.quantity, selectedCustomerId);
                    }
                });
            });
        }
    });

	$effect(() => {
		// Recalculate when walk-in tier changes.
		// Reading walkInPricingTier here tracks it as a reactive dependency.
		// untrack() prevents items from also becoming a dependency — without it,
		// fetchAndUpdatePrice writing back to items would cause an infinite loop.
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _trackTier = walkInPricingTier;
		if (isWalkIn) {
			untrack(() => {
				items.forEach((item, index) => {
					if (item.productId) {
						fetchAndUpdatePrice(index, item.productId, item.quantity, '');
					}
				});
			});
		}
	});

	function handleSubmit() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.success) {
				goto(`/dashboard/sales/orders/${result.data.orderId}`);
			}
			isSubmitting = false;
			await update();
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
	<!-- Header Section -->
	<header class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-foreground pb-6 gap-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-2 relative z-10 w-full md:w-auto">
			<Button variant="ghost" onclick={() => goto('/dashboard/sales/orders')} class="mb-4 text-muted-foreground hover:text-foreground hover:bg-transparent -ml-4 px-4 font-bold tracking-widest uppercase text-xs h-8">
				<ChevronLeft class="w-4 h-4 mr-2" /> Back to Orders
			</Button>
			<h1 class="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.85]">
				New Order / Quote
			</h1>
		</div>
	</header>

	{#if form?.error}
		<div class="bg-red-500/10 border-l-4 border-red-600 p-4 text-red-600 font-medium">
			{form.error}
		</div>
	{/if}

	<form method="POST" action="?/create" use:enhance={handleSubmit} class="space-y-12">
		<!-- Hidden field for complex items array -->
		<input type="hidden" name="items" value={JSON.stringify(items)} />

		<!-- Section 1: Customer Info -->
		<section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] p-6 md:p-8 relative">
			<h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-6 flex items-center gap-2">
				<User class="w-4 h-4" /> Customer Details
			</h2>

			<!-- Mode toggle -->
			<div class="flex gap-0 mb-6 border-2 border-border w-fit">
				<button
					type="button"
					onclick={switchToRegistered}
					class={cn(
						"px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors",
						!isWalkIn
							? "bg-foreground text-background"
							: "bg-transparent text-muted-foreground hover:text-foreground"
					)}
				>
					Registered
				</button>
				<button
					type="button"
					onclick={switchToWalkIn}
					class={cn(
						"px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors",
						isWalkIn
							? "bg-foreground text-background"
							: "bg-transparent text-muted-foreground hover:text-foreground"
					)}
				>
					Walk-In
				</button>
			</div>

			{#if !isWalkIn}
				<!-- Registered customer combobox (unchanged) -->
				<div class="space-y-2 group">
					<Label for="customerId" class="text-xs font-bold tracking-wider uppercase text-foreground/70 mb-2 block">Select Customer</Label>
					<input type="hidden" name="customerId" value={selectedCustomerId} />
					<Popover.Root bind:open={customerOpen}>
						<Popover.Trigger
							class={cn(
								buttonVariants({ variant: "outline" }),
								"flex h-14 w-full md:w-[400px] justify-between rounded-none border-b-2 border-border/50 border-t-0 border-x-0 bg-muted/20 px-4 text-base font-bold focus:bg-transparent focus:border-primary transition-colors hover:bg-muted/30",
								!selectedCustomerId && "text-muted-foreground"
							)}
							role="combobox"
							aria-expanded={customerOpen}
						>
							<span class="truncate block w-[90%] text-left">
								{getCustomerLabel(selectedCustomerId)}
							</span>
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Popover.Trigger>
						<Popover.Content class="w-[350px] md:w-[400px] p-0 rounded-none border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card" align="start">
							<Command.Root>
								<Command.Input placeholder="Search customers..." class="h-12 border-none font-medium" />
								<Command.List>
									<Command.Empty>No customer found.</Command.Empty>
									<Command.Group>
										{#each data.customers as customer}
											<Command.Item
												value={customer.name + " " + (customer.companyName || '')}
												onSelect={() => {
													selectedCustomerId = customer.id;
													customerOpen = false;
												}}
												class="cursor-pointer py-3"
											>
												<Check
													class={cn(
														"mr-2 h-4 w-4",
														selectedCustomerId === customer.id ? "opacity-100 text-primary" : "opacity-0"
													)}
												/>
												<div class="flex flex-col truncate w-full">
													<span class="font-bold truncate">{customer.name}</span>
													{#if customer.companyName}
														<span class="text-[10px] uppercase font-bold tracking-widest text-muted-foreground truncate">{customer.companyName}</span>
													{/if}
												</div>
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</div>
			{:else}
				<!-- Walk-in mode fields -->
				<input type="hidden" name="isWalkIn" value="true" />
				<div class="flex flex-col md:flex-row gap-6">
					<!-- Tier selector -->
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70 block">Pricing Tier</Label>
						<input type="hidden" name="walkInPricingTier" value={walkInPricingTier} />
						<div class="flex gap-0 border-2 border-border w-fit">
							{#each WALK_IN_TIERS as tier}
								<button
									type="button"
									onclick={() => { walkInPricingTier = tier; }}
									class={cn(
										"px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors border-r last:border-r-0 border-border",
										walkInPricingTier === tier
											? "bg-primary text-primary-foreground"
											: "bg-transparent text-muted-foreground hover:text-foreground"
									)}
								>
									{tier}
								</button>
							{/each}
						</div>
					</div>

					<!-- Optional phone -->
					<div class="space-y-2 flex-1 max-w-xs">
						<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70 block">
							Phone <span class="text-muted-foreground/50 normal-case font-normal">(optional — for future linking)</span>
						</Label>
						<Input
							type="tel"
							name="walkInPhone"
							bind:value={walkInPhone}
							placeholder="+251 9XX XXX XXXX"
							class="h-14 border-t-0 border-x-0 border-b-2 border-border/50 rounded-none bg-muted/20 px-4 font-bold focus-visible:border-primary focus-visible:ring-0"
						/>
					</div>
				</div>
			{/if}
		</section>

		<!-- Section 2: Items -->
		<section class="bg-card border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] p-6 md:p-8 relative">
			<h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-4 mb-6 flex items-center justify-between">
				<span class="flex items-center gap-2"><Box class="w-4 h-4" /> Order Items</span>
				<Button type="button" variant="outline" size="sm" onclick={addItem} class="h-8 rounded-none font-bold tracking-widest uppercase text-[10px] border-foreground hover:bg-foreground hover:text-background transition-colors">
					<PlusCircle class="w-3 h-3 mr-2" /> Add Item
				</Button>
			</h2>

			<div class="space-y-4">
				<div class="hidden md:grid grid-cols-[3fr_1fr_1.5fr_1.5fr_auto] gap-4 mb-2 pb-2 border-b-2 border-border/30 px-2 lg:px-4">
					<span class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Product Profile</span>
					<span class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Qty</span>
					<span class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Unit Price</span>
					<span class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Line Total</span>
					<span class="w-[40px]"></span>
				</div>

				{#each items as item, i}
					<div class="grid grid-cols-1 md:grid-cols-[3fr_1fr_1.5fr_1.5fr_auto] gap-4 items-end md:items-center bg-muted/10 p-4 md:p-2 lg:px-4 border md:border-transparent border-border/40 rounded md:rounded-none group transition-colors hover:bg-muted/20">
						
						<!-- Product Select -->
						<div class="space-y-1.5 md:space-y-0 w-full">
							<Label class="md:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Product</Label>
                            <Popover.Root bind:open={item._isOpen}>
                                <Popover.Trigger
                                    class={cn(
                                        buttonVariants({ variant: "outline" }),
                                        "w-full justify-between h-12 border-b-2 border-border/50 border-t-0 border-x-0 bg-transparent px-2 font-bold focus:border-primary transition-colors hover:bg-muted/10 rounded-none",
                                        !item.productId && "text-muted-foreground"
                                    )}
                                    role="combobox"
                                    aria-expanded={item._isOpen}
                                >
                                    <span class="truncate block w-[90%] text-left">
                                        {getProductLabel(item.productId)}
                                    </span>
                                    <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Popover.Trigger>
                                <Popover.Content class="w-[300px] md:w-[400px] p-0 rounded-none border-2 border-border shadow-[4px_4px_0px_0px_theme(colors.border)] bg-card" align="start">
                                    <Command.Root>
                                        <Command.Input placeholder="Search product..." class="h-12 border-none font-medium" />
                                        <Command.List>
                                            <Command.Empty>No product found.</Command.Empty>
                                            <Command.Group>
                                                {#each data.products as p}
                                                    <Command.Item
                                                        value={p.sku + " " + p.name}
                                                        onSelect={() => {
                                                            onProductSelect(i, p.id);
                                                            item._isOpen = false;
                                                        }}
                                                        class="cursor-pointer py-2"
                                                    >
                                                        <Check
                                                            class={cn(
                                                                "mr-2 h-4 w-4",
                                                                item.productId === p.id ? "opacity-100 text-primary" : "opacity-0"
                                                            )}
                                                        />
                                                        <div class="flex flex-col truncate w-full">
                                                            <span class="font-bold truncate">{p.sku} | {p.name}</span>
                                                        </div>
                                                    </Command.Item>
                                                {/each}
                                            </Command.Group>
                                        </Command.List>
                                    </Command.Root>
                                </Popover.Content>
                            </Popover.Root>
						</div>

						<!-- Quantity -->
						<div class="space-y-1.5 md:space-y-0 w-full">
							<Label class="md:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qty</Label>
							<Input 
								type="number" 
								min="1" 
								step="1"
								bind:value={item.quantity} 
                                oninput={() => onQuantityChange(i)}
								required
								class="h-12 border-t-0 border-x-0 border-b-2 border-border/50 rounded-none bg-transparent px-2 font-mono font-bold focus-visible:border-primary focus-visible:ring-0 text-center md:text-left" 
							/>
						</div>

						<!-- Unit Price -->
						<div class="space-y-1.5 md:space-y-0 w-full">
							<Label class="md:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Unit Price (ETB)</Label>
							<Input 
								type="number" 
								min="0" 
								step="0.01"
								bind:value={item.unitPrice} 
								required
								class="h-12 border-t-0 border-x-0 border-b-2 border-border/50 rounded-none bg-transparent px-2 font-mono font-bold focus-visible:border-primary focus-visible:ring-0 text-right" 
							/>
						</div>

						<!-- Line Total calculation view (not an input) -->
						<div class="w-full text-right py-3 md:py-0 font-mono font-bold text-lg md:text-base border-t border-border/30 md:border-transparent mt-2 md:mt-0 pt-3 md:pt-0 text-primary">
							<span class="md:hidden text-[10px] font-bold uppercase tracking-widest text-muted-foreground float-left mt-1.5">Total</span>
							{formatCurrency(item.quantity * item.unitPrice)}
						</div>

						<!-- Remove Action -->
						<div class="w-full md:w-auto h-full flex items-center justify-end">
							<Button 
								type="button" 
								variant="ghost" 
								size="icon" 
								onclick={() => removeItem(i)} 
								disabled={items.length === 1}
								class="h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full md:rounded-none group-hover:opacity-100 md:opacity-0 transition-opacity"
							>
								<Trash2 class="w-4 h-4 md:w-3 md:h-3" />
							</Button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Totals Section -->
			<div class="mt-8 pt-6 border-t-2 border-border/50 flex flex-col items-end space-y-2">
				<div class="flex justify-between w-full md:w-[300px] text-sm font-bold tracking-widest uppercase text-muted-foreground">
					<span>Subtotal</span>
					<span class="font-mono text-foreground">{formatCurrency(subtotal)}</span>
				</div>
				<div class="flex justify-between w-full md:w-[300px] text-sm font-bold tracking-widest uppercase text-muted-foreground">
					<span>VAT (15%)</span>
					<span class="font-mono text-foreground">{formatCurrency(taxAmount)}</span>
				</div>
				<div class="flex justify-between w-full md:w-[300px] text-2xl md:text-3xl font-black uppercase text-primary border-t-2 border-foreground/10 pt-4 mt-2">
					<span>Total</span>
					<span class="font-mono">{formatCurrency(totalAmount)}</span>
				</div>
			</div>
		</section>

		<!-- Actions -->
		<div class="sticky bottom-0 bg-background/90 backdrop-blur-xl p-4 md:p-6 border-t-2 border-foreground -mx-4 md:mx-0 shadow-[0_-20px_40px_-20px_theme(colors.background)] z-50 flex items-center justify-end gap-4 transform transition-all duration-300">
			<Button type="button" variant="outline" onclick={() => goto('/dashboard/sales/orders')} class="h-14 px-8 rounded-none font-bold uppercase tracking-widest text-xs border-2 border-border hover:bg-muted">
				Cancel
			</Button>
			<Button type="submit" disabled={isSubmitting || items.length === 0 || (!selectedCustomerId && !isWalkIn)} class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary shadow-[6px_6px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
				{#if isSubmitting}
					<span class="animate-pulse">Saving...</span>
				{:else}
					<Save class="w-4 h-4 mr-2" /> Save Order
				{/if}
			</Button>
		</div>
	</form>
</div>
