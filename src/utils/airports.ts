export function formatAirportDisplay(name: string, code?: string | null) {
  const trimmedName = name.trim();
  const trimmedCode = code?.trim() ?? '';

  if (!trimmedName) {
    return trimmedCode;
  }

  if (!trimmedCode) {
    return trimmedName;
  }

  if (trimmedName.toUpperCase().includes(`(${trimmedCode.toUpperCase()})`)) {
    return trimmedName;
  }

  return `${trimmedName} (${trimmedCode.toUpperCase()})`;
}
