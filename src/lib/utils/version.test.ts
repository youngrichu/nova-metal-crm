import { describe, it, expect } from 'vitest';
import { compareVersions, parseVersionJson } from './version';

describe('compareVersions', () => {
  it('returns false when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(false);
  });

  it('returns true when latest is higher (patch)', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(true);
  });

  it('returns true when latest is higher (minor)', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBe(true);
  });

  it('returns true when latest is higher (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(true);
  });

  it('returns false when current is higher than latest', () => {
    expect(compareVersions('1.1.0', '1.0.0')).toBe(false);
  });
});

describe('parseVersionJson', () => {
  it('returns version and changelog from valid JSON', () => {
    const result = parseVersionJson('{"version":"1.1.0","changelog":"New stuff"}');
    expect(result).toEqual({ version: '1.1.0', changelog: 'New stuff' });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseVersionJson('not json')).toThrow();
  });

  it('throws when version field is missing', () => {
    expect(() => parseVersionJson('{"changelog":"hi"}')).toThrow();
  });

  it('throws when changelog field is missing', () => {
    expect(() => parseVersionJson('{"version":"1.0.0"}')).toThrow();
  });
});
