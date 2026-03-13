import assert from 'node:assert/strict';
import test from 'node:test';

import { getDocumentExpiryInfo, normalizeAppPreferences, normalizeDocumentRecord } from '../src/utils/documentExpiry';

test('document expiry buckets cover expired and expiring states', () => {
  const now = new Date();
  const expired = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const soon = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const medium = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString();
  const long = new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(getDocumentExpiryInfo('passport', expired).isExpired, true);
  assert.equal(getDocumentExpiryInfo('visa', soon).bucket, 'within_7_days');
  assert.equal(getDocumentExpiryInfo('insurance', medium).bucket, 'within_30_days');
  assert.equal(getDocumentExpiryInfo('passport', long).passportSixMonthWarning, true);
});

test('legacy documents are normalized with reminder defaults and derived statuses', () => {
  const document = normalizeDocumentRecord({
    id: 'doc_1',
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Henry',
    documentType: 'passport',
    documentNumber: '1234',
    issueDate: null,
    expiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '',
    localFileUri: 'file:///test/passport.jpg',
    previewUri: null,
    mimeType: 'image/jpeg',
    sensitive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(document.expiryReminderEnabled, true);
  assert.deepEqual(document.expiryReminderSchedule, [90, 30, 7, 1, 0]);
  assert.equal(document.expiredStatus, false);
  assert.equal(document.expiringSoonStatus, true);
});

test('legacy app preferences are normalized with expiry reminder defaults', () => {
  const preferences = normalizeAppPreferences({
    id: 'app',
    notificationsEnabled: true,
    syncEnabled: false,
    syncMode: 'manual_share',
    syncStatus: 'local_only',
    lastSyncAt: null,
    lastBackupAt: null,
    privacyMaskingMode: 'always',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  assert.equal(preferences.expiryRemindersEnabled, true);
  assert.deepEqual(preferences.expiryReminderSchedule, [90, 30, 7, 1, 0]);
  assert.equal(preferences.expiryReminderSilent, false);
});
