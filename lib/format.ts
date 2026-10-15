// money(400) -> "£400", money(-1500) -> "−£1,500"
export function money(n: number): string {
  const sign = n < 0 ? "\u2212" : "";
  return `${sign}\u00a3${Math.abs(n).toLocaleString("en-GB")}`;
}

// always shows the sign: +£400 / −£400
export function moneyDelta(n: number): string {
  return n >= 0 ? `+${money(n)}` : money(n);
}

// Multipliers can be fractional (1.5 etc) so round to whole pounds. Used on
// both the server and the client so they always agree.
export function finalStake(wager: number, multiplier: number): number {
  return Math.round(wager * multiplier);
}

// 1st, 2nd, 3rd, 11th, 22nd...
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
