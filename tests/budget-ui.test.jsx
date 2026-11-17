// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const nav = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace, refresh: nav.refresh }), usePathname: () => "/cash/budget", useSearchParams: () => new URLSearchParams(nav.search) }));
vi.mock("recharts", async () => { const React = await import("react"); const C = ({ children }) => React.createElement("div", null, children); return { ResponsiveContainer: C, BarChart: C, LineChart: C, Bar: C, Line: C, XAxis: C, YAxis: C, Tooltip: C, Legend: C, CartesianGrid: C, ReferenceLine: C }; });
const apiMock = vi.fn();
vi.mock("@/lib/client-api", () => ({ api: (...a) => apiMock(...a) }));
import BudgetView, { paceText } from "@/components/BudgetView";
import BudgetBar from "@/components/BudgetBar";
import BudgetHint from "@/components/BudgetHint";
import BudgetPanel from "@/components/BudgetPanel";
import TransactionForm from "@/components/TransactionForm";
import DashboardView from "@/components/DashboardView";
import { resolveMonth } from "@/lib/period";
import { currentMonth } from "@/lib/dates";
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); apiMock.mockReset(); nav.replace.mockReset(); nav.refresh.mockReset(); nav.search = ""; });
const norm = (t) => t.replace(/\u00a0/g, " ");   // currency text uses a no-break space

const line = (categoryId, nameEn, budget, spent, extra = {}) => ({ categoryId, nameEn, nameBn: undefined, archived: false, budgetMinor: budget, since: budget == null ? null : "2026-01", spentMinor: spent, count: spent ? 1 : 0,
  remainingMinor: budget == null ? null : budget - spent, percent: budget == null ? null : Math.round((spent / budget) * 100), status: budget == null ? "none" : spent > budget ? "over" : spent >= budget * 0.8 ? "warning" : "ok", ...extra });
const status = (over = {}) => ({ month: "2026-11", currentMonth: "2026-11", daysInMonth: 30, daysLeft: 19, elapsed: 11 / 30, totalSpentMinor: 3700000, unbudgetedSpentMinor: 900000,
  overall: { source: "total", budgetMinor: 5000000, spentMinor: 3700000, remainingMinor: 1300000, percent: 74, status: "ok", since: "2026-01", allocatedMinor: 3000000, projectedMinor: 10090909 }, overCount: 1,
  lines: [line("c1", "Food", 1500000, 1800000), line("c2", "Housing", 1000000, 850000), line("c3", "Transportation", 500000, 150000), line("c4", "Shopping", null, 900000)], ...over });
const draw = (d = status()) => render(<BudgetView data={d} />);
const cardTitles = (c) => [...c.querySelectorAll(".card-hover")].map((x) => x.querySelector("p").textContent.replace(/\u00a0/g, " "));
const card = (c, t) => [...c.querySelectorAll(".card-hover")].find((x) => x.querySelector("p").textContent.replace(/\u00a0/g, " ") === t);

