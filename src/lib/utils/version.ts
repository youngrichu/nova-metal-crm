export function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export function parseVersionJson(raw: string): { version: string; changelog: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON in version file');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).version !== 'string' ||
    typeof (parsed as Record<string, unknown>).changelog !== 'string'
  ) {
    throw new Error('Invalid version data: missing version or changelog fields');
  }
  return parsed as { version: string; changelog: string };
}
