export const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  coverImageUri TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travellers (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  fullName TEXT NOT NULL,
  passportNumber TEXT NOT NULL DEFAULT '',
  ghicNumber TEXT NOT NULL DEFAULT '',
  medicalNote TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  travellerId TEXT REFERENCES travellers(id) ON DELETE SET NULL,
  holderName TEXT NOT NULL,
  documentType TEXT NOT NULL,
  documentNumber TEXT NOT NULL DEFAULT '',
  issueDate TEXT,
  expiryDate TEXT,
  notes TEXT NOT NULL DEFAULT '',
  localFileUri TEXT NOT NULL,
  previewUri TEXT,
  mimeType TEXT,
  sensitive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packing_items (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  travellerId TEXT REFERENCES travellers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  isPacked INTEGER NOT NULL DEFAULT 0,
  luggageType TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travel_segments (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  airline TEXT NOT NULL,
  flightNumber TEXT NOT NULL DEFAULT '',
  departureAirport TEXT NOT NULL,
  arrivalAirport TEXT NOT NULL,
  departureTime TEXT NOT NULL,
  arrivalTime TEXT NOT NULL,
  terminal TEXT NOT NULL DEFAULT '',
  gate TEXT NOT NULL DEFAULT '',
  bookingRef TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hotel_stays (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  hotelName TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  bookingRef TEXT NOT NULL DEFAULT '',
  checkIn TEXT NOT NULL,
  checkOut TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itinerary_events (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  dateTime TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  confirmationNumber TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emergency_infos (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  insurerEmergencyNumber TEXT NOT NULL DEFAULT '',
  hotelPhone TEXT NOT NULL DEFAULT '',
  airlinePhone TEXT NOT NULL DEFAULT '',
  localEmergencyNote TEXT NOT NULL DEFAULT '',
  embassyConsulateNote TEXT NOT NULL DEFAULT '',
  travellerMedicalNote TEXT NOT NULL DEFAULT '',
  emergencyContacts TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;
