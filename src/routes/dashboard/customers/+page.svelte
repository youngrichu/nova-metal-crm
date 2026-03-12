<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { enhance } from '$app/forms';
	import { Trash2, Box, ChevronDown, Pencil, Building2, User, Phone, Mail, MessageCircle, FileText } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';
	
	let { data, form } = $props();
	
	let isCreateOpen = $state(false);
	let isEditOpen = $state(false);
	let isSubmitting = $state(false);
	let editingCustomer = $state<any>(null);

	function openEdit(customer: any) {
		editingCustomer = customer;
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
	
	<!-- Header Section (Avant-Garde Style) -->
	<header class="flex flex-col md:flex-row justify-between items-end border-b-2 border-foreground pb-6 gap-6">
		<div class="space-y-2 relative">
			<div class="absolute -left-6 top-2 w-2 h-12 bg-primary transform -skew-x-12 hidden md:block"></div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
				{@html m.customer_list_title().replace(' ', '<br/><span class="text-muted-foreground/40 italic">')}
			</h1>
			<p class="text-sm font-medium tracking-widest uppercase text-primary/80 pt-2 ml-1">
				{data.customers.length} {m.customer_list_enrolled()}
			</p>
		</div>
		
		<div class="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
			<!-- Advanced search input -->
			<form method="GET" class="relative group flex-1 md:flex-none">
				{@render SearchIcon({ class: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" })}
				<Input 
					name="q" 
					placeholder={m.customer_search()}
					class="w-full md:w-[280px] h-12 pl-10 rounded-none border-x-0 border-t-0 border-b-2 border-foreground/20 bg-transparent shadow-none text-base focus-visible:ring-0 focus-visible:border-foreground transition-all duration-300 placeholder:text-muted-foreground/50"
				/>
			</form>

			<Sheet.Root bind:open={isCreateOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="h-12 px-8 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-xs hover:bg-primary hover:text-primary-foreground transition-colors shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] relative">
							{m.customer_add_btn()}
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
					<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
						<!-- Decorative background -->
						<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
						<div class="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
						
						<Sheet.Header class="relative z-10">
							<span class="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">New Registration</span>
							<Sheet.Title class="text-4xl font-black tracking-tight uppercase">{m.customer_add_title()}</Sheet.Title>
							<Sheet.Description class="text-base font-medium opacity-70 mt-2">
								{m.customer_add_desc()}
							</Sheet.Description>
						</Sheet.Header>
					</div>

					<form method="POST" action="?/create" use:enhance={makeEnhance('create')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background relative z-10">
						<div class="space-y-10">
							{#if form?.error}
								<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in slide-in-from-top-2">
									<p>{form.error}</p>
								</div>
							{/if}

							<!-- Core Identity -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_core_id()}</h3>
								
								<div class="grid grid-cols-1 gap-6">
									<div class="space-y-2 group">
										<Label for="name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors flex items-center gap-2">
											<User class="w-3.5 h-3.5" /> {m.customer_name()}
										</Label>
										<Input id="name" name="name" required class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all" />
									</div>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="companyName" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
											<Building2 class="w-3.5 h-3.5" /> {m.customer_org()}
										</Label>
										<Input id="companyName" name="companyName" class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg" />
									</div>
									<div class="space-y-2 group">
										<Label for="tinNumber" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
											<FileText class="w-3.5 h-3.5" /> {m.customer_tin()}
										</Label>
										<Input id="tinNumber" name="tinNumber" class="h-12 font-mono bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg" />
									</div>
								</div>
							</div>

							<!-- Segmentation -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_segment()}</h3>
								
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2">
										<Label for="customerType" class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.customer_type()}</Label>
										<select id="customerType" name="customerType" class="flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors">
											<option value="INDIVIDUAL">{m.customer_type_individual()}</option>
											<option value="WORKSHOP">{m.customer_type_workshop()}</option>
											<option value="ENTERPRISE">{m.customer_type_enterprise()}</option>
										</select>
									</div>
									<div class="space-y-2">
										<Label for="pricingTier" class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.customer_tier()}</Label>
										<select id="pricingTier" name="pricingTier" class="flex h-12 w-full items-center justify-between rounded-lg border-2 border-transparent bg-muted/30 px-4 text-sm focus:bg-transparent focus:border-primary focus:outline-none transition-colors">
											<option value="STANDARD">{m.customer_tier_std()}</option>
											<option value="PREFERRED">{m.customer_tier_pref()}</option>
											<option value="VIP">{m.customer_tier_vip()}</option>
										</select>
									</div>
								</div>
							</div>

							<!-- Communications -->
							<div class="space-y-6">
								<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_comm()}</h3>
								
								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-2 group">
										<Label for="phone" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
											<Phone class="w-3.5 h-3.5" /> {m.customer_phone()}
										</Label>
										<Input id="phone" type="tel" name="phone" placeholder="+251..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg font-mono" />
									</div>
									<div class="space-y-2 group">
										<Label for="whatsapp" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-[var(--color-whatsapp,#25D366)] flex items-center gap-2">
											<MessageCircle class="w-3.5 h-3.5" /> {m.customer_whatsapp()}
										</Label>
										<Input id="whatsapp" type="tel" name="whatsapp" placeholder="+251..." class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-[var(--color-whatsapp,#25D366)] focus-visible:ring-0 rounded-lg font-mono" />
									</div>
								</div>
								
								<div class="space-y-2 group">
									<Label for="notes" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">{m.customer_notes()}</Label>
									<Input id="notes" name="notes" placeholder="" class="h-12 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg" />
								</div>
							</div>
						</div>

						<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
							<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
								{isSubmitting ? '...' : m.customer_submit()}
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
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60">{m.customer_table_id()}</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden md:table-cell">{m.customer_table_contact()}</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 hidden lg:table-cell">{m.customer_table_class()}</Table.Head>
					<Table.Head class="h-14 px-6 text-[10px] font-bold uppercase tracking-widest text-foreground/60 text-right">{m.customer_table_tin()}</Table.Head>
					<Table.Head class="w-[80px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.customers as customer}
					<Table.Row class="group hover:bg-muted/30 transition-colors border-b border-border/50">
						<Table.Cell class="px-6 py-4">
							<div class="flex flex-col">
								<a href="/dashboard/customers/{customer.id}" class="font-bold text-lg tracking-tight group-hover:text-primary transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
									{customer.name}
								</a>
								{#if customer.companyName}
									<span class="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1.5 mt-1">
										<Building2 class="w-3 h-3" /> {customer.companyName}
									</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden md:table-cell">
							<div class="flex flex-col gap-1.5">
								{#if customer.phone}
									<span class="text-sm font-mono flex items-center gap-2 text-foreground/80">
										<Phone class="w-3 h-3 opacity-50" /> {customer.phone}
									</span>
								{:else}
									<span class="text-xs text-muted-foreground/40 italic">—</span>
								{/if}
								{#if customer.whatsapp}
									<span class="text-xs font-mono flex items-center gap-2 text-[var(--color-whatsapp,#25D366)]">
										<MessageCircle class="w-3 h-3" /> {customer.whatsapp}
									</span>
								{/if}
							</div>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 hidden lg:table-cell space-y-2">
							<div>
								<span class="inline-flex items-center justify-center rounded-none bg-foreground text-background px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase">
									{customer.customerType}
								</span>
							</div>
							<div>
								<span class="inline-flex items-center justify-center rounded-none border border-foreground/20 px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase text-foreground/70">
									{customer.pricingTier} Tier
								</span>
							</div>
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-right">
							{#if customer.tinNumber}
								<span class="font-mono text-sm font-medium bg-muted px-2 py-1 rounded select-all border border-border/50">{customer.tinNumber}</span>
							{:else}
								<span class="text-muted-foreground/40 text-sm">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell class="px-6 py-4 text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="ghost" size="icon" class="h-8 w-8 rounded-none border border-transparent hover:border-foreground/20 group/btn">
											<ChevronDown class="h-4 w-4 opacity-50 group-hover/btn:opacity-100" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end" class="w-48 rounded-none border-2 border-foreground/10 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] p-2">
									<DropdownMenu.Item onSelect={() => openEdit(customer)} class="text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 hover:bg-muted focus:bg-muted mb-1">
										<Pencil class="mr-3 h-4 w-4" /> {m.customer_edit_title()}
									</DropdownMenu.Item>
									<DropdownMenu.Separator class="bg-border/50 -mx-2 my-2" />
									<form method="POST" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={customer.id} />
										<button type="submit" class="w-full flex items-center text-xs font-bold uppercase tracking-wider cursor-pointer h-10 px-3 text-red-600 hover:bg-red-50 focus:bg-red-50 outline-none text-left">
											<Trash2 class="mr-3 h-4 w-4" /> {m.customer_terminate()}
										</button>
									</form>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-64 text-center align-middle">
							<div class="flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
								<Box class="w-12 h-12 opacity-20" />
								<p class="text-lg font-light tracking-widest uppercase">{m.customer_empty()}</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
		
	</div>
</div>

<!-- Edit Sheet -->
<Sheet.Root bind:open={isEditOpen}>
	<Sheet.Content class="sm:max-w-[700px] overflow-y-auto flex flex-col h-full border-l-[8px] border-primary shadow-2xl p-0">
		{#if editingCustomer}
			<div class="bg-muted px-10 py-12 border-b border-border relative overflow-hidden">
				<div class="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
				
				<Sheet.Header class="relative z-10">
					<span class="inline-block px-3 py-1 bg-foreground text-background text-[10px] font-bold tracking-widest uppercase mb-4 w-fit">{m.customer_edit_title()}</span>
					<Sheet.Title class="text-4xl font-black tracking-tight uppercase line-clamp-1">{editingCustomer.name}</Sheet.Title>
					<Sheet.Description class="text-base font-medium opacity-70 mt-2">
						ID: <span class="font-mono text-xs">{editingCustomer.id}</span>
					</Sheet.Description>
				</Sheet.Header>
			</div>

			<form method="POST" action="?/update" use:enhance={makeEnhance('edit')} class="flex-1 flex flex-col justify-between px-10 py-8 bg-background relative z-10">
				<input type="hidden" name="id" value={editingCustomer.id} />
				<div class="space-y-10">
					{#if form?.error}
						<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600 shadow-sm animate-in fade-in">
							<p>{form.error}</p>
						</div>
					{/if}

					<!-- Edit Identity -->
					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_core_id()}</h3>
						
						<div class="grid grid-cols-1 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors flex items-center gap-2">
									<User class="w-3.5 h-3.5" /> {m.customer_name()}
								</Label>
								<Input id="edit-name" name="name" value={editingCustomer.name} required class="h-14 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none text-lg px-0 transition-all font-bold" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-companyName" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
									<Building2 class="w-3.5 h-3.5" /> {m.customer_org()}
								</Label>
								<Input id="edit-companyName" name="companyName" value={editingCustomer.companyName || ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
							<div class="space-y-2 group">
								<Label for="edit-tinNumber" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
									<FileText class="w-3.5 h-3.5" /> {m.customer_tin()}
								</Label>
								<Input id="edit-tinNumber" name="tinNumber" value={editingCustomer.tinNumber || ''} class="h-12 font-mono bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
							</div>
						</div>
					</div>

					<!-- Edit Segmentation -->
					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_segment()}</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2">
								<Label for="edit-customerType" class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.customer_type()}</Label>
								<select id="edit-customerType" name="customerType" class="flex h-12 w-full items-center justify-between rounded-none border-t-0 border-x-0 border-b-2 border-border/50 bg-transparent px-0 text-sm focus:border-primary focus:outline-none transition-colors">
									<option value="INDIVIDUAL" selected={editingCustomer.customerType === 'INDIVIDUAL'}>{m.customer_type_individual()}</option>
									<option value="WORKSHOP" selected={editingCustomer.customerType === 'WORKSHOP'}>{m.customer_type_workshop()}</option>
									<option value="ENTERPRISE" selected={editingCustomer.customerType === 'ENTERPRISE'}>{m.customer_type_enterprise()}</option>
								</select>
							</div>
							<div class="space-y-2">
								<Label for="edit-pricingTier" class="text-xs font-bold tracking-wider uppercase text-foreground/70">{m.customer_tier()}</Label>
								<select id="edit-pricingTier" name="pricingTier" class="flex h-12 w-full items-center justify-between rounded-none border-t-0 border-x-0 border-b-2 border-border/50 bg-transparent px-0 text-sm focus:border-primary focus:outline-none transition-colors">
									<option value="STANDARD" selected={editingCustomer.pricingTier === 'STANDARD'}>{m.customer_tier_std()}</option>
									<option value="PREFERRED" selected={editingCustomer.pricingTier === 'PREFERRED'}>{m.customer_tier_pref()}</option>
									<option value="VIP" selected={editingCustomer.pricingTier === 'VIP'}>{m.customer_tier_vip()}</option>
								</select>
							</div>
						</div>
					</div>

					<!-- Edit Communications -->
					<div class="space-y-6">
						<h3 class="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border/50 pb-2">{m.customer_comm()}</h3>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2 group">
								<Label for="edit-phone" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary flex items-center gap-2">
									<Phone class="w-3.5 h-3.5" /> {m.customer_phone()}
								</Label>
								<Input id="edit-phone" type="tel" name="phone" value={editingCustomer.phone || ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none font-mono px-0" />
							</div>
							<div class="space-y-2 group">
								<Label for="edit-whatsapp" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-[var(--color-whatsapp,#25D366)] flex items-center gap-2">
									<MessageCircle class="w-3.5 h-3.5" /> {m.customer_whatsapp()}
								</Label>
								<Input id="edit-whatsapp" type="tel" name="whatsapp" value={editingCustomer.whatsapp || ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-[var(--color-whatsapp,#25D366)] focus-visible:ring-0 rounded-none font-mono px-0" />
							</div>
						</div>
						
						<div class="space-y-2 group">
							<Label for="edit-notes" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary">{m.customer_notes()}</Label>
							<Input id="edit-notes" name="notes" value={editingCustomer.notes || ''} class="h-12 bg-transparent border-t-0 border-x-0 border-b-2 border-border/50 focus-visible:border-primary focus-visible:ring-0 rounded-none px-0" />
						</div>
					</div>
				</div>

				<div class="pt-10 mt-10 sticky bottom-0 bg-background/90 backdrop-blur-xl">
					<Button type="submit" class="w-full h-16 rounded-none text-lg font-bold tracking-widest uppercase transition-all bg-foreground text-background hover:bg-primary shadow-[8px_8px_0px_0px_theme(colors.muted.DEFAULT)] hover:shadow-none hover:translate-x-[8px] hover:translate-y-[8px]" disabled={isSubmitting}>
						{isSubmitting ? '...' : m.customer_edit_save()}
					</Button>
				</div>
			</form>
		{/if}
	</Sheet.Content>
</Sheet.Root>

{#snippet SearchIcon(props: any)}
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" {...props}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
{/snippet}
