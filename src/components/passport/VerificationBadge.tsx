import { InfoChip } from '@/components/InfoChip';
import type { PassportVerificationStatus } from '@/types/models';
import { getPassportVerificationLabel } from '@/utils/passport';

type Props = {
  status: PassportVerificationStatus;
};

const toneMap = {
  verified: 'success',
  review: 'gold',
  unverified: 'default',
} as const;

export function VerificationBadge({ status }: Props) {
  return <InfoChip label={getPassportVerificationLabel(status)} tone={toneMap[status]} />;
}
