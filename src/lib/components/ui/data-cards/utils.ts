export type Action = {
  label: string;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'default' | 'destructive';
};

export type ActionsInput = Action[] | ((row: Record<string, unknown>) => Action[]);

/**
 * Resolves a dot-notation path from an object.
 * e.g. get({ product: { name: 'Bolt' } }, 'product.name') === 'Bolt'
 */
export function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Normalises ActionsInput to Action[] for a given row.
 */
export function resolveActions(
  actions: ActionsInput | undefined,
  row: Record<string, unknown>
): Action[] {
  if (!actions) return [];
  if (typeof actions === 'function') return actions(row);
  return actions;
}
