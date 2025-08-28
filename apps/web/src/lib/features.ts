/** Feature flags helpers */

/** Return true when Expertfolio UI should be enabled. */
export function isExpertfolioEnabled(): boolean {
  const v = process.env.FEATURE_EXPERTFOLIO || process.env.NEXT_PUBLIC_FEATURE_EXPERTFOLIO;
  return v === '1' || v === 'true';
}

/** Generic feature getter with common truthy parsing. */
export function getFeatureFlag(name: string, defaultValue = false): boolean {
  const v = process.env[name] ?? process.env[`NEXT_PUBLIC_${name}`];
  if (v == null) return defaultValue;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}


