import { LayoutDashboard, Wallet, HandCoins, Landmark, MoonStar, ListChecks, Settings, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, SlidersHorizontal, LineChart, Handshake } from "lucide-react";
export const NAV = [
  { id: "dashboard", en: "Dashboard", bn: "ড্যাশবোর্ড", icon: LayoutDashboard, href: "/dashboard" },
  { id: "cash", en: "Cash Management", bn: "নগদ ব্যবস্থাপনা", icon: Wallet, children: [
    { id: "cash-dashboard", en: "Dashboard", bn: "ড্যাশবোর্ড", icon: LineChart, href: "/cash/dashboard" },   // the detailed cash dashboard; /dashboard shows only the five totals
    { id: "income", en: "Income", bn: "আয়", icon: ArrowDownToLine, href: "/cash/income" },
    { id: "expenses", en: "Expenses", bn: "ব্যয়", icon: ArrowUpFromLine, href: "/cash/expenses" },
    { id: "lending", en: "Lending", bn: "ধার দেওয়া", icon: HandCoins, href: "/cash/lending" },
    { id: "borrowing", en: "Borrowing", bn: "ধার নেওয়া", icon: Handshake, href: "/cash/borrowing" },
    { id: "accounts", en: "Accounts", bn: "অ্যাকাউন্ট", icon: Landmark, href: "/cash/accounts" },   // Cash / Bank / Mobile are tabs on this page
    { id: "transfers", en: "Transfers", bn: "ট্রান্সফার", icon: ArrowLeftRight, href: "/cash/transfers" },
    { id: "cash-settings", en: "Settings", bn: "সেটিংস", icon: SlidersHorizontal, href: "/cash/settings" },   // income and expense categories
  ] },
  { id: "ibadat", en: "Ibadat Management", bn: "ইবাদত", icon: MoonStar, href: "/ibadat" },
  { id: "tasks", en: "Task Management", bn: "কাজ", icon: ListChecks, href: "/tasks" },
  { id: "settings", en: "Settings", bn: "সেটিংস", icon: Settings, href: "/settings" },
];
const isMatch = (p, h) => !!h && (p === h || p.startsWith(h + "/"));
export const hasActive = (item, p) => isMatch(p, item.href) || !!item.children?.some((c) => hasActive(c, p));
/** The title and breadcrumb trail for a path. */
export function trail(items, p) {
  for (const i of items) {
    if (isMatch(p, i.href)) return [i];
    const t = i.children ? trail(i.children, p) : [];
    if (t.length) return [i, ...t];
  }
  return [];
}
