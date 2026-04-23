import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { FlightLiveStatus } from '@/services/flights';

const STATUS_STYLES: Record<FlightLiveStatus, { label: string; backgroundColor: string }> = {
  on_time: { label: 'On time', backgroundColor: colors.success },
  delayed: { label: 'Delayed', backgroundColor: '#D9781F' },
  boarding: { label: 'Boarding', backgroundColor: colors.primaryBlue },
  gate_change: { label: 'Gate change', backgroundColor: '#6B4FD3' },
  cancelled: { label: 'Cancelled', backgroundColor: colors.dangerRed },
  unknown: { label: 'Unknown', backgroundColor: '#7A8896' },
};

type Props = {
  status: FlightLiveStatus;
};

export function FlightStatusPill({ status }: Props) {
  const style = STATUS_STYLES[status];

  return (
    <View style={[styles.pill, { backgroundColor: style.backgroundColor }]}>
      <Text style={styles.label}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 14,
  },
});
