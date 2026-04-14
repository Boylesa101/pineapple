import { StyleSheet, Text, View } from 'react-native';

import type { PineappleFlightRecord } from '@/services/flights';

import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { colors, radii, spacing } from '@/constants/theme';

type Props = {
  record: PineappleFlightRecord;
};

function payloadPreview(value: string) {
  if (!value) {
    return 'No stored boarding-pass payload yet';
  }
  return value.length > 48 ? `${value.slice(0, 48)}…` : value;
}

export function BarcodeDisplay({ record }: Props) {
  const format = record.barcodeFormat;
  const payload = record.barcodePayload;

  if (format === 'qr' && payload) {
    return (
      <View style={styles.wrap}>
        <QRCodeImage value={payload} size={246} />
        <Text style={styles.caption}>Stored QR payload</Text>
      </View>
    );
  }

  return (
    <View style={styles.fallbackWrap}>
      <View style={styles.bars}>
        {Array.from({ length: 42 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              { opacity: 0.35 + ((index * 17) % 10) / 20, width: index % 4 === 0 ? 4 : 2 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.formatLabel}>{format ? format.toUpperCase() : 'No barcode format saved'}</Text>
      <Text style={styles.payloadPreview}>{payloadPreview(payload)}</Text>
      <Text style={styles.notice}>
        Pineapple preserves the original payload exactly. QR renders directly here; non-QR payloads stay stored and labelled until a native renderer is added.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  caption: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  fallbackWrap: {
    width: 246,
    minHeight: 246,
    borderRadius: radii.lg,
    backgroundColor: '#F7F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  bars: {
    width: '100%',
    height: 114,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 2,
  },
  bar: {
    backgroundColor: '#111111',
    borderRadius: 2,
  },
  formatLabel: {
    color: colors.nightNavy,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  payloadPreview: {
    color: colors.nightNavy,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  notice: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
