/** Scale ingredient amount strings by a multiplier (best-effort parsing). */
export function scaleAmount(amount: string, multiplier: number): string {
  if (multiplier === 1 || !amount.trim()) return amount;
  const fracMatch = amount.match(/^(\d+)\s*\/\s*(\d+)(.*)$/);
  if (fracMatch) {
    const num = (Number(fracMatch[1]) / Number(fracMatch[2])) * multiplier;
    const rest = fracMatch[3] ?? '';
    return `${formatScaledNumber(num)}${rest}`;
  }
  const rangeMatch = amount.match(/^([\d.]+)\s*[-–]\s*([\d.]+)(.*)$/);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]) * multiplier;
    const b = Number(rangeMatch[2]) * multiplier;
    return `${formatScaledNumber(a)}–${formatScaledNumber(b)}${rangeMatch[3]}`;
  }
  const numMatch = amount.match(/^([\d.]+)(.*)$/);
  if (numMatch) {
    const n = Number(numMatch[1]) * multiplier;
    return `${formatScaledNumber(n)}${numMatch[2]}`;
  }
  if (multiplier !== 1) return `${amount} (×${multiplier})`;
  return amount;
}

function formatScaledNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.01) return String(Math.round(rounded));
  return String(rounded);
}
