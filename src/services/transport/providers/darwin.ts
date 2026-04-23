import type { TransportDataProvider, TransportItem, TransportLiveStatus, TransportProviderUpdate } from '../types';

const DARWIN_TOKEN = process.env.EXPO_PUBLIC_DARWIN_TOKEN?.trim() ?? '';
const DARWIN_ENDPOINT = (process.env.EXPO_PUBLIC_DARWIN_ENDPOINT ?? 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx').trim();

function xmlValue(block: string, tag: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i');
  return block.match(pattern)?.[1]?.trim() ?? null;
}

function xmlBlock(source: string, tag: string) {
  const pattern = new RegExp(`<(?:\\w+:)?${tag}\\b[\\s\\S]*?<\\/(?:\\w+:)?${tag}>`, 'i');
  return source.match(pattern)?.[0] ?? null;
}

function normalizeRailStatus(raw: string | null): { liveStatus: TransportLiveStatus; statusLabel: string } {
  const value = raw?.trim().toLowerCase() ?? '';
  if (!value) {
    return { liveStatus: 'unknown', statusLabel: 'Status unavailable' };
  }
  if (value.includes('cancel')) {
    return { liveStatus: 'cancelled', statusLabel: 'Cancelled' };
  }
  if (value.includes('delay') || /^\d+/.test(value) || value.includes('late')) {
    return { liveStatus: 'delayed', statusLabel: 'Delayed' };
  }
  return { liveStatus: 'on_time', statusLabel: 'On time' };
}

function soapBody(item: TransportItem) {
  const origin = item.originCode.trim().toUpperCase();
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ldb="http://thalesgroup.com/RTTI/2021-11-01/ldb/" xmlns:typ="http://thalesgroup.com/RTTI/2021-11-01/ldb/types">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${DARWIN_TOKEN}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>12</ldb:numRows>
      <ldb:crs>${origin}</ldb:crs>
      ${item.destinationCode ? `<ldb:filterCrs>${item.destinationCode.trim().toUpperCase()}</ldb:filterCrs>` : ''}
      <ldb:filterType>to</ldb:filterType>
      <ldb:timeOffset>0</ldb:timeOffset>
      <ldb:timeWindow>120</ldb:timeWindow>
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;
}

export class DarwinProvider implements TransportDataProvider {
  readonly id = 'darwin' as const;
  readonly capabilities = {
    supportsRealtime: true,
    supportsSchedules: true,
    supportsFutureTrips: false,
    supportsCommercialUse: false,
    requiresCredentials: true,
  };

  isConfigured() {
    return Boolean(DARWIN_TOKEN && DARWIN_ENDPOINT);
  }

  async refresh(item: TransportItem): Promise<TransportProviderUpdate | null> {
    if (item.type !== 'rail') {
      return null;
    }

    if (!DARWIN_TOKEN || !DARWIN_ENDPOINT) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'Darwin credentials are not configured, so Pineapple is using stored rail details only.',
      };
    }

    if (!item.originCode) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'The saved rail segment does not include an origin station code.',
      };
    }

    let response: Response;
    try {
      response = await fetch(DARWIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'http://thalesgroup.com/RTTI/2021-11-01/ldb/GetDepartureBoard',
        },
        body: soapBody(item),
      });
    } catch {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'Darwin could not be reached from this device.',
      };
    }

    if (!response.ok) {
      return {
        liveState: 'unavailable',
        liveStatus: item.liveStatus,
        providerUnavailableReason: `Darwin returned ${response.status}.`,
      };
    }

    const xml = await response.text();
    const serviceBlock =
      xml
        .match(/<(?:\w+:)?service\b[\s\S]*?<\/(?:\w+:)?service>/gi)
        ?.find((block) => {
          const destinationBlock = xmlBlock(block, 'destination');
          const destinationCrs = destinationBlock ? xmlValue(destinationBlock, 'crs') : null;
          const std = xmlValue(block, 'std');
          return (!item.destinationCode || destinationCrs?.toUpperCase() === item.destinationCode.toUpperCase()) && (!item.departureTime || !std || std === item.departureTime.slice(11, 16));
        }) ?? null;

    if (!serviceBlock) {
      return {
        liveState: 'manual_only',
        liveStatus: item.liveStatus,
        providerUnavailableReason: 'Darwin did not return a matching service for this trip.',
      };
    }

    const etd = xmlValue(serviceBlock, 'etd');
    const platform = xmlValue(serviceBlock, 'platform');
    const operator = xmlValue(serviceBlock, 'operator');
    const std = xmlValue(serviceBlock, 'std');
    const destinationBlock = xmlBlock(serviceBlock, 'destination');
    const locationBlock = destinationBlock?.match(/<(?:\w+:)?location\b[\s\S]*?<\/(?:\w+:)?location>/i)?.[0] ?? null;
    const destinationName = locationBlock ? xmlValue(locationBlock, 'locationName') : null;
    const status = normalizeRailStatus(etd);

    return {
      liveState: platform || etd ? 'live' : 'partial',
      liveStatus: status.liveStatus,
      statusLabel: etd && etd.toLowerCase() !== 'on time' ? etd : status.statusLabel,
      operatorName: operator ?? item.operatorName,
      platform: platform ?? item.platform,
      destinationName: destinationName ?? item.destinationName,
      rawStatus: etd ?? status.liveStatus,
      liveNotice: platform ? `Platform ${platform}${etd ? ` • ${etd}` : ''}` : etd ?? 'Darwin refreshed this service.',
      lastUpdatedAt: new Date().toISOString(),
      sourceConfidence: 'medium',
    };
  }
}
