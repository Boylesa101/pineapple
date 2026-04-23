import test from 'node:test';
import assert from 'node:assert/strict';

import { assertVaultAttachmentAccess, canAccessVaultAttachmentContent, requiresVaultUnlock } from '@/utils/vaultSecurity';

test('vault attachment access requires unlock for sensitive documents', () => {
  const sensitive = { sensitive: true };
  const standard = { sensitive: false };

  assert.equal(requiresVaultUnlock(sensitive), true);
  assert.equal(requiresVaultUnlock(standard), false);
  assert.equal(canAccessVaultAttachmentContent(sensitive, false), false);
  assert.equal(canAccessVaultAttachmentContent(sensitive, true), true);
  assert.equal(canAccessVaultAttachmentContent(standard, false), true);
});

test('vault attachment access assertion blocks locked sensitive records only', () => {
  assert.throws(
    () => assertVaultAttachmentAccess({ sensitive: true }, false),
    /unlock the vault/i,
  );

  assert.doesNotThrow(() => assertVaultAttachmentAccess({ sensitive: true }, true));
  assert.doesNotThrow(() => assertVaultAttachmentAccess({ sensitive: false }, false));
});
