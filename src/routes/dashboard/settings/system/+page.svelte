<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { Settings, DollarSign, Globe, Save, Scan, Printer } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let { data, form } = $props();

	let isSubmitting = $state(false);
	let printerType = $state('network');
	let paperWidth = $state('80');
	let printerAddress = $state('192.168.1.100');
	let companyName = $state('NOVA METAL PLC');
	let companyAddress = $state('Addis Ababa, Ethiopia');

	// Re-sync only when the specific printer keys change on the server (e.g. after a failed save)
	$effect(() => {
		const { printer_type, paper_width, printer_address, company_name, company_address } = data.settings;
		printerType = printer_type ?? 'network';
		paperWidth = paper_width ?? '80';
		printerAddress = printer_address ?? '192.168.1.100';
		companyName = company_name ?? 'NOVA METAL PLC';
		companyAddress = company_address ?? 'Addis Ababa, Ethiopia';
	});

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.success) {
				toast.success(m.system_saved());
			} else if (result.data?.error) {
				toast.error(result.data.error);
			}
			isSubmitting = false;
			await update();
		};
	}
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-12">
	<header class="flex justify-between items-end border-b-2 border-foreground pb-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-4 relative w-full">
			<div class="flex items-center gap-3 mb-2">
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">{m.system_badge()}</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				{m.system_title_line1()}<br /><span class="text-muted-foreground/40 italic">{m.system_title_line2()}</span>
			</h1>
		</div>
	</header>

	<form method="POST" action="?/update" use:enhance={handleEnhance} class="space-y-12">
		{#if form?.error}
			<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600">
				{form.error}
			</div>
		{/if}

		<!-- Pricing Configuration -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_--theme(--color-foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<DollarSign class="w-4 h-4 text-primary" /> {m.system_pricing_section()}
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="vat_rate" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_vat_rate()}
						</Label>
						<Input
							id="vat_rate"
							name="vat_rate"
							type="number"
							step="0.01"
							min="0"
							max="1"
							value={data.settings.vat_rate}
							required
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="space-y-2 group">
						<Label for="markup_retail" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_markup_retail()}
						</Label>
						<Input
							id="markup_retail"
							name="markup_retail"
							type="number"
							step="0.1"
							min="0"
							value={data.settings.markup_retail}
							required
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_markup_hint_retail()}</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_wholesale" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_markup_wholesale()}
						</Label>
						<Input
							id="markup_wholesale"
							name="markup_wholesale"
							type="number"
							step="0.1"
							min="0"
							value={data.settings.markup_wholesale}
							required
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_markup_hint_wholesale()}</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_vip" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_markup_vip()}
						</Label>
						<Input
							id="markup_vip"
							name="markup_vip"
							type="number"
							step="0.1"
							min="0"
							value={data.settings.markup_vip}
							required
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_markup_hint_vip()}</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_preferred" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_markup_preferred()}
						</Label>
						<Input
							id="markup_preferred"
							name="markup_preferred"
							type="number"
							step="0.1"
							min="0"
							value={data.settings.markup_preferred}
							required
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_markup_hint_preferred()}</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Currency Formatting -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_--theme(--color-foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Globe class="w-4 h-4 text-primary" /> {m.system_currency_section()}
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="currency_code" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_currency_code()}
						</Label>
						<Input
							id="currency_code"
							name="currency_code"
							type="text"
							maxlength={3}
							value={data.settings.currency_code}
							required
							placeholder="ETB"
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono uppercase"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_currency_code_hint()}</p>
					</div>
					<div class="space-y-2 group">
						<Label for="currency_locale" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_currency_locale()}
						</Label>
						<Input
							id="currency_locale"
							name="currency_locale"
							type="text"
							value={data.settings.currency_locale}
							required
							placeholder="en-ET"
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_currency_locale_hint()}</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Barcode Features -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_--theme(--color-foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Scan class="w-4 h-4 text-primary" /> {m.system_barcode_section()}
				</h2>
			</div>
			<div class="p-6 md:p-8">
				<label class="flex items-start gap-4 cursor-pointer group">
					<div class="relative mt-0.5">
						<input
							type="checkbox"
							name="barcode_enabled"
							value="true"
							checked={data.settings.barcode_enabled === 'true'}
							class="sr-only peer"
						/>
						<div class="w-5 h-5 border-2 border-foreground/30 bg-muted/30 peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
							<svg class="w-3 h-3 text-primary-foreground transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						</div>
					</div>
					<input type="hidden" name="barcode_enabled" value="false" />
					<div>
						<p class="text-sm font-bold tracking-wide">{m.system_barcode_enable()}</p>
						<p class="text-xs text-muted-foreground/60 mt-0.5">{m.system_barcode_hint()}</p>
					</div>
				</label>
			</div>
		</section>

		<!-- Printer Configuration -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_--theme(--color-foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Printer class="w-4 h-4 text-primary" /> {m.system_printer_section()}
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="company_name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_company_name()}
						</Label>
						<Input
							id="company_name"
							name="company_name"
							type="text"
							bind:value={companyName}
							maxlength={100}
							placeholder="NOVA METAL PLC"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-base px-4 transition-all"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_company_name_hint()}</p>
					</div>
					<div class="space-y-2 group">
						<Label for="company_address" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_company_address()}
						</Label>
						<Input
							id="company_address"
							name="company_address"
							type="text"
							bind:value={companyAddress}
							maxlength={200}
							placeholder="Addis Ababa, Ethiopia"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-base px-4 transition-all"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_company_address_hint()}</p>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="space-y-2 group">
						<Label for="printer_type" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_connection_type()}
						</Label>
						<select
							id="printer_type"
							name="printer_type"
							bind:value={printerType}
							class="w-full h-14 bg-muted/30 border-2 border-transparent focus:bg-transparent focus:border-primary focus:outline-none rounded-none text-base px-4 transition-all font-mono"
						>
							<option value="network">{m.system_connection_network()}</option>
							<option value="usb">{m.system_connection_usb()}</option>
						</select>
						<p class="text-xs text-muted-foreground/60">{printerType === 'usb' ? m.system_connection_hint_usb() : m.system_connection_hint_network()}</p>
					</div>
					{#if printerType === 'network'}
					<div class="space-y-2 group">
						<Label for="printer_address" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_printer_ip()}
						</Label>
						<Input
							id="printer_address"
							name="printer_address"
							type="text"
							bind:value={printerAddress}
							placeholder="192.168.1.100"
							class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm sm:text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">{m.system_printer_ip_hint()}</p>
					</div>
					{:else}
					<!-- Hidden fallback preserves the user-typed value when USB is selected -->
					<input type="hidden" name="printer_address" value={printerAddress} />
					<div></div>
					{/if}
					<div class="space-y-2 group">
						<Label for="paper_width" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							{m.system_paper_width()}
						</Label>
						<select
							id="paper_width"
							name="paper_width"
							bind:value={paperWidth}
							class="w-full h-14 bg-muted/30 border-2 border-transparent focus:bg-transparent focus:border-primary focus:outline-none rounded-none text-base px-4 transition-all font-mono"
						>
							<option value="80">80mm</option>
							<option value="58">58mm</option>
						</select>
					</div>
				</div>
			</div>
		</section>

		<div class="flex justify-end">
			<Button
				type="submit"
				disabled={isSubmitting}
				class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_var(--color-primary)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3"
			>
				<Save class="w-4 h-4" />
				{isSubmitting ? m.saving() : m.system_save()}
			</Button>
		</div>
	</form>
</div>
