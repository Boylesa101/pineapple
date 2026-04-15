import type { TransportDataProvider, TransportItem, TransportProviderUpdate } from '../types';

function inMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export class MockTransportProvider implements TransportDataProvider {
  readonly id = 'mock' as const;
  readonly capabilities = {
    supportsRealtime: true,
    supportsSchedules: true,
    supportsFutureTrips: true,
    supportsCommercialUse: false,
    requiresCredentials: false,
  };

  isConfigured() {
    return true;
  }

  async refresh(item: TransportItem): Promise<TransportProviderUpdate | null> {
    if (item.type === 'hotel' || item.type === 'taxi') {
      return {
        liveState: 'manual_only',
        liveStatus: 'unknown',
        providerUnavailableReason: 'Mock live updates are only defined for airline, rail, and bus cards.',
      };
    }

    const delayed = item.type === 'rail';
    const cancelled = item.type === 'bus' && item.operatorName.toLowerCase().includes('fallback');
    const liveStatus = cancelled ? 'cancelled' : delayed ? 'delayed' : item.type === 'airline' ? 'boarding' : 'on_time';

    return {
      liveState: 'live',
      liveStatus,
      statusLabel:
        liveStatus === 'boarding'
          ? 'Boarding'
          : liveStatus === 'delayed'
            ? 'Delayed'
            : liveStatus === 'cancelled'
              ? 'Cancelled'
              : 'On time',
      platform: item.type === 'rail' ? item.platform || '5' : item.platform,
      gate: item.type === 'airline' ? item.gate || 'A12' : item.gate,
      departureTime: item.departureTime ?? inMinutes(35),
      arrivalTime: item.arrivalTime ?? inMinutes(95),
      lastUpdatedAt: new Date().toISOString(),
      sourceConfidence: 'medium',
      rawStatus: liveStatus,
      liveNotice:
        liveStatus === 'delayed'
          ? 'Mock live signal suggests a short delay.'
          : liveStatus === 'cancelled'
            ? 'Mock fallback flagged this service as cancelled.'
            : 'Mock live signal is active for development.',
    };
  }
}
