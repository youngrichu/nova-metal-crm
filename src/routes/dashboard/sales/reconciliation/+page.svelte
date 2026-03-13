<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { formatCurrency } from '$lib/utils/currency';
	import { Calculator, CheckCircle2, AlertCircle, History } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let actualCashStr = $state('');
	let actualCash = $derived(Number(actualCashStr) || 0);
	let expectedCash = $derived(data.expectedCash);
	let discrepancy = $derived(actualCash - expectedCash);

	let isSubmitting = $state(false);

	function getDiscrepancyColor(amount: number) {
		if (amount === 0) return 'text-emerald-500';
		if (amount > 0) return 'text-amber-500';
		return 'text-rose-500';
	}
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-12">
	<!-- Avant-Garde Header -->
	<header class="flex justify-between items-end border-b-2 border-foreground pb-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-4 relative w-full">
			<div class="flex items-center gap-3 mb-2">
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">End of Day</span>
				<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{new Date().toLocaleDateString()}</span>
			</div>
			<div class="flex justify-between items-end">
				<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8] mb-1">
					Cash<br/><span class="text-muted-foreground">Reconciliation</span>
				</h1>
				<Calculator class="w-16 h-16 text-foreground/10 absolute right-0 top-0 hidden md:block" />
			</div>
		</div>
	</header>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Submission Form -->
		<section class="border-2 border-foreground/10 bg-card p-0 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30 flex justify-between items-center">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<CheckCircle2 class="w-4 h-4 text-primary" /> Today's Balance
				</h2>
			</div>

			<form method="POST" action="?/reconcile" 
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success('Reconciliation saved successfully!');
							actualCashStr = '';
						} else if (result.type === 'failure') {
							toast.error(result.data?.error || 'Failed to save');
						}
						update();
					};
				}} 
				class="p-6 md:p-8 space-y-8"
			>
				<input type="hidden" name="expectedCash" value={expectedCash} />

				<!-- Expected Cash Display -->
				<div class="p-6 bg-slate-900 border-2 border-slate-900 text-slate-100 relative overflow-hidden group">
					<div class="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-700"></div>
					<Label class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">System Expected Cash</Label>
					<p class="text-4xl font-mono font-black">{formatCurrency(expectedCash)}</p>
					<p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">from today's payments</p>
				</div>

				<!-- Actual Cash Input -->
				<div class="space-y-3">
					<Label for="actualCash" class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Actual Cash In Register</Label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-muted-foreground">ETB</span>
						<Input 
							type="number" 
							id="actualCash" 
							name="actualCash" 
							bind:value={actualCashStr} 
							required 
							step="0.01" 
							min="0"
							placeholder="0.00"
							class="pl-14 h-16 border-2 border-foreground/20 rounded-none bg-background text-2xl font-mono font-black focus-visible:border-primary focus-visible:ring-0 shadow-inner" 
						/>
					</div>
				</div>

				<!-- Discrepancy Display -->
				<div class="space-y-3">
					<Label class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Variance</Label>
					<div class="h-16 flex items-center justify-between border-2 border-dashed border-border/50 px-4 bg-muted/20">
						<span class="font-mono font-black text-2xl {getDiscrepancyColor(discrepancy)}">
							{discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
						</span>
						{#if discrepancy === 0 && actualCashStr !== ''}
							<span class="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1">Balanced</span>
						{:else if actualCashStr !== ''}
							<span class="text-[10px] font-bold uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 flex items-center gap-1">
								<AlertCircle class="w-3 h-3" /> Imbalance
							</span>
						{/if}
					</div>
				</div>

				<!-- Notes Input -->
				<div class="space-y-3">
					<Label for="notes" class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes (Required if variance > 0)</Label>
					<Textarea 
						id="notes" 
						name="notes" 
						required={discrepancy !== 0}
						class="min-h-[100px] border-2 border-foreground/20 rounded-none bg-background focus-visible:border-primary focus-visible:ring-0 resize-none rounded-none" 
						placeholder="Explain any discrepancies here..." 
					/>
				</div>

				<Button 
					type="submit" 
					disabled={isSubmitting || actualCashStr === ''} 
					class="w-full h-14 rounded-none bg-foreground text-background font-bold uppercase tracking-widest text-sm hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50"
				>
					{isSubmitting ? 'Recording...' : 'Record End of Day Balance'}
				</Button>
			</form>
		</section>

		<!-- History Panel -->
		<section class="border-2 border-foreground/10 bg-card p-0 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] flex flex-col min-h-[500px]">
			<div class="p-6 border-b-2 border-foreground/10 bg-muted/30 flex justify-between items-center">
				<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
					<History class="w-4 h-4 text-foreground/50" /> Recent Ledgers
				</h2>
			</div>

			<div class="p-6 flex-1 overflow-y-auto w-full">
				{#if data.history.length === 0}
					<div class="h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-4 border-2 border-dashed border-border/50 p-8">
						<History class="w-12 h-12 opacity-20" />
						<p class="text-xs font-bold uppercase tracking-widest text-center">No reconciliation history found</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.history as entry}
							<div class="p-4 border border-border/50 hover:bg-muted/30 transition-colors group">
								<div class="flex justify-between items-start mb-2">
									<div>
										<p class="text-sm font-bold text-foreground">{new Date(entry.date).toLocaleDateString()}</p>
										<p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">by {entry.user?.name || 'Unknown'}</p>
									</div>
									<div class="text-right">
										<p class="font-mono font-black text-sm {getDiscrepancyColor(Number(entry.discrepancyAmount))}">
											{Number(entry.discrepancyAmount) > 0 ? '+' : ''}{formatCurrency(Number(entry.discrepancyAmount))} var
										</p>
									</div>
								</div>
								<div class="flex justify-between items-center text-xs font-mono text-muted-foreground border-t border-border/30 pt-2 mt-2">
									<span>Exp: {formatCurrency(Number(entry.expectedAmount))}</span>
									<span>Act: {formatCurrency(Number(entry.actualAmount))}</span>
								</div>
								{#if entry.notes}
									<p class="text-xs italic text-muted-foreground/70 mt-2 bg-muted/50 p-2 border-l-2 border-foreground/20">"{entry.notes}"</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</section>
	</div>
</div>
