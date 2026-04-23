import { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';
import type { TransportItem } from '@/services/transport';

import { TransportStackCard } from './TransportStackCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  tripId: string;
  items: TransportItem[];
};

function stackOrder(items: TransportItem[], selectedId: string | null) {
  if (!selectedId) {
    return items;
  }
  const selected = items.find((item) => item.id === selectedId);
  if (!selected) {
    return items;
  }
  return [selected, ...items.filter((item) => item.id !== selectedId)];
}

export function TransportStackSection({ tripId, items }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const orderedItems = useMemo(() => stackOrder(items, selectedId), [items, selectedId]);

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionEyebrow}>Journey stack</Text>
        <Text style={styles.sectionTitle}>Travel cards for every step of this trip.</Text>
      </View>

      <View style={styles.stackWrap}>
        {orderedItems.map((item, index) => {
          const state = index === 0 ? (selectedId === item.id ? 'clicked' : 'top_of_stack') : 'in_stack';
          return (
            <View key={item.id} style={[styles.stackLayer, index > 0 ? styles.stackLayerOverlap : null, { zIndex: items.length - index }]}>
              <TransportStackCard
                item={item}
                state={state}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSelectedId((current) => (current === item.id ? null : item.id));
                }}
                onOpen={() =>
                  router.push({
                    pathname: '/trip/[tripId]/transport/[itemId]',
                    params: { tripId, itemId: item.id },
                  })
                }
              />
            </View>
          );
        })}
      </View>

      {__DEV__ ? (
        <AppCard variant="compact" style={styles.devNote}>
          <Text style={styles.devLabel}>Dev note</Text>
          <Text style={styles.devText}>Live providers refresh in-place when configured. Without provider keys, Pineapple falls back to the saved trip details cleanly.</Text>
        </AppCard>
      ) : null}

      {selectedId ? (
        <Pressable
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setSelectedId(null);
          }}
          style={styles.dismissButton}
        >
          <Text style={styles.dismissLabel}>Collapse selected card</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionCopy: {
    gap: 4,
    paddingHorizontal: 2,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 23,
  },
  stackWrap: {
    paddingBottom: 8,
  },
  stackLayer: {
    width: '100%',
  },
  stackLayerOverlap: {
    marginTop: -74,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  dismissLabel: {
    color: colors.primaryBlueDark,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  devNote: {
    backgroundColor: '#F3F7FC',
    borderColor: '#D9E6F2',
  },
  devLabel: {
    color: colors.primaryBlueDark,
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  devText: {
    color: colors.textMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    lineHeight: 17,
  },
});
