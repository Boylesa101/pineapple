import { InfoChip } from '@/components/InfoChip';
import type { VerificationStatus } from '@/types/models';
import { getVerificationLabel } from '@/utils/verification';

type Props = {
  status: VerificationStatus;
};

const toneMap = {
  verified: 'success',
  review: 'gold',
  unverified: 'default',
} as const;

export function VerificationBadge({ status }: Props) {
  return <InfoChip label={getVerificationLabel(status)} tone={toneMap[status]} />;
}
