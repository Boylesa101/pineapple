import type { Document, TravelSegment } from '@/types/models';

import { resolveAirlineBrand } from './brandResolver';
import type { FlightDataProvider, FlightLiveStatus, PineappleFlightRecord } from './types';

function normalizeFlightStatus(
  liveStatus: FlightLiveStatus | null | undefined,
  departureTime: string
): { liveStatus: FlightLiveStatus; statusSource: PineappleFlightRecord['statusSource']; providerSource: PineappleFlightRecord['providerSource'] } {
  if (liveStatus) {
    return {
      liveStatus,
      statusSource: 'mock',
      providerSource: 'mock',
    };
  }

  const departureMs = Date.parse(departureTime);
  if (Number.isFinite(departureMs) && Date.now() > departureMs + 15 * 60 * 1000) {
    return {
      liveStatus: 'delayed',
      statusSource: 'schedule_heuristic',
      providerSource: 'none',
    };
  }

  return {
    liveStatus: 'unknown',
    statusSource: 'none',
    providerSource: 'none',
  };
}

function findMatchingBoardingPass(segment: TravelSegment, documents: Document[]) {
  return (
    documents.find((document) => {
      if (document.tripId !== segment.tripId || document.documentType !== 'boarding_pass') {
        return false;
      }
      const data = document.formalDocumentData;
      const dataFlightNumber = data?.flightNumber?.replace(/\s+/g, '').toUpperCase() ?? '';
      const segmentFlightNumber = segment.flightNumber.replace(/\s+/g, '').toUpperCase();
      const dataCarrier = data?.carrierCode?.trim().toUpperCase() ?? '';
      const segmentCarrier = segment.providerCode.trim().toUpperCase();
      const referencesMatch =
        Boolean(data?.referenceCode) &&
        Boolean(segment.bookingRef) &&
        data?.referenceCode?.trim().toUpperCase() === segment.bookingRef.trim().toUpperCase();

      if (referencesMatch) {
        return true;
      }

      return dataFlightNumber === segmentFlightNumber && (!dataCarrier || dataCarrier === segmentCarrier);
    }) ?? null
  );
}

function buildBoardingInfo(document: Document | null, segment: TravelSegment) {
  if (document?.formalDocumentData?.boardingInfo?.trim()) {
    return document.formalDocumentData.boardingInfo.trim();
  }
  if (segment.terminal || segment.gate) {
    return [segment.terminal ? `Terminal ${segment.terminal}` : null, segment.gate ? `Gate ${segment.gate}` : null].filter(Boolean).join(' • ');
  }
  return 'Saved locally in Pineapple';
}

function buildBaggageSummary(document: Document | null) {
  const summary = document?.formalDocumentData?.summary?.trim();
  return summary || 'Boarding-pass baggage details stay in import data, not in OpenSky.';
}

export async function buildPineappleFlightRecord(
  segment: TravelSegment,
  documents: Document[],
  provider: FlightDataProvider
): Promise<PineappleFlightRecord> {
  const boardingDocument = findMatchingBoardingPass(segment, documents);
  const brand = resolveAirlineBrand({
    carrierCode: segment.providerCode,
    airlineName: segment.airline,
  });
  const liveSnapshot = await provider.lookupFlight({
    carrierCode: segment.providerCode,
    flightNumber: segment.flightNumber,
    departureAirportCode: segment.departureAirportCode,
    arrivalAirportCode: segment.arrivalAirportCode,
    departureDatetime: segment.departureTime,
  });

  const fallbackStatus = normalizeFlightStatus(liveSnapshot?.liveStatus, segment.departureTime);
  const boardingData = boardingDocument?.formalDocumentData;

  return {
    carrierCode: segment.providerCode.trim().toUpperCase() || brand.carrierCode,
    airlineName: segment.airline || brand.name,
    airlineLogo: brand.logoXml,
    airlineLogoUrl: brand.logoUrl,
    airlinePrimaryColor: brand.primaryColor,
    airlineSecondaryColor: brand.secondaryColor ?? null,
    airlineBandTextColor: brand.bandTextColor ?? '#FFFFFF',
    flightNumber: segment.flightNumber,
    callsign: liveSnapshot?.callsign ?? null,
    departureAirportCode: segment.departureAirportCode,
    arrivalAirportCode: segment.arrivalAirportCode,
    departureAirportName: segment.departureAirport,
    arrivalAirportName: segment.arrivalAirport,
    departureDatetime: segment.departureTime,
    arrivalDatetime: segment.arrivalTime,
    scheduledDeparture: segment.departureTime,
    estimatedDeparture: liveSnapshot?.estimatedDeparture ?? null,
    scheduledArrival: segment.arrivalTime,
    estimatedArrival: liveSnapshot?.estimatedArrival ?? null,
    liveStatus: liveSnapshot?.liveStatus ?? fallbackStatus.liveStatus,
    statusSource: liveSnapshot?.statusSource ?? fallbackStatus.statusSource,
    providerSource: liveSnapshot?.providerSource ?? fallbackStatus.providerSource,
    passengerName: boardingData?.travellerName?.trim() || boardingDocument?.holderName || 'Passenger',
    seat: boardingData?.seat?.trim() || 'Not set',
    sequence: boardingData?.sequence?.trim() || 'Not set',
    gateCloseTime: boardingData?.gateCloseTime?.trim() || null,
    boardingInfo: buildBoardingInfo(boardingDocument, segment),
    fareLabel: boardingData?.fare?.trim() || 'Stored fare',
    bookingReference: boardingData?.referenceCode?.trim() || boardingDocument?.documentNumber || segment.bookingRef || 'Not set',
    barcodePayload: boardingData?.barcodePayload?.trim() || '',
    barcodeFormat: boardingData?.barcodeFormat ?? null,
    baggageSummary: buildBaggageSummary(boardingDocument),
    routeLabel: `${segment.departureAirport} to ${segment.arrivalAirport}`,
    travelSegment: segment,
    boardingDocument,
  };
}
