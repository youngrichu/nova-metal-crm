<script lang="ts">
	import { page } from '$app/state';
	import { User, Settings, Users, HardDrive } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages';

	let { children } = $props();

	const settingsNav = [
		{ title: m.settings_nav_profile(), href: '/dashboard/settings/profile', icon: User, roles: ['admin', 'sales', 'warehouse'] },
		{ title: m.settings_nav_system(), href: '/dashboard/settings/system', icon: Settings, roles: ['admin'] },
		{ title: m.settings_nav_users(), href: '/dashboard/settings/users', icon: Users, roles: ['admin'] },
		{ title: m.settings_nav_backup(), href: '/dashboard/settings/backup', icon: HardDrive, roles: ['admin'] }
	];

	const visibleNav = $derived(
		settingsNav.filter((item) => item.roles.includes(page.data.user?.role ?? ''))
	);
</script>

<div class="flex flex-col min-h-full">
	<!-- Settings Sub-Navigation -->
	<nav class="border-b border-foreground/10 bg-muted/20 px-0 md:px-8">
		<div class="max-w-[1200px] mx-auto flex">
			{#each visibleNav as item}
				{@const isActive = page.url.pathname === item.href || page.url.pathname.startsWith(item.href + '/')}
				<a
					href={item.href}
					class="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs md:text-sm font-bold tracking-wide md:tracking-widest uppercase transition-all border-b-2 -mb-px
						{isActive
							? 'border-primary text-foreground'
							: 'border-transparent text-foreground/50 hover:text-foreground/80 hover:border-foreground/20'}"
				>
					<item.icon class="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
					{item.title}
				</a>
			{/each}
		</div>
	</nav>

	<!-- Page Content -->
	{@render children()}
</div>
