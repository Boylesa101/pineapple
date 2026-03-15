import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/theme';

type Props = {
  label?: string;
  payload: string;
};

export function CopyDataButton({ label = 'Copy passport data', payload }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <AppButton
      label={copied ? 'Copied' : label}
      tone="secondary"
      icon={<MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={colors.nightNavy} />}
      onPress={async () => {
        await Clipboard.setStringAsync(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    />
  );
}
