import { LayoutDashboard, Wallet, HandCoins, Landmark, MoonStar, ListChecks, Settings, ArrowDownToLine, ArrowUpFromLine, Banknote, Building2, Smartphone } from "lucide-react";
export const NAV = [
    { id: "dashboard", en: "Dashboard", bn: "ড্যাশবোর্ড", icon: LayoutDashboard, href: "/dashboard" },
    { id: "cash", en: "Cash Management", bn: "নগদ ব্যবস্থাপনা", icon: Wallet, children: [
            { id: "income", en: "Income", bn: "আয়", icon: ArrowDownToLine, href: "/cash/income" },
            { id: "expenses", en: "Expenses", bn: "ব্যয়", icon: ArrowUpFromLine, href: "/cash/expenses" },
            { id: "loans", en: "Lending & Borrowing", bn: "ধার-দেনা", icon: HandCoins, href: "/cash/lending-borrowing" },
            { id: "accounts", en: "Account Management", bn: "অ্যাকাউন্ট", icon: Landmark, children: [
                    { id: "acc-cash", en: "Cash", bn: "নগদ", icon: Banknote, href: "/cash/accounts/cash" },
                    { id: "acc-bank", en: "Bank Accounts", bn: "ব্যাংক", icon: Building2, href: "/cash/accounts/bank" },
                    { id: "acc-mobile", en: "Mobile Banking", bn: "মোবাইল ব্যাংকিং", icon: Smartphone, href: "/cash/accounts/mobile" },
                ] },
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
        if (isMatch(p, i.href))
            return [i];
        const t = i.children ? trail(i.children, p) : [];
        if (t.length)
            return [i, ...t];
    }
    return [];
}
