/** Reads page searchParams: first value of each key, blanks dropped. */
export const flat = (sp = {}) => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v !== "" && v != null));
/** Validates with a Zod schema. Bad or tampered URLs fall back to defaults instead of erroring. */
export function parseQuery(schema, sp, extra = {}) {
  const r = schema.safeParse({ ...flat(sp), ...extra });
  return r.success ? r.data : schema.parse(extra);
}