describe("budget page: summary", () => {
  it("shows spent, the overall budget, what is left, and how many budgets are over", () => {
    const { container } = draw(); expect(cardTitles(container)).toEqual(["Spent", "Overall budget", "Remaining", "Over limit"]);
    expect(card(container, "Spent").textContent.replace(/\u00a0/g, " ")).toContain("37,000.00"); expect(card(container, "Overall budget").textContent.replace(/\u00a0/g, " ")).toContain("50,000.00");
    expect(card(container, "Remaining").textContent.replace(/\u00a0/g, " ")).toContain("13,000.00"); expect(card(container, "Over limit").textContent.replace(/\u00a0/g, " ")).toContain("1 budget"); expect(card(container, "Over limit").textContent.replace(/\u00a0/g, " ")).toContain("9,000.00 spent with no budget");
  });
  it("turns Remaining into Over by, in red, when the overall budget is exceeded", () => {
    const o = { ...status().overall, spentMinor: 5600000, remainingMinor: -600000, percent: 112, status: "over" };
    const { container } = draw(status({ overall: o, totalSpentMinor: 5600000 })); const c = card(container, "Over by");
    expect(c.textContent.replace(/\u00a0/g, " ")).toContain("6,000.00"); expect(c.querySelector("p.text-danger")).not.toBeNull();
  });
  it("counts an overall budget that is over in the over-limit card", () => {
    const o = { ...status().overall, status: "over", remainingMinor: -1, percent: 101 };
    expect(card(draw(status({ overall: o, overCount: 1 })).container, "Over limit").textContent.replace(/\u00a0/g, " ")).toContain("2 budgets");
  });
  it("sums the category budgets when there is no overall limit, and offers to set one", () => {
    const o = { ...status().overall, source: "categories", since: null }; const { container } = draw(status({ overall: o }));
    expect(card(container, "Category budgets").textContent.replace(/\u00a0/g, " ")).toContain("Sum of your category budgets"); expect(screen.getByRole("button", { name: "Set an overall limit" })).toBeTruthy();
  });
  it("explains the empty state when nothing is budgeted", () => {
    const { container } = draw(status({ overall: null, overCount: 0, lines: [line("c4", "Shopping", null, 900000)] }));
    expect(screen.getByText(/No budget for November 2026 yet/)).toBeTruthy(); expect(card(container, "Budget").textContent.replace(/\u00a0/g, " ")).toContain("Not set"); expect(screen.getByRole("button", { name: "Set an overall budget" })).toBeTruthy();
  });
});
describe("budget page: pace", () => {
  it("current month: spend per day for the rest of the month, and where this month is heading", () => {
    expect(norm(paceText(status()))).toBe("You can spend about BDT 650.00 a day for the rest of the month. At this pace you will spend BDT 100,909.09, BDT 50,909.09 over.");
    const calm = status({ overall: { ...status().overall, projectedMinor: 4500000 } }); expect(norm(paceText(calm))).toContain("At this pace you will spend BDT 45,000.00.");
  });
  it("says how far over you are, and ends a past month with its final result", () => {
    expect(norm(paceText(status({ overall: { ...status().overall, remainingMinor: -250000, status: "over" } })))).toContain("You are BDT 2,500.00 over budget.");
    expect(norm(paceText(status({ month: "2026-10" })))).toBe("Final result: BDT 37,000.00 spent of BDT 50,000.00."); expect(paceText(status({ month: "2026-12" }))).toBe("Planned for December 2026.");
    expect(paceText(status({ overall: null }))).toBe("");
  });
  it("shows the sentence on the page", () => { draw(); expect(screen.getByText(/You can spend about BDT\s650\.00 a day/)).toBeTruthy(); });
});
describe("budget page: category table", () => {
  it("lists every category with its budget, spending, what is left and its status", () => {
    draw(); const rows = (n) => screen.getAllByText(n)[0].closest("tr");
    expect(rows("Food").textContent.replace(/\u00a0/g, " ")).toContain("15,000.00"); expect(rows("Food").textContent.replace(/\u00a0/g, " ")).toContain("Over by BDT 3,000.00"); expect(within(rows("Food")).getByText("Over budget")).toBeTruthy();
    expect(within(rows("Housing")).getByText("Near limit")).toBeTruthy(); expect(within(rows("Transportation")).getByText("On track")).toBeTruthy();
    expect(rows("Shopping").textContent.replace(/\u00a0/g, " ")).toContain("No budget"); expect(within(rows("Shopping")).getByRole("button", { name: "Set budget" })).toBeTruthy();
  });
  it("draws a bar for each budget, full (not beyond) when over", () => {
    draw(); const bar = (n) => screen.getAllByRole("progressbar", { name: `${n} budget used` })[0];
    expect(bar("Food").getAttribute("aria-valuenow")).toBe("100"); expect(bar("Housing").getAttribute("aria-valuenow")).toBe("85"); expect(bar("Transportation").getAttribute("aria-valuenow")).toBe("30");
    expect(screen.queryByRole("progressbar", { name: "Shopping budget used" })).toBeNull();
  });
  it("marks an archived category and shows its Bengali name", () => {
    draw(status({ lines: [line("c9", "Old", 100000, 0, { archived: true, nameBn: "পুরাতন" })] })); expect(screen.getAllByText("Archived").length).toBeGreaterThan(0); expect(screen.getAllByText("পুরাতন").length).toBeGreaterThan(0);
  });
});
describe("budget bar", () => {
  it("clamps to 0 to 100% and colours by status", () => {
    const { container, rerender } = render(<BudgetBar percent={250} status="over" />); const bar = () => container.querySelector("[role=progressbar]");
    expect(bar().getAttribute("aria-valuenow")).toBe("100"); expect(bar().firstChild.className).toContain("bg-danger"); expect(bar().firstChild.style.width).toBe("100%");
    rerender(<BudgetBar percent={-5} status="ok" />); expect(bar().getAttribute("aria-valuenow")).toBe("0"); expect(bar().firstChild.className).toContain("bg-brand");
    rerender(<BudgetBar percent={85} status="warning" />); expect(bar().firstChild.className).toContain("bg-amber-500");
  });
});
describe("budget page: months", () => {
  it("moves a month at a time through the URL, so the server loads that month once", async () => {
    draw(); const u = userEvent.setup(); expect(screen.getByText("November 2026", { selector: "span[aria-live]" })).toBeTruthy(); expect(screen.queryByRole("button", { name: "This month" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Previous month" })); expect(nav.replace).toHaveBeenLastCalledWith("/cash/budget?month=2026-10", { scroll: false });
    await u.click(screen.getByRole("button", { name: "Next month" })); expect(nav.replace).toHaveBeenLastCalledWith("/cash/budget?month=2026-12", { scroll: false });
  });
  it("offers a way back to this month from another month, and drops the month from the URL", async () => {
    nav.search = "month=2026-10"; nav.search = "month=2026-10"; draw(status({ month: "2026-10" })); await userEvent.setup().click(screen.getByRole("button", { name: "This month" }));
    expect(nav.replace).toHaveBeenLastCalledWith("/cash/budget", { scroll: false });
  });
});
describe("budget page: set, change and stop", () => {
  it("sets a category budget from a chosen month", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup();
    await u.click(screen.getAllByRole("button", { name: "Set budget" })[0]); const dlg = screen.getByRole("dialog"); expect(within(dlg).getByText("Set budget")).toBeTruthy();
    await u.click(within(dlg).getByRole("combobox", { name: "Budget for" })); await u.click(screen.getByRole("option", { name: /Food/ }));
    expect(within(dlg).getByText(/Spent so far in November 2026/).textContent.replace(/\u00a0/g, " ")).toContain("18,000.00");
    await u.type(within(dlg).getByLabelText("Monthly limit (BDT)"), "20000");
    await u.click(within(dlg).getByRole("combobox", { name: "Applies from" })); await u.click(screen.getByRole("option", { name: /December 2026/ }));
    await u.click(within(dlg).getByRole("button", { name: "Save budget" })); await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock).toHaveBeenCalledWith("/api/budgets", { method: "PUT", body: { categoryId: "c1", month: "2026-12", amountMinor: 2000000 } }); await waitFor(() => expect(nav.refresh).toHaveBeenCalled());
  });
  it("sets the overall monthly budget with no category", async () => {
    apiMock.mockResolvedValue({}); draw(status({ overall: null })); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Set an overall budget" })); const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByRole("combobox", { name: "Budget for" }).textContent.replace(/\u00a0/g, " ")).toContain("Overall monthly budget");
    await u.type(within(dlg).getByLabelText("Monthly limit (BDT)"), "50000"); await u.click(within(dlg).getByRole("button", { name: "Save budget" })); await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][1].body).toEqual({ categoryId: null, month: "2026-11", amountMinor: 5000000 });
  });
  it("changes an existing budget with the amount filled in and the category locked", async () => {
    draw(); await userEvent.setup().click(screen.getAllByRole("button", { name: "Edit Food budget" })[0]); const dlg = screen.getByRole("dialog");
    expect(within(dlg).getByText("Change budget")).toBeTruthy(); expect(within(dlg).getByLabelText("Monthly limit (BDT)").value).toBe("15000"); expect(within(dlg).getByRole("combobox", { name: "Budget for" }).disabled).toBe(true);
  });
  it("starts a budget from a category row with that category chosen and locked", async () => {
    draw(); const row = screen.getAllByText("Shopping")[0].closest("tr"); await userEvent.setup().click(within(row).getByRole("button", { name: "Set budget" }));
    const dlg = screen.getByRole("dialog"); expect(within(dlg).getByRole("combobox", { name: "Budget for" }).textContent.replace(/\u00a0/g, " ")).toContain("Shopping"); expect(within(dlg).getByRole("combobox", { name: "Budget for" }).disabled).toBe(true);
  });
  it("validates the amount before sending anything", async () => {
    draw(); const u = userEvent.setup(); await u.click(screen.getAllByRole("button", { name: "Edit Food budget" })[0]); const dlg = screen.getByRole("dialog");
    await u.clear(within(dlg).getByLabelText("Monthly limit (BDT)")); await u.type(within(dlg).getByLabelText("Monthly limit (BDT)"), "0"); await u.click(within(dlg).getByRole("button", { name: "Save budget" }));
    expect(await within(dlg).findByText("Must be more than zero")).toBeTruthy(); expect(apiMock).not.toHaveBeenCalled();
  });
  it("stops a category budget after a confirmation", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup(); await u.click(screen.getAllByRole("button", { name: "Stop Food budget" })[0]);
    expect(screen.getByText(/no budget from November 2026 onward/)).toBeTruthy(); expect(apiMock).not.toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: "Stop budget" })); await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/budgets?month=2026-11&categoryId=c1", { method: "DELETE" }));
  });
  it("stops the overall budget without a category in the URL", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup(); await u.click(screen.getByRole("button", { name: "Stop overall budget" })); await u.click(screen.getByRole("button", { name: "Stop budget" }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/budgets?month=2026-11", { method: "DELETE" }));
  });
});

