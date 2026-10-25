/** Fetch helper for the browser. Throws an Error with the server's message. */
export async function api(path, options = {}) {
  const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers ?? {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data?.error?.message ?? "Request failed"); e.details = data?.error?.details; e.status = res.status; throw e; }
  return data;
}
