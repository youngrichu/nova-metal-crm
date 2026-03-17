const SEMVER_RE = /^\d+\.\d+\.\d+$/;

function parseSegments(v: string): [number, number, number] {
  if (!SEMVER_RE.test(v)) throw new Error(`Invalid version format: "${v}" (expected X.Y.Z)`);
  const [maj, min, pat] = v.split('.').map(Number);
  return [maj, min, pat];
}

export function compareVersions(current: string, latest: string): boolean {
  const [cMaj, cMin, cPat] = parseSegments(current);
  const [lMaj, lMin, lPat] = parseSegments(latest);
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
  const version = ((parsed as Record<string, unknown>).version as string).trim();
  if (!SEMVER_RE.test(version)) {
    throw new Error(`Invalid version format in version file: "${version}" (expected X.Y.Z)`);
  }
  return { version, changelog: (parsed as Record<string, unknown>).changelog as string };
}
