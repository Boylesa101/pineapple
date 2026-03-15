import type { VerificationStatus } from '@/types/models';

export function getVerificationLabel(status: VerificationStatus) {
  if (status === 'verified') return 'Verified';
  if (status === 'review') return 'Needs review';
  return 'Not verified';
}
