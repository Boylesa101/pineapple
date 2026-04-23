import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { TransportLiveStatus } from '@/services/transport';

type Props = {
  status: TransportLiveStatus;
  label?: string;
};

const palette: Record<TransportLiveStatus, { backgroundColor: string; color: string }> = {
  on_time: { backgroundColor: colors.success, color: colors.white },
  delayed: { backgroundColor: colors.warning, color: colors.white },
  boarding: { backgroundColor: colors.primaryBlue, color: colors.white },
  gate_change: { backgroundColor: '#6D56D8', color: colors.white },
  cancelled: { backgroundColor: colors.danger, color: colors.white },
  unknown: { backgroundColor: '#7A8794', color: colors.white },
};

function defaultLabel(status: TransportLiveStatus) {
  switch (status) {
    case 'on_time':
      return 'On time';
    case 'delayed':
      return 'Delayed';
    case 'boarding':
      return 'Boarding';
    case 'gate_change':
      return 'Gate change';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

export function TransportStatusPill({ status, label }: Props) {
  const nextPalette = palette[status] ?? palette.unknown;
  return (
    <View style={[styles.pill, nextPalette]}>
      <Text style={[styles.label, { color: nextPalette.color }]}>{label ?? defaultLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 14,
  },
});
