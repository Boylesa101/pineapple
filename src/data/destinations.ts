import { countryNames } from '@/data/countries';

export type DestinationSuggestionType = 'country' | 'city' | 'town' | 'region';

export type DestinationSuggestion = {
  label: string;
  type: DestinationSuggestionType;
  searchKey: string;
};

const placeSuggestions: Array<{ label: string; type: DestinationSuggestionType }> = [
  { label: 'Amsterdam, Netherlands', type: 'city' },
  { label: 'Athens, Greece', type: 'city' },
  { label: 'Bali, Indonesia', type: 'region' },
  { label: 'Barcelona, Spain', type: 'city' },
  { label: 'Bath, United Kingdom', type: 'city' },
  { label: 'Berlin, Germany', type: 'city' },
  { label: 'Bordeaux, France', type: 'city' },
  { label: 'Boston, United States', type: 'city' },
  { label: 'Bruges, Belgium', type: 'city' },
  { label: 'Budapest, Hungary', type: 'city' },
  { label: 'Cape Town, South Africa', type: 'city' },
  { label: 'Cornwall, United Kingdom', type: 'region' },
  { label: 'Cotswolds, United Kingdom', type: 'region' },
  { label: 'Copenhagen, Denmark', type: 'city' },
  { label: 'Dubai, United Arab Emirates', type: 'city' },
  { label: 'Dublin, Ireland', type: 'city' },
  { label: 'Edinburgh, United Kingdom', type: 'city' },
  { label: 'Florence, Italy', type: 'city' },
  { label: 'Ibiza, Spain', type: 'region' },
  { label: 'Istanbul, Turkey', type: 'city' },
  { label: 'Keswick, United Kingdom', type: 'town' },
  { label: 'Krakow, Poland', type: 'city' },
  { label: 'Lake District, United Kingdom', type: 'region' },
  { label: 'Las Vegas, United States', type: 'city' },
  { label: 'Lisbon, Portugal', type: 'city' },
  { label: 'Liverpool, United Kingdom', type: 'city' },
  { label: 'London, United Kingdom', type: 'city' },
  { label: 'Los Angeles, United States', type: 'city' },
  { label: 'Madeira, Portugal', type: 'region' },
  { label: 'Madrid, Spain', type: 'city' },
  { label: 'Mallorca, Spain', type: 'region' },
  { label: 'Marrakech, Morocco', type: 'city' },
  { label: 'Milan, Italy', type: 'city' },
  { label: 'Munich, Germany', type: 'city' },
  { label: 'Naples, Italy', type: 'city' },
  { label: 'New York, United States', type: 'city' },
  { label: 'Nice, France', type: 'city' },
  { label: 'Osaka, Japan', type: 'city' },
  { label: 'Paris, France', type: 'city' },
  { label: 'Prague, Czech Republic', type: 'city' },
  { label: 'Reykjavik, Iceland', type: 'city' },
  { label: 'Rome, Italy', type: 'city' },
  { label: 'Salzburg, Austria', type: 'city' },
  { label: 'Santorini, Greece', type: 'region' },
  { label: 'Seville, Spain', type: 'city' },
  { label: 'Singapore, Singapore', type: 'city' },
  { label: 'Sydney, Australia', type: 'city' },
  { label: 'Tokyo, Japan', type: 'city' },
  { label: 'Toronto, Canada', type: 'city' },
  { label: 'Valencia, Spain', type: 'city' },
  { label: 'Venice, Italy', type: 'city' },
  { label: 'Vienna, Austria', type: 'city' },
  { label: 'Warsaw, Poland', type: 'city' },
  { label: 'Washington, United States', type: 'city' },
  { label: 'York, United Kingdom', type: 'city' },
];

export const destinationSuggestions: DestinationSuggestion[] = [
  ...countryNames.map((label) => ({
    label,
    type: 'country' as const,
    searchKey: label.toLowerCase(),
  })),
  ...placeSuggestions.map((entry) => ({
    ...entry,
    searchKey: entry.label.toLowerCase(),
  })),
];

export function searchDestinations(query: string, limit = 8) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return destinationSuggestions.filter((item) => item.type !== 'country').slice(0, limit);
  }

  const startsWith = destinationSuggestions.filter((item) => item.searchKey.startsWith(normalizedQuery));
  const includes = destinationSuggestions.filter(
    (item) => !item.searchKey.startsWith(normalizedQuery) && item.searchKey.includes(normalizedQuery)
  );

  return [...startsWith, ...includes].slice(0, limit);
}
