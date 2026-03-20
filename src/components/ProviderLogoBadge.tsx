import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';

import { colors, radii } from '@/constants/theme';

type Props = {
  name: string;
  code?: string | null;
  logoXml?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
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

export function ProviderLogoBadge({ name, code, logoXml, logoUrl, accentColor, size = 38 }: Props) {
  const [failed, setFailed] = useState(false);
  const displayLogoXml = !!logoXml;
  const displayLogo = !!logoUrl && !failed;
  const wrapStyle = displayLogoXml || displayLogo ? styles.logoWrap : null;

  return (
    <View
      style={[
        styles.wrap,
        wrapStyle,
        accentColor && !displayLogoXml && !displayLogo ? { backgroundColor: accentColor, borderColor: accentColor } : null,
        { width: size, height: size, borderRadius: Math.round(size / 3) },
      ]}
    >
      {displayLogoXml ? (
        <SvgXml xml={logoXml as string} width={size * 0.72} height={size * 0.72} />
      ) : displayLogo ? (
        <Image source={logoUrl} style={styles.image} contentFit="contain" onError={() => setFailed(true)} cachePolicy="disk" />
      ) : (
        <Text style={styles.fallback}>{initials(name, code)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(13, 110, 253, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(13, 110, 253, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoWrap: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.92)',
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
