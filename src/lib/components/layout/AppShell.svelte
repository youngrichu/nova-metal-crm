<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar";
  import AppSidebar from "./AppSidebar.svelte";
  import AppHeader from "./AppHeader.svelte";
  
  let { children } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar />
  <div class="flex flex-col flex-1 w-full overflow-hidden">
    <AppHeader />
    <main class="flex-1 overflow-auto bg-slate-50/50 p-4 md:p-6 lg:p-8">
      {@render children()}
    </main>
  </div>
</Sidebar.Provider>
