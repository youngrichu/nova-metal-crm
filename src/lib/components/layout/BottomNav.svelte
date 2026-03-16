<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import * as Sheet from '$lib/components/ui/sheet';
  import { LayoutDashboard, ShoppingCart, Box, Package, Users, Tags, Warehouse, ClipboardList, Calculator, Settings, MoreHorizontal } from 'lucide-svelte';

  const allTabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'sales', 'warehouse'], exact: true },
    { key: 'orders',    label: 'Orders',    icon: ShoppingCart,    href: '/dashboard/sales/orders', roles: ['admin', 'sales'], exact: false },
    { key: 'catalog',   label: 'Catalog',   icon: Box,             href: '/dashboard/catalog/products', roles: ['admin', 'warehouse'], exact: false, activePrefix: '/dashboard/catalog' },
  ];

  const allMoreItems = [
    { label: 'Inventory',      icon: Package,      href: '/dashboard/inventory',           roles: ['admin', 'warehouse'] },
    { label: 'Warehouses',     icon: Warehouse,    href: '/dashboard/inventory/warehouses', roles: ['admin', 'warehouse'] },
    { label: 'Stock Takes',    icon: ClipboardList,href: '/dashboard/inventory/counts',     roles: ['admin', 'warehouse'] },
    { label: 'Reconciliation', icon: Calculator,   href: '/dashboard/sales/reconciliation', roles: ['admin', 'sales'] },
    { label: 'Customers',      icon: Users,        href: '/dashboard/customers',            roles: ['admin', 'sales'] },
    { label: 'Categories',     icon: Tags,         href: '/dashboard/catalog/categories',   roles: ['admin', 'warehouse'] },
    { label: 'Settings',       icon: Settings,     href: '/dashboard/settings',             roles: ['admin', 'sales', 'warehouse'] },
  ];

  let moreOpen = $state(false);

  const role = $derived(page.data.user?.role as string | undefined);

  const visibleTabs = $derived(
    allTabs.filter(t => !role || t.roles.includes(role))
  );

  const visibleMoreItems = $derived(
    allMoreItems.filter(i => !role || i.roles.includes(role))
  );

  function isActive(tab: typeof allTabs[number]) {
    const path = page.url.pathname;
    const prefix = tab.activePrefix ?? tab.href;
    if (tab.exact) return path === tab.href;
    return path.startsWith(prefix);
  }

  function isMoreItemActive(href: string) {
    return page.url.pathname.startsWith(href);
  }
</script>

<nav
  class="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border"
  style="padding-bottom: env(safe-area-inset-bottom)"
>
  <div class="h-16 flex items-center">
    {#each visibleTabs as tab}
      <button
        class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium transition-colors
               {isActive(tab) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
        onclick={() => goto(tab.href)}
      >
        <tab.icon class="h-5 w-5" />
        <span>{tab.label}</span>
      </button>
    {/each}

    <!-- More tab — always shown -->
    <Sheet.Root bind:open={moreOpen}>
      <Sheet.Trigger class="flex-1 min-w-[44px] flex flex-col items-center justify-center gap-0.5 h-full text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        <MoreHorizontal class="h-5 w-5" />
        <span>More</span>
      </Sheet.Trigger>
      <Sheet.Content side="bottom" class="rounded-t-2xl pb-safe">
        <div class="w-8 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4"></div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3 px-1">More</p>
        <div class="flex flex-col gap-1">
          {#each visibleMoreItems as item}
            <button
              class="flex items-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors
                     {isMoreItemActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}"
              onclick={() => { moreOpen = false; goto(item.href); }}
            >
              <item.icon class="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          {/each}
        </div>
      </Sheet.Content>
    </Sheet.Root>
  </div>
</nav>
