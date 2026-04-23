import { StyleSheet, Text, View } from 'react-native';

import type { PineappleFlightRecord } from '@/services/flights';

import { AirlineLogo } from './AirlineLogo';
import { FlightStatusPill } from './FlightStatusPill';

type Props = {
  record: PineappleFlightRecord;
  position: 'top' | 'bottom' | 'header';
  height?: number;
};

export function AirlineBrandBand({ record, position, height = 82 }: Props) {
  const radiusStyle =
    position === 'top'
      ? styles.topRadius
      : position === 'bottom'
        ? styles.bottomRadius
        : styles.headerRadius;

  return (
    <View style={[styles.band, radiusStyle, { minHeight: height, backgroundColor: record.airlinePrimaryColor }]}>
      <View style={styles.identity}>
        <AirlineLogo
          airlineName={record.airlineName}
          carrierCode={record.carrierCode}
          logoXml={record.airlineLogo}
          logoUrl={record.airlineLogoUrl}
          size={44}
        />
        <View style={styles.copy}>
          <Text style={[styles.airlineName, { color: record.airlineBandTextColor }]} numberOfLines={1}>
            {record.airlineName}
          </Text>
          <Text style={[styles.flightNumber, { color: record.airlineBandTextColor }]} numberOfLines={1}>
            {record.flightNumber}
          </Text>
        </View>
      </View>
      <FlightStatusPill status={record.liveStatus} />
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topRadius: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  bottomRadius: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRadius: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  airlineName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 21,
  },
  flightNumber: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
  },
});
