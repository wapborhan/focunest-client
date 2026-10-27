// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
let path = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => path }));
import Sidebar from "@/components/Sidebar";
afterEach(cleanup);
const btn = (n) => screen.getByRole("button", { name: new RegExp(n) });
const link = (n) => screen.queryByRole("link", { name: new RegExp(n) });

describe("Sidebar", () => {
  it("expands the parent that matches the route, highlights the active link, and collapses the rest", () => {
    path = "/cash/income"; render(<Sidebar />);
    expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("true");
    expect(link("^Income")).toHaveProperty("ariaCurrent", "page");
    expect(link("Expenses").getAttribute("aria-current")).toBeNull();
    expect(link("^Accounts").getAttribute("aria-current")).toBeNull();
  });
  it("stays expanded with the right link active on a detail URL (refresh-safe)", () => {
    path = "/cash/accounts/64b0c0ffee"; render(<Sidebar />);
    expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("true");
    expect(link("^Accounts").getAttribute("aria-current")).toBe("page");
    expect(link("^Income").getAttribute("aria-current")).toBeNull();
  });
  it("keeps every group closed on a top-level page", () => {
    path = "/ibadat"; render(<Sidebar />);
    expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("false");
    expect(link("Ibadat").getAttribute("aria-current")).toBe("page");
  });
  it("toggles the open parent closed and open again on click", async () => {
    path = "/cash/income"; render(<Sidebar />); const u = userEvent.setup();
    await u.click(btn("Cash Management")); expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("false"); expect(link("^Income")).toBeNull();   // collapsed items are hidden from assistive tech
    await u.click(btn("Cash Management")); expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("true");
  });
  it("follows the route when the URL changes", () => {
    path = "/ibadat"; const { rerender } = render(<Sidebar />);
    path = "/cash/expenses"; rerender(<Sidebar />);
    expect(btn("Cash Management").getAttribute("aria-expanded")).toBe("true");
  });
  it("calls onNavigate when a link is chosen so the mobile drawer can close", async () => {
    path = "/cash/income"; const onNavigate = vi.fn(); render(<Sidebar onNavigate={onNavigate} />);
    await userEvent.setup().click(link("Expenses")); expect(onNavigate).toHaveBeenCalledTimes(1);
  });
  it("is keyboard reachable: group toggles are real buttons wired to their panel", async () => {
    path = "/cash/income"; render(<Sidebar />); const b = btn("Cash Management");
    expect(b.tagName).toBe("BUTTON"); expect(b.getAttribute("aria-controls")).toBe("sub-cash");
    b.focus(); await userEvent.setup().keyboard("{Enter}"); expect(b.getAttribute("aria-expanded")).toBe("false");
  });
});
