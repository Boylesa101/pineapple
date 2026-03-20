import { airportRecords, type AirportRecord } from './airports.generated';

export type AirportSuggestion = AirportRecord;

export function searchAirports(query: string, limit = 8) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return airportRecords.slice(0, limit);
  }

  const exactCode = airportRecords.filter((airport) => airport.code.toLowerCase() === normalized);
  const startsWith = airportRecords.filter(
    (airport) => airport.code.toLowerCase().startsWith(normalized) || airport.searchKey.startsWith(normalized)
  );
  const includes = airportRecords.filter(
    (airport) =>
      airport.code.toLowerCase() !== normalized &&
      !airport.code.toLowerCase().startsWith(normalized) &&
      !airport.searchKey.startsWith(normalized) &&
      airport.searchKey.includes(normalized)
  );

  return [...exactCode, ...startsWith, ...includes].slice(0, limit);
}