describe("expense form: budget hint", () => {
  const hint = { name: "Food", budgetMinor: 1500000, spentMinor: 1000000, month: "2026-11" };
  const view = (p) => render(<BudgetHint hint={hint} categoryId="c1" date="2026-11-10" {...p} />);
  it("shows what is left before an amount is typed", () => { expect(view({}).container.textContent.replace(/\u00a0/g, " ")).toMatch(/Food budget: BDT 5,000\.00 left of BDT 15,000\.00 this month\./); });
  it("shows what will be left after this expense, or warns in red when it goes over", () => {
    expect(view({ amountMinor: 300000 }).container.textContent.replace(/\u00a0/g, " ")).toContain("After this, BDT 2,000.00 will be left in the Food budget (BDT 15,000.00 a month).");
    cleanup(); const { container } = view({ amountMinor: 700000 }); expect(container.textContent.replace(/\u00a0/g, " ")).toContain("This puts Food BDT 2,000.00 over its monthly budget of BDT 15,000.00."); expect(container.querySelector("p.text-danger")).not.toBeNull();
  });
  it("says so when the category is already over", () => { expect(view({ hint: { ...hint, spentMinor: 1600000 } }).container.textContent.replace(/\u00a0/g, " ")).toContain("Food is already BDT 1,000.00 over its monthly budget."); });
  it("stays quiet for another month, or when the category has no budget", () => { expect(view({ date: "2026-10-31" }).container.textContent.replace(/\u00a0/g, " ")).toBe(""); cleanup(); expect(view({ hint: undefined }).container.textContent.replace(/\u00a0/g, " ")).toBe(""); });
  it("when editing, adds the old amount back because it is already counted as spent", () => {
    const tx = { categoryId: "c1", amountMinor: 400000, date: "2026-11-05T00:00:00.000Z" };
    expect(view({ tx, amountMinor: 400000 }).container.textContent.replace(/\u00a0/g, " ")).toContain("After this, BDT 5,000.00 will be left");   // 15,000 - (10,000 - 4,000) - 4,000
    cleanup(); expect(view({ tx: { ...tx, categoryId: "c2" }, amountMinor: 400000 }).container.textContent.replace(/\u00a0/g, " ")).toContain("After this, BDT 1,000.00 will be left");   // a different category's expense is not added back
  });
  it("appears in the real form once a category with a budget is chosen, and reacts to the amount", async () => {
    const cats = [{ id: "c1", nameEn: "Food" }, { id: "c2", nameEn: "Rent" }]; const acc = [{ id: "a1", name: "Wallet", type: "cash", status: "active", active: true, balanceMinor: 9999999 }];
    render(<TransactionForm kind="expense" tx={null} accounts={acc} categories={cats} budgetHints={{ c1: { ...hint, month: currentMonth() } }} onClose={() => {}} onSaved={() => {}} />); const u = userEvent.setup();
    expect(norm(document.body.textContent)).not.toContain("Food budget");
    await u.click(screen.getByRole("combobox", { name: "Category" })); await u.click(screen.getByRole("option", { name: "Food" }));
    expect(norm(document.body.textContent)).toContain("Food budget: BDT 5,000.00 left");
    await u.type(screen.getByLabelText("Amount (BDT)"), "7000"); expect(norm(document.body.textContent)).toContain("This puts Food BDT 2,000.00 over");
    await u.click(screen.getByRole("combobox", { name: "Category" })); await u.click(screen.getByRole("option", { name: "Rent" })); expect(norm(document.body.textContent)).not.toContain("budget:");
  });
  it("is not part of the income form", () => {
    render(<TransactionForm kind="income" tx={null} accounts={[{ id: "a1", name: "Wallet", type: "cash", status: "active", active: true, balanceMinor: 1 }]} categories={[{ id: "c1", nameEn: "Salary" }]} budgetHints={{ c1: { ...hint, month: currentMonth() } }} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.queryByText(/budget/i)).toBeNull();
  });
});

