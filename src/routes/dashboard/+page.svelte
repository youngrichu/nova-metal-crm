<script lang="ts">
  import { Activity, Package, Warehouse, AlertTriangle, Settings, CalendarDays, TrendingUp } from "lucide-svelte";
  import * as m from '$lib/paraglide/messages';
  import * as Select from "$lib/components/ui/select";
  import * as Table from "$lib/components/ui/table";
  import { Button } from "$lib/components/ui/button";
  import { formatCurrency } from "$lib/utils/currency";
  import { goto } from '$app/navigation';
  import { Chart, Svg, Area, Spline, Axis, Highlight, Tooltip } from 'layerchart';
  import { scaleTime } from 'd3-scale';
  import { timeFormat } from 'd3-time-format';

  let { data } = $props();

  let activePeriod  = $state<'day' | 'week' | 'month'>(data.period);
  let selectedRange = $state<string>(data.range);

  const RANGE_LABELS: Record<string, string> = {
    'last-7-days':      'Last 7 Days',
    'last-30-days':     'Last 30 Days',
    'this-month':       'This Month',
    'last-month':       'Last Month',
    'last-quarter':     'Last Quarter',
    'current-quarter':  'Current Quarter',
    'this-year':        'This Year',
  };

  function applyFilter(range: string, period: string) {
    goto(`/dashboard?range=${range}&period=${period}`, { replaceState: true, keepFocus: true });
  }

  function setPeriod(p: 'day' | 'week' | 'month') {
    activePeriod = p;
    applyFilter(selectedRange, p);
  }

  function setRange(r: string) {
    selectedRange = r;
    applyFilter(r, activePeriod);
  }

  // Keep local state in sync if SvelteKit reloads data (e.g. browser back/forward)
  $effect(() => {
    activePeriod  = data.period as 'day' | 'week' | 'month';
    selectedRange = data.range;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const todayLabel = new Date().toLocaleDateString('en-ET', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Use name if real, otherwise extract from email
  const displayName = $derived(
    (() => {
      const name = data.user?.name;
      if (name && name !== 'System' && name !== 'Admin') return name.split(' ')[0];
      const email = data.user?.email ?? '';
      return email.split('@')[0] ?? 'Operator';
    })()
  );

  // --- Sales Trend Chart ---
  const trendData = $derived(data.salesTrend ?? []);

  const chartData = $derived(
    trendData.map((d: any) => ({ ...d, date: new Date(d.date) }))
  );
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
        {greeting},<br/><span class="text-muted-foreground/40 italic">{displayName}</span>
      </h1>
    </div>
    
    <!-- View Options (Day/Week/Month) + Date Range Dropdown -->
    <div class="flex items-center gap-4 shrink-0 mt-6 md:mt-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
      
      <!-- Brutalist Toggle -->
      <div class="flex border-2 border-foreground/20 p-1 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] shrink-0">
        <button
          onclick={() => setPeriod('day')}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'day' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Day</button>
        <button
          onclick={() => setPeriod('week')}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'week' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Week</button>
        <button
          onclick={() => setPeriod('month')}
          class="px-6 py-2 text-xs font-bold tracking-widest uppercase transition-all
            {activePeriod === 'month' ? 'bg-foreground text-background shadow-inner scale-[0.98]' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
        >Month</button>
      </div>

      <!-- Select Dropdown -->
      <Select.Root type="single" value={selectedRange} onValueChange={setRange}>
        <Select.Trigger class="w-[200px] h-12 rounded-none border-2 border-foreground/20 bg-background shadow-[4px_4px_0px_0px_theme(colors.foreground_/_10%)] font-bold text-xs tracking-widest uppercase">
          <CalendarDays class="mr-3 h-4 w-4 opacity-50" />
          <span>{RANGE_LABELS[selectedRange] ?? 'Select range...'}</span>
        </Select.Trigger>
        <Select.Content align="end" class="rounded-none border-2 border-foreground/10 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_10%)]">
          <Select.Item value="last-7-days"      class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last 7 Days</Select.Item>
          <Select.Item value="last-30-days"     class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last 30 Days</Select.Item>
          <Select.Item value="this-month"       class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">This Month</Select.Item>
          <Select.Item value="last-month"       class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last Month</Select.Item>
          <Select.Item value="last-quarter"     class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Last Quarter</Select.Item>
          <Select.Item value="current-quarter"  class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">Current Quarter</Select.Item>
          <Select.Item value="this-year"        class="text-xs font-bold uppercase tracking-wider py-3 rounded-none">This Year</Select.Item>
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
          <span class="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover/item:text-foreground transition-colors flex items-center gap-3">
            <Activity class="w-4 h-4 opacity-50" /> {m.active_orders()}
          </span>
          <span class="font-mono font-black text-xl text-foreground">{data.activeOrderCount}</span>
        </div>
      </div>
      
      {#if data.totalSales !== null}
      <div class="pt-8 mt-4 flex flex-col gap-4">
        <div>
          <span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{m.total_revenue()}</span>
          <div class="flex items-center justify-between">
            <span class="font-mono font-black text-3xl text-foreground">{formatCurrency(data.totalSales)}</span>
          </div>
        </div>
        <div>
          <span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Total Profit</span>
          <div class="flex items-center justify-between">
            <span class="font-mono font-black text-3xl text-emerald-500">{formatCurrency(data.totalProfit ?? 0)}</span>
          </div>
        </div>
      </div>
      {/if}

      <!-- Margins by Category -->
      {#if data.marginsByCategory && data.marginsByCategory.length > 0}
        <div class="mt-6 pt-6 border-t-2 border-foreground/5">
          <span class="text-[10px] font-black tracking-widest text-muted-foreground uppercase block mb-3">Margin by Category</span>
          <div class="space-y-2">
            {#each data.marginsByCategory as cat}
              {@const isLow = cat.marginPercent < 10}
              {@const isGood = cat.marginPercent > 20}
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-bold tracking-tight text-foreground truncate flex-1">{cat.categoryName}</span>
                <span class="font-mono text-[11px] font-black px-1.5 py-0.5 {isLow ? 'text-amber-500 bg-amber-500/10' : isGood ? 'text-emerald-500 bg-emerald-500/10' : 'text-foreground bg-muted/40'} shrink-0">
                  {cat.marginPercent.toFixed(1)}%
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Sales Trend Chart -->
    <div class="col-span-1 lg:col-span-2 border-2 border-foreground/10 bg-card p-8 shadow-[8px_8px_0px_0px_theme(colors.foreground_/_5%)] flex flex-col min-h-[400px]">

      <div class="flex justify-between items-start mb-8 border-b-2 border-foreground/5 pb-6">
        <div>
          <h3 class="font-black text-sm tracking-widest uppercase text-foreground mb-1 flex items-center gap-3">
            <TrendingUp class="w-4 h-4 text-primary" /> Revenue Trajectory
          </h3>
          <p class="text-xs font-medium text-muted-foreground/60 tracking-wider">{data.period === 'day' ? 'Daily' : data.period === 'week' ? 'Weekly' : 'Monthly'} revenue — {RANGE_LABELS[data.range]} (excl. draft &amp; cancelled).</p>
        </div>
        <Button variant="outline" size="sm" href="/dashboard/sales/orders" class="h-8 rounded-none border-2 border-foreground/20 text-[10px] font-bold tracking-widest uppercase shadow-[2px_2px_0px_0px_theme(colors.foreground_/_10%)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
          View Orders
        </Button>
      </div>

      {#if trendData.length === 0}
        <div class="flex-1 flex items-center justify-center flex-col gap-4 bg-muted/20 border-2 border-dashed border-border/50 m-4">
          <TrendingUp class="w-12 h-12 text-muted-foreground/20" />
          <p class="text-xs font-bold tracking-widest uppercase text-muted-foreground/50">No Revenue Data Yet</p>
        </div>
      {:else}
        <div class="flex-1 min-h-[280px]">
          <Chart
            data={chartData}
            x="date"
            xScale={scaleTime()}
            y="revenue"
            yBaseline={0}
            padding={{ top: 8, right: 16, bottom: 48, left: 60 }}
            tooltip={{ mode: 'bisect-x' }}
          >
            <Svg>
              <Axis
                placement="left"
                grid
                ticks={5}
                tickLabelProps={{ class: 'font-mono text-[9px] fill-muted-foreground/60 font-bold' }}
                format={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
              />
              <Axis
                placement="bottom"
                tickLabelProps={{ class: 'font-mono text-[9px] fill-muted-foreground/60 font-bold' }}
                format={(d: Date) => timeFormat('%m/%d')(d)}
              />
              <Area class="fill-primary/20" />
              <Spline class="stroke-primary stroke-[1.5]" />
              <Highlight points={{ class: 'fill-primary stroke-background stroke-2 r-3' }} />
            </Svg>
            <Tooltip.Root>
              {#snippet children({ data: pt }: { data: any })}
                <div class="bg-background border-2 border-foreground/10 px-3 py-2 shadow-[4px_4px_0px_0px_theme(colors.foreground/10%)] text-xs font-mono">
                  <p class="font-black text-[10px] tracking-widest uppercase text-muted-foreground mb-1">
                    {pt.date instanceof Date ? pt.date.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' }) : pt.date}
                  </p>
                  <p class="font-bold text-foreground">{formatCurrency(pt.revenue)}</p>
                </div>
              {/snippet}
            </Tooltip.Root>
          </Chart>
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
      
      <div class="flex-1 overflow-y-auto p-4 sm:p-6">
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
                
                <div class="min-w-0 border-b-2 border-border/20 pb-4 w-full">
                  <div class="flex justify-between items-start gap-2 mb-1">
                    <p class="text-sm font-bold text-foreground tracking-tight line-clamp-1">{tx.productName}</p>
                    <span class="text-[9px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                      {(() => {
                        const d = new Date(tx.createdAt);
                        const isToday = d.toDateString() === new Date().toDateString();
                        return isToday
                          ? d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' })
                          : d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-ET', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </span>
                  </div>
                  
                  <p class="text-[11px] font-mono font-medium text-muted-foreground/70 leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span class="font-bold text-foreground">{tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}</span> UNT
                    <span class="opacity-30">·</span>
                    {tx.warehouseName}
                    {#if tx.referenceDoc}
                      <span class="opacity-30">·</span>
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
