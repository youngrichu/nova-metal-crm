<script lang="ts">
  import { Activity, Package, Warehouse, AlertTriangle, Settings, CalendarDays } from "lucide-svelte";
  import * as m from '$lib/paraglide/messages';
  import * as Select from "$lib/components/ui/select";

  let { data } = $props();

  let activePeriod = $state<'day' | 'week' | 'month'>('month');
  let selectedRange = $state('this-month');

  // Build a simple SVG bar chart from low stock items (up to 6)
  const chartItems = $derived(data.lowStockItems.slice(0, 6));
  const maxQty = $derived(Math.max(...chartItems.map((i: any) => i.quantity), 1));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // Use name if real, otherwise extract from email
  const displayName = $derived(() => {
    const name = data.user?.name;
    if (name && name !== 'System' && name !== 'Admin') return name.split(' ')[0];
    const email = data.user?.email ?? '';
    return email.split('@')[0] ?? 'there';
  });
</script>

<div class="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
  
  <!-- Page Header -->
  <div class="flex flex-col md:flex-row md:items-start justify-between pb-5 border-b border-border/50 gap-4">
    <div>
      <p class="text-[0.7rem] font-semibold tracking-widest text-muted-foreground/50 uppercase mb-1">{todayLabel}</p>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">{greeting}, {displayName()} 👋</h1>
      <p class="text-sm text-muted-foreground mt-0.5">Here's what's happening with your inventory today.</p>
    </div>
    
    <!-- View Options (Day/Week/Month) + Date Range Dropdown -->
    <div class="flex items-center gap-4 shrink-0">
      <!-- Day | Week | Month Toggle -->
      <div class="inline-flex items-center rounded-md border border-border/60 shadow-sm overflow-hidden bg-card">
        <button
          onclick={() => activePeriod = 'day'}
          class="px-4 py-1.5 text-sm font-medium transition-colors border-r border-border/60
            {activePeriod === 'day' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-muted-foreground hover:bg-muted/50'}"
        >
          Day
        </button>
        <button
          onclick={() => activePeriod = 'week'}
          class="px-4 py-1.5 text-sm font-medium transition-colors border-r border-border/60
            {activePeriod === 'week' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-muted-foreground hover:bg-muted/50'}"
        >
          Week
        </button>
        <button
          onclick={() => activePeriod = 'month'}
          class="px-4 py-1.5 text-sm font-medium transition-colors
            {activePeriod === 'month' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-muted-foreground hover:bg-muted/50'}"
        >
          Month
        </button>
      </div>

      <!-- Select Dropdown: This Month -->
      <Select.Root type="single" bind:value={selectedRange}>
        <Select.Trigger class="w-[180px] bg-card h-9">
          <CalendarDays class="mr-2 h-4 w-4 opacity-50" />
          <span>{selectedRange === 'this-month' ? 'This Month' : 
                 selectedRange === 'last-7-days' ? 'Last 7 Days' : 
                 selectedRange === 'last-30-days' ? 'Last 30 Days' :
                 selectedRange === 'last-month' ? 'Last Month' :
                 selectedRange === 'last-quarter' ? 'Last Quarter' :
                 selectedRange === 'current-quarter' ? 'Current Quarter' :
                 selectedRange === 'this-year' ? 'This Year' : 'Select range...'}</span>
        </Select.Trigger>
        <Select.Content align="end">
          <Select.Item value="last-7-days">Last 7 Days</Select.Item>
          <Select.Item value="last-30-days">Last 30 Days</Select.Item>
          <Select.Item value="this-month">This Month</Select.Item>
          <Select.Item value="last-month">Last Month</Select.Item>
          <Select.Item value="last-quarter">Last Quarter</Select.Item>
          <Select.Item value="current-quarter">Current Quarter</Select.Item>
          <Select.Item value="this-year">This Year</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    <!-- Metrics Side Panel -->
    <div class="col-span-1 rounded-xl border bg-card p-6 shadow-sm flex flex-col">
      <h3 class="font-semibold text-sm mb-6 text-foreground">Inventory Snapshot</h3>
      
      <div class="space-y-5 flex-1">
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium flex items-center gap-2">
            <Package class="w-3.5 h-3.5 opacity-60" /> Total Products
          </span>
          <span class="font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded text-xs">{data.productCount}</span>
        </div>
        
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium flex items-center gap-2">
            <Warehouse class="w-3.5 h-3.5 opacity-60" /> Warehouses
          </span>
          <span class="font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-xs">{data.warehouseCount}</span>
        </div>
        
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium flex items-center gap-2">
            <AlertTriangle class="w-3.5 h-3.5 opacity-60" /> {m.inventory_alerts()}
          </span>
          <span class="font-mono font-bold {data.lowStockCount > 0 ? 'text-rose-700 bg-rose-100/80' : 'text-slate-600 bg-slate-100/80'} px-2 py-0.5 rounded text-xs">
            {data.lowStockCount} Item{data.lowStockCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium">{m.active_orders()}</span>
          <span class="font-mono font-bold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded text-xs">Phase 2</span>
        </div>
      </div>
      
      <div class="pt-6 mt-2 flex justify-between items-center text-sm">
        <span class="text-muted-foreground font-medium">{m.total_revenue()}</span>
        <span class="font-mono font-bold text-foreground bg-muted px-3 py-1 rounded border text-xs">Phase 3</span>
      </div>
    </div>
    
    <!-- Low Stock Bar Chart -->
    <div class="col-span-1 lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm flex flex-col min-h-[350px]">
      <h3 class="font-semibold text-sm mb-1 text-foreground">Low Stock Overview</h3>
      <p class="text-xs text-muted-foreground/60 mb-6">Products at or below minimum alert threshold</p>

      {#if chartItems.length === 0}
        <div class="flex-1 flex items-center justify-center flex-col gap-2">
          <Package class="w-8 h-8 text-muted-foreground/20" />
          <p class="text-sm text-muted-foreground/50 font-medium">All stock levels healthy — no alerts</p>
        </div>
      {:else}
        <div class="flex-1 flex items-end gap-3 pb-6 border-b border-border/30">
          {#each chartItems as item}
            {@const heightPct = Math.max((item.quantity / maxQty) * 100, 4)}
            {@const isLow = item.quantity <= item.minStockLevel}
            <div class="flex-1 flex flex-col items-center gap-2 group">
              <span class="text-[10px] font-mono font-semibold {isLow ? 'text-rose-600' : 'text-emerald-600'} opacity-0 group-hover:opacity-100 transition-opacity">
                {item.quantity}
              </span>
              <div class="w-full rounded-t-sm transition-all duration-500 {isLow ? 'bg-rose-400/70' : 'bg-emerald-400/70'}"
                   style="height: {heightPct}%">
              </div>
            </div>
          {/each}
        </div>
        <div class="flex gap-3 pt-3">
          {#each chartItems as item}
            <div class="flex-1 text-center">
              <span class="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider leading-tight block truncate" title={item.sku}>{item.sku}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Activity Board -->
    <div class="rounded-xl border bg-card p-6 shadow-sm min-h-[300px]">
      <h3 class="font-semibold text-sm mb-6 flex items-center gap-2 text-foreground">
        <Activity class="w-[18px] h-[18px] text-blue-500/80"/> 
        Recent Activity
      </h3>
      <div class="space-y-4">
        {#if data.recentTransactions.length === 0}
          <div class="flex items-start gap-4">
            <div class="mt-0.5 bg-muted rounded-md p-1.5 border shadow-sm">
               <Settings class="w-3.5 h-3.5 text-muted-foreground/70" />
            </div>
            <div>
              <p class="text-sm text-foreground">System performed a routine baseline check</p>
              <p class="text-[11px] text-muted-foreground/70 mt-0.5 font-medium">No transactions yet</p>
            </div>
          </div>
        {:else}
          {#each data.recentTransactions as tx}
            <div class="flex items-start gap-4 border-b border-border/20 pb-3 last:border-0 last:pb-0">
              <div class="mt-0.5 rounded-md p-1.5 border shadow-sm shrink-0
                {tx.transactionType === 'STOCK_IN' ? 'bg-emerald-50 border-emerald-200' : 
                 tx.transactionType === 'STOCK_OUT' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}">
                <div class="w-3.5 h-3.5 font-black text-[8px] flex items-center justify-center leading-none
                  {tx.transactionType === 'STOCK_IN' ? 'text-emerald-600' : 
                   tx.transactionType === 'STOCK_OUT' ? 'text-rose-600' : 'text-amber-600'}">
                  {tx.transactionType === 'STOCK_IN' ? '↑' : tx.transactionType === 'STOCK_OUT' ? '↓' : '±'}
                </div>
              </div>
              <div class="min-w-0">
                <p class="text-sm text-foreground font-medium truncate">{tx.productName}</p>
                <p class="text-[11px] text-muted-foreground/70 mt-0.5">
                  <span class="font-mono font-semibold">{tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}</span> units
                  {#if tx.referenceDoc} · <span class="italic">{tx.referenceDoc}</span>{/if}
                  · {new Date(tx.createdAt).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Low Stock Items List -->
    <div class="rounded-xl border bg-card p-6 shadow-sm min-h-[300px] flex flex-col">
      <h3 class="font-semibold text-sm mb-6 flex items-center gap-2 text-foreground">
        <AlertTriangle class="w-[18px] h-[18px] text-rose-500/80"/> 
        Stock Alerts
      </h3>
      
      <!-- List Header -->
      <div class="grid grid-cols-3 gap-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider pb-3 border-b border-border/40">
        <div>SKU</div>
        <div>Product</div>
        <div class="text-right">Qty / Min</div>
      </div>
      
      {#if data.lowStockItems.length === 0}
        <div class="flex-1 flex items-center justify-center flex-col text-sm text-muted-foreground/50 py-10 gap-2">
          <Package class="w-6 h-6 opacity-30" />
          All stock levels are healthy
        </div>
      {:else}
        <div class="space-y-1 mt-3">
          {#each data.lowStockItems as item}
            <div class="grid grid-cols-3 gap-4 text-xs py-2 border-b border-border/20 last:border-0 items-center">
              <div class="font-mono text-blue-600 font-semibold truncate">{item.sku}</div>
              <div class="text-foreground truncate" title={item.productName}>{item.productName}</div>
              <div class="text-right">
                <span class="font-mono font-bold text-rose-600">{item.quantity}</span>
                <span class="text-muted-foreground/50"> / {item.minStockLevel}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
