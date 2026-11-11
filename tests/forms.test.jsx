// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
const apiMock = vi.fn();
vi.mock("@/lib/client-api", () => ({ api: (...a) => apiMock(...a) }));
import TransactionForm from "@/components/TransactionForm";
import { LoanForm } from "@/components/LoanForms";
import AccountNumber from "@/components/ui/AccountNumber";
Element.prototype.scrollIntoView = vi.fn();
afterEach(() => { cleanup(); apiMock.mockReset(); });

const accounts = [
  { id: "a1", name: "Wallet", type: "cash", status: "active", active: true, balanceMinor: 1250000 },
  { id: "a2", name: "Rahim Uddin", type: "bank", provider: "Dutch-Bangla Bank PLC", providerCode: "dbbl", numberLabel: "••••890123", status: "active", active: true, balanceMinor: 17500000 },
];
const categories = [{ id: "c1", nameEn: "Food", nameBn: "খাবার" }];
const renderForm = (kind, tx = null) => render(<TransactionForm kind={kind} tx={tx} accounts={accounts} categories={categories} onClose={() => {}} onSaved={() => {}} />);

describe("expense form: available balance", () => {
  it("shows the selected account's balance directly under the amount", () => {
    renderForm("expense");
    const amount = screen.getByLabelText("Amount (BDT)"), note = screen.getByText(/Available balance in/);
    expect(note.textContent).toMatch(/Wallet.*12,500\.00/);
    expect(amount.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText("Expense title").compareDocumentPosition(note) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();   // and before the next field
  });
  it("warns when the amount is more than the balance", async () => {
    renderForm("expense"); const u = userEvent.setup();
    await u.type(screen.getByLabelText("Amount (BDT)"), "20000");
    expect(screen.getByText(/Not enough balance for this amount/)).toBeTruthy();
  });
  it("follows the chosen account", async () => {
    renderForm("expense"); const u = userEvent.setup();
    await u.click(screen.getByRole("combobox", { name: "Paid from" })); await u.click(screen.getByRole("option", { name: /Dutch-Bangla/ }));
    expect(screen.getByText(/Available balance in/).textContent).toMatch(/Dutch-Bangla Bank PLC.*175,000\.00/);
  });
  it("when editing, adds the old amount back, because it is already out of the balance", () => {
    renderForm("expense", { id: "t1", amountMinor: 300000, accountId: "a1", title: "Rent", categoryId: "c1", date: "2026-03-10T00:00:00.000Z" });
    expect(screen.getByText(/Available balance in/).textContent).toMatch(/15,500\.00/);
  });
  it("is not shown for income", () => { renderForm("income"); expect(screen.queryByText(/Available balance in/)).toBeNull(); });
});
describe("lending and borrowing form: address", () => {
  const fill = async (u, address) => {
    await u.type(screen.getByLabelText("Borrower's name"), "Rahim"); await u.type(screen.getByLabelText("Amount (BDT)"), "5000");
    if (address) await u.type(screen.getByLabelText(/Address/), address);
    await u.click(screen.getByRole("button", { name: "Add lending" }));
  };
  it("sends the address with the loan", async () => {
    apiMock.mockResolvedValue({}); render(<LoanForm direction="lent" accounts={accounts} onClose={() => {}} onSaved={() => {}} />);
    await fill(userEvent.setup(), "House 5, Road 3, Mirpur");
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][1].body).toMatchObject({ direction: "lent", counterparty: "Rahim", principalMinor: 500000, address: "House 5, Road 3, Mirpur" });
  });
  it("treats the address as optional, and borrowing has the field too", async () => {
    apiMock.mockResolvedValue({}); render(<LoanForm direction="borrowed" accounts={accounts} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByLabelText(/Address/)).toBeTruthy(); const u = userEvent.setup();
    await u.type(screen.getByLabelText("Lender's name"), "Karim"); await u.type(screen.getByLabelText("Amount (BDT)"), "100");
    await u.click(screen.getByRole("button", { name: "Add borrowing" }));
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    expect(apiMock.mock.calls[0][1].body.address).toBeUndefined();
  });
});
describe("bank account number", () => {
  const bank = { id: "a2", type: "bank", numberLabel: "••••890123" };
  it("shows the last 6 digits, reveals the full number on click, and hides it again", async () => {
    apiMock.mockResolvedValue({ accountNumber: "1234567890123" }); render(<AccountNumber account={bank} />); const u = userEvent.setup();
    expect(screen.getByText("••••890123")).toBeTruthy(); expect(document.body.textContent).not.toContain("1234567890123");
    await u.click(screen.getByRole("button", { name: "Show full account number" }));
    expect(await screen.findByText("1234567890123")).toBeTruthy(); expect(apiMock).toHaveBeenCalledWith("/api/accounts/a2/number");
    await u.click(screen.getByRole("button", { name: "Hide full account number" }));
    expect(screen.getByText("••••890123")).toBeTruthy(); expect(document.body.textContent).not.toContain("1234567890123");
  });
  it("hides the number again by itself after 20 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true }); apiMock.mockResolvedValue({ accountNumber: "1234567890123" });
    render(<AccountNumber account={bank} />); const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await u.click(screen.getByRole("button", { name: "Show full account number" })); expect(await screen.findByText("1234567890123")).toBeTruthy();
    await vi.advanceTimersByTimeAsync(20500); await waitFor(() => expect(document.body.textContent).not.toContain("1234567890123")); vi.useRealTimers();
  });
  it("shows a mobile number in full with no reveal button", () => {
    render(<AccountNumber account={{ id: "m1", type: "mobile", numberLabel: "01712345678" }} />);
    expect(screen.getByText("01712345678")).toBeTruthy(); expect(screen.queryByRole("button")).toBeNull();
  });
});
