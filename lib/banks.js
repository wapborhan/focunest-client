/**
 * Bangladeshi banks and mobile financial services (MFS).
 * Icons are generated badges (short code on a colour), not official logos.
 * To use an official logo: save it as public/logos/<code>.svg and add the code to LOGO_CODES.
 * Edit this file to add, rename or remove entries.
 */
export const OTHER = "other";
export const LOGO_CODES = new Set([]);
export const BANK_GROUPS = ["State-owned & specialised", "Private commercial", "Islamic", "Foreign"];
const S = BANK_GROUPS[0], P = BANK_GROUPS[1], I = BANK_GROUPS[2], F = BANK_GROUPS[3];
const b = (code, name, short, group) => ({ code, name, short, group });
export const BANKS = [
  b("sonali", "Sonali Bank PLC", "SBL", S), b("janata", "Janata Bank PLC", "JBL", S), b("agrani", "Agrani Bank PLC", "AGR", S), b("rupali", "Rupali Bank PLC", "RUP", S),
  b("basic", "BASIC Bank Limited", "BASIC", S), b("bdbl", "Bangladesh Development Bank Limited", "BDBL", S), b("bkb", "Bangladesh Krishi Bank", "BKB", S),
  b("rakub", "Rajshahi Krishi Unnayan Bank", "RAKUB", S), b("pkb", "Probashi Kallyan Bank", "PKB", S), b("avub", "Ansar-VDP Unnayan Bank", "AVUB", S), b("ksb", "Karmasangsthan Bank", "KSB", S),
  b("abbank", "AB Bank PLC", "AB", P), b("bankasia", "Bank Asia PLC", "BA", P), b("bcbl", "Bangladesh Commerce Bank", "BCBL", P), b("bengal", "Bengal Commercial Bank", "BCB", P),
  b("brac", "BRAC Bank PLC", "BRAC", P), b("city", "The City Bank PLC", "CITY", P), b("citizens", "Citizens Bank PLC", "CTZ", P), b("community", "Community Bank Bangladesh", "CBL", P),
  b("dhaka", "Dhaka Bank PLC", "DBL", P), b("dbbl", "Dutch-Bangla Bank PLC", "DBBL", P), b("ebl", "Eastern Bank PLC", "EBL", P), b("ific", "IFIC Bank PLC", "IFIC", P),
  b("jamuna", "Jamuna Bank PLC", "JAM", P), b("meghna", "Meghna Bank PLC", "MGBL", P), b("mercantile", "Mercantile Bank PLC", "MBL", P), b("midland", "Midland Bank PLC", "MID", P),
  b("modhumoti", "Modhumoti Bank PLC", "MMBL", P), b("mtb", "Mutual Trust Bank PLC", "MTB", P), b("nbl", "National Bank PLC", "NBL", P), b("ncc", "NCC Bank PLC", "NCC", P),
  b("nrb", "NRB Bank PLC", "NRBB", P), b("nrbc", "NRB Commercial Bank PLC", "NRBC", P), b("nrbg", "NRB Global Bank PLC", "NRBG", P), b("onebank", "ONE Bank PLC", "ONE", P),
  b("padma", "Padma Bank PLC", "PDM", P), b("premier", "Premier Bank PLC", "PBL", P), b("prime", "Prime Bank PLC", "PRM", P), b("pubali", "Pubali Bank PLC", "PUB", P),
  b("sbac", "South Bangla Agriculture and Commerce Bank", "SBAC", P), b("seb", "Southeast Bank PLC", "SEBL", P), b("shimanto", "Shimanto Bank PLC", "SHB", P),
  b("standard", "Standard Bank PLC", "STD", P), b("trust", "Trust Bank PLC", "TBL", P), b("ucb", "United Commercial Bank PLC", "UCB", P), b("union", "Union Bank PLC", "UNB", P), b("uttara", "Uttara Bank PLC", "UBL", P),
  b("aibl", "Al-Arafah Islami Bank PLC", "AIBL", I), b("exim", "EXIM Bank PLC", "EXIM", I), b("fsibl", "First Security Islami Bank PLC", "FSIB", I), b("gib", "Global Islami Bank PLC", "GIB", I),
  b("icbi", "ICB Islamic Bank", "ICBI", I), b("ibbl", "Islami Bank Bangladesh PLC", "IBBL", I), b("sjibl", "Shahjalal Islami Bank PLC", "SJIB", I), b("sibl", "Social Islami Bank PLC", "SIBL", I),
  b("scb", "Standard Chartered Bank", "SCB", F), b("hsbc", "HSBC", "HSBC", F), b("citi", "Citibank N.A.", "CITI", F), b("cbc", "Commercial Bank of Ceylon", "CBC", F), b("sbi", "State Bank of India", "SBI", F),
  b("habib", "Habib Bank Limited", "HBL", F), b("nbp", "National Bank of Pakistan", "NBP", F), b("woori", "Woori Bank", "WOORI", F), b("alfalah", "Bank Alfalah", "ALF", F),
];
export const MFS_PROVIDERS = [
  { code: "bkash", name: "bKash", short: "bK", color: "#E2136E" }, { code: "nagad", name: "Nagad", short: "N", color: "#F26B21" }, { code: "rocket", name: "Rocket", short: "R", color: "#8C3494" },
  { code: "upay", name: "Upay", short: "U", color: "#1C75BC" }, { code: "mcash", name: "mCash", short: "mC", color: "#0E8A4B" }, { code: "tap", name: "Tap", short: "T", color: "#E8890C" },
  { code: "surecash", name: "SureCash", short: "SC", color: "#1B6FA8" }, { code: "okwallet", name: "OK Wallet", short: "OK", color: "#D32F2F" }, { code: "mycash", name: "MyCash", short: "MC", color: "#D97706" },
  { code: "cellfin", name: "Cellfin", short: "CF", color: "#0F766E" }, { code: "pathaopay", name: "Pathao Pay", short: "PP", color: "#E4253F" },
];
export const findBank = (code) => BANKS.find((x) => x.code === code);
export const findMfs = (code) => MFS_PROVIDERS.find((x) => x.code === code);
const PALETTE = ["#0f766e", "#1d4ed8", "#7c3aed", "#b45309", "#be123c", "#0e7490", "#4d7c0f", "#a21caf", "#c2410c", "#334155"];
export const colorFor = (code = "") => PALETTE[[...code].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
