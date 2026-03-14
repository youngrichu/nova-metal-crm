<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as m from '$lib/paraglide/messages';
	import { LayoutDashboard, Package, Users, ShoppingCart, Settings, Box, Tags, Warehouse, LogOut, ChevronUp, Calculator, ClipboardList } from 'lucide-svelte';
	import { page } from '$app/state';
	import { authClient } from "$lib/auth-client";
	import { goto } from "$app/navigation";

	const navItems = [
		{ title: m.nav_dashboard, icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'sales', 'warehouse'] },
		{ title: m.nav_products, icon: Box, href: '/dashboard/catalog/products', roles: ['admin', 'warehouse'] },
		{ title: m.nav_categories, icon: Tags, href: '/dashboard/catalog/categories', roles: ['admin', 'warehouse'] },
		{ title: m.nav_inventory, icon: Package, href: '/dashboard/inventory', roles: ['admin', 'warehouse'] },
		{ title: m.nav_warehouses, icon: Warehouse, href: '/dashboard/inventory/warehouses', roles: ['admin', 'warehouse'] },
		{ title: () => 'Stock Takes', icon: ClipboardList, href: '/dashboard/inventory/counts', roles: ['admin', 'warehouse'] },
		{ title: m.nav_sales, icon: ShoppingCart, href: '/dashboard/sales/orders', roles: ['admin', 'sales'] },
		{ title: () => 'Reconciliation', icon: Calculator, href: '/dashboard/sales/reconciliation', roles: ['admin', 'sales'] },
		{ title: m.nav_customers, icon: Users, href: '/dashboard/customers', roles: ['admin', 'sales'] },
		{ title: m.nav_settings, icon: Settings, href: '/dashboard/settings', roles: ['admin', 'sales', 'warehouse'] }
	];

	const visibleNavItems = $derived(
		page.data.user?.role
			? navItems.filter((item) => item.roles.includes(page.data.user!.role as string))
			: navItems
	);

	async function handleLogout() {
		await authClient.signOut();
		goto("/login");
	}
</script>

<style>
	:global(#app-sidebar) {
		--sidebar-background: 220 10% 10%;
		--sidebar-foreground: 210 40% 96%;
		--sidebar-primary: var(--primary);
		--sidebar-primary-foreground: var(--primary-foreground);
		--sidebar-accent: 220 10% 15%;
		--sidebar-accent-foreground: 210 40% 96%;
		--sidebar-border: 220 10% 16%;
		--sidebar-ring: 212.7 26.8% 83.9%;
	}
</style>

<Sidebar.Root id="app-sidebar" class="border-r-0" collapsible="icon">

	<!-- ── HEADER / WORDMARK ── -->
	<Sidebar.Header class="px-0 pt-0 pb-0 border-b-2 border-white/10">
		<div class="flex items-center gap-0 group-data-[collapsible=icon]:justify-center h-14">
			<!-- Logo mark -->
			<div class="flex items-center justify-center shrink-0 w-14 h-14 border-r-2 border-white/10 group-data-[collapsible=icon]:border-r-0 group-data-[collapsible=icon]:w-full">
				<div class="w-8 h-8 bg-white flex items-center justify-center">
					<span class="text-zinc-900 text-base font-black tracking-tighter select-none leading-none">N</span>
				</div>
			</div>
			<!-- Wordmark -->
			<div class="flex flex-col leading-none px-5 group-data-[collapsible=icon]:hidden overflow-hidden">
				<span class="text-sm font-black tracking-[0.15em] text-sidebar-foreground uppercase leading-tight">Nova Metal</span>
				<span class="text-[0.65rem] font-bold tracking-[0.2em] text-sidebar-foreground/40 uppercase mt-0.5">ERP System</span>
			</div>
		</div>
	</Sidebar.Header>

	<!-- ── NAV ── -->
	<Sidebar.Content class="px-0 py-3">
		<Sidebar.Group class="px-0">
			<!-- Section label -->
			<Sidebar.GroupLabel class="px-6 pb-2 text-[0.6rem] font-black tracking-[0.2em] uppercase text-sidebar-foreground/30 group-data-[collapsible=icon]:hidden">
				Navigation
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu class="gap-0">
					{#each visibleNavItems as item}
						{@const isActive = page.url.pathname === item.href || (item.href !== '/dashboard' && page.url.pathname.startsWith(item.href))}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton {isActive}>
								{#snippet child({ props })}
									<a
										href={item.href}
										{...props}
										class={cn(
											'flex items-center gap-3 relative h-11 transition-colors',
											'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full',
											props.class as string,
											isActive
												? 'bg-white/10 text-sidebar-foreground border-l-2 border-primary'
												: 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5 border-l-2 border-transparent',
											'!px-6 group-data-[collapsible=icon]:!px-0'
										)}
									>
										<item.icon class="shrink-0 size-[1.05rem]" />
										<span class="text-xs font-bold tracking-[0.12em] uppercase group-data-[collapsible=icon]:hidden truncate">
											{typeof item.title === 'function' ? item.title() : item.title}
										</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<!-- ── FOOTER / USER ── -->
	<Sidebar.Footer class="px-0 pb-0 border-t-2 border-white/10">
		<Sidebar.Menu class="gap-0">
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								{...props}
								size="lg"
								class="h-14 rounded-none px-6 data-[state=open]:bg-white/10 outline-none group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center border-b-0"
							>
								<!-- Avatar -->
								<div class="flex shrink-0 items-center justify-center size-8 bg-white/15 border border-white/20">
									<span class="text-xs font-black text-sidebar-foreground uppercase">
										{(page.data.user?.name ?? 'A').charAt(0)}
									</span>
								</div>
								<!-- Name + role -->
								<div class="flex flex-col flex-1 text-left leading-none overflow-hidden group-data-[collapsible=icon]:hidden">
									<span class="truncate text-xs font-black tracking-[0.12em] uppercase text-sidebar-foreground">{page.data.user?.name ?? 'Admin'}</span>
									<span class="truncate text-[0.65rem] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/40 mt-0.5">{page.data.user?.role ?? 'admin'}</span>
								</div>
								<ChevronUp class="ml-auto size-3.5 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						side="top"
						align="start"
						sideOffset={0}
						class="w-56 rounded-none border-2 border-foreground/20 bg-zinc-900 shadow-[4px_-4px_0px_0px_theme(colors.primary.DEFAULT)] p-0 z-[100]"
					>
						<div class="px-3 py-2.5 border-b border-white/10">
							<p class="text-xs font-black tracking-[0.12em] uppercase text-white">{page.data.user?.name ?? 'Admin'}</p>
							<p class="text-[0.65rem] font-bold tracking-[0.15em] uppercase text-white/40 mt-0.5">{page.data.user?.email ?? ''}</p>
						</div>
						<button
							onclick={handleLogout}
							class="w-full flex items-center gap-3 px-3 py-3 text-xs font-bold tracking-[0.12em] uppercase text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
						>
							<LogOut class="size-4" />
							{m.sign_out()}
						</button>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>

		<!-- Collapse toggle -->
		<div class="hidden md:flex items-center justify-end px-3 py-2 border-t border-white/10 group-data-[collapsible=icon]:justify-center">
			<Sidebar.Trigger class="h-7 w-7 rounded-none border border-white/10 hover:border-white/30 hover:bg-white/5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors" />
		</div>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
