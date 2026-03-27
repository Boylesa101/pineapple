import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';

import { colors } from '@/constants/theme';

type Props = {
  value: string;
  size?: number;
};

export function QRCodeImage({ value, size = 220 }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);

    void QRCode.toString(value, {
      type: 'svg',
      width: size,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: {
        dark: colors.primaryBlueDark,
        light: '#FFFFFF',
      },
    })
      .then((nextSvg) => {
        if (!cancelled) {
          setSvg(nextSvg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  if (failed) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Text style={styles.error}>QR unavailable</Text>
      </View>
    );
  }

  if (!svg) {
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <ActivityIndicator color={colors.primaryBlue} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SvgXml xml={svg} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
  },
  error: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
