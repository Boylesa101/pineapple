// Brand colours arrive as hex (#1c1917, #fff) or RGB (rgb(28, 25, 23) or "28, 25, 23").
// They're always stored as lower-case 6-digit hex.

export function toHex(input: string): string | null {
  const s = input.trim().toLowerCase();
  const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
    return `#${h}`;
  }
  const rgb = s.match(/^(?:rgba?\()?\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)?$/);
  if (rgb) {
    const parts = rgb.slice(1, 4).map(Number);
    if (parts.some((n) => n > 255)) return null;
    return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

export function toRgb(hex: string): string {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}