describe("dashboard budget panel", () => {
  it("lists the overall budget and the most-used category budgets, with a link to the page", () => {
    render(<BudgetPanel budget={status()} />); expect(screen.getByText("Overall")).toBeTruthy(); expect(screen.getByText("Food")).toBeTruthy(); expect(screen.queryByText("Shopping")).toBeNull();
    expect(screen.getAllByRole("progressbar")).toHaveLength(4); expect(screen.getByRole("link", { name: "View all budgets" }).getAttribute("href")).toBe("/cash/budget");
  });
  it("shows at most the top four categories", () => {
    const many = status({ lines: ["A", "B", "C", "D", "E", "F"].map((n, i) => line(`x${i}`, n, 100000, 10000 * (i + 1))) }); render(<BudgetPanel budget={many} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(5);   // overall + 4
  });
  it("invites you to set a budget when there is none", () => {
    render(<BudgetPanel budget={status({ overall: null, lines: [line("c4", "Shopping", null, 900000)] })} />); expect(screen.getByText(/No budget set for November 2026/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Set a monthly budget" }).getAttribute("href")).toBe("/cash/budget");
  });
  const dash = { range: { from: "2026-11-01", to: "2026-11-30", group: "day" }, totals: { incomeMinor: 0, expenseMinor: 0, netMinor: 0 }, cashFlow: [], monthly: [], balances: { cashMinor: 0, bankMinor: 0, mobileMinor: 0, availableMinor: 0 }, loans: { lentOutstandingMinor: 0, borrowedOutstandingMinor: 0, overdueCount: 0 }, netWorthMinor: 0, accounts: [], recent: [], upcoming: [] };
  it("is a panel on the cash dashboard only when budget data is given", () => {
    render(<DashboardView data={dash} preset="month" accounts={[]} categories={{ income: [], expense: [] }} budget={status()} />); expect(screen.getByRole("heading", { name: "Budget this month" })).toBeTruthy();
    cleanup(); render(<DashboardView data={dash} preset="month" accounts={[]} categories={{ income: [], expense: [] }} />); expect(screen.queryByRole("heading", { name: "Budget this month" })).toBeNull();
  });
});
describe("?month= in the URL", () => {
  it("accepts a valid month and falls back to the current month for anything else", () => {
    expect(resolveMonth({ month: "2026-03" })).toBe("2026-03"); expect(resolveMonth({ month: ["2026-04", "x"] })).toBe("2026-04");
    for (const bad of [{}, { month: "2026-13" }, { month: "2026-3" }, { month: "1999-12" }, { month: "2101-01" }, { month: "nope" }, { month: "" }]) expect(resolveMonth(bad)).toBe(currentMonth());
  });
});
