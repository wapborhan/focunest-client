import { route } from "@/lib/api";
import { listTransactionsQuery } from "@/lib/schemas/transaction";
import { listTransactions } from "@/lib/services/transactions";
import { toCsv } from "@/lib/csv";
import { toDhakaYmd } from "@/lib/dates";
export const GET = route(async ({ req, user }) => {
  const q = listTransactionsQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const { items } = await listTransactions(user.uid, q, { forExport: true });
  const csv = toCsv(["Date", "Type", "Title", "Category", "Account", "Amount (BDT)", "Payment method", "Reference", "Note"],
    items.map((t) => [toDhakaYmd(t.date), t.kind, t.title, t.categoryName, t.accountName, (t.amountMinor / 100).toFixed(2), t.paymentMethod, t.reference, t.note]));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${q.kind}-${toDhakaYmd(new Date())}.csv"`, "Cache-Control": "no-store" } });
});
