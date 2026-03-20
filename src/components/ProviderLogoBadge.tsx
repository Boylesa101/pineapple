import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, radii } from '@/constants/theme';

type Props = {
  name: string;
  code?: string | null;
  logoUrl?: string | null;
  size?: number;
};

function initials(name: string, code?: string | null) {
  if (code?.trim()) {
    return code.trim().slice(0, 4).toUpperCase();
  }
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function ProviderLogoBadge({ name, code, logoUrl, size = 38 }: Props) {
  const [failed, setFailed] = useState(false);
  const displayLogo = !!logoUrl && !failed;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: Math.round(size / 3) }]}>
      {displayLogo ? (
        <Image source={logoUrl} style={styles.image} contentFit="contain" onError={() => setFailed(true)} cachePolicy="disk" />
      ) : (
        <Text style={styles.fallback}>{initials(name, code)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '74%',
    height: '74%',
  },
  fallback: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
});
