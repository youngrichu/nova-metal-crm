<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Database, Download, Shield, HardDrive, Clock, RefreshCw, Zap, Calendar } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let isDownloading = $state(false);

	type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'update-available' | 'updating';

	let updateStatus = $state<UpdateStatus>('idle');
	let updateInfo = $state<{ currentVersion: string; latestVersion: string; changelog: string } | null>(null);
	let updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => { if (updateTimeoutId) clearTimeout(updateTimeoutId); };
	});

	async function handleCheckUpdate() {
		updateStatus = 'checking';
		try {
			const res = await fetch('/api/update/check');
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body.message ?? m.backup_update_check_failed());
				updateStatus = 'idle';
				return;
			}
			const data = await res.json();
			if (
				typeof data.currentVersion !== 'string' ||
				typeof data.latestVersion !== 'string' ||
				typeof data.changelog !== 'string' ||
				typeof data.hasUpdate !== 'boolean'
			) {
				toast.error(m.backup_invalid_update_response());
				updateStatus = 'idle';
				return;
			}
			updateInfo = { currentVersion: data.currentVersion, latestVersion: data.latestVersion, changelog: data.changelog };
			updateStatus = data.hasUpdate ? 'update-available' : 'up-to-date';
		} catch {
			toast.error(m.backup_update_check_failed());
			updateStatus = 'idle';
		}
	}

	async function handleTriggerUpdate() {
		updateStatus = 'updating';
		try {
			const res = await fetch('/api/update/trigger', { method: 'POST' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body.message ?? m.backup_trigger_failed());
				updateStatus = 'update-available';
				return;
			}
			toast.success(m.backup_triggered());
			// Reset after 60s in case the app doesn't restart (e.g. already up to date)
			updateTimeoutId = setTimeout(() => { updateStatus = 'update-available'; }, 60000);
		} catch {
			toast.error(m.backup_watchtower_failed());
			updateStatus = 'update-available';
		}
	}

	// ── Backup Schedule ──────────────────────────────────────────────────────────
	type BackupFrequency = 'daily' | 'weekly';

	let scheduleLoading = $state(true);
	let scheduleError = $state(false);
	let scheduleSaving = $state(false);
	let scheduleFrequency = $state<BackupFrequency>('daily');
	let scheduleHour = $state(2);
	let scheduleDayOfWeek = $state(0);

	const HOURS = Array.from({ length: 24 }, (_, i) => {
		return { value: i, label: `${String(i).padStart(2, '0')}:00` };
	});

	const DAYS = [
		{ value: 0, label: m.backup_day_sunday() },
		{ value: 1, label: m.backup_day_monday() },
		{ value: 2, label: m.backup_day_tuesday() },
		{ value: 3, label: m.backup_day_wednesday() },
		{ value: 4, label: m.backup_day_thursday() },
		{ value: 5, label: m.backup_day_friday() },
		{ value: 6, label: m.backup_day_saturday() }
	];

	async function loadSchedule() {
		scheduleLoading = true;
		scheduleError = false;
		try {
			const res = await fetch('/api/backup/schedule');
			if (!res.ok) throw new Error();
			const data = await res.json();
			scheduleFrequency = data.frequency ?? 'daily';
			scheduleHour = data.hour ?? 2;
			scheduleDayOfWeek = data.dayOfWeek ?? 0;
		} catch {
			scheduleError = true;
		} finally {
			scheduleLoading = false;
		}
	}

	async function saveSchedule() {
		scheduleSaving = true;
		try {
			const body: Record<string, unknown> = { frequency: scheduleFrequency, hour: scheduleHour };
			if (scheduleFrequency === 'weekly') body.dayOfWeek = scheduleDayOfWeek;
			const res = await fetch('/api/backup/schedule', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				toast.error(data.message ?? m.backup_schedule_save_failed());
				return;
			}
			toast.success(m.backup_schedule_saved());
		} catch {
			toast.error(m.backup_schedule_save_failed());
		} finally {
			scheduleSaving = false;
		}
	}

	$effect(() => { loadSchedule(); });
	// ── End Backup Schedule ───────────────────────────────────────────────────────

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
			toast.success(m.backup_export_success());
		} catch (e) {
			toast.error(m.backup_export_network_error());
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
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">{m.backup_badge()}</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				{m.backup_title_line1()}<br /><span class="text-muted-foreground/40 italic">{m.backup_title_line2()}</span>
			</h1>
		</div>
	</header>

	<!-- Database Export Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Database class="w-4 h-4 text-primary" /> {m.backup_export_section()}
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<p class="text-sm text-muted-foreground leading-relaxed">
				{m.backup_export_desc()}
			</p>

			<div class="flex items-start gap-3 p-4 bg-amber-500/5 border-l-4 border-amber-500/40">
				<Shield class="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
				<p class="text-xs font-medium text-foreground/70">
					{m.backup_admin_only()}
				</p>
			</div>

			<div>
				<Button
					onclick={handleExport}
					disabled={isDownloading}
					class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3"
				>
					<Download class="w-4 h-4" />
					{isDownloading ? m.backup_exporting() : m.backup_export_btn()}
				</Button>
			</div>
		</div>
	</section>

	<!-- Backup Information Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<HardDrive class="w-4 h-4 text-primary" /> {m.backup_info_section()}
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<HardDrive class="w-3.5 h-3.5" /> {m.backup_script()}
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						scripts/backup.sh
					</div>
					<p class="text-xs text-muted-foreground/60">{m.backup_script_hint()}</p>
				</div>

				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<Clock class="w-3.5 h-3.5" /> {m.backup_scheduled()}
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						{m.backup_scheduled_value()}
					</div>
					<p class="text-xs text-muted-foreground/60">{m.backup_scheduled_hint()}</p>
				</div>

				<div class="space-y-2">
					<div class="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-foreground/50">
						<Database class="w-3.5 h-3.5" /> {m.backup_size()}
					</div>
					<div class="font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						{m.backup_size_value()}
					</div>
					<p class="text-xs text-muted-foreground/60">{m.backup_size_hint()}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Backup Schedule Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Calendar class="w-4 h-4 text-primary" /> {m.backup_schedule_section()}
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<p class="text-sm text-muted-foreground leading-relaxed">
				{m.backup_schedule_desc()}
			</p>

			{#if scheduleError}
				<p class="text-sm text-destructive">{m.backup_schedule_load_failed()}</p>
			{:else}
				<!-- Frequency toggle -->
				<div class="space-y-2">
					<p class="text-xs font-bold tracking-wider uppercase text-foreground/50">{m.backup_frequency()}</p>
					<div class="flex gap-0">
						{#each (['daily', 'weekly'] as BackupFrequency[]) as freq}
							<button
								type="button"
								disabled={scheduleLoading}
								onclick={() => { scheduleFrequency = freq; }}
								class="h-10 px-6 border-2 border-foreground font-bold uppercase tracking-widest text-xs transition-all
									{scheduleFrequency === freq
										? 'bg-foreground text-background'
										: 'bg-background text-foreground hover:bg-foreground/10'}
									disabled:opacity-50"
							>
								{freq === 'daily' ? m.backup_frequency_daily() : m.backup_frequency_weekly()}
							</button>
						{/each}
					</div>
				</div>

				<!-- Time picker -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<label class="text-xs font-bold tracking-wider uppercase text-foreground/50" for="schedule-hour">
							{m.backup_time()}
						</label>
						<select
							id="schedule-hour"
							disabled={scheduleLoading}
							bind:value={scheduleHour}
							class="w-full h-10 px-3 border-2 border-foreground/20 bg-background font-mono text-sm focus:outline-none focus:border-foreground disabled:opacity-50"
						>
							{#each HOURS as h}
								<option value={h.value}>{h.label}</option>
							{/each}
						</select>
					</div>

					{#if scheduleFrequency === 'weekly'}
						<div class="space-y-2">
							<label class="text-xs font-bold tracking-wider uppercase text-foreground/50" for="schedule-dow">
								{m.backup_day()}
							</label>
							<select
								id="schedule-dow"
								disabled={scheduleLoading}
								bind:value={scheduleDayOfWeek}
								class="w-full h-10 px-3 border-2 border-foreground/20 bg-background font-mono text-sm focus:outline-none focus:border-foreground disabled:opacity-50"
							>
								{#each DAYS as d}
									<option value={d.value}>{d.label}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<!-- Save button -->
				<div>
					<Button
						onclick={saveSchedule}
						disabled={scheduleLoading || scheduleSaving}
						class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
					>
						<Calendar class="w-4 h-4" />
						{scheduleSaving ? m.saving() : m.backup_save_schedule()}
					</Button>
				</div>
			{/if}
		</div>
	</section>

	<!-- System Updates Card -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Zap class="w-4 h-4 text-primary" /> {m.backup_updates_section()}
			</h2>
		</div>
		<div class="p-6 md:p-8 space-y-6">
			<p class="text-sm text-muted-foreground leading-relaxed">
				{m.backup_updates_desc()}
			</p>

			<!-- Version status display -->
			<div class="flex flex-wrap items-center gap-3">
				{#if updateInfo}
					<div class="flex items-center gap-2 font-mono text-sm bg-muted/40 border border-foreground/10 px-3 py-2">
						{m.backup_current()} <span class="font-bold">v{updateInfo.currentVersion}</span>
					</div>
					{#if updateStatus === 'up-to-date'}
						<span class="inline-block px-2 py-0.5 bg-green-500 text-white text-[10px] font-black tracking-widest uppercase">
							{m.backup_up_to_date()}
						</span>
					{:else if updateStatus === 'update-available' || updateStatus === 'updating'}
						<span class="inline-block px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black tracking-widest uppercase">
							{m.backup_available({ version: updateInfo.latestVersion })}
						</span>
					{/if}
				{/if}
			</div>

			<!-- Changelog -->
			{#if updateStatus === 'update-available' || updateStatus === 'updating'}
				<div class="bg-muted/40 border-l-4 border-primary/40 p-4 space-y-1">
					<p class="text-xs font-bold tracking-widest uppercase text-foreground/50">{m.backup_whats_new({ version: updateInfo?.latestVersion ?? '' })}</p>
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
					{updateStatus === 'checking' ? m.backup_checking() : m.backup_check_updates()}
				</Button>

				{#if updateStatus === 'update-available' || updateStatus === 'updating'}
					<Button
						onclick={handleTriggerUpdate}
						disabled={updateStatus === 'updating'}
						class="h-14 px-12 rounded-none bg-foreground text-background font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
					>
						<Zap class="w-4 h-4" />
						{updateStatus === 'updating' ? m.backup_updating() : m.backup_update_now()}
					</Button>
				{/if}
			</div>

			<!-- Post-update note -->
			{#if updateStatus === 'updating'}
				<p class="text-xs text-muted-foreground/60">
					{m.backup_restart_note()}
				</p>
			{/if}
		</div>
	</section>
</div>
