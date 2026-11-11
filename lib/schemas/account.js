import { z } from "zod";
import { findBank, findMfs, OTHER } from "../banks";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !isNaN(d) && d.toISOString().slice(0, 10) === s; }, "Not a real date");
/** "+880 1712-345678", "8801712345678" and "1712345678" all become "01712345678". */
export const normalizeMobile = (s) => { let d = String(s).replace(/\D/g, ""); if (d.startsWith("880") && d.length === 13) d = `0${d.slice(3)}`; else if (d.length === 10 && d.startsWith("1")) d = `0${d}`; return d; };
const mobile = z.string().trim().transform(normalizeMobile).pipe(z.string().regex(/^01[3-9]\d{8}$/, "Enter a valid mobile number (01XXXXXXXXX)"));
const bankNo = z.string().trim().transform((s) => s.replace(/\s+/g, "")).pipe(z.string().regex(/^[A-Za-z0-9-]{5,30}$/, "Enter a valid account number"));
const cardNo = z.string().trim().transform((s) => s.replace(/[\s-]/g, "")).pipe(z.string().regex(/^\d{4,19}$/, "Enter the card number, or just its last 4 digits"));
const name = z.string().trim().min(1, "Enter a name").max(60);
const code = z.string().regex(/^[a-z0-9-]{2,40}$/, "Choose a provider");
const provider = z.string().trim().min(1, "Required").max(80);
const sharedOptional = { notes: z.string().trim().max(500).optional(), allowNegative: z.boolean().optional() };
const opening = { openingBalanceMinor: z.number().int().min(0).max(1e13), openingDate: ymd };
const bankExtras = { branch: z.string().trim().max(80).optional(), routingNumber: z.string().trim().regex(/^(\d{9})?$/, "Routing number is 9 digits").optional() };

/** The provider code must come from our list, or be "other" with a typed name. */
const checkProvider = (type) => (v, ctx) => {
  if (v.providerCode === undefined || v.providerCode === OTHER) return;
  if (!(type === "bank" ? findBank : findMfs)(v.providerCode)) ctx.addIssue({ code: "custom", path: ["providerCode"], message: "Unknown provider" });
};
const checkCard = (v, ctx) => { if (!!v.cardType !== !!v.cardNumber) ctx.addIssue({ code: "custom", path: [v.cardType ? "cardNumber" : "cardType"], message: v.cardType ? "Enter the card number" : "Choose the card type" }); };

const create = {
  cash: z.object({ type: z.literal("cash"), name, ...opening, ...sharedOptional }).strict(),
  bank: z.object({ type: z.literal("bank"), name, provider, providerCode: code, identifier: bankNo, subtype: z.enum(["saving", "current"]), ...bankExtras, cardType: z.enum(["debit", "credit"]).optional(), cardNumber: cardNo.optional(), ...opening, ...sharedOptional }).strict().superRefine(checkProvider("bank")).superRefine(checkCard),
  mobile: z.object({ type: z.literal("mobile"), name, provider, providerCode: code, identifier: mobile, active: z.boolean().optional(), ...opening, ...sharedOptional }).strict().superRefine(checkProvider("mobile")),
};
const status = z.enum(["active", "archived"]);
const update = {
  cash: z.object({ name, ...opening, ...sharedOptional, status }).partial().strict(),
  bank: z.object({ name, provider, providerCode: code, identifier: bankNo, subtype: z.enum(["saving", "current"]), ...bankExtras, cardType: z.enum(["debit", "credit"]).nullable(), cardNumber: cardNo, ...opening, ...sharedOptional, status }).partial().strict().superRefine(checkProvider("bank")),
  mobile: z.object({ name, provider, providerCode: code, identifier: mobile, active: z.boolean(), ...opening, ...sharedOptional, status }).partial().strict().superRefine(checkProvider("mobile")),
};
const nonEmpty = (v) => Object.keys(v).length > 0;
export function parseCreateAccount(raw) {
  const { type } = z.object({ type: z.enum(["cash", "bank", "mobile"]) }).passthrough().parse(raw ?? {});
  return create[type].parse(raw);
}
export const parseUpdateAccount = (type, raw) => update[type].refine(nonEmpty, { message: "Nothing to update" }).parse(raw);
export const listAccountsQuery = z.object({ type: z.enum(["cash", "bank", "mobile"]).optional(), status: z.enum(["active", "archived"]).optional() });
export const historyQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
