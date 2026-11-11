import { Banknote, Building2, Smartphone } from "lucide-react";
import { colorFor, findBank, findMfs, LOGO_CODES } from "@/lib/banks";

/** Icon for cash, a bank or an MFS provider. Uses an official logo file if one is registered, otherwise a short-code badge. */
export default function ProviderIcon({ kind, code, name = "", size = 32 }) {
  const box = { width: size, height: size };
  const cls = "grid shrink-0 place-items-center rounded-lg font-bold leading-none tracking-tight text-white shadow-sm";
  if (kind === "cash") return <span aria-hidden style={{ ...box, background: "linear-gradient(135deg,#14b8a6,#0b4f49)" }} className={cls}><Banknote size={size * 0.55} /></span>;
  const entry = kind === "mobile" ? findMfs(code) : findBank(code);
  // Official logos are small static SVGs the user adds themselves, so a plain <img> is the right tool.
  // eslint-disable-next-line @next/next/no-img-element
  if (entry && LOGO_CODES.has(entry.code)) return (<img src={`/logos/${entry.code}.svg`} alt="" style={box} className="shrink-0 rounded-lg bg-surface object-contain p-0.5 shadow-sm" />);
  if (!entry) return <span aria-hidden style={{ ...box, background: "#64748b" }} className={cls}>{name?.trim() ? name.trim()[0].toUpperCase() : kind === "mobile" ? <Smartphone size={size * 0.5} /> : <Building2 size={size * 0.5} />}</span>;
  const n = entry.short.length, font = size * (n <= 1 ? 0.5 : n === 2 ? 0.42 : n === 3 ? 0.33 : n === 4 ? 0.27 : 0.22);
  return <span aria-hidden style={{ ...box, fontSize: font, background: entry.color ?? colorFor(entry.code) }} className={cls}>{entry.short}</span>;
}
/** Icon for an account object from the API. */
export const AccountIcon = ({ account, size }) => <ProviderIcon kind={account.type} code={account.providerCode} name={account.provider ?? account.name} size={size} />;
