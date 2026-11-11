// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams() }));
const apiMock = vi.fn();
vi.mock("@/lib/client-api", () => ({ api: (...a) => apiMock(...a) }));
import LoansView from "@/components/LoansView";
import AccountsView from "@/components/AccountsView";
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); apiMock.mockReset(); });

const accounts = [
  { id: "a1", name: "Wallet", type: "cash", status: "active", active: true, balanceMinor: 1250000, openingBalanceMinor: 1250000, openingDate: "2026-01-01T00:00:00.000Z", entryCount: 0 },
  { id: "a2", name: "Rahim Traders", type: "bank", provider: "Dutch-Bangla Bank PLC", providerCode: "dbbl", numberLabel: "••••890123", subtype: "saving", status: "active", active: true, balanceMinor: 17500000, openingBalanceMinor: 1, openingDate: "2026-01-01T00:00:00.000Z", entryCount: 2 },
  { id: "a3", name: "Rahim Uddin", type: "mobile", provider: "bKash", providerCode: "bkash", numberLabel: "01712345678", status: "active", active: true, balanceMinor: 2470000, openingBalanceMinor: 1, openingDate: "2026-01-01T00:00:00.000Z", entryCount: 1 },
  { id: "a4", name: "Old Nagad", type: "mobile", provider: "Nagad", providerCode: "nagad", numberLabel: "01812345678", status: "active", active: false, balanceMinor: 120000, openingBalanceMinor: 1, openingDate: "2026-01-01T00:00:00.000Z", entryCount: 1 },
];
const loanDto = (direction) => ({ id: "l1", direction, counterparty: "Karim", principalMinor: 500000, repaidMinor: 100000, outstandingMinor: 400000, status: "partial", overdue: false, date: "2026-10-02T00:00:00.000Z", accountId: "a1" });
const loansView = (direction) => {
  const stats = { principalMinor: 500000, repaidMinor: 100000, outstandingMinor: 400000, count: 1, overdueCount: 0 };
  return render(<LoansView query={{ direction, page: 1, limit: 12 }} data={{ items: [loanDto(direction)], page: 1, limit: 12, total: 1, summary: {}, stats }} accounts={accounts} />);
};
const titles = (c) => [...c.querySelectorAll(".card-hover")].map((x) => x.querySelector("p").textContent);

describe("Lending page and Borrowing page", () => {
  it("lending: its own cards and add button, no lent/borrowed tabs, links into /cash/lending", () => {
    const { container } = loansView("lent");
    expect(screen.queryByRole("tablist")).toBeNull(); expect(screen.queryByRole("tab")).toBeNull();
    expect(titles(container)).toEqual(["Amount lent", "Repaid so far", "Still owed to you", "Overdue"]);
    expect(screen.getByRole("button", { name: "Add lending" })).toBeTruthy(); expect(screen.queryByRole("button", { name: "Add borrowing" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Karim" })[0].getAttribute("href")).toBe("/cash/lending/l1");
  });
  it("borrowing: its own cards and add button, links into /cash/borrowing", () => {
    const { container } = loansView("borrowed");
    expect(titles(container)).toEqual(["Amount borrowed", "Repaid so far", "Still owed by you", "Overdue"]);
    expect(screen.getByRole("button", { name: "Add borrowing" })).toBeTruthy(); expect(screen.queryByRole("button", { name: "Add lending" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Karim" })[0].getAttribute("href")).toBe("/cash/borrowing/l1");
  });
  it("shows the section's figures", () => {
    const { container } = loansView("lent"); const t = [...container.querySelectorAll(".card-hover")].map((c) => c.textContent);
    expect(t[0]).toContain("5,000.00"); expect(t[0]).toContain("1 loan in total"); expect(t[1]).toContain("1,000.00"); expect(t[2]).toContain("4,000.00"); expect(t[3]).toContain("0 loans");
  });
});
describe("Accounts page: All accounts tab", () => {
  const draw = (type = "all") => render(<AccountsView accounts={accounts} initialType={type} />);
  const tab = (n) => screen.getByRole("tab", { name: new RegExp(`^${n}`) });
  it("has All accounts as the first tab, selected by default, ahead of Cash, Bank and Mobile banking", () => {
    draw(); expect(screen.getAllByRole("tab").map((t) => t.textContent.replace(/\d+$/, ""))).toEqual(["All accounts", "Cash", "Bank accounts", "Mobile banking"]);
    expect(tab("All accounts").getAttribute("aria-selected")).toBe("true"); expect(tab("All accounts").textContent).toMatch(/4$/);
  });
  it("lists every account of every type, including inactive ones, with its type and status", () => {
    draw(); for (const n of ["Wallet", "Dutch-Bangla Bank PLC", "bKash", "Nagad"]) expect(screen.getAllByText(n).length).toBeGreaterThan(0);
    for (const t of ["Cash", "Bank account", "Mobile banking"]) expect(screen.getAllByText(t, { selector: ".badge" }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive", { selector: ".badge" }).length).toBeGreaterThan(0); expect(screen.getAllByText("01712345678").length).toBeGreaterThan(0);
  });
  it("shows total balance, account count and inactive count", () => {
    const { container } = draw(); const c = [...container.querySelectorAll(".card-hover")];
    expect(c.map((x) => x.querySelector("p").textContent)).toEqual(["Total balance", "Accounts", "Inactive"]);
    expect(c[0].textContent).toContain("213,400.00"); expect(c[1].textContent).toContain("1 cash · 1 bank · 2 mobile"); expect(c[2].querySelector("p.text-xl, p.text-2xl").textContent).toBe("1");
  });
  it("filters by type when another tab is chosen, and back to everything", async () => {
    draw(); const u = userEvent.setup();
    await u.click(tab("Bank accounts")); expect(screen.queryByText("bKash")).toBeNull(); expect(screen.getAllByText("Dutch-Bangla Bank PLC").length).toBeGreaterThan(0);
    await u.click(tab("All accounts")); expect(screen.getAllByText("bKash").length).toBeGreaterThan(0);
  });
  it("asks which kind of account to add on the All tab, and opens that form", async () => {
    draw(); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /Add account/ }));
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Cash account", "Bank account", "Mobile banking account"]);
    await u.click(screen.getByRole("menuitem", { name: "Bank account" }));
    const dialog = screen.getByRole("dialog"); expect(within(dialog).getByText("Add bank account")).toBeTruthy();
  });
  it("adds the tab's own kind of account straight away on a specific tab", async () => {
    draw("mobile"); await userEvent.setup().click(screen.getByRole("button", { name: "Add mobile banking account" }));
    expect(within(screen.getByRole("dialog")).getByText("Add mobile banking account")).toBeTruthy();
  });
  it("edits an account with the form for its own type, even from the All tab", async () => {
    draw(); await userEvent.setup().click(screen.getAllByRole("button", { name: "Edit Rahim Uddin" })[0]);
    const dialog = screen.getByRole("dialog"); expect(within(dialog).getByText("Edit account")).toBeTruthy(); expect(within(dialog).getByLabelText(/Mobile number/)).toBeTruthy();
  });
});
