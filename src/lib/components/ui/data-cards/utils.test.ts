import { describe, it, expect } from 'vitest';
import { get, resolveActions } from './utils';

describe('get', () => {
  it('resolves a flat key', () => {
    expect(get({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves a nested key with dot notation', () => {
    expect(get({ product: { name: 'Bolt' } }, 'product.name')).toBe('Bolt');
  });

  it('resolves three levels deep', () => {
    expect(get({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('returns undefined for a missing key', () => {
    expect(get({ name: 'Alice' }, 'email')).toBeUndefined();
  });

  it('returns undefined when intermediate key is missing', () => {
    expect(get({ product: null }, 'product.name')).toBeUndefined();
  });
});

describe('resolveActions', () => {
  const row = { id: '1', name: 'Alice' };

  it('returns a static array as-is', () => {
    const actions = [{ label: 'Edit', onClick: () => {} }];
    expect(resolveActions(actions, row)).toBe(actions);
  });

  it('calls a function with the row and returns the result', () => {
    const fn = (r: Record<string, unknown>) => [{ label: `Edit ${r.name}`, onClick: () => {} }];
    const result = resolveActions(fn, row);
    expect(result[0].label).toBe('Edit Alice');
  });

  it('returns empty array when actions is undefined', () => {
    expect(resolveActions(undefined, row)).toEqual([]);
  });
});
