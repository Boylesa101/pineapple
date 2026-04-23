import { findTransportProvider } from '@/data/transportProviders';
import { resolveAirlineBrand } from '@/services/flights/brandResolver';
import type { TransportType } from '@/types/models';

import type { TransportBrand, TransportDisplayType } from './types';

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const next = value?.trim();
  if (!next) {
    return fallback;
  }
  return next.startsWith('#') ? next : `#${next}`;
}

function luminance(hex: string) {
  const normalized = hex.replace('#', '');
  const digits = normalized.length === 3 ? normalized.split('').map((digit) => `${digit}${digit}`).join('') : normalized;
  const red = Number.parseInt(digits.slice(0, 2), 16) / 255;
  const green = Number.parseInt(digits.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(digits.slice(4, 6), 16) / 255;

  const toLinear = (channel: number) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

function bestTextColor(background: string) {
  return luminance(background) > 0.42 ? '#142433' : '#FFFFFF';
}

function fallbackBrand(type: TransportDisplayType, name: string): TransportBrand {
  const fallbackColor =
    type === 'hotel' ? '#12506D' : type === 'taxi' ? '#0D6EFD' : type === 'bus' ? '#176F52' : '#163B6C';
  return {
    operatorName: name || 'Saved provider',
    operatorBrandColor: fallbackColor,
    operatorTextColor: bestTextColor(fallbackColor),
    operatorLogoXml: null,
    operatorLogoUrl: null,
  };
}

export function resolveTransportBrand({
  type,
  transportType,
  operatorCode,
  operatorName,
  logoUrl,
}: {
  type: TransportDisplayType;
  transportType?: TransportType | null;
  operatorCode?: string | null;
  operatorName?: string | null;
  logoUrl?: string | null;
}): TransportBrand {
  if (type === 'airline') {
    const airlineBrand = resolveAirlineBrand({
      carrierCode: operatorCode ?? '',
      airlineName: operatorName ?? '',
    });

    return {
      operatorName: operatorName?.trim() || airlineBrand.name,
      operatorBrandColor: airlineBrand.primaryColor,
      operatorTextColor: airlineBrand.bandTextColor ?? bestTextColor(airlineBrand.primaryColor),
      operatorLogoXml: airlineBrand.logoXml,
      operatorLogoUrl: logoUrl ?? airlineBrand.logoUrl,
    };
  }

  const provider =
    transportType && operatorCode
      ? findTransportProvider(operatorCode, transportType)
      : operatorCode
        ? findTransportProvider(operatorCode)
        : null;

  if (provider) {
    const accent = normalizeHexColor(provider.accentColor, '#163B6C');
    return {
      operatorName: operatorName?.trim() || provider.name,
      operatorBrandColor: accent,
      operatorTextColor: bestTextColor(accent),
      operatorLogoXml: provider.logoXml,
      operatorLogoUrl: logoUrl ?? provider.logoUrl,
    };
  }

  return fallbackBrand(type, operatorName?.trim() || operatorCode?.trim() || 'Saved provider');
}
