// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import Dialog from "@/components/Dialog";
import { flat, parseQuery } from "@/lib/search-params";
import { listTransactionsQuery } from "@/lib/schemas/transaction";
afterEach(cleanup);
Element.prototype.scrollIntoView = vi.fn();   // jsdom has no layout engine
const OPTIONS = [{ value: "", label: "All" }, { value: "cash", label: "Cash" }, { value: "bank", label: "Bank account", hint: "৳ 100" }, { value: "bkash", label: "bKash" }];
function Harness({ onChange = () => {} }) { const [v, setV] = useState(""); return <Select aria-label="Account" value={v} onChange={(x) => { setV(x); onChange(x); }} options={OPTIONS} />; }

describe("Select", () => {
  it("opens, filters as you type, and selects with the mouse", async () => {
    const onChange = vi.fn(); render(<Harness onChange={onChange} />); const u = userEvent.setup();
    await u.click(screen.getByRole("combobox", { name: "Account" }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
    await u.type(screen.getByLabelText("Search options"), "ban");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Bank account৳ 100"]);
    await u.click(screen.getByRole("option", { name: /Bank account/ }));
    expect(onChange).toHaveBeenCalledWith("bank"); expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Account" }).textContent).toContain("Bank account");
  });
  it("supports the keyboard: arrows, Enter, and Escape", async () => {
    const onChange = vi.fn(); render(<Harness onChange={onChange} />); const u = userEvent.setup();
    screen.getByRole("combobox").focus(); await u.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeTruthy();
    await u.keyboard("{ArrowDown}{ArrowDown}{Enter}"); expect(onChange).toHaveBeenCalledWith("bank");
    await u.click(screen.getByRole("combobox")); await u.keyboard("{Escape}"); expect(screen.queryByRole("listbox")).toBeNull();
  });
  it("closes when you click outside, and shows an empty state for no matches", async () => {
    render(<div><Harness /><button>outside</button></div>); const u = userEvent.setup();
    await u.click(screen.getByRole("combobox")); await u.type(screen.getByLabelText("Search options"), "zzz");
    expect(screen.getByText("No matches")).toBeTruthy();
    await u.click(screen.getByText("outside")); expect(screen.queryByRole("listbox")).toBeNull();
  });
});
describe("DatePicker", () => {
  it("shows a formatted date, picks from the calendar, and clears", async () => {
    const onChange = vi.fn(); render(<DatePicker aria-label="From" value="2026-03-10" clearable onChange={onChange} />); const u = userEvent.setup();
    expect(screen.getByRole("button", { name: "From" }).textContent).toContain("10 Mar 2026");
    await u.click(screen.getByRole("button", { name: "From" }));
    await u.click(await screen.findByRole("button", { name: /March 15th, 2026/ })); expect(onChange).toHaveBeenCalledWith("2026-03-15");
    await u.click(screen.getByRole("button", { name: "Clear date" })); expect(onChange).toHaveBeenCalledWith("");
  });
  it("shows the placeholder when empty", () => { render(<DatePicker aria-label="To" value="" placeholder="Any" onChange={() => {}} />); expect(screen.getByRole("button", { name: "To" }).textContent).toContain("Any"); });
});
describe("DataTable", () => {
  const columns = [
    { key: "t", header: "Title", role: "title", cell: (r) => r.title }, { key: "c", header: "Category", cell: (r) => r.cat },
    { key: "a", header: "Amount", align: "right", role: "amount", cell: (r) => r.amt }, { key: "x", role: "actions", cell: (r) => <button>Edit {r.title}</button> },
  ];
  const rows = [{ id: "1", title: "Rent", cat: "Housing", amt: "৳ 5,000" }, { id: "2", title: "Tea", cat: "Food", amt: "৳ 20" }];
  it("renders an accessible table and a card list from the same definition", () => {
    render(<DataTable columns={columns} rows={rows} caption="Expenses" />);
    const table = screen.getByRole("table", { hidden: true }); expect(within(table).getAllByRole("columnheader", { hidden: true }).map((h) => h.textContent)).toEqual(["Title", "Category", "Amount", "Actions"]);
    expect(within(table).getAllByRole("row", { hidden: true })).toHaveLength(3);
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(2);       // phone cards
    expect(screen.getAllByText("Housing")).toHaveLength(2);                           // once per layout
  });
  it("shows the empty state, and marks itself busy while loading", () => {
    const { rerender, container } = render(<DataTable columns={columns} rows={[]} empty={<p>Nothing here</p>} />); expect(screen.getByText("Nothing here")).toBeTruthy();
    rerender(<DataTable columns={columns} rows={rows} loading />); expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
  });
});
describe("Pagination", () => {
  it("reports the range and moves between pages", async () => {
    const onPage = vi.fn(); render(<Pagination page={2} total={40} limit={15} onPage={onPage} />); const u = userEvent.setup();
    expect(screen.getByText(/16–30/)).toBeTruthy(); await u.click(screen.getByRole("button", { name: /Next/ })); expect(onPage).toHaveBeenCalledWith(3);
    await u.click(screen.getByRole("button", { name: /Prev/ })); expect(onPage).toHaveBeenCalledWith(1);
  });
});
describe("URL filter parsing", () => {
  it("drops blanks, takes the first repeated value, and applies defaults", () => {
    expect(flat({ a: "1", b: "", c: ["x", "y"], d: undefined })).toEqual({ a: "1", c: "x" });
    const q = parseQuery(listTransactionsQuery, { from: "2026-03-01", page: "2" }, { kind: "income", limit: 15 });
    expect(q).toMatchObject({ kind: "income", from: "2026-03-01", page: 2, limit: 15, sort: "date", dir: "desc" });
  });
  it("falls back to defaults for tampered or invalid URLs instead of erroring", () => {
    const q = parseQuery(listTransactionsQuery, { from: "not-a-date", page: "-5", sort: "'; drop", categoryId: { $ne: "" } }, { kind: "expense", limit: 15 });
    expect(q).toMatchObject({ kind: "expense", page: 1, sort: "date" }); expect(q.from).toBeUndefined();
  });
});

import AccountSelect, { accountOptions } from "@/components/ui/AccountSelect";
import ProviderIcon from "@/components/ui/ProviderIcon";
import { BANKS, MFS_PROVIDERS, BANK_GROUPS, findBank } from "@/lib/banks";
import { accountMeta } from "@/lib/account-display";

const ACCOUNTS = [
  { id: "m1", type: "mobile", name: "Rahim Uddin", provider: "bKash", providerCode: "bkash", numberLabel: "01712345678", balanceMinor: 250000, status: "active", active: true },
  { id: "b1", type: "bank", name: "Rahim Uddin", provider: "Dutch-Bangla Bank PLC", providerCode: "dbbl", numberLabel: "••••7890", subtype: "saving", balanceMinor: 1000000, status: "active", active: true },
  { id: "c1", type: "cash", name: "Wallet", balanceMinor: 50000, status: "active" },
  { id: "m2", type: "mobile", name: "Old", provider: "Nagad", providerCode: "nagad", numberLabel: "01811111111", balanceMinor: 0, status: "active", active: false },
];
describe("bank and MFS lists", () => {
  it("has unique codes, every bank in a known group, and the well-known names", () => {
    const codes = [...BANKS, ...MFS_PROVIDERS].map((x) => x.code); expect(new Set(codes).size).toBe(codes.length);
    expect(BANKS.every((b) => BANK_GROUPS.includes(b.group) && b.short && b.name)).toBe(true); expect(BANKS.length).toBeGreaterThanOrEqual(50);
    expect(["dbbl", "brac", "ibbl", "sonali", "ebl"].every((c) => findBank(c))).toBe(true);
    expect(MFS_PROVIDERS.map((m) => m.name)).toEqual(expect.arrayContaining(["bKash", "Nagad", "Rocket", "Upay"]));
  });
});
describe("account picker", () => {
  it("groups by Cash, Bank accounts and Mobile banking, shows number and balance, and hides inactive accounts", () => {
    const o = accountOptions(ACCOUNTS);
    expect(o.map((x) => x.group)).toEqual(["Cash", "Bank accounts", "Mobile banking"]);
    expect(o[1]).toMatchObject({ label: "Dutch-Bangla Bank PLC", sub: "Rahim Uddin · A/C ••••7890 · Savings" }); expect(o[1].hint).toMatch(/10,000/);
    expect(o[2]).toMatchObject({ label: "bKash", sub: "Rahim Uddin · 01712345678" });
    expect(accountOptions(ACCOUNTS, { selected: "m2" }).some((x) => x.value === "m2")).toBe(true);   // an already-chosen inactive account stays visible
    expect(accountMeta(ACCOUNTS[2])).toEqual({ title: "Wallet", sub: "Cash in hand" });
  });
  it("searches by bank name, account number, mobile number and holder name", async () => {
    const u = userEvent.setup(); render(<AccountSelect aria-label="Received in" accounts={ACCOUNTS} value="" onChange={() => {}} />);
    await u.click(screen.getByRole("combobox")); expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByText("Bank accounts")).toBeTruthy();
    const box = screen.getByLabelText("Search options");
    await u.type(box, "7890"); expect(screen.getAllByRole("option")).toHaveLength(1);
    await u.clear(box); await u.type(box, "0171"); expect(screen.getAllByRole("option")[0].textContent).toContain("bKash");
    await u.clear(box); await u.type(box, "rahim"); expect(screen.getAllByRole("option")).toHaveLength(2);
  });
  it("supports an All option for filters", async () => {
    const onChange = vi.fn(); const u = userEvent.setup(); render(<AccountSelect aria-label="Account" accounts={ACCOUNTS} all="All accounts" value="b1" onChange={onChange} />);
    await u.click(screen.getByRole("combobox")); await u.click(screen.getByRole("option", { name: "All accounts" })); expect(onChange).toHaveBeenCalledWith("");
  });
});
describe("ProviderIcon", () => {
  it("renders a short-code badge for known providers and an initial for unknown ones", () => {
    const { container, rerender } = render(<ProviderIcon kind="bank" code="dbbl" />); expect(container.textContent).toBe("DBBL");
    rerender(<ProviderIcon kind="mobile" code="bkash" />); expect(container.textContent).toBe("bK");
    rerender(<ProviderIcon kind="bank" code="other" name="Rural Co-op" />); expect(container.textContent).toBe("R");
    rerender(<ProviderIcon kind="cash" />); expect(container.querySelector("svg")).toBeTruthy();
  });
});

describe("Dialog", () => {
  it("renders in <body>, outside page content, so animated parents can't shrink its backdrop", async () => {
    const onClose = vi.fn(); const { container } = render(<main className="animate-fade-up"><Dialog title="Add thing" onClose={onClose}><input aria-label="Name" /></Dialog></main>);
    const dialog = screen.getByRole("dialog", { name: "Add thing" });
    expect(container.contains(dialog)).toBe(false); expect(document.body.contains(dialog)).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText("Name"));
    await userEvent.setup().keyboard("{Escape}"); expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole("button", { name: "Close" })); expect(onClose).toHaveBeenCalledTimes(2);
  });
});
