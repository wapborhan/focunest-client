// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("recharts", async () => { const React = await import("react"); const C = ({ children }) => React.createElement("div", null, children); return { ResponsiveContainer: C, BarChart: C, LineChart: C, Bar: C, Line: C, XAxis: C, YAxis: C, Tooltip: C, Legend: C, CartesianGrid: C, ReferenceLine: C }; });
const apiMock = vi.fn();
vi.mock("@/lib/client-api", () => ({ api: (...a) => apiMock(...a) }));
import DashboardView from "@/components/DashboardView";
import CategoriesView from "@/components/CategoriesView";
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); apiMock.mockReset(); });

const dash = {
  range: { from: "2026-10-01", to: "2026-10-31", group: "day" }, totals: { incomeMinor: 9700000, expenseMinor: 3250000, netMinor: 6450000 },
  cashFlow: [{ period: "2026-10-01", incomeMinor: 0, expenseMinor: 0, netMinor: 0 }], monthly: [{ period: "2026-10", incomeMinor: 0, expenseMinor: 0, netMinor: 0 }],
  balances: { cashMinor: 1250000, bankMinor: 24550000, mobileMinor: 2470000, availableMinor: 28270000 }, loans: { lentOutstandingMinor: 500000, borrowedOutstandingMinor: 120000, overdueCount: 1 },
  netWorthMinor: 28650000, accounts: [], recent: [], upcoming: [],
};
describe("cash dashboard (/cash/dashboard)", () => {
  const draw = () => render(<DashboardView data={dash} preset="month" accounts={[]} categories={{ income: [], expense: [] }} />);
  const TITLES = ["Total income", "Total expenses", "Total balance", "Cash balance", "Bank balance", "Mobile banking balance", "Total lent", "Total borrowed"];
  it("shows the eight summary cards, in order", () => {
    const { container } = draw(); const cards = [...container.querySelectorAll(".card-hover")];
    expect(cards.map((c) => c.querySelector("p").textContent)).toEqual(TITLES);
  });
  it("fills them with the right figures: total balance is cash + bank + mobile banking", () => {
    const { container } = draw(); const v = (t) => [...container.querySelectorAll(".card-hover")].find((c) => c.querySelector("p").textContent === t).textContent;
    expect(v("Total income")).toContain("97,000.00"); expect(v("Total expenses")).toContain("32,500.00"); expect(v("Total balance")).toContain("282,700.00");
    expect(v("Cash balance")).toContain("12,500.00"); expect(v("Bank balance")).toContain("245,500.00"); expect(v("Mobile banking balance")).toContain("24,700.00");
    expect(v("Total lent")).toContain("5,000.00"); expect(v("Total borrowed")).toContain("1,200.00");
    expect(12500 + 245500 + 24700).toBe(282700);
  });
  it("has the period filter", () => {
    draw(); for (const n of ["Today", "This week", "This month", "This year", "Custom"]) expect(screen.getByRole("button", { name: n })).toBeTruthy();
    expect(screen.getByRole("button", { name: "This month" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("has quick actions for income, expense, lending and borrowing, but transfers live under Cash Management", () => {
    draw(); for (const n of ["Add income", "Add expense", "Add lending", "Add borrowing"]) expect(screen.getByRole("button", { name: n })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Transfer/ })).toBeNull();
  });
});

const cat = (id, kind, nameEn, extra = {}) => ({ id, kind, nameEn, nameBn: undefined, isDefault: true, archived: false, used: 0, ...extra });
const cats = { income: [cat("i1", "income", "Salary", { used: 3 }), cat("i2", "income", "Business")], expense: [cat("e1", "expense", "Food"), cat("e2", "expense", "Rent", { archived: true })] };
describe("income and expense categories management", () => {
  const draw = () => render(<CategoriesView categories={cats} initialKind="income" />);
  it("has an Income and an Expense tab and shows each kind's categories", async () => {
    draw(); const u = userEvent.setup();
    expect(screen.getAllByText("Salary").length).toBeGreaterThan(0); expect(screen.queryByText("Food")).toBeNull();
    await u.click(screen.getByRole("tab", { name: /Expense categories/ }));
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0); expect(screen.queryByText("Salary")).toBeNull();
  });
  it("adds a category of the current kind", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "Add income category" })); await u.type(screen.getByLabelText(/Name \(English\)/), "Zakat");
    await u.click(screen.getByRole("button", { name: /^Save/ })); await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][0]).toBe("/api/categories"); expect(apiMock.mock.calls[0][1].body).toMatchObject({ kind: "income", nameEn: "Zakat" });
  });
  it("renames a category", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup();
    await u.click(screen.getAllByRole("button", { name: "Edit Salary" })[0]);
    const name = screen.getByLabelText(/Name \(English\)/); await u.clear(name); await u.type(name, "Monthly salary");
    await u.click(screen.getByRole("button", { name: /^Save/ })); await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][0]).toBe("/api/categories/i1"); expect(apiMock.mock.calls[0][1]).toMatchObject({ method: "PATCH", body: { nameEn: "Monthly salary" } });
  });
  it("archives a category, and restores an archived one", async () => {
    apiMock.mockResolvedValue({}); draw(); const u = userEvent.setup();
    await u.click(screen.getAllByRole("button", { name: "Archive Business" })[0]);
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/categories/i2", { method: "PATCH", body: { archived: true } }));
    await u.click(screen.getByRole("tab", { name: /Expense categories/ })); expect(screen.queryByText("Rent")).toBeNull();   // archived ones are hidden by default
    await u.click(screen.getByRole("checkbox", { name: /Show archived/ })); await u.click(screen.getAllByRole("button", { name: "Restore Rent" })[0]);
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith("/api/categories/e2", { method: "PATCH", body: { archived: false } }));
  });
});
