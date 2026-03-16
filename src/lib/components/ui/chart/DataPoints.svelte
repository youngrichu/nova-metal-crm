<script lang="ts">
  import { getChartContext } from 'layerchart';

  const ctx = getChartContext() as any;
  if (!ctx) throw new Error('DataPoints must be used inside a <Chart> component');
</script>

{#each ctx.data as d}
  <circle
    cx={ctx.xGet(d)}
    cy={ctx.yGet(d)}
    r="3"
    class="fill-primary stroke-background"
    stroke-width="1.5"
  />
{/each}
