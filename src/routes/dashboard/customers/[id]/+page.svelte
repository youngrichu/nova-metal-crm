<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { ArrowLeft, Edit3, MapPin, Phone, Mail, FileText, ShoppingCart, Calendar, Building2, User, Link } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let customer = $derived(data.customer);
	let orders = $derived(data.orders);
	let pendingWalkInOrders = $derived(data.pendingWalkInOrders);
	let bannerDismissed = $state(false);
	let showBanner = $derived(pendingWalkInOrders.length > 0 && !bannerDismissed);

	function handleLinkOrders() {
		return async ({ result, update }: any) => {
			if (result.type === 'success') {
				await goto(`/dashboard/customers/${data.customer.id}`, { invalidateAll: true });
			}
			await update();
		};
	}

	import * as m from '$lib/paraglide/messages';
</script>

<div class="p-4 md:p-8 max-w-[1400px] mx-auto space-y-12">

	<!-- Top Navigation -->
	<div class="flex items-center justify-between">
		<Button href="/dashboard/customers" variant="ghost" class="gap-2 h-10 px-4 rounded-none uppercase tracking-widest text-xs font-bold hover:bg-foreground hover:text-background transition-colors">
			<ArrowLeft class="w-4 h-4" /> {m.customer_details_back()}
		</Button>

		<div class="flex items-center gap-4">
			<Button class="rounded-none bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs h-10 px-6 hover:opacity-90 transition-opacity">
				<Edit3 class="w-4 h-4 mr-2" /> {m.customer_details_modify()}
			</Button>
		</div>
	</div>

	{#if showBanner}
		<div class="bg-primary/10 border-2 border-primary p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
			<div class="space-y-1">
				<p class="font-black tracking-tight uppercase text-sm flex items-center gap-2">
					<Link class="w-4 h-4" />
					{pendingWalkInOrders.length} walk-in {pendingWalkInOrders.length === 1 ? 'order' : 'orders'} found with this phone number
				</p>
				<p class="text-xs text-muted-foreground">Link them to this customer to see them in the order history.</p>
			</div>
			<div class="flex items-center gap-3 shrink-0">
				<Button
					variant="ghost"
					size="sm"
					onclick={() => { bannerDismissed = true; }}
					class="rounded-none text-xs font-bold uppercase tracking-widest"
				>
					Dismiss
				</Button>
				<form method="POST" action="?/linkOrders" use:enhance={handleLinkOrders}>
					<input type="hidden" name="orderIds" value={JSON.stringify(pendingWalkInOrders.map(o => o.id))} />
					<Button
						type="submit"
						size="sm"
						class="rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary"
					>
						Link Orders
					</Button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Brutalist Identity Header -->
	<div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-end border-b-4 border-foreground pb-8">
		<div class="space-y-4">
			<span class="inline-flex bg-foreground text-background font-black tracking-widest uppercase px-3 py-1 text-[10px]">
				{m.customer_details_id()}: {customer.id.split('-')[0]}
			</span>
			<h1 class="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] break-words">
				{customer.name}
			</h1>
			{#if customer.companyName}
				<p class="text-xl md:text-3xl font-light tracking-tight text-muted-foreground flex items-center gap-3">
					<Building2 class="w-6 h-6 md:w-8 md:h-8" /> {customer.companyName}
				</p>
			{/if}
		</div>

		<div class="bg-muted p-6 border-l-4 border-primary space-y-4 self-stretch flex flex-col justify-end">
			<div class="flex justify-between items-center border-b border-border/50 pb-2">
				<span class="text-[10px] font-bold tracking-widest uppercase text-foreground/50">{m.customer_details_category()}</span>
				<span class="text-sm font-black tracking-widest uppercase mb-1">{customer.customerType}</span>
			</div>
			<div class="flex justify-between items-center border-b border-border/50 pb-2">
				<span class="text-[10px] font-bold tracking-widest uppercase text-foreground/50">{m.customer_details_tier()}</span>
				<span class="text-sm font-black tracking-widest uppercase text-primary mb-1">{customer.pricingTier}</span>
			</div>
			<div class="flex justify-between items-center pb-2">
				<span class="text-[10px] font-bold tracking-widest uppercase text-foreground/50">{m.customer_details_enrolled()}</span>
				<span class="text-sm font-medium font-mono">{new Date(customer.createdAt).toLocaleDateString()}</span>
			</div>
		</div>
	</div>

	<!-- Two-column content layout -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-12">

		<!-- Left Col: Profile Details -->
		<div class="col-span-1 space-y-12">

			<section class="space-y-6">
				<h2 class="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-4">
					<div class="w-8 h-[2px] bg-primary"></div> {m.customer_details_contact()}
				</h2>

				<ul class="space-y-4">
					{#if customer.phone}
						<li class="flex items-start gap-4 p-4 bg-muted/30 border border-border/50 rounded-lg group hover:border-foreground/30 transition-colors">
							<div class="bg-card p-2 rounded shadow-sm">
								<Phone class="w-4 h-4 text-foreground/70" />
							</div>
							<div>
								<span class="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Phone</span>
								<span class="font-mono text-sm group-hover:text-primary transition-colors">{customer.phone}</span>
							</div>
						</li>
					{/if}

					{#if customer.whatsapp}
						<li class="flex items-start gap-4 p-4 bg-muted/30 border border-[var(--color-whatsapp,#25D366)]/20 rounded-lg group hover:border-[var(--color-whatsapp,#25D366)]/60 transition-colors">
							<div class="bg-[#25D366]/10 p-2 rounded shadow-sm">
								<Phone class="w-4 h-4 text-[#25D366]" />
							</div>
							<div>
								<span class="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">WhatsApp</span>
								<span class="font-mono text-sm">{customer.whatsapp}</span>
							</div>
						</li>
					{/if}

					{#if customer.email}
						<li class="flex items-start gap-4 p-4 bg-muted/30 border border-border/50 rounded-lg group hover:border-foreground/30 transition-colors">
							<div class="bg-card p-2 rounded shadow-sm">
								<Mail class="w-4 h-4 text-foreground/70" />
							</div>
							<div>
								<span class="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</span>
								<span class="font-mono text-sm">{customer.email}</span>
							</div>
						</li>
					{/if}

					{#if customer.tinNumber}
						<li class="flex items-start gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
							<div class="bg-primary p-2 rounded shadow-sm">
								<FileText class="w-4 h-4 text-primary-foreground" />
							</div>
							<div>
								<span class="block text-[10px] font-bold uppercase tracking-widest text-primary/80">TIN Number</span>
								<span class="font-mono text-base font-bold select-all">{customer.tinNumber}</span>
							</div>
						</li>
					{/if}

					{#if customer.address}
						<li class="flex items-start gap-4 p-4 bg-muted/30 border border-border/50 rounded-lg">
							<div class="bg-card p-2 rounded shadow-sm mt-1">
								<MapPin class="w-4 h-4 text-foreground/70" />
							</div>
							<div>
								<span class="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Physical Address</span>
								<span class="text-sm font-medium leading-relaxed">{customer.address}</span>
							</div>
						</li>
					{/if}
				</ul>
			</section>

			{#if customer.notes}
				<section class="p-6 bg-[#fcf9f2] dark:bg-zinc-900 border-l-8 border-yellow-500 shadow-sm">
					<h2 class="text-[10px] font-black tracking-widest uppercase text-yellow-600 dark:text-yellow-500 mb-3">Internal Annotations</h2>
					<p class="text-sm font-medium leading-relaxed">{customer.notes}</p>
				</section>
			{/if}
		</div>

		<!-- Right Col: History & Orders -->
		<div class="col-span-1 lg:col-span-2 space-y-12">

			<section class="space-y-6">
				<div class="flex items-center justify-between border-b-2 border-foreground/10 pb-4">
					<h2 class="text-xl font-black tracking-widest uppercase flex items-center gap-3">
						<ShoppingCart class="w-5 h-5" /> {m.customer_ledger_title()}
					</h2>
					<Button variant="outline" class="h-8 rounded-none text-[10px] uppercase font-bold tracking-widest">
						{m.customer_ledger_invoice()}
					</Button>
				</div>

				{#if orders.length > 0}
					<div class="grid grid-cols-1 gap-4">
						{#each orders as order}
							<a href="/dashboard/sales/orders/{order.id}" class="group block bg-card border-2 border-border/50 hover:border-foreground transition-colors p-6 relative overflow-hidden">
								<div class="absolute right-0 top-0 w-2 h-full bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>

								<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
									<div class="space-y-1">
										<div class="flex items-center gap-3">
											<span class="font-black text-lg font-mono">{order.orderNumber}</span>
											<span class="px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-muted text-muted-foreground">
												{order.status}
											</span>
										</div>
										<p class="text-xs text-muted-foreground flex items-center gap-2">
											<Calendar class="w-3 h-3" /> {new Date(order.createdAt).toLocaleString()}
										</p>
									</div>

									<div class="flex items-center gap-8">
										<div class="text-right">
											<span class="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.customer_ledger_total()}</span>
											<span class="font-black text-primary text-xl tracking-tight">ETB {Number(order.totalAmount).toLocaleString()}</span>
										</div>
										<div class="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
											<ArrowLeft class="w-3 h-3 rotate-180" />
										</div>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<div class="p-16 border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-center space-y-4">
						<div class="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center rotate-12">
							<ShoppingCart class="w-8 h-8 text-muted-foreground/50 opacity-50" />
						</div>
						<div>
							<h3 class="font-black tracking-widest uppercase text-lg">{m.customer_ledger_empty()}</h3>
							<p class="text-sm text-muted-foreground opacity-70 mt-1">{m.customer_ledger_empty_desc()}</p>
						</div>
					</div>
				{/if}
			</section>

		</div>
	</div>

</div>
