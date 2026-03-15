import { InfoChip } from '@/components/InfoChip';

type Props = {
  label: string;
  tone: 'default' | 'blue' | 'gold' | 'coral' | 'success' | 'danger';
};

export function ExpiryBadge({ label, tone }: Props) {
  return <InfoChip label={label} tone={tone} />;
}
