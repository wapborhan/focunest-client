"use client";
import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
/** Filters live in the URL, so each change is exactly one server render. Unchanged URLs are skipped, and the old data stays on screen while the new data loads. */
export function useUrlFilters() {
  const router = useRouter(), pathname = usePathname(), sp = useSearchParams();
  const [pending, start] = useTransition();
  const update = useCallback((patch) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v === "" || v == null ? p.delete(k) : p.set(k, String(v)));
    if (!("page" in patch)) p.delete("page");
    const qs = p.toString();
    if (qs === sp.toString()) return;
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }, [sp, pathname, router]);
  return { update, pending };
}
