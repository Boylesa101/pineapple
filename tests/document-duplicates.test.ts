import test from 'node:test';
import assert from 'node:assert/strict';

import type { Document, DocumentDraft } from '@/types/models';
import { findPotentialDocumentDuplicate } from '@/utils/documentDuplicates';
import { validateDocument } from '@/utils/validation';

const baseDocument: Document = {
  id: 'document_1',
  tripId: 'trip_1',
  travellerId: null,
  holderName: 'Andrew Moss',
  documentType: 'passport',
  documentNumber: '552184330',
  issueDate: '2025-01-01T00:00:00.000Z',
  expiryDate: '2035-01-01T00:00:00.000Z',
  expiryReminderEnabled: true,
  expiryReminderSchedule: [90, 30, 7, 1, 0],
  expiredStatus: false,
  expiringSoonStatus: false,
  notes: '',
  localFileUri: 'file:///vault/passport.pdf',
  previewUri: null,
  mimeType: 'application/pdf',
  sensitive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

test('manual document entries can be saved without a local file', () => {
  const errors = validateDocument({
    tripId: 'trip_1',
    travellerId: null,
    holderName: 'Andrew Moss',
    documentType: 'insurance',
    documentNumber: 'POLICY-1',
    issueDate: null,
    expiryDate: '2026-08-01T00:00:00.000Z',
    expiryReminderEnabled: true,
    expiryReminderSchedule: [30, 7, 1],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: '',
    localFileUri: '',
    previewUri: null,
    mimeType: null,
    sensitive: true,
  });

  assert.deepEqual(errors, []);
});

test('duplicate detection finds matching holder and number or matching file', () => {
  const sameHolderAndNumber: DocumentDraft = {
    tripId: 'trip_1',
    travellerId: null,
    holderName: ' Andrew Moss ',
    documentType: 'passport',
    documentNumber: '552184330',
    issueDate: null,
    expiryDate: null,
    expiryReminderEnabled: true,
    expiryReminderSchedule: [30, 7, 1],
    expiredStatus: false,
    expiringSoonStatus: false,
    notes: '',
    localFileUri: '',
    previewUri: null,
    mimeType: null,
    sensitive: true,
  };

  assert.equal(findPotentialDocumentDuplicate([baseDocument], sameHolderAndNumber)?.id, baseDocument.id);

  const sameFile: DocumentDraft = {
    ...sameHolderAndNumber,
    holderName: 'Someone else',
    documentNumber: '',
    localFileUri: 'file:///vault/passport.pdf',
  };

  assert.equal(findPotentialDocumentDuplicate([baseDocument], sameFile)?.id, baseDocument.id);
});
