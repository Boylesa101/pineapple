import type { SQLiteDatabase } from 'expo-sqlite';
import { createShareCode } from '@/utils/shareCodes';

const DATABASE_VERSION = 20;

const createLatestTablesSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  destinationType TEXT NOT NULL DEFAULT 'unknown',
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  destinationImageLocalPath TEXT,
  destinationImageRemoteUrl TEXT,
  destinationImageSource TEXT NOT NULL DEFAULT 'fallback',
  attributionText TEXT,
  attributionMeta TEXT,
  coverImageUri TEXT,
  heroImageRemoteUrl TEXT,
  heroImageStatus TEXT NOT NULL DEFAULT 'idle',
  notes TEXT NOT NULL DEFAULT '',
  transferSummary TEXT NOT NULL DEFAULT '',
  transferProvider TEXT NOT NULL DEFAULT '',
  transferMethod TEXT NOT NULL DEFAULT '',
  transferLocation TEXT NOT NULL DEFAULT '',
  transferTime TEXT,
  airportTravelDurationMinutes INTEGER,
  transferNotes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS travellers (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  fullName TEXT NOT NULL,
  dateOfBirth TEXT,
  passportNationality TEXT NOT NULL DEFAULT '',
  passportNumber TEXT NOT NULL DEFAULT '',
  ghicNumber TEXT NOT NULL DEFAULT '',
  medicalNote TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  avatarColor TEXT NOT NULL DEFAULT '#F4B400',
  relationshipType TEXT NOT NULL DEFAULT 'adult',
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
  expiryReminderEnabled INTEGER NOT NULL DEFAULT 1,
  expiryReminderSchedule TEXT NOT NULL DEFAULT '[90,30,7,1,0]',
  notes TEXT NOT NULL DEFAULT '',
  localFileUri TEXT NOT NULL,
  previewUri TEXT,
  mimeType TEXT,
  passportData TEXT,
  secondaryLocalFileUri TEXT,
  secondaryPreviewUri TEXT,
  secondaryMimeType TEXT,
  drivingLicenceData TEXT,
  healthCardData TEXT,
  paymentCardData TEXT,
  formalDocumentData TEXT,
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
  assignmentScope TEXT NOT NULL DEFAULT 'trip',
  priority TEXT NOT NULL DEFAULT 'useful',
  notes TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS packing_item_travellers (
  packingItemId TEXT NOT NULL REFERENCES packing_items(id) ON DELETE CASCADE,
  travellerId TEXT NOT NULL REFERENCES travellers(id) ON DELETE CASCADE,
  PRIMARY KEY (packingItemId, travellerId)
);

CREATE TABLE IF NOT EXISTS travel_segments (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  transportType TEXT NOT NULL DEFAULT 'flight',
  travelDirection TEXT NOT NULL DEFAULT 'other',
  airline TEXT NOT NULL,
  providerCode TEXT NOT NULL DEFAULT '',
  providerLogoUrl TEXT,
  flightNumber TEXT NOT NULL DEFAULT '',
  departureAirport TEXT NOT NULL,
  departureAirportCode TEXT NOT NULL DEFAULT '',
  arrivalAirport TEXT NOT NULL,
  arrivalAirportCode TEXT NOT NULL DEFAULT '',
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
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  latitude REAL,
  longitude REAL,
  hotelImageLocalPath TEXT,
  hotelImageRemoteUrl TEXT,
  hotelImageSource TEXT NOT NULL DEFAULT 'fallback',
  hotelImageAttributionText TEXT,
  hotelImageAttributionMeta TEXT,
  hotelImageStatus TEXT NOT NULL DEFAULT 'idle',
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

CREATE TABLE IF NOT EXISTS reminder_settings (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT REFERENCES trips(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  leadTimeDays INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_vibes (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'tripadvisor',
  sourceItemId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  displayCategory TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  rating TEXT,
  ranking TEXT,
  tripadvisorUrl TEXT,
  websiteUrl TEXT,
  imageUrl TEXT,
  savedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (tripId, source, sourceItemId)
);

CREATE TABLE IF NOT EXISTS vibe_cache_entries (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  queryKey TEXT NOT NULL UNIQUE,
  areaLabel TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'tripadvisor',
  payloadJson TEXT NOT NULL DEFAULT '[]',
  fetchedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  notificationsEnabled INTEGER NOT NULL DEFAULT 0,
  expiryRemindersEnabled INTEGER NOT NULL DEFAULT 1,
  expiryReminderSchedule TEXT NOT NULL DEFAULT '[90,30,7,1,0]',
  expiryReminderSilent INTEGER NOT NULL DEFAULT 0,
  structuredDataProtected INTEGER NOT NULL DEFAULT 1,
  profileName TEXT NOT NULL DEFAULT '',
  profilePhotoUri TEXT,
  syncEnabled INTEGER NOT NULL DEFAULT 0,
  syncMode TEXT NOT NULL DEFAULT 'manual_share',
  syncStatus TEXT NOT NULL DEFAULT 'local_only',
  lastSyncAt TEXT,
  lastBackupAt TEXT,
  privacyMaskingMode TEXT NOT NULL DEFAULT 'always',
  vibesIntroSeenAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_participants (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  displayName TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  avatarColor TEXT NOT NULL DEFAULT '#F4B400',
  inviteCode TEXT NOT NULL DEFAULT '',
  isLocalProfile INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trip_invites (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL DEFAULT '',
  inviteCode TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_trip_states (
  tripId TEXT PRIMARY KEY NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shareCode TEXT NOT NULL,
  syncEnabled INTEGER NOT NULL DEFAULT 0,
  syncStatus TEXT NOT NULL DEFAULT 'local_only',
  lastSyncAt TEXT,
  lastExportedAt TEXT,
  lastImportedAt TEXT,
  lastKnownRemoteUpdatedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shareCode TEXT NOT NULL,
  summary TEXT NOT NULL,
  localUpdatedAt TEXT NOT NULL,
  incomingUpdatedAt TEXT NOT NULL,
  incomingPayload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_trip ON documents (tripId);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents (expiryDate);
CREATE INDEX IF NOT EXISTS idx_packing_trip ON packing_items (tripId);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_datetime ON itinerary_events (tripId, dateTime);
CREATE INDEX IF NOT EXISTS idx_reminders_trip_kind ON reminder_settings (tripId, kind);
CREATE INDEX IF NOT EXISTS idx_saved_vibes_trip_savedAt ON saved_vibes (tripId, savedAt DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_cache_trip_expires ON vibe_cache_entries (tripId, expiresAt DESC);
CREATE INDEX IF NOT EXISTS idx_participants_trip ON trip_participants (tripId);
CREATE INDEX IF NOT EXISTS idx_invites_trip ON trip_invites (tripId);
CREATE INDEX IF NOT EXISTS idx_conflicts_trip_status ON sync_conflicts (tripId, status);
`;

async function getUserVersion(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function getColumnNames(db: SQLiteDatabase, table: string) {
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((row) => row.name);
}

async function ensureColumn(db: SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await getColumnNames(db, table);
  if (!columns.includes(column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function runPhaseTwoMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'travellers', 'dateOfBirth', 'TEXT');
  await ensureColumn(db, 'travellers', 'passportNationality', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'travellers', 'notes', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'travellers', 'avatarColor', "TEXT NOT NULL DEFAULT '#F4B400'");
  await ensureColumn(db, 'travellers', 'relationshipType', "TEXT NOT NULL DEFAULT 'adult'");
  await ensureColumn(db, 'packing_items', 'assignmentScope', "TEXT NOT NULL DEFAULT 'trip'");
  await ensureColumn(db, 'packing_items', 'priority', "TEXT NOT NULL DEFAULT 'useful'");

  await db.execAsync(`
    INSERT OR IGNORE INTO packing_item_travellers (packingItemId, travellerId)
    SELECT id, travellerId
    FROM packing_items
    WHERE travellerId IS NOT NULL AND travellerId != '';

    UPDATE packing_items
    SET assignmentScope = CASE
      WHEN travellerId IS NULL OR travellerId = '' THEN 'trip'
      ELSE 'travellers'
    END
    WHERE assignmentScope IS NULL OR assignmentScope = '';

    UPDATE travellers
    SET avatarColor = '#F4B400'
    WHERE avatarColor IS NULL OR avatarColor = '';

    UPDATE travellers
    SET relationshipType = 'adult'
    WHERE relationshipType IS NULL OR relationshipType = '';

    UPDATE packing_items
    SET priority = 'useful'
    WHERE priority IS NULL OR priority = '';
  `);
}

async function runPhaseTwelveMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'trips', 'destinationType', "TEXT NOT NULL DEFAULT 'unknown'");
  await ensureColumn(db, 'trips', 'heroImageRemoteUrl', 'TEXT');
  await ensureColumn(db, 'trips', 'heroImageStatus', "TEXT NOT NULL DEFAULT 'idle'");
  await ensureColumn(db, 'trips', 'transferSummary', "TEXT NOT NULL DEFAULT ''");
}

async function runPhaseThirteenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'app_preferences', 'structuredDataProtected', 'INTEGER NOT NULL DEFAULT 0');
  await db.execAsync(`
    UPDATE app_preferences
    SET structuredDataProtected = 0
    WHERE structuredDataProtected IS NULL;
  `);
}

async function runPhaseFourteenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'trips', 'destinationImageLocalPath', 'TEXT');
  await ensureColumn(db, 'trips', 'destinationImageRemoteUrl', 'TEXT');
  await ensureColumn(db, 'trips', 'destinationImageSource', "TEXT NOT NULL DEFAULT 'fallback'");
  await ensureColumn(db, 'trips', 'attributionText', 'TEXT');
  await ensureColumn(db, 'trips', 'attributionMeta', 'TEXT');

  await db.execAsync(`
    UPDATE trips
    SET destinationImageLocalPath = COALESCE(destinationImageLocalPath, coverImageUri)
    WHERE destinationImageLocalPath IS NULL;

    UPDATE trips
    SET destinationImageRemoteUrl = COALESCE(destinationImageRemoteUrl, heroImageRemoteUrl)
    WHERE destinationImageRemoteUrl IS NULL;

    UPDATE trips
    SET destinationImageSource = CASE
      WHEN destinationImageSource IS NULL OR destinationImageSource = '' THEN
        CASE
          WHEN coverImageUri IS NOT NULL THEN 'wikimedia'
          ELSE 'fallback'
        END
      ELSE destinationImageSource
    END;

    UPDATE trips
    SET attributionText = CASE
      WHEN attributionText IS NULL OR attributionText = '' THEN
        CASE
          WHEN coverImageUri IS NOT NULL THEN 'Existing destination image'
          ELSE 'Default Pineapple image'
        END
      ELSE attributionText
    END;
  `);
}

async function runPhaseFifteenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'travel_segments', 'departureAirportCode', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'travel_segments', 'arrivalAirportCode', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'hotel_stays', 'hotelImageLocalPath', 'TEXT');
  await ensureColumn(db, 'hotel_stays', 'hotelImageRemoteUrl', 'TEXT');
  await ensureColumn(db, 'hotel_stays', 'hotelImageSource', "TEXT NOT NULL DEFAULT 'fallback'");
  await ensureColumn(db, 'hotel_stays', 'hotelImageAttributionText', 'TEXT');
  await ensureColumn(db, 'hotel_stays', 'hotelImageAttributionMeta', 'TEXT');
  await ensureColumn(db, 'hotel_stays', 'hotelImageStatus', "TEXT NOT NULL DEFAULT 'idle'");

  await db.execAsync(`
    UPDATE hotel_stays
    SET hotelImageSource = COALESCE(NULLIF(hotelImageSource, ''), 'fallback')
    WHERE hotelImageSource IS NULL OR hotelImageSource = '';

    UPDATE hotel_stays
    SET hotelImageAttributionText = COALESCE(NULLIF(hotelImageAttributionText, ''), 'Default hotel background')
    WHERE hotelImageAttributionText IS NULL OR hotelImageAttributionText = '';
  `);
}

async function runPhaseSixteenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'trips', 'transferProvider', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'trips', 'transferMethod', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'trips', 'transferLocation', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'trips', 'transferTime', 'TEXT');
  await ensureColumn(db, 'trips', 'transferNotes', "TEXT NOT NULL DEFAULT ''");

  await ensureColumn(db, 'travel_segments', 'transportType', "TEXT NOT NULL DEFAULT 'flight'");
  await ensureColumn(db, 'travel_segments', 'travelDirection', "TEXT NOT NULL DEFAULT 'other'");
  await ensureColumn(db, 'travel_segments', 'providerCode', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'travel_segments', 'providerLogoUrl', 'TEXT');

  await ensureColumn(db, 'hotel_stays', 'city', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'hotel_stays', 'country', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'hotel_stays', 'latitude', 'REAL');
  await ensureColumn(db, 'hotel_stays', 'longitude', 'REAL');
}

async function runPhaseSeventeenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'app_preferences', 'profileName', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'app_preferences', 'profilePhotoUri', 'TEXT');
}

async function runPhaseEighteenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'trips', 'airportTravelDurationMinutes', 'INTEGER');
  await db.execAsync(`
    UPDATE trips
    SET airportTravelDurationMinutes = NULL
    WHERE airportTravelDurationMinutes IS NOT NULL AND airportTravelDurationMinutes < 0;
  `);
}

async function runPhaseNineteenMigration(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS saved_vibes (
      id TEXT PRIMARY KEY NOT NULL,
      tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      source TEXT NOT NULL DEFAULT 'tripadvisor',
      sourceItemId TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      displayCategory TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      rating TEXT,
      ranking TEXT,
      tripadvisorUrl TEXT,
      websiteUrl TEXT,
      imageUrl TEXT,
      savedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE (tripId, source, sourceItemId)
    );

    CREATE TABLE IF NOT EXISTS vibe_cache_entries (
      id TEXT PRIMARY KEY NOT NULL,
      tripId TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      queryKey TEXT NOT NULL UNIQUE,
      areaLabel TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'tripadvisor',
      payloadJson TEXT NOT NULL DEFAULT '[]',
      fetchedAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_saved_vibes_trip_savedAt ON saved_vibes (tripId, savedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_vibe_cache_trip_expires ON vibe_cache_entries (tripId, expiresAt DESC);
  `);
}

async function runPhaseTwentyMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'app_preferences', 'vibesIntroSeenAt', 'TEXT');
}

async function runPhaseThreeMigration(db: SQLiteDatabase) {
  await db.execAsync(`
    INSERT OR IGNORE INTO app_preferences (
      id, notificationsEnabled, syncEnabled, syncMode, syncStatus, lastSyncAt, privacyMaskingMode, createdAt, updatedAt
    ) VALUES (
      'app', 0, 0, 'manual_share', 'local_only', NULL, 'always', datetime('now'), datetime('now')
    );
  `);

  const tripRows = await db.getAllAsync<{ id: string; createdAt: string; updatedAt: string }>('SELECT id, createdAt, updatedAt FROM trips');
  for (const trip of tripRows) {
    const shareCode = createShareCode();
    await db.runAsync(
      `INSERT OR IGNORE INTO shared_trip_states (
        tripId, shareCode, syncEnabled, syncStatus, lastSyncAt, lastExportedAt, lastImportedAt, lastKnownRemoteUpdatedAt, createdAt, updatedAt
      ) VALUES (?, ?, 0, 'local_only', NULL, NULL, NULL, NULL, ?, ?)`,
      trip.id,
      shareCode,
      trip.createdAt,
      trip.updatedAt
    );

    await db.runAsync(
      `INSERT OR IGNORE INTO trip_participants (
        id, tripId, displayName, email, role, avatarColor, inviteCode, isLocalProfile, createdAt, updatedAt
      ) VALUES (?, ?, 'You', '', 'owner', '#F4B400', ?, 1, ?, ?)`,
      `participant_${trip.id}`,
      trip.id,
      shareCode,
      trip.createdAt,
      trip.updatedAt
    );
  }
}

async function runPhaseFourMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'app_preferences', 'lastBackupAt', 'TEXT');
}

async function runPhaseFiveMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'app_preferences', 'expiryRemindersEnabled', 'INTEGER NOT NULL DEFAULT 1');
}

async function runPhaseSixMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'expiryReminderEnabled', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn(db, 'documents', 'expiryReminderSchedule', "TEXT NOT NULL DEFAULT '[90,30,7,1,0]'");
  await ensureColumn(db, 'app_preferences', 'expiryReminderSchedule', "TEXT NOT NULL DEFAULT '[90,30,7,1,0]'");
  await ensureColumn(db, 'app_preferences', 'expiryReminderSilent', 'INTEGER NOT NULL DEFAULT 0');
}

