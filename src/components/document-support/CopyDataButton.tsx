import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/theme';

type Props = {
  label?: string;
  payload: string;
  copiedLabel?: string;
};

export function CopyDataButton({ label = 'Copy data', payload, copiedLabel = 'Copied' }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    await Clipboard.setStringAsync(payload);
    setCopied(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <AppButton
      label={copied ? copiedLabel : label}
      tone="secondary"
      icon={<MaterialIcons name={copied ? 'check' : 'content-copy'} size={18} color={colors.nightNavy} />}
      onPress={handleCopy}
    />
  );
}
