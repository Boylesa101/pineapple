import { isValid, parseISO } from 'date-fns';

import type {
  DocumentDraft,
  EmergencyInfoDraft,
  HotelStayDraft,
  ItineraryEventDraft,
  PackingItemDraft,
  TravelSegmentDraft,
  TravellerDraft,
  TripDraft,
} from '@/types/models';
import { normalizeExpiryReminderSchedule } from './documentExpiry';
import { getTransportDisplay } from './transport';

export function validateTrip(input: TripDraft) {
  const errors: string[] = [];
  if (!input.destination.trim()) errors.push('Destination is required.');
  if (!input.startDate) errors.push('Start date is required.');
  if (!input.endDate) errors.push('End date is required.');
  if (input.startDate && !isValid(parseISO(input.startDate))) errors.push('Start date is invalid.');
  if (input.endDate && !isValid(parseISO(input.endDate))) errors.push('End date is invalid.');
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.push('End date must be after the start date.');
  }
  return errors;
}

export function validateTraveller(input: TravellerDraft) {
  const errors: string[] = [];
  if (!input.fullName.trim()) errors.push('Traveller name is required.');
  if (!input.avatarColor.trim()) errors.push('Choose an avatar colour.');
  return errors;
}

export function validateDocument(input: DocumentDraft) {
  const errors: string[] = [];
  if (!input.holderName.trim()) errors.push('Holder name is required.');
  if (input.issueDate && !isValid(parseISO(input.issueDate))) errors.push('Issue date is invalid.');
  if (input.expiryDate && !isValid(parseISO(input.expiryDate))) errors.push('Expiry date is invalid.');
  if (input.issueDate && input.expiryDate && input.expiryDate < input.issueDate) {
    errors.push('Expiry date must be after the issue date.');
  }
  if (input.expiryReminderEnabled && !normalizeExpiryReminderSchedule(input.expiryReminderSchedule).length) {
    errors.push('Choose at least one reminder time, or turn reminders off for this document.');
  }
  if (input.documentType === 'passport' && input.passportData?.dateOfBirth && !isValid(parseISO(input.passportData.dateOfBirth))) {
    errors.push('Passport date of birth is invalid.');
  }
  if (input.documentType === 'driving_licence' && input.drivingLicenceData?.dateOfBirth && !isValid(parseISO(input.drivingLicenceData.dateOfBirth))) {
    errors.push('Driving licence date of birth is invalid.');
  }
  if (input.documentType === 'ghic' && input.healthCardData?.countryCode && input.healthCardData.countryCode.length < 2) {
    errors.push('Health card country code is invalid.');
  }
  if (input.documentType === 'payment_card') {
    const digits = input.documentNumber.replace(/\D/g, '');
    if (digits && digits.length < 12) {
      errors.push('Card number looks too short.');
    }
    if (input.paymentCardData?.cvv && !/^\d{3,4}$/.test(input.paymentCardData.cvv)) {
      errors.push('Security code must be 3 or 4 digits.');
    }
  }
  return errors;
}

export function validatePackingItem(input: PackingItemDraft) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Item name is required.');
  if (input.quantity < 1) errors.push('Quantity must be at least 1.');
  if (input.assignmentScope === 'travellers' && !input.travellerIds.length) {
    errors.push('Choose at least one traveller, or mark the item as trip-wide.');
  }
  return errors;
}

export function validateTravelSegment(input: TravelSegmentDraft) {
  const errors: string[] = [];
  const display = getTransportDisplay(input.transportType ?? 'flight');
  if (!input.airline.trim()) errors.push(`${display.providerLabel} is required.`);
  const departureLabel = display.departureLabel;
  const arrivalLabel = display.arrivalLabel;
  if (!input.departureAirport.trim()) errors.push(`${departureLabel} is required.`);
  if (!input.arrivalAirport.trim()) errors.push(`${arrivalLabel} is required.`);
  if (!input.departureTime) errors.push('Departure time is required.');
  if (!input.arrivalTime) errors.push('Arrival time is required.');
  if (input.departureTime && !isValid(parseISO(input.departureTime))) errors.push('Departure time is invalid.');
  if (input.arrivalTime && !isValid(parseISO(input.arrivalTime))) errors.push('Arrival time is invalid.');
  if (input.arrivalTime && input.departureTime && input.arrivalTime < input.departureTime) {
    errors.push('Arrival time must be after departure time.');
  }
  return errors;
}

export function validateHotelStay(input: HotelStayDraft) {
  const errors: string[] = [];
  if (!input.hotelName.trim()) errors.push('Hotel name is required.');
  if (!input.address.trim()) errors.push('Address is required.');
  if (!input.checkIn) errors.push('Check-in date is required.');
  if (!input.checkOut) errors.push('Check-out date is required.');
  if (input.checkIn && !isValid(parseISO(input.checkIn))) errors.push('Check-in date is invalid.');
  if (input.checkOut && !isValid(parseISO(input.checkOut))) errors.push('Check-out date is invalid.');
  if (input.checkIn && input.checkOut && input.checkOut < input.checkIn) {
    errors.push('Check-out must be after check-in.');
  }
  return errors;
}

export function validateItineraryEvent(input: ItineraryEventDraft) {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push('Title is required.');
  if (!input.dateTime) errors.push('Date and time are required.');
  if (input.dateTime && !isValid(parseISO(input.dateTime))) errors.push('Date and time are invalid.');
  return errors;
}

export function validateEmergencyInfo(input: EmergencyInfoDraft) {
  const errors: string[] = [];
  if (!input.insurerEmergencyNumber.trim() && !input.localEmergencyNote.trim() && !input.embassyConsulateNote.trim()) {
    errors.push('Add at least one emergency reference.');
  }
  return errors;
}
