import type { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function MiniActionCard({ icon, title, description, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={style}>
      <AppCard style={styles.card}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 0,
  },
  iconWrap: {
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  description: {
    color: '#61778D',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
});
