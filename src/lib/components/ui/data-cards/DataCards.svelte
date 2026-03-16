<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { MoreHorizontal } from 'lucide-svelte';
  import { get, resolveActions, type Action, type ActionsInput } from './utils';

  type Column = {
    key: string;
    label: string;
    primary?: boolean;
    secondary?: boolean;
    badge?: boolean;
    badgeClass?: (value: unknown) => string;
    hideInCard?: boolean;
  };

  interface Props {
    columns: Column[];
    data: Record<string, unknown>[];
    actions?: ActionsInput;
    keyField?: string;
    emptyMessage?: string;
  }

  let { columns, data, actions, keyField = 'id', emptyMessage = 'No items found.' }: Props = $props();

  const primaryCol   = $derived(columns.find(c => c.primary));
  const secondaryCol = $derived(columns.find(c => c.secondary));
  const badgeCol     = $derived(columns.find(c => c.badge));
  const bodyColumns  = $derived(
    columns.filter(c => !c.primary && !c.secondary && !c.badge && !c.hideInCard)
  );
</script>

{#if data.length === 0}
  <p class="text-muted-foreground text-sm text-center py-8">{emptyMessage}</p>
{:else}
  <div class="flex flex-col gap-3">
    {#each data as row, i (get(row, keyField) ?? `__row_${i}`)}
      {@const rowActions = resolveActions(actions, row)}
      <div class="border-2 border-foreground/15 bg-card p-4 shadow-[4px_4px_0px_0px_theme(colors.foreground_/_8%)]">
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-foreground/8">
          <div class="min-w-0">
            {#if primaryCol}
              <p class="font-black text-sm tracking-tight text-foreground leading-tight truncate">
                {get(row, primaryCol.key) ?? '—'}
              </p>
            {/if}
            {#if secondaryCol}
              <p class="text-xs text-muted-foreground mt-0.5 truncate font-medium">
                {get(row, secondaryCol.key) ?? '—'}
              </p>
            {/if}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            {#if badgeCol}
              {@const badgeValue = get(row, badgeCol.key)}
              {@const badgeClasses = badgeCol.badgeClass ? badgeCol.badgeClass(badgeValue) : 'bg-muted text-muted-foreground'}
              <span class="inline-flex items-center px-2 py-0.5 text-[10px] font-black tracking-widest border {badgeClasses}">
                {badgeValue ?? '—'}
              </span>
            {/if}
            {#if rowActions.length > 0}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  class="h-10 w-10 md:h-7 md:w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="Row actions"
                >
                  <MoreHorizontal class="h-4 w-4" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  {#each rowActions as action}
                    <DropdownMenu.Item
                      class={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                      onSelect={() => action.onClick(row)}
                    >
                      {action.label}
                    </DropdownMenu.Item>
                  {/each}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            {/if}
          </div>
        </div>

        <!-- Card body grid -->
        {#if bodyColumns.length > 0}
          <div class="grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-2">
            {#each bodyColumns as col}
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{col.label}</p>
                <p class="text-xs font-bold text-foreground mt-0.5">{get(row, col.key) ?? '—'}</p>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
