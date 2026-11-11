/** Recharts draws with plain color strings, so the charts get their palette from here. */
export function chartColors(dark) {
  return dark
    ? { income: "#2dd4bf", expense: "#f87171", grid: "#243632", axis: "#93a59f", ref: "#4a5f59", cursor: "rgba(45,212,191,.08)", tip: { borderRadius: 12, border: "1px solid #31453f", background: "#162522", color: "#e5eeeb" } }
    : { income: "#0f766e", expense: "#ef4444", grid: "#e2e8e5", axis: "#5b6b66", ref: "#94a3a0", cursor: "rgba(15,118,110,.06)", tip: { borderRadius: 12, border: "1px solid #e2e8e5", background: "#ffffff", color: "#0f1f1c" } };
}
