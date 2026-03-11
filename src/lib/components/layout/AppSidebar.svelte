<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { cn } from '$lib/utils';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as m from '$lib/paraglide/messages';
	import { LayoutDashboard, Package, Users, ShoppingCart, Settings, Box, Tags, Warehouse, LogOut, ChevronDown } from 'lucide-svelte';
	import { page } from '$app/state';
	import { authClient } from "$lib/auth-client";
	import { goto } from "$app/navigation";

	const navItems = [
		{ title: m.nav_dashboard, icon: LayoutDashboard, href: '/dashboard' },
		{ title: m.nav_products, icon: Box, href: '/dashboard/catalog/products' },
		{ title: m.nav_categories, icon: Tags, href: '/dashboard/catalog/categories' },
		{ title: m.nav_inventory, icon: Package, href: '/dashboard/inventory' },
		{ title: m.nav_warehouses, icon: Warehouse, href: '/dashboard/inventory/warehouses' },
		{ title: m.nav_sales, icon: ShoppingCart, href: '/sales' },
		{ title: m.nav_customers, icon: Users, href: '/customers' },
		{ title: m.nav_settings, icon: Settings, href: '/settings' }
	];

	async function handleLogout() {
		await authClient.signOut();
		goto("/login");
	}
</script>

<style>
	:global(#invoice-sidebar) {
		--sidebar-background: 220 10% 12%; /* #1c1d21 */
		--sidebar-foreground: 210 40% 98%;
		--sidebar-primary: 210 40% 98%;
		--sidebar-primary-foreground: 222 47% 11%;
		--sidebar-accent: 220 10% 18%;
		--sidebar-accent-foreground: 210 40% 98%;
		--sidebar-border: 220 10% 16%;
		--sidebar-ring: 212.7 26.8% 83.9%;
	}
</style>

<Sidebar.Root id="invoice-sidebar" class="border-r-0" collapsible="icon">
	<Sidebar.Header class="pt-6 pb-4 px-4 group-data-[collapsible=icon]:px-0 border-b border-border/10">
		<div class="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
			<div class="bg-white flex aspect-square size-8 shrink-0 items-center justify-center rounded shadow-md group-data-[collapsible=icon]:mx-auto">
				<span class="text-zinc-900 text-sm font-black tracking-tighter select-none">N</span>
			</div>
			<div class="flex flex-col leading-tight group-data-[collapsible=icon]:hidden overflow-hidden flex-1">
				<span class="text-[0.8rem] font-bold truncate tracking-widest text-sidebar-foreground uppercase">Nova Metal</span>
				<span class="text-[0.6rem] text-sidebar-foreground/50 font-medium tracking-wider uppercase">ERP System</span>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground/60 mb-2">Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={page.url.pathname === item.href || (item.href !== '/dashboard' && page.url.pathname.startsWith(item.href))}>
								{#snippet child({ props })}
									<a href={item.href} {...props} class={cn('flex items-center gap-3 relative transition-all duration-300 group overflow-hidden', props.class as string, 'data-[active=true]:bg-transparent data-[active=true]:text-sidebar-primary')}>
										<!-- Minimalist Active Indicator -->
										<div class="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-sidebar-primary rounded-r-md opacity-0 group-data-[active=true]:opacity-100 shadow-[0_0_8px_hsl(var(--sidebar-primary))] transition-all duration-500 ease-out z-10"></div>
										
										<!-- Subtle Background Tint -->
										<div class="absolute inset-0 bg-sidebar-primary/10 opacity-0 group-data-[active=true]:opacity-100 transition-opacity duration-300 rounded-md z-0"></div>
										
										<item.icon class="size-[1.125rem] opacity-70 group-data-[active=true]:opacity-100 group-data-[active=true]:stroke-[2.5px] transition-all duration-300 relative z-10" />
										<span class="text-sm tracking-wide font-medium group-data-[active=true]:font-bold relative z-10 transition-all">{typeof item.title === 'function' ? item.title() : item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="p-2 border-t border-border/40">
		<Sidebar.Menu>
			<!-- Combine user profile and collapse trigger in footer -->
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton {...props} size="lg" class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground outline-none">
								<div class="bg-sidebar-accent border border-border/30 flex aspect-square size-8 items-center justify-center rounded-sm">
									<Users class="size-4" />
								</div>
								<div class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden overflow-hidden">
									<span class="truncate font-semibold">{page.data.user?.name ?? 'Admin'}</span>
									<span class="truncate text-xs text-muted-foreground">{page.data.user?.email ?? 'Guest'}</span>
								</div>
								<ChevronDown class="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="right" align="end" sideOffset={4} class="w-56 rounded-lg bg-card shadow-lg z-[100]">
						<DropdownMenu.Label class="p-2 font-normal">
							<div class="flex flex-col space-y-1">
								<p class="text-sm font-medium leading-none">{page.data.user?.name ?? 'Admin'}</p>
								<p class="text-xs leading-none text-muted-foreground">{page.data.user?.email ?? 'Guest'}</p>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={handleLogout} class="px-2 py-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
							<LogOut class="mr-2 size-4" />
							{m.sign_out()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		
		<!-- Desktop Toggle button at the very bottom -->
		<Sidebar.Menu class="hidden md:block mt-2">
			<Sidebar.MenuItem class="flex items-center group-data-[collapsible=icon]:justify-center">
				<Sidebar.Trigger class="h-8 w-8 opacity-70 hover:opacity-100 text-sidebar-foreground group-data-[collapsible=icon]:mx-auto" />
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
