import type { TransportType } from '@/types/models';

export type TransportProviderSuggestion = {
  type: TransportType;
  code: string;
  name: string;
  logoUrl: string | null;
  label: string;
  searchKey: string;
};

const providers: TransportProviderSuggestion[] = [
  { type: 'flight', code: 'BA', name: 'British Airways', logoUrl: 'https://logo.clearbit.com/britishairways.com', label: 'British Airways (BA)', searchKey: 'ba british airways uk london' },
  { type: 'flight', code: 'QR', name: 'Qatar Airways', logoUrl: 'https://logo.clearbit.com/qatarairways.com', label: 'Qatar Airways (QR)', searchKey: 'qr qatar airways doha' },
  { type: 'flight', code: 'EK', name: 'Emirates', logoUrl: 'https://logo.clearbit.com/emirates.com', label: 'Emirates (EK)', searchKey: 'ek emirates dubai' },
  { type: 'flight', code: 'LH', name: 'Lufthansa', logoUrl: 'https://logo.clearbit.com/lufthansa.com', label: 'Lufthansa (LH)', searchKey: 'lh lufthansa germany' },
  { type: 'flight', code: 'FR', name: 'Ryanair', logoUrl: 'https://logo.clearbit.com/ryanair.com', label: 'Ryanair (FR)', searchKey: 'fr ryanair ireland' },
  { type: 'flight', code: 'U2', name: 'easyJet', logoUrl: 'https://logo.clearbit.com/easyjet.com', label: 'easyJet (U2)', searchKey: 'u2 easyjet easy jet' },
  { type: 'flight', code: 'VS', name: 'Virgin Atlantic', logoUrl: 'https://logo.clearbit.com/virginatlantic.com', label: 'Virgin Atlantic (VS)', searchKey: 'vs virgin atlantic' },
  { type: 'flight', code: 'DL', name: 'Delta Air Lines', logoUrl: 'https://logo.clearbit.com/delta.com', label: 'Delta Air Lines (DL)', searchKey: 'dl delta delta air lines usa' },
  { type: 'flight', code: 'AA', name: 'American Airlines', logoUrl: 'https://logo.clearbit.com/aa.com', label: 'American Airlines (AA)', searchKey: 'aa american airlines usa' },
  { type: 'flight', code: 'UA', name: 'United Airlines', logoUrl: 'https://logo.clearbit.com/united.com', label: 'United Airlines (UA)', searchKey: 'ua united airlines usa' },
  { type: 'flight', code: 'AF', name: 'Air France', logoUrl: 'https://logo.clearbit.com/airfrance.com', label: 'Air France (AF)', searchKey: 'af air france paris' },
  { type: 'flight', code: 'KL', name: 'KLM', logoUrl: 'https://logo.clearbit.com/klm.com', label: 'KLM (KL)', searchKey: 'kl klm royal dutch airlines' },
  { type: 'train', code: 'NR', name: 'National Rail', logoUrl: 'https://logo.clearbit.com/nationalrail.co.uk', label: 'National Rail (NR)', searchKey: 'nr national rail uk train' },
  { type: 'train', code: 'LNER', name: 'LNER', logoUrl: 'https://logo.clearbit.com/lner.co.uk', label: 'LNER', searchKey: 'lner london north eastern railway train' },
  { type: 'train', code: 'EUROSTAR', name: 'Eurostar', logoUrl: 'https://logo.clearbit.com/eurostar.com', label: 'Eurostar', searchKey: 'eurostar train paris brussels london' },
  { type: 'train', code: 'SNCF', name: 'SNCF Connect', logoUrl: 'https://logo.clearbit.com/sncf-connect.com', label: 'SNCF Connect', searchKey: 'sncf france train' },
  { type: 'train', code: 'DB', name: 'Deutsche Bahn', logoUrl: 'https://logo.clearbit.com/bahn.com', label: 'Deutsche Bahn (DB)', searchKey: 'db deutsche bahn germany train' },
  { type: 'train', code: 'RENFE', name: 'Renfe', logoUrl: 'https://logo.clearbit.com/renfe.com', label: 'Renfe', searchKey: 'renfe spain train' },
];

export function searchTransportProviders(query: string, type: TransportType) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return providers.filter((provider) => provider.type === type).slice(0, 8);
  }

  return providers
    .filter((provider) => provider.type === type)
    .filter((provider) => provider.searchKey.includes(normalized) || provider.name.toLowerCase().includes(normalized) || provider.code.toLowerCase().includes(normalized))
    .slice(0, 8);
}
