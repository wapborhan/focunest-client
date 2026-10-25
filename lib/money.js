/** All money is stored as integer poisha (1 BDT = 100). */
export const toMinor = (taka) => {
    if (!Number.isFinite(taka))
        throw new Error("Invalid amount");
    return Math.round(taka * 100);
};
export const fromMinor = (minor) => minor / 100;
export const formatBDT = (minor, locale = "en-BD") => new Intl.NumberFormat(locale, { style: "currency", currency: "BDT", minimumFractionDigits: 2 }).format(minor / 100);
