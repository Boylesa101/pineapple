import type { TransportType } from '@/types/models';

import { officialAirlineLogoXmls } from './airlineBrandmarks';

export type TransportProviderSuggestion = {
  type: TransportType;
  code: string;
  name: string;
  logoXml: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  label: string;
  searchKey: string;
};

function createMonogramLogoXml(code: string, backgroundColor: string) {
  return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${code}">
  <rect width="96" height="96" rx="24" fill="${backgroundColor}"/>
  <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#ffffff">${code}</text>
</svg>`;
}

function flightProvider(code: string, name: string, searchKey: string, accentColor: string) {
  return {
    type: 'flight' as const,
    code,
    name,
    logoXml: officialAirlineLogoXmls[code] ?? createMonogramLogoXml(code, accentColor),
    logoUrl: null,
    accentColor,
    label: `${name} (${code})`,
    searchKey,
  };
}

function privateFlightProvider(code: string, name: string, searchKey: string, accentColor: string) {
  return {
    type: 'private_flight' as const,
    code,
    name,
    logoXml: createMonogramLogoXml(code, accentColor),
    logoUrl: null,
    accentColor,
    label: `${name} (${code})`,
    searchKey,
  };
}

function trainProvider(code: string, name: string, searchKey: string, accentColor: string) {
  return {
    type: 'train' as const,
    code,
    name,
    logoXml: createMonogramLogoXml(code, accentColor),
    logoUrl: null,
    accentColor,
    label: `${name} (${code})`,
    searchKey,
  };
}

function networkProvider(type: 'bus' | 'underground' | 'metro', code: string, name: string, searchKey: string, accentColor: string) {
  return {
    type,
    code,
    name,
    logoXml: createMonogramLogoXml(code, accentColor),
    logoUrl: null,
    accentColor,
    label: `${name} (${code})`,
    searchKey,
  };
}

const providers: TransportProviderSuggestion[] = [
  flightProvider('BA', 'British Airways', 'ba british airways london uk', '#2E5B9D'),
  flightProvider('QR', 'Qatar Airways', 'qr qatar airways doha', '#6A1A45'),
  flightProvider('EK', 'Emirates', 'ek emirates dubai uae', '#D71920'),
  flightProvider('LH', 'Lufthansa', 'lh lufthansa germany frankfurt munich', '#05164D'),
  flightProvider('FR', 'Ryanair', 'fr ryanair dublin ireland', '#144A9A'),
  flightProvider('U2', 'easyJet', 'u2 easyjet easy jet london', '#FF6600'),
  flightProvider('VS', 'Virgin Atlantic', 'vs virgin atlantic uk london', '#C8102E'),
  flightProvider('DL', 'Delta Air Lines', 'dl delta usa atlanta', '#C8102E'),
  flightProvider('AA', 'American Airlines', 'aa american airlines usa dallas', '#1F5DAA'),
  flightProvider('UA', 'United Airlines', 'ua united airlines usa chicago', '#002244'),
  flightProvider('AF', 'Air France', 'af air france paris france', '#002157'),
  flightProvider('KL', 'KLM', 'kl klm amsterdam netherlands dutch', '#00A1DE'),
  flightProvider('TK', 'Turkish Airlines', 'tk turkish airlines istanbul turkey', '#C8102E'),
  flightProvider('AC', 'Air Canada', 'ac air canada toronto canada', '#D80621'),
  flightProvider('IB', 'Iberia', 'ib iberia madrid spain', '#C4122F'),
  flightProvider('AZ', 'ITA Airways', 'az ita airways rome italy', '#1D428A'),
  flightProvider('SQ', 'Singapore Airlines', 'sq singapore airlines singapore', '#0F4C81'),
  flightProvider('CX', 'Cathay Pacific', 'cx cathay pacific hong kong', '#006564'),
  flightProvider('QF', 'Qantas', 'qf qantas sydney australia', '#E4002B'),
  flightProvider('NZ', 'Air New Zealand', 'nz air new zealand auckland', '#111111'),
  flightProvider('NH', 'All Nippon Airways', 'nh ana all nippon airways japan tokyo', '#005BAC'),
  flightProvider('JL', 'Japan Airlines', 'jl japan airlines jal tokyo japan', '#C8102E'),
  flightProvider('AI', 'Air India', 'ai air india delhi india', '#8C1D40'),
  flightProvider('6E', 'IndiGo', '6e indigo india delhi mumbai', '#163C96'),
  flightProvider('WY', 'Oman Air', 'wy oman air muscat oman', '#7B6A2F'),
  flightProvider('ET', 'Ethiopian Airlines', 'et ethiopian airlines addis ababa', '#078930'),
  flightProvider('MS', 'EgyptAir', 'ms egyptair cairo egypt', '#003DA5'),
  flightProvider('EY', 'Etihad Airways', 'ey etihad airways abu dhabi', '#8A6F3B'),
  flightProvider('SV', 'Saudia', 'sv saudia saudi arabian airlines jeddah riyadh', '#006C35'),
  flightProvider('SK', 'SAS', 'sk sas scandinavian airlines stockholm copenhagen oslo', '#00205B'),
  flightProvider('AY', 'Finnair', 'ay finnair helsinki finland', '#003580'),
  flightProvider('TP', 'TAP Air Portugal', 'tp tap air portugal lisbon porto', '#046A38'),
  flightProvider('LO', 'LOT Polish Airlines', 'lo lot polish airlines warsaw poland', '#0C4DA2'),
  flightProvider('LX', 'SWISS', 'lx swiss swiss international air lines zurich', '#D00000'),
  flightProvider('SN', 'Brussels Airlines', 'sn brussels airlines belgium brussels', '#2F2A85'),
  flightProvider('OS', 'Austrian Airlines', 'os austrian airlines vienna austria', '#D71920'),
  flightProvider('OU', 'Croatia Airlines', 'ou croatia airlines zagreb croatia', '#005EB8'),
  flightProvider('A3', 'Aegean Airlines', 'a3 aegean airlines athens greece', '#005AA9'),
  flightProvider('PC', 'Pegasus Airlines', 'pc pegasus airlines turkey istanbul', '#FFB612'),
  flightProvider('VY', 'Vueling', 'vy vueling barcelona spain', '#FFCC00'),
  flightProvider('WN', 'Southwest Airlines', 'wn southwest airlines usa dallas', '#304CB2'),
  flightProvider('B6', 'JetBlue', 'b6 jetblue usa new york boston', '#003876'),
  flightProvider('AS', 'Alaska Airlines', 'as alaska airlines seattle usa', '#003B5C'),
  flightProvider('LY', 'EL AL', 'ly el al tel aviv israel', '#0038A8'),
  flightProvider('CA', 'Air China', 'ca air china beijing china', '#C8102E'),
  flightProvider('MU', 'China Eastern Airlines', 'mu china eastern shanghai china', '#1F5DAA'),
  flightProvider('CZ', 'China Southern Airlines', 'cz china southern guangzhou china', '#0072CE'),
  flightProvider('HU', 'Hainan Airlines', 'hu hainan airlines china haikou', '#B9975B'),
  flightProvider('OK', 'Czech Airlines', 'ok czech airlines prague csa', '#D7141A'),
  flightProvider('GA', 'Garuda Indonesia', 'ga garuda indonesia jakarta bali', '#0093D0'),
  privateFlightProvider('VJ', 'VistaJet', 'vj vistajet private jet charter', '#5C6670'),
  privateFlightProvider('NJ', 'NetJets', 'nj netjets private aviation charter', '#404B5A'),
  privateFlightProvider('FXA', 'Flexjet', 'fxa flexjet private aviation charter', '#8F2432'),
  privateFlightProvider('VTF', 'Victor', 'vtf fly victor private aviation charter', '#3E5D8F'),
  trainProvider('NR', 'National Rail', 'nr national rail uk train london', '#003B5C'),
  trainProvider('LNER', 'LNER', 'lner london north eastern railway train', '#C8102E'),
  trainProvider('EURO', 'Eurostar', 'euro eurostar train london paris brussels', '#1F2A44'),
  trainProvider('SNCF', 'SNCF Connect', 'sncf france train paris lyon', '#E20074'),
  trainProvider('DB', 'Deutsche Bahn', 'db deutsche bahn germany train berlin', '#D50032'),
  trainProvider('RENFE', 'Renfe', 'renfe spain train madrid barcelona', '#6E2C91'),
  networkProvider('bus', 'NX', 'National Express', 'nx national express bus coach uk', '#003D73'),
  networkProvider('bus', 'MEGA', 'Megabus', 'mega megabus bus coach uk europe', '#FFCC00'),
  networkProvider('bus', 'FLIX', 'FlixBus', 'flix flixbus coach bus europe', '#78BE20'),
  networkProvider('bus', 'ARR', 'Arriva', 'arr arriva bus uk europe', '#00A3E0'),
  networkProvider('bus', 'STG', 'Stagecoach', 'stg stagecoach bus uk', '#003A70'),
  networkProvider('underground', 'LU', 'London Underground', 'lu london underground tube tfl', '#0019A8'),
  networkProvider('underground', 'GLA', 'Glasgow Subway', 'gla glasgow subway underground scotland', '#F28C00'),
  networkProvider('underground', 'MTR', 'MTR', 'mtr hong kong underground metro', '#D50032'),
  networkProvider('metro', 'TWM', 'Tyne and Wear Metro', 'twm tyne wear metro nexus newcastle sunderland', '#FFD100'),
  networkProvider('metro', 'PAR', 'Paris Metro', 'par paris metro ratp france', '#003087'),
  networkProvider('metro', 'MAD', 'Metro de Madrid', 'mad metro madrid spain', '#255AA8'),
  networkProvider('metro', 'BER', 'Berlin U-Bahn', 'ber berlin u-bahn ubahn germany metro', '#005CA9'),
  networkProvider('metro', 'NYC', 'New York City Subway', 'nyc new york city subway metro mta', '#0039A6'),
];

export function searchTransportProviders(query: string, type: TransportType) {
  const normalizedType = type === 'private_flight' ? 'private_flight' : type;
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return providers.filter((provider) => provider.type === normalizedType).slice(0, 8);
  }

  return providers
    .filter((provider) => provider.type === normalizedType)
    .filter(
      (provider) =>
        provider.searchKey.includes(normalized) ||
        provider.name.toLowerCase().includes(normalized) ||
        provider.code.toLowerCase().includes(normalized)
    )
    .slice(0, 8);
}

export function findTransportProvider(code: string | null | undefined, type?: TransportType) {
  if (!code) {
    return null;
  }

  const normalized = code.trim().toLowerCase();
  return (
    providers.find((provider) => provider.code.toLowerCase() === normalized && (!type || provider.type === type)) ?? null
  );
}
