import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  airlineName: string;
  carrierCode: string;
  logoXml?: string | null;
  logoUrl?: string | null;
  size?: number;
};

function buildFallbackLabel(airlineName: string, carrierCode: string) {
  if (carrierCode.trim()) {
    return carrierCode.trim().slice(0, 3).toUpperCase();
  }
  return airlineName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function AirlineLogo({ airlineName, carrierCode, logoXml, logoUrl, size = 42 }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const fallback = buildFallbackLabel(airlineName, carrierCode);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: Math.round(size / 3.2) }]}>
      {logoXml ? (
        <SvgXml xml={logoXml} width={size * 0.74} height={size * 0.74} />
      ) : logoUrl && !imageFailed ? (
        <Image source={logoUrl} style={styles.image} contentFit="contain" onError={() => setImageFailed(true)} cachePolicy="disk" />
      ) : (
        <Text style={styles.fallback}>{fallback}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '74%',
    height: '74%',
  },
  fallback: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
