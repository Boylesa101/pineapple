import { officialAirlineLogoXmls } from '@/data/airlineBrandmarks';

import type { AirlineBrand } from './types';

const AIRLINE_BRANDS: Record<string, AirlineBrand> = {
  BA: {
    carrierCode: 'BA',
    name: 'British Airways',
    logoXml: officialAirlineLogoXmls.BA ?? null,
    logoUrl: null,
    primaryColor: '#2E5B9D',
    secondaryColor: '#CFD8E8',
    bandTextColor: '#FFFFFF',
  },
  EK: {
    carrierCode: 'EK',
    name: 'Emirates',
    logoXml: officialAirlineLogoXmls.EK ?? null,
    logoUrl: null,
    primaryColor: '#D71920',
    secondaryColor: '#F8D6D8',
    bandTextColor: '#FFFFFF',
  },
  FR: {
    carrierCode: 'FR',
    name: 'Ryanair',
    logoXml: officialAirlineLogoXmls.FR ?? null,
    logoUrl: null,
    primaryColor: '#1546B0',
    secondaryColor: '#D9E5FF',
    bandTextColor: '#FFFFFF',
  },
  U2: {
    carrierCode: 'U2',
    name: 'easyJet',
    logoXml: officialAirlineLogoXmls.U2 ?? null,
    logoUrl: null,
    primaryColor: '#FF6600',
    secondaryColor: '#FFE2CC',
    bandTextColor: '#FFFFFF',
  },
  EXS: {
    carrierCode: 'EXS',
    name: 'Jet2',
    logoXml: officialAirlineLogoXmls.EXS ?? null,
    logoUrl: null,
    primaryColor: '#C8102E',
    secondaryColor: '#F8D7DD',
    bandTextColor: '#FFFFFF',
  },
  KL: {
    carrierCode: 'KL',
    name: 'KLM',
    logoXml: officialAirlineLogoXmls.KL ?? null,
    logoUrl: null,
    primaryColor: '#00A1DE',
    secondaryColor: '#D8F3FF',
    bandTextColor: '#FFFFFF',
  },
  LH: {
    carrierCode: 'LH',
    name: 'Lufthansa',
    logoXml: officialAirlineLogoXmls.LH ?? null,
    logoUrl: null,
    primaryColor: '#05164D',
    secondaryColor: '#D9DFF1',
    bandTextColor: '#FFFFFF',
  },
  QR: {
    carrierCode: 'QR',
    name: 'Qatar Airways',
    logoXml: officialAirlineLogoXmls.QR ?? null,
    logoUrl: null,
    primaryColor: '#6A1A45',
    secondaryColor: '#EAD8E3',
    bandTextColor: '#FFFFFF',
  },
};

const NAME_ALIASES: Record<string, string> = {
  'british airways': 'BA',
  ryanair: 'FR',
  easyjet: 'U2',
  jet2: 'EXS',
  lufthansa: 'LH',
  klm: 'KL',
  emirates: 'EK',
  'qatar airways': 'QR',
};

function createFallbackBrand(code: string, name: string | null | undefined): AirlineBrand {
  return {
    carrierCode: code,
    name: name?.trim() || code,
    logoXml: null,
    logoUrl: null,
    primaryColor: '#1E2A38',
    secondaryColor: '#E8EDF3',
    bandTextColor: '#FFFFFF',
  };
}

export function getAirlineBrandByCode(carrierCode: string | null | undefined) {
  const normalized = carrierCode?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return AIRLINE_BRANDS[normalized] ?? createFallbackBrand(normalized, normalized);
}

export function resolveAirlineBrand(input: { carrierCode?: string | null; airlineName?: string | null }) {
  const byCode = getAirlineBrandByCode(input.carrierCode);
  if (byCode) {
    return input.airlineName?.trim() ? { ...byCode, name: input.airlineName.trim() || byCode.name } : byCode;
  }

  const aliasCode = input.airlineName?.trim().toLowerCase() ? NAME_ALIASES[input.airlineName.trim().toLowerCase()] : null;
  if (aliasCode) {
    const aliased = AIRLINE_BRANDS[aliasCode];
    return input.airlineName?.trim() ? { ...aliased, name: input.airlineName.trim() || aliased.name } : aliased;
  }

  return createFallbackBrand((input.carrierCode || 'AIR').trim().toUpperCase() || 'AIR', input.airlineName);
}

export function listKnownAirlineBrands() {
  return Object.values(AIRLINE_BRANDS);
}
