<script lang="ts">
  import { Activity, Package, Warehouse, AlertTriangle, Settings, CalendarDays } from "lucide-svelte";
  import * as m from '$lib/paraglide/messages';
  import * as Select from "$lib/components/ui/select";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";

  let { data } = $props();

  let activePeriod = $state<'day' | 'week' | 'month'>('month');
  let selectedRange = $state('this-month');

  // Build a simple SVG bar chart from low stock items (up to 6)
  const chartItems = $derived(data.lowStockItems.slice(0, 6));
  const maxQty = $derived(Math.max(...chartItems.map((i: any) => i.quantity), 1));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const todayLabel = new Date().toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  
  // Use name if real, otherwise extract from email
  const displayName = $derived(() => {
    const name = data.user?.name;
    if (name && name !== 'System' && name !== 'Admin') return name.split(' ')[0];
    const email = data.user?.email ?? '';
    return email.split('@')[0] ?? 'Operator';
  });
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-12">
  
  <!-- Avant-Garde Page Header -->
  <header class="flex flex-col md:flex-row justify-between items-end border-b-2 border-foreground pb-6 gap-6">
    <div class="space-y-4 relative w-full md:w-auto">
      <div class="absolute -left-6 top-2 w-2 h-16 bg-primary transform -skew-x-12 hidden md:block"></div>
      
      <div class="flex items-center gap-3 mb-2">
        <span class="inline-block px-2 py-0.5 bg-foreground text-background text-[10px] font-black tracking-widest uppercase">System Online</span>
        <span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{todayLabel}</span>
      </div>

      <h1 class="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-[0.8]">
        {greeting},<br/><span class="text-muted-foreground/40 italic">{displayName()}</span>
      </h1>
    </div>
    
    <!-- View Options (Day/Week/Month) + Date Range Dropdown -->
    <div class="flex items-center gap-4 shrink-0 mt-6 md:mt-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
      
      <!-- Brutalist Toggle -->
      <div class="flex border-2 border-foreground/20 p-1 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] shrink-0">
        <button
          onclick={() => activePeriod = 'day'}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'day' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Day</button>
        <button
          onclick={() => activePeriod = 'week'}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'week' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Week</button>
        <button
          onclick={() => activePeriod = 'month'}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'month' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Month</button>
      </div>

      <!-- Select Dropdown -->
      <Select.Root type="single" bind:value={selectedRange}>
        <Select.Trigger class="w-[200px] h-12 rounded-none border-2 border-foreground/20 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] font-bold text-xs tracking-widest uppercase">
          <CalendarDays class="mr-3 h-4 w-4 opacity-50" />
          <span>{selectedRange === 'this-month' ? 'This Month' : 
                 selectedRange === 'last-7-days' ? 'Last 7 Days' : 
                 selectedRange === 'last-30-days' ? 'Last 30 Days' :
                 selectedRange === 'last-month' ? 'Last Month' :
                 selectedRange === 'last-quarter' ? 'Last Quarter' :
                 selectedRange === 'current-quarter' ? 'Current Quarter' :
                 selectedRange === 'this-year' ? 'This Year' : 'Select range...'}</span>
        </Select.Trigger>
        <Select.Content align="end" class="rounded-none border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)]">
          <Select.Item value="last-7-days" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last 7 Days</Select.Item>
          <Select.Item value="last-30-days" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last 30 Days</Select.Item>
          <Select.Item value="this-month" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">This Month</Select.Item>
          <Select.Item value="last-month" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last Month</Select.Item>
          <Select.Item value="last-quarter" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last Quarter</Select.Item>
          <Select.Item value="current-quarter" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Current Qtr</Select.Item>
          <Select.Item value="this-year" class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">This Year</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  </header>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    
    <!-- Metrics Side Panel -->
    <div class="col-span-1 border-2 border-foreground/10 bg-card p-8 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] flex flex-col relative overflow-hidden group">
      
      <!-- Decorative brutalist accent -->
      <div class="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-700"></div>

      <h3 class="font-black text-sm tracking-widest uppercase mb-8 text-foreground flex items-center gap-3">
        <Activity class="w-4 h-4 text-primary" /> Inventory Overview
      </h3>
      
      <div class="space-y-6 flex-1 relative z-10">
        <div class="flex justify-between items-center border-b-2 border-foreground/5 pb-4 group/item">
          <span class="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover/item:text-foreground transition-colors flex items-center gap-3">
            <Package class="w-4 h-4 opacity-50" /> Total Products
          </span>
          <span class="font-mono font-black text-xl text-foreground">{data.productCount}</span>
        </div>
        
        <div class="flex justify-between items-center border-b-2 border-foreground/5 pb-4 group/item">
          <span class="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover/item:text-foreground transition-colors flex items-center gap-3">
            <Warehouse class="w-4 h-4 opacity-50" /> Storage Depots
          </span>
          <span class="font-mono font-black text-xl text-foreground">{data.warehouseCount}</span>
        </div>
        
        <div class="flex justify-between items-center border-b-2 border-foreground/5 pb-4 group/item">
          <span class="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover/item:text-foreground transition-colors flex items-center gap-3">
            <AlertTriangle class="w-4 h-4 opacity-50" /> {m.inventory_alerts()}
          </span>
          <span class="font-mono font-black text-lg px-2 py-1 {data.lowStockCount > 0 ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'}">
            {data.lowStockCount}
          </span>
        </div>

        <div class="flex justify-between items-center border-b-2 border-foreground/5 pb-4 group/item">
          <span class="text-xs font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-3">{m.active_orders()}</span>
          <span class="font-mono font-bold text-[10px] tracking-widest uppercase border-2 border-muted-foreground/30 px-2 py-1 text-muted-foreground/50">Phase 2 Lock</span>
        </div>
      </div>
      
      <div class="pt-8 mt-4 flex flex-col gap-2">
        <span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{m.total_revenue()}</span>
        <div class="flex items-center justify-between">
          <span class="font-mono font-black text-3xl text-muted-foreground/30">ETB 0.00</span>
          <span class="text-[9px] font-black uppercase tracking-widest bg-foreground text-background px-2 py-1">Phase 3</span>
        </div>
      </div>
    </div>
    
    <!-- Low Stock Bar Chart -->
    <div class="col-span-1 lg:col-span-2 border-2 border-foreground/10 bg-card p-8 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] flex flex-col min-h-[400px]">
      
      <div class="flex justify-between items-start mb-8 border-b-2 border-foreground/5 pb-6">
        <div>
          <h3 class="font-black text-sm tracking-widest uppercase text-foreground mb-1">Threshold Matrix</h3>
          <p class="text-xs font-medium text-muted-foreground/60 tracking-wider">Visual cross-section of lowest performing stock levels.</p>
        </div>
        <Button variant="outline" size="sm" href="/dashboard/inventory" class="h-8 rounded-none border-2 border-foreground/20 text-[10px] font-bold tracking-widest uppercase shadow-[2px_2px_0px_0px_theme(colors.foreground_/_10%)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          View Ledger
        </Button>
      </div>

      {#if chartItems.length === 0}
        <div class="flex-1 flex items-center justify-center flex-col gap-4 bg-muted/20 border-2 border-dashed border-border/50 m-4">
          <Package class="w-12 h-12 text-muted-foreground/20" />
          <p class="text-xs font-bold tracking-widest uppercase text-muted-foreground/50">Matrix Stable — No Warnings</p>
        </div>
      {:else}
        <div class="flex-1 flex items-end gap-6 pb-6 border-b-2 border-foreground/10 relative px-4 pt-10">
          
          <!-- Y-Axis Grid Lines -->
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-10 px-4">
            <div class="w-full border-t border-border/40 border-dashed"></div>
            <div class="w-full border-t border-border/40 border-dashed"></div>
            <div class="w-full border-t border-border/40 border-dashed"></div>
            <div class="w-full border-t border-border/40 border-dashed"></div>
          </div>

          {#each chartItems as item}
            {@const heightPct = Math.max((item.quantity / maxQty) * 100, 4)}
            {@const isLow = item.quantity <= item.minStockLevel}
            
            <div class="flex-1 flex flex-col items-center gap-3 relative z-10 group cursor-crosshair">
              
              <!-- Hover Tooltip -->
              <div class="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background px-3 py-2 text-[10px] font-bold tracking-widest uppercase whitespace-nowrap z-20 pointer-events-none">
                {item.quantity} Units <span class="opacity-50 mx-1">/</span> Min {item.minStockLevel}
                <!-- Tooltip Caret -->
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45"></div>
              </div>

              <div class="w-full relative bg-muted/30 border-2 {isLow ? 'border-rose-500/20' : 'border-emerald-500/20'} transition-all duration-700 overflow-hidden group-hover:border-foreground/40" style="height: {heightPct}%">
                <!-- Fill Level -->
                <div class="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out {isLow ? 'bg-rose-500' : 'bg-emerald-500'} opacity-80 group-hover:opacity-100" style="height: 100%"></div>
              </div>
            </div>
          {/each}
        </div>
        
        <!-- X-Axis Labels -->
        <div class="flex gap-6 pt-4 px-4">
          {#each chartItems as item}
            <div class="flex-1 text-center group cursor-crosshair">
              <span class="text-[10px] font-bold text-foreground uppercase tracking-widest leading-tight block truncate group-hover:text-primary transition-colors" title={item.sku}>{item.sku}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    
    <!-- Activity Board -->
    <div class="border-2 border-foreground/10 bg-card p-0 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] min-h-[400px] flex flex-col">
      <div class="p-6 border-b-2 border-foreground/10 bg-muted/30">
        <h3 class="font-black text-sm tracking-widest uppercase flex items-center gap-3 text-foreground">
          <Activity class="w-4 h-4 text-primary"/> 
          System Telemetry
        </h3>
      </div>
      
      <div class="flex-1 overflow-y-auto p-6">
        {#if data.recentTransactions.length === 0}
          <div class="flex items-start gap-5 p-4 border-2 border-dashed border-border/50 bg-muted/10">
            <div class="p-3 bg-muted border-2 border-foreground/10 shadow-[2px_2px_0px_0px_theme(colors.foreground_/_10%)]">
               <Settings class="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p class="text-sm font-bold tracking-tight text-foreground uppercase">Baseline Initialized</p>
              <p class="text-[10px] font-medium tracking-widest uppercase text-muted-foreground mt-1">Awaiting operational flow</p>
            </div>
          </div>
        {:else}
          <div class="space-y-6">
            {#each data.recentTransactions as tx}
              <div class="flex items-start gap-5 group">
                
                <!-- Brutalist Icon Badge -->
                <div class="p-2 border-2 bg-background shrink-0 mt-1 transition-transform group-hover:scale-110 shadow-[2px_2px_0px_0px_theme(colors.foreground_/_10%)]
                  {tx.transactionType === 'STOCK_IN' ? 'border-emerald-500 text-emerald-600' : 
                   tx.transactionType === 'STOCK_OUT' ? 'border-rose-500 text-rose-600' : 'border-amber-500 text-amber-600'}">
                  <div class="w-4 h-4 font-black text-[10px] flex items-center justify-center leading-none">
                    {tx.transactionType === 'STOCK_IN' ? '↑' : tx.transactionType === 'STOCK_OUT' ? '↓' : '±'}
                  </div>
                </div>
                
                <div class="min-w-0 border-b-2 border-border/20 pb-5 w-full">
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <p class="text-sm font-bold text-foreground tracking-tight line-clamp-1">{tx.productName}</p>
                    <span class="text-[9px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p class="text-[11px] font-mono font-medium text-muted-foreground/70">
                    <span class="font-bold text-foreground">{tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}</span> UNT 
                    <span class="opacity-50 mx-2">|</span> 
                    {tx.warehouseName}
                    {#if tx.referenceDoc}
                      <span class="opacity-50 mx-2">|</span> 
                      <span class="text-primary">{tx.referenceDoc}</span>
                    {/if}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Low Stock Items List -->
    <div class="border-2 border-foreground/10 bg-card p-0 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] min-h-[400px] flex flex-col">
      <div class="p-6 border-b-2 border-foreground/10 bg-rose-500/5">
        <h3 class="font-black text-sm tracking-widest uppercase flex items-center gap-3 text-foreground">
          <AlertTriangle class="w-4 h-4 text-rose-500"/> 
          Critical Deficits
        </h3>
      </div>
      
      {#if data.lowStockItems.length === 0}
        <div class="flex-1 flex items-center justify-center flex-col text-sm text-muted-foreground/50 py-10 gap-4">
          <Package class="w-10 h-10 opacity-20" />
          <span class="text-xs font-bold tracking-widest uppercase">Grid Operational</span>
        </div>
      {:else}
        <div class="flex-1 overflow-y-auto">
          <Table.Root class="w-full">
            <Table.Header class="bg-muted/30 sticky top-0 z-10 backdrop-blur-md">
              <Table.Row class="border-b-2 border-foreground/10 hover:bg-transparent">
                <Table.Head class="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground w-[100px]">Index</Table.Head>
                <Table.Head class="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Asset</Table.Head>
                <Table.Head class="h-10 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground text-right">Yield</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each data.lowStockItems as item}
                <Table.Row class="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <Table.Cell class="px-6 py-3 font-mono text-[11px] font-bold text-primary align-middle">
                    {item.sku}
                  </Table.Cell>
                  <Table.Cell class="px-6 py-3 text-xs font-bold tracking-tight text-foreground align-middle">
                    {item.productName}
                  </Table.Cell>
                  <Table.Cell class="px-6 py-3 text-right align-middle">
                    <span class="font-mono font-black text-rose-500 text-sm">{item.quantity}</span>
                    <span class="font-mono text-[10px] text-muted-foreground/50 ml-1">/{item.minStockLevel}</span>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>
      {/if}
    </div>
  </div>
</div>
