import assert from 'node:assert/strict';
import test from 'node:test';

import { getVerificationLabel } from '../src/utils/verification';
import {
  getDocumentSourceCtaLabel,
  getDocumentSourceEmptyText,
  getDocumentSourcePreviewUri,
  isDocumentPdfSource,
} from '../src/utils/documentViewer';

test('verification labels map shared badge states clearly', () => {
  assert.equal(getVerificationLabel('verified'), 'Verified');
  assert.equal(getVerificationLabel('review'), 'Needs review');
  assert.equal(getVerificationLabel('unverified'), 'Not verified');
});

test('document viewer detects pdf and image sources correctly', () => {
  assert.equal(isDocumentPdfSource('application/pdf', 'file:///scan.pdf'), true);
  assert.equal(isDocumentPdfSource('image/jpeg', 'file:///scan.jpg'), false);
  assert.equal(isDocumentPdfSource(null, 'file:///scan.PDF'), true);
});

test('document viewer preview uri prefers image preview and hides pdf previews', () => {
  assert.equal(
    getDocumentSourcePreviewUri('file:///preview.jpg', 'file:///scan.jpg', 'image/jpeg'),
    'file:///preview.jpg'
  );
  assert.equal(
    getDocumentSourcePreviewUri(null, 'file:///scan.jpg', 'image/jpeg'),
    'file:///scan.jpg'
  );
  assert.equal(
    getDocumentSourcePreviewUri('file:///preview.jpg', 'file:///scan.pdf', 'application/pdf'),
    null
  );
});

test('document viewer copy and empty text stay human-readable', () => {
  assert.equal(getDocumentSourceCtaLabel(true), 'Open PDF locally');
  assert.equal(getDocumentSourceCtaLabel(false), 'Open image locally');
  assert.equal(getDocumentSourceEmptyText({ hasFile: true, isPdf: true }), 'PDF stored locally on this device.');
  assert.equal(getDocumentSourceEmptyText({ hasFile: true, isPdf: false }), 'Source file stored locally on this device.');
  assert.equal(getDocumentSourceEmptyText({ hasFile: false, isPdf: false }), 'No source file attached yet.');
});
