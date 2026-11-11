// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: nav.replace, refresh: vi.fn() }), usePathname: () => "/dashboard", useSearchParams: () => new URLSearchParams() }));
import OverviewView from "@/components/OverviewView";
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); nav.replace.mockReset(); });
const data = { range: { from: "2026-11-01", to: "2026-11-30" }, totals: { incomeMinor: 9700000, expenseMinor: 3250000 }, balances: { availableMinor: 28270000 }, loans: { lentOutstandingMinor: 500000, borrowedOutstandingMinor: 120000, overdueCount: 0 } };
const draw = (preset = "month", d = data) => render(<OverviewView data={d} preset={preset} />);
const cards = (c) => [...c.querySelectorAll(".card-hover")];

describe("main dashboard (/dashboard)", () => {
  it("is five cards: income, expenses, total balance, lent, borrowed", () => {
    const { container } = draw();
    expect(cards(container).map((c) => c.querySelector("p").textContent)).toEqual(["Total income", "Total expenses", "Total balance", "Total lent", "Total borrowed"]);
  });
  it("shows the figures; income and expenses name the period, the rest say they are as of now", () => {
    const { container } = draw("year"); const [inc, exp, bal, lent, bor] = cards(container).map((c) => c.textContent);
    expect(inc).toContain("97,000.00"); expect(inc).toContain("This year"); expect(exp).toContain("32,500.00"); expect(exp).toContain("This year");
    expect(bal).toContain("282,700.00"); expect(bal).toContain("right now"); expect(lent).toContain("5,000.00"); expect(bor).toContain("1,200.00");
    cleanup(); expect(cards(draw("custom").container)[0].textContent).toContain("Custom period");
  });
  it("has the Today / This week / This month / This year / Custom filter, with the current one pressed", () => {
    draw("week"); const group = screen.getByRole("group", { name: "Date range" }); const buttons = [...group.querySelectorAll("button")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Today", "This week", "This month", "This year", "Custom"]);
    expect(buttons.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.textContent)).toEqual(["This week"]);
    expect(screen.getByText(/01 Nov 2026 – 30 Nov 2026/)).toBeTruthy();
  });
  it("changes the period with one URL update, so the server loads the new numbers once", async () => {
    draw(); const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: "This year" }));
    expect(nav.replace).toHaveBeenCalledTimes(1); expect(nav.replace).toHaveBeenCalledWith("/dashboard?preset=year", { scroll: false });
    await u.click(screen.getByRole("button", { name: "Today" })); expect(nav.replace).toHaveBeenLastCalledWith("/dashboard?preset=today", { scroll: false });
  });
  it("opens From and To date pickers for a custom range", async () => {
    const { rerender } = draw("month"); expect(screen.queryByRole("button", { name: "From date" })).toBeNull();
    rerender(<OverviewView data={data} preset="custom" />);
    expect(screen.getByRole("button", { name: "From date" })).toBeTruthy(); expect(screen.getByRole("button", { name: "To date" })).toBeTruthy();
  });
  it("has nothing else on it: no charts, tables, links or quick actions", () => {
    const { container } = draw();
    expect(container.querySelectorAll("table, a, canvas, [role=img]")).toHaveLength(0);
    expect(container.querySelectorAll("button")).toHaveLength(5);          // only the five filter buttons
  });
  it("shows a negative balance in red", () => {
    const { container } = draw("month", { ...data, balances: { availableMinor: -500 } }); expect(cards(container)[2].querySelector("p.text-danger")).not.toBeNull();
  });
});
