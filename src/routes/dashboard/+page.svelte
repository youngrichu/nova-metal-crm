<script lang="ts">
  import { Users, Package, Activity, CreditCard, Settings, Calendar, Filter } from "lucide-svelte";
  import * as m from '$lib/paraglide/messages';
</script>

<div class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
  
  <div class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border/50 gap-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">{typeof m.dashboard_title === 'function' ? m.dashboard_title() : 'Dashboard'}</h1>
      <p class="text-sm text-muted-foreground mt-1">Welcome! Glad to see you.</p>
    </div>
    
    <div class="flex items-center gap-2">
      <div class="hidden sm:flex items-center rounded-md border bg-card p-1 shadow-sm">
        <button class="px-3 py-1 text-xs font-medium rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Day</button>
        <button class="px-3 py-1 text-xs font-medium rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Week</button>
        <button class="px-3 py-1 text-xs font-medium rounded bg-secondary text-secondary-foreground shadow-sm">Month</button>
      </div>
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border bg-card shadow-sm hover:bg-muted/50 transition-colors">
        <Calendar class="w-4 h-4 text-muted-foreground" />
        This Month
      </button>
      <button class="p-1.5 rounded-md border bg-card shadow-sm hover:bg-muted/50 transition-colors text-muted-foreground">
        <Filter class="w-4 h-4" />
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    <!-- Metrics Side Panel -->
    <div class="col-span-1 rounded-xl border bg-card p-6 shadow-sm flex flex-col">
      <h3 class="font-semibold text-sm mb-6 text-foreground">Recent Transactions</h3>
      
      <div class="space-y-5 flex-1">
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium">{m.total_revenue()}</span>
          <span class="font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded text-xs">ETB 0.00</span>
        </div>
        
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium">{m.active_orders()}</span>
          <span class="font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-xs">+0</span>
        </div>
        
        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium">Expenses</span>
          <span class="font-mono font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded text-xs">ETB 0.00</span>
        </div>

        <div class="flex justify-between items-center text-sm border-b border-border/30 pb-3">
          <span class="text-muted-foreground/80 font-medium">{m.inventory_alerts()}</span>
          <span class="font-mono font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded text-xs">0 Items</span>
        </div>
      </div>
      
      <div class="pt-6 mt-2 flex justify-between items-center text-sm">
        <span class="text-muted-foreground font-medium">Total Invoices Outstanding</span>
        <span class="font-mono font-bold text-foreground bg-muted px-3 py-1 rounded border">0</span>
      </div>
    </div>
    
    <!-- Overview Chart Placeholder -->
    <div class="col-span-1 lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm flex flex-col min-h-[350px]">
      <h3 class="font-semibold text-sm mb-6 text-foreground">Overview</h3>
      <div class="flex-1 w-full relative">
        <!-- Pseudo axes -->
        <div class="absolute inset-0 border-l border-b border-border/60 flex items-center justify-center">
           <span class="text-sm font-medium text-muted-foreground/40">Chart visualization rendering...</span>
        </div>
        <!-- Grid lines -->
        <div class="absolute inset-x-0 bottom-0 top-0 opacity-10" style="background-image: repeating-linear-gradient(transparent, transparent 19%, black 20%); background-size: 100% 20%;"></div>
      </div>
      <div class="flex justify-between text-[11px] font-medium text-muted-foreground/60 mt-3 pl-1">
        <span>01/Mar/2026</span>
        <span>31/Mar/2026</span>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Activity Board -->
    <div class="rounded-xl border bg-card p-6 shadow-sm min-h-[300px]">
      <h3 class="font-semibold text-sm mb-6 flex items-center gap-2 text-foreground">
        <Activity class="w-[18px] h-[18px] text-blue-500/80"/> 
        Recent Activity
      </h3>
      <div class="space-y-5">
        <div class="flex items-start gap-4">
          <div class="mt-0.5 bg-muted rounded-md p-1.5 border shadow-sm">
             <Settings class="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <div>
            <p class="text-sm text-foreground">System performed a routine baseline check</p>
            <p class="text-[11px] text-muted-foreground/70 mt-0.5 font-medium">Just now - localhost</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Payments List -->
    <div class="rounded-xl border bg-card p-6 shadow-sm min-h-[300px] flex flex-col">
      <h3 class="font-semibold text-sm mb-6 flex items-center gap-2 text-foreground">
        <CreditCard class="w-[18px] h-[18px] text-emerald-500/80"/> 
        Recent Payments
      </h3>
      
      <!-- List Header -->
      <div class="grid grid-cols-4 gap-4 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider pb-3 border-b border-border/40">
        <div>Number</div>
        <div>Client</div>
        <div>Date</div>
        <div class="text-right">Amount</div>
      </div>
      
      <div class="flex-1 flex items-center justify-center flex-col text-sm text-muted-foreground/50 py-10">
        No payment records found
      </div>
    </div>
  </div>
</div>
