/**
 * UK-locale money display — the ONLY way currency is rendered in the UI.
 * money(400)   → "£400"
 * money(-1500) → "−£1,500"   (proper minus sign, before the £)
 */
export function money(n: number): string {
  const sign = n < 0 ? "\u2212" : "";
  return `${sign}\u00a3${Math.abs(n).toLocaleString("en-GB")}`;
}

/** Signed variant for deltas/stakes: moneyDelta(400) → "+£400", moneyDelta(-400) → "−£400" */
export function moneyDelta(n: number): string {
  return n >= 0 ? `+${money(n)}` : money(n);
}

/** English ordinal: 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd" */
export function ordinal(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = Math.abs(n) % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}
