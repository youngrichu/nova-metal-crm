<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Database, Download, Shield, HardDrive, Clock, RefreshCw, Zap } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let isDownloading = $state(false);

	type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'updating';

	let updateStatus = $state<UpdateStatus>('idle');
	let updateInfo = $state<{ currentVersion: string; latestVersion: string; changelog: string } | null>(null);

	async function handleCheckUpdate() {
		updateStatus = 'checking';
		try {
			const res = await fetch('/api/update/check');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body.message ?? 'Could not reach update server. Check your internet connection.');
				updateStatus = 'idle';
				return;
			}
			const data = await res.json();
			updateInfo = { currentVersion: data.currentVersion, latestVersion: data.latestVersion, changelog: data.changelog };
			updateStatus = data.hasUpdate ? 'update-available' : 'up-to-date';
		} catch {
			toast.error('Could not reach update server. Check your internet connection.');
			updateStatus = 'idle';
		}
	}

	async function handleTriggerUpdate() {
		updateStatus = 'updating';
		try {
			const res = await fetch('/api/update/trigger', { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body.message ?? 'Failed to trigger update');
				updateStatus = 'update-available';
				return;
			}
			toast.success('Update triggered — the app will restart in ~30 seconds.');
		} catch {
			toast.error('Could not reach Watchtower. Is it running?');
			updateStatus = 'update-available';
		}
	}

	async function handleExport() {
		isDownloading = true;
		try {
			const res = await fetch('/api/backup');
			if (!res.ok) {
				let msg = `Server error ${res.status}`;
				try { const body = await res.json(); msg = body.message ?? msg; } catch { /* use status */ }
				toast.error(msg);
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `nova_backup_${new Date().toISOString().split('T')[0]}.sql.gz`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('Backup exported successfully');
		} catch (e) {
			toast.error('Export failed: network error');
		} finally {
			isDownloading = false;
		}
	}
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-12">
	<header class="flex justify-between items-end border-b-2 border-foreground pb-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-4 relative w-full">
			<div class="flex items-center gap-3 mb-2">
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Admin</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				Backup<br /><span class="text-muted-foreground/40 italic">& Export</span>
			</h1>
		</div>
	</header>

	<!-- Database Export Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Database class="w-4 h-4 text-primary" /> Database Export
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<p class="text-sm text-muted-foreground leading-relaxed">
				Export a full snapshot of all data as a compressed SQL file.
			</p>

			<div class="flex items-start gap-3 p-4 bg-amber-500/5 border-l-4 border-amber-500/40">
				<Shield class="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
				<p class="text-xs font-medium text-foreground/70">
					This feature is restricted to administrators.
				</p>
			</div>

			<div>
				<Button
					onclick={handleExport}
					disabled={isDownloading}
					class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3"
				>
					<Download class="w-4 h-4" />
					{isDownloading ? 'Exporting...' : 'Export Full Data Package'}
				</Button>
			</div>
		</div>
	</section>

	<!-- Backup Information Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<HardDrive class="w-4 h-4 text-primary" /> Backup Information
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<HardDrive class="w-3.5 h-3.5" /> Backup Script
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						scripts/backup.sh
					</div>
					<p class="text-xs text-muted-foreground/60">Shell script for automated backups via cron or Docker</p>
				</div>

				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<Clock class="w-3.5 h-3.5" /> Scheduled Backups
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						Daily (configurable)
					</div>
					<p class="text-xs text-muted-foreground/60">Configure via cron or container orchestration. Backups older than 30 days are pruned automatically.</p>
				</div>

				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<Database class="w-3.5 h-3.5" /> Estimated Size
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						Varies (gzip compressed)
					</div>
					<p class="text-xs text-muted-foreground/60">Compressed SQL dump of the full database. Size depends on data volume.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- System Updates Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Zap class="w-4 h-4 text-primary" /> System Updates
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<p class="text-sm text-muted-foreground leading-relaxed">
				Connect to the internet and check for available application updates. When an update is ready, clicking <strong>Update Now</strong> will pull the latest version and restart the app automatically.
			</p>

			<!-- Version status display -->
			<div class="flex flex-wrap items-center gap-3">
				{#if updateInfo}
					<div class="flex items-center gap-2 font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						Current: <span class="font-bold">v{updateInfo.currentVersion}</span>
					</div>
					{#if updateStatus === 'up-to-date'}
						<span class="inline-block px-2 py-0.5 bg-green-500 text-white text-[10px] font-black tracking-widest uppercase">
							Up to date
						</span>
					{:else if updateStatus === 'update-available' || updateStatus === 'updating'}
						<span class="inline-block px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black tracking-widest uppercase">
							v{updateInfo.latestVersion} available
						</span>
					{/if}
				{/if}
			</div>

			<!-- Changelog -->
			{#if updateStatus === 'update-available' || updateStatus === 'updating'}
				<div class="bg-muted/40 border-l-4 border-primary/40 p-4 space-y-1">
					<p class="text-xs font-bold tracking-widest uppercase text-foreground/50">What's new in v{updateInfo?.latestVersion}</p>
					<p class="text-sm text-foreground/80">{updateInfo?.changelog}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex flex-wrap gap-4">
				<Button
					onclick={handleCheckUpdate}
					disabled={updateStatus === 'checking' || updateStatus === 'updating'}
					variant="outline"
					class="h-14 px-12 rounded-none border-2 border-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-all flex items-center gap-3 disabled:opacity-50"
				>
					<RefreshCw class="w-4 h-4 {updateStatus === 'checking' ? 'animate-spin' : ''}" />
					{updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}
				</Button>

				{#if updateStatus === 'update-available' || updateStatus === 'updating'}
					<Button
						onclick={handleTriggerUpdate}
						disabled={updateStatus === 'updating'}
						class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
					>
						<Zap class="w-4 h-4" />
						{updateStatus === 'updating' ? 'Updating...' : 'Update Now'}
					</Button>
				{/if}
			</div>

			<!-- Post-update note -->
			{#if updateStatus === 'updating'}
				<p class="text-xs text-muted-foreground/60">
					The app is restarting. Your browser will lose connection briefly — reload the page in ~30 seconds.
				</p>
			{/if}
		</div>
	</section>
</div>
