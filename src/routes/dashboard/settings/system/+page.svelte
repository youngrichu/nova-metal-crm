<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { Settings, DollarSign, Globe, Save, Scan, Printer } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let isSubmitting = $state(false);
	let printerType = $state(data.settings.printer_type ?? 'network');
	let paperWidth = $state(data.settings.paper_width ?? '80');
	let printerAddress = $state(data.settings.printer_address ?? '192.168.1.100');

	// Re-sync printer state from server after form submission (handles failed saves)
	$effect(() => {
		printerType = data.settings.printer_type ?? 'network';
		paperWidth = data.settings.paper_width ?? '80';
		printerAddress = data.settings.printer_address ?? '192.168.1.100';
	});

	function handleEnhance() {
		isSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.success) {
				toast.success('System settings saved');
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
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Settings</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				System<br /><span class="text-muted-foreground/40 italic">Config</span>
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
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<DollarSign class="w-4 h-4 text-primary" /> Pricing Configuration
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="vat_rate" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							VAT Rate (decimal — e.g. 0.15 = 15%)
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
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
					<div class="space-y-2 group">
						<Label for="markup_retail" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Retail Markup Multiplier
						</Label>
						<Input
							id="markup_retail"
							name="markup_retail"
							type="number"
							step="0.01"
							min="1"
							value={data.settings.markup_retail}
							required
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. 1.15 = 15% markup</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_wholesale" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Wholesale Markup Multiplier
						</Label>
						<Input
							id="markup_wholesale"
							name="markup_wholesale"
							type="number"
							step="0.01"
							min="1"
							value={data.settings.markup_wholesale}
							required
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. 1.05 = 5% markup</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_vip" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							VIP Markup Multiplier
						</Label>
						<Input
							id="markup_vip"
							name="markup_vip"
							type="number"
							step="0.01"
							min="1"
							value={data.settings.markup_vip}
							required
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. 1.05 = 5% markup</p>
					</div>
					<div class="space-y-2 group">
						<Label for="markup_preferred" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Preferred Markup Multiplier
						</Label>
						<Input
							id="markup_preferred"
							name="markup_preferred"
							type="number"
							step="0.01"
							min="1"
							value={data.settings.markup_preferred}
							required
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. 1.08 = 8% markup</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Currency Formatting -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Globe class="w-4 h-4 text-primary" /> Currency Formatting
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="currency_code" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Currency Code (ISO 4217)
						</Label>
						<Input
							id="currency_code"
							name="currency_code"
							type="text"
							maxlength={3}
							value={data.settings.currency_code}
							required
							placeholder="ETB"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono uppercase"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. ETB, USD, EUR</p>
					</div>
					<div class="space-y-2 group">
						<Label for="currency_locale" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Locale (BCP 47 tag)
						</Label>
						<Input
							id="currency_locale"
							name="currency_locale"
							type="text"
							value={data.settings.currency_locale}
							required
							placeholder="en-ET"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">e.g. en-ET, en-US, am-ET</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Barcode Features -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Scan class="w-4 h-4 text-primary" /> Barcode Features
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
						<p class="text-sm font-bold tracking-wide">Enable Barcode Features</p>
						<p class="text-xs text-muted-foreground/60 mt-0.5">Shows barcode fields on products and enables the barcode scanner during stock-takes.</p>
					</div>
				</label>
			</div>
		</section>

		<!-- Printer Configuration -->
		<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<Printer class="w-4 h-4 text-primary" /> Thermal Printer
				</h2>
			</div>
			<div class="p-6 md:p-8 space-y-6">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-2 group">
						<Label for="company_name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Company Name
						</Label>
						<Input
							id="company_name"
							name="company_name"
							type="text"
							value={data.settings.company_name}
							placeholder="NOVA METAL PLC"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all"
						/>
						<p class="text-xs text-muted-foreground/60">Printed in the receipt header</p>
					</div>
					<div class="space-y-2 group">
						<Label for="company_address" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Company Address
						</Label>
						<Input
							id="company_address"
							name="company_address"
							type="text"
							value={data.settings.company_address}
							placeholder="Addis Ababa, Ethiopia"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all"
						/>
						<p class="text-xs text-muted-foreground/60">Printed below company name</p>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="space-y-2 group">
						<Label for="printer_type" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Connection Type
						</Label>
						<select
							id="printer_type"
							name="printer_type"
							bind:value={printerType}
							class="w-full h-14 bg-muted/30 border-2 border-transparent focus:bg-transparent focus:border-primary focus:outline-none rounded-lg text-base px-4 transition-all font-mono"
						>
							<option value="network">Network (TCP/IP)</option>
							<option value="usb">USB</option>
						</select>
						<p class="text-xs text-muted-foreground/60">{printerType === 'usb' ? 'Connects via USB — no IP needed' : 'Connects over LAN via TCP port 9100'}</p>
					</div>
					{#if printerType === 'network'}
					<div class="space-y-2 group">
						<Label for="printer_address" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Printer IP Address
						</Label>
						<Input
							id="printer_address"
							name="printer_address"
							type="text"
							bind:value={printerAddress}
							placeholder="192.168.1.100"
							class="h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-lg text-lg px-4 transition-all font-mono"
						/>
						<p class="text-xs text-muted-foreground/60">Default port 9100 — use ip:port to override</p>
					</div>
					{:else}
					<!-- Hidden fallback preserves the user-typed value when USB is selected -->
					<input type="hidden" name="printer_address" value={printerAddress} />
					<div></div>
					{/if}
					<div class="space-y-2 group">
						<Label for="paper_width" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
							Paper Width
						</Label>
						<select
							id="paper_width"
							name="paper_width"
							bind:value={paperWidth}
							class="w-full h-14 bg-muted/30 border-2 border-transparent focus:bg-transparent focus:border-primary focus:outline-none rounded-lg text-base px-4 transition-all font-mono"
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
				class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3"
			>
				<Save class="w-4 h-4" />
				{isSubmitting ? 'Saving...' : 'Save Settings'}
			</Button>
		</div>
	</form>
</div>
