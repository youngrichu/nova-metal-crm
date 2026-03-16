<script lang="ts">
  import { Plus } from 'lucide-svelte';

  interface Props {
    onclick: () => void;
    label: string;
  }

  let { onclick, label }: Props = $props();
</script>

<button
  class="md:hidden fixed right-4 z-30 w-14 h-14 rounded-full
         bg-primary text-primary-foreground shadow-lg
         flex items-center justify-center
         hover:bg-primary/90 active:scale-95 transition-transform"
  style="bottom: calc(5rem + env(safe-area-inset-bottom))"
  aria-label={label}
  {onclick}
>
  <Plus class="w-6 h-6" />
</button>
