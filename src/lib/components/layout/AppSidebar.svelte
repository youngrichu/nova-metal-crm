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

<Sidebar.Root id="invoice-sidebar" class="border-r-0">
	<Sidebar.Header class="pt-6 pb-2 px-4 border-b border-border/10">
		<div class="flex items-center gap-3">
			<div class="bg-white flex aspect-square w-8 items-center justify-center rounded shadow-md">
				<span class="text-zinc-900 text-sm font-black tracking-tighter select-none">N</span>
			</div>
			<div class="flex flex-col leading-tight">
				<span class="text-[0.8rem] font-bold truncate tracking-widest text-sidebar-foreground uppercase">Nova Metal</span>
				<span class="text-[0.6rem] text-sidebar-foreground/50 font-medium tracking-wider uppercase">ERP System</span>
			</div>
		</div>
	</Sidebar.Header>

	<div class="px-4 py-3 mb-2 border-b border-border/10">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="flex outline-none items-center justify-between w-full hover:bg-sidebar-accent p-2 rounded-md transition-colors">
				<div class="flex flex-col text-left">
					<span class="text-[0.65rem] text-sidebar-foreground/50 uppercase font-bold tracking-wider mb-0.5">Signed in as</span>
					<span class="text-sm font-medium text-sidebar-foreground/90 truncate max-w-[150px]">{page.data.user?.email ?? 'Guest'}</span>
				</div>
				<ChevronDown class="w-4 h-4 text-sidebar-foreground/50" />
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start" side="right" sideOffset={16} class="w-60 min-w-[240px] z-[100]">
				<DropdownMenu.Label class="px-2 py-2">
					<div class="flex flex-col space-y-1 relative">
						<p class="text-sm font-medium leading-none">{page.data.user?.name ?? 'Admin'}</p>
						<p class="text-xs leading-none text-muted-foreground">{page.data.user?.email ?? 'Guest'}</p>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => goto('/settings')} class="cursor-pointer py-2">
					<Settings class="mr-2 h-4 w-4 text-muted-foreground" />
					<span>{m.nav_settings()}</span>
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={handleLogout} class="cursor-pointer py-2 text-rose-600 focus:text-rose-700">
					<LogOut class="mr-2 h-4 w-4 text-rose-600" />
					<span>{m.sign_out()}</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-3 text-xs font-semibold tracking-wider uppercase text-muted-foreground/60 mb-2">Navigation</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={page.url.pathname === item.href || (item.href !== '/dashboard' && page.url.pathname.startsWith(item.href))}>
								{#snippet child({ props })}
									<a href={item.href} {...props} class={cn('flex items-center gap-3 transition-colors', props.class as string)}>
										<item.icon class="size-[1.125rem] opacity-80" />
										<span class="font-medium text-sm">{typeof item.title === 'function' ? item.title() : item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="p-4 border-t border-border/40">
		<button onclick={handleLogout} class="flex items-center gap-3 w-full px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-md group">
			<LogOut class="size-[1.125rem] opacity-70 group-hover:opacity-100 transition-opacity" />
			<span>{m.sign_out()}</span>
		</button>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
