import assert from 'node:assert/strict';
import test from 'node:test';

import { toUserMessage } from '../src/utils/userErrors';

test('backup and shared-trip errors are translated to user-friendly copy', () => {
  assert.equal(
    toUserMessage(new Error('Backup integrity check failed. The password or file may be invalid.'), 'Fallback'),
    'Pineapple could not unlock that backup. Check the password and file, then try again.'
  );
  assert.equal(
    toUserMessage(new Error('This shared trip file is incomplete.'), 'Fallback'),
    'That shared trip file is incomplete or corrupted.'
  );
  assert.equal(
    toUserMessage(new Error('Secure document decryption failed.'), 'Fallback'),
    'Pineapple could not open that stored document securely. Re-import the document if the problem continues.'
  );
  assert.equal(toUserMessage(new Error('Trip not found.'), 'Fallback'), 'That trip is no longer available locally.');
});

test('unexpected long internal errors fall back to safe generic copy', () => {
  const noisyError = new Error('x'.repeat(200));
  assert.equal(toUserMessage(noisyError, 'Fallback'), 'Fallback');
});
