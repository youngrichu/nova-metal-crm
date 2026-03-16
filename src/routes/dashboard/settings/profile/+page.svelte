<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhance } from '$app/forms';
	import { User, Lock, Shield } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { data, form } = $props();

	let isNameSubmitting = $state(false);
	let isPasswordSubmitting = $state(false);

	function enhanceName() {
		isNameSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.nameSuccess) {
				toast.success('Name updated successfully');
			} else if (result.data?.nameError) {
				toast.error(result.data.nameError);
			}
			isNameSubmitting = false;
			await update();
		};
	}

	function enhancePassword() {
		isPasswordSubmitting = true;
		return async ({ result, update }: any) => {
			if (result.type === 'success' && result.data?.pwSuccess) {
				toast.success('Password updated successfully');
			} else if (result.data?.pwError) {
				toast.error(result.data.pwError);
			}
			isPasswordSubmitting = false;
			await update();
		};
	}

	const roleColors: Record<string, string> = {
		admin: 'bg-primary text-primary-foreground',
		sales: 'bg-blue-600 text-white',
		warehouse: 'bg-amber-600 text-white'
	};
</script>

<div class="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 md:space-y-12">
	<header class="flex justify-between items-end border-b-2 border-foreground pb-6 relative">
		<div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
		<div class="space-y-4 relative w-full">
			<div class="flex items-center gap-3 mb-2">
				<span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">Settings</span>
			</div>
			<h1 class="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.8]">
				My<br /><span class="text-muted-foreground/40 italic">Profile</span>
			</h1>
		</div>
	</header>

	<!-- Account Info (read-only) -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<User class="w-4 h-4 text-primary" /> Account Details
			</h2>
		</div>
		<div class="p-4 md:p-8 space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">Email Address</Label>
					<div class="h-10 sm:h-14 bg-muted/50 border-2 border-foreground/10 rounded-none px-4 flex items-center font-mono text-sm text-foreground/60 select-all">
						{data.user?.email}
					</div>
					<p class="text-xs text-muted-foreground/60">Email cannot be changed here</p>
				</div>
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-wider uppercase text-foreground/70">Role</Label>
					<div class="h-10 sm:h-14 bg-muted/50 border-2 border-foreground/10 rounded-none px-4 flex items-center gap-3">
						<Shield class="w-4 h-4 text-muted-foreground" />
						<span class="inline-block px-3 py-1 text-[10px] font-black tracking-widest uppercase {roleColors[data.user?.role ?? 'sales'] ?? 'bg-muted'}">
							{data.user?.role}
						</span>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Update Name -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<User class="w-4 h-4 text-primary" /> Display Name
			</h2>
		</div>
		<form method="POST" action="?/updateName" use:enhance={enhanceName} class="p-4 md:p-8 space-y-6">
			{#if form?.nameError}
				<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600">
					{form.nameError}
				</div>
			{/if}
			<div class="space-y-2 group">
				<Label for="name" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors flex items-center gap-2">
					<User class="w-3.5 h-3.5" /> Full Name
				</Label>
				<Input
					id="name"
					name="name"
					value={data.user?.name}
					required
					class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm px-4 transition-all"
				/>
			</div>
			<Button
				type="submit"
				disabled={isNameSubmitting}
				class="h-10 sm:h-14 rounded-none bg-foreground text-background text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
			>
				{isNameSubmitting ? 'Saving...' : 'Save Name'}
			</Button>
		</form>
	</section>

	<!-- Update Password -->
	<section class="border-2 border-foreground/10 bg-card shadow-[8px_8px_0px_0px_theme(colors.foreground/5%)]">
		<div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
			<h2 class="text-sm font-black tracking-widest uppercase flex items-center gap-2">
				<Lock class="w-4 h-4 text-primary" /> Change Password
			</h2>
		</div>
		<form method="POST" action="?/updatePassword" use:enhance={enhancePassword} class="p-4 md:p-8 space-y-6">
			{#if form?.pwError}
				<div class="p-4 text-sm font-medium bg-red-500/10 text-red-600 border-l-4 border-red-600">
					{form.pwError}
				</div>
			{/if}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="space-y-2 group">
					<Label for="currentPassword" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
						Current Password
					</Label>
					<Input
						id="currentPassword"
						name="currentPassword"
						type="password"
						required
						class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm px-4 transition-all"
					/>
				</div>
				<div class="space-y-2 group">
					<Label for="newPassword" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
						New Password
					</Label>
					<Input
						id="newPassword"
						name="newPassword"
						type="password"
						required
						class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm px-4 transition-all"
					/>
				</div>
				<div class="space-y-2 group">
					<Label for="confirmPassword" class="text-xs font-bold tracking-wider uppercase text-foreground/70 group-focus-within:text-primary transition-colors">
						Confirm New Password
					</Label>
					<Input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						required
						class="h-10 sm:h-14 bg-muted/30 border-2 border-transparent focus-visible:bg-transparent focus-visible:border-primary focus-visible:ring-0 rounded-none text-sm px-4 transition-all"
					/>
				</div>
			</div>
			<Button
				type="submit"
				disabled={isPasswordSubmitting}
				class="h-10 sm:h-14 rounded-none bg-foreground text-background text-xs sm:text-sm font-bold uppercase tracking-widest hover:bg-primary shadow-[4px_4px_0px_0px_theme(colors.primary.DEFAULT)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
			>
				{isPasswordSubmitting ? 'Updating...' : 'Update Password'}
			</Button>
		</form>
	</section>
</div>
