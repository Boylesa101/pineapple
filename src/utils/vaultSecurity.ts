import type { Document, DocumentDraft } from '@/types/models';

type VaultContentTarget = Pick<Document, 'sensitive'> | Pick<DocumentDraft, 'sensitive'> | null | undefined;

// This boundary covers any action that can reveal or materialize vault attachment content.
// Sensitive vault records must stay behind a successful vault unlock, even if the caller only
// wants to preview a thumbnail or open the stored source file.
export function requiresVaultUnlock(target: VaultContentTarget) {
  return Boolean(target?.sensitive);
}

export function canAccessVaultAttachmentContent(target: VaultContentTarget, isVaultUnlocked: boolean) {
  return !requiresVaultUnlock(target) || isVaultUnlocked;
}

export function assertVaultAttachmentAccess(target: VaultContentTarget, isVaultUnlocked: boolean) {
  if (!canAccessVaultAttachmentContent(target, isVaultUnlocked)) {
    throw new Error('Unlock the vault before revealing sensitive document files or previews.');
  }
}
