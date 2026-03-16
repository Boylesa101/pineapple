import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
};

export function MiniActionCard({ icon, title, description, onPress }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <AppCard>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
