import type { DocumentDraft, EmergencyInfoDraft, HotelStayDraft, ItineraryEventDraft, PackingItemDraft, TravelSegmentDraft, TravellerDraft, TripDraft } from '@/types/models';

export function validateTrip(input: TripDraft) {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push('Trip name is required.');
  if (!input.destination.trim()) errors.push('Destination is required.');
  if (!input.startDate) errors.push('Start date is required.');
  if (!input.endDate) errors.push('End date is required.');
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.push('End date must be after the start date.');
  }
  return errors;
}

export function validateTraveller(input: TravellerDraft) {
  const errors: string[] = [];
  if (!input.fullName.trim()) errors.push('Traveller name is required.');
  return errors;
}

export function validateDocument(input: DocumentDraft) {
  const errors: string[] = [];
  if (!input.holderName.trim()) errors.push('Holder name is required.');
  if (!input.localFileUri.trim()) errors.push('Choose a local file.');
  return errors;
}

export function validatePackingItem(input: PackingItemDraft) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Item name is required.');
  if (input.quantity < 1) errors.push('Quantity must be at least 1.');
  return errors;
}

export function validateTravelSegment(input: TravelSegmentDraft) {
  const errors: string[] = [];
  if (!input.airline.trim()) errors.push('Airline is required.');
  if (!input.departureAirport.trim()) errors.push('Departure airport is required.');
  if (!input.arrivalAirport.trim()) errors.push('Arrival airport is required.');
  if (!input.departureTime) errors.push('Departure time is required.');
  if (!input.arrivalTime) errors.push('Arrival time is required.');
  return errors;
}

export function validateHotelStay(input: HotelStayDraft) {
  const errors: string[] = [];
  if (!input.hotelName.trim()) errors.push('Hotel name is required.');
  if (!input.address.trim()) errors.push('Address is required.');
  if (!input.checkIn) errors.push('Check-in date is required.');
  if (!input.checkOut) errors.push('Check-out date is required.');
  return errors;
}

export function validateItineraryEvent(input: ItineraryEventDraft) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Title is required.');
  if (!input.dateTime) errors.push('Date and time are required.');
  return errors;
}

export function validateEmergencyInfo(input: EmergencyInfoDraft) {
  const errors: string[] = [];
  if (!input.insurerEmergencyNumber.trim() && !input.localEmergencyNote.trim() && !input.embassyConsulateNote.trim()) {
    errors.push('Add at least one emergency reference.');
  }
  return errors;
}
