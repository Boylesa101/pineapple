import type { Document, StoredSecurityConfig, Traveller } from '@/types/models';

export type DocumentVaultSetupState = {
  isFirstTime: boolean;
  needsTravellerName: boolean;
  needsSecuritySetup: boolean;
  hasIdentityDocument: boolean;
  hasHealthCard: boolean;
  hasInsuranceRecord: boolean;
};

export function getDocumentVaultSetupState(args: {
  documents: Document[];
  travellers: Traveller[];
  security: Pick<StoredSecurityConfig, 'pinConfigured'>;
}) {
  const { documents, travellers, security } = args;

  return {
    isFirstTime: documents.length === 0,
    needsTravellerName: travellers.length === 0,
    needsSecuritySetup: !security.pinConfigured,
    hasIdentityDocument: documents.some((document) => document.documentType === 'passport' || document.documentType === 'driving_licence'),
    hasHealthCard: documents.some((document) => document.documentType === 'ghic'),
    hasInsuranceRecord: documents.some((document) => document.documentType === 'insurance'),
  } satisfies DocumentVaultSetupState;
}