async function runPhaseSevenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'passportData', 'TEXT');
}

async function runPhaseEightMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'secondaryLocalFileUri', 'TEXT');
  await ensureColumn(db, 'documents', 'secondaryPreviewUri', 'TEXT');
  await ensureColumn(db, 'documents', 'secondaryMimeType', 'TEXT');
  await ensureColumn(db, 'documents', 'drivingLicenceData', 'TEXT');
}

async function runPhaseNineMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'healthCardData', 'TEXT');
}

async function runPhaseTenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'paymentCardData', 'TEXT');
}

async function runPhaseElevenMigration(db: SQLiteDatabase) {
  await ensureColumn(db, 'documents', 'formalDocumentData', 'TEXT');
}

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(createLatestTablesSql);

  const version = await getUserVersion(db);
  if (version < 2) {
    await runPhaseTwoMigration(db);
  }
  if (version < 3) {
    await runPhaseThreeMigration(db);
  }
  if (version < 4) {
    await runPhaseFourMigration(db);
  }
  if (version < 5) {
    await runPhaseFiveMigration(db);
  }
  if (version < 6) {
    await runPhaseSixMigration(db);
  }
  if (version < 7) {
    await runPhaseSevenMigration(db);
  }
  if (version < 8) {
    await runPhaseEightMigration(db);
  }
  if (version < 9) {
    await runPhaseNineMigration(db);
  }
  if (version < 10) {
    await runPhaseTenMigration(db);
  }
  if (version < 11) {
    await runPhaseElevenMigration(db);
  }

  if (version < 12) {
    await runPhaseTwelveMigration(db);
  }

  if (version < 13) {
    await runPhaseThirteenMigration(db);
  }

  if (version < 14) {
    await runPhaseFourteenMigration(db);
  }

  if (version < 15) {
    await runPhaseFifteenMigration(db);
  }

  if (version < 16) {
    await runPhaseSixteenMigration(db);
  }

  if (version < 17) {
    await runPhaseSeventeenMigration(db);
  }

  if (version < 18) {
    await runPhaseEighteenMigration(db);
  }

  if (version < 19) {
    await runPhaseNineteenMigration(db);
  }

  if (version < 20) {
    await runPhaseTwentyMigration(db);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
