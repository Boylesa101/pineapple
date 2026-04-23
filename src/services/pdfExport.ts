import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { colors } from '@/constants/theme';
import type { AppDataSnapshot, PdfExportOptions } from '@/types/models';
import { formatAirportDisplay } from '@/utils/airports';
import { formatDateTime, formatShortDate } from '@/utils/date';
import { maskSensitive } from '@/utils/format';
import { getTripBundle, getTripById } from '@/utils/selectors';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderList(title: string, rows: string[]) {
  if (!rows.length) return '';
  return `
    <section class="card">
      <h2>${escapeHtml(title)}</h2>
      <ul>${rows.map((row) => `<li>${row}</li>`).join('')}</ul>
    </section>
  `;
}

export async function exportTripPdf(
  snapshot: AppDataSnapshot,
  tripId: string,
  options: PdfExportOptions
) {
  const trip = getTripById(snapshot, tripId);
  const bundle = getTripBundle(snapshot, tripId);
  if (!trip) {
    throw new Error('Trip not found.');
  }

  const documentRows = bundle.documents.map((document) => {
    const number = options.includeDocumentNumbers
      ? options.hideSensitiveValues
        ? maskSensitive(document.documentNumber)
        : document.documentNumber
      : 'Hidden';
    return `<strong>${escapeHtml(document.documentType)}</strong>: ${escapeHtml(document.holderName)} (${escapeHtml(number || 'No number')})`;
  });

  const packingRows = bundle.packingItems.map(
    (item) =>
      `<strong>${escapeHtml(item.title)}</strong> x${item.quantity} <span class="muted">(${escapeHtml(item.priority)})</span>`
  );

  const travellerRows = bundle.travellers.map((traveller) => {
    const passport = options.includeDocumentNumbers
      ? options.hideSensitiveValues
        ? maskSensitive(traveller.passportNumber)
        : traveller.passportNumber
      : 'Hidden';
    return `${escapeHtml(traveller.fullName)} • ${escapeHtml(traveller.relationshipType)} • Passport: ${escapeHtml(passport || 'Not set')}`;
  });

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff7ec; color: ${colors.nightNavy}; padding: 24px; }
          h1 { font-size: 28px; margin-bottom: 4px; }
          h2 { font-size: 18px; margin: 0 0 10px; color: ${colors.nightNavy}; }
          p, li { font-size: 13px; line-height: 1.5; }
          .subtitle { color: #667280; margin-bottom: 16px; }
          .chip { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #fff; border: 1px solid #e8d9bf; margin-right: 8px; margin-bottom: 8px; }
          .card { background: #fff; border: 1px solid #e8d9bf; border-radius: 20px; padding: 16px; margin-bottom: 14px; }
          ul { margin: 0; padding-left: 18px; }
          .muted { color: #65717D; }
          .brand { color: ${colors.pineappleGold}; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="brand">Pineapple Travel Pack</div>
        <h1>${escapeHtml(trip.name)}</h1>
        <p class="subtitle">${escapeHtml(trip.destination)} • ${escapeHtml(formatShortDate(trip.startDate))} to ${escapeHtml(formatShortDate(trip.endDate))}</p>

        <section class="card">
          <h2>Trip summary</h2>
          <p>${escapeHtml(trip.notes || 'No additional notes.')}</p>
          <div>
            <span class="chip">${bundle.travellers.length} traveller(s)</span>
            <span class="chip">${bundle.documents.length} document(s)</span>
            <span class="chip">${bundle.itineraryEvents.length} itinerary item(s)</span>
          </div>
        </section>

        ${renderList('Travellers', travellerRows)}
        ${renderList(
          'Flights / travel',
          bundle.travelSegments.map(
            (segment) =>
              `<strong>${escapeHtml(`${segment.airline} ${segment.flightNumber}`.trim())}</strong> • ${escapeHtml(formatAirportDisplay(segment.departureAirport, segment.departureAirportCode))} to ${escapeHtml(formatAirportDisplay(segment.arrivalAirport, segment.arrivalAirportCode))} • ${escapeHtml(formatDateTime(segment.departureTime))} • Ref ${escapeHtml(segment.bookingRef || 'Not set')}`
          )
        )}
        ${renderList(
          'Hotel',
          bundle.hotelStays.map(
            (hotel) =>
              `<strong>${escapeHtml(hotel.hotelName)}</strong> • ${escapeHtml(hotel.address)} • ${escapeHtml(formatShortDate(hotel.checkIn))} to ${escapeHtml(formatShortDate(hotel.checkOut))} • Ref ${escapeHtml(hotel.bookingRef || 'Not set')}`
          )
        )}
        ${renderList(
          'Itinerary',
          bundle.itineraryEvents.map(
            (event) =>
              `<strong>${escapeHtml(event.title)}</strong> • ${escapeHtml(formatDateTime(event.dateTime))} • ${escapeHtml(event.location || event.type)}`
          )
        )}
        ${
          options.includeEmergencyNumbers
            ? renderList(
                'Emergency contacts',
                [
                  `Insurer: ${escapeHtml(bundle.emergencyInfo?.insurerEmergencyNumber || 'Not set')}`,
                  `Hotel: ${escapeHtml(bundle.emergencyInfo?.hotelPhone || 'Not set')}`,
                  `Airline: ${escapeHtml(bundle.emergencyInfo?.airlinePhone || 'Not set')}`,
                  `Police: ${escapeHtml(bundle.emergencyInfo?.policePhone || 'Not set')}`,
                  `Hospital: ${escapeHtml(bundle.emergencyInfo?.hospitalContact || 'Not set')}`,
                  `Pharmacy: ${escapeHtml(bundle.emergencyInfo?.pharmacyContact || 'Not set')}`,
                  `Contacts: ${escapeHtml(bundle.emergencyInfo?.emergencyContacts || 'Not set')}`,
                  `Notes: ${escapeHtml(bundle.emergencyInfo?.localEmergencyNote || 'Not set')}`,
                ]
              )
            : ''
        }
        ${options.includePackingList ? renderList('Packing summary', packingRows) : ''}
        ${options.includeDocumentReferences ? renderList('Document references', documentRows) : ''}
      </body>
    </html>
  `;

  const result = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${trip.name} travel pack`,
    });
  }

  return result.uri;
}
