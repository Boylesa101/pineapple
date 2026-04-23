import { StyleSheet, View } from 'react-native';

import { ProviderLogoBadge } from '@/components/ProviderLogoBadge';
import type { TransportItem } from '@/services/transport';

type Props = {
  item: TransportItem;
  size?: number;
};

export function TransportOperatorLogo({ item, size = 40 }: Props) {
  return (
    <View style={styles.wrap}>
      <ProviderLogoBadge
        name={item.operatorName}
        code={item.type === 'airline' ? item.flightNumber || item.serviceNumber : item.operatorName}
        logoXml={item.operatorLogoXml}
        logoUrl={item.operatorLogoUrl}
        accentColor={item.operatorBrandColor}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
  },
});
